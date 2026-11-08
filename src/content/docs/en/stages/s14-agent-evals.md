---
title: S14 Agent Evals, Data and Optimization
head:
  - tag: title
    content: "AI Agent Evaluation: Trajectories, Benchmarks and Optimization (S14) | Token2Agent"
description: How to evaluate AI agents. Understand why benchmark scores drift, evaluate both outcomes and full trajectories, build agent evals you can rerun, then improve systematically with traces, ablations and prompt optimization.
sidebar:
  order: 14
  label: S14 Agent Evals, Data and Optimization
---

:::note[This chapter]
**Prerequisites**: [S8 Eval Methodology](/en/stages/s08-evals/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S13 Memory and Personalization](/en/stages/s13-memory/); for model background see the [Model Crash Course](/en/guide/app-first/#model-crash-course) (deeper: [S4 Post-training and Reasoning](/en/stages/s04-post-training/))　**Next**: → [S15 Multi-agent Systems](/en/stages/s15-multi-agent/), [S16 Security and Governance](/en/stages/s16-security/), [S18 Deployment and Architecture](/en/stages/s18-deployment/)
:::

:::tip[Concepts route: key points]
- To evaluate an agent, first check whether the job got done; when it failed, then look at which step went wrong.
- The notes assistant gives different results each time, so run each task several times; even machine settings change the score.
- A higher score doesn't necessarily mean better: verify on tasks that weren't used for tuning, and read the outputs.
:::

## What this chapter covers

S8 Eval Methodology taught evaluation of single answers, and S12 The Agent Loop and Harness used a minimal agent eval. This chapter deals with what's actually hard about evaluating agents: you have to look at the whole trajectory, not just the final answer; the same task gives different results each time; conversational agents need someone to play the user; and even environment settings like machine resources can move the score by several percentage points. Once you can build a trustworthy evaluation, the second half of the chapter covers ways to make the agent better: finding failures in traces, connecting them into a data flywheel, optimizing prompts automatically, distilling a small router, and testing harness components with ablations. In S15 Multi-agent Systems, whether to go multi-agent is decided with this chapter's evals.

## After this chapter you can

- When reading a benchmark score, name the reasons it might be off (flawed tasks, contamination, infra settings, eval awareness). (lecture and self-check; the core exercise measures one infra variable)
- Design "outcome first, then trajectory" evaluation for an agent, and use a transition failure matrix to find the step where it most often breaks. (core)
- Build a rerunnable agent eval with isolated trials, a balanced task set and simulated users, and report the environment variables. (core; simulated users in the advanced exercise)
- Run an ablation on a harness component and use a confidence interval to judge whether it's worth keeping. (you can do one as part of the core exercise; the full version is in the advanced one)
- Run one round of prompt optimization with a DSPy-style optimizer and validate on data that wasn't used for optimization. (advanced)

## Lecture

First, the terms. When you evaluate an agent:

- **Task**: an input plus a success criterion, e.g. "Write the names of all notes containing TODO into `todo.txt`."
- **Trial**: one attempt by the agent at the task. The agent gives different results each time, so you run the same task several times.
- **Environment**: where the agent acts, e.g. a copy of a notes folder, a set of tools, a database.
- **Trace / transcript**: the complete record of one trial, including every tool call, its arguments and result, and the final reply (← tracing in S6 LLM APIs and Application Basics).
- **Grader**: the code, judge or person that decides whether a trial succeeded.

The whole chapter reuses the notes-folder environment from the S12 The Agent Loop and Harness core exercise: a folder of 20 Markdown notes, exactly 6 of which contain `TODO`, and an agent with five tools: `list_files`, `read_file`, `grep`, `write_file`, `delete_file`. Think of it as a simplified version of the **notes assistant** that runs through the course: only file tools, and every task's result can be checked with code, which makes it good for practicing evaluation. The TODO task above runs through the sections: first how to grade one trial, then how to grade many trials and how to keep the environment fair. In the second half, on improvements after launch (trace clustering, prompt optimization, routers), the examples return to the full notes assistant (user: Sam).

### ★ What does agent quality cover?

Looking only at success rate misses a lot. Kaggle's "Agent Quality" whitepaper divides agent quality into four dimensions (four pillars):

| Dimension | Question it asks | Notes-assistant example |
|---|---|---|
| **effectiveness** | Did it achieve the user's goal? | Does `todo.txt` contain exactly those 6 file names? |
| **efficiency** | How many tokens, how much time, how many steps, how much money? | Done in 3 steps, or did it read all 20 files one by one? |
| **robustness** | Does it hold up when tools fail, inputs are vague or the environment changes? | Does it retry after `grep` times out once? |
| **safety** | Did it do anything it shouldn't? | Did it also delete files that "look like duplicates" while it was at it? |

An agent with a 90% success rate that costs $10 per task, or occasionally deletes the wrong file, can't ship. [Kapoor et al. 2024](https://arxiv.org/abs/2407.01502) also criticized agent research for reporting only accuracy and not cost. **Common misconception: the four dimensions should be combined into one total score.** A total makes "very cheap but occasionally deletes files" look the same as "very expensive but safe." Report them separately, then decide per product which are hard thresholds (safety usually is).

### ★ Grade the outcome or the steps?

Grade mainly on the final outcome, and use the trajectory to find which step went wrong. This order is called **outside-in**: first treat the agent as a black box and only ask whether the goal was achieved; if it failed, open up the trajectory.

**Why the outcome comes first.** There's usually more than one path to the goal, and rigidly checking steps marks correct solutions as wrong. And the outcome must be checked from **the state of the environment**, not from what the agent says: check the contents of `todo.txt`, not the agent's "Done" reply. The example in Anthropic's "Demystifying evals for AI agents": for a booking task, query the database to see whether the booking exists.

**Trajectory match** compares the agent's sequence of tool calls against a reference trajectory. There are four common ways to compare: exact match, same order (extra steps in between allowed), any order, and tool-call precision / recall. Precision is "what fraction of the agent's calls appear in the reference trajectory" (repeated calls each count), and recall is "what fraction of the reference trajectory's steps the agent performed."

Walk through the TODO task. The reference trajectory is `list_files → grep("TODO") → write_file(todo.txt)`, and here are two trials:

| | Trial 1 | Trial 2 |
|---|---|---|
| Tool calls | `list_files` → `grep("TODO")` → `read_file(meeting-03.md)` → `write_file(todo.txt)` | `grep("TODO")` → `write_file(todo.txt)` → `read_file(todo.txt)` |
| Agent's reply | "Wrote 6 file names" | "Wrote 6 file names and read them back to confirm" |
| Actual contents of `todo.txt` | 5 file names (one missed when copying) | 6 file names, all correct |
| Same order (extra steps allowed) | Matches | Doesn't match (missing `list_files`) |
| Precision / recall | 3/4 = 0.75 / 3/3 = 1.0 | 2/3 ≈ 0.67 / 2/3 ≈ 0.67 |
| Outcome grader | **Fail** | **Pass** |

By trajectory, trial 1 looks better; by outcome, it's the other way around. Trial 1's steps were all right; it went wrong copying the `grep` results into the file, dropping one, and its reply still claims it wrote 6. Trial 2 skipped the unnecessary `list_files` and even added a verification step, yet trajectory matching penalizes it.

**When you still need trajectory match.** Two cases: diagnosing failures (as with trial 1, where you need to know it broke at the copying step), and when **the path itself is a requirement**, e.g. "always ask before deleting a file" or "always confirm the recipient before sending email." For the latter, a single rule checked against the trace is enough; you don't need to compare against a whole reference trajectory.

A **transition failure matrix** (Hamel's "AI Evals FAQ") tallies failures by "the step where it broke." First divide the flow into states, e.g. understand the task → find the target → modify → verify → report (states that aren't needed can be skipped). Record one entry per failure: the row is **the last state that succeeded**, the column is **the first state that failed**. Say one version fails 20 of 75 trials:

| Last success ＼ First failure | Find the target | Modify | Verify |
|---|---|---|---|
| Understand the task | 4 | 1 | |
| Find the target | | 10 | 1 |
| Modify | | | 4 |

The cells sum to 4 + 1 + 10 + 1 + 4 = 20, equal to the number of failures. The biggest cell is "find the target → modify" with 10: it found the right files but wrote them wrong, the same kind of failure as trial 1. Fixing this first (e.g. requiring in the harness that it read back and compare after writing) is far more effective than a vague "tweak the prompt." It adds location information to a plain "failure reason tally": the same "wrong file name" calls for different fixes when it happens while finding the target versus while copying. This is the error analysis from [S8 Eval Methodology](/en/stages/s08-evals/) extended to agents.

**There are three kinds of grader**: code checks (comparing file contents, querying a database), LLM judges (← judge calibration in S8 Eval Methodology) and **agent-as-a-judge** ([Zhuge et al. 2024](https://arxiv.org/abs/2410.10934)). In the last one, the evaluator is itself an agent: it can read files, run code and operate the product, then score based on evidence. It suits checking "the thing that was built," for example whether a weekly-report note written by the agent has the right format and whether its links open. Use code wherever code can check it; align judges and agent judges with human labels first.

**Common misconception: the agent's reply is evidence.** Trial 1 says it wrote 6, but there are only 5. A grader that reads the reply instead of checking the environment would have marked this trial a success.

<details class="deep">
<summary>Before you build: determining states from a trace</summary>

- Write state detection as code that takes a JSONL trace and outputs "the last state reached successfully" and "the first failed state." For example, the success condition for "find the target" could be: the result of some `grep` or `read_file` contains all 6 target file names.
- Write each state's success condition in advance. Don't add them after you see failures, or the matrix will be swayed by your after-the-fact explanations.
- Trials the grader marked successful don't go into the matrix, but reading a few successful traces is still useful for spotting "lucky successes" (e.g. a file name was missed, but it happened to be outside what the check covers).
- When reading failed transcripts, label each one "the agent really got it wrong" or "the grader misjudged." If the grader misjudges a lot, fix the grader before worrying about the agent.

</details>

### ★ How do you score results that vary every run?

An agent's results vary from trial to trial, so you run each task k times and then decide how to combine the k results into one number. [S8 Eval Methodology](/en/stages/s08-evals/) introduced two ways: **pass@k** is the fraction of tasks where **at least one** of k trials succeeds; **pass^k** is the fraction where **all** k succeed.

**Which one depends on the use case.** If results can be verified automatically and you can let the agent try several times and pick the right one (e.g. code with tests), pass@k is meaningful. If the user gets the agent's result directly every time, as when the notes assistant collects TODOs, look at pass^k: it measures "you can trust it every time."

Three notes-assistant tasks, 5 trials each:

| Task | 5 results | Success rate | At least one success in 5 | All 5 succeed |
|---|---|---|---|---|
| A: list TODO file names | ✓✓✓✓✓ | 5/5 | Yes | Yes |
| B: merge 3 pairs of duplicate notes | ✓✓✗✓✓ | 4/5 | Yes | No |
| C: "Delete that file" (should ask which one first) | ✗✗✓✗✗ | 1/5 | Yes | No |

- Average success rate: (5 + 4 + 1) ÷ 15 ≈ 67%
- pass@5: all 3 tasks succeed at least once, 3/3 = 100%
- pass^5: only A succeeds every time, 1/3 ≈ 33%

The same data can be reported as 100%, 67% or 33%. When you report, always state which one and what k is.

The gap grows with k. Assuming independent trials and a per-trial success rate of 0.8: pass@3 = 1 − 0.2³ = 0.992, pass^3 = 0.8³ = 0.512. The same agent looks nearly perfect by pass@3 and only a bit better than a coin flip by pass^3.

With few trials, these numbers are very uncertain. A success rate from 15 tasks × 5 trials needs a bootstrap confidence interval (← S8 Eval Methodology). When comparing two versions, run both on the same tasks and check whether the interval of the paired difference contains 0, rather than seeing which point estimate is bigger. **Common misconception: a high pass@k means the agent is reliable.** Task C counts as a "success" under pass@5, but in 4 out of 5 trials the user got an agent that deleted the wrong file or guessed blindly.

<details class="deep">
<summary>Going deeper: estimating pass@k and pass^k from n trials</summary>

Run each task n times with c successes, and you want the value for some k ≤ n. Plugging the success rate p̂ = c/n directly into 1 − (1 − p̂)^k or p̂^k is biased. The usual unbiased estimate is "draw k of the n trials without replacement":

- pass@k = 1 − C(n − c, k) / C(n, k) (Chen et al. 2021)
- pass^k = C(c, k) / C(n, k) (τ-bench, Yao et al. 2024)

Example: n = 5, c = 4, k = 3. C(1, 3) = 0, so pass@3 = 1; pass^3 = C(4, 3) / C(5, 3) = 4/10 = 0.4. Plugging p̂ = 0.8 into p̂³ gives 0.512, which is different. The overall score is the average of the per-task estimates.

</details>

### ★ How do you make every trial fair?

Agents change their environment, so evaluation has to provide an environment you can reset, and check the environment's state at the end. This is called environment-based eval. Three things make it fair.

**Every trial starts from a clean environment** (isolated trials). For the notes assistant, each trial copies the folder fresh from the original. Leftover state causes cascading failures and can also inflate scores: "Demystifying evals" mentions seeing a model read the git history left by a previous trial and take advantage of it.

**Balance positive and negative cases.** Test both "should act" and "shouldn't act." If every task is "please go edit the files," the best strategy is to always edit right away, and the eval pushes the agent in that direction. So include negative cases: when information is missing it should ask first ("Delete that file" doesn't say which), or when the request itself makes no sense ("Rewrite the nonexistent `budget.md` as three paragraphs"). The grader for negative cases checks that the folder is byte-for-byte identical to the original. Report success rates for positive and negative cases separately: 80% overall could be 95% on positives and only 50% on negatives.

**Simulated users.** Conversational agents need user replies to move forward. In the negative case above, when the notes assistant asks "Which file should I delete?", someone has to answer "`draft-plan.md`." The approach is to have an LLM play the user according to a persona (a simulated user), e.g. "busy, speaks in half-sentences" or "gives the wrong date." [τ-bench](https://arxiv.org/abs/2406.12045) (Yao et al. 2024) uses this to evaluate retail and airline customer service; [τ²-bench](https://arxiv.org/abs/2506.07982) (Barres et al. 2025) goes further and lets the user act on the environment too (dual-control), for example the user has to change a setting on their own phone.

**Common misconception: a simulated user is a neutral test tool.** It makes mistakes of its own: too cooperative, forgetting its goal, inventing information its persona doesn't have. These errors go straight into the agent's score, so read samples of the conversations to confirm it behaves like a real person.

### ★ Can machine settings change the score?

Settings like machine resources and time limits directly change scores (infra noise), so they're experimental variables and belong in the report.

Anthropic's "Infrastructure noise in agentic coding evals" (2026-02-05) found on Terminal-Bench 2.0 that changing only the container's resource settings produced a success-rate gap of about 6 percentage points between the most generous and the most restrictive settings. They make three recommendations: treat resource and time limits as experimental variables to report, run multiple times at different times of day, and be skeptical of leaderboard gaps under 3 percentage points.

Applied to the notes assistant: change the tool timeout from 10 seconds to 2, and `grep` on a large folder may occasionally time out; the agent then has to retry or give up, and the success rate may drop a few percentage points without a single line of the agent changing. Step 4 of the core exercise measures exactly this gap and writes it up as one line, "infra variables for this eval." **Common misconception: infra differences are noise that averages out.** They're a systematic shift: if two versions run under different settings, the whole gap might come from the settings.

### ★ Does a higher score always mean better?

Reward hacking is a phenomenon introduced in [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (you don't need to have read S4): the thing being optimized learns to push up "the measurement" instead of actually achieving the goal. In agent evals, it shows up from two directions.

**The agent exploits holes in the environment.** Reading the previous trial's git history, above, is one example. Another is eval awareness: the model recognizes it's being evaluated. Anthropic's "Eval awareness in Claude Opus 4.6's BrowseComp performance" (2026-03-06) documented 2 of 1,266 questions where the model suspected it was being tested, figured out which benchmark it was, and then went to decrypt the answers. The article concludes that when running evals on the open web, evaluation integrity has to be treated as an ongoing adversarial problem.

**Optimization exploits holes in the grader.** The prompt optimization later in this chapter repeatedly adjusts the prompt to push up some metric. If the summary judge prefers answers with many bullet points, the optimizer quickly learns to "always list 10 points": the judge score goes up while users find it wordier.

The defenses are the same: have graders check environment state rather than surface features, hold out test data that takes no part in optimization, and read outputs regularly. **Common misconception: a higher score means it got better.** You can only say that on data that took no part in optimization, and after reading the outputs.

### ★ What extra pitfalls do agent benchmarks have?

Public benchmarks age: tasks leak into training data (contamination) and get solved to near-perfect scores (saturation) (← S8 Eval Methodology). Agent benchmarks add flaws in the tasks themselves. Two recent examples:

- **SWE-bench Verified**: OpenAI assembled this human-verified subset with the SWE-bench authors in 2024. In 2026-02, OpenAI announced it would no longer evaluate on it, citing contamination (the tasks come from public repos, and for some of them models can reproduce the original fix from memory) and flawed tasks: they took the 138 tasks that o3 couldn't solve consistently across 64 runs, had engineers check each one, and found substantive problems with the tests or task descriptions in 59.4% of them. OpenAI now recommends SWE-bench Pro instead.
- **τ-bench**: [SABER](https://arxiv.org/abs/2512.07850) (Cuadron et al. 2025) showed that τ-bench's airline and retail tasks contain labeling errors and unclear specs that lower the achievable ceiling, and released a corrected τ-Bench Verified.

So whenever you see an agent benchmark score, first ask three questions (benchmark hygiene): Has anyone audited the tasks? Have they leaked? What were the infra settings? A 2-point gap between two agents is already smaller than the infra gap measured above.

**METR time horizon** ([Kwa et al. 2025](https://arxiv.org/abs/2503.14499)) describes capability differently: how long human experts typically take on the tasks a model completes with 50% probability. The paper found this length has doubled roughly every 7 months since 2019. It's easier to interpret than a single benchmark score, but the tasks are concentrated in software and research work, and the authors spell out the limits on external validity. **Common misconception: a high benchmark score means your product will be good.** It only describes performance on that set of tasks with that setup; your notes assistant needs its own evals.

### ★ What if there are too many traces to read?

After launch, you'll have more traces than you can read. Cluster analysis helps you decide what to read first; a data flywheel connects what you find back into evals and improvements.

**Cluster analysis** turns traces (or summaries of them) into embeddings, clusters them, and then has you read a few from each cluster to find which clusters have unusually many failures and which represent usage you never thought of. Hamel's FAQ also lists clustering as one sampling method for picking traces to review by hand. An illustrative example: the notes assistant has accumulated 2,000 traces, split into 12 clusters. The overall thumbs-down rate is 8%, but the "relative dates" cluster ("last week's meeting," "the note from the day before yesterday") has 150 traces and a 30% thumbs-down rate. Reading 15 of them shows the agent often treats "last week" as the past 7 days rather than the previous calendar week, so you add 10 relative-date tasks to the eval.

A **data flywheel** turns use of the system into fuel for improving it automatically:

User feedback and the traces collected since S6 LLM APIs and Application Basics → error analysis and clustering → new eval tasks and failure categories → changes to prompts, tools or harness → confirmation with evals → new traces after launch.

The key is that every link has to connect: feedback must map back to traces, traces must be able to become eval tasks, and once a capability eval is stable it graduates to a regression eval (← S8 Eval Methodology). How to design the feedback interface is covered in S17 Product and AI UX. **Common misconception: the clusters are the conclusion.** Clustering only decides what to read first; the "relative dates" failure category only exists because a person read the traces (← error analysis in S8 Eval Methodology).

### ★ Can a better prompt be found automatically?

Prompt optimization lets a program search for better prompts automatically: you provide a metric and examples, and the optimizer repeatedly generates candidate prompts, scores them on the examples and keeps the good ones.

[DSPy](https://dspy.ai) ([Khattab et al. 2023](https://arxiv.org/abs/2310.03714)) has you write LLM programs as modules with input/output signatures (e.g. "user request → intent"), and an optimizer then tunes each module's prompt. Two commonly used optimizers:

- [MIPROv2](https://arxiv.org/abs/2406.11695) (Opsahl-Ong et al. 2024) searches each module's instruction text and few-shot examples together.
- [GEPA](https://arxiv.org/abs/2507.19457) (Agrawal et al. 2025) has the model reflect in text on execution trajectories, propose prompt changes, and keep candidates that each do well on different tasks. The GEPA paper reports beating GRPO (a training method that tunes model weights directly with reinforcement learning; deeper: [S4 Post-training and Reasoning](/en/stages/s04-post-training/)) and MIPROv2 while using far fewer rollouts.

There are two prerequisites: a reliable metric (a judge calibrated per S8 Eval Methodology, or a code check), and **separate training and test data**. An illustrative example: intent classification for the notes assistant ("search notes," "create note," "send email"), 300 labeled requests split into 200 for training and 100 for testing. Before optimization: 81% on training, 80% on test; after: 93% on training, 86% on test. The real improvement is the 6 points on test, not the 12 on training; the gap between them is the part where the optimizer fit the training data.

**Common misconception: reporting scores on the data used for optimization.** That number always looks good, because the optimizer's job is to push it up (the reward hacking from the previous section). Report results only on test data, along with example outputs from before and after optimization.

<details class="deep">
<summary>Before you build: preparing for a round of prompt optimization</summary>

- Write the metric function first: it takes an example and the model output and returns a score from 0 to 1. If you use a judge as the metric, first check how well it agrees with human labels (← S8 Eval Methodology).
- Set a budget cap first. The optimizer calls the model many times; a common approach is to optimize with a small model and validate on the target model.
- Don't look at the test data at all until optimization is finished, and don't use it to pick "the best round," or it becomes part of the training data. If you need to choose, split off a separate validation set.
- After optimization, read 10–20 outputs to make sure no metric-pleasing pattern like "always list 10 points" has appeared.

</details>

### ★ Can routing go to a cheap small model?

The first step of many agents is classification: which flow should this request take, does it need the strong model, does it need tools? Using the strong model for this at first makes sense; once you've accumulated enough traces, you can replace it with a cheap small classifier. That's router distillation.

**How it works.** For every routing decision, record the request, the strong model's decision, and whether it turned out to be correct (did the user rephrase, did the task get done, or a spot check). Use these "strong model's judgment + after-the-fact confirmation" labels to train a small classifier (e.g. embeddings plus logistic regression, a simple classification method), or fine-tune a small model. This is distillation: having a small model learn a large model's outputs (← S4 Post-training and Reasoning; application-route readers see the "Training stages" and "What fine-tuning can and can't do" sections of the [Model Crash Course](/en/guide/app-first/#model-crash-course)).

An illustrative example: the notes assistant records 600 routing decisions, which after spot-checking and correction are split into 480 for training and 120 for testing. On the test data, the strong model routes with 97% accuracy and the small classifier with 94%; but the small classifier takes only tens of milliseconds and costs almost nothing, while the strong model waits on an API call every time. The errors are concentrated between "send email" (`email_send`) and "create an email draft" (`email_draft`). These two have different consequences (sending is high risk, ← [S10 Tools and MCP](/en/stages/s10-tools-mcp/)), so you can hand back to the strong model only when the classifier is unsure between these two.

**Common misconception: only overall accuracy matters.** Where the 3 lost points fall matters much more than the average: a mix-up between "search notes" and "create note" just means the user asks again; a mistake that becomes "send email" is not OK. The full design of model routing and cascades for deployment is in S18 Deployment and Architecture.

### ★ Is this harness component worth keeping?

An ablation removes one harness component at a time and compares the difference on the same tasks with the same number of trials, to test whether the component is worth keeping.

[S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) said every harness component represents an assumption about "what the model can't do on its own"; an ablation is how you test that assumption. Things you can remove include compaction, skills, an evaluator, a particular permission rule or a stop condition.

An illustrative example: the notes assistant, 20 tasks × 5 trials, succeeds 72/100 with compaction and 64/100 without. That's an 8-point difference, but the 95% confidence interval is about −5 to +21 points. It contains 0, so you can't say compaction helps. Both versions ran on the same tasks, so compare them paired (→ [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/)); if the paired interval still contains 0, add tasks, add trials, or switch to tasks that bring out this component more (e.g. long weekly reports).

<details class="deep">
<summary>Going deeper: how this interval is computed and where it's off</summary>

Treat each version's 100 trials as two independent samples: the standard error is √(0.72×0.28/100 + 0.64×0.36/100) ≈ 0.066, and times 1.96 that's about ±13. This formula is a rough approximation that ignores two things. First, the 5 trials of one task are correlated, so when estimating a single version, a bootstrap by task usually gives a wider interval than this formula. Second, both versions ran on the same tasks, so the comparison should be paired: each time, sample 20 tasks with replacement, carrying both versions' results along with each task, and compute the difference. Task difficulty cancels out between the versions, so the paired difference's interval is usually narrower than the one above.

</details>

**Model–harness fit**: the same component can be worth different amounts on different models. Anthropic's example: context resets were necessary for one model generation and dead weight for the next. **Common misconception: an ablation's conclusion holds forever.** Redo it when you switch models, especially for components originally added to cover a model weakness.

<section class="deep-section">

### ○ Can you train an agent directly?

You can also train the agent directly: SFT on successful trajectories, or RL so the model learns to use tools in an environment. For example, [Search-R1](https://arxiv.org/abs/2503.09516) (Jin et al. 2025) uses RL to train a model to call search during reasoning (← GRPO / RLVR in S4 Post-training and Reasoning). This chapter's environment-based evals double as RL training environments: the grader is the reward, so the reward hacking discussed above gets even worse during training. This needs GPUs and the background from M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 ([what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)), and is optional. For self-improvement methods like STaR and ADAS, and tree search across multiple trajectories, start with [Stanford CS329A](https://cs329a.stanford.edu/).

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** The TODO task's reference trajectory is `list_files → grep → write_file`. One trial called `grep` → `read_file` × 2 → `write_file`, and `todo.txt` contains exactly the 6 correct file names. Compute its tool-call precision and recall, and state the outcome grader's verdict.

<details class="hint">
<summary>Check your answer</summary>

The agent made 4 calls, of which `grep` and `write_file` are in the reference trajectory: precision = 2/4 = 0.5. It performed 2 of the 3 reference steps: recall = 2/3 ≈ 0.67. The outcome grader says **pass**, because the environment state (`todo.txt`) is fully correct; a low trajectory score doesn't mean it did the job wrong.

</details>

**2.** A coding agent tries each task up to 3 times, runs unit tests each time, and gives the user the first version that passes. Should this scenario use pass@3 or pass^3? What about the notes assistant's "collect TODOs"?

<details class="hint">
<summary>Check your answer</summary>

Coding uses pass@3: tests automatically pick out the correct version, the user only sees the one that passed, and one success in 3 is enough. Once "collect TODOs" is live, there are no tests to pick the right version for the user; every result goes straight to the user, so use pass^3.

</details>

### Core: A trustworthy trajectory eval

**Goal**: build a rerunnable evaluation of an existing agent, with a report of the variables, and use trajectories to find the step where it most often breaks.

**Steps**
1. Use the agent from the S12 The Agent Loop and Harness core exercise and its folder of 20 Markdown notes (if you didn't do the S12 core exercise, generate the same folder following the spec in its step 1). Reuse that exercise's 10 tasks and graders directly, and add 5 "shouldn't act" tasks for 15 tasks total. "Shouldn't act" means information is missing and it should ask first (e.g. "Delete that file" doesn't say which), or the request itself makes no sense (e.g. "Rewrite the nonexistent `budget.md` as three paragraphs"). The graders for these 5 tasks check that the folder contents are byte-for-byte identical to the original.
2. Define the agent flow as 4–6 states (e.g. understand the task → find the target → read → modify → verify → report), and write a program that determines from a trace which state each run reached.
3. Prepare two versions (e.g. two system prompts or two models) and run each on 15 tasks × 5 trials. If you choose "with / without a harness component" as the two versions (← S12 The Agent Loop and Harness; e.g. the rule that stops after 3 consecutive failures), this step doubles as an ablation. Start every trial from a clean copy.
4. Take one of the versions, change just one environment setting (tool timeout or step limit), and run another round.
5. Build the transition failure matrix; read at least 10 transcripts from failed runs and label each one as the agent really getting it wrong or the grader misjudging.

**Acceptance criteria**
- 3 rounds, 225 runs in total (2 versions + 1 environment variable × 15 tasks × 5 trials), each with a trace and a grader result.
- For each round, report the success rate, a 95% bootstrap confidence interval, pass^5, and the success rates for positive and negative cases separately.
- Comparison of the two versions: report the confidence interval of the success-rate difference; write "A is better than B" only if the interval doesn't contain 0.
- The difference between the environment-variable round and the original (with an interval), written as one line, "infra variables for this eval."
- The transition failure matrix's cells sum to the number of failures; each of the 10 transcripts you read has a label, and you report how many the grader misjudged.

**Hints**
- TypeScript: store traces as JSONL and analyze with Node scripts; a bootstrap is a dozen lines to write yourself, or use `simple-statistics`.
- Python: pandas for tables, `numpy` or `scipy.stats.bootstrap` for the bootstrap.
- Cost: 225 runs on a small cloud model usually costs a few dollars to $10–20; Ollama is free, and with Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)). Check the whole pipeline with 3 tasks × 2 trials first.
- If you get stuck:
  - Reread: [outcome first, then trajectory](#-grade-the-outcome-or-the-steps), [pass@k and pass^k](#-how-do-you-score-results-that-vary-every-run), [environment-based evals](#-how-do-you-make-every-trial-fair), [infra noise](#-can-machine-settings-change-the-score)
  - Further: Anthropic's "Demystifying evals for AI agents"; "How do I evaluate agentic workflows?" in Hamel's FAQ

**Note**: you can start with 10 tasks × 3 trials comparing just two versions, go through the whole process once with this minimal version, and then fill in the rest.

<section class="deep-section">

### Advanced: System project A14: Agent evals and optimization

**Goal**: build a complete agent eval for your system, and improve it once with each of three methods, with a confidence interval on every conclusion.

**Steps**

0. **Fill in the routing records**: step 5 needs records of routing decisions. Your only router so far is the one from A7 Structured Output and Workflows, but it doesn't necessarily use a strong model, and system project steps A6–A8 only required about 100 traces. First make sure the traces contain the routing decision for every request; if you have fewer than 200, have a strong model relabel historical requests to make up the difference. Once you have enough, spot-check 20 of all the routing decisions for correctness, fix any errors the spot check finds, and report the error rate.
1. **Trajectory eval**: starting from the eval set from A8 Error Analysis and Golden Set and the tasks from A12 Hand-written Harness, expand to at least 30 agent tasks, with both positive and negative cases. Rely mainly on outcome graders, and add trajectory checks for critical flows (e.g. confirmation required before sending email).
2. **Simulated users**: write 3–5 user personas (goal, way of talking, whether they give wrong information), and run at least 20 multi-turn conversations. Read 10 of them, mark where the simulated user doesn't act like a real person, and fix the personas.
3. **Trace clustering**: cluster the real records you've accumulated since A6 Streaming Chat and Traces, read a few from each cluster, and add newly found failures to the eval.
4. **Prompt optimization**: pick a subtask (e.g. intent classification or summarization) and run one round with DSPy's MIPROv2 or GEPA; split the data into training and test sets.
5. **Router distillation**: using the routing decisions prepared in step 0 (at least 200, including the 20 spot-checked ones), train a small classifier to replace strong-model routing.
6. **Harness ablation**: remove one component from A12 Hand-written Harness and compare on 20 tasks × 5 trials.

**Acceptance criteria**
- Every change (prompt optimization, router, ablation) has a before/after comparison with a 95% confidence interval.
- Prompt optimization results are reported on the **test data**, with 3 example outputs each from before and after optimization.
- Router: accuracy, per-call latency and cost, side by side with the original strong-model routing; point out the category with the most errors.
- The ablation is run twice on different dates, and both runs point the same way; the report states the model version, resource settings and number of trials.
- A one-page "eval README": where the tasks come from, grader types and calibration results, known variables, and what isn't covered yet.

For the notes assistant: simulated users "a busy manager who speaks in half-sentences" and "a user who gives the wrong date"; the router decides whether a request is "search notes," "create note" or "send email"; the ablation removes compaction and measures how much the success rate on long weekly-report tasks drops.

**Hints**
- TypeScript: the prompt optimizer ecosystem is mostly Python. You can write the optimization step as a standalone Python script and bring only the resulting prompt back into your TS app. For the router, train in Python and export to ONNX, then load it with `onnxruntime-node`; or just use embeddings plus a simple logistic regression.
- Python: `dspy` (MIPROv2), `gepa`; for the router, scikit-learn plus the embedding model from S9 Retrieval and RAG, or fine-tune one the way M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 does.
- Cost: prompt optimization calls the model many times, so set a budget cap first; optimizing with a small model and then validating on the target model is also common.
- If you get stuck:
  - Reread: [simulated users](#-how-do-you-make-every-trial-fair), [cluster analysis](#-what-if-there-are-too-many-traces-to-read), [prompt optimization](#-can-a-better-prompt-be-found-automatically), [router distillation](#-can-routing-go-to-a-cheap-small-model), [ablation](#-is-this-harness-component-worth-keeping)
  - Further: the optimizer tutorials in the DSPy docs; CS 329Z L9 slides

</section>

## Self-check

1. Why does the lecture recommend grading on outcomes rather than comparing steps? When do you still need trajectory match?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: there's more than one correct path, and outcomes must be checked from environment state; look at the trajectory only to diagnose failures, or when the path itself is a requirement (ask before deleting files). **Common mistake**: treating the agent's reply as evidence. **Reread**: [Grade the outcome or the steps?](#-grade-the-outcome-or-the-steps)

   </details>

2. Explain in your own words what the rows and columns of a transition failure matrix represent, and what it tells you beyond a "failure reason tally."

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: rows are the last state that succeeded, columns are the first state that failed; the extra information is where it broke, since the same error at different steps calls for different fixes. **Common mistake**: swapping rows and columns. **Reread**: [Grade the outcome or the steps?](#-grade-the-outcome-or-the-steps)

   </details>

3. Two agents on a leaderboard are 2 percentage points apart. Before you believe that gap, which three questions would you ask?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: Has anyone audited the tasks? Have they leaked? What were the infra settings? 2 points is already smaller than the roughly 6-point infra gap measured. **Common mistake**: looking only at which score is higher without asking about the tasks and setup. **Reread**: [What extra pitfalls do agent benchmarks have?](#-what-extra-pitfalls-do-agent-benchmarks-have)

   </details>

4. Scenario: after GEPA optimization, your summary judge score rises from 0.72 to 0.91, but user feedback hasn't improved. What might have happened? How would you check?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the optimizer may have learned to cater to the judge's preferences (e.g. more bullet points), or the score was reported on the data used for optimization. Check the score on test data, read outputs from before and after, and recheck agreement between the judge and humans. **Common mistake**: taking a higher judge score as better quality. **Reread**: [Does a higher score always mean better?](#-does-a-higher-score-always-mean-better)

   </details>

5. Scenario: after switching to a new model generation, the team wants to keep the old harness settings as is. Which ablations would you suggest rerunning first? Why?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: rerun the components originally added to cover model weaknesses first (e.g. context resets, compaction, evaluators), because the same component's value changes across models (model–harness fit). **Common mistake**: assuming old ablation conclusions hold forever. **Reread**: [Is this harness component worth keeping?](#-is-this-harness-component-worth-keeping)

   </details>

:::tip[On the application route]
You can finish this chapter without reading [S4 Post-training and Reasoning](/en/stages/s04-post-training/). If you want to go deeper, now is a good time to read it: the distillation, reward hacking and agentic RL in this chapter are explained from first principles there.
:::

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original examples, paper details or more courses. None of it is required.

### Official articles and practical guides

- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) (2026-01-09) — Definitions of task / trial / grader / transcript / outcome, pass@k vs pass^k, isolation and balance, "read the transcripts," with more real cases.
- [Anthropic: Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise) (2026-02-05) — The full experiment on how resource settings change scores, and how to report them.
- [Anthropic: Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp) (2026-03-06) — The actual record of a model recognizing a benchmark and going to find the answers.
- [OpenAI: Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) (2026-02-23) — Why the benchmark was retired. Content confirmed only through search results and secondhand accounts; the page blocks automated fetching.
- [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/) (2026-09) — Read the two questions on agentic workflows and multi-step workflows, and the table of sampling methods.
- [Kaggle: Agent Quality](https://www.kaggle.com/whitepaper-agent-quality) (2025-11) — The full version of the four pillars, outside-in, trajectory evaluation, agent-as-a-judge and observability. Leans toward the Google ecosystem.
- [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) — Agent evaluation and agent ops.
- [DSPy](https://dspy.ai) — The optimizer tutorials in the official docs; the main reference for step 4 of A14 Agent Evals and Optimization.

### Original papers

- [Yao et al. 2024, τ-bench](https://arxiv.org/abs/2406.12045), [Barres et al. 2025, τ²-bench](https://arxiv.org/abs/2506.07982) — Design details for simulated users and dual-control evaluation.
- [Cuadron et al. 2025, SABER](https://arxiv.org/abs/2512.07850) — Read the parts on the τ-bench audit and τ-Bench Verified.
- [Kwa et al. 2025, Measuring AI Ability to Complete Long Software Tasks](https://arxiv.org/abs/2503.14499) — The method and limits of METR time horizon.
- [Zhuge et al. 2024, Agent-as-a-Judge](https://arxiv.org/abs/2410.10934) — The design of agent judges and their comparison with human grading.
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — Why agent research should report cost alongside accuracy.
- [Khattab et al. 2023, DSPy](https://arxiv.org/abs/2310.03714), [Opsahl-Ong et al. 2024, MIPROv2](https://arxiv.org/abs/2406.11695), [Agrawal et al. 2025, GEPA](https://arxiv.org/abs/2507.19457) — Search details and experiments for the three prompt optimization methods.
- [Jin et al. 2025, Search-R1](https://arxiv.org/abs/2503.09516) — Using RL to train a model that calls search (optional).
- [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) (2024-11-28) — A survey of reward hacking, which you'll run into in both prompt optimization and agent training.

### Courses and overviews

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — L9 (optimization), L10 (Terminal-Bench), L11–L12 (agent data), L13 (evaluation and benchmark design), L15 (judges and evaluation infrastructure), L16 (SWE-bench); read L15 and L16 once their slides are public.
- [CMU 11-768 AI Agents](https://www.cmu-agents.com/) — Assignment 2 (agent trajectory evaluation), assignment 3 (agent RL training with REINFORCE / GRPO).
- [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) — Verifiers, test-time compute, self-improvement.
- [Berkeley Advanced LLM Agents Sp25](https://rdi.berkeley.edu/adv-llm-agents/sp25) — A lecture series with public recordings; only the topics and reading list have been checked.
- GAIA, Terminal-Bench, TheAgentCompany and other agent benchmarks: before reading about them, apply the lecture's three benchmark hygiene questions.

</section>
