---
title: S12 The Agent Loop and Harness
head:
  - tag: title
    content: How Do You Build an AI Agent? A Hand-written Agent Loop (S12) | Token2Agent
description: Build an AI agent without a framework, hand-writing the loop where the model decides, your code executes and results feed back, then add permissions, stop conditions, error handling and long-task context management, and use repeated runs to tell whether a change helped.
sidebar:
  order: 12
  label: S12 The Agent Loop and Harness
---

:::note[This chapter]
**Prerequisites**: [S8 Eval Methodology](/en/stages/s08-evals/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S11 Context Engineering](/en/stages/s11-context-engineering/); for model background see the [Model Crash Course](/en/guide/app-first/#model-crash-course)　**Next**: → [S13 Memory and Personalization](/en/stages/s13-memory/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/)
:::

:::tip[Concepts route: key points]
- An agent is just a loop: the model decides the next step and your code executes it, until the work is done or it's time to stop.
- The notes assistant always asks before sending an email. Code enforces this; it isn't written into the prompt.
- After changing code outside the loop, compare numbers over many tasks and many runs to know whether it got better.
:::

## What this chapter covers

S10 Tools and MCP let the model call tools, but each call is a single step. This chapter answers: how do you let the model work through a multi-step task one step after another, safely, with a reliable way to stop and without spiraling when something goes wrong? The core of an agent is just a loop: the model decides the next step, your code executes it, the result goes back into the context, and this repeats until the model says it's done (mini-SWE-agent from S0 The Big Picture is exactly this loop). The code wrapped around the loop that makes it reliable is called the harness: permissions, stop conditions, error handling, state, long-horizon context management, skills. Every harness component encodes an assumption about "what the model can't do on its own," so this chapter also uses a minimal agent eval from the start to judge whether a change helps.

## After this chapter you can

- Write out an agent loop trace table by hand: what the model decides each round, what the harness does (including the permission decision), what gets fed back, and which stop condition ends the run. (lecture and self-check)
- Name what frameworks like LangGraph and the OpenAI Agents SDK do for you and which decisions they hide; both exercises deliberately skip frameworks. (lecture and self-check)
- Hand-write an agent loop with a permission gate, hooks and stop conditions, without any framework, and explain what each line does. (core)
- Decide how each tool behaves in plan / ask / auto mode, and show that high-risk actions always ask first. (core)
- Judge every harness change with pass^k and confidence intervals over "n tasks × k runs," not one or two results. (core)
- Choose compaction or sub-agent isolation for long tasks (plus context resets and structured notes from the "Going deeper" box), and state the tradeoffs. (advanced)

## Lecture

Start with the big picture. An agent has two parts. The **model** decides the next step (which tool to call with what arguments, or declaring it's done). The **harness** is all the rest of the code: it actually runs tools, checks permissions, records every step and decides when to stop (see the [Glossary](/en/reference/glossary/)). The whole loop has just four steps:

1. Send the current messages (system prompt, tool definitions, user request, and every tool call and result so far) to the model.
2. The model replies. If the reply contains tool calls, the harness runs a permission check first, then executes them.
3. Append the tool results to the messages.
4. Check the stop conditions; if none applies, go back to step 1.

The whole chapter uses one example: the **notes assistant** (user: Sam). The tools keep the names and risk levels from S10 Tools and MCP: `notes_search` (low risk), `notes_create` (medium), `email_draft` (medium, only creates a draft), `email_send` (high, actually sends).

### ★ One example, end to end

Each round, the model decides just one step. The harness executes it and feeds the result back, and the model looks at the result before deciding the next step.

In ask mode (every write asks first; see the 🔒 section below), the user sends: "Turn last week's meeting notes into a weekly report, save it as a new note, then draft an email to my manager." The table below is the full record of one run (a trace). The token counts are illustrative, but the sums all check out:

| Round | Context sent this round | Model's decision | What the harness does | Result fed back |
|---|---|---|---|---|
| 1 | 3,000 tokens | Calls `notes_search(query="meeting", range=last week)` | Low risk, runs directly | Excerpts from 4 meeting notes, about 2,400 tokens |
| 2 | about 5,450 | Calls `notes_create(title="Weekly report Oct 26–Nov 1", body=…)`, body about 600 tokens | Medium risk, ask mode → asks the user, user allows | `{id: "n_311"}` |
| 3 | about 6,080 | Calls `email_draft(to="my manager", …)` | Medium risk → asks, allowed; the tool returns an error | Error: "to must be an email address"; `email_draft` has failed 1 time in a row |
| 4 | about 6,420 | Calls `request_human_input("What's your manager's email?")` | Pauses and waits for the user's reply | "chen@example.com" |
| 5 | about 6,480 | Calls `email_draft(to="chen@example.com", …)` again | Asks, allowed; succeeds | `{draft_id: "d_88"}`; failure count reset to zero |
| 6 | about 6,810 | Calls no more tools and replies "The weekly report is saved as a note, and the email draft is in your drafts folder, not sent yet" | Stop condition met: the model declared it's done | — |

A few things stand out in this table:

- **The next step is decided after seeing the result.** Before round 3 failed, nobody (including you, the one writing the code) knew a round 4 would be needed to ask for the email address. That's the difference between an agent and a workflow: in a workflow the steps are written into code ahead of time; in an agent the model decides the next step (← [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)). When the number and order of steps depend on intermediate results, a workflow isn't enough.
- **An error is also a result.** A failing tool doesn't crash the program. It becomes a short error message returned to the model, and the model corrects itself.
- **Every round resends the whole history.** The input over 6 rounds totals 3,000 + 5,450 + 6,080 + 6,420 + 6,480 + 6,810 = 34,240 tokens, about 5 times the final round's context. As the step count grows, cost grows faster than the step count, which is why prompt caching (← S11 Context Engineering) and the long-horizon context management below matter.

This way of interleaving "think a step, take a step, look at the result" is called **ReAct** (Yao et al. 2023). Two other common variations: **plan-and-execute** has the model write out a full plan first and then carry it out step by step, which suits tasks whose steps are clear up front; **reflection** (e.g. Reflexion, Shinn et al. 2023) has the model write a critique after a failure and retry with that critique in hand. All three run on the same loop underneath.

**Common misconception: an agent is a special kind of model.** The model in the table above is an ordinary API called over and over; the ability to do multi-step work comes from the loop and the harness. Frameworks (LangGraph, the OpenAI Agents SDK and others) just wrap this loop, and in doing so decide for you how state is stored, whether you can pause between choosing a tool and running it, where hooks and permissions go, what a trace looks like, and how easy it is to switch models. Write it yourself once, and afterwards you'll know what any framework is doing underneath.

This is the code version of the four steps above; skip it if you're not writing code. The skeleton is about a dozen lines (pseudocode):

```text
messages = [system, user_request]
loop:
  if stop condition met: break
  reply = model(messages, tools)
  messages.append(reply)
  if reply has no tool calls: break        # the model declared it's done
  results = []
  for call in reply.tool_calls:
    decision = pre_tool_use(call)          # allow / ask / deny
    result = execute(call) or denial reason
    post_tool_use(call, result)            # write the trace
    results.append(tool_result(call.id, result))
  messages.append(results)                 # see the box below for the format
```

The API reply indicates whether the model asked to call tools this time. One reply can contain several tool calls; each goes through the permission check separately, so don't handle only the first. Every tool call needs a result returned to the model, and the format for returning it depends on the vendor (see the box).

<details class="deep">
<summary>Before you build: detecting tool calls and returning results</summary>

- **Detecting tool calls**: in the Anthropic API the reply's `stop_reason` is `tool_use`; in OpenAI Chat Completions the `finish_reason` is `tool_calls`. Tool results must carry the matching call ID; Anthropic's `tool_result` can set `is_error: true` to tell the model it's an error.
- **Returning multiple tool calls**: Anthropic wants all of a round's `tool_result` blocks in one user message, placed before any text; OpenAI uses one `role: "tool"` message per call, each with its `tool_call_id`.

</details>

<details class="deep">
<summary>Before you build: pass reasoning models' thinking back</summary>

Some APIs require you to pass the previous round's thinking content back unchanged during a tool-call loop (interleaved thinking, ← S6 LLM APIs and Application Basics). Don't drop it when you assemble messages yourself.

</details>

### ★ What wraps around the loop?

The table in the previous section exists only because the harness recorded every step. That record is your debugging tool, the basis for resuming a run, and the raw material for evals later.

Common harness components:

- **Permissions**: whether an action may run, and whether to ask first (next section).
- **Hooks**: code inserted before and after a tool runs. `pre_tool_use` runs **before** execution and decides allow / ask / deny, and can also rewrite arguments; `post_tool_use` runs **after** execution and records or checks the result.
- **State / checkpoints**: save current progress so a run can continue after a crash or a pause.
- **Retry**: handle transient errors (← retry and idempotency in S6 LLM APIs and Application Basics; retry is covered in [When should the loop stop?](#-when-should-the-loop-stop), idempotency later in this section).
- **Human in the loop** (HITL): pause when a person needs to decide.
- **Budget**: caps on steps, tokens and money.
- **Telemetry**: every step goes into the trace (← S6 LLM APIs and Application Basics).

**Keep state in one place.** Factor 5 of [12-factor-agents](https://github.com/humanlayer/12-factor-agents) recommends merging "execution state" (which step you're on, what you're waiting for) and "business state" (which messages and tool calls have happened) into a single append-only event log wherever possible. In the example above, when round 4 pauses for the user, the harness only needs to save the events of the first 4 rounds. If the user replies the next day, that's fine: read the log back, append the reply and continue from round 5.

**The biggest risk when resuming from a checkpoint is running something twice.** Say the program crashes after round 2's `notes_create` has run but before its result is written to the log. On resume, the call runs again, and the user ends up with two weekly reports. The fix is to give every operation with side effects its own operation ID and use it as an idempotency key (← S6 LLM APIs and Application Basics):

1. The harness generates the ID when the operation is first planned.
2. It saves the ID together with the call's contents in the checkpoint, and only then executes.
3. When resuming replays the same operation, it reuses the same ID; if the tool finds this ID was already done, it returns the earlier result.

The tool has to write its result and this key in the same transaction (or pass the key to a downstream API that supports idempotency keys). Otherwise a crash after the tool runs but before the key is written still causes a duplicate. A counterexample: don't use "session ID + round number" as the key. One round can contain several tool calls, so when one round creates two notes, the second `notes_create` gets mistaken for a duplicate.

**Where tools run.** Tools that execute code or commands should be locked in a sandbox (← [S10 Tools and MCP](/en/stages/s10-tools-mcp/): a container, only the working directory mounted, no network by default). With an agent, the model takes many steps in a row, and one manipulated step can be amplified by the next, so the sandbox has to cover everything the whole agent can touch, not just a single tool. In the core exercise, each run starts from a clean copy of the original folder. That's the simplest isolation: however badly the agent mangles things, the original data is untouched.

**Common misconception: a harness is just a longer prompt.** Every component above is code behavior the model can't see and can't get around. The system prompt can tell the model what the rules are, but the harness has to enforce them.

<details class="deep">
<summary>Going deeper: separating the brain from the hands, stateless reducers</summary>

- Anthropic's "Scaling Managed Agents: Decoupling the brain from the hands" splits the system into three parts: the session (an append-only event log), the harness (the loop that calls the model and dispatches tools) and the sandbox (where code runs). Each can be swapped independently; for example, when the harness crashes and restarts, the session and the sandbox are unaffected.
- Factor 12 of 12-factor-agents goes further: write the agent as a stateless reducer that takes the event log as input and outputs the next step. Then any point in time can be replayed and tested, and it's easy to move a session to another machine and continue there.

</details>

### 🔒 Which actions need the user's approval first?

Build permissions into the very first version. Don't wait for S16 Security and Governance. Permissions decide whether the harness lets the model do what it wants to do.

The three common modes:

| Mode | Behavior | Good for |
|---|---|---|
| **plan** | Can only explore with read-only tools and ends by proposing a plan; every write is blocked | Picking up an unfamiliar task, seeing what the agent intends to do first |
| **ask** | Asks the user before every write or execute action | The default mode |
| **auto** | Allowlisted actions run directly without asking | Low-risk, reversible, well-scoped work |

Applied to the notes assistant's four tools:

| Tool (risk from S10 Tools and MCP) | plan | ask | auto |
|---|---|---|---|
| `notes_search` (low) | Run | Run | Run |
| `notes_create` (medium) | Block | Ask | Run and log |
| `email_draft` (medium) | Block | Ask | Run and log |
| `email_send` (high) | Block | Ask | **Still ask** |

The last row is this chapter's security checkpoint: in every mode, actions that S10 Tools and MCP rates as high risk (sending user data outside the system, irreversible, costs money) must be confirmed first. In practice, the permission check is the `pre_tool_use` hook: before the tool actually runs, it decides "allow / ask / deny." When an action is denied, return the reason to the model as the tool result (e.g. "The user declined to send. Save it as a draft instead.") so it can try another approach, rather than letting the loop crash.

When you ask, the confirmation screen has to show what will actually happen: who it goes to, the subject and body, whether it can be recalled; for a deletion, which files (list and count) and whether it can be undone. Asking only "Are you sure?" is the same as not asking (confirmation UI design → S17 Product and AI UX). Add one more rule for batch actions: when one action affects more than N items (say 10), ask first in every mode.

**Common misconception: writing "ask me before sending email" in the system prompt is a permission.** That's a request. The model may forget it or have it overridden by prompt injection (← S9 Retrieval and RAG). Only a check in code, at a layer the model can't get around, counts as a restriction. The fuller threat model and the classifier design for auto mode are in S16 Security and Governance.

### ★ When should the loop stop?

An agent doesn't know on its own when to give up. The harness sets the rules for stopping and asking for help.

You need at least these **stop conditions**: the model declares it's done (calls no more tools), the step limit is reached, the token or cost limit is reached, the same tool fails too many times in a row, or something comes up that a person needs to decide. The first three are normal endings or budget protection. The last two must **escalate to a human**: stop and tell the user where it stopped and why.

**Handle two kinds of errors differently.**

- **Transient errors** (429, 5xx, timeouts): the harness retries with backoff following the rules in S6 LLM APIs and Application Basics. The model never needs to know.
- **Tool logic errors** (bad arguments, file not found): put a concise error message back into the context and let the model fix it, as in round 3 above. But count them: if the same tool fails about 3 times in a row, stop and escalate to a human; one success resets the count to zero.

Work through the example: say that after round 3 the model fills `to` with "my manager" 3 times in a row. Without a counter, it keeps retrying until the step limit of 15, wasting 10 extra rounds, each resending more than 6,000 tokens of history. With a counter, it stops after the 3rd failure and reports "`email_draft` failed 3 times in a row: missing recipient email."

Factors #5–#9 of [12-factor-agents](https://github.com/humanlayer/12-factor-agents) happen to form a set you can use as a design checklist:

- **#5 Unify execution state and business state**: see the [harness components](#-what-wraps-around-the-loop) section above.
- **#6 Launch, pause and resume with simple APIs**: when waiting on a person or a long-running job, the agent should be able to stop and later continue from where it left off.
- **#7 Contact humans with tool calls**: make "ask a person" a tool (like `request_human_input` above) instead of letting the model output a question as plain text. That way the harness can tell "the model is asking a question" from "the model is done."
- **#8 Own your control flow**: some tool calls (asking for clarification, deploying) should break out of the loop and wait, not execute directly.
- **#9 Compact errors into the context window**: include only a concise error message, not a whole stack trace, and pair it with the failure counter above.

**Common misconception: hitting the step limit counts as done.** A run that stops at the limit must be recorded as a failure, with the reason. Many agents seem to "have answered" when they've actually produced a half-finished result cut off by the limit.

### ★ What if the context won't fit?

S11 Context Engineering is about what to put in the context for one call. This section is about tasks so long that they don't fit in the context window.

The example above has only 6 rounds. If Sam asks to "organize all of my roughly 200 notes," at an average of about 1,500 tokens per note, just reading them all is 300,000 tokens, before counting the history resent every round. Anthropic's "Effective context engineering for AI agents" lists several approaches. These two are the first to learn:

- **Compaction**: when the context is nearly full, shorten the earlier conversation and continue with the shortened version. The lightest form is tool-result clearing: clear out tool output from long ago and keep only "what was called." The article calls it the safest, lightest-touch form of compaction. If that's not enough, have the model summarize the earlier conversation. The hard part is deciding what to keep.
- **Sub-agent isolation**: hand a stretch of exploration to a **sub-agent**. A sub-agent is another agent loop that the main agent starts through a tool call, with its own clean context; when it's done, it returns only a summary of about 1,000–2,000 tokens. For example, the main agent starts 4 sub-agents, each reads 50 notes (about 75,000 tokens) and returns 1,500 tokens of key points; the main agent's context grows by only about 6,000 tokens instead of 300,000.

**Common misconception: sub-agents are free parallel speedups.** Each sub-agent has to read its material itself, so total tokens are usually higher. What sub-agents save is **the main agent's context**, not cost. Dividing and coordinating work among multiple agents is covered in S15 Multi-agent Systems.

<details class="deep">
<summary>Going deeper: structured notes and context resets</summary>

- **Structured notes**: the agent periodically writes progress, to-dos and findings to a file outside the context and reads them back when needed.
- A **context reset** differs from compaction. Compaction keeps the same agent running with a shortened history, preserving continuity. A reset clears the context and starts a new agent, which takes over from a structured handoff document; the price is that any detail the handoff document leaves out is lost. Anthropic's "Harness design for long-running apps" notes that some models, as they approach what they *believe* is their context limit, rush to wrap up (the article calls this context anxiety). At the time, resets were necessary; with newer models the behavior largely disappeared, so the resets were removed in favor of automatic compaction.

</details>

<details class="deep">
<summary>Before you build: when to trigger compaction and in what order</summary>

- **Trigger threshold**: decide using the actual tokens sent each round (the usage field in the API response), e.g. trigger above 50% of the window. Don't wait until you're near the limit: the summary itself needs a model call and some room.
- **Lightest first**: clear old tool results first (no model call, no rewriting of content); if it's still over, have the model summarize. Keep the most recent rounds and any unfinished to-dos verbatim.
- **Record the trigger in the trace**: log the round where it triggered and the token counts before and after. The advanced exercise compares versions with and without compaction, and without this record you can't show it ever actually triggered.

</details>

### ★ How do skills load only when needed?

A skill is a packaged way of doing something that loads only when needed. It lets an agent carry many specialized procedures without filling up the context.

A skill is a folder whose core is a `SKILL.md` file: the YAML frontmatter at the top (the settings block wrapped in `---` at the very top of the file) holds `name` and `description`, the body holds the instructions for the task, and you can attach scripts and reference files. It's a concrete implementation of the progressive disclosure covered in S11 Context Engineering, loaded in three layers: every skill's name and description go into the system prompt from the start; the full `SKILL.md` is read in only when the model judges it relevant; the finer-grained attached files are opened only when needed.

For the notes assistant: write "weekly report format" as a skill whose description is "Use when turning meeting notes into a weekly report." Normally each round carries just this one-line description (a few dozen tokens); in the example above, the model reads in the full format guide only in round 2, when it's about to write the weekly report. With 20 skills installed, normal rounds carry just 20 extra lines of descriptions.

A skill can also include executable scripts, so deterministic work (like converting a date into the range for "last week") is done by code instead of generated token by token by the model.

**Common misconception: a skill is just documentation.** It carries both instructions and code, which makes it a supply-chain risk too: install skills only from trusted sources, and read third-party skills before using them (→ S16 Security and Governance).

### ★ Can you find data without an index?

Agentic search lets the agent find information step by step with tools, instead of building a vector index ahead of time.

You give the agent tools like `glob` (find file names), `grep` (find keywords) and `head` / `tail` (look at excerpts), and it narrows things down the way a person would. For example, to find "meeting notes from November that mention the budget": first `glob("meetings/2026-11-*")` finds 5 files, then `grep("budget")` narrows it to 2, and finally it reads only those 2. Claude Code takes a hybrid approach: fixed instructions like `CLAUDE.md` go into the context from the start, and other files are found with glob and grep when needed.

It suits **corpora that are small or have clear identifiers**, like a code repo (function names and error messages can be matched exactly) or a project's notes folder. The cost is more tool calls, more latency and more tokens.

**Common misconception: agentic search replaces vector RAG.** When the corpus is large and users phrase things differently from the source (synonyms, paraphrases), grep misses: searching "budget" won't find a note that only says "funding." That's when the embeddings and hybrid retrieval from S9 Retrieval and RAG are still necessary. In practice the two are often used together.

### ★ How do you pick up work across sessions?

For tasks that take several sessions to finish, the key is to keep progress **outside** the context so every new session can pick up the work. Two Anthropic articles describe several patterns:

- **Initializer / worker** ("Effective harnesses for long-running agents"): the first session only does setup: it writes a startup script `init.sh` (a script that brings up the development environment when run), a progress file and a feature list, and makes the first git commit (a commit is a saved version of the code). Every later session first reads the progress file and the git log (the history of commits), runs a basic test, builds just **one** feature, then commits and updates the progress file.
- **The feature list as external state**: the feature list is JSON rather than Markdown (the model is less likely to tamper with it). Each item has a `passes` field, all failing at first, and the prompt tells the worker to change only this field. This guards against "declaring it done when it's half-finished."
- **Generator–evaluator** ("Harness design for long-running apps", building on the evaluator-optimizer pattern from [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)): one agent produces the work, and another actually operates the result (e.g. clicking through a web page with Playwright, a tool that drives a browser automatically) and scores it against criteria. Splitting out the evaluator makes it easier to tighten the bar than asking the producer to critique itself.
- **Sprint contracts**: before each round starts, the producer proposes "what this round will do and how to verify it," and work begins only after the evaluator reviews it and both agree. This turns a vague spec into testable conditions.

**Common misconception: "the worker only changes the `passes` field" is a technical restriction.** It's an instruction. The article asks for it in the prompt rather than enforcing it in code; the model still **can** change other fields, it's just told not to. This is the same point as the 🔒 section above: prompt instructions lower the odds, only code can guarantee. If you need a guarantee, add a check to the harness yourself, for example a hook that diffs the JSON before and after and refuses the write if any other field changed (this is this roadmap's suggestion, not what the article does).

### ★ How do you judge a harness change?

Every component assumes "the model can't do this on its own," and that assumption may stop holding as models improve. So adding or removing a component needs numbers.

One line from "Harness design for long-running apps" is worth remembering: every component in a harness encodes an assumption about what the model can't do on its own. In the article, the context reset (clearing the context and handing off to a new agent through a handoff document), added because the model rushed to wrap up, was removed once models improved; the sprint structure was removed for the next model generation too, while the planner and evaluator stayed.

A minimal agent eval needs just three things (← [S8 Eval Methodology](/en/stages/s08-evals/)):

- **Run each task n times**: an agent gives different results each time, so one run doesn't count.
- **pass^k**: the fraction of tasks where all k runs succeed (← S8 Eval Methodology). It's closer to "users can trust it every time" than the average success rate. With a 75% per-run success rate and independent runs, the chance of 3 successes in a row is only 0.75³ ≈ 42%.
- **Confidence interval**: the score is estimated from a finite number of runs, so attach a margin of error (← S8 Eval Methodology).

Work it through at the core exercise's scale: 10 tasks, 5 runs each, with per-task success counts of 5, 5, 4, 5, 3, 5, 5, 2, 5, 4.

- Overall success rate: 43 successes ÷ 50 runs = 86%. Using the approximation from S8 Eval Methodology, the standard error is √(0.86 × 0.14 ÷ 50) ≈ 0.049, and the 95% confidence interval is about 86% ± 9.6 percentage points, or roughly 76%–96%. This approximation treats the 50 runs as independent samples; the 5 runs of the same task are correlated, so the real interval is wider (→ S14 Agent Evals, Data and Optimization).
- pass^5: only tasks with all 5 runs correct count. There are 6, so pass^5 = 6 ÷ 10 = 60%.

An 86% average sounds good, but if a user hands it the same job 5 times, only 60% of tasks succeed every time.

**Common misconception: one or two runs tell you whether a change helped.** Say that after adding compaction the overall success rate is 80%. Dropping from 86% to 80% doesn't mean compaction made things worse. Run both versions on the same set of tasks and check whether the confidence interval of the paired difference (new − old) contains 0; looking at each version's interval alone isn't enough (→ [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/)). When the difference's interval contains 0, you can't say either is better; add more tasks and compare again.

<details class="deep">
<summary>Going deeper: two details about confidence intervals</summary>

- **The 5 runs of one task aren't independent.** Some tasks are just hard, and all 5 runs fail together. The formula above treats the 50 runs as independent samples, so the interval comes out too narrow. A more robust approach is a bootstrap by task: each time, sample 10 tasks with replacement (each with its 5 results), recompute the success rate, repeat 1,000+ times and take the 2.5th and 97.5th percentiles (← S8 Eval Methodology).
- **When the number of runs n is larger than k**: if a task has c successes, you can estimate pass^k as the probability that k runs drawn from the n are all successes, i.e. C(c, k) ÷ C(n, k). For example, n = 8, c = 6, k = 3: C(6, 3) ÷ C(8, 3) = 20 ÷ 56 ≈ 0.36. When n = k, this reduces to "1 if all k runs are correct, else 0," which is the calculation above.

</details>

<section class="deep-section">

### ○ What does a framework decide for you?

Once you've written one by hand, look at frameworks like LangGraph, the OpenAI Agents SDK, the Claude Agent SDK, the OpenHands SDK and DSPy, and focus on comparing what they decide for you: how state is stored, whether you can pause between choosing a tool and running it, where hooks and permissions go, what a trace looks like, and how easy it is to switch models. The [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) has built-in guardrails, handoffs and tracing; the assignments in [CMU 11-768](https://www.cmu-agents.com/) also have you hand-write a harness first, with frameworks later. Frameworks aren't required; being able to read and compare them is enough.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** The notes assistant is in auto mode. In a single reply, the model calls `notes_search`, `notes_create` and `email_send`. What does the harness do with each of these three calls? If the user declines to send, what goes back to the model?

<details class="hint">
<summary>Check your answer</summary>

`notes_search` runs directly; `notes_create` is on the auto allowlist, so it runs and is logged; `email_send` is high risk, so even auto mode **still asks**. When it's declined, return the reason as that call's tool result (e.g. "The user declined to send. Save it as a draft instead."). Each of the three calls gets its own result, and the loop doesn't crash.

</details>

**2.** The step limit is 15 and the limit on consecutive failures of one tool is 3. (a) In rounds 3, 4 and 5 the model calls `email_draft(to="my manager")`, and each time gets "to must be an email address." In which round, and because of which stop condition, does the loop end? (b) In another run, at round 15 the model happens to reply with text that looks like a summary. Does that run count as done?

<details class="hint">
<summary>Check your answer</summary>

(a) Round 5: `email_draft` has failed 3 times in a row, so the loop stops and escalates to a human, explaining "missing recipient email." It never reaches the step limit. (b) No. A run that stops at the step limit must be recorded as a failure, with the reason. That text could be a half-finished result that got cut off.

</details>

### Core: Hand-write an agent loop with a permission gate

**Goal**: write a complete agent loop without a framework, add permissions, hooks and stop conditions, and describe how reliable it is with numbers from repeated runs.

**Steps**
1. Prepare a practice folder: 20 Markdown notes, generated once with an LLM or a script and then frozen as the original version. The content must contain exactly: 6 files containing `TODO`, 3 pairs of near-identical duplicate files, 2 drafts whose file names start with `draft-`, and ordinary notes for the rest (topics up to you). These numbers give your grader definite correct answers. Before each run, make a clean copy of the original.
2. Implement 5 tools and label their risk levels: `list_files`, `read_file`, `grep` (low), `write_file` (medium), `delete_file` (high). Validate tool inputs, and keep error messages short and pointing to the next step (← S10 Tools and MCP).
3. Hand-write the loop: send messages → execute tool calls → feed back results → repeat. At least four stop conditions: the model declares it's done, a step limit of 15, the same tool failing 3 times in a row (escalate to a human, end and explain why), and a token limit per run.
4. Add two hooks: `pre_tool_use` makes the permission decision (plan / ask / auto modes; `delete_file` must ask in every mode), and `post_tool_use` writes each step to a JSONL trace (tool, arguments, result length, token count, duration).
5. Write 10 tasks, each with a programmatic check of the **final file state** (e.g. "Write the names of all files containing TODO into `todo.txt`" → check the contents of `todo.txt`). Also write 3 tasks that tempt the agent to delete files or edit the wrong file, to test permissions.
6. Run the 10 tasks 5 times each in ask mode (a script automatically answers "allow" to every ask), and compute each task's success rate and pass^5. Run the 3 permission tasks 5 times each in **auto** mode (`write_file` is on the allowlist and runs directly), with a script answering "deny" to every ask and logging it. In ask mode every write asks anyway, so it can't test the rule "high risk always asks"; that's why you test it in auto mode. Finally, run each of the 3 permission tasks once in plan mode.

**Acceptance criteria**
- 10 tasks × 5 runs = 50 runs, each with a complete JSONL trace.
- Report the overall success rate with a 95% confidence interval (← S8 Eval Methodology), plus each task's success count (0–5) and pass^5.
- Show from the traces that across the 15 auto-mode runs of the permission tasks, every `delete_file` call triggered an ask before executing, while `write_file` ran directly without asking (report the total call count for each; count runs where the model never tried to delete separately). In plan mode, write tools were executed 0 times.
- Test with a tool that fails on purpose: after 3 consecutive failures, the loop stops and records the escalation reason, without reaching the step limit.
- No run exceeds 15 steps; runs that hit the limit count as failures, with the reason recorded.

**Hints**
- TypeScript: use tool use from the Anthropic or OpenAI SDK directly, with Zod to validate tool arguments; don't install an agent framework.
- Python: the `anthropic` or `openai` SDK, with Pydantic to validate arguments.
- Local models: with Ollama running a small model that supports tool calls (e.g. the Qwen3 family) you can do it all for free, but the success rate will be noticeably lower, which is an interesting comparison in itself. With Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)). 50 runs on a small cloud model usually cost a few dollars at most; do 1 run first to check the pipeline before scaling up.
- If you get stuck:
  - Reread: [the agent loop](#-one-example-end-to-end) (including the loop skeleton and the box on the result format), [permission modes](#-which-actions-need-the-users-approval-first), [stop conditions](#-when-should-the-loop-stop), [the minimal agent eval](#-how-do-you-judge-a-harness-change)
  - Further: learn-claude-code s01–s04, 12-factor-agents #7–#9

<section class="deep-section">

### Advanced: System project A12: Hand-written harness

**Goal**: write a complete harness for your system: the loop, permissions, hooks, checkpoint / resume, human in the loop, compaction and skills, and show with repeated runs that it's reliable.

**Steps**
1. Connect the tools from A10 Toolset and MCP Server ([what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)) to a loop you write yourself (no framework). Assemble each round's context with the A11 Context Builder. Set the plan / ask / auto behavior from these tools' risk levels.
2. Make the event log the single source of state (12-factor #5, #12): write a serializable record for every step; when the program is interrupted, it can resume from the last checkpoint. Tools with side effects must be able to recognize "already executed" and not run again on resume (← idempotency in S6 LLM APIs and Application Basics).
3. Make human-in-the-loop a tool (`request_human_input`). While waiting, the agent pauses without occupying a process, and continues after the reply.
4. Add compaction: when the context exceeds your threshold (e.g. 50% of the window), clear old tool results first, and summarize if it's still over.
5. Write two fixed procedures as skills (`SKILL.md` + attached files), with the body loaded only when a task needs it.
6. Write 20 tasks representative of real use (pick them from the traces and failure categories you accumulated in A8 Error Analysis and Golden Set), and run each 5 times. Pick one change (e.g. with or without compaction) for a before/after comparison.
7. (Bonus) Pick a long task that needs 3 or more sessions and complete it with initializer / worker plus a JSON feature list.

**Acceptance criteria**
- Success rate, pass^5 and 95% confidence interval for 20 tasks × 5 runs; a before/after comparison of one change, with a conclusion consistent with the interval.
- Interruption recovery: force-kill the program midway through 3 tasks. All 3 resume from a checkpoint and finish, and the traces show no tool with side effects ran twice.
- High-risk tools ask first in 100% of runs (proven by the hook's records, not by your impression).
- Compaction triggers in at least 2 long tasks. On those tasks, compare versions with and without compaction: before running, write down the tolerated gap δ (5 percentage points suggested); the lower bound of the 95% confidence interval of the paired difference (with − without) must be ≥ −δ. With only 2 tasks × 5 runs the interval will be very wide; you usually need 30+ tasks that trigger compaction to meet this. If you can't, report the interval honestly and add tasks, rather than loosening δ.
- A skill's body appears only in the traces of tasks that need it; other tasks' contexts contain only the name and description.

For the notes assistant: "Turn all of last week's meeting notes into a weekly report, save it as a new note, then write an email draft to my manager." Following the risk levels from A10 Toolset and MCP Server, reading notes is low risk and runs directly; creating a note and creating an email draft are medium risk, asking first in ask mode and running with logging in auto mode; actually sending (`email_send`) is high risk and must be confirmed in every mode. "Weekly report format" is written as a skill.

**Hints**
- TypeScript: the Anthropic / OpenAI SDK; the event log can use SQLite (`better-sqlite3`) or JSONL; HITL can start as a CLI prompt and become a UI in A17 Complete Frontend.
- Python: same as above, with the built-in `sqlite3` for SQLite.
- Cost: 20 × 5 runs plus the comparison group comes to roughly ten to several tens of dollars on a small cloud model, depending mostly on task length; run the whole pipeline once on 5 tasks first. Ollama is free, but long tasks fail easily on small models; with Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)).
- If you get stuck:
  - Reread: [harness components](#-what-wraps-around-the-loop), [long-horizon context](#-what-if-the-context-wont-fit), [skills](#-how-do-skills-load-only-when-needed)
  - Further: learn-claude-code s08, s15, s16; Anthropic's "Effective harnesses for long-running agents"

</section>

## Self-check

1. Without looking at the lecture, write out a loop trace for the notes assistant: the user says "Find the notes that mention the budget and pull them together into a new note." List the model's decision each round, what the harness does (including the permission decision), what gets fed back, and in which round and because of which stop condition the run ends.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: at least one `notes_search` round, one `notes_create` round (asks first in ask mode), and a final round where the model calls no more tools. **Common mistake**: writing the permission decision as the model's decision, or leaving out the stop condition. **Reread**: [One example, end to end](#-one-example-end-to-end)

   </details>

2. Explain in your own words "every harness component represents an assumption about the model's abilities." Give one component in your own harness that might be removable once models improve. (Concepts route: answer with the notes assistant.)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a component exists because the model "can't do" something yet, so before removing it, confirm with eval numbers. **Common mistake**: using the permission gate as the example; it guards against manipulation and mistakes, and stronger models don't make it unnecessary. **Reread**: [How do you judge a harness change?](#-how-do-you-judge-a-harness-change)

   </details>

3. What do compaction and sub-agent isolation each keep, and what do they throw away? When would you switch to sub-agents?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: compaction keeps the same agent running with a shortened history and loses old details; a sub-agent puts a stretch of exploration into a clean context, and the main agent gets back only a summary. Large amounts of material that can be read in chunks suit sub-agents. **Common mistake**: thinking sub-agents save cost; what they save is the main agent's context. **Reread**: [What if the context won't fit?](#-what-if-the-context-wont-fit)

   </details>

4. Why should the permission check be a hook, rather than "ask before deleting" written into the system prompt?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a prompt is a request the model may forget or have overridden by prompt injection; a hook is code the model can't get around. **Common mistake**: thinking that if the prompt is forceful enough, the model will always ask first. **Reread**: [Which actions need the user's approval first?](#-which-actions-need-the-users-approval-first)

   </details>

5. Scenario: in auto mode, your agent is asked to "clean up duplicate notes," and the model decides to delete 30 notes. At which step, and with which rules, does your harness stop it? What should the user see when confirming?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: block it in `pre_tool_use`, with the rules "deletion is high risk" plus "ask whenever one action affects more than N items"; the confirmation screen lists which files, how many and whether it can be undone. **Common mistake**: asking only "Are you sure?" **Reread**: [Which actions need the user's approval first?](#-which-actions-need-the-users-approval-first)

   </details>

6. Scenario: you want an agent to answer "Where in our codebase are refunds handled?" and "Which of these 50,000 PDF contracts have an auto-renewal clause?" Would you use agentic search or vector RAG for each? Why?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: code has clear identifiers and is small, which suits grep / glob; 50,000 contracts is a lot, with varied wording, so it needs vector or hybrid retrieval. **Common mistake**: choosing the same approach for both and ignoring corpus size and whether the wording is consistent. **Reread**: [Can you find data without an index?](#-can-you-find-data-without-an-index)

   </details>

7. The program crashes after `notes_create` has run but before its result is written to the event log. What happens on resume? How should the harness prevent it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: on resume it creates another note. Generate an operation ID for each operation when it's planned, save it with the checkpoint and reuse the same ID on replay; if the tool finds it's been done, it doesn't run again. **Common mistake**: using "session ID + round number" as the key, which makes a second write in the same round look like a duplicate. **Reread**: [What wraps around the loop?](#-what-wraps-around-the-loop)

   </details>

8. What decisions does a framework (e.g. LangGraph, the OpenAI Agents SDK) make for you? Name two that you had to make yourself when writing it by hand.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: pick any two of how state is stored, whether you can pause between choosing a tool and running it, where hooks and permissions go, and what a trace looks like, and state your choice. **Common mistake**: saying only "frameworks are more convenient" without naming the hidden decisions. **Reread**: the "Common misconception" in [One example, end to end](#-one-example-end-to-end)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want to go deeper or write code line by line alongside someone else. None of it is required.

### Code along

- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — The hands-on material this roadmap recommends; every chapter is short and comes with a runnable `code.py`. Start with the new s01–s04 at the repo root (loop, tools, permissions, hooks) alongside the core exercise; then s05–s08 (todos, sub-agents, skills, compaction), s10 (task system), s15 (integrated harness) and s16 (workflows and journal-based resume) alongside the advanced exercise. Chapters are in English by default. Note that the old `docs/` chapter numbers differ from the new ones, so don't mix them. s11 (background tasks), s12 (scheduling) and s17 (goal loop) are used by the long-running agent in S19 Real Agent Systems and the Capstone; you can skim them now.
- [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) — Read in S0 The Big Picture; when hand-writing your loop, compare how it handles stop conditions and errors.
- [CMU 11-768 AI Agents](https://www.cmu-agents.com/) — Assignment 1: write a harness on an open model; compare it with this chapter's A12 Hand-written Harness.

### Design principles and engineering articles

- [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) — Short throughout. The lecture uses #5–#9; also worth reading are #3 (own your context window), #10 (small, focused agents) and #12 (make your agent a stateless reducer). Some of it promotes HumanLayer's product.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) (2025-11-26) — The original source for initializer / worker, the feature list and the progress file; the failure-mode table at the end isn't in the lecture.
- [Anthropic: Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps) (2026-03-24) — Generator–evaluator, sprint contracts, context reset vs compaction, and the full context for "every component is an assumption."
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) (2025-09-29) — You read the first half in S11 Context Engineering; here, read the section on long-horizon tasks and just-in-time retrieval.
- [Anthropic: Equipping agents with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) (2025-10-16) — The official explanation of SKILL.md's structure and the three loading layers.
- [Anthropic: Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/research/managed-agents) (2026-04-08) — Separating session / harness / sandbox; the harness's assumptions go stale.
- [Anthropic: Building effective AI agents](https://www.anthropic.com/research/building-effective-agents) (2024-12-19) — You read it in [S0 The Big Picture](/en/stages/s00-big-picture/) and [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/); reread the agents section after hand-writing a loop and it will read differently.
- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — The sections on the run loop and guardrails; save the multi-agent section for S15 Multi-agent Systems.

### Original papers

- [Yao et al. 2023, ReAct](https://arxiv.org/abs/2210.03629), [Shinn et al. 2023, Reflexion](https://arxiv.org/abs/2303.11366) — The original papers for the two basic agent patterns, each with its own experiments and failure cases.

### Courses and overviews

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — Slides for L4–L6 (tools, frameworks and harnesses, agent design patterns and context management).
- [Hugging Face Agents Course](https://github.com/huggingface/agents-course) — Framework-oriented; read it when you want to see how several frameworks do things.

</section>
