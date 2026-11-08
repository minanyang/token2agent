---
title: S0 The Big Picture
head:
  - tag: title
    content: How Do AI Systems Work? The AI/LLM Big Picture (S0) | Token2Agent
description: Learn what an AI system is made of, how a user's message passes through the model and your code to become an answer, how a minimal agent loop works, and when to use a single call, a workflow or an agent.
sidebar:
  order: 0
  label: S0 The Big Picture
next:
  link: /en/guide/app-first/
  label: The Application Route and Model Crash Course
---

:::note[This chapter]
**Prerequisites**: none　**Next**: most readers → [Model Crash Course](/en/guide/app-first/#model-crash-course) → [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/); to understand model internals → [S1 Neural Network Basics](/en/stages/s01-neural-networks/) (Part II How Models Work, the optional deep route)

This chapter has no advanced exercises. The optional advanced exercises start in S1 Neural Network Basics and S6 LLM APIs and Application Basics; see "Where to go next".
:::

:::tip[Concepts route: key points]
- An AI product is a model plus components such as retrieval, tools and memory. Each component fills one gap the model has on its own.
- The model only outputs text. Searching, saving and sending email are all done by your code on its behalf.
- If the next step can be decided in advance, use a fixed flow. An agent is only worth building when it can't.
:::

## What this chapter covers

There's more behind an AI product than a model. This chapter draws the whole map: what an AI system is made of, how a user's message turns into an answer step by step, how workflows differ from agents, when you shouldn't build an agent at all, and finally how a complete agent in under 200 lines (mini-SWE-agent) works. The other nineteen chapters each open up one part of this map, which is why it comes first. By the end you'll also know which route to take.

## After this chapter you can

- Name the steps a request goes through from user input to final answer, and say which steps are the model computing and which are your code running. (lecture and self-check)
- Explain in your own words how a minimal agent loop works and when it stops. (lecture and self-check)
- Draw the full path of one notes-assistant request and mark which later chapter covers each step. (core)
- Given a requirement, decide whether it calls for a single call, a fixed workflow or an agent, and justify the choice. (core)
- Walk through the mini-SWE-agent source and explain what each part does and when it stops. (optional, requires basic Python)

## Lecture

Three terms first. You'll see them throughout the course:

- **Large language model** (LLM): a trained program. Give it some text and it predicts the text most likely to come next, writing a little at a time. Every chat assistant you've used runs on an LLM.
- **Token**: the unit a model reads and writes text in. In English a token is often a short word or part of a longer one; in Chinese it's roughly one or two characters. Pricing, speed and length limits are all counted in tokens (→ [Model Crash Course](/en/guide/app-first/#tokens-and-tokenization); deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/)).
- **Context**: the full input sent to the model on each call. The model doesn't remember previous calls; it only sees what's in this call's context. There's a limit on how many tokens the context can hold, called the context window.

The whole chapter uses one example: a **notes assistant**. It stores the user's Markdown notes and can answer questions about them, search them and create new ones. The lectures in Part III through Part VII (S6–S19) use it too, growing it from the prototype here into a complete system.

### ★ Why not just use a model?

Useful AI products are rarely "one model answering directly." They're systems made of a model plus other components.

**Why a model alone isn't enough.** An LLM on its own has three built-in limits. It only knows what it saw in training, so it can't see the user's notes. It can only output text, so it can't search or save anything by itself. And every call starts from zero, so it doesn't remember what the user said last week. Ask it "What did we decide in last week's meeting?" and it can only say it doesn't know, or make up a plausible answer (this is called hallucination).

**How to fill the gaps.** Wrap the model in code and components, each filling one gap. A post from Berkeley's BAIR calls this a **compound AI system** and points out that quality gains increasingly come from system design, not just from switching to a bigger model. Anthropic calls the most basic building block the **augmented LLM**: a model that can retrieve information, call tools and access memory.

Here are the notes assistant's main components (in the "Covered in" column, S plus a number is a chapter code; see [How to Use This Roadmap](/en/guide/how-to-use/#how-to-read-the-codes) for how to read the codes):

| Component | What it does in the notes assistant | Covered in |
|---|---|---|
| Model | Understands the question, decides what to do, writes the answer | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (how to call it); model internals are Part II How Models Work (S1–S5) |
| Prompt and context | Tells the model its role and rules, and supplies the data for this call | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| Retrieval | Finds the few notes relevant to the question among about 200 | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Tools | Actions the model can ask to run, such as `notes_search` and `notes_create` | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| Memory | Remembers user preferences like "answer in bullet points, three at most" | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Loop control code | Calls the model, runs tools, decides when to stop | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Interface | Streams the answer, lets the user confirm a draft before an email goes out | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Evals, security and shipping | Checks that answers are correct, defends against attacks, records cost and latency | [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S16 Security and Governance](/en/stages/s16-security/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |

**Common misconception: more components are better.** Every component you add is one more thing that can break, and one more source of latency and cost. Components exist to fill specific gaps. If the notes assistant only needs to rewrite a pasted paragraph as bullet points, one model call is enough. No retrieval, no tools.

### ★ How does one message become an answer?

After the user hits send, a request goes through a fixed set of steps. When the model uses a tool, some of the middle steps repeat in a loop.

The table shows one round. Each step has a chapter dedicated to it:

| Step | What happens | Covered in |
|---|---|---|
| 1. Assemble context | The system prompt, conversation history, retrieval results and tool descriptions are combined into one input | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| 2. Tokenize | The text is split into tokens and becomes a sequence of integers | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| 3. Prefill | The model reads the whole input at once and stores intermediate results for the tokens it has read (the KV cache) so it doesn't have to recompute them | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| 4. Decode | The model generates one token at a time, picking each next token according to the sampling settings | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| 5. Tool call | The output is a structured tool call, and your code runs it | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| 6. Feed results back | The tool result goes back into the context and the loop returns to step 3, until the model decides to answer | [S11 Context Engineering](/en/stages/s11-context-engineering/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| 7. Respond and log | Stream the answer to the user while recording the trace, cost and latency | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S17 Product and AI UX](/en/stages/s17-ai-ux/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |

A few terms from the table: the **system prompt** is the fixed instruction the developer writes for the model ("You are a notes assistant. Answer only from the user's notes."); **streaming** means showing the output as it's generated, so the user doesn't wait for the whole answer; a **trace** is the record of every step in a request, which you go back to when something goes wrong.

**Steps 3 and 4 are where the model actually computes, and they behave differently.** Prefill processes input that's already known, so all tokens can be computed in parallel; even an input of several thousand tokens goes fast. Decode produces output that doesn't exist yet: token 5 can't be computed until token 4 exists, so tokens come out one by one, and the longer the output, the longer you wait. For each token, the model produces a probability for every candidate token, and the sampling settings (such as temperature) decide how to pick one (→ [Model Crash Course](/en/guide/app-first/#sampling-and-temperature); deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/)).

**Steps 5 and 6 let the model "do things."** The developer lists the tools' names, purposes and parameters in the context ahead of time. When the model wants a tool, it doesn't output a sentence for a human; it outputs text in a fixed format that amounts to `notes_search(query="meeting", range="last week")`. Your code recognizes that format, actually runs it, and puts the result back into the context so the model sees it on the next round.

Let's run the notes assistant through it once. The user says: "Find my meeting notes from last week, summarize them in three bullet points, and save that as a new note." The token counts below are illustrative:

| Round | Input sent to the model (prefill) | Model output (decode) | What your code does |
|---|---|---|---|
| 1 | System prompt 800 + tool descriptions 400 + user message 30 = 1,230 tokens | Calls `notes_search`, 25 tokens | Searches and finds 3 notes, 2,400 tokens in total |
| 2 | 1,230 + 25 + 2,400 = 3,655 tokens | Calls `notes_create` with a three-point summary, 200 tokens | Saves the note and returns "created", 20 tokens |
| 3 | 3,655 + 200 + 20 = 3,875 tokens | Answers "Done. Saved as 'Last week's meeting summary'", 60 tokens | Streams to the user and logs the request |

The table shows two things. First, a one-sentence request called the model 3 times. Second, every round resends everything before it, so the input adds up to 1,230 + 3,655 + 3,875 = 8,760 tokens while the output is only 25 + 200 + 60 = 285 tokens. Controlling what goes into each round is the subject of S11 Context Engineering.

<details class="deep">
<summary>Going deeper: what this request costs</summary>

APIs charge by token, and output tokens usually cost several times more than input tokens (because, as above, decode has to go one token at a time; → [S5 Inference and Serving](/en/stages/s05-inference/)). Assume $3 per million input tokens and $15 per million output tokens (illustrative, not any vendor's price):

- Input: 8,760 × 3 ÷ 1,000,000 ≈ $0.0263
- Output: 285 × 15 ÷ 1,000,000 ≈ $0.0043
- Total: about $0.031

Output costs 5 times as much per token, yet most of the spend is input, because the agent resends the whole context every round. Two common fixes: keep the start of each round (system prompt, tool descriptions) unchanged so the API's prompt caching can reuse that already-computed prefix at a lower price (→ [S11 Context Engineering](/en/stages/s11-context-engineering/)); and don't paste whole tool results back in verbatim (→ [S11 Context Engineering](/en/stages/s11-context-engineering/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)). Note that the KV cache avoids recomputing already-read tokens *within one call*; prompt caching reuses an identical prefix *across calls*. They're related but not the same.

</details>

Why the model itself can do steps 3–4 is the subject of S1 Neural Network Basics through S4 Post-training and Reasoning. How to evaluate, secure and ship the whole loop is covered in later chapters ([S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S16 Security and Governance](/en/stages/s16-security/), [S18 Deployment and Architecture](/en/stages/s18-deployment/)). Three more chapters sit outside the table:

- **S13 Memory and Personalization**: reads the user's long-term memory when assembling context in step 1, and writes back anything worth remembering after step 7.
- **S15 Multi-agent Systems**: the "tool" called in step 5 can be another agent, which runs its own full path and reports back.
- **S19 Real Agent Systems and the Capstone**: assembles the whole path into a real, long-running system; it doesn't map to a single step.

**Common misconception: the model searched by itself.** The model only outputs text. Searching, saving and sending email are all done by your code. So what the model can do depends on which tools the developer gives it, and the security checks live on the code side (→ [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S16 Security and Governance](/en/stages/s16-security/)).

### ★ Who decides the next step?

There are two ways to build a system from a model and tools. The difference is who decides the next step.

In a **workflow**, the steps are written into your code ahead of time; the model only fills in the content of each step. In an **agent**, the model decides the next step; your code only runs it and feeds back the result (see the [Glossary](/en/reference/glossary/)). Step 6 in the previous section, "return to step 3", is the agent loop: how many rounds, and which tool each round, are up to the model.

Three requests to the notes assistant as examples:

| Request | Approach | Who decides the steps |
|---|---|---|
| "Rewrite this note as bullet points" | Single call: one prompt, one answer | Only one step; nothing to decide |
| "Every morning at 8 a.m., summarize the notes added yesterday" | Workflow: code fetches yesterday's notes → calls the model to summarize → saves the result; the same three steps every day | Code |
| "Help me prepare for tomorrow's meeting with the design team" | Agent: the model might first search "design team", see that the budget came up last time, then search "budget", and finally put together a list. How many searches and what to search for can't be fixed in advance | Model |

Both have costs. A workflow is predictable, easy to test and has a fixed cost, but it can't handle anything the flow didn't anticipate. An agent can take paths nobody planned for, at the price of higher latency and cost, less predictability, and compounding errors: if the first search uses the wrong keyword, the conclusion is wrong no matter how well the rest is summarized.

**Common misconception: agents are more advanced than workflows.** It's not better versus worse; it's a tradeoff in how much control you hand to the model. Turning something a workflow does reliably into an agent usually just makes it slower, more expensive and harder to debug. Real systems often mix the two, for example a workflow where one step is handed to a small agent.

<details class="deep">
<summary>Going deeper: Anthropic's five workflow patterns</summary>

Anthropic's "Building effective AI agents" groups common workflows into five patterns. For now, just remember the names; [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) covers them in detail:

- **Prompt chaining**: one step's output is the next step's input, e.g. write an outline, then write the full text from it.
- **Routing**: classify first, then hand off to different flows, e.g. split user messages into "asking a question" and "adding a note".
- **Parallelization**: run several calls at once and merge the results.
- **Orchestrator-workers**: one model breaks the work down and hands the pieces to other calls.
- **Evaluator-optimizer**: one call produces a result, another grades it and asks for changes, for several rounds.

</details>

### ★ When should you build an agent?

Agent capability can be graded into levels. The point of the levels is to remind you that most needs are met at a low level.

Google/Kaggle's "Introduction to Agents" whitepaper sorts agent systems into five levels. Mapped to the notes assistant:

| Level | Whitepaper description | What the notes assistant looks like |
|---|---|---|
| Level 0 | A reasoning system with a model and no tools | Can only answer from training data; can't see the user's notes |
| Level 1 | Connected to tools, can look up live information | Can call `notes_search` to look up notes before answering |
| Level 2 | Plans multi-step tasks and actively manages context | Can handle multi-step tasks like "turn last week's meetings into a weekly report", choosing which notes go into the context |
| Level 3 | Multiple agents dividing the work | One searches, one drafts, one checks citations (→ [S15 Multi-agent Systems](/en/stages/s15-multi-agent/)) |
| Level 4 | Can create missing tools or agents on its own | Notices there's no "export to PDF" tool and builds one itself |

**When an agent is worth it.** OpenAI's "A Practical Guide to Building Agents" lists three situations:

1. Complex decisions that need judgment rather than rules.
2. Rules so numerous they're hard to maintain.
3. Heavy reliance on unstructured data (documents, conversations).

Anthropic's "Building effective AI agents" is more direct: look for the simplest solution first, and if a single call plus retrieval is enough, don't build an agent. Agents trade latency and cost for flexibility, and their errors compound.

Put the two together and you get this order of questions:

1. Can a single call (plus retrieval if needed) do it? If yes, stop there.
2. Can the steps be fixed in advance? If yes, use a workflow.
3. Only if the steps really can't be decided in advance, and one of the three situations above applies, consider an agent.

Applied to the notes assistant: "summarize yesterday's notes every day" has fixed steps and matches none of the three situations, so it's a workflow. "Prepare for tomorrow's meeting" requires judging what's relevant across a pile of unstructured notes and deciding what to search next. It matches situations 1 and 3, so it's a good fit for an agent.

**Common misconception: long flows or many rules call for an agent.** A flow with 10 steps, each clearly specified, is still a workflow. When rules are few and clear, plain code is the most reliable. What matters is whether the next step can be decided in advance, not how many steps there are.

### ★ How small can an agent be?

A complete agent that can fix bugs in code can have a core of just over a hundred lines. It's the loop described above.

**Why read it.** Once you've read it, you'll see how small an agent's skeleton really is. The harness components you'll learn later (the harness is the code that wraps the model and makes the agent reliable), such as permissions, checkpoints and compaction (→ S12 The Agent Loop and Harness), all add things around this loop.

**What it looks like.** [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent) is a minimal coding agent from the SWE-bench team (SWE-bench is a benchmark built from real GitHub issues, the bug reports filed on open-source projects, that tests whether a model can fix the code). The README says the agent class is about 100 lines; the current `default.py` is under 200, with the extra lines going to configuration and serialization. Its design has three notable features:

- **Only one tool**: run a bash command (bash is the shell you use in a terminal to work with files by typing commands). Each action runs in its own `subprocess.run`.
- **Fully linear history**: each step just appends new messages; nothing old is edited or removed.
- **A very simple main loop**: send the history to the model → (in the model layer) extract the command from the response → run it in the environment → append the output to the history, and repeat.

It stops when: the model sends the agreed-upon completion command; a step or cost limit is hit; a wall-clock time limit is hit; or the model fails to output a properly formatted command too many times in a row.

Here's a walk-through of an illustrative task: "The `test_parse_date` test is failing. Fix it." Don't worry if you can't read the commands; it's enough to know they find a file, read it, edit it and run the tests, in that order.

1. The model outputs `grep -rn "def parse_date" src/`; the result, `src/utils/date.py:12`, is appended to the history.
2. The model outputs `sed -n '1,40p' src/utils/date.py`, reads the function, and that's appended to the history.
3. The model outputs a one-line command that edits the file; the result is appended to the history.
4. The model outputs `python -m pytest tests/test_date.py`; the result, "1 passed", is appended to the history.
5. The model sends the completion command and the loop ends.

Each round maps to steps 1–6 in the path table: the history is the context, the bash command is the tool call, and the command output is the result fed back.

**Why bash alone is enough.** Bash can read files, search, edit and run tests on its own, so it works as a general-purpose tool. It costs two things: there's no persistent shell state (`cd` and environment variables don't carry over to the next step), and there are none of the view and edit commands SWE-agent designed specifically for models (→ ACI in [S10 Tools and MCP](/en/stages/s10-tools-mcp/)).

**Common misconception: building an agent takes a huge framework.** The loop itself is small. The complexity of a real product comes from what sits around the loop: which commands need the user's approval first, how to resume after a crash midway, how to compress a history that's grown too long. That's what S12 The Agent Loop and Harness covers.

<details class="deep">
<summary>Before you build: what to know before reading default.py for the optional exercise</summary>

- **How the files divide the work**: `agents/default.py` is the agent class, handling the loop and stop checks. The code that parses the model's response and extracts the command lives in the model layer. The environment is what actually runs the command. When you see `message["extra"]["actions"]`, just know the model layer parsed it and put it there.
- **What running each step separately means**: since `cd` doesn't persist, the model has to change directory and run the command in the same line every time. The upside is that steps don't interfere with each other and are easy to reproduce.
- **What linear history means**: the whole history is a complete record, easy to save, replay and debug. But every step makes the context longer, and on a long task you hit the cost problem worked out in the previous section. That's exactly what compaction in S12 The Agent Loop and Harness is for.

</details>

### Where to go next

After this chapter, pick a route based on your goal:

| Your goal | Route | Notes |
|---|---|---|
| Put LLMs into a product and build AI applications or agents (most readers) | S0 The Big Picture → [Model Crash Course](/en/guide/app-first/#model-crash-course) → [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) → … → [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) | The Model Crash Course covers the minimum model knowledge for building applications in ten short topics. The 14 application chapters (S6–S19) don't require Part II How Models Work (S1–S5); when they use a model concept, they link back to the Model Crash Course first and then mark "Deeper: Sn chapter title" |
| Understand how models work inside, or do research, train models, or build inference infrastructure | S0 The Big Picture → [Part II How Models Work (S1–S5)](/en/stages/s01-neural-networks/) → the 14 application chapters (S6–S19) | Part II How Models Work (S1–S5) builds up from the bottom: neural networks, Transformers, pretraining, post-training, inference. It's lower level and uses more math; it's the optional deep route |
| Understand what AI systems do without writing code for now | Concepts route: same order as the first route | In each chapter, read the lecture, do "Try it first" and the self-check, and skip the exercises that need code; see [How to Use This Roadmap](/en/guide/how-to-use/#choose-a-route) |

If you're not sure, take the first route. When you want to know "why" partway through, go back and read the matching chapter of Part II How Models Work; the [application route page](/en/guide/app-first/) explains when each chapter is worth reading.

Each chapter has two kinds of exercises. **Core exercises** are the main line and can be done with the lecture alone. **Advanced exercises** are optional and are collapsed in Simple mode. Small tasks marked "optional" (like this chapter's source reading) can be skipped too. The advanced exercises form two projects: the **system project** (A6–A19, [what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)) starts in S6 LLM APIs and Application Basics and builds your own AI application chapter by chapter; the **model project** (M1–M5) has you train small models by hand in Part II How Models Work (S1–S5).

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

1. Go back to the notes assistant's three-round table above. If the round 1 search found only 1 note, 600 tokens in total, how many input tokens would the model get in round 2?

   <details class="hint">
   <summary>Check your answer</summary>

   1,230 + 25 + 600 = 1,855 tokens. Each round's input is "the previous round's input + the model's previous output + the tool result", so the longer the tool result, the longer every later round gets.

   </details>

2. "Every time the user adds a note, automatically add 3 tags": single call, workflow or agent?

   <details class="hint">
   <summary>Check your answer</summary>

   Workflow. The steps are fixed (note added → call the model to generate tags → save) and decided by code. The model only supplies the content of one step, "what the tags are"; it never has to decide what to do next.

   </details>

### Core: Map a request's path and decide whether it needs an agent

**Goal**: show, with one diagram and three decisions, that you understand the big picture of an AI system and know when an agent is warranted. No reading or writing code required.

**Steps**
1. Pick a notes-assistant request (for example, "Turn this week's reading notes into a to-do list and save it as a new note") and draw its full path. Include at least the 7 steps from the table above, and label each box with its chapter code.
2. In a different color, mark which steps are decided by code and which by the model. That's the line between workflow and agent.
3. Write three requirement scenarios (for example, "Email me a summary of my inbox every day", "Help me fix this bug", "Answer the company FAQ"). For each, decide whether it calls for a single call, a workflow or an agent, with two or three sentences of reasoning.

**Acceptance criteria**
- The path diagram has at least 7 steps, each labeled with its chapter code from the table. Next to the diagram, note which part of the path each of these chapters acts on (based on the "Three more chapters sit outside the table" paragraph after the table in [How does one message become an answer?](#-how-does-one-message-become-an-answer)):
  - S1 Neural Network Basics through S4 Post-training and Reasoning
  - S8 Eval Methodology
  - S13 Memory and Personalization through S16 Security and Governance
  - S19 Real Agent Systems and the Capstone
- Each of the three scenario decisions cites one of the "when to build an agent" conditions.

**Hints**
- Draw it on paper, in Excalidraw or in Mermaid. It's the same for TypeScript and Python readers.
- If you get stuck:
  - Reread: [How does one message become an answer?](#-how-does-one-message-become-an-answer), [When should you build an agent?](#-when-should-you-build-an-agent)
  - Further: the "Building blocks, workflows, and agents" section of Anthropic's "Building effective AI agents"

#### Optional: Read the mini-SWE-agent source (requires basic Python)

If you don't know Python, skip this. It doesn't affect any later chapter.

**Steps**
1. Open mini-SWE-agent's [agent class](https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/agents/default.py). Write one sentence on what each method does, and map each step of the main loop back to a step on your diagram. The code that parses the model's response and extracts the command isn't in this file; it's in the model layer. When you see `message["extra"]["actions"]`, just know where it comes from.
2. Find every stop condition in the loop, and what happens when a command fails.

**Acceptance criteria**
- Every method in mini-SWE-agent has a one-sentence description, and you list at least 3 stop conditions (e.g. the completion command, a step or cost limit, repeated format errors).

**Hints**
- Before reading, review [How small can an agent be?](#-how-small-can-an-agent-be) and its "Before you build" section.
- To actually run mini-SWE-agent you need a model API key; it usually costs a few cents. You can finish this exercise without running it.

## Self-check

1. What's the difference between a workflow and an agent? Why is "agents are more advanced" the wrong way to put it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the difference is whether code or the model decides the next step. **Common mistake**: describing the difference as number of steps or level of intelligence; it's a tradeoff in control, not better versus worse. **Reread**: [Who decides the next step?](#-who-decides-the-next-step)

   </details>

2. What does a request go through in the prefill and decode phases? (Details in [Model Crash Course, "KV cache"](/en/guide/app-first/#kv-cache-and-why-output-tokens-cost-more); deeper: S5 Inference and Serving. The gist is enough for now.)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: prefill reads the known input all at once and can compute in parallel; decode generates one token at a time and has to go in order. **Common mistake**: thinking both process text token by token; only decode has to go one at a time. **Reread**: [How does one message become an answer?](#-how-does-one-message-become-an-answer)

   </details>

3. mini-SWE-agent has only one tool, bash. Why can it still solve many coding problems? What does this design give up?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: bash can read files, search, edit and run tests, so it's a general-purpose tool. **Common mistake**: naming only the upside. Name the two things it gives up: persistent shell state, and view and edit commands designed for models. **Reread**: [How small can an agent be?](#-how-small-can-an-agent-be)

   </details>

4. Scenario: your manager wants an agent that "handles refunds automatically." There are 5 refund rules, all clearly written. Would you recommend an agent? Why?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: with few, clear rules and a next step that can be decided in advance, plain code or a workflow is most reliable. **Common mistake**: choosing an agent because it's "automatic" or involves judgment. **Reread**: [When should you build an agent?](#-when-should-you-build-an-agent)

   </details>

5. Without looking at the lecture, think through the notes-assistant request "Find last week's notes that mention the budget and tell me what the budget is." Why is the model's input on the 2nd call longer than on the 1st? What's been added?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: every round resends the full context, so the 2nd input adds the 1st call's tool call and the search results. **Common mistake**: assuming the model remembers the previous round, so only new content is sent. **Reread**: [How does one message become an answer?](#-how-does-one-message-become-an-answer)

   </details>

6. What are the three built-in limits of an LLM on its own? Which component does the notes assistant use to fill each one?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: it can't see the user's data (retrieval), it can only output text (tools), it doesn't remember past conversations (memory). **Common mistake**: saying a bigger model fixes them; these three gaps need components outside the model. **Reread**: [Why not just use a model?](#-why-not-just-use-a-model)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the originals or more examples. None of it is required.

### Engineering guides and whitepapers

- [Anthropic: Building effective AI agents](https://www.anthropic.com/research/building-effective-agents) (2024-12-19) — The original source for the augmented LLM, the five workflow patterns and "when not to use agents", with use cases for each workflow.
- [Kaggle: Introduction to Agents](https://www.kaggle.com/whitepaper-introduction-to-agents) (2025-11) — The original source for agent components (model, tools, orchestration layer) and the Level 0–4 taxonomy. Leans toward the Google ecosystem; you can skip the product sections.
- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — Source of the three "when to build an agent" conditions, plus practical advice on guardrails and orchestration patterns.

### Concepts and surveys

- [BAIR: The Shift from Models to Compound AI Systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/) (2024-02-18) — Why system design matters more than any single model, with examples from several products.
- [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) (2023-06-23) — The classic overview of planning, memory and tool use. Some examples are dated, but the taxonomy still holds up.
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — On agent evals that look only at accuracy and ignore cost. Read it now to build some healthy skepticism; [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) comes back to it.
- [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) (2024-06) — Read the Strategic part to see how teams shipping real products make tradeoffs.

### Courses and maps

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — The lecture 1 slides map out the whole course.
- [roadmap.sh AI Engineer](https://roadmap.sh/ai-engineer) — Useful for checking whether you've missed a topic; not suitable as teaching material.

### Code

- The rest of [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent): the environment and model implementations. Come back to them when you write your own harness (→ S12 The Agent Loop and Harness).

</section>
