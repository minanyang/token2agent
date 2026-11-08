---
title: Math Refresher
head:
  - tag: title
    content: 'AI Math Refresher: Softmax, Standard Error and Cosine | Token2Agent'
description: 'Six math and statistics tools you need for AI and LLMs: the chain rule, softmax, log plots, standard error, bootstrap confidence intervals and cosine similarity, each with a small example you can work by hand.'
sidebar:
  order: 4
---

This page isn't a math course. It's a place to come back to when you've forgotten something. Each section gives the intuition first, then a small example you can check with a calculator, and finally which chapters use it. If you can follow the example, you know enough to read those chapters.

## The chain rule and backprop

**Intuition**: if y depends on u and u depends on x, then when x moves a tiny bit, the rate at which y changes is "the rate of u with respect to x" times "the rate of y with respect to u": dy/dx = dy/du · du/dx.

**Example**: y = (2x + 1)² at x = 1. Let u = 2x + 1 = 3, so y = u² = 9. The local derivatives are dy/du = 2u = 6 and du/dx = 2, so dy/dx = 6 × 2 = 12. Check numerically: at x = 1.001 and 0.999, y is 9.012004 and 8.988004; the difference 0.024 ÷ 0.002 = 12.

**Why backprop is just this**: a model is a computation graph made of small operations like add, multiply and tanh. Each operation only needs to know its own local derivative. Backprop starts at the loss and walks the graph backwards, multiplying "gradient from upstream × local derivative" all the way down, which gives the gradient of the loss with respect to every parameter. The one extra rule to remember: when a value is used twice, the gradients coming back along the two paths are **added**. For example, with f = x · x, each path contributes x, so df/dx = x + x = 2x. The numerical check above ("nudge it up and down a little, then divide") is exactly the gradient check in the S1 Neural Network Basics core exercise.

**Used in**: [S1 Neural Network Basics](/en/stages/s01-neural-networks/) (autograd, gradient checks), [S2 Transformers and Decoding](/en/stages/s02-transformer/) (understanding how a Transformer is trained).

## Logits, softmax and temperature

**Intuition**: the model's last layer outputs one score for each token in the vocabulary, called a logit, which can be any real number. Softmax turns these scores into probabilities that sum to 1: take exp of each score, then divide by the total. A score difference of 1 means a probability ratio of e ≈ 2.72.

**Example**: three tokens have logits [2, 1, 0]. After exp they're [7.389, 2.718, 1], which sum to 11.107, so the probabilities are [0.665, 0.245, 0.090].

**Temperature** divides the logits by T before the softmax:

| T | logits ÷ T | Probabilities |
|---|---|---|
| 0.5 | [4, 2, 0] | [0.867, 0.117, 0.016] |
| 1 | [2, 1, 0] | [0.665, 0.245, 0.090] |
| 2 | [1, 0.5, 0] | [0.506, 0.307, 0.186] |

The smaller T is, the sharper the distribution (as it approaches 0 you always pick the top token, which is greedy decoding); the larger T is, the flatter it gets.

**Two implementation details**:
- Before taking exp, subtract the maximum from every logit. The result is the same, but it prevents exp from overflowing when T is small.
- The cross-entropy loss used in training is just −ln(probability of the correct token). In the example above, if the correct answer is the first token, loss = −ln 0.665 ≈ 0.41. Guessing uniformly at random over 27 characters gives each a probability of 1/27, so loss = ln 27 ≈ 3.30. That's the "initial loss should be close to this" value from S1 Neural Network Basics. The logprobs an API returns are also just ln(probability) from here.

An API's `temperature` parameter is this T, but some APIs no longer accept these parameters (for example, Claude returns a 400 if you send `temperature`; see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)). For exercises that need you to tune T, use a local model (Ollama, llama.cpp).

**Used in**: [S1 Neural Network Basics](/en/stages/s01-neural-networks/) (cross-entropy, perplexity), [S2 Transformers and Decoding](/en/stages/s02-transformer/) (the decoding and sampling core exercise), [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (sampling multiple times), [Model Crash Course](/en/guide/app-first/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S8 Eval Methodology](/en/stages/s08-evals/) (logprobs and calibration).

## Log scales and log–log plots

**Intuition**: on a log axis, equal spacing means "equal ratio", not "equal difference". 1 → 10 → 100 → 1000 are evenly spaced on the axis.

**Why scaling curves use log–log plots**: scaling laws usually take the form of a power law, L = a · C^(−b) (L is the loss, C is compute). Taking the log of both sides gives log L = log a − b · log C, which on a log–log plot is a straight line with slope −b. So:
- A straight line means "every time compute is multiplied by a fixed factor, the loss is multiplied by a fixed ratio."
- The steeper the slope, the more you get for added compute.
- When the curve starts bending up away from the line, it usually means some resource (data, model size) has run short.

**Example**: if b = 0.05, multiplying compute by 10 makes the loss 10^(−0.05) ≈ 0.89 of what it was, a drop of about 11%. Multiply by 10 again (100× in total) and it drops about another 11%. That's why "a little better" often costs an extra order of magnitude of compute.

**Loss and perplexity**: perplexity = exp(loss), so a *difference* in loss corresponds to a *ratio* in perplexity. When loss drops from 2.0 to 1.9, perplexity drops from 7.39 to 6.69. Throughout this roadmap ln is the natural log; a log–log plot can use log10 or ln, and the slope is the same.

**Used in**: [S1 Neural Network Basics](/en/stages/s01-neural-networks/) (perplexity), [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) (scaling laws, the log–log plot in M3 Small-model Pretraining and a Mini Scaling Experiment).

## Mean, variance and standard error

**Intuition**: the score you measure on n questions is only an estimate; a different batch of questions would give a different number. The standard error (SE) answers "how much is this estimate likely to wobble?"

**Formulas**:
- Mean = sum ÷ n.
- Variance = the average of the squared differences between each value and the mean; standard deviation = √variance. Dividing by n gives the population standard deviation, dividing by n − 1 the sample standard deviation. When n is small the two differ a lot (with only 2 values they differ by a factor of √2), so say which one you mean when you write tests.
- Standard error of the mean = standard deviation ÷ √n. For a 0/1 score like a pass rate p, the standard deviation is √(p(1 − p)), so SE = √(p(1 − p) / n).
- A 95% confidence interval is roughly "estimate ± 1.96 × SE".

**Example**: 50 questions, pass rate 0.8. SE = √(0.8 × 0.2 / 50) = √0.0032 ≈ 0.057, so the 95% confidence interval is about ±11 percentage points, or 69%–91%. Quadruple the questions (200) and the SE only halves (about ±5.5 percentage points). So to see a difference of a few percentage points, you usually need hundreds of questions.

**Used in**: [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (the within-group standard deviation in GRPO, comparing self-consistency), [S8 Eval Methodology](/en/stages/s08-evals/) (the statistics section).

## Bootstrap confidence intervals

**Intuition**: when you don't want to derive a formula, have the computer simulate "if I drew a new batch of questions, how would the score change?" Treat your n questions as the whole population, resample from them repeatedly, and see how much the metric wobbles.

**Method**:
1. You have n questions, each with a score (say 1 for correct, 0 for wrong).
2. Draw n questions at random with replacement (the same question can be drawn several times, and some won't be drawn at all), and compute the metric once.
3. Repeat B times (1,000–10,000).
4. Sort the B results and take the 2.5th and 97.5th percentiles; that's the 95% confidence interval.

```text
results = []
repeat B times:
    sample = pick n items from scores, with replacement
    results.append(metric(sample))
sort(results)
ci = (results[0.025 * B], results[0.975 * B])
```

**Example**: 40 of 50 questions correct (80%). The bootstrap 95% interval comes out at roughly 68%–90%, close to the formula result in the previous section. When a formula exists, the two agree; the advantage of the bootstrap is that it works just as well when the metric is median latency, F1, majority-vote accuracy or Recall@k.

**To compare two versions**, use a **paired** bootstrap: run both versions on the same questions, resample *question IDs* each time, and compute the difference between their scores. Variation from question difficulty cancels out, and the interval gets much narrower. Only when the interval for the difference excludes 0 can you be confident there's a real difference.

**When it doesn't apply**:
- With too few questions (say fewer than 20), the interval isn't reliable. Just say "the sample is too small" instead of reporting a number that looks precise.
- When a pass rate is all correct or all wrong, every resample gives the same result and the interval collapses to a point: 50 out of 50 correct gives [100%, 100%]. The true pass rate is still uncertain, so use a Wilson interval instead: for 50 out of 50, the 95% interval is about [92.9%, 100%]. Close to all correct or all wrong (say 49/50), the bootstrap interval doesn't collapse but tends to be too narrow, so a Wilson interval is still the better choice.
- When questions aren't independent (for example, one conversation split into several questions), resample whole groups together, not individual questions.

**Used in**: [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (comparing N = 1 vs. N = 8), [S8 Eval Methodology](/en/stages/s08-evals/) (judge pass rates), [S9 Retrieval and RAG](/en/stages/s09-rag/) (Recall@k), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S18 Deployment and Architecture](/en/stages/s18-deployment/).

## Dot product and cosine similarity

**Intuition**: the dot product of two vectors multiplies matching positions and adds them up. The more the directions agree and the longer the vectors, the larger the dot product. Cosine similarity divides out the lengths and looks only at direction: 1 is the same direction, 0 is unrelated (perpendicular), −1 is opposite.

**Formulas**: a · b = Σ aᵢbᵢ; cos(a, b) = (a · b) ÷ (|a| × |b|), where |a| = √(a · a).

**Example**: a = [1, 2, 0], b = [2, 1, 1]. Dot product = 2 + 2 + 0 = 4; |a| = √5 ≈ 2.236, |b| = √6 ≈ 2.449; cosine = 4 ÷ 5.477 ≈ 0.73.

**Two uses in this roadmap**:
- **Attention**: the dot product between a query and each key serves as the similarity score (divided by √dimension so the values don't get too large and make the softmax too sharp), and softmax turns the scores into weights.
- **Embedding retrieval**: the query and each passage are turned into vectors and ranked by cosine similarity. If the vectors are normalized to length 1 first, cosine equals the dot product, which is why many vector databases just use the dot product.

Note: the absolute value of cosine similarity varies by embedding model. A threshold like "0.8 counts as similar" doesn't carry over between models; look at the distribution on your own data before you pick one.

**Used in**: [S2 Transformers and Decoding](/en/stages/s02-transformer/) (self-attention), [S9 Retrieval and RAG](/en/stages/s09-rag/) (dense retrieval), [S13 Memory and Personalization](/en/stages/s13-memory/) (memory retrieval).
