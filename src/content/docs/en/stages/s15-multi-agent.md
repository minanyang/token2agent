---
title: S15 Multi-agent Systems
head:
  - tag: title
    content: When Is Multi-agent Worth It? Multi-agent Architectures (S15) | Token2Agent
description: When multi-agent is worth it. Weigh single versus multiple agents, choose between manager and handoff architectures, decide what context a handoff carries, see how much token cost grows, and recognize the most common multi-agent failures.
sidebar:
  order: 15
  label: S15 Multi-agent Systems
---

:::note[This chapter]
**Prerequisites**: [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/); for model background see the [Model Crash Course](/en/guide/app-first/)

**Next**: → [S16 Security and Governance](/en/stages/s16-security/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/)
:::

:::tip[Concepts route: key points]
- One agent is the default. Splitting is only worth it for independent work, like the notes assistant researching three cities separately.
- An agent that's handed a piece of work knows only what the handoff tells it. Whatever you leave out, it doesn't know.
- Multiple agents usually cost more, mostly because they do more work. Keep them only if they really beat one agent on your evals.
:::

## What this chapter covers

Multiple agents add token cost, handoff losses and debugging work. This chapter examines when to split a task, how to divide it and how to measure the cost. First complete [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), then keep a multi-agent design only if it beats a single agent in your evals.

## After this chapter you can

- Given a requirement, give the reasons for using a single agent and for using multiple agents, and judge whether its subtasks can be completed independently in parallel. (lecture and self-check)
- Tell the manager (agent-as-tool) architecture from the handoff architecture, and design the context a handoff passes along. (core: a manager-style orchestrator; handoff is optional in the advanced exercise)
- Design a single vs multi-agent experiment that can tell them apart, and estimate token cost alongside the quality gain. (core)
- Label failures in multi-agent runs with the failure taxonomy from Cemri et al. 2025. (core)
- Let several parallel agents modify the same project without overwriting each other. (advanced)

## Lecture

Through [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), the notes assistant used one loop, context and toolset. A multi-agent system divides work among agents with separate contexts that exchange messages. Its design involves five questions:

1. **Whether to split**: in most cases a single agent is enough; splitting only pays off under a few conditions.
2. **How to split**: the manager pattern (one agent uses the others as tools) or the handoff pattern (the conversation is handed to another agent).
3. **What a handoff carries**: a sub-agent knows only what you pass it; pass too little and things get missed, too much and things get muddled.
4. **What it costs**: tokens, money and latency, weighed together with quality.
5. **How it breaks and how to decide**: read traces with a failure taxonomy, and use evals to decide whether to keep or remove it.

### ★ An example: the notes assistant's research task

The whole chapter uses one task. Sam asks the notes assistant: "Pull together what's in my notes and on the web about home solar panel incentives, compare the programs in Austin, Denver and San Diego, and write it up as a note."

**Single-agent version**: one agent loop (← S12 The Agent Loop and Harness), plus `notes_search`, `web_clip` (reads one web page) and `notes_create` from S10 Tools and MCP; this chapter adds a `web_search` tool. It researches Austin, then Denver, then San Diego in turn, keeping all search results in the same context, and finally writes the note.

**Multi-agent version**: an **orchestrator** (the agent that splits up the work and merges the results) splits the task into three parts and hands each to a **sub-agent** (an agent called to do one small piece of work). Each sub-agent researches only one city, searching and reading in its own context, and returns only a summary under 1,000 tokens. The orchestrator takes the three summaries and writes the note.

Both versions use the same model and tools. The single agent works sequentially in one context; the multi-agent version works in parallel across three. The rest of the chapter compares them.

### ★ When is it worth splitting into multiple agents?

Default to a single agent. Consider multiple agents only when the task splits into many independent subtasks, or when the amount of information is more than one context can handle well.

Both sides' arguments are worth knowing. Graham Neubig's blog post "Don't Sleep on Single-Agent Systems" (2024-09-26) argues that one general-purpose model with a set of general tools (writing code, running it, browsing) and a good prompt can do much of what multi-agent designs set out to do, while multi-agent brings problems like rigid roles, context lost between agents and more complex code. In his view, there are only two situations where multi-agent is truly justified: **one agent holds information the others shouldn't see**, or **different agents act on behalf of different people**.

Anthropic's "How we built our multi-agent research system" describes the gains: on the BrowseComp evaluation (a set of web search questions whose answers are hard to find but easy to verify), token usage alone explained about 80% of the variance in scores (with the number of tool calls and the choice of model, these three factors explained about 95%), and multi-agent is a way to spend more tokens in parallel. The same article also says that work where all agents need to share the same context, or with few parallelizable subtasks (it gives most coding tasks as an example), isn't a good fit.

Applied to the notes assistant: each city's incentives can be researched separately, with no dependencies, and there are lots of search results, so it's a good fit for splitting. On the other hand, "make the tone of this note more formal" involves one document, with every step depending on the previous one; splitting it only adds handoffs. In between sits **sub-agent isolation** from [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/): there's still one main agent, which just hands one noisy stretch of exploration to a sub-agent and gets back a summary.

Research, writing and review are three steps, but if each needs everything from the previous step, one agent usually handles them better. Split work that agents can complete independently and in parallel.

### ★ How do multiple agents divide the work?

OpenAI's "A Practical Guide to Building Agents" divides multi-agent systems into two kinds. The difference is "who talks to the user":

- **Manager pattern**: one central agent calls the other agents as tools (**agent-as-tool**). Sub-agents return their results when done, and control and the conversation with the user always stay with the manager.
- **Decentralized pattern** (handoff): agents are peers, and one agent **hands** the conversation to another, specialized agent, which takes over talking to the user.

The notes assistant's research task uses the manager pattern: the user only ever talks to the notes assistant, and the three city sub-agents are invisible to the user, like three somewhat elaborate tool calls. The classic handoff example is customer support: a triage agent decides it's a refund issue and hands the conversation to a refund specialist agent, which then replies to the user directly while the triage agent steps out.

How to choose: when the user needs one consistent conversation partner and results need to be merged in one place, use a manager; when different stages need entirely different expertise and tools, and the work doesn't need to come back once handed off, use handoffs.

After a handoff, the original agent stops participating and the receiving agent becomes the user's conversation partner. Delegating a task and waiting for a report is the manager pattern.

<details class="deep">
<summary>Before you build: what the two patterns look like in the OpenAI Agents SDK</summary>

- In the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/), the manager pattern wraps a sub-agent as a tool (`Agent.as_tool` in the Python version); the manager calls it and gets the output back, and the manager stays responsible for the conversation.
- A handoff passes the full conversation history to the receiving agent by default. A **handoff input filter** lets you decide what the receiving agent sees, for example stripping out the previous agent's tool-call details.
- You can do it without a framework too: the manager is just a tool whose implementation is "start a new messages array, run an agent loop (← S12 The Agent Loop and Harness), return the final text."

</details>

### ★ What should a handoff carry?

A sub-agent's context starts fresh. It can't see the user's original conversation or what the orchestrator was thinking; it sees only the text passed to it in the handoff. So what the handoff contains determines how well the sub-agent can do.

This is the context budget problem from [S11 Context Engineering](/en/stages/s11-context-engineering/), multi-agent edition: **pass too little**, and the sub-agent doesn't know what matters and produces things you can't use; **pass too much**, and irrelevant or even untrusted content (like instructions hidden in a web page) comes along with it. This is also where the benefit lies: each sub-agent handles only its own share of the data and isn't distracted by other cities' search results. That's **context isolation**.

The brief the notes assistant hands to the Denver sub-agent should include:

| Field | Content |
|---|---|
| Goal | Find the amount, eligibility requirements and application deadline for Denver's 2026 home solar panel incentives |
| Scope | Denver only; search the user's notes first, then the web; use only government websites or news sources |
| Output format | Under 1,000 tokens; every claim cites its source (note title or URL); write "not found" for any field you can't find |
| Budget | At most 8 searches |
| Don't | Create or modify notes; compare with other cities |

The return direction needs design too: the orchestrator receives only summaries, not the full web pages the sub-agents read. The three summaries add up to about 3,000 tokens, far smaller than all the search results for three cities.

If the user says "I own a single-family house, not a condo" and the orchestrator leaves that out of the brief, the sub-agent will not know. It may return programs that apply only to condos.

### ★ Who splits the work and merges the results?

[S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) covered the orchestrator-workers workflow: code or a model splits a task among several workers. In the agent version, the orchestrator itself decides how many parts to split into, what to tell each one, and when it has enough. Deep research (automatically searching many sources and compiling a report with citations) is the most typical use of this architecture.

Anthropic's research system is a concrete example: a lead agent plans the research directions and spawns several sub-agents in parallel, each searching a different angle; the sub-agents explore in their own contexts and return only condensed results; the lead agent merges them, then hands the result to a dedicated citation agent that matches each claim to its source. Mapped to the notes assistant: the orchestrator is the lead agent, there's one sub-agent per city, and you can add a citation-checking step at the end.

Most of the difficulty in this architecture lies in the orchestrator's instructions. The article mentions that early versions of the lead agent spawned as many as 50 sub-agents for simple questions, and when task descriptions weren't specific enough, sub-agents duplicated each other's work or left gaps. Their fix was to spell out rules in the prompt for "scaling effort to the complexity of the question." Applied to the notes assistant: "What's Denver's incentive?" needs no sub-agents at all; only "compare three cities" gets split into three.

Each sub-agent adds context cost and another handoff. Overlapping assignments can also duplicate web searches. [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) covers the full design of deep research systems.

<details class="deep">
<summary>Before you build: a checklist for writing the orchestrator prompt</summary>

- Spell out effort rules, e.g. "Answer single-fact questions directly; when comparing N items, use one sub-agent per item, at most 4."
- Require the orchestrator to list the subtasks before spawning sub-agents, and check that no two overlap and that together they cover the whole question.
- Use the same template for every brief (the five fields above), so they're easy to compare in the trace.
- Fix the sub-agents' return format so the orchestrator can merge reliably; you can use structured output (← [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)).

</details>

### ★ How much more does multi-agent cost?

Multi-agent spends more tokens in parallel. Quality may be better, and the bill is usually higher, mostly because the agents search more (see the example below). So always look at two numbers together: how much quality improves and how much cost grows.

Anthropic's research system reports that agents use about 4 times as many tokens as ordinary chat on average, and multi-agent systems about 15 times. Both numbers use chat as the baseline; converted to "multi-agent relative to single agent," that's about 15 ÷ 4 ≈ 3.75 times. The same article reports that a multi-agent system with Opus 4 as lead and Sonnet 4 as sub-agents scored 90.2% higher than a single Opus 4 agent on their internal research eval; but that's on research tasks especially suited to parallelism, measured with their own eval.

You have to compute it for your own system. Work through the notes-assistant example by hand (the numbers are illustrative):

- System prompt and tool descriptions: 2,000 tokens for the single agent, 1,500 tokens per sub-agent.
- Each search or page read, together with the model's own call, adds 3,000 tokens to the context.
- Every time the agent calls the model, it resends **the entire current context**, so input tokens snowball. Output tokens are comparatively few and are left out here to keep the math simple.

**Single agent**: 4 searches per city, 12 in total, plus writing the note at the end, for 13 model calls. The k-th call's input is 2,000 + 3,000 × (k − 1), so the last one is about 38,000 tokens. Total = 13 × 2,000 + 3,000 × (0 + 1 + … + 12) = 26,000 + 234,000 = **260,000 tokens**.

**Multi-agent**: each sub-agent focuses on one city and does 8 searches, plus writing its summary, for 9 calls. Each sub-agent = 9 × 1,500 + 3,000 × (0 + 1 + … + 8) = 13,500 + 108,000 = 121,500 tokens, so 364,500 for all three. The orchestrator plans once (input 2,000) and merges once (2,000 + plan 500 + three summaries 3,000 = 5,500), for 7,500. Total **372,000 tokens**.

| | Single agent | Multi-agent |
|---|---|---|
| Searches | 12 | 24 |
| Total input tokens | 260,000 | 372,000 |
| Multiple of single agent | 1× | about 1.43× |
| Cost (assuming $1 per million input tokens) | $0.26 | about $0.37 |
| Sequential model calls | 13 | 11 (plan 1 + parallel 9 + merge 1) |

This table shows three things:

- **Multi-agent is expensive mainly because it does more.** If each sub-agent also searched only 4 times, the total would be just 3 × 37,500 + 7,500 = 120,000 tokens, less than the single agent, because the separate contexts don't pile up on each other. What really inflates cost is searching more once you parallelize.
- **The multiple depends on the design.** Here it's 1.43×, Anthropic's system is about 3.75×, and your core exercise will measure your own number.
- **Parallel can be faster.** There are more total tokens but fewer sequential calls, so wall-clock time may be shorter.

When reporting multi-agent results, always put total tokens (including every sub-agent), cost, latency and quality in the same table (← [cost accounting in S8 Evals Methodology](/en/stages/s08-evals/)).

The orchestrator used 7,500 tokens, but the whole system used 372,000. Include every sub-agent call when calculating usage. First run 1 task per version to reconcile the totals.

<details class="deep">
<summary>Going deeper: why a single agent's input tokens snowball</summary>

- If each step adds c tokens to the context and it starts at s, the total input over n calls is n·s + c·n(n − 1)/2, growing with the square of n. Split the n calls across m independent sub-agents, each making only n/m calls, and the squared term drops to roughly 1/m of the original. That's why splitting the same work can actually cost less.
- The actual bill is also affected by prompt caching: a resent prefix can be billed at a lower price, which makes the snowballing part considerably cheaper (← [Model Crash Course](/en/guide/app-first/#cost-and-latency-basics); deeper: [S5 Inference and Serving](/en/stages/s05-inference/)). Comparing two versions by token count is the most robust; when converting to money, use the same pricing for both.

</details>

### ★ How does multi-agent usually fail?

When reading multi-agent traces, label failures with an existing taxonomy first, so you can see which category happens most and what to fix first.

[Cemri et al. 2025, Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) annotated a large number of runs from 7 multi-agent frameworks and compiled a Multi-Agent System failure Taxonomy (MAST): 14 failure modes in three broad categories:

| Category | Examples | What it looks like in the notes assistant |
|---|---|---|
| **System design issues** | Disobeying task or role specs, repeating steps, not knowing when to stop | The Denver sub-agent researched San Diego too; the orchestrator keeps spawning new sub-agents after the research is done |
| **Inter-agent misalignment** | Withholding information from other agents, ignoring other agents' input, drifting off task, failing to ask for clarification | "Owns a single-family house" didn't make it into the brief; the orchestrator dropped the application deadline from the San Diego summary when merging |
| **Task verification issues** | Ending too early, no verification, incomplete or incorrect verification | The citation-checking step only checks "is there a URL," not whether the page actually supports the claim |

The paper's observation: multi-agent gains on common benchmarks are often small, and many failures stem from system design, not just model capability.

In practice, use MAST as the starting categories for the error analysis from [S8 Evals Methodology](/en/stages/s08-evals/): label traces with these three categories first, then refine into subcategories for your system, count each one, and start fixing the most frequent.

If the final note omits an application deadline, inspect the trace before blaming the orchestrator. The brief may never have asked the sub-agent to find it, making the handoff the source of the omission.

### ★ Is multi-agent worth keeping?

Multi-agent is an assumption that costs money. Whether to keep it depends on two numbers from the same eval: the confidence interval of the quality difference, and the cost multiple.

[S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) covered how to build a trustworthy agent eval. The rules for the comparison:

1. **Before running**, write down the maximum cost multiple you'll accept (multi-agent ÷ single agent), and where you expect multi-agent to win. If you set the cap after the fact, it's easy to rationalize the result.
2. Run both versions on the same tasks, with the same model and the same tools, several times per task.
3. Keep multi-agent only if the 95% confidence interval of the quality difference (multi-agent − single agent) is entirely above 0 **and** the cost multiple is within the cap (confidence intervals ← [S8 Evals Methodology](/en/stages/s08-evals/)).

Two illustrative results for the notes assistant, each with a pre-registered cost cap of 2×:

- Coverage up 7 percentage points, difference interval +2 to +12, cost 1.43× → both conditions pass; keep it.
- Coverage up 3 percentage points, interval −2 to +8, cost 1.43× → the interval contains 0, so there's no evidence it's really better; remove it.

Finding that a single agent is sufficient saves cost and debugging time on future runs. Removing the multi-agent design is a useful, common experimental result.

### ★ How do parallel edits avoid overwriting each other?

When several agents modify the same thing in parallel, the most immediate problem is overwriting each other. The fix is to give each agent its own workspace and have one step handle merging at the end.

For code projects, use `git worktree`: one repo can have several working directories at once, each on its own branch. Each agent edits in its own directory and the results are merged when done, so nobody overwrites anyone else's files. For non-code data, give each agent its own draft area.

A notes-assistant example: two writers edit the same note in parallel, one writing the Austin section and one the Denver section. If they write the same file directly, whoever saves last overwrites the other, and the Austin section disappears. Instead, each writes its own draft, and a merge step assembles them by section at the end.

Isolation is also a security boundary: when one agent is hijacked by prompt injection, the damage is confined to its own workspace (→ [S16 Security and Governance](/en/stages/s16-security/)).

Isolation postpones conflicts until merge time. If two agents edit the same section, you still need to reconcile their changes. Give them different parts to edit when assigning work.

<details class="deep">
<summary>Before you build: basic git worktree operations</summary>

- Create: `git worktree add ../agent-a -b agent-a` opens a new working directory one level up and creates the branch `agent-a`. One per agent.
- Restrict each agent's tools (read file, write file, run command) to its own directory.
- Merge: after an agent finishes, run `git merge agent-a` in the main directory; the merge step (or a person) resolves any conflicts.
- Clean up: `git worktree remove ../agent-a`, then delete the branch.
- Draft-area version: one temporary directory per writer, each writing separate files; the merge step reads all the files, assembles them by section, and checks that every writer's changes appear in the result.

</details>

<section class="deep-section">

### ○ What emerges when agents interact?

The cooperation, competition, persuasion and other behaviors that emerge when many agents interact over time (emergence) are a research topic rather than an engineering one. If you're interested, see the sessions on multi-agent social behavior and Theory of Mind in the [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) course.

</section>

## Exercises

Concepts route (no code): after "Try it first," you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** Work through the lecture's notes-assistant example yourself: if each city's sub-agent searched 6 times (all other assumptions unchanged), what would the multi-agent version's total input tokens be? What multiple of the single agent is that?

<details class="hint">
<summary>Check your answer</summary>

Each sub-agent makes 6 searches plus a summary, 7 calls: 7 × 1,500 + 3,000 × (0 + 1 + … + 6) = 10,500 + 63,000 = 73,500; 220,500 for all three, plus the orchestrator's 7,500, for a total of 228,000 tokens. Against the single agent's 260,000 that's about 0.88×, actually cheaper: the cost increase comes from searching more, not from splitting itself.

</details>

### Core: A single agent vs orchestrator-worker experiment

**Goal**: compare a single agent and an orchestrator-worker setup fairly on the same tasks, and decide whether to use multi-agent based on three numbers: quality, tokens and latency.

**Steps**
1. Use [MultiHop-RAG](https://huggingface.co/datasets/yixuantt/MultiHopRAG) (Tang & Yang 2024; English news from 2023, 609 articles in `corpus.json`, 2,556 questions in `MultiHopRAG.json`, ODC-BY license). With a fixed random seed, pick 10 questions whose `evidence_list` comes from 3 or more different articles; the corpus is all the evidence articles for these 10 questions, topped up at random to 50 articles (for a harder version, use all 609). Among the qualifying questions, the gold answers are heavily concentrated (e.g. many questions share the same person as the answer), so take at most 1 question per distinct `answer`. Each question's checklist of "key points a good answer must include" = the gold `answer` plus the facts you pick from the evidence articles' `fact` fields that are actually needed to answer the question. A `fact` is a sentence extracted from an article, and some are only background: in the question whose answer is Amazon, one of them is a seller's comment about the platform, which you don't need to get the answer right, so it isn't a key point. Fix the checklist before you start grading. Before running anything, write down the maximum cost multiple you'll accept (multi-agent ÷ single agent).
2. Single-agent version: one agent loop (← S12 The Agent Loop and Harness) with two tools, `search` and `read_document`.
3. Orchestrator-worker version: the orchestrator splits the question into 2–4 subquestions; each worker researches in its own context with the same tools and returns a summary under 1,000 tokens; the orchestrator merges them into an answer. Both versions use the same model and the same tools.
4. Run each version 3 times per question. Record total tokens (including every worker), wall-clock time and cost.
5. Score against the key-point checklist (each question's key-point coverage); you can use the judge calibrated in S8 Evals Methodology to decide whether each key point appears.
6. Define a failed run as one with key-point coverage < 100%. Pick 3 failed runs from each version and read their traces (if there are fewer than 3, read them all), and label the multi-agent version's failures with MAST's three categories.

**Acceptance criteria**
- One comparison table: both versions' average key-point coverage (with 95% confidence intervals), average total tokens, average latency and average cost.
- Compute the multi-agent / single-agent token multiple and compare it with the roughly 3.75× derived from Anthropic's numbers above (not directly with the 15× relative to chat), explaining possible reasons for the difference.
- Every multi-agent failed run you read (at most 3; if fewer than 3, all of them) has a MAST category label and a one-sentence explanation; if there were no failures at all, state 0 failures.
- A conclusion: write "keep multi-agent" only if the confidence interval of the coverage difference (multi-agent − single agent) is entirely above 0 **and** the cost multiple is within the cap you wrote down in step 1.

**Hints**
- TypeScript: reuse your agent loop (← S12 The Agent Loop and Harness); run workers in parallel with `Promise.all`, each with its own messages array.
- Python: run workers in parallel with `asyncio.gather`.
- For the search tool, use the retrieval from S9 Retrieval and RAG directly, or grep-style agentic search (← S12 The Agent Loop and Harness).
- Cost: of the 60 runs, the multi-agent half will be noticeably more expensive; on a small cloud model it's usually a few dollars. Run 1 question per version first to confirm the token records include every worker.
- If you get stuck:
  - Reread: [handoffs](#-what-should-a-handoff-carry), [orchestrator-worker](#-who-splits-the-work-and-merges-the-results), [token economics](#-how-much-more-does-multi-agent-cost), [evals first, keep it only if it wins](#-is-multi-agent-worth-keeping)
  - Further: the prompting principles section of Anthropic's "How we built our multi-agent research system"

<section class="deep-section">

### Advanced: System project A15: Multi-agent, kept only with evidence

**Goal**: try out a research → write → review multi-agent flow in your system, compare it with a single agent on the eval set built in A14 Agent Evals and Optimization ([what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)), and keep it only if it wins.

**Steps**
1. Pick (or add) at least 20 tasks suited to splitting from the A14 Agent Evals and Optimization eval set. First write down where you expect multi-agent to win and the maximum cost you'll accept.
2. Implement it with the manager pattern: the manager calls a researcher, a writer and a reviewer as tools. For each handoff, spell out what's passed (which fields, how many tokens, whether untrusted tool output is included).
3. (Optional) Build a handoff version, use an input filter to control what's handed off, and compare it with the manager version.
4. If several writers modify data in parallel, give each writer its own workspace (git worktree or a separate draft area), with one step responsible for merging.
5. Run the single agent and multi-agent on 20 tasks × 3 trials each, reusing the graders from A14 Agent Evals and Optimization.
6. Read the multi-agent failure traces, classify them with MAST, fix the most common failure once, and rerun.

**Acceptance criteria**
- A single vs multi-agent comparison table: quality (with 95% confidence intervals), total tokens, cost and latency; one version each from before and after the fix.
- A failure count table (MAST's three categories and your subcategories).
- Isolation test: have 2 writers modify different sections of the same document in parallel, 10 runs, with 0 changes lost after merging.
- A decision record: keep or remove multi-agent, with reasons citing the numbers above. A conclusion of "remove" is perfectly acceptable and a common result.

For the notes assistant: "Research 'home solar panel incentives' → write a summary note → review whether every claim has a citation." The researcher searches notes and the web in parallel, the writer drafts, and the reviewer checks citations; compare coverage and cost against "one agent doing it all from start to finish."

**Hints**
- TypeScript: hand-write the manager, or use the JS version of the OpenAI Agents SDK to compare with the framework approach; for isolation, use `git worktree` commands or one temporary directory per writer.
- Python: hand-write it, or compare with `Agent.as_tool` and handoffs in `openai-agents`.
- Cost: the multi-agent version may cost several times the single agent; run the 20 × 3 on a small model first, and put the cost cap into the harness budget (← S12 The Agent Loop and Harness).
- If you get stuck:
  - Reread: [the two architectures](#-how-do-multiple-agents-divide-the-work), [the failure taxonomy](#-how-does-multi-agent-usually-fail), [worktree isolation](#-how-do-parallel-edits-avoid-overwriting-each-other)
  - Further: the failure examples in Cemri et al. 2025, learn-claude-code s13

</section>

## Self-check

1. What are the two situations Neubig considers real justifications for multi-agent? Does your system match either one? (Concepts route: answer with the notes assistant.)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: one agent holds information the others shouldn't see, or different agents act on behalf of different people. **Common mistake**: citing "the task has several steps" as a reason. **Reread**: [When is it worth splitting?](#-when-is-it-worth-splitting-into-multiple-agents)

   </details>

2. From the user's point of view, what's the difference between the manager pattern and the handoff pattern? Give a suitable example of each.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: in the manager pattern the user always talks to the same agent (the notes assistant's research task); after a handoff, the receiving agent replies to the user directly (support triage handing off to a refund specialist). **Common mistake**: treating "hand it off and wait for a report" as a handoff. **Reread**: [How do multiple agents divide the work?](#-how-do-multiple-agents-divide-the-work)

   </details>

3. Why is "on BrowseComp, token usage explained about 80% of the variance in scores" both a strength of multi-agent and a warning sign?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: multi-agent can spend more tokens in parallel, so scores go up; but the gain comes mostly from spending more tokens, so cost grows too and must always be reported alongside. **Common mistake**: seeing only the higher score and not the tokens growing with it. **Reread**: [When is it worth splitting?](#-when-is-it-worth-splitting-into-multiple-agents), [How much more does multi-agent cost?](#-how-much-more-does-multi-agent-cost)

   </details>

4. Scenario: the multi-agent version scores 4 percentage points higher on your eval (confidence interval −1 to +9), at 6 times the cost. How would you write the conclusion?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the interval contains 0, so there's no evidence it's really better, and it costs 6 times as much, so remove it. **Common mistake**: seeing the +4 point estimate and writing "multi-agent is better." **Reread**: [Is multi-agent worth keeping?](#-is-multi-agent-worth-keeping)

   </details>

5. Scenario: the reviewer agent keeps saying "looks fine," yet the final note has two claims without citations. Which MAST category is this? How would you fix it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a task verification issue (incomplete or incorrect verification); give the reviewer explicit criteria, such as every claim must match source content, and check with code whatever code can check. **Common mistake**: classifying it as inter-agent misalignment, or just telling the reviewer to "be more careful." **Reread**: [How does multi-agent usually fail?](#-how-does-multi-agent-usually-fail)

   </details>

6. Write a brief for the Austin sub-agent (goal, scope, output format, budget, don'ts), and point out what could go wrong when the orchestrator merges results if the "output format" field were left out.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: all five fields must be specific to Austin; without an output format, the three returns differ in length and structure, may lack sources or paste whole web pages back, so the orchestrator struggles to compare them and its context fills up. **Common mistake**: writing only "Austin" for the scope, with no source restrictions or don'ts. **Reread**: [What should a handoff carry?](#-what-should-a-handoff-carry)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original numbers and details of real systems. None of it is required.

### Original articles and papers

- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) (2025-06-13) — The source of the lecture's token economics and deep research architecture; the full article also covers prompting principles, how they evaluate, and problems they hit in production.
- [Cemri et al. 2025, Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) — The full table of 14 failure modes, with real examples of each.
- [Graham Neubig: Don't Sleep on Single-Agent Systems](https://www.openhands.dev/blog/dont-sleep-on-single-agent-systems) (2024-09-26) — The full case for single agents; a short blog post.
- [Wu et al. 2023, AutoGen](https://arxiv.org/abs/2308.08155) — An early framework for building systems from multi-agent conversations.
- [Anthropic: Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp) (2026-03-06) — You read it in [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/); note one number: rerunning the same 1,266 questions, unintended solutions occurred in about 0.24% of cases with a single agent and about 0.87% with multi-agent, which the article calls about 3.7 times (the two percentages are rounded; dividing them directly gives about 3.6). The authors believe the model's tendencies didn't change; rather, spending more tokens in parallel and searching more raised the chances of running into leaked answers or noticing it was being tested.

### Official docs and guides

- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — The multi-agent section: the original description of the manager and decentralized patterns.
- [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/) — The actual API for handoffs and input filters, and how they differ from agent-as-tool.
- [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) — The multi-agent chapter. Leans toward the Google ecosystem.

### Courses and overviews

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — L8 slides (orchestration patterns, handoffs, A2A, why they fail); L18 (read once the slides are public): how multi-agent tradeoffs play out in real products; for breakdowns of deep research and coding agents, see [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/).
- [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) — Multi-agent social behavior, Theory of Mind (optional).
- A2A and other agent-to-agent protocols: optional in S10 Tools and MCP, revisited in S18 Deployment and Architecture.

### Code along

- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — s13 (agent teams: teammate collaboration, claiming tasks, task-bound worktrees) shows working code for worktree isolation.

</section>
