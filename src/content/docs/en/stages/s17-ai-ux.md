---
title: S17 Product and AI UX
head:
  - tag: title
    content: "AI UX Design: AI Interfaces People Trust (S17) | Token2Agent"
description: AI product and UX design. Decide whether a need calls for AI, design streaming, tool status, stop, confirmation and citations so users can trust and correct the AI, and feed their feedback back into evals.
sidebar:
  order: 17
  label: S17 Product and AI UX
---

:::note[This chapter]
**Prerequisites**: [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (the core exercise only needs streaming from S6, so you can do it right after S6); the advanced exercise builds on your work from [S8 Eval Methodology](/en/stages/s08-evals/), [S13 Memory and Personalization](/en/stages/s13-memory/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) and [S16 Security and Governance](/en/stages/s16-security/); the lecture cites a few examples from the last two, which you can skip if you haven't read them　**Next**: → [S18 Deployment and Architecture](/en/stages/s18-deployment/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/)
:::

:::tip[Concepts route: key points]
- A good AI interface always shows what it's doing, and always lets you hit stop.
- If the notes assistant is stopped midway through sending an email, it must first check whether the email went out before telling the user the result.
- Save confirmations for actions you can't take back, like sending email. Ask too often and users click through without reading.
:::

## What this chapter covers

You learned streaming and cancellation in S6 LLM APIs and Application Basics. This chapter turns the chat interface into a product users are willing to rely on and can correct, and answers the question S16 Security and Governance left open: users approve 93% of permission prompts (approval fatigue), so how do you design a confirmation screen that actually works? It comes before S18 Deployment and Architecture because the interface determines what data you can collect and what you need to monitor in production.

## After this chapter you can

- Use a few concrete questions to decide whether a need calls for AI, and propose a launch plan that starts small. (lecture and self-check)
- Draw the screen flow of one agent run (streaming, tool status, stop, confirmation, citations), and explain why a running tool is marked "cancelling" first when the user hits stop. (lecture and self-check)
- Build a UI state machine for an agent so that hitting stop at any moment never leaves inconsistent state. (core)
- Render tool calls as suitable components. (core: tool cards; advanced: generative UI)
- Design feedback that links back to traces and flows into an eval dataset. (core: explicit; advanced: implicit, plus flowing into evals)
- Run a small usability test and fix the interface based on the results. (advanced)

## Lecture

An agent interface has to answer four questions at all times: What is it doing? How sure is it? Can I stop it? How do I tell it it's wrong? The main thread is one flow: streaming → tool status → stop → confirmation → citations. The chapter ends with feedback, proactive notifications and usability testing.

### ★ One example, end to end

Sam types into the notes assistant: "Summarize this week's meeting notes and email the summary to the team." The table shows one smooth run; each row is one state of the screen (timings are illustrative):

| Time | State | What the user sees | What the user can do |
|---|---|---|---|
| 0 s | `idle` → submit | The message appears in the conversation; the send button becomes a stop button | Stop |
| 0.3 s | Waiting for the first event | `Thinking…` and three bouncing dots appear where the assistant's reply will go | Stop |
| 1.0 s | `running_tool` | A tool card "Searching notes: meeting, this week" with a spinner | Stop, expand the card to see the arguments |
| 2.5 s | `running_tool` | The card changes to "Found 5 notes" and lists the titles, followed by "Summarizing 5 notes" | Stop, click a title to open the original note |
| 5.3 s | `streaming` | The summary appears sentence by sentence, with citation markers [1], [2] at the ends | Stop, click a citation |
| 17.3 s | `awaiting_approval` | An email confirmation card (the agent only creates a draft with `email_draft`): 4 recipients, subject, full body, buttons "Send," "Edit," "Cancel" | Approve, edit, reject |
| After clicking Send | `done` | The card changes to "Sent to 4 people, 10:42"; thumbs up / down appear under the message | Give feedback, copy, regenerate |

Sending to other people follows the "draft → user clicks send" approach from [S16 Security and Governance](/en/stages/s16-security/); the agent never calls `email_send` directly.

The same request can also go down four branches:

- **Empty result**: the search finds 0 notes. The card says "No meeting notes this week," and instead of forcing out a summary, the assistant asks "Want me to search the last 14 days instead?"
- **Error**: the search tool times out. The card is marked "Failed" with the reason, and the assistant tries another approach or asks the user to retry; content already on screen stays.
- **Interruption**: Sam hits stop halfway through the summary. The text stays where it stopped and is marked "Interrupted"; no card is left stuck on "Running."
- **Rejection**: Sam clicks "Cancel" on the confirmation card. The agent receives the tool result "user declined to send" and replies "Email canceled. The summary is still above." The run doesn't count as a failure.

The happy path takes a day or two to build. These four branches are where most of the time and most of the bugs go.

### ★ Should AI handle this at all?

Before designing the interface, ask: How often does it happen? How costly is a mistake? Can the user check the result quickly? Is there a simple solution without AI?

| Question | "Find my notes" | "Every Friday, automatically email the meeting summary to the team" |
|---|---|---|
| Frequency | Several times a day | Once a week |
| Cost of a mistake | Low; just search again | High; a sent email can't be recalled |
| Quick to check? | Yes; scan the titles | Hard; you'd compare sentence by sentence against the notes |
| Verdict | Just build it | Start with "draft → user clicks send" |

The second feature is a fit for **start small**: first build "suggest → user confirms," build up a track record (say, 20 weeks of drafts that barely needed edits), then loosen the level of autonomy.

**Common misconception: when users complain it's "not good," switch to a stronger model.** [applied-llms.org](https://applied-llms.org/) puts it this way: the model isn't the product; the system around it is. The problem is usually that the interface doesn't let users understand, stop or correct the AI.

### ★ How do you make waiting bearable?

Perceived wait depends on how soon you see a meaningful change. Streaming shows text as it's generated, so perceived latency depends on time to first token (TTFT, ← [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)). HCI research often cites [Nielsen's three limits (1993, drawing on Miller 1968 and Card et al. 1991)](https://www.nngroup.com/articles/response-times-3-important-limits/): within 0.1 seconds it feels instant; within 1 second your train of thought isn't broken, though you notice the delay; beyond 10 seconds your attention wanders, and you need to see progress.

Using the example above: the summary is about 600 tokens at 50 tokens per second, so writing it alone takes 12 seconds; with searching and summarizing, the total is 17.3 seconds. Without streaming or progress, the user stares at a blank screen for 17 seconds. With the table above, the screen never goes more than 3 seconds without a change. That's the principle of the **loading state**: show a placeholder before the first token, let the tool steps themselves be the progress messages, and for tasks that run several minutes, switch to a step checklist and notify on completion.

**Common misconception: streaming makes the answer finish sooner.** It only makes the wait visible. For content that must pass an output guardrail first (← [S16 Security and Governance](/en/stages/s16-security/)) or structured output, show progress and present the result all at once when it's done.

<details class="deep">
<summary>Before you build: streaming display details</summary>

- **Incomplete Markdown**: a code block or table halfway through streaming isn't closed yet, so rendering it directly causes flicker or broken layout. You can render the "full text so far" every time and temporarily close any open markup.
- **Render frequency**: re-rendering on every chunk slows the page. Update at most once per animation frame.
- **Auto-scroll**: when the user scrolls up to read, stop auto-scrolling to the bottom and show a "Jump to latest" button.
- **Checking while streaming**: when output needs checking, you can buffer one complete sentence, check it, then display it. That adds one sentence of latency, but you don't have to wait for the whole answer.
- **Tool arguments**: while a tool call's arguments are streaming, they're incomplete JSON (← partial JSON in S6 LLM APIs and Application Basics). The card can show the tool name first and the arguments once they're complete.

</details>

### ★ How should tool results be displayed?

**Generative UI** means the model's output isn't just text: it decides which UI component to show and what data to fill in. The most common case is rendering tool calls: each tool has a matching component that shows loading, result or error depending on the tool's state. A component's inputs are called **props** in React, like a function's parameters. For example, `notes_search` returns 5 notes, and the frontend renders a `NoteCard` for each, with props like `{ title: "Monday product meeting", date: "2026-11-02", snippet: "Decided to push the launch date to…", noteId: "n_381" }`. The user sees cards they can open, not a blob of JSON.

Cards are also a source of **transparency**, and that should be layered: by default show one line, "Searching notes: taxes," and reveal the full input and output only when expanded. Twelve tool calls all expanded at once is the same as no information.

**Common misconception: generative UI means letting the model write arbitrary HTML.** Usually it means picking a prebuilt component and filling in props. Props are untrusted data, so validate their shape before rendering. Sanitize Markdown first (strip executable content and auto-loading links), and don't auto-load untrusted images or links (EchoLeak sent data out through exactly such an auto-loading URL; ← S16 Security and Governance).

<details class="deep">
<summary>Going deeper: AG-UI, MCP Apps and ready-made frameworks</summary>

Beyond components, two protocols solve problems between two different pairs of parties:

- **AG-UI** covers "agent backend ↔ your frontend": an event protocol that defines events for text streaming, tool calls, state snapshots and deltas, run lifecycle and so on. Different agent frameworks that all emit AG-UI events can plug into the same frontend. The categories are: text message start / content / end; tool call start / args / end; state snapshot and delta; run start / finish / error. CopilotKit is its first-party client. You can model the fake backend in the core exercise on its events.
- **MCP Apps** covers "MCP server ↔ third-party host": an official MCP extension (stable spec dated 2026-01-26) that lets an MCP server provide its own interactive UI, shown inside a host such as an AI assistant (MCP ← [S10 Tools and MCP](/en/stages/s10-tools-mcp/)). A tool links to a `ui://` resource, the host renders it in a sandboxed iframe, and the two sides talk over JSON-RPC. MCP-UI, the community project that preceded it, has been merged into this standard and provides SDKs.

If you're only building your own web app and don't plan to be embedded in someone else's host, you don't need MCP Apps. AG-UI is optional too; defining your own event format works just as well.

**Vercel AI SDK** represents each tool call as a message part with a `state`, such as `input-available` (arguments complete, running), `output-available` (has a result) and `output-error` (failed). The frontend switches the card's appearance by state. It has no "cancelling" or "cancelled" state; you have to derive those yourself from the abort and the result you look up on the backend.

</details>

### ★ How do you handle stop, errors and empty results?

Treat one run as an explicit state machine; the earlier table is its spec. A run's states are `idle → streaming → running_tool → awaiting_approval → done`, plus `interrupted` and `error`. Each tool call also has its own state:

| Tool state | When it's entered | Card shows |
|---|---|---|
| `awaiting_approval` | Approval requested; the tool hasn't run | Confirmation card |
| `running` | The tool starts running | Running |
| `cancelling` | Cancel requested or connection lost while running; result unknown | "Cancel requested, checking…" |
| `completed` | Result received, or verified as completed | Done |
| `cancelled` | Verified as never run, or still awaiting approval when stopped | Canceled |
| `failed` | Execution failed, or verified as failed | Failed, with the reason |

**Stop** has to propagate all the way to the backend (cancel the model stream, ask the tool to abort). A partially finished message is marked "Interrupted," and the next round's context needs to know that too. The hard part is side effects already in flight: if the user clicks "Send" and then hits stop while the send is still running, the email may already have gone out. So the card can't go straight to "Canceled." It enters `cancelling` first, and the screen says "Cancel requested, checking whether the email was sent." The backend first confirms the tool has stopped (aborted successfully or finished), then uses the operation ID from S12 The Agent Loop and Harness (as an idempotency key; if you haven't read S12, it's the idempotency key from S6 LLM APIs and Application Basics) to look up what actually happened; only a lookup at that point counts. While the tool is still running, not finding the key doesn't mean the email wasn't sent, so stay in `cancelling`. Only after the lookup do you mark it `completed` ("Sent to 4 people"), `cancelled` ("Not sent") or `failed`, and write that into the next round's context. A tool still awaiting approval when the user hits stop never ran, so mark it `cancelled` directly; no lookup needed.

**Errors** come in two kinds. A tool failure is a normal event: the card is marked failed and the result goes back to the agent so it can try another approach. A dropped connection should keep whatever was already received and show "Retry." An **empty result** isn't an error: tell both the agent and the user clearly "nothing found" and offer a next step, or the model tends to make things up.

The user's own actions (for example deleting a memory) can use an **optimistic update**: change the screen first and roll back if it fails. The agent's actions can't: showing "Sent" and then taking it back hurts trust more than being a second slower.

**Common misconception: stopping just means removing the spinner.** The frontend has stopped, but the backend may still be running (← S6 LLM APIs and Application Basics). Marking it "Canceled" right away may misreport an email that was actually sent.

<details class="deep">
<summary>Before you build: implementing the state machine and cancellation</summary>

- **Event-driven**: the state machine only takes events (text chunk, tool start, tool result, approval requested, finish, error, user cancel) and outputs the current state. The UI only reads state and makes no decisions of its own. That way you can drive it through every scenario with tests, without writing a frontend.
- **Index tool calls by ID**: store each tool call as `{ id, name, args, status }`, and have events update the matching entry by ID.
- **Termination invariants**: on entering `interrupted` or `error`, every `running` tool becomes `cancelling`; tools not yet approved when stopped become `cancelled` directly (they never ran, so no lookup is needed); `cancelling` only turns into `completed`, `cancelled` or `failed` after the actual result is found. If it can't be found (for example the backend is also disconnected), stay in `cancelling` and change the card to "Result unknown, please check yourself." Don't guess. Tests assert two things: after termination no tool is `running`; after the fake backend answers the lookup, no tool is left in `cancelling`.
- **The cancellation path**: frontend `AbortController.abort()` → backend detects the client disconnect (or receives a cancel request) → stops the generator, cancels the model stream, asks the tool to abort → logs it (for example "cancelled at event N", to make latency easy to measure). Once the fake backend receives a cancel, it stops sending events. The tool's actual result is looked up with a separate request, by tool call ID or by the operation ID from S12 The Agent Loop and Harness (as an idempotency key). The backend must confirm the tool has stopped before a lookup result counts; not finding the key while the tool is still running doesn't mean it didn't run. With Python streaming frameworks, confirm the generator really stops when the client disconnects.
- **Approval is a tool result**: on rejection, the agent gets the result "user declined" and the run continues, rather than throwing an exception that ends the whole run.

</details>

### ★ How do you make AI mistakes easy to undo?

**Defensive UX** starts from the premise that the AI will make mistakes, so mistakes should be easy to spot and easy to discard. Principles collected by [Eugene Yan](https://eugeneyan.com/writing/llm-patterns/):

- **Set expectations**: say clearly what it can and can't do, for example "I won't send email without your confirmation."
- **Easy dismissal**: rejecting a suggestion should cost as little as possible, for example completions in light gray text that disappear when you keep typing.
- **Attribution**: mark what the AI produced and which sources it's based on, for example "Created by the assistant" plus source links.

**Common misconception: having a "Close" button counts as easy dismissal.** If rejecting takes three clicks and accepting takes one, users will lean toward accepting, which pushes the AI's mistakes onto them.

### ★ How much should users trust it?

Matching users' trust to how reliable the AI actually is is called **trust calibration**: too much trust and mistakes slip through; too little and users recheck everything. You covered calibration and abstention in [S8 Eval Methodology](/en/stages/s08-evals/); here the question is how to present them:

- Don't show raw scores people can't interpret. Use a few levels, for example "supported by sources / partly supported / no source found."
- For RAG answers, the most useful signal is usually **citations** (← [S9 Retrieval and RAG](/en/stages/s09-rag/)): mark the source of each sentence, and clicking jumps to the matching passage in the original note.
- When it chooses not to answer, give the reason and a next step, for example "Your notes don't mention the tax filing deadline. Want me to list the 3 related notes?"

There are three ways to present a sentence with no source: mark it sentence by sentence with a different style (most informative), delete it (most conservative, but it may delete correct common knowledge), or add a note at the top saying "some content has no source" (takes the least space, but doesn't say which sentence). In domains where mistakes are costly, marking sentence by sentence works best, so users know which sentences to check themselves.

First verify that the levels actually track accuracy. For example, in a 200-question golden set, the 150 questions marked "supported by sources" got 141 right (94%), and the 50 marked "no source found" got 30 right (60%). If the two groups were about the same, showing the levels would only mislead.

**Common misconception: showing "92% confident" means it's calibrated.** Users have a hard time interpreting that number, and the confidence a model reports about itself is often inaccurate (← S8 Eval Methodology).

<details class="deep">
<summary>Going deeper: where per-answer uncertainty signals come from</summary>

The judge in S8 Eval Methodology is for offline evaluation. Each live answer needs its own signal, and Claude's API doesn't return logprobs. Common approaches:

- **Self-consistency**: run the same question 2–3 more times and check whether the answers agree; downgrade if they don't. The cost is 2–3× the calls.
- **Online judge**: run the judge you calibrated in S8 Eval Methodology on every answer. This adds both latency and cost.
- **Citation coverage**: the share of sentences supported by sources (← the citation metrics in S9 Retrieval and RAG). Adds almost no cost, and suits RAG-style answers best.

Once you've picked a signal, compute accuracy per group on the golden set, the same way as the 150 / 50 split above. Confirm that higher levels mean higher accuracy before you display them. This is step 0 of the advanced exercise, A17 Complete Frontend ([how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)).

</details>

### ★ When should you ask the user?

Confirmation screens only work when they're rare and their content is easy to understand. That's the answer to the question S16 Security and Governance left open. Three principles for **human-in-the-loop** (HITL):

1. **Only confirm high-risk actions.** Following the risk tiers from [S10 Tools and MCP](/en/stages/s10-tools-mcp/): read-only actions don't ask; reversible ones don't ask but offer "Undo" afterward; only irreversible actions or ones that affect other people ask (this is how auto mode works; ask mode still asks for medium risk, ← [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)).
2. **Show what will actually happen.** The full recipients and body, the file diff (a side-by-side of which lines changed), not just "Are you sure?"
3. **Make rejecting cheap.** "Edit" and "Cancel" are as prominent as "Approve," and the agent keeps working after a rejection.

Do the math once: a run has 12 tool calls, 8 read-only, 3 reversible (creating or editing notes) and 1 email send. Asking for every one means 12 confirmations; with tiers it's just 1, and the moment users see it they know "this one matters." You can also have the action classifier from S16 Security and Governance decide which ones need a human first.

**Common misconception: more confirmations are safer.** When there are so many that users approve by reflex, they work worse than a few well-chosen ones, and they add a false sense of security: "the user approved it."

### ★ How do you collect user feedback?

Feedback turns every use into data for improving the system, provided each item can be traced back to a trace. **Explicit feedback** is given deliberately by the user (thumbs up / down, a reason for the error): the signal is clear, but there's little of it, and it skews toward unhappy users. **Implicit feedback** is inferred from behavior (copying, editing a draft, regenerating): there's lots of it, but it needs interpreting.

An example: in one week there are 1,000 answers. Only 30 get a thumbs up or down (3%), yet 240 are copied and 90 are regenerated. A 200-word draft where 120 words get changed has an edit ratio of 60%, which you can treat as one "poor draft quality" signal.

**Common misconception: implicit signals can be read directly as good or bad.** Copying might mean the answer was good, or that the user is pasting it to a coworker to complain; regenerating might mean the answer was wrong, or that they want to see another version. Sample a batch of traces and compare before you decide what a signal means.

Both kinds of feedback should carry the trace ID. Then build yourself a **reviewer UI**: view traces, mark pass / fail, add to the golden set in one click. It's the entry point to the data flywheel from [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/).

<details class="deep">
<summary>Before you build: the feedback event format</summary>

- **Minimum fields**: `trace_id`, `message_id`, `type` (for example `thumb`, `copy`, `regenerate`, `edit`), `value` (up / down, edit ratio and so on), an optional `reason`, and a timestamp. Without the first two, the feedback can't be linked back to a trace.
- **IDs come from the backend**: the backend sends the trace ID and message ID to the frontend when the stream starts. Don't generate them on the frontend, or they won't match the backend's traces.
- **Edit ratio**: you can use edit distance divided by the original length. As long as you compute it the same way every time, you can compare before and after a change.
- **The reviewer UI is just for you**: list traces with negative feedback, tag failure types, export to the eval dataset. Gradio or Streamlit is enough.

</details>

### ★ How do you keep proactive notifications from being annoying?

A **proactive agent** sends messages without waiting for the user to ask, and the key is the cost of interrupting. Set a notification budget (for example at most 3 a day), batch into a daily digest where you can, make every notification able to turn off its whole category in one click, and track whether users act on notifications. When click-through is low, first break it down by notification type and send time to see which kind nobody clicks, then decide whether to batch, reschedule or drop it. S19 Real Agent Systems and the Capstone builds a proactive agent.

A **personalized interface** (← [S13 Memory and Personalization](/en/stages/s13-memory/)) should let users see and edit what the agent remembers ("because you said you prefer bullet-point summaries").

**Common misconception: the less noticeable the personalization, the better.** Invisible personalization easily feels like surveillance. Visible, correctable personalization is what builds trust.

### ★ How do you know the interface is usable?

**Usability testing** watches real users operate the interface. It measures behavior, not opinions. Find a few people who weren't involved in building it and give them concrete tasks; ask them to say their thoughts aloud as they go (think-aloud). You only observe; no hints. For each task, record whether it was completed, how long it took and where they got stuck. Fix the worst problems, then test again.

Example: the task "Organize last week's tax notes and email them to your accountant." The second participant didn't finish: the confirmation card was only visible after scrolling down, and they thought the assistant had frozen. After pinning the confirmation card above the input box, the retest took 1.5 minutes.

**Common misconception: asking "Do you find it easy to use?" is enough.** What you get back is mostly politeness. Two participants are enough to find the worst problems, but comparing success rates between versions needs more people (← S8 Eval Methodology).

<section class="deep-section">

### ○ How are voice interfaces different?

Voice interfaces have stricter latency requirements (from the end of speech to the start of a response usually needs to be under a second), and they have to handle interruptions (barge-in) and turn-taking. Architecturally, you can use a speech-to-speech realtime model, or chain three stages: speech recognition, an LLM and speech synthesis.

</section>

<section class="deep-section">

### ○ What are the product tradeoffs of in-browser models?

The optional section of S6 LLM APIs and Application Basics introduced running models in the browser (transformers.js, WebLLM, Chrome built-in AI). The product tradeoff: data never leaves the device and it works offline, in exchange for waiting for the model to download the first time and being limited to small models. It suits small privacy-sensitive or offline tasks, and the interface has to handle an extra loading state, "downloading model."

</section>

<section class="deep-section">

### ○ How will AI change work?

AI products change how work is divided. Some research tries to measure how far models can go on real occupational tasks (for example GDPval). This topic doesn't affect implementation, but it does affect how you judge which work your product should replace and which it should assist.

</section>

## Exercises

Concepts route (no coding): after "Try it first," you can skip to the self-check.

### Try it first (about 10 minutes)

1. An answer is about 400 tokens, generated at 40 tokens per second, after a 2-second search. Without streaming, how long until the user sees anything? What should appear on screen in the first 2 seconds?

   <details class="hint">
   <summary>Check your answer</summary>

   400 ÷ 40 = 10 seconds, plus the search makes 12 seconds before anything shows. Following the lecture: within 0.1–1 second show `Thinking…`, then a "Searching notes" tool card, and after 2 seconds the text starts streaming, so the screen keeps changing.

   </details>

2. The user hits stop while the email tool is running. What is the card's next state, and what does it say? What should happen on the frontend, on the backend and in the next round's context?

   <details class="hint">
   <summary>Check your answer</summary>

   The card enters `cancelling`; it can't say "Canceled" right away. The backend stops producing events and asks the tool to abort; once it confirms the tool has stopped, it uses the operation ID (as an idempotency key) to check whether the email was sent. Only after that lookup does the card change to "Sent," "Not sent" or "Failed," and that goes into the next round's context.

   </details>

### Core: the four state problems of an agent interface

**Goal**: build an agent frontend that doesn't depend on a real model and correctly handles four kinds of state: streaming, tool calls, approval and interruption.

**Steps**
1. Write a fake agent backend that follows prewritten scripts and sends events over SSE, including text chunks, tool call start, tool call result, approval requested, run finished and error. You can define the event format yourself or follow AG-UI's event types. The fake backend also provides an endpoint that looks up a tool's actual result by tool call ID / idempotency key. If you recorded record / replay fixtures in S6 LLM APIs and Application Basics, you can reuse them.
2. Prepare 5 scripts: (a) a normal answer with 2 tool calls in the middle; (b) a tool fails and the agent switches to another approach; (c) the user hits stop while the email tool is running, with two outcomes: already sent when stopped, and not sent; (d) a high-risk tool requests approval and the user rejects it; (e) the connection drops mid-stream.
3. The frontend manages a run with an explicit state machine. Each tool has its own card component showing "Running / Cancelling / Done / Failed / Canceled" according to its state; "Cancelling" only changes to another state once the tool's actual result is found; a tool still awaiting approval when stopped goes straight to "Canceled."
4. The stop button has to cancel all the way to the backend: once the fake backend receives a cancel, it must stop sending events and log "cancelled at event N."
5. Each assistant message has thumbs up / down and an optional reason field; the feedback event sent must carry the trace ID and message ID and be written to a local `feedback.jsonl`.

**No-frontend version**: steps 1, 2, 4 and 5 stay the same; step 3 becomes three things:
- Write the state machine as a class with no UI dependency: events in, state out, with each tool call holding its own state (Running / Cancelling / Done / Failed / Canceled).
- **Script tests**: write a client with pytest (or Vitest) that connects directly to the fake backend's SSE and drives the state machine through all 5 scripts, asserting each script's final state, each tool call's state, and that no tool is left "Running." In script (c), the test sends the cancel after a specified event; in script (d), the test sends "reject."
- **Minimal interface**: connect the same state machine to Gradio or Chainlit, and run at least scripts (a), (c), (d) and (e) by hand. Gradio's `gr.ChatInterface` swaps the send button for a stop button while streaming; tool calls can be shown with the `metadata` of `gr.ChatMessage` (`title` and `status`: `pending` / `done`); use two buttons for approve and reject. Note that Gradio's stop only stops your generator. Make sure the generator closes the stream to the backend when it ends, or the fake backend never receives the cancel.

**Acceptance criteria**
- All 5 scripts render correctly (5/5), each with a screenshot of the final state (one each for (c) sent and not sent).
- Script (c): ≤ 500 ms from hitting stop to the cancel record appearing in the backend log (measure with browser devtools or backend timestamps); after stopping, no card still shows "Running"; after the fake backend returns the final result, no tool is left "Cancelling," and the result on the card matches the fake backend (both sent and not sent must be right).
- Script (d): the approval screen shows the tool name and full arguments; after rejection the agent receives a "user declined" result rather than the whole run failing.
- Script (e): the screen shows an interruption message and offers retry; the partial content already received isn't lost.
- 100% of the feedback in `feedback.jsonl` has a trace ID and message ID.
- No-frontend version:
  - "Renders correctly" becomes all 5 script tests passing (5/5).
  - Screenshots become a state-transition log for each script, plus interface screenshots for the scripts you ran by hand.
  - For (c), the 500 ms is the backend log timestamp minus the timestamp when the test sent the cancel; the test must also assert that after the fake backend returns the final result no tool is left "Cancelling," and that tool states match the fake backend's results.
  - The approval content for (d) and the interruption message for (e) must appear in the minimal interface; for (e), a test asserts that the partial content already received isn't lost.

**Hints**
- TypeScript: React + Vercel AI SDK's `useChat` (a tool part's state roughly maps to the card's state; you have to derive "Cancelling" and "Canceled" yourself from the abort and the actual result you look up), or write it yourself with `fetch` + `ReadableStream` + `AbortController`; the state machine can be XState or a reducer.
- Python: use FastAPI's `StreamingResponse` or sse-starlette for the backend, and make sure the generator stops when the client disconnects; for the interface and tests, see the "No-frontend version" above.
- If you're stuck:
  - Reread: [One example, end to end](#-one-example-end-to-end), [How do you handle stop, errors and empty results?](#-how-do-you-handle-stop-errors-and-empty-results) (including "Before you build")
  - Further: Vercel AI SDK's "Generative User Interfaces," AG-UI event types

**Reminder**: if you choose the "No-frontend version," do both the script tests and the minimal interface.

<section class="deep-section">

### Advanced: System project A17: Complete Frontend

**Goal**: turn your system into an interface two real users can complete tasks with, and make the feedback it generates flow into your eval dataset (← S14 Agent Evals, Data and Optimization). Then run a usability test on it.

**Steps**

0. **Prerequisite: a per-answer uncertainty signal**. The judge from A8 Error Analysis and Golden Set is for offline evaluation; none of the earlier system project steps produced an uncertainty signal for each live answer, and Claude's API doesn't return logprobs. If you don't have one yet, add one: for example self-consistency (run the same question 2–3 more times and check whether the answers agree), running the same judge online on every answer, or citation coverage (the share of sentences supported by sources, ← S9 Retrieval and RAG). Confirm on the golden set that the signal's levels track accuracy before you display it.
1. Connect the core exercise's state machine to your real agent (← S12 The Agent Loop and Harness). Every tool has a matching component, and at least 2 tools use generative UI (structured cards, not JSON strings).
2. **Citations** (← S9 Retrieval and RAG): every citation in an answer can be clicked to jump to the matching passage in the original source; sentences with no source are marked with a different style.
3. **Uncertainty** (← S8 Eval Methodology): based on the signal from step 0, show three or fewer levels; when the system chooses not to answer (abstention), give the reason.
4. **Confirmation**: for actions that are high risk under the S10 Tools and MCP tiers, or marked high risk after your S16 Security and Governance audit, always show the actual content (recipients, diff and so on) before letting the user confirm.
5. **Feedback**: explicit (thumbs up / down + reason) and at least 2 kinds of implicit signals (for example copying, editing an AI draft, regenerating), all written to the trace store with the trace ID.
6. **Reviewer UI**: a page just for you that lists traces with negative feedback, lets you tag failure types, and exports to the eval dataset in one click (← S14 Agent Evals, Data and Optimization).
7. **Memory view** (← S13 Memory and Personalization): users can see, edit and delete what the system remembers.
8. **Usability test**: find 2 users, give each 3 tasks, and ask them to think aloud as they work. Record whether each task was completed, how long it took and where they got stuck. Fix the 2 worst problems, then have at least 1 user retest.

**Acceptance criteria**
- 2 usability test records, each with ≥ 3 tasks, recording completion, time and problems; at least 1 task has a before/after comparison of completion time or success rate.
- 100% of feedback events generated during testing can be mapped to a trace.
- Export ≥ 10 labeled cases from the reviewer UI to the eval dataset (← S14 Agent Evals, Data and Optimization), and actually run that eval once.
- Hitting stop in any state never leaves a "Running" component behind and never lets the backend keep running a tool (test at 5 random moments; 5/5 pass).

The notes assistant as an example: note search results show as note cards you can open; "Summarize this week's meeting notes and email the summary to the team" first shows the draft and recipients for the user to confirm; when the user rewrites half of the AI draft, that edit distance is one piece of implicit feedback.

**Hints**
- TypeScript: Vercel AI SDK or CopilotKit (AG-UI's first-party client); for jumping to citations, use URL fragments or Text Fragments.
- Python: this exercise needs a real frontend. If frontend isn't your strength, start with Vite's React template plus Vercel AI SDK's `useChat` (the Chatbot example in S6 LLM APIs and Application Basics' further reading works almost as is); the FastAPI backend just needs to emit the AI SDK's [stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol). If you've never written a frontend, you'll need to pick up some frontend basics first. The reviewer UI is just for you, so Gradio or Streamlit is enough.
- If you're stuck:
  - Reread: [How much should users trust it?](#-how-much-should-users-trust-it), [How do you collect user feedback?](#-how-do-you-collect-user-feedback), [How do you know the interface is usable?](#-how-do-you-know-the-interface-is-usable)
  - Further: the "Collect user feedback" section of Eugene Yan's post; Microsoft's Guidelines for Human-AI Interaction as a checklist

</section>

## Self-check

1. In your own words: why is implicit feedback more plentiful than thumbs up / down, yet harder to use? Give one implicit signal from your system and describe how it could be misread. (Concepts route: answer using the notes assistant)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the same behavior has several interpretations (copying might mean satisfaction, or forwarding it to complain), so you have to sample traces to know what it means. **Common mistake**: counting "was copied" as positive feedback. **Reread**: [How do you collect user feedback?](#-how-do-you-collect-user-feedback)

   </details>

2. Why does generative UI usually mean picking prebuilt components and filling in props, rather than letting the model write HTML? What do you have to do to props before rendering?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: prebuilt components have controlled appearance and behavior; props come from model or tool output and are untrusted data, so validate their shape before rendering, sanitize Markdown, and don't auto-load external images. **Common mistake**: assuming content the model generated itself can be rendered directly. **Reread**: [How should tool results be displayed?](#-how-should-tool-results-be-displayed)

   </details>

3. One sentence in your RAG answer has no source. List three ways to present it, and say which you'd choose and why.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: in high-risk domains, mark it sentence by sentence. **Common mistake**: deleting it outright, so users don't know the content was changed. **Reread**: [How much should users trust it?](#-how-much-should-users-trust-it)

   </details>

4. A proactive reminder feature has been live for a week, and the click-through rate on notifications is 5%. What would you change first? What data would you look at before deciding?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: first break it down by notification type and send time, find which kind nobody clicks, then decide whether to batch, reschedule or drop it. **Common mistake**: switching everything to a daily digest without looking at the data first. **Reread**: [How do you keep proactive notifications from being annoying?](#-how-do-you-keep-proactive-notifications-from-being-annoying)

   </details>

5. Without looking at the lecture, walk the notes assistant through "Turn last week's notes that mention taxes into a list": for each state, list what the user sees and can do, then describe what the screen should show when the search finds 0 notes.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: every state needs a screen and available actions (at minimum, stop); with 0 results, say clearly "nothing found" and offer a next step, rather than forcing out a list. **Common mistake**: leaving out the waiting or tool-running screens, or not offering stop. **Reread**: [One example, end to end](#-one-example-end-to-end)

   </details>

6. Scenario: the notes assistant shows 6 confirmations per run on average, and users approve almost all of them without reading. How would you redesign it? Which actions still need confirmation, and what should the confirmation card show?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: following the risk tiers, keep only irreversible actions or those that affect others, and turn reversible ones into an "Undo" afterward; the confirmation card shows the actual content (recipients, body, diff), and rejecting is as easy as approving. **Common mistake**: just making the confirmation card more eye-catching while keeping the same number. **Reread**: [When should you ask the user?](#-when-should-you-ask-the-user)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original sources, how existing frameworks do it, or more product case studies. None of it is required.

### Principles and design patterns

- [Eugene Yan: Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) (2023) — the Defensive UX and Collect user feedback sections are the original sources for those two lecture sections, with more product examples.
- [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) (2024-06) — the Strategic section fully explains "the model isn't the product" and why to start small.
- [Microsoft ai-agents-for-beginners L03: AI Agentic Design Principles](https://github.com/microsoft/ai-agents-for-beginners/tree/main/03-agentic-design-patterns) — one of the few course materials that talks directly about agent UX; the examples are tied to Azure, but the principles are general.
- [Microsoft: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/) (2019) — the full set of 18 guidelines; usable as a UI audit checklist.
- [Nielsen Norman Group: Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) — the source of the lecture's 0.1 / 1 / 10 second limits, explaining what feedback to give users at each.

### Official docs and protocols

- [Vercel AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) — concrete code for tool call → component, and the tool part's states.
- [AG-UI Overview](https://docs.ag-ui.com/introduction) — a list of event types; after reading it you'll know which states an agent frontend has to handle. You can model the core exercise's fake backend on it.
- [modelcontextprotocol/ext-apps (MCP Apps)](https://github.com/modelcontextprotocol/ext-apps), [MCP-UI](https://mcpui.dev/) — the standard and SDKs for MCP servers providing UI.

### Books and courses

- Chip Huyen, *AI Engineering* (paid book), ch1 (deciding whether to build an AI application) and ch10 (architecture and user feedback); the [companion repo](https://github.com/chiphuyen/aie-book) has summaries.
- [Stanford CS 224G](https://web.stanford.edu/class/cs224g/) — startup-oriented; the product sessions.
- [Stanford CS 329Z](https://cs329z.stanford.edu/), the Proactive Agents session (read once the slides are public).

</section>
