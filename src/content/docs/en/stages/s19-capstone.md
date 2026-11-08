---
title: S19 Real Agent Systems and the Capstone
head:
  - tag: title
    content: Taking Apart Coding Agents and Deep Research (S19) | Token2Agent
description: Take apart the design of three kinds of real agent systems (coding agents, deep research and always-on personal agents), then turn your own project into an always-on agent that is shippable, evaluable and defensible for the capstone.
sidebar:
  order: 19
  label: S19 Real Agent Systems and the Capstone
---

:::note[This chapter]
**Prerequisites**: the core exercise only needs the idea of the agent loop (← [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)); the capstone requires finishing [system project](/en/projects/system-thread/) steps A6–A18　**Next**: the end of the route; afterward, go back to [S0 The Big Picture](/en/stages/s00-big-picture/) and pick a layer to go deeper on
:::

:::tip[Concepts route: key points]
- Any agent breaks down into the same six parts. Understand the tradeoffs in each and you can compare different products.
- For tasks whose steps are known in advance, a fixed flow is often cheaper and more reliable than letting the model decide.
- When the notes assistant runs always-on in the background, every scheduled check costs money and adds another entry point for attacks.
:::

## What this chapter covers

The previous eighteen chapters took AI systems apart and studied them layer by layer. This chapter goes the other way and looks at how the three most mature kinds of agents put those layers together: coding agents, deep research, and always-on personal agents. The point isn't to copy them but to understand the tradeoffs behind any agent product: why a fixed workflow here and model decisions there, why split into multiple agents, why require human approval.

The capstone extends your system into an always-on agent and delivers five pieces of engineering evidence that it can ship (shippable), can be measured (evaluable), and has a reason behind every decision (defensible). If you're only doing the core exercises, finishing this chapter's core exercise (taking apart an open-source coding agent) completes the route; the capstone (A19) is an advanced exercise and assumes you've done system project steps A6–A18 along the way. On the concepts route, reading the lecture, Try it first and the self-check completes the chapter.

## After this chapter you can

- Read a trajectory and say which of the six parts (loop, tools, context, memory, eval, security) each step falls into and which chapter covers it. (lecture and self-check)
- Explain the orchestrator-worker and citation design of deep research systems, and what they cost. (lecture and self-check)
- Take any open-source agent, map out its six parts, and find each one in the code. (core)
- Explain why Agentless and SWE-agent can both be competitive on the same benchmark, and what that means for "when to use an agent." (core)
- Design an always-on agent's schedules, notification channels and proactive behavior, while keeping its cost and security risk under control. (advanced)
- Deliver an always-on agent and five pieces of engineering evidence: a regression suite, an infra variance report, a trifecta audit, harness ablation notes and an architecture document. (advanced)

## Lecture

Start with the big picture. This chapter uses one yardstick (the six-part map) to take apart three real systems, and uses the **notes assistant** example carried through every chapter as a bridge: a notes assistant that fixes its own code looks like a coding agent; one that does research for you looks like deep research; one that works even when you haven't opened it is an always-on agent. The last section covers the capstone's five pieces of evidence and the two statistical ideas for reading them.

### ★ How do you take apart any agent?

Any agent, however it's packaged as a product, breaks down into six parts. Once you've broken it down, every part maps back to an earlier chapter, and the differences between products become "what choice each part made."

Feature lists can't be compared with each other; describing every system with the same six parts is what lets you ask useful questions (for the codes in the table, see [how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)):

| Part | Questions to ask | In the notes assistant | Covered in |
|---|---|---|---|
| Loop | Does code or the model decide the next step? When does it stop? | The model decides whether to search again; 15 steps max | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) (workflows), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Tools | What actions can the model take? How is the interface designed? | `notes_search`, `notes_create`, `web_clip` | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| Context | What does the model see at each step? What if it gets too long? | System prompt, the question, 5 retrieved notes; compaction when the conversation gets too long | [S9 Retrieval and RAG](/en/stages/s09-rag/), [S11 Context Engineering](/en/stages/s11-context-engineering/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Memory | What does it remember across sessions? | "User prefers bullet points," time zone UTC+9 | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Eval | How do you know it got better or worse? | A 50-case regression suite, 3 runs per case | [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Security | What data can it touch, what can it do externally, who approves? | Email drafts need a human to click send; clipped web pages are always untrusted input | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) (permissions), [S16 Security and Governance](/en/stages/s16-security/) |

The fastest way to take an agent apart is to read a trajectory: the complete record of one task from start to finish, every model response, every tool call and its result. Each step falls into one of the parts. Take the notes assistant answering "What did I note down about RAG last month?":

1. Load the system prompt, plus the memory "prefers bullet points." → context, memory
2. The model calls `notes_search(query="RAG", month="2026-10")`. → loop, tools
3. 5 notes come back; 1 is a clipped web page, and a hook marks it as untrusted content. → security
4. The model decides it has enough, answers in bullet points with links to the notes, and makes no more tool calls. → the loop's stop condition
5. This trace gets sampled and may later become a case in the regression suite. → eval

A common misconception is that the six parts are six modules in the code. One piece of code often belongs to two parts (compaction manages context and also decides what to keep), so a row listing two chapters is normal. Also, "none" is a choice too: mini-SWE-agent has no memory at all and no specialized tools, and that in itself is a design tradeoff worth writing down.

### ★ How are coding agents designed?

Coding agents are the most mature kind of agent today. Four representative systems each push one of the six parts to the extreme; comparing them side by side shows best how much to leave to the model.

They're mature because the task conditions are unusually good: the goal is clear (make the tests pass), feedback is immediate (the compiler and tests point out errors right away), and the environment can be put in a sandbox and thrown away if something goes wrong. What the four systems each demonstrate:

- **SWE-agent** (Yang et al. 2024) pushes the tools part. It introduced the agent-computer interface (ACI) (← [S10 Tools and MCP](/en/stages/s10-tools-mcp/)): commands for a model should be designed like a UI for people. For example, the file viewer shows only 100 lines at a time with line numbers, search results are capped, and every edit gets a syntax check right away, rejecting the edit if it fails. This works better than handing the model a raw shell. [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent), which you read in S0 The Big Picture, is the other extreme: about 100 lines, bash only.
- **Agentless** (Xia et al. 2024) pushes the loop part, by removing it: the model never decides the flow. Instead there's a fixed three-phase workflow: localize the problem, generate patches, validate and pick a patch. The model only works within each phase, and it reaches competitive results at very low cost.
- **OpenHands** (Wang et al. 2024) is an open platform focused on the execution environment and security: the agent acts by writing code inside a sandbox, and every action and result is recorded as an event stream for replay and debugging.
- **Claude Code** turns harness components (← [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)) into user-configurable interfaces: `CLAUDE.md` (project memory), hooks (code that runs before and after tool calls), skills, sub-agents and permission modes.

Compare SWE-agent and Agentless on the same issue. Suppose the notes assistant's repo has a bug: "When a tag is immediately followed by a comma (`#reading-notes,`), searching for `#reading-notes` doesn't find the note."

| | SWE-agent style (model decides the flow) | Agentless style (code decides the flow) |
|---|---|---|
| Find the location | The model searches for `tag` itself, opens `parser.py`, scrolls to line 40 | Phase 1: give the model the repo structure and narrow down to file, function, line |
| Change the code | The model edits lines 40–42; the syntax check passes | Phase 2: generate 4 candidate patches at once |
| Validate | The model decides to run the tests, reads the results, edits again if needed | Phase 3: code runs the existing tests and a reproduction test; 4 become 2, and one is picked |
| Steps | Depends; could be 6 steps or 30 | Always 3 phases |

Both approaches are competitive on benchmarks like SWE-bench because of the shape of the task: every case is "one issue, one repo, tests decide pass or fail." When the structure is known in advance, a fixed flow covers it, and it's cheaper, more predictable, and when it breaks it's easy to see which phase went wrong. This is the best real-world example of workflow vs agent (← [S0 The Big Picture](/en/stages/s00-big-picture/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)): start with a workflow, and only hand decisions to the model when the task really needs it.

A fixed workflow falls short when you can't know the next step until you see the result of the previous one: you have to run the program before you can reproduce the bug, you have to read the logs to know which module to change, a feature touches five files in an order you can't see in advance, or the issue itself is unclear and you have to ask someone first.

A common misconception is that similar benchmark scores mean equally good. With similar scores, cost and run-to-run consistency (pass^k: the share of tasks that succeed all k times, ← S8 Eval Methodology) can still differ a lot, and your own tasks don't necessarily look like benchmark cases. The core exercise measures exactly these things on 5 tasks of your own.

<details class="deep">
<summary>Going deeper: spec-driven development and Claude Code's configuration points</summary>

- **Spec-driven development** is one way of working with a coding agent: first write down clearly what to build and why (the spec), turn it into a technical plan, break that into tasks, and only then implement and verify. GitHub's spec-kit turns this process into a tool. Its value is making human intent a document you can check, instead of something scattered through a conversation. On the six-part map, a spec is context loaded into every session, and also the basis for evaluation at acceptance.
- **Which part each Claude Code configuration point maps to**:
  - `CLAUDE.md` is loaded at session start (context, memory).
  - Hooks can block or rewrite an action before a tool call, and check or log after it (security, eval).
  - Skills normally expose only a name and description, loading the full text only when needed (progressive disclosure, ← S11 Context Engineering, S12 The Agent Loop and Harness).
  - Sub-agents work in their own context and return only the result (context isolation, ← S12 The Agent Loop and Harness).
  - Permission modes decide which actions ask a human first (← S12 The Agent Loop and Harness).

  The official Best practices is a guide to working with the agent, and you can also infer its harness design from it.
- **OpenHands' "act by writing code"**: rather than defining dozens of tools, let the agent write some Python or bash to run in the sandbox. The action space gets bigger, which makes sandbox and egress limits (← S10 Tools and MCP, S16 Security and Governance) all the more important.

</details>

### ★ How do research agents divide the work?

Deep research systems answer questions that need a lot of searching and synthesis: a lead agent breaks down the question, several sub-agents search in parallel, and finally a dedicated citation agent ties conclusions back to sources. It can cover more ground, at the cost of using many more tokens.

Research questions have many facets, and each facet needs many searches. Put it all into one agent and the context quickly fills up with search results (← [S11 Context Engineering](/en/stages/s11-context-engineering/)), and facets can only be worked on one after another. Anthropic's "How we built our multi-agent research system" (2025-06) is the most complete public description of this architecture so far. Mapped onto the six parts:

- **The loop has two levels**: the lead agent plans research directions, decides how many sub-agents to dispatch, and reads their reports to decide whether it has enough; each sub-agent runs its own search loop. This is the orchestrator-worker pattern from [S15 Multi-agent Systems](/en/stages/s15-multi-agent/).
- **Contexts are isolated from each other**: each sub-agent reads dozens of pages in its own context and returns only a condensed conclusion to the lead agent (← sub-agent isolation in S12 The Agent Loop and Harness).
- **A dedicated citation agent**: after the lead agent writes the report, a separate agent maps each claim to a source. Having one role do only this is more reliable than asking the agent writing the report to add sources along the way.
- **Security**: every web page is untrusted input (← S9 Retrieval and RAG, S16 Security and Governance).

In the notes assistant: Sam asks, "Summarize the main approaches to RAG chunking since 2025 and compare them with the experiment results in my notes." The lead agent splits this into three facets for three sub-agents: papers, engineering blogs, and Sam's own notes. The three sub-agents search at the same time, and each returns a summary of about 200 words plus a source list; the lead agent synthesizes them into a report, and the citation agent ties each sentence back to a note or URL.

Do the cost math. Anthropic's numbers: agents use on average about 4× the tokens of a regular chat, and multi-agent systems about 15×. Those are averages on their system; measure your own.

To decide whether multi-agent is worth it, ask four questions: Is the answer worth more than the extra cost? Can the problem be split into independent facets that can run in parallel? Is there more data than one context can hold? How costly is a wrong or incomplete answer? If the answer to the first two is no, a single agent is usually enough.

Evaluating these systems is also hard, because research reports often have no single correct answer. BrowseComp (Wei et al. 2025) gets around this with questions that are "hard to find but easy to verify once found": the answer is a short string you can check at a glance; the hard part is the process of finding it. You can borrow this idea when designing your own evals. For example, a notes assistant question like "On what day did I first note down GraphRAG?" requires digging through lots of notes, but the answer is a date, which can be graded automatically.

A common misconception is "multi-agent costs 15× more than a single agent." Both multipliers are relative to a regular chat. When deciding whether to split into multiple agents, compare against a single agent: about 15 ÷ 4 ≈ 3.75× (← [S15 Multi-agent Systems](/en/stages/s15-multi-agent/)).

<details class="deep">
<summary>Going deeper: how orchestrator instructions go wrong, and how to fix them</summary>

- The same article notes that an early version of the lead agent spawned up to 50 sub-agents for simple questions, and when task descriptions weren't specific enough, sub-agents duplicated each other's work or left gaps. The fix was to spell out rules in the prompt for "scale effort to query complexity," and to require each sub-agent's task description to include the objective, output format, available tools and scope boundaries (← S15 Multi-agent Systems).
- Research can run a long time and the context can exceed its limit. The lead agent first writes its research plan into memory so it can recover it if the context is truncated; this is the same idea as the structured notes in S12 The Agent Loop and Harness.
- The quality improvement reported in the same article (multi-agent outperforming single-agent by 90.2% on their internal eval) was measured on research tasks especially suited to parallelism, using their own eval (← S15 Multi-agent Systems). It doesn't transfer directly to other tasks.

</details>

### ★ What does an always-on agent add?

An always-on agent doesn't wait for the user to open a web page before it works. It runs in the background and interacts through channels the user already uses. There's no new magic: it just adds new "trigger sources" in front of the loop, and that amplifies the hard problems from earlier chapters.

Taking the open-source OpenClaw as an example, these systems usually have a few components:

- **Gateway**: a long-running process that connects the various messaging channels to the agent and manages sessions and routing.
- **Channels**: where users reach the agent, such as a chat app, email, webhooks or desktop notifications. Each channel is a new input source, and potentially a new source of untrusted input (← [S16 Security and Governance](/en/stages/s16-security/)).
- **Cron**: scheduled jobs that fire at exact times, such as an 8 a.m. daily summary.
- **Heartbeat**: wakes the agent periodically so it can check whether anything needs handling; if not, it quietly exits.
- **Goal loop**: give the agent a goal and let it keep working across many turns until an evaluator judges the goal met, the budget runs out, or a human needs to step in (← stop conditions in [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)).

On the six-part map: cron and heartbeat are new trigger sources for the loop, channels change the security part, and the goal loop is a loop with stop conditions and a budget added. In the notes assistant: every morning it organizes the previous day's new notes and emails a summary (cron); every 30 minutes it checks whether any note mentions something coming due, and only sends a reminder if so (heartbeat); Sam says in a chat app, "Turn this month's reading notes into an outline," and the agent works across many turns until it's done (goal loop).

Do the cost math before choosing the interval. A heartbeat every 30 minutes is 48 a day, 1,440 in 30 days. Assume each carries 5,000 input tokens at $3 per million input tokens (an illustrative price; output ignored): a month is 1,440 × 5,000 = 7.2 million tokens, about $21.60. If the context each run carries grows to 20,000 tokens over time, it becomes 28.8 million tokens, about $86.40, 4× as much. A common way to save is a cheap filtering layer: first use rules or a small local model to check "are there new notes with due dates?" and only call the cloud model if there are. If only 6 checks a day actually need it, a month drops from 1,440 calls to 180.

Always-on amplifies three old problems:

- **Long stretches with nobody watching**: process restarts and provider errors will happen, so state has to be recoverable. That's durable execution and monitoring (← [S18 Deployment and Architecture](/en/stages/s18-deployment/)).
- **Sending messages proactively**: every notification spends the user's attention, so you need a notification budget and a way to snooze or turn off a category of notifications (← [S17 Product and AI UX](/en/stages/s17-ai-ux/)).
- **Hitting all three**: the lethal trifecta is an agent that can read untrusted content, access private data and send data out (← S16 Security and Governance). Once the notes assistant is connected to a chat app, a message from anyone is untrusted input; it can also read private notes and send messages, so all three come together at once.

A common misconception is "heartbeats are cheap because they quietly exit when there's nothing to do." Every heartbeat is a full agent turn. Even if it ends up doing nothing, the model call has already been paid for, and the shorter the interval, the higher the cost. Other common causes of overspending: the context each run carries grows over time (← S11 Context Engineering, the example above), failed retries pile up on each other (← S6 LLM APIs and Application Basics), and a heartbeat triggers a goal loop or a chain of tool calls.

<details class="deep">
<summary>Going deeper: the split between heartbeat and cron is still shifting</summary>

- Products split heartbeat and cron differently, and they're still adjusting. OpenClaw's docs show it migrating heartbeats into ordinary scheduled jobs. When designing your own system, the names don't matter. What matters is distinguishing two kinds of triggers, "do a fixed thing at a fixed time" and "check periodically whether there's anything to do," and giving each its own budget.
- A goal loop needs at least three stop conditions: an evaluator judges the goal met; the budget (steps, tokens, money) runs out; consecutive failures hit a threshold and it escalates to a human (← S12 The Agent Loop and Harness). With only the first, a broken run keeps burning money.
- In the background, nobody is in front of the screen to approve actions, so high-risk actions should be "queued for approval, confirmed next time the user is online" rather than automatically allowed (← permission modes in S12 The Agent Loop and Harness, S16 Security and Governance).

</details>

### ★ How do you prove it's ready to ship?

A demo only proves it ran once. The system has to prove it can ship, can be measured, and has a reason behind every decision. An always-on agent runs for long stretches with nobody watching, and the only thing you can rely on is evidence built in advance.

The capstone delivers five pieces of evidence: a regression suite (changes don't break what already works), an infra variance report (score changes are real, not environment noise), a trifecta audit (new channels and schedules don't open new attack paths), harness ablation notes (every harness component has a reason to exist), and an architecture document (it can ship, and you know what to do when something goes wrong). The first three and the fifth are mostly things you did in earlier chapters plus the always-on components. What's genuinely new is how you read the scores, which takes two ideas.

<details class="hint">
<summary>How to start writing: the minimum format for each piece of evidence</summary>

Start every piece of evidence with these five lines. If you can fill them in, you have a first draft:

```text
Question: what does this evidence need to answer?
Method: what was run, how many cases × how many runs, which two versions or which factor were compared
Numbers: the core numbers, with 95% confidence intervals or distributions
Conclusion: keep / remove / ready to ship, and which number it's based on
Limits: what wasn't tested, what to do next
```

| Evidence | The "Numbers" line needs at least |
|---|---|
| Regression suite | Number of cases, pass^3, the paired-difference interval against the version at the end of A18 Multi-user Deployment, and δ set in advance |
| Infra variance report | The spread of scores over 5 runs of the same commit, and the gap after changing one factor |
| Trifecta audit | The number of all-three combinations and their countermeasures, and successes in the injection test on the new channel before and after the fix |
| Harness ablation notes | Tasks × runs, the 95% confidence interval of the paired difference |
| Architecture document | Runs, failures and recoveries over 7 days, daily cost, and the result of the 30-minute walkthrough test |

</details>

**First, measure how big the noise is.** Rerunning the same commit (one saved version of the code) can change the score, and the cause may be nothing but the environment: tool timeouts, concurrency, container resources. As [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) mentioned, Anthropic found that changing only the container's resource settings moved the success rate by about 6 percentage points between the most lenient and strictest settings, and recommends being skeptical of gaps under 3 points. So the infra variance report starts by running the same commit 5 times to see how wide the score distribution is; after that, any "it got better" gap has to be larger than that width to count.

**Second, compare paired on the same set of cases.** When comparing two versions, run them on the same cases, compute "new minus old" for each case, then compute the 95% confidence interval of the mean difference (← S8 Eval Methodology). Pairing cancels out the difficulty of individual cases, so the interval is much narrower than computing a separate interval for each version. Only cases both versions can run can be paired: the version at the end of A18 Multi-user Deployment has no schedules or notifications, so the new always-on behavior cases can't be paired and are reported on their own as pass^3.

To show the new version "isn't worse," write down the allowed gap δ before running, say 5 percentage points; it passes only if the lower bound of the paired difference's 95% confidence interval is no lower than −δ. δ must be set in advance; setting it after seeing the results makes it meaningless.

Example: an ablation removes compaction, 20 tasks × 5 runs. With it, 82 of 100 runs succeed; without it, 79, a difference of −3 percentage points. Suppose bootstrapping the differences over the 20 tasks gives a 95% confidence interval of [−7, +1] for the paired difference. The interval includes 0, so you can't say compaction definitely helps; but the lower bound −7 is below −δ = −5, so you also can't say removing it has no effect. The reasonable decision here is to keep it for now and narrow the interval with more tasks or more runs, or to look at cost: if removing compaction saves a lot of money per task, it's worth another round of evals to settle the question.

A common misconception is "the two versions' confidence intervals overlap, so there's no difference." Overlapping intervals don't mean the difference's interval includes 0, let alone that the gap is smaller than δ. When comparing on the same set of cases, look at the paired difference's interval.

<section class="deep-section">

### ○ What other agent domains are there?

Science agents, theorem proving and embodied agents apply agents to scientific discovery, formal proofs and physical robots. Each has its own specialized environments and evaluation methods, outside the scope of this route. If you're interested, start from the eval, harness and security ideas in this course and then read a survey of that field.

</section>

## Exercises

Concepts route (no coding): after "Try it first," you can skip to the self-check.

### Try it first (about 10 minutes)

1. One step in a trajectory reads: "The model calls `web_clip` to clip a web page, and a hook marks the returned content as untrusted." Which two of the six parts does this step fall into? Why can one step fall into two?

   <details class="hint">
   <summary>Check your answer</summary>

   Tools (the model takes an action) and security (the harness decides whether this content can be trusted). The six parts are questions to ask, not six modules in the code, so one step can answer two questions at once.

   </details>

2. A heartbeat runs every 60 minutes, each carrying 4,000 input tokens, at $3 per million input tokens (an illustrative price; output ignored). How much does a month (30 days) cost?

   <details class="hint">
   <summary>Check your answer</summary>

   24 × 30 = 720 runs; 720 × 4,000 = 2.88 million tokens; 2.88 × 3 ≈ $8.64. Even if every run finds "nothing to do," you still pay.

   </details>

### Core: take apart an open-source coding agent

**Goal**: actually run an open-source coding agent, map each of its components to concepts you've learned, and measure its consistency and cost.

**Steps**
1. Pick an open-source coding agent. mini-SWE-agent is recommended (the code is short enough to read in full); if you have time, choose SWE-agent or OpenHands.
2. Prepare 5 tasks, each with tests that can decide success or failure automatically. A reproducible way to do it (the same way SWE-bench builds its cases):
   - Pick a small open-source repo with tests that you can follow (for example a Python or TypeScript library under 2,000 lines).
   - Find 5 commits in its git history that "fix a bug or add a small feature, and add tests at the same time."
   - For each task: check out the version just before that commit, add back only the new test files (the tests should now fail), and rewrite the commit message or the corresponding issue as the task description. The agent succeeds if it makes those tests pass without breaking the existing tests.
   - If you can't find 5 in the history, make up the rest in the same format: write the test first, then remove the implementation.
3. Run each task 3 times, recording success, number of steps, tokens, cost and time.
4. Read its code and one complete trajectory, and fill in a breakdown table: component (loop, tools and ACI, prompt, context management, stop conditions, permissions / sandbox, error handling, how it's evaluated, and so on), where it is in the code, and which chapter it maps to.
5. Write down 3 design tradeoffs it makes, for example "it gives the model no specialized tools, only bash," and what you think each costs. Compare at least one against Agentless's fixed three-phase workflow: on your 5 tasks, which approach fits better?

**Acceptance criteria**
- A results table of 5 tasks × 3 runs, with success rate, pass^3 (the share of tasks that succeed all 3 times, ← S8 Eval Methodology), and average cost and time per task.
- A breakdown table with ≥ 10 rows, each with a code location (file and line number, or function name) and the chapter it maps to.
- 3 design tradeoffs, each with a concrete example you saw in the trajectory; at least one includes a comparison with Agentless.

**Hints**
- TypeScript: mini-SWE-agent is a Python project, but your task repo can be TypeScript (for example a small project with Vitest tests); compare the breakdown table against the harness you wrote yourself (← S12 The Agent Loop and Harness).
- Python: `pip install` mini-SWE-agent directly and use pytest for the task repo.
- Cost: 15 runs on a mid-size model is a few dollars; you can also hook up a local model, but the success rate will drop noticeably, so note that in your report. The agent's prompt plus command output easily exceeds Ollama's default context, so if you use Ollama, increase the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)).
- If you get stuck:
  - Reread: [How do you take apart any agent?](#-how-do-you-take-apart-any-agent), [How are coding agents designed?](#-how-are-coding-agents-designed)
  - Further: the ACI design section of the SWE-agent paper, Claude Code's official best practices

<section class="deep-section">

### Advanced: System project A19 (capstone): Turn your system into an always-on agent

**Goal**: extend your system into an always-on agent, and deliver five pieces of engineering evidence ready for review.

**What this project is**: take the system you've built from S6 LLM APIs and Application Basics all the way through S18 Deployment and Architecture, and extend it into an always-on agent that works without anyone opening it. It runs tasks on a schedule, proactively notices things that need handling, notifies the user through at least one channel, and pursues goals within limited permissions and budget. If your topic genuinely doesn't suit always-on operation (for example it's inherently a one-off analysis tool), you can do another kind of "real system extension" instead: make it a coding agent that maintains its own repo, add a deep research mode, or connect it to a real external workflow. The requirements for the five deliverables stay the same.

**Why these five deliverables**: what defines an always-on agent is that it runs for long stretches with nobody watching it. The only thing you can rely on then is evidence built in advance.

| Deliverable | What it proves | Chapters it draws on |
|---|---|---|
| Regression suite | Changes don't break what already works (evaluable) | [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Infra variance report | Score changes are real, not environment noise (evaluable) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Trifecta audit | New channels and schedules don't open new attack paths (defensible) | [S16 Security and Governance](/en/stages/s16-security/) |
| Harness ablation notes | Every harness component has a reason to exist (defensible) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Architecture document | It can ship, it can scale, and you know what to do when something goes wrong (shippable) | [S17 Product and AI UX](/en/stages/s17-ai-ux/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |

**Steps**
1. **Always-on components**: at least one cron job, one heartbeat or event-triggered proactive check, one notification channel (pick one: email, chat app, webhook or desktop notification), and one goal loop with stop conditions and a budget cap. State must be recoverable after a process restart (← S12 The Agent Loop and Harness, S18 Deployment and Architecture).
2. **Proactive behavior design** (← S17 Product and AI UX): define a notification budget, what's worth interrupting the user for, and how users snooze or turn off a category of notifications.
3. **Regression suite**: at least 50 cases covering the original features and the new always-on behavior (for example "no notification when there are no new events"), each run 3 times, wired into the CI/CD pipeline from S18 Deployment and Architecture.
4. **Infra variance report**: run the whole suite 5 times on the same commit and report each run's score and the variance; then change one infrastructure factor (for example tool timeout, concurrency, or the model's region or version) and see whether the score change exceeds that variance range.
5. **Trifecta audit**: redo the audit from S16 Security and Governance, including the new channels, scheduled triggers and background execution, and fix any new all-three combinations.
6. **Harness ablation**: remove or replace one harness component (for example compaction, a hook, the planning step, a skill), compare on ≥ 20 tasks × 5 runs, and include the 95% confidence interval of the paired difference.
7. **Continuous operation**: let it actually run for at least 7 days, recording the number of runs, failures, recoveries, notifications sent, the share of notifications users acted on, and total cost.
8. **Architecture document**: build on the architecture document from A18 Multi-user Deployment, adding the always-on components, the 7-day operating numbers, known limits and next steps.

**Acceptance criteria**
- A regression suite of ≥ 50 cases running in the CI/CD pipeline, reporting pass^3 and a 95% confidence interval. Paired comparison uses only cases both versions can run: on the original-feature cases, the final version is no worse than the version at the end of A18 Multi-user Deployment (write down the allowed gap δ before running, say 5 percentage points; the lower bound of the paired difference's 95% confidence interval is no lower than −δ). That version has no schedules or notifications, so the new always-on behavior cases can't be paired and are reported on their own as pass^3.
- Infra variance report: the score distribution over 5 runs of the same commit, and the effect of at least one infrastructure factor; the conclusion says how big a score difference has to be to count as "really better or worse."
- The trifecta audit covers all new channels and schedules; every all-three combination has a countermeasure; at least 1 injection test targets a new channel, with 0 successes in 5 runs after the fix.
- Ablation notes: at least 1 component, 20 tasks × 5 runs, with the 95% confidence interval of the paired difference in the conclusion and a keep / remove decision.
- 7-day operating log: the number of automatic recoveries without human intervention, notifications sent and the share acted on, and daily cost; if any incident needed manual repair along the way, include a short postmortem.
- The architecture document lets an engineer who has never seen the code explain the system's main components, data flow, trust boundaries and rollback method within 30 minutes (actually try it with someone).

The notes assistant as an example: every morning it organizes the previous day's new notes and emails a summary (cron); every 30 minutes it checks whether any note mentions something coming due, and only sends a reminder if so (heartbeat); Sam says in a chat app, "Turn this month's reading notes into an outline for me," and the agent works across many turns until it's done (goal loop). The new channel means any message sent to that chat app by anyone is untrusted input, so the trifecta audit has to be redone.

**Hints**
- TypeScript: use node-cron or the system's launchd / systemd timers for scheduling; the simplest notification channels are the Telegram Bot API, a Slack incoming webhook or email; durable state can reuse the database or checkpointing from S18 Deployment and Architecture.
- Python: APScheduler or the system scheduler; Temporal's Python SDK suits long-running tasks; notifications as above.
- Cost (evals): one round of the regression suite is 50 × 3 = 150 agent runs; the infra variance report runs 5 rounds on the same commit, so 4 rounds beyond that first one (4 × 150 = 600 runs), plus 1–5 rounds after changing a factor (150–750 runs), for 750–1,350 runs; the ablation is 2 × 20 × 5 = 200 runs. In total about 150 + 750–1,350 + 200 = 1,100–1,700 agent runs, not counting the suite on every PR in CI. Use the cost accounting from S8 Eval Methodology to estimate the average cost per run and multiply; run the pipeline with a small or local model first, and only use the production model at the end; if you use Ollama, increase the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)).
- Cost (always-on): every heartbeat is a full model call. Work out "runs per day × cost per run" before deciding the interval; the first check layer can use rules or a small local model, calling the cloud model only when needed.
- If you get stuck:
  - Reread: [What does an always-on agent add?](#-what-does-an-always-on-agent-add), [How do you prove it's ready to ship?](#-how-do-you-prove-its-ready-to-ship); the documents you wrote yourself in S16 Security and Governance and S18 Deployment and Architecture
  - Further: the s11 (background tasks), s12 (scheduling) and s17 (goal loop) lessons in learn-claude-code; Anthropic's "Infrastructure noise in agentic coding evals"

**Note**: during the 7 days of continuous operation, you only need to spend a little time each day checking on it.

</section>

## Self-check

1. In your own words: Agentless gets competitive results with a fixed workflow. Does that mean agents are unnecessary? What kinds of tasks make a fixed workflow insufficient?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: no; the benchmark's task shape is fixed, which is why a fixed flow can cover it. When you can't know the next step until you see the previous step's result (you have to reproduce the bug first, read logs, the issue is unclear), a workflow falls short. **Common mistake**: assuming a high benchmark score means real tasks also suit a fixed flow. **Reread**: [How are coding agents designed?](#-how-are-coding-agents-designed)

   </details>

2. Deep research systems use about 15× the tokens of a regular chat, and about 3.75× those of a single agent (← S15 Multi-agent Systems). Given a new research-style requirement, what questions would you use to decide whether a multi-agent architecture is worth it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: whether the answer is worth more than the cost, whether it splits into independent parallel facets, whether there's more data than one context holds, and how costly a wrong or incomplete answer is; if the first two are no, a single agent is usually enough. **Common mistake**: assuming multiple agents are always stronger, without counting the cost. **Reread**: [How do research agents divide the work?](#-how-do-research-agents-divide-the-work)

   </details>

3. Scenario: your always-on agent runs a heartbeat every 30 minutes, and the monthly bill is 4× what you expected. List three possible causes and how you'd investigate each.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the context each run carries grows over time, failed retries pile up, and a heartbeat triggers a goal loop or a chain of tool calls; compare token counts, retry counts and tool call counts per run from the traces. **Common mistake**: just blaming a higher model price without looking at tokens per run. **Reread**: [What does an always-on agent add?](#-what-does-an-always-on-agent-add)

   </details>

4. Your ablation shows that removing the planning step drops the success rate on 20 tasks × 5 runs from 88% to 84% (−4 percentage points), and the two versions' 95% confidence intervals overlap. Do you keep or remove the component? What else do you need to know? (Hint: does overlap tell you anything about the difference? See the paired comparison in "How do you prove it's ready to ship?")

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: overlap between the two versions' intervals says nothing about the difference; look at whether the paired difference's interval includes 0 and whether its lower bound is below −δ. **Common mistake**: seeing overlap and saying "no difference, remove it." **Reread**: [How do you prove it's ready to ship?](#-how-do-you-prove-its-ready-to-ship)

   </details>

5. Scenario: someone says "My agent demo runs great, it's ready to ship." Based on the capstone's five deliverables, what five questions would you ask them?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: each question maps to one piece of evidence: will changes break old features, is a score change just noise, does it hit all three, does every harness component have a reason, how do you roll back when something goes wrong. **Common mistake**: offering one successful demo as the evidence. **Reread**: [How do you prove it's ready to ship?](#-how-do-you-prove-its-ready-to-ship)

   </details>

6. Pick one feature of the notes assistant (or your own system), for example "email a summary every morning," and use the six-part map to say what its loop, tools, context, memory, eval and security are, and which chapter each maps to.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: fill in all six; "none" counts as a choice too. For example, the daily summary's loop is triggered by cron, and for security you check whether sending the email needs human approval. **Common mistake**: leaving the parts it doesn't have blank. **Reread**: [How do you take apart any agent?](#-how-do-you-take-apart-any-agent)

   </details>

7. Without looking at the lecture, draw the flow of a research question through a deep research system from the lead agent to the citation agent, marking which steps run in parallel and which contexts are isolated from each other.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the lead agent breaks down the question → several sub-agents search in parallel, each with an isolated context, returning only a summary → the lead agent synthesizes → the citation agent ties claims back to sources. **Common mistake**: having sub-agents stuff their full search results back into the lead agent. **Reread**: [How do research agents divide the work?](#-how-do-research-agents-divide-the-work)

   </details>


<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original designs or want to follow someone else's implementation. None of it is required.

### Official docs and engineering articles

- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) (official docs) — how a mature coding agent is actually used, from which you can infer its harness design; use it to check your breakdown table in the core exercise.
- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) (2025-06-13) — the full deep research architecture, prompt design principles and pitfalls; far more detail than the lecture's summary.
- [Anthropic: Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise) (2026-02-05) — the source of the method behind the capstone's infra variance report, with the full experimental setup (← S14 Agent Evals, Data and Optimization).
- [OpenClaw docs](https://docs.openclaw.ai/) — the gateway, channels and automation design of an always-on personal agent; the lecture only uses the component names, and the implementation details are here.

### Papers

- [Yang et al. 2024, SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793) — ACI design principles and ablations, showing how much each interface design contributes.
- [Xia et al. 2024, Agentless](https://arxiv.org/abs/2407.01489) — full details and cost numbers for the three-phase workflow; read alongside SWE-agent.
- [Wang et al. 2024, OpenHands](https://arxiv.org/abs/2407.16741) — the open platform's architecture: event stream, sandbox, acting by writing code.
- [Wei et al. 2025, BrowseComp](https://arxiv.org/abs/2504.12516) — evaluating deep research: how the questions are written and how to make sure they're "hard to find but easy to verify."

### Tools

- [github/spec-kit](https://github.com/github/spec-kit) — tooling and process for spec-driven development, with real templates from spec to task list.
- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — s11 (background tasks), s12 (cron) and s17 (goal loop) map directly onto the always-on agent's components, with step-by-step code.

### Courses

- [Stanford CS146S The Modern Software Developer](https://themodernsoftware.dev/) — a full course on working with coding agents.
- [Stanford CS 329Z](https://cs329z.stanford.edu/), the Coding & Software Agents and Proactive Agents sessions (read once the slides are public).

### After the route

- Science agents, theorem proving, embodied agents: each field's specialized benchmarks and environments.
- Agentic RL (← the optional section of S14 Agent Evals, Data and Optimization): use the traces and regression suite you built up in the capstone as a training environment, and go back to the [model project](/en/projects/model-thread/) to train a small model into a dedicated agent for your system.
- Go back to [S0 The Big Picture](/en/stages/s00-big-picture/) and pick the layer you feel weakest in to go deeper on.

</section>
