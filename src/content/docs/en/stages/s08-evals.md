---
title: S8 Evals Methodology
head:
  - tag: title
    content: How to Evaluate LLMs? Evals and LLM Judges (S8) | Token2Agent
description: How to make LLM evaluation trustworthy. Do error analysis on real traces, write binary grading criteria, calibrate an LLM judge against human labels, and put a confidence interval on every metric to tell whether your system really got better.
sidebar:
  order: 8
  label: S8 Evals Methodology
---

:::note[This chapter]
**Prerequisites**: [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) (the advanced exercise needs the traces collected in A6 Streaming Chat and Traces and A7 Structured Output and Workflows; [how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)); for background on logprobs see the [Model Crash Course](/en/guide/app-first/#logits-and-softmax) (deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/))

**Next**: → [S9 Retrieval and RAG](/en/stages/s09-rag/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (agent evals)
:::

:::tip[Concepts route: key points]
- First read the notes assistant's real records one by one, sort the failures into categories and count them, then decide what to measure.
- Use one pass-or-fail check per kind of failure. Before letting a model do the grading, compare it against human judgment.
- Scores wobble depending on which test cases you happen to have. A gap between two versions only counts as real if it's bigger than that wobble.
:::

## What this chapter covers

How do you check whether a prompt change, a new model or retrieval improves the system? A few memorable examples can distort your judgment. This chapter builds a repeatable eval process: read real traces, group failures, design graders, check that model graders agree with people, and use error margins to assess the difference.

Evals come before RAG and tools because every change in the later chapters needs them to tell whether it was worth it.

## After this chapter you can

- Compute TPR and TNR from a "human vs. judge" table, and work out a 95% confidence interval for a pass rate by hand. (lecture and self-check)
- Explain the difference between pass@k and pass^k, and why a benchmark score doesn't represent your product. (lecture and self-check)
- Do error analysis on real traces and come up with a failure taxonomy with counts. (core uses 60 outputs; advanced uses 100 real traces)
- Choose a suitable grading method for each kind of failure and write binary (pass / fail) grading criteria. (core)
- Calibrate an LLM judge with human labels and report TPR and TNR. (core)
- Attach a 95% confidence interval to every metric (core), and use a paired comparison to decide whether the difference between two versions is noise (advanced).

## Lecture

The big picture first. An eval is a loop:

1. **Read traces and find the kinds of failure** (error analysis): how the system actually fails, and how often each way.
2. **Build a golden set**: pick a batch of cases from the traces and write down the expected behavior for each.
3. **Choose a grader for each kind of failure**: code, a model or a human, each judging pass / fail.
4. **Compute scores with error margins**: a score is estimated from a limited number of cases, so you need to know how much it wobbles.
5. **Change the system and rerun on the same cases**, using a paired comparison to decide whether it really got better.

Sam asks the **notes assistant**, "What did we decide at the last design team meeting?" It reads the notes and answers. After making its output stable and parseable in [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), you now need to measure answer quality and the effect of changes.

### ★ How does the system actually fail?

Before designing any metric, read real traces one by one and sort the failures into categories with counts. Error analysis is where evals start, not something you add afterward.

An average helpfulness rating of 3.6 on a 1–5 scale tells you little about what to fix. Error analysis might instead show that 40% of failures involve miscalculated dates, a specific problem you can check in code and correct.

**How to do it.** The method is borrowed from qualitative research and has two steps:

- **Open coding**: read each trace (the user's question, which notes the assistant read, the final answer) and write one sentence in your own words about "what's wrong here." Record only the **first** thing that went wrong in each trace, because later errors are often knock-on effects of earlier ones; don't categorize yet.
- **Axial coding**: after reading a batch, group these notes into a few failure categories and count how many traces fall in each.

Keep reading new traces until no new categories appear; this state is called **theoretical saturation**. Hamel Husain recommends starting with about 100 traces and having one person with domain knowledge make the calls, so the standard doesn't drift.

**Example.** Reading 100 notes-assistant traces, the open coding notes look like this: "Said the meeting was on Thursday; the note says Wednesday", "The note doesn't mention a budget; the assistant made up a number", "The user wanted to add a note, but the assistant answered it as a question". After grouping:

| Failure category | Count | Can code check it? |
|---|---|---|
| Answer not grounded in the notes; made up | 14 | No, needs a judge or a human |
| Got a note's date wrong | 9 | Partly (compare date strings) |
| Answered an add-note request as a question | 5 | Yes (check the routing result) |
| Tag not in the vocabulary | 3 | Yes |
| No failure | 69 | — |

This table directly decides what comes next: "made up" is the biggest, so build a grader for it first.

After a major system change, read another batch of traces and update the failure categories. New users and system behavior can introduce new failure types.

<details class="deep">
<summary>Before you build: record format and rhythm</summary>

- **Columns**: a spreadsheet is enough. One row per trace: trace ID, user input, output (or a link to the trace view), open coding note, category (filled in only after axial coding).
- **Notes first, categories later**: starting with preset categories (such as "hallucination", "format error") makes you see only the problems you expected. Let categories grow out of the notes, and name them specifically enough that you know how to fix them from the name.
- **One person leads**: when several people label together, each has a different threshold for "does this count as wrong." Having one person with domain knowledge set the standard while others raise questions works better than voting.
- **Judging saturation**: read a new batch of traces; if every one fits an existing category and no new category appears, you can stop for now.
- **Tools**: Langfuse and Phoenix can both add annotations to traces; building a small page yourself for "look at one at a time, label fast with the keyboard" is often quicker.

</details>

### ★ Where do the test cases come from?

A golden set is a fixed set of cases, each with its expected behavior, that you rerun every time you change the system. It's your product's own benchmark.

**Why they should come from traces.** Cases you dream up yourself skew toward situations you can think of, which are usually the ones you've already handled. Picking cases from the traces in your error analysis keeps their distribution close to real usage and guarantees the failures are covered.

**How to build it.** Record three things for each case: the input (the user's question, plus the state of the notes at the time), the expected behavior, and the source trace ID. The expected behavior isn't necessarily a reference answer; often it's a few checkable conditions. One notes-assistant case might be:

- Input: "What did we decide at the last design team meeting?" (with the notes frozen at a particular version)
- Expected behavior: mentions "the Q4 redesign budget is capped at $48,000" and "Sam owns tracking it"; cites the note "2026-10-14 Design team meeting"; contains no numbers that aren't in the notes.
- Source: trace ID `t-0412`

**Collect successes as well as failures.** If you only collect failures, you'll only know whether you fixed them, not whether you broke something that used to work.

A golden set with 50 clear expected behaviors is more useful than 500 vague reference answers. Case count determines the error margin, as the statistics section explains. Case quality determines whether you measure the intended behavior.

### ★ Who decides pass or fail, and how?

A grader decides whether each case passes or fails. Use code wherever code can decide; hand a model only criteria that are subjective but clearly describable; use humans to set the standard and check the model.

**Three kinds of grader.**

- **Code**: schema checks, regular expressions (a way of describing the shape of a string), comparing execution results. Cheap, fast, the same result every time; use it first whenever you can. Examples: "every tag is one of the 5 in the vocabulary" (the vocabulary is in [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)), "the cited note ID actually exists".
- **Model**: LLM-as-judge, suited to criteria that are subjective but describable, such as "is the answer grounded in the notes" or "is the tone appropriate".
- **Human**: the most accurate but the most expensive; used to create reference labels and to calibrate model graders.

**Binary criteria beat Likert scales.** A Likert scale is a graded rating like 1 (very bad) to 5 (very good). Make grading criteria binary pass / fail wherever you can: binary criteria force you to spell out what "good" means, annotators agree with each other more, and the results tell you directly what to fix. Whether something is a 3 or a 4 often comes out differently with a different person.

**One failure, one check.** Each failure category gets a **unit assertion** (like a unit test, one check verifies one thing) or a dedicated judge, not a catch-all "overall quality" score. The notes-assistant example:

| Failure category | Grader | Pass condition |
|---|---|---|
| Tag not in the vocabulary | Code | Every tag is in the vocabulary |
| Treated an add-note request as a question | Code | The routing result matches the hand-labeled route |
| Got a date wrong | Code + judge | Every date in the answer appears in the cited notes |
| Made up | Judge | Every fact in the answer can be found in the cited notes |

Report each failure category's pass rate separately. A single total can hide which behaviors need fixing.

<details class="deep">
<summary>Before you build: writing a binary judge prompt</summary>

- **Judge only one thing**: spell out in the prompt which failure category this judge looks at, for example "can every fact in the answer be found in the notes provided."
- **Define pass and fail, with borderline examples**: pick a few real pass and fail cases from your error analysis notes and put them in the prompt, especially the borderline ones that are easy to misjudge.
- **Reason first, then verdict**: output `{reason, pass}` with the reason first, so the model checks before it concludes; the reason also helps you see why when the judge gets it wrong. Fix the format with structured output (← S7 Prompts, Structured Output and Workflows).
- **Give the judge enough data**: to judge "is it grounded in the notes", give the judge the notes the assistant read at the time; otherwise it can only guess from general knowledge.

</details>

### ★ Can you trust a model grader?

A model grader (LLM-as-judge) is convenient, but it's also a system that makes mistakes. Validate it against human labels before you trust its scores.

**Known biases.** Zheng et al. 2023 describe three: **position bias** (preferring an answer in a particular position when comparing two), **verbosity bias** (preferring longer answers) and **self-enhancement bias** (preferring answers it generated itself). When comparing two answers, judge them twice with the order swapped; only count it if both verdicts agree, otherwise record a tie or send it to a human.

**Check the judge like a classifier.** Take a batch of data hand-labeled pass / fail, treat pass as the class to catch, and compute two numbers:

- **TPR** (true positive rate): of the cases a human labeled pass, the fraction the judge also labeled pass.
- **TNR** (true negative rate): of the cases a human labeled fail, the fraction the judge also labeled fail.

**Example.** The "made up" judge on 30 hand-labeled cases: of the 20 a human labeled pass, the judge got 18 right; of the 10 a human labeled fail, the judge got 7 right.

| | Judge: pass | Judge: fail |
|---|---|---|
| Human: pass (20) | 18 | 2 |
| Human: fail (10) | 3 | 7 |

TPR = 18 ÷ 20 = 0.9, TNR = 7 ÷ 10 = 0.7. Overall accuracy is 25 ÷ 30 ≈ 83%, which looks fine, but a TNR of 0.7 means that out of every 10 answers that really are made up, the judge lets 3 through, and catching made-up answers is the whole reason this judge exists.

**Why not look at overall accuracy.** It misleads when the data is imbalanced: if 90% of answers pass, a judge that always says "pass" also has 90% accuracy, with a TNR of 0.

**Keep dev and test separate.** Tune the judge prompt while looking at only one set of data (dev); when you're done, compute TPR and TNR on a different set it has never seen (test) and report those. If you tune until you're happy on the same data and then report on it, the numbers will be inflated, because the prompt has "memorized" that batch's quirks.

Shankar et al. 2024 describe **criteria drift**: your definition of a good answer can change as you grade. After 30 answers, for example, you may decide that citing the right note but missing its main conclusion should count as a failure. Write down the criteria, revise them as needed, and relabel affected cases.

<details class="deep">
<summary>Before you build: too few fails, and the error in TPR / TNR</summary>

- **Too few fails**: when the system does well, maybe only 2–3 of 30 cases fail, and TNR can't be measured meaningfully. You can generate an extra batch of outputs with a smaller model or a deliberately weakened prompt just to get enough fail samples for calibrating the judge; these outputs don't count toward the system's own pass rate.
- **TPR / TNR need intervals too**: they're also proportions estimated from a limited sample. With only 10 fails, the 95% confidence interval for TNR = 0.8 is about ±25 percentage points (√(0.8 × 0.2 ÷ 10) ≈ 0.126, times 1.96), so the true TNR could be anywhere from 0.55 to 1. A wide interval is a conclusion in itself: you need more fail samples. When n is small and p is close to 0 or 1, this formula's interval is inaccurate (the upper bound in this example goes past 1); use the Wilson interval instead (about 0.49–0.94 here).
- **Estimating the pass rate from the judge's results**: the pass rate a judge reports carries the judge's own errors. When TPR and TNR are both high, the effect is small; when TNR is low, the judge's reported pass rate will be higher than the real one.

</details>

### ★ How big a gap counts as a real improvement?

An eval score is estimated from a limited set of cases; a different set would give a different score. Every score should come with "roughly how much it wobbles", and when comparing two versions, the difference has to be bigger than that wobble to count.

**How much a score wobbles.** The notes assistant gets 40 of the 50 golden-set cases right, a pass rate of 80%. If you drew another 50 cases from the same kind of usage, you might get 37 or 43. The number that describes this wobble is the **standard error** (SE); for an 80% pass rate on 50 cases it's about 5.7 percentage points (calculation in the collapsible section below).

**Confidence intervals.** Extend the estimate by about 2 standard errors on each side (1.96 to be exact) and you get the **95% confidence interval**: 80% ± 11 percentage points, or about 69%–91%. It means: if you compute intervals this way, about 95 times out of 100 the interval will contain the true pass rate. In reports, write "80% (95% CI 69%–91%)", not just "80%".

**Number of cases vs. error.** The standard error shrinks with the square root of the number of cases: 4 times the cases only halves the standard error. With 50 cases the interval is about ±11 percentage points; with 200 it's about ±5.5. So to see a difference of a few percentage points, you usually need hundreds of cases, not dozens.

**Bootstrap: doing it without a formula.** Pass rates have the formula above, but other metrics (median latency, for example) don't necessarily have a simple one. The **bootstrap** uses the computer to simulate "drawing a new set of cases": treat your 50 cases as the whole population, draw 50 from them with replacement, recompute the score, repeat a thousand-plus times, and see where the middle 95% of the score distribution falls. With 40 of 50 correct, the bootstrap interval comes out at roughly 68%–90%, consistent with the formula; the advantage is that it works for any metric. For a full plain-language explanation see [Math Refresher, "Bootstrap confidence intervals"](/en/guide/math-refresher/#bootstrap-confidence-intervals).

**Paired comparison.** After changing the prompt, the new version gets 43 cases right (86%) and the old one 40 (80%), a 6-point difference. If you treat the two scores as unrelated and compute each interval separately, the 95% confidence interval of the difference is about 6 ± 15 percentage points (the two scores' wobbles add up; calculation in the collapsible section below), which tells you almost nothing. But the two versions ran on the **same cases**, so you can compare case by case:

| Old | New | Cases |
|---|---|---|
| Right | Right | 38 |
| Wrong | Wrong | 5 |
| Wrong | Right | 5 (fixed by the new version) |
| Right | Wrong | 2 (broken by the new version) |

The 43 cases that both versions got right or both got wrong contribute nothing to the difference, however easy or hard they are; the only informative cases are the 7 with different results. Computing the interval from per-case differences (**paired comparison**) narrows the 95% confidence interval of the difference to about 6 ± 10 percentage points, that is, −4 to +16 (calculation in the collapsible section below). The interval contains 0, so the conclusion is "indistinguishable": the new version may be better, but 50 cases aren't enough to be sure. To tell a gap like this apart, you need more cases.

**Decision rule.** A difference is significant only if the 95% confidence interval of the paired difference excludes 0: an interval entirely above 0 means better, entirely below 0 means worse, and one containing 0 means indistinguishable. When using the bootstrap for the interval of the paired difference, resample **case IDs**: each case's results from both versions are drawn together, and then you compute the difference (steps in the collapsible section below).

An inconclusive comparison means the current case count cannot resolve the difference. The new version fixed 5 cases and broke 2 in this example, so add cases and test again before dismissing the change.

<details class="deep">
<summary>Before you build: formulas, bootstrap steps, and cases that aren't independent</summary>

The formula version (for a plain-language review see [Math Refresher, "Standard error"](/en/guide/math-refresher/#mean-variance-and-standard-error)):

- For pass rate p and n cases, the standard error SE = √(p(1 − p) / n). For 50 cases and p = 0.8: √(0.8 × 0.2 ÷ 50) = √0.0032 ≈ 0.057.
- 95% confidence interval ≈ p ± 1.96 × SE. 0.8 ± 1.96 × 0.057 ≈ 0.8 ± 0.11.
- Unpaired, the SE of the difference between two versions = √(SE₁² + SE₂²). In the example: √(0.0032 + 0.86 × 0.14 ÷ 50) ≈ √0.0056 ≈ 0.075, times 1.96 is about ±15 percentage points.
- Paired, compute a difference dᵢ for each case (new score − old score, which can only be +1, 0 or −1); the SE of the difference = the sample standard deviation of dᵢ ÷ √n. In the example, 5 cases are +1, 2 are −1 and 43 are 0: the mean is 0.06, the sample variance about 0.139, SE = √(0.139 ÷ 50) ≈ 0.053, times 1.96 is about ±10 percentage points.

Bootstrap steps (full version and pseudocode in the [Math Refresher](/en/guide/math-refresher/#bootstrap-confidence-intervals)):

1. Draw n cases at random **with replacement** from the n cases (the same case may be drawn more than once) and recompute the metric on them.
2. Repeat 1,000 times or more.
3. Sort the resulting metrics and take the 2.5th and 97.5th percentiles as the 95% confidence interval.

- **Paired bootstrap**: each draw picks "case IDs", both versions compute the difference on the same drawn cases, and you take percentiles of the differences.
- **Cases that aren't independent**: when one note produces several cases, or one conversation is split into several cases, those cases tend to be right or wrong together. Miller 2024 recommends clustered standard errors; with the bootstrap, resample whole groups of cases as units rather than individual cases, or the interval will be unrealistically narrow.
- **Too few cases** (say, fewer than 20): bootstrap intervals aren't reliable; just write "sample too small".
- **Miller 2024's two main recommendations** are exactly this section's two points: attach a confidence interval to every score, and use paired comparison when comparing versions.
- For planning sample sizes in advance and what to watch for when comparing many versions at once, see ○ Advanced statistics below.

</details>

### ★ Measure capability or reliability?

Split cases into two groups: capability evals, which measure "what it can't do yet", and regression evals, which measure "what it should always be able to do". When running the same case several times, whether you care about "at least one success" or "every run succeeds" depends on how users use the feature.

**Two kinds of evals.** A **capability eval** has a low pass rate, and its purpose is to show you where to improve, for example "answer questions that require combining three notes". A **regression eval** should pass close to 100% of the time, and its purpose is to keep a change to A from breaking B, for example "every tag is in the vocabulary". Once a capability eval case passes reliably, it "graduates" to the regression eval.

**Running the same case several times.** LLM output can differ every time, so you'll often run the same case k times:

- **pass@k**: the probability that at least one of k runs succeeds. It comes from evaluating code generation (Chen et al. 2021) and suits situations where you can verify automatically and pick the correct one from several answers, such as generating code and then running tests.
- **pass^k**: the probability that all k runs succeed. It comes from τ-bench (Yao et al. 2024) and measures reliability. Features users hit every time should be judged by this.

**Example.** The notes assistant's routing is 90% accurate per run, with runs independent. pass@3 = 1 − 0.1³ = 99.9%, which sounds great; but if a user uses it 8 times a day, the probability of all 8 being right is pass^8 = 0.9⁸ ≈ 43%, meaning that on more than half of days they'll hit at least one routing error.

Users normally see one answer, with nobody choosing the right one from k attempts. Unless your system can verify and select an answer automatically, use pass^k or single-run success rate to assess the experience.

How to evaluate an agent's multi-step tasks (trajectory evals, simulated users) is left for [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/).

<details class="deep">
<summary>Going deeper: estimating pass@k and pass^k from n samples</summary>

Running k times once and recording "did it succeed" gives an estimate with high variance. In practice you run each case n times (n ≥ k), get c successes, and estimate with combinations:

- pass@k ≈ 1 − C(n − c, k) ÷ C(n, k): the probability that k runs picked at random from the n all fail, subtracted from 1. Chen et al. 2021 proposed this unbiased estimator.
- pass^k ≈ C(c, k) ÷ C(n, k): the probability that k runs picked at random from the n all succeed. This is how τ-bench computes it.

For example, n = 10, c = 8, k = 2: pass@2 = 1 − C(2, 2) ÷ C(10, 2) = 1 − 1 ÷ 45 ≈ 0.978; pass^2 = C(8, 2) ÷ C(10, 2) = 28 ÷ 45 ≈ 0.622. Finally, average over all cases.

</details>

### ★ Can you trust public benchmarks?

Public benchmarks are good for narrowing down candidate models, but they don't measure your product; the final call has to come from your own golden set.

**Three common problems.**

- **Contamination**: test questions appeared in the model's training data, so a high score may just mean it memorized them.
- **Saturation**: top models are all near a perfect score, and the benchmark can no longer tell them apart.
- **Construct validity**: whether what the benchmark measures is the ability it claims to measure. Bean et al. 2025 reviewed 445 LLM benchmarks and found that many have problems in task design and scoring that weaken how far their conclusions can be trusted.

**Example.** A model scores 3 points higher than your current model on a general question-answering benchmark. For the notes assistant, those 3 points may come from encyclopedia-style questions in the benchmark, while the notes assistant's job is to answer from the user's notes without adding its own knowledge. Only a paired comparison of the two models on your own golden set tells you whether switching really is better.

Even a well-designed benchmark has a different question distribution from your users. Retest a high-scoring model on your own tasks.

### ★ Does the model know when it's unsure?

If you could tell how confident the model is in an answer, you could have it say "I'm not sure" when it isn't, instead of being confidently wrong. That only works if the "confidence" lines up with how often it's actually right.

**Where confidence comes from.** For every token, the model first produces a probability distribution (logits passed through softmax, ← [Model Crash Course](/en/guide/app-first/#logits-and-softmax); deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/)). Some APIs and local inference engines can return the logarithms of these probabilities, called **logprobs**. The probability of the answer token can serve as "confidence": a logprob of −0.1 converts back to a probability of about 0.90, −2.3 to about 0.10 (probability = e raised to the logprob).

**Abstention.** When confidence is below some threshold, don't give an answer; say "I'm not sure" or hand off to a human instead. When the notes assistant is asked about something that isn't in the notes, abstaining is far better than making up an answer.

**Calibration.** Confidence can only be used to decide whether to abstain if the model is **calibrated**: answers given with 80% confidence are right about 80% of the time. To check, draw a **reliability diagram**: group answers by confidence (for example 0.6–0.7, 0.7–0.8, …), compute the actual accuracy of each group, and plot it against the diagonal. If the 0.9-confidence group is actually right only 60% of the time, the model is overconfident and the threshold has to be adjusted separately. Kadavath et al. 2022 found large models fairly well calibrated in some settings, but post-training, question type and how the question is asked all have an effect.

**When you can't get logprobs.** Not every API or model provides logprobs (reasoning models usually don't). An alternative is to sample the same question several times and see whether the answers agree (self-consistency): 5 identical answers out of 5 is more trustworthy than 5 different ones. Or have the model state its own confidence, though that's usually less reliable. Whichever you use, check it with a reliability diagram.

A model's stated confidence often differs from its actual accuracy. Measure confidence against data with known answers. [S17 Product and AI UX](/en/stages/s17-ai-ux/) covers how to present uncertainty to users.

### ★ What does one task cost?

Compute cost per *completed task*, and report it together with quality; otherwise a quality gain may have been bought at several times the cost.

**Why per task.** When a user asks one question, the system may call the model several times: route first, then answer, retrying on failure. Looking only at "cost per call" underestimates the true cost.

**Example (prices are illustrative).** The notes assistant answers a question: the routing call costs 0.1 cents and the answer call 0.8 cents, and 10% of requests need the answer retried once. Cost per task = 0.1 + 0.8 × 1.1 = 0.98 cents. If a new prompt version raises the pass rate by 2 percentage points but the longer prompt triples the cost of the answer call (2.4 cents), the cost per task becomes about 2.7 cents (0.1 + 2.4 × 1.1 = 2.74). Spell that tradeoff out. Kapoor et al. 2024 make the same criticism of agent evaluation: reporting only accuracy and not cost makes comparisons unfair.

**Budgets and alerts.** Set a budget for each whole eval run and one for daily use, and raise an alert when either is exceeded. Judge calls cost money too, and count toward an eval run. The per-call cost you've been logging since [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) is the raw data for this.

A cheaper model can increase cost per task if failures require more retries or human handling.

<section class="deep-section">

### ○ Advanced statistics: sample size planning, multiple comparisons, annotator agreement, calibration metrics

For readers comfortable with statistics who want more precise numbers. None of this is required for the core exercise.

**Sample size planning (power)**: first decide how big a difference d you want to detect, then work out how many cases you need. For a paired comparison at a 5% significance level and 80% power (if there really is a difference of d, an 80% chance of detecting it), the number of cases is about (1.96 + 0.84)² × the variance of the paired differences ÷ d². If you don't know the variance of the paired differences, estimate it from a small sample of 30–50 cases first, then compute the number you need.

**Multiple comparisons**: when you compare 4 prompt variants at once and judge each with a 95% confidence interval, the probability that at least one "looks significant" is much higher than 5%. You can use the Bonferroni correction (divide the significance level by the number of comparisons; for 4 comparisons, use 98.75% confidence intervals), or specify in advance a single pair of versions for the formal comparison and treat the rest as exploration.

**Annotator agreement (Cohen's κ)**: how much agreement two annotators have beyond what they'd get by guessing at random is Cohen's κ; 1 is perfect agreement, 0 is no better than random. With several annotators, first use κ to check whether humans agree with each other; if they don't, the grading criteria themselves need rewriting, and computing a judge's TPR / TNR against those human labels is meaningless.

**Calibration metrics (ECE, Brier score)**: to summarize calibration in one number, **ECE** (expected calibration error) groups answers by confidence, takes the absolute value of "mean confidence − actual accuracy" for each group, and averages them weighted by the number of answers in each group; the **Brier score** is the mean of (confidence − actual outcome, 0 or 1)² over all answers, and lower is better. ECE depends on how you group, so state the number of groups when you report it.

</section>

<section class="deep-section">

### ○ What about language-specific benchmarks and synthetic cases?

General benchmarks are mostly in English. If your users write in another language, look for benchmarks in that language; for Traditional Chinese, for example, there are TMLU, TMMLU+ and TCEval (see [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM)). Using an LLM to generate eval cases can expand their number quickly, but the cases tend to be easy and uniform in style, and having the same vendor's model both write and answer them overestimates scores. Synthetic cases should supplement cases taken from real traces, not replace them.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

Sam asks "When is the design team's next meeting?" The cited note says "Next meeting 10/28", and the assistant answers: "The next meeting is on 10/21, when the Q4 budget will be confirmed." Write the open coding note for this trace, then write a binary pass condition for this kind of failure and say which kind of grader should check it.

<details class="hint">
<summary>Check your answer</summary>

The note records only the first error: "Gave the next meeting date as 10/21; the note says 10/28." "The budget will be confirmed then" isn't in the note either, but leave it for now; if it keeps showing up, it can become its own category later. A pass condition might be "every date in the answer appears in the cited notes and refers to the same event"; code can compare the date strings, but deciding "is it the same event" needs a judge.

</details>

### Core: From outputs to a calibrated judge

The core exercise reuses the synthetic texts from [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) instead of the notes assistant: the data has known answers and others can rerun it, and you practice exactly the same method.

**Goal**: complete one round of error analysis for a small LLM feature, and build a judge calibrated against human labels.

**Steps and acceptance criteria** (in four stages; you can stop after any stage and check your results)

**Stage 1: Failure taxonomy** (steps 1–3)

1. Pick an LLM feature and prepare 60 inputs; choose one:
   - **Default**: the `summary` field from the core exercise in [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/). Take the first 60 of those 100 texts; the feature is "summarize this text in one sentence."
   - **Alternative**: the first 60 news articles in the test split of the Hugging Face dataset [`abisee/cnn_dailymail`](https://huggingface.co/datasets/abisee/cnn_dailymail) (version 3.0.0); the feature is "summarize the article in one sentence."

   Generate the 60 outputs and save them, and commit them together with the code and prompt that produced them.
2. Open coding: read each output and write one sentence about what's wrong (write OK if nothing is).
3. Axial coding: group the notes into failure categories (usually 3–6; use however many the data actually has, don't pad) and count each.

Acceptance criteria: all 60 outputs have an open coding note; failure categories drawn from the notes, each with a count.

**Stage 2: Write a grader** (step 4)

4. Pick a category that code can't check, and write a binary judge prompt that outputs a reason and pass / fail.

Deliverable: one judge prompt, which you can try out on a few outputs (no numeric acceptance criteria at this stage).

**Stage 3: Calibrate the judge** (steps 5–6)

5. Label all 60 yourself as pass / fail for this category (treat pass as the class to catch). Split them into dev (30) and test (30), making sure test has at least 10 fails. If there aren't enough fails, generate an extra batch of outputs with a smaller model or a deliberately weakened prompt (for example, with the length limit removed), label them, distribute them proportionally between dev and test, and note how many you added; from then on, use the actual dev / test counts.
6. Tune the judge prompt using only dev. When you're done, commit the judge prompt first, then run it once on test, compute TPR (the fraction of human passes the judge also passes) and TNR (the fraction of human fails the judge also fails), and commit the test results file too.

Acceptance criteria:
- On test (at least 30 cases, at least 10 of them fails, using the actual counts), the judge has TPR ≥ 0.8 and TNR ≥ 0.8, with 95% confidence intervals for both (with only about 10 fails, the TNR interval will be wide, and that's part of the conclusion). If you don't reach 0.8, write down what you think the cause is and the next step.
- Show that the judge prompt wasn't changed after the test results came out: the last commit that changed the judge prompt is an ancestor of the test results commit, and the judge prompt hasn't changed since (you can verify with `git log -- <judge prompt file>`).

**Stage 4: Statistical comparison** (step 7)

7. Use the judge to compute the pass rate on the original 60 outputs, then compute a 95% confidence interval with the bootstrap. The weakened outputs added in step 5 were only there to get enough fails to calibrate the judge; they don't count toward the pass rate.

Acceptance criteria: the pass rate of the original 60 outputs with a 95% bootstrap confidence interval (for example "72%, 95% CI 60%–83%").

**Hints**
- TypeScript: use structured output (← S7 Prompts, Structured Output and Workflows) to make the judge output `{reason, pass}`; write the bootstrap yourself in about 20 lines.
- Python: pandas to organize labels; [`scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) for the interval.
- Labeling tool: a spreadsheet is enough. If you want it faster, build a small web page where you label one at a time with `p` / `f`, a Streamlit page, Jupyter `ipywidgets` buttons or a terminal script; it usually takes 30–60 minutes.
- Cost: generating 60 outputs plus a few hundred calls for judge iteration usually comes to under $2 with a cheap model.
- If you get stuck:
  - Reread: [How does the system actually fail?](#-how-does-the-system-actually-fail), [Can you trust a model grader?](#-can-you-trust-a-model-grader) (including "too few fails"), [How big a gap counts as a real improvement?](#-how-big-a-gap-counts-as-a-real-improvement)
  - Further: [Math Refresher, "Bootstrap confidence intervals"](/en/guide/math-refresher/#bootstrap-confidence-intervals); Hamel's "Using LLM-as-a-Judge"

**Note**: most of the work is in the two rounds of reading and labeling by hand.

<section class="deep-section">

### Advanced: System project A8: Error analysis, golden set and eval runner

**Goal**: build your first rerunnable eval suite from your system's real traces.

**Steps**
1. Export at least 100 real traces from the system you built in the first two system project steps (A6 Streaming Chat and Traces, A7 Structured Output and Workflows). If you don't have enough, keep using it until you do, or ask your users to help.
2. Do open / axial coding until saturation and produce a failure taxonomy table: category, definition, count, example trace IDs.
3. Build a golden set of ≥ 50 cases from the traces: include both failure and success cases, and record the source trace ID and expected behavior for each.
4. Write code assertions for at least 2 kinds of failure; build an LLM judge for at least 1 subjective kind of failure and calibrate it with ≥ 20 human labels that weren't used for tuning.
5. Write an eval runner: one command runs the whole golden set and outputs each metric's pass rate, its 95% confidence interval, the total cost of this eval run, and the system's average cost per task.
6. Tag the cases as capability or regression.
7. Use the runner to compare two prompt versions (or two models), using a paired comparison to decide whether the difference is significant.

**Acceptance criteria**
- The failure taxonomy table covers at least 100 traces, with counts per category.
- Golden set ≥ 50 cases, 100% with a source trace ID.
- On the held-out human labels, the judge has TPR and TNR both ≥ 0.8.
- Every metric has a 95% confidence interval; the report includes the total eval cost and the cost per task.
- A paired comparison report whose conclusion states clearly "significantly better / worse / indistinguishable": significant only if the 95% confidence interval of the paired difference excludes 0 (entirely above 0 is better, entirely below 0 is worse); if it contains 0, it's indistinguishable.

With the notes assistant as the example: common failure categories might be "answer not grounded in the notes; made up", "got a note's date wrong", "tag not in the vocabulary" and "answered an add-note request as a question"; the first two need a judge or a human, and the last two can be checked in code.

**Hints**
- TypeScript: the eval runner can be a standalone script outside Vitest, so it doesn't get mixed up with unit tests; save results as JSONL for easy comparison.
- Python: pytest or a plain script both work; [promptfoo](https://www.promptfoo.dev/docs/intro/) can also act as the runner, but write one yourself first so you know what it's doing for you.
- Viewing data: Langfuse and Phoenix can both annotate traces; or build a simple viewer page yourself, which Hamel's Field Guide strongly recommends. If you don't want to write a web page, a Jupyter notebook or Streamlit can give you the same "look at one at a time, label fast" flow.
- Cost: one eval run is usually tens to hundreds of calls; keep a record, because you'll run it over and over in [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/).
- If you get stuck:
  - Reread: [How does the system actually fail?](#-how-does-the-system-actually-fail), [Where do the test cases come from?](#-where-do-the-test-cases-come-from), [How big a gap counts as a real improvement?](#-how-big-a-gap-counts-as-a-real-improvement)
  - Further: Hamel's "A Field Guide to Rapidly Improving AI Products"; the paired comparison section of Miller 2024

</section>

## Self-check

1. Why does error analysis come before designing metrics? What would you miss if you went straight to "helpfulness 1–5"?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: an average score doesn't tell you what's broken or what to fix; error analysis gives you failure categories with counts that you can check and fix, and the metrics come from those categories. **Common mistake**: setting metrics first and then looking for data, so you only measure the problems you expected. **Reread**: [How does the system actually fail?](#-how-does-the-system-actually-fail)

   </details>

2. A judge has 92% accuracy. Can you trust it as is? What else do you need to look at?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: when fails are rare, high accuracy can hide a very low TNR; look at TPR and TNR on test, where test wasn't used to tune the prompt. **Common mistake**: looking only at overall accuracy on imbalanced data. **Reread**: [Can you trust a model grader?](#-can-you-trust-a-model-grader)

   </details>

3. Version A has a 78% pass rate and version B 82%, on 50 cases each. Can you say B is better? How would you decide?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: with 50 cases the interval is about ±11 percentage points, so a 4-point gap isn't enough; do a paired comparison on the same cases and check whether the 95% confidence interval of the difference contains 0. **Common mistake**: describing "indistinguishable" as "equally good". **Reread**: [How big a gap counts as a real improvement?](#-how-big-a-gap-counts-as-a-real-improvement)

   </details>

4. A feature succeeds 95% of the time per use, and users use it 10 times a day. From the pass^k point of view, what does that mean for the user experience?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: pass^10 = 0.95¹⁰ ≈ 0.60, so on about 40% of days users hit at least one failure. **Common mistake**: seeing 95% per use and assuming the experience is good enough. **Reread**: [Measure capability or reliability?](#-measure-capability-or-reliability)

   </details>

5. Scenario: your manager sees a model win by 3 points on a public benchmark and wants to switch models right away. How do you respond, and what validation steps do you propose?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the benchmark may have contamination, saturation or validity problems, and its question distribution isn't your users'; do a paired comparison on your own golden set and look at cost per task as well. **Common mistake**: treating the benchmark score as your own product's performance. **Reread**: [Can you trust public benchmarks?](#-can-you-trust-public-benchmarks)

   </details>

6. A judge's results on test: of 25 human passes it judged 22 pass; of 10 human fails it judged 6 fail. Compute TPR, TNR and overall accuracy. Is this judge usable?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: TPR = 22 ÷ 25 = 0.88, TNR = 6 ÷ 10 = 0.6, overall 28 ÷ 35 = 80%; a TNR of 0.6 means 4 of every 10 fails get through, so it isn't usable yet. **Common mistake**: seeing 80% overall and calling it usable. **Reread**: [Can you trust a model grader?](#-can-you-trust-a-model-grader)

   </details>

7. The notes assistant gets 40 of 50 cases right, with a 95% confidence interval of about ±11 percentage points. If you increase to 200 cases and the pass rate stays the same, roughly what does the interval become? Why isn't it ±2.75?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the standard error shrinks with the square root of the number of cases, so 4 times the cases halves the interval, to about ±5.5 percentage points. **Common mistake**: thinking the interval is inversely proportional to the number of cases. **Reread**: [How big a gap counts as a real improvement?](#-how-big-a-gap-counts-as-a-real-improvement)

   </details>


:::tip[On the application route]
You can keep going without reading Part I Models. If you want to go deeper, now is a good time to read [S2 Transformers and Decoding](/en/stages/s02-transformer/) and [S5 Inference and Serving](/en/stages/s05-inference/), the two chapters most relevant to applications (see [the application route](/en/guide/app-first/#when-part-i-is-worth-reading)).
:::

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want more practical detail, the original papers, or a course to practice with. None of it is required.

### Practical guides

- [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) (2024-03-29) — why you need evals, and three levels of evaluation, with a complete real-world case.
- [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/) (2026-09) — a Q&A on error analysis, binary vs. Likert, and judge calibration; continually updated, and the source for this chapter most worth following.
- [Hamel Husain: A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) (2025-03-24) — practical error analysis and data-viewing tools; very useful for A8's error analysis and golden set.
- [Hamel Husain: Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) (2024-10-29) — building and calibrating a judge step by step; matches the core exercise.
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) (2026-01-09) — read the vocabulary and grader taxonomy first; leave the agent parts for S14 Agent Evals, Data and Optimization.
- Chip Huyen, *AI Engineering* (paid book), chapters 3–4 — a systematic treatment of evaluation methods and evaluation pipelines.

### Original papers

- [Miller 2024, Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) — full derivations of confidence intervals, paired comparison, clustered standard errors and sample size.
- [Zheng et al. 2023, Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) — the original experiments on the three judge biases.
- [Shankar et al. 2024, Who Validates the Validators?](https://arxiv.org/abs/2404.12272) — a user study of criteria drift and judge alignment.
- [Chen et al. 2021, Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) — the definition of pass@k and its unbiased estimator.
- [Yao et al. 2024, τ-bench](https://arxiv.org/abs/2406.12045) — the source of pass^k.
- [Bean et al. 2025, Measuring what Matters: Construct Validity in LLM Benchmarks](https://arxiv.org/abs/2511.04703) — a systematic review of the validity of 445 benchmarks.
- [Kadavath et al. 2022, Language Models (Mostly) Know What They Know](https://arxiv.org/abs/2207.05221) — experiments on calibration in large models.
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — the argument for reporting quality and cost together.

### Courses and tools

- [Stanford CS 329Z](https://cs329z.stanford.edu/) lectures 13 and 15 (fall 2026; read lecture 15 once its slides are public); assignment 4 (LLM evaluation) of [Stanford CS224N](https://web.stanford.edu/class/cs224n/).
- [anthropics/courses](https://github.com/anthropics/courses) — the prompt evaluations course, with runnable examples. Archived.
- [Ragas](https://docs.ragas.io/) and other RAG evaluation frameworks — used in S9 Retrieval and RAG; understand how their metrics are computed before you rely on them.

</section>
