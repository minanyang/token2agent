---
title: S4 Post-training and Reasoning
head:
  - tag: title
    content: 'LLM Post-training: SFT, LoRA and Reasoning Models (S4) | Token2Agent'
description: How a base model becomes a useful assistant and a reasoning model. What SFT, LoRA, DPO and GRPO each do, how verifiable rewards work, and side effects such as reward hacking and sycophancy.
sidebar:
  order: 4
  label: S4 Post-training and Reasoning
---

:::note[This chapter]
**Prerequisites**: [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) (also uses sampling from [S2 Transformers and Decoding](/en/stages/s02-transformer/))

**Next**: → [S5 Inference and Serving](/en/stages/s05-inference/); agentic RL continues in [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/)
:::

:::tip[Concepts route: key points]
- A freshly pretrained model can only keep writing. It needs more training to become an assistant that follows instructions and solves problems.
- There are three main training signals: show it good answers, compare two answers, and let a program check the answer automatically.
- The model chases only the score you give it. If the score and the real goal differ, it finds the loophole.
:::

## What this chapter covers

Pretraining produces a base model that continues text but does not yet answer questions well. Post-training uses relatively little data and compute to teach instruction following and, later, step-by-step reasoning. This chapter covers ideal-answer examples (SFT), answer comparisons (preference learning), programmatically checked answers (RL with verifiable rewards), and extra inference compute. It also examines reward hacking, sycophancy and forgetting, and how to check whether the model has improved.

## After this chapter you can

- Use one example problem to explain how answers from a base, an instruct and a reasoning model differ, and which training signal (examples, comparisons, automatic checking) produces each. (lecture and self-check)
- Judge whether a claim that "the model got better" is credible: is there held-out data, is it compared against the base, is there a confidence interval? (lecture and self-check; the core exercise has you make this call once)
- Run SFT → LoRA → DPO → GRPO on a real small model and use measured numbers to show what each step changes. (advanced; the core exercise only writes the GRPO advantage calculation)
- Spot the signs of reward hacking and sycophancy. (advanced)

## Lecture

Post-training includes all training after pretraining. It uses three broad kinds of signal:

| Stage | Training signal | What it teaches the model | Result |
|---|---|---|---|
| SFT | Examples of "instruction → ideal answer" | Chat format, following instructions, answer style; it can also teach narrow tasks | An early instruct model |
| Preference learning (RLHF, DPO) | Comparisons of "which of two answers is better" | More helpful, better tone, safer | Instruct model |
| RLVR | A score from a program that decides right or wrong | Better problem solving on verifiable tasks | One of the key ingredients of a reasoning model |

The further down the table, the less the signal needs a human to write the reference answer. SFT needs people to write examples, preference learning only needs them to pick the better one, and RLVR doesn't need people at all, as long as the answer can be checked automatically.

### ★ One example, end to end

The whole chapter uses one task: teach a small model (say Qwen3-0.6B-Base) to solve grade-school math word problems. The example problem:

> A box holds 12 pencils. You buy 3 boxes and give 7 pencils to a classmate. How many are left? (Answer: 29)

1. **Base model**: give it this problem and it will likely continue with "Problem 2: A box holds 24 crayons…", because problems on the web often come one after another. It's not that it can't do the math; it doesn't know it's supposed to *answer* now.
2. **After SFT**: having seen a few thousand examples of "problem → worked steps + answer," it learns to respond: "12 × 3 = 36, 36 − 7 = 29. Answer: 29".
3. **After preference learning**: given two correct answers, one concise and one wordy and stiff, people prefer the first; after training the model writes the first kind more often.
4. **After RLVR**: it answers the same problem 8 times, a program checks whether the number after "Answer:" is 29, and the correct attempts are reinforced. After practicing on a large number of problems, it starts writing a long stretch of thinking first, checks itself, and then gives the answer.
5. **At inference time**: without changing the model, you can also have it answer 8 times and take a majority vote. Accuracy often goes up a bit more, at the cost of 8 times the tokens.

After each stage, test whether the model improves on unseen problems. The final section, "[How do you know fine-tuning worked?](#-how-do-you-know-fine-tuning-worked)", explains how.

### ★ How do you teach a model to answer?

SFT (supervised fine-tuning) uses ideal answers as examples and keeps training with the same next-token loss as pretraining. The differences are the data format and "compute loss only on the answer."

SFT data is a set of conversations. A conversation doesn't enter the model as two fields, "question" and "answer." A **chat template** joins it into one piece of text, with special tokens marking who is speaking. Here's the Qwen family's format:

```text
<|im_start|>user
A box holds 12 pencils. You buy 3 boxes and give 7 pencils to a classmate. How many are left?<|im_end|>
<|im_start|>assistant
12 × 3 = 36, 36 − 7 = 29. Answer: 29<|im_end|>
```

During training, loss is usually computed only on the assistant part (including the closing `<|im_end|>`); the user part serves only as conditioning. This is **loss masking**. The reason is simple: you want the model to learn how to answer, not how to write questions. Some setups compute loss on the whole conversation, but answer-only is the common default. Learning to emit `<|im_end|>` at the end of an answer also matters, so the model knows when to stop.

At inference time, the server joins the conversation with the same template and ends with `<|im_start|>assistant` so the model continues from there. **Common misconception: the template is just formatting, so being slightly off is fine.** In practice, any difference between the training and inference templates (one missing newline, a different role name) shows the model text it never saw in training. Performance can drop for no obvious reason, and nothing raises an error. When you run open models yourself, always use the template that ships with the tokenizer.

SFT needs less data than you might expect: one study (LIMA) got a fairly good assistant from just 1,000 curated examples. Knowledge mostly comes from pretraining; SFT mainly teaches behavior: answer format, style, when to stop, and specific narrow tasks (such as extracting information into fixed fields). A small amount of SFT can hardly teach a lot of new knowledge. But SFT on a large number of high-quality worked solutions can teach reasoning (see distillation later).

<details class="deep">
<summary>Before you build: implementing loss masking</summary>

- **How**: tokenize the whole conversation into a sequence of IDs, and prepare a label sequence of the same length. Set the labels for the user and system parts to the ignore value (`-100` by default for PyTorch's `cross_entropy`); the labels for the assistant part are the next tokens. Average the loss only over non-ignored positions.
- **Finding the boundary**: use the tokenizer's `apply_chat_template` to produce "everything up to the start of the assistant turn" and "the whole conversation"; the difference in length is the answer's span. In multi-turn conversations, mark every assistant turn this way.
- **Packing**: joining several short conversations into one long sequence reduces padding, but attention shouldn't cross the boundary between conversations, or they interfere with each other.
- **Common bugs**: a base model's tokenizer may have no chat template, or its special tokens may have embeddings that were never trained. Before SFT, check that the template exists and that each special token is tokenized as a single ID.

</details>

### ★ How does LoRA save memory?

LoRA leaves the original weights alone and adds a pair of very small matrices alongside to learn "how much to change." The trainable parameters are often under 1%.

**Why you need it.** Full fine-tuning stores gradients and optimizer state for every parameter. Mixed-precision training with Adam takes about 16 bytes per parameter (← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)), so a 0.6B model needs about 9.6 GB for that alone, and a 7B model needs over 100 GB. Among the methods that train only a few parameters, LoRA is the most common.

**How it works.** A weight matrix W stays frozen. Next to it you add two long, thin matrices A and B whose product is the same size as W, and add it to W: the new weight is W + B·A. The middle dimension r (the rank) of A and B is small, say 8, so B·A can only express changes along "a few directions." LoRA's core assumption is that the change fine-tuning needs is much simpler than the original weights, and a few directions are enough.

**Example.** A 4096 × 4096 matrix has 16,777,216 parameters. With r = 8, A is 8 × 4096 and B is 4096 × 8 (B·A is (4096 × 8) times (8 × 4096), giving 4096 × 4096, the same size as W), for 65,536 parameters in total, about 0.39% of the original. Only these parameters need gradients and optimizer state, so memory drops sharply. After training you can add B·A straight back into W, with no extra cost at inference; or keep it as a small separate file and switch between different LoRAs on the same base model.

LoRA often matches full fine-tuning for format, style and narrow tasks. The gap tends to grow when the model needs to learn substantial new content. A rank r that is too small, or applying LoRA to too few matrices, can also prevent it from learning.

<details class="deep">
<summary>Before you build: LoRA details</summary>

- **Formula**: output h = W·x + (α / r)·B·A·x. α is a scaling factor, so you don't have to retune the learning rate when you change r.
- **Initialization**: A is random and B is all zeros, so at the start B·A = 0 and the model is exactly the original. Training starts from "no change."
- **Where to apply it**: the original paper applied it only to the attention q and v matrices; today it's common to apply it to all linear layers (q, k, v, o and the MLP), which usually works better with still very few parameters.
- **Learning rate**: LoRA usually uses a larger learning rate than full fine-tuning (commonly on the order of 1e-4 to 2e-4, depending on the setup).
- **QLoRA**: also stores the frozen W quantized to 4-bit (quantization ← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)), while A and B still train in 16-bit. A single consumer GPU can then fine-tune a mid-size model, at the cost of somewhat slower compute and possibly slightly lower quality. Methods like this that train only a few parameters are collectively called PEFT (parameter-efficient fine-tuning).
- **QLoRA's three tricks**: NF4 (a 4-bit format designed for normally distributed weights), double quantization (quantizing the quantization scale factors too), and paged optimizers (moving optimizer state to the CPU temporarily when memory runs short).

</details>

### ★ How do you train a model with a score?

SFT needs someone to write the ideal answer. RL only needs a way to score the answers *the model writes itself*, and then pushes it toward higher scores.

**The model as a policy.** In reinforcement learning (RL) terms, the model is a policy: given a problem, it produces an answer one token at a time (each token is an action), and when the answer is done it gets a reward, for example 1 for correct and 0 for wrong.

**The basic idea** (policy gradient): raise the probability of every token in high-reward answers and lower it in low-reward ones. Using the reward directly as the weight has a problem: if rewards are all positive (say 0 to 10), every answer's probability gets pushed up, just by different amounts, and training is unstable. The fix is to subtract a **baseline** first, usually the average reward. What's left is the **advantage**: how much better this answer is than average.

**Example.** The example problem is answered 4 times with rewards 1, 1, 0, 0, an average of 0.5. The two correct answers have advantage +0.5 and their probability goes up; the two wrong ones have −0.5 and go down. If all 4 are correct, the average is 1 and every advantage is 0: a problem the model already handles needs no change.

**PPO**, the algorithm traditionally used for RLHF, trains a separate **value model** to estimate the baseline. The value model is about as big as the model itself, so PPO is memory-hungry.

**KL penalty**: RLHF (especially with PPO) almost always penalizes the model for drifting too far from a reference model (usually the post-SFT model). Without this constraint, the model may produce weird text the reference model would almost never write, just to score high. Some RL with verifiable rewards drops it, such as DAPO later in this chapter. **Common misconception: the KL penalty is an optional tweak.** In RLHF it's actually the main constraint that keeps the model's original language ability. Too small a coefficient and the reward pulls the model off course; too large and it barely learns anything.

<details class="deep">
<summary>Going deeper: the formulas for policy gradient, PPO and GAE</summary>

For the math tools, see the [Math Refresher](/en/guide/math-refresher/).

- **REINFORCE**: the simplest policy gradient, using the (baseline-subtracted) reward directly as the weight.
- **PPO does two things**: it uses clipping to keep the new policy from moving too far from the old one (see below), so a single step can't break things; and it uses a value model to estimate "how much this state scores on average," a finer-grained baseline than the average reward.
- **Policy gradient**: the goal is to maximize the expected reward J(θ) = E[R]. Its gradient can be written as E[(R − b)·∇ log π_θ(y | x)], where log π_θ(y | x) is the sum of the log probabilities of every token in the answer and b is the baseline. As long as b doesn't depend on the answer itself, subtracting it doesn't change the expected gradient (no bias is introduced), but it lowers the variance.
- **PPO's clipping**: let ρ = π_θ(token) ÷ π_old(token), the ratio of the new and old policy's probabilities for the same token. The objective is min(ρ·A, clip(ρ, 1 − ε, 1 + ε)·A), with ε commonly 0.2. When A > 0, pushing ρ above 1.2 gains nothing more; when A < 0, pushing ρ below 0.8 gains nothing more. So the same batch of data can be reused several times without overshooting.
- **GAE** (generalized advantage estimation): uses the value model V to estimate the advantage at each token position. δ_t = r_t + γ·V(s_{t+1}) − V(s_t), Â_t = Σ_l (γλ)^l·δ_{t+l}. λ trades off between "low bias but high variance" and "low variance but high bias."
- **KL in RLHF**: the objective is max E[r(x, y)] − β·KL(π_θ ‖ π_ref). In practice, each token's −β·log(π_θ / π_ref) is often added to the reward, and the reward model's score is added at the last token.

</details>

### ★ How do you teach without a right answer?

Much of what makes an answer good has no single right answer, but people are good at comparing two answers. Preference learning turns "comparison" into a training signal.

**Reward model.** Collect lots of preference pairs: answers A and B to the same prompt, and the annotator picks A. Use this data to train a reward model that gives any answer a score r. Training adjusts the scoring so the answers people actually picked score higher; the bigger the gap between two answers' scores, the more likely people are to pick the higher one.

**RLHF** (reinforcement learning from human feedback) has two steps: train the reward model, then use PPO to make the model maximize that score, with a KL penalty. Back to the example: given two correct answers, annotators prefer the concise one, the reward model learns that "concise, with clear steps" scores high, and PPO moves the model in that direction.

**DPO** (Direct Preference Optimization) showed that under the same objective as RLHF (maximize reward with a KL constraint), you can skip the reward model and the RL loop and train the model directly on preference pairs. The intuition: for each pair, raise the model's probability of writing the "chosen" answer and lower its probability of the "rejected" one, both measured relative to the reference model. The whole process looks like ordinary supervised training, with no sampling and no value model, so it's simple and stable, and it became one of the most popular methods in the open-model community.

DPO learns offline from a fixed set of preference pairs. It does not explore by generating new answers for scoring, as RL does. It can overfit the pairs more easily, and performs worse when they differ substantially from the current output distribution, for example when another model wrote them.

<details class="deep">
<summary>Going deeper: the reward model and DPO losses</summary>

- **Bradley–Terry model**: assumes the probability that people pick A over B depends only on the score difference: σ(r(A) − r(B)). σ (sigmoid) squashes any number into the range 0 to 1: a score difference of 0 gives 50%, a difference of 1 about 73%, and 2 about 88%.
- **Reward model loss**: for each pair (chosen y_w, rejected y_l), loss = −log σ(r(x, y_w) − r(x, y_l)). A reward model is usually a language model with its output layer replaced by a small head that outputs a single number.
- **Key step in the DPO derivation**: the objective "maximize r minus β·KL" has a closed-form optimal policy π*(y | x) ∝ π_ref(y | x)·exp(r(x, y) / β). Turned around, r can be written in terms of the policy: r(x, y) = β·log(π*(y | x) / π_ref(y | x)) + a constant that depends only on x. Plug that into Bradley–Terry, subtract the two answers, and the constant cancels, leaving a loss that contains only the policy.
- **DPO loss**: loss = −log σ(β·[log(π_θ(y_w) / π_ref(y_w)) − log(π_θ(y_l) / π_ref(y_l))]).
- **Numeric example**: β = 0.1. At the start of training π_θ = π_ref, the bracket is 0, and loss = log 2 ≈ 0.693. If later the chosen answer's log ratio is +2 and the rejected one's is −1, the bracket is 3, times β gives 0.3, σ(0.3) ≈ 0.574, and loss ≈ 0.554.
- **Trap**: the loss can drop just because "the rejected answer's probability fell faster," while the chosen answer's probability also falls. During training, watch the log probabilities of both, not just the loss.

</details>

### ★ How are reasoning models trained?

For tasks like math and code where the answer can be checked automatically, you can use a program as the grader for RL, with no humans and no reward model. Training this way at scale is one of the key methods behind recent reasoning models.

**RLVR** (reinforcement learning with verifiable rewards) gets its reward from a verifier: math problems compare the final answer, coding problems run tests. A verifier is a rule, not a learned model, so it's much harder to fool than a reward model (though not impossible; see the reward hacking section later).

**GRPO** (Group Relative Policy Optimization, introduced in DeepSeekMath) works like this: sample a group of G answers to the same problem, score them with the verifier, and compute each answer's advantage by comparing it with "the rest of its group":

> advantage = (this answer's reward − group mean) ÷ group standard deviation

The group mean replaces PPO's value model as the baseline, saving the memory of a whole large model. Dividing by the standard deviation keeps the advantage on a similar scale for every problem, so hard and easy problems send signals of the same size.

**Example.** The example problem is sampled 8 times: 5 correct (reward 1), 3 wrong (reward 0):

| | Reward | Minus mean 0.625 | Divided by std 0.484 |
|---|---|---|---|
| The 5 correct | 1 | +0.375 | +0.775 |
| The 3 wrong | 0 | −0.625 | −1.291 |

The standard deviation is the population standard deviation. When rewards are only 0 and 1, std = √(fraction correct × fraction wrong), here √(0.625 × 0.375) ≈ 0.484. Check: 5 × 0.775 ≈ 3 × 1.291, so the positives and negatives cancel and the mean is 0. This advantage is applied to every token of the answer: a correct answer is reinforced as a whole, a wrong one is pushed down as a whole.

**A group with equal scores gives no signal.** When all 8 are correct or all wrong, every answer equals the mean, every advantage is 0, and the problem provides no reward signal (with β > 0, only the KL term remains, pulling the model back toward the reference model). So problems that are too easy or too hard waste compute; problem difficulty has to match the model's current level.

**How reasoning models emerged.** DeepSeek-R1-Zero was trained with GRPO directly on a base model, with a reward that looked only at whether the answer was correct and well formatted. During training, answers grew longer and longer, and the model learned on its own to lay out steps, check them, and start over when it found a mistake. Nobody taught it to write this way; writing this way simply made it more likely to be right. A model that "thinks at length before answering" like this is a reasoning model. But this doesn't come automatically with RLVR: you need a strong enough base model, lots of problems at the right difficulty, and a reliable verifier. For small models, distilling from a strong model often works better (see later).

Reasoning tokens must be generated, so they add inference cost and latency (cost → [S5 Inference and Serving](/en/stages/s05-inference/); application use → [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)). The gains are mainly on verifiable tasks; writing and conversation may not improve.

<details class="deep">
<summary>Going deeper: the GRPO objective and its variants</summary>

- **Advantage**: Â_i = (r_i − mean(r)) ÷ std(r). When only the final answer is judged (outcome supervision), every token of the same answer uses the same Â_i.
- **Objective**: for the G answers, at each token t of each answer o_i, use the same clipping as PPO: min(ρ_{i,t}·Â_i, clip(ρ_{i,t}, 1 − ε, 1 + ε)·Â_i), where ρ is the new-to-old policy probability ratio for that token. Average over tokens within each answer first (divide by |o_i|), then average over the G answers.
- **KL in the loss**: PPO-style RLHF often adds the KL to the reward; GRPO instead puts β·D_KL(π_θ ‖ π_ref) directly into the objective: subtracted when written as an objective to maximize, added when written as a loss to minimize. The KL uses an estimator that needs no extra sampling and is always non-negative: π_ref / π_θ − log(π_ref / π_θ) − 1 (computed per token).
- **Dr. GRPO**: dividing by the standard deviation amplifies problems that are almost all correct or almost all wrong, so it drops that step.
- **DAPO**: decouples the lower and upper clipping bounds and loosens the upper one (clip-higher, which keeps the model from losing diversity too fast); dynamic sampling (filters out problems whose whole group scored the same); token-level loss averaging (long answers aren't diluted by dividing by their length); a penalty for overlong answers; and it drops the KL term.
- **GSPO**: computes the probability ratio over the whole sequence (normalized by length) instead of per token, and clips at the sequence level too. The paper reports this makes training more stable, especially for MoE models.
- **Group size G**: the larger G is, the lower the chance of "the whole group scoring the same" and the more accurate the baseline, but the sampling cost per problem grows linearly. Common settings range from a few to a few dozen.

</details>

### ★ Can you get more accuracy without changing the model?

You can spend more compute at inference time (test-time compute) to improve quality. Measure both the extra tokens and the accuracy gain.

**Self-consistency**: sample the same problem several times with temperature above 0 (temperature ← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-is-the-next-token-picked)) and take the most frequent answer. Sample the example problem 8 times and you get 29 four times, 31 twice and 24 twice; the majority vote picks 29. Even if a single attempt is right only half the time, wrong answers tend to scatter across different numbers, so the right one is more likely to end up the most common.

**Best-of-N and verifiers**: sample N times and use a verifier (a rule-based checker or a reward model) to pick the highest-scoring answer. With a reliable verifier (for example, code that can run tests), this works better than a majority vote.

Sampling costs grow roughly linearly, but accuracy gains diminish. Going from 1 to 8 samples may help substantially; 8 to 64 usually helps less. If the model is systematically wrong, majority voting can make it wrong more consistently. The core exercise measures the first two points on this curve.

<details class="deep">
<summary>Going deeper: scoring each step and search</summary>

A **process reward model (PRM)** scores each step of the reasoning, not just the final answer. It can guide a search: for example, generate a few candidates at each step and keep extending the high-scoring ones (beam search or tree search).

</details>

### ★ Why do models game the reward?

Whenever the reward is a proxy, the model may find a shortcut that "scores high without achieving the real goal."

**Reward hacking**: back to the example, suppose the verifier only checks whether "29 appears" in the answer. The model may learn to write "The answer might be 24, 29 or 31," listing a string of numbers for every problem. It scores high, and nothing gets solved. For coding tasks judged only by whether the tests pass, the model may learn to edit the tests or hard-code the answers; if the reward model prefers long answers, the model writes longer and longer. The fix is to bring the reward closer to the real goal: take only the number after the last "Answer:", give 0 for multiple answers, use hidden tests, cap the length.

**Over-optimization**: optimizing too hard against a reward model. Early in training, the reward model's score and the true quality rise together; later the proxy score keeps rising while the true quality starts to fall, because the model has found the regions where the reward model judges wrong. A KL penalty and early stopping are common mitigations, but you can only see the problem with an independent evaluation (not the reward model used for training).

**Sycophancy**: the model tends to agree with the user and say what the user wants to hear. The user says "I got 31, right?" and the model goes along: "Yes, it's 31." Part of the cause is the preference data itself: when people compare answers, they tend to rate answers that agree with them higher, and preference learning amplifies that tendency.

**Common misconception: reward hacking means the model "wants to cheat."** It's just optimizing the score you gave it; the gap between the score and the goal is the actual problem. These concepts appear for the first time in this chapter, and you'll meet them again in judges in [S8 Evals Methodology](/en/stages/s08-evals/), personalized flattery in [S13 Memory and Personalization](/en/stages/s13-memory/), agent optimization in [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), and safety in [S16 Security and Governance](/en/stages/s16-security/).

### ★ How does a small model learn from a big one?

Using a strong model to generate training data and then training a smaller model on it is one of the cheapest ways to make a small model stronger.

A common way to do **distillation**: have a strong teacher model write worked solutions for a large number of problems, filter out the wrong ones with a verifier, and use what's left as SFT data for the student model. For example, the teacher solves each of 5,000 word problems once, and the 4,000 correct solutions are used to train the student. DeepSeek-R1 did exactly this to distill reasoning ability into smaller Qwen and Llama models; they also found that for small models, distillation often works better than doing RL directly.

Synthetic data inherits the teacher's mistakes and preferences. Using it heavily may also reduce output diversity. Before using a model's output to train another model, check that its license permits it (→ [S16 Security and Governance](/en/stages/s16-security/)).

<details class="deep">
<summary>Going deeper: on-policy distillation</summary>

**On-policy distillation** has the student write its own answers, and the teacher gives feedback on every token (how likely the teacher thinks that token is). The student learns to "fix the mistakes it actually makes," not just to imitate the teacher's polished examples.

</details>

### ★ How do you know fine-tuning worked?

Every fine-tuning step has to answer "Is it better than the base? By how much?", and the answer has to come with an error range.

**Use problems the model hasn't seen.** Prepare held-out problems the model didn't see during training. Where there's a reference answer (math problems, say), compute accuracy. Where there isn't (answer quality, say), compute the **win rate**: have people or a judge model compare answers from before and after fine-tuning pair by pair, and see what fraction the new model wins (→ [S8 Evals Methodology](/en/stages/s08-evals/)). Always compare against the base and the previous step; never report a single absolute number on its own.

**Attach a confidence interval.** Say on 50 problems the base gets 30 right (60%) and the SFT model gets 32 right (64%). The standard error of 60% on 50 problems is √(0.6 × 0.4 ÷ 50) ≈ 6.9 percentage points, and the 95% confidence interval is about 2 standard errors (1.96 to be exact), or ±13.6 percentage points. A 4-point difference is quite possibly just noise (how to compute the standard error: [Math Refresher](/en/guide/math-refresher/#mean-variance-and-standard-error); bootstrap: [Math Refresher, "Bootstrap confidence intervals"](/en/guide/math-refresher/#bootstrap-confidence-intervals); the full statistical methods are in S8 Evals Methodology).

**Check the abilities you didn't train.** Math got better, but did chat and writing get worse? When fine-tuning on a new task makes old abilities regress, that's called catastrophic forgetting.

Public benchmark problems have very likely appeared in the pretraining data (data contamination, ← [S3 Pretraining and Scaling](/en/stages/s03-pretraining/)), so their scores are useful only for relative comparison. Small test sets you choose or write yourself can also favor the model unintentionally.

<section class="deep-section">

### ○ What other ways are there to change a model?

Fine-tuning on a new task can make old abilities regress (catastrophic forgetting). Common mitigations are mixing some general data into the fine-tuning data, or using LoRA to limit how much changes. Model editing tries to change just one piece of the model's knowledge (say, a president's term of office) without affecting anything else. Model merging combines the weights of several models fine-tuned from the same base directly (a weighted average, for example), producing a model with several abilities without retraining. The theory behind preference learning (when the Bradley–Terry assumptions fail, how to aggregate different people's preferences, and other social choice questions) is covered fully in [Stanford CS329H](https://web.stanford.edu/class/cs329h/).

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** Which training signal (examples of ideal answers, comparisons between two answers, automatic checking by a program) best fits each of these three goals? (a) Make the model always reply with fixed JSON fields; (b) make answers friendlier and less wordy; (c) make the model better at coding problems that have unit tests.

<details class="hint">
<summary>Check your answer</summary>

(a) Examples (SFT): format is behavior, and examples are the most direct way to teach it. (b) Comparisons (preference learning): "friendly" has no single reference answer, but people are good at comparing. (c) Automatic checking (RLVR): tests decide right or wrong automatically, with no human needed.

</details>

**2.** A problem is sampled 4 times with rewards 1, 1, 1, 0. Compute each answer's GRPO advantage by hand (population standard deviation) and confirm the mean is 0.

<details class="hint">
<summary>Check your answer</summary>

Mean 0.75, std √(0.75 × 0.25) ≈ 0.433. The three correct ones: 0.25 ÷ 0.433 ≈ +0.577; the wrong one: −0.75 ÷ 0.433 ≈ −1.732. Check: 3 × 0.577 − 1.732 ≈ 0. When only one attempt is wrong, that one gets pushed down especially hard.

</details>

### Core: Self-consistency and group-relative advantage

**Goal**: measure the payoff of test-time compute yourself, and write the single most central calculation in GRPO.

**Steps**
1. Write a function `groupAdvantages(rewards: number[][])`: the input is several groups of rewards (each group is G answers to the same problem), and the output is each answer's advantage = (reward − group mean) ÷ (group std + ε). Use the population standard deviation for the group (divide by G, not G − 1), and ε = 1e-6.
2. Write unit tests for it covering three cases, "whole group correct," "whole group wrong" and "half right, half wrong," and write one sentence on what "the whole group scoring the same" means for training.
3. Take the first 50 problems of the `test` split of the `main` config of [GSM8K](https://huggingface.co/datasets/openai/gsm8k) (note: this dataset has very likely appeared in the model's training data, so the score is only good for relative comparison).
4. Pick a small model that lets you set temperature: run [Qwen3](https://ollama.com/library/qwen3) 0.6B or 1.7B locally with Ollama or llama.cpp, or use another provider or model whose docs explicitly say it supports `temperature`. Claude models don't accept `temperature` in the current API version (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)).
5. Sample each problem 8 times at temperature 0.7 and parse the final number from each answer. 50 problems × 8 samples = 400 generations, which may take one to several hours on a laptop; do a trial run on 5 problems first to estimate the time.
6. Compute two accuracies: using only the first sample (N = 1), and an 8-sample majority vote (N = 8). Compute 95% confidence intervals with the bootstrap; the ten-line version in [Math Refresher, "Bootstrap confidence intervals"](/en/guide/math-refresher/#bootstrap-confidence-intervals) is enough (S8 Evals Methodology teaches it fully).
7. Record the total token count of both approaches.

**Acceptance criteria**
- All tests for the advantage function pass: for groups with differing scores, the advantages within a group have a population standard deviation of about 1 and a mean of about 0 (std off by < 1e-3 because of ε, mean off by < 1e-9); groups with equal scores output all 0 (floating-point error < 1e-9 is fine).
- A table: accuracy, 95% confidence interval, total tokens and token multiple for N = 1 and N = 8.
- A paragraph of conclusions: do the two confidence intervals overlap? Were the extra tokens worth it?

**Hints**
- TypeScript: Ollama has an HTTP API and also an OpenAI-compatible endpoint, so you can use `fetch` or the OpenAI SDK directly; the bootstrap is a dozen or so lines you write yourself.
- Python: the `ollama` or `openai` package; GSM8K is available through Hugging Face `datasets`.
- Qwen3 outputs its thinking first by default, which makes token counts much larger; use the same mode for both approaches when you compare. With Ollama's `/api/chat`, pass `"think": false` to turn off the thinking output.
- If you get stuck:
  - Reread: [How are reasoning models trained?](#-how-are-reasoning-models-trained) (the advantages you computed by hand make good test cases), [Can you get more accuracy without changing the model?](#-can-you-get-more-accuracy-without-changing-the-model), [How do you know fine-tuning worked?](#-how-do-you-know-fine-tuning-worked)
  - Further: the GRPO formula section of the DeepSeekMath paper, the original self-consistency paper

<section class="deep-section">

### Advanced: Model project M4: SFT → LoRA → DPO → GRPO on a small Qwen3

**Goal**: take a real small model through the whole post-training pipeline, with evidence backed by confidence intervals for every step.

**Steps**
1. Start from [Qwen3-0.6B-Base](https://huggingface.co/Qwen/Qwen3-0.6B-Base) (or 1.7B-Base). Prepare the eval set first: at least 100 held-out instruction prompts (for win rate) and at least 100 math problems (for accuracy). Use the same evals at every step.
2. **SFT**: do full-parameter SFT on a public instruction dataset, and confirm training and inference use the same chat template.
3. **LoRA**: redo it with LoRA on the same data, and compare the trainable parameter fraction, peak memory, training time and results.
4. **DPO**: on the post-SFT model, run DPO on a public preference-pair dataset.
5. **GRPO**: run GRPO on math problems, with a reward function of "is the final answer correct" plus a simple format check.
6. At every step, compare against the base and the previous step, read the model's outputs carefully, and record at least one instance of reward hacking or sycophancy.

**Acceptance criteria**
- A table: win rate (against the base) or math accuracy for base, SFT, LoRA, DPO and GRPO, all with 95% confidence intervals.
- The trainable parameter fraction and peak memory of LoRA and full SFT side by side.
- A write-up of one instance: the model's input and output, why it counts as reward hacking or sycophancy, and how you'd change the reward or the data.
- The settings of every experiment (dataset, hyperparameters, seed) are recorded so it can be rerun.

**Hints**
- Python: Hugging Face [TRL](https://huggingface.co/docs/trl) (there's a trainer for each of SFT, DPO and GRPO) and [PEFT](https://huggingface.co/docs/peft) (LoRA). Start with a simple version of the win-rate judge; S8 Evals Methodology teaches how to calibrate it.
- **Compute**: this step needs an NVIDIA GPU. You can rent one from Colab, Modal, Lambda and the like. All of M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 ([how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)) is estimated in the tens of dollars, but that depends heavily on model size, data volume and implementation efficiency, so **measure with a small setup before scaling up**. Mac MPS is only recommended for the first three model project steps, M1–M3 (micrograd and the MLP, tiny GPT, small-model pretraining), not for this one. See [Model Project (M1–M5)](/en/projects/model-thread/).
- If you get stuck:
  - Reread: [SFT](#-how-do-you-teach-a-model-to-answer), [LoRA](#-how-does-lora-save-memory), [preference learning](#-how-do-you-teach-without-a-right-answer), [GRPO](#-how-are-reasoning-models-trained), [reward hacking](#-why-do-models-game-the-reward)
  - Further: the TRL examples in chapters 11–12 of the Hugging Face LLM Course

</section>

## Self-check

1. What's the typical difference between a base model's and an instruct model's answer to the same question? Which training stage causes the difference?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a base model just keeps writing (for example, with the next problem); SFT teaches it to "answer" and stop at the end. **Common mistake**: thinking the base model can't do the math; it usually can, it just doesn't know it should answer. **Reread**: [One example, end to end](#-one-example-end-to-end)

   </details>

2. Which parts of RLHF does DPO drop? What price or limitations does it pay?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: it drops the reward model and the RL loop (sampling, value model); the price is offline learning, no exploration, and worse results when the preference data is far from the model's output. **Common mistake**: thinking DPO has no cost and is fully equivalent to RLHF. **Reread**: [How do you teach without a right answer?](#-how-do-you-teach-without-a-right-answer)

   </details>

3. In GRPO, if all 8 answers to a problem are correct, what does that problem contribute to training?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: every answer equals the group mean, every advantage is 0, so there's no signal from the reward; with β > 0, only the KL term still produces an update. **Common mistake**: thinking all-correct gets "reinforced once more." **Reread**: [How are reasoning models trained?](#-how-are-reasoning-models-trained)

   </details>

4. Give an example of reward hacking, and explain how you'd design the reward to prevent it.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the example should be "high score without achieving the goal," and the fix should narrow the gap between score and goal (for example, take only the last answer, give 0 for multiple answers, use hidden tests). **Common mistake**: describing it as the model "wanting to cheat." **Reread**: [Why do models game the reward?](#-why-do-models-game-the-reward)

   </details>

5. Scenario: a colleague fine-tuned a customer support model. On 40 test questions they picked themselves, accuracy went from 70% to 78%, and they want to ship it right away. What would you ask first?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: are the questions held out, did they pick them themselves, was the base compared on the same questions; the 95% confidence interval on 40 questions is about ±14 percentage points. **Common mistake**: taking the 8 points as real improvement. **Reread**: [How do you know fine-tuning worked?](#-how-do-you-know-fine-tuning-worked)

   </details>

6. Why does SFT usually compute loss only on the assistant's answers? What happens if the chat template at inference differs from the one used in training?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the goal is to learn answering, not question writing; with a different template the model sees unfamiliar text, and performance drops without any error. **Common mistake**: thinking a slightly different template doesn't matter. **Reread**: [How do you teach a model to answer?](#-how-do-you-teach-a-model-to-answer)

   </details>

7. Apply LoRA with r = 16 to a 4096 × 4096 matrix. How many trainable parameters are there, and roughly what percentage of the original matrix is that?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: A is 16 × 4096 and B is 4096 × 16, for 131,072 in total, about 0.78% (twice the r = 8 case). **Common mistake**: counting only A or only B. **Reread**: [How does LoRA save memory?](#-how-does-lora-save-memory)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original derivations or want to code along with someone line by line. None of it is required.

### Code along

- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — chapters 6–7 (classification fine-tuning, instruction fine-tuning) and the DPO bonus in chapter 7. Write a chat template and loss masking from scratch once.
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) — chapters 11–12: SFT and GRPO with TRL, which map directly to M4 SFT → LoRA → DPO → GRPO on a Small Qwen3.
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) — a curated set of links in sections 3–6 of the Scientist part (post-training datasets, SFT, preference alignment, evaluation); good for finding tools and datasets.

### Original papers

- [Shao et al. 2024, DeepSeekMath](https://arxiv.org/abs/2402.03300) — where GRPO comes from. Read the RL section for the full objective and the comparison with PPO.
- [Rafailov et al. 2023, Direct Preference Optimization](https://arxiv.org/abs/2305.18290) — the original DPO paper, with the full derivation.
- [Lambert et al. 2024, Tülu 3](https://arxiv.org/abs/2411.15124) — a fully open post-training recipe: SFT → DPO → RLVR, with data and code released. See real-scale hyperparameters and data mixes.
- [Zhou et al. 2023, LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) — how far SFT on 1,000 curated examples can go.
- [Hu et al. 2021, LoRA](https://arxiv.org/abs/2106.09685), [Dettmers et al. 2023, QLoRA](https://arxiv.org/abs/2305.14314) — the original parameter-efficient fine-tuning papers.
- [Wang et al. 2022, Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171), [Lightman et al. 2023, Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) — self-consistency and PRMs.
- [Yu et al. 2025, DAPO](https://arxiv.org/abs/2503.14476), [Zheng et al. 2025, Group Sequence Policy Optimization](https://arxiv.org/abs/2507.18071) — two common GRPO variants.

### Survey posts

- [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) (2024-11-28) — many reward hacking examples and a research survey; read the sections on RLHF and LLMs.
- [Lilian Weng: Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/) (2025-05-01) — a survey of research on test-time compute and reasoning.

### Courses

- [Stanford CS224N](https://web.stanford.edu/class/cs224n/) — the lectures on post-training and reasoning.
- [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) — test-time compute, verifiers.
- [Stanford CS329H](https://web.stanford.edu/class/cs329h/) — the theory of preference learning.
- [Harvard CS 2881R AI Safety](https://boazbk.github.io/mltheoryseminar/) — further reading on reward hacking and model specs.

</section>
