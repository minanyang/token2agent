---
title: S1 Neural Network Basics
head:
  - tag: title
    content: "Neural Networks from Scratch: Loss, Gradients and Backprop (S1) | Token2Agent"
description: How a neural network learns, from loss, gradients and backprop to optimizers. Write an autograd engine from scratch and learn to read loss curves to diagnose a learning rate that's too high, bad initialization and overfitting.
sidebar:
  order: 1
  label: S1 Neural Network Basics
---

:::note[This chapter]
**Prerequisites**: [S0 AI Systems Overview](/en/stages/s00-big-picture/). The main lecture needs no programming or calculus background. The core exercise requires basic Python or TypeScript and the expandable explanations of the chain rule and autograd. For the chain rule, see the [Math Refresher](/en/guide/math-refresher/#the-chain-rule-and-backprop)

**Next**: → [S2 Transformers and Decoding](/en/stages/s02-transformer/)
:::

:::tip[Concepts route: key points]
- A model "learns" because there's a score for how wrong it is, and its parameters get nudged bit by bit to make it less wrong.
- That score won't, and shouldn't, reach zero. A score near zero usually means the model is memorizing the answers.
- Rerun from a different random starting point and the results shift a little. When comparing, a difference smaller than that noise doesn't count.
:::

## What this chapter covers

How was the model from S0 AI Systems Overview trained? Part I Models (S1–S5) starts with the training loop: measure prediction error with a loss, compute a gradient for each parameter, take a small step to reduce the loss, and repeat tens of millions of times. The running task is predicting the next character of a name. It uses the same training objective as an LLM, at a scale you can run on a laptop.

## After this chapter you can

- Say what each of the four steps of the training loop does, and estimate loss and perplexity from "the probability given to the correct answer." (lecture and self-check)
- Explain backprop as "multiplying rates," and look at a loss curve and name the likely problem (learning rate too high, bad initialization, overfitting). (lecture and self-check)
- Write a scalar autograd from scratch, verify it with numerical gradients, and plot for yourself what the loss curve looks like when the learning rate is too high. (core)
- Train a small character-level language model, say what its loss and perplexity mean, and spot saturation from activation histograms. (advanced)
- Compare several hyperparameter settings with an experiment tracker. (advanced)

## Lecture

Neural network training follows this loop:

1. **Forward**: feed one example into the model and get a prediction.
2. **Compute the loss**: one number that says how wrong the prediction was.
3. **Backward**: compute each parameter's gradient, i.e. "if this parameter goes up a little, does the loss go up or down, and how fast?" This step is called backprop.
4. **Update**: move each parameter a small step in the direction that lowers the loss. How it moves is up to the optimizer.

Return to step 1, train for a fixed number of steps, and periodically check the loss on validation data that wasn't used for training (→ [early stopping](#-what-if-the-model-is-memorizing)). The sections below explain the task and loss, gradients, optimizer updates, and how to diagnose a run that isn't learning.

### ★ What does the model learn, and how is it scored?

A language model does one thing: given what came before, output a probability distribution over the next unit. For an LLM the unit is a token (→ [S2 Transformers and Decoding](/en/stages/s02-transformer/)); in this chapter it's a character.

**Example: the next character of a name.** The data is about 32,000 English names (`names.txt` from [makemore](https://github.com/karpathy/makemore)). The character set is the 26 lowercase letters plus a symbol `.` that marks "start / end," 27 in total. The name `emma` becomes 5 practice questions:

| Context so far | Predict |
|---|---|
| `.` | e |
| `.e` | m |
| `.em` | m |
| `.emm` | a |
| `.emma` | `.` (end) |

**The simplest model: bigram.** Look only at the previous character and estimate probabilities from a count table: count what follows `m` across the whole dataset. Suppose (illustrative numbers) that after `m` comes a 40% of the time, i 15%, e 15%, end 10%, m 5%, and all other letters 15% combined. The model uses those proportions as its predicted probabilities.

**Loss: the lower the probability on the correct answer, the bigger the penalty.** The loss for each question is −ln(probability the model gave the correct answer), called the cross-entropy loss. You don't need to derive it; just remember this table:

| Probability on the correct answer | 1 | 0.5 | 0.25 | 0.1 | 1/27 | 0.01 |
|---|---|---|---|---|---|---|
| loss | 0 | 0.69 | 1.39 | 2.30 | 3.30 | 4.61 |

For question 3 of `emma` (`m` followed by m), the model gives only 0.05, so the loss is −ln 0.05 ≈ 3.00. For question 4 (`m` followed by a) it gives 0.40, so the loss ≈ 0.92. The loss over the whole dataset is the average over all questions. The 1/27 column matters: guessing uniformly at random among 27 characters gives a loss ≈ 3.30, which is where a model that hasn't learned anything yet should start.

**Perplexity: "how many options is it torn between?"** Perplexity = e raised to the (average loss). If the model gives the correct answer 0.25 on every question, the loss is 1.39 and the perplexity is 4: the model is as confused as if it were guessing uniformly among 4 characters each time. Pure random guessing gives a perplexity of 27. A *difference* in loss corresponds to a *ratio* in perplexity: loss going from 2.0 to 1.9 takes perplexity from 7.39 to 6.69 (← [Math Refresher: log scales](/en/guide/math-refresher/#log-scales-and-loglog-plots)).

**From a count table to a neural network.** A count table can only look at the previous character. To look at the previous 3, there are 27³ combinations, most of which barely appear in the data, so the counts aren't reliable. A neural network does this instead:

- Each character maps to a small learned vector (for example, 10 numbers), called an **embedding**. Characters that behave alike (such as vowels) end up with similar vectors after training.
- Concatenate the embeddings of the previous 3 characters (30 numbers), pass them through a hidden layer, and output 27 scores, one per character, called **logits**.
- **Softmax** turns the 27 scores into probabilities that sum to 1: a higher score means a higher probability, and a score difference of 1 means a probability ratio of about 2.72 (2.72 is e; ← [Math Refresher: softmax](/en/guide/math-refresher/#logits-softmax-and-temperature)).

**What a layer does: weighted sums, i.e. matrix multiplication.** Each neuron in the hidden layer does two things: it multiplies every input by its own weight and adds them up (plus a constant called the bias), then passes that weighted sum through tanh, which squashes it into −1 to 1. A layer has many neurons, each with its own set of weights. Stack those weights row by row into a table (a matrix) and you can compute all the layer's weighted sums at once. That operation is **matrix multiplication**. A small example: the input is 3 numbers [1, 2, 3], the layer has 2 outputs, and the weight matrix is 2 × 3:

| | Weight on input 1 | Weight on input 2 | Weight on input 3 | Weighted sum |
|---|---|---|---|---|
| Output 1 | 1 | 0 | −1 | 1×1 + 2×0 + 3×(−1) = −2 |
| Output 2 | 0.5 | 0.5 | 0.5 | 1×0.5 + 2×0.5 + 3×0.5 = 3 |

The output is [−2, 3]: each output is one weighted sum of the inputs, and each row of the matrix is one set of weights. The hidden layer in M1 makemore MLP is the same thing with 30 inputs and 200 outputs, and the output layer has 200 inputs and 27 logits (that's the advanced exercise, which is optional; see [what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)). Most of the computation in next chapter's Transformer is this kind of matrix multiplication too (→ [S2 Transformers and Decoding](/en/stages/s02-transformer/)).

You'll build this language model in M1 makemore MLP. Its embeddings and layer weights are parameters, initialized randomly and adjusted by the training loop. The LLMs in later chapters are larger, more capable next-token predictors.

The loss will not and should not reach 0. Many letters can genuinely follow `m`; the data itself is uncertain. In a bigram setup that only sees one character, the best model can only reproduce the true proportions, so the loss has a floor (about 2.45 measured for the bigram). A training loss near 0 usually means the model is memorizing (see [overfitting](#-what-if-the-model-is-memorizing)).

<details class="deep">
<summary>Before you build: formulas, smoothing and the shape of the MLP</summary>

- **Formulas**: softmax is pᵢ = e^(zᵢ) ÷ Σⱼ e^(zⱼ), where zᵢ is the logit of character i. For a dataset of N questions, cross-entropy is L = −(1/N) Σ ln p(correct answer), and perplexity = e^L.
- **Smoothing**: a combination that never appeared in the count table has probability 0, and −ln 0 is infinite. The usual fix is to add 1 to every cell before computing proportions (add-one smoothing).
- **One linear layer + softmax equals the count table**: represent the previous character as a length-27 vector with a single 1 (one-hot), multiply by a 27 × 27 weight matrix, and the result just picks out one row as the logits. Train that matrix with gradient descent and it learns almost exactly the count-table probabilities, which is why the two versions in step 2 of M1 makemore MLP should have close val loss.
- **Shape of the MLP** (10-dimensional embeddings, hidden size 200): embedding table 27 × 10 = 270; hidden layer 30 × 200 weights plus 200 biases = 6,200; output layer 200 × 27 plus 27 = 5,427; 11,897 parameters in total.
- **Fewer than 3 characters of context**: pad the front with `.`, so the first question for `emma` is "`...` → e".

</details>

### ★ Which way should each parameter move?

The gradient tells each parameter which way to move and how fast. Backprop computes the gradients of all parameters in one pass: break the whole computation into small steps, have each step compute only its own "rate of change," then multiply backward from the loss.

**Measure the gradient the dumb way first: nudge the weight and watch the loss.** Shrink the bigram to the minimum: only two candidates, a and m, can follow `m`, and the correct answer for this question is a. The model has a single weight w, the score for a; m's score is fixed at 0. The computation has two steps:

- Step one: w goes through softmax and becomes p, the probability of a. With two candidates, p = eʷ ÷ (eʷ + 1). At w = 0 both scores are equal, so p = 0.5.
- Step two: p becomes loss = −ln p = 0.6931.

Nudge w to 0.01 (plug it into the formula with a calculator): p becomes 0.5025 and the loss becomes 0.6882, about 0.0050 lower. w moved 0.01 and the loss moved −0.005, a rate of about **−0.5**. That's the gradient of the loss with respect to w. The minus sign means raising w lowers the loss.

**Backprop: measure each step separately, then multiply.** You don't have to nudge from the start every time. Measure the rate of each step on its own:

| Step | Nudge | Resulting change | Local rate |
|---|---|---|---|
| w → p | w from 0 to 0.01 | p from 0.5 to 0.5025 | +0.25 |
| p → loss | p from 0.5 to 0.501 | loss from 0.6931 to 0.6911 | −2 |

Multiply the two local rates: 0.25 × (−2) = −0.5, the same as measuring directly. The intuition: when w moves a little, p moves 0.25 times as much; for each bit p moves, the loss moves −2 times as much; together that's −0.5. That's backprop. On the forward pass, record each operation; on the backward pass, start from the loss and pass "the rate coming back from later steps × my own local rate" all the way to every parameter. However big the model, there are just more steps and more branches. Each small operation (add, multiply, tanh, …) only needs to know its own local rate.

**When a value is used twice, the gradients from both paths add up.** Take y = x × x with x = 3. x affects y along two paths, and each path's local rate is the x on the other side, which is 3. So the gradient of y with respect to x is 3 + 3 = 6. Check: nudge x to 3.01 and y goes from 9 to 9.0601, a rate of about 6.01. If your code *overwrites* instead of *accumulating*, you get the wrong answer, 3. The core exercise specifically asks you to point to the line that handles this.

**Why not always use the nudging method?** The model in M1 makemore MLP (10-dimensional embeddings, hidden size 200) has about 12,000 parameters. Nudging each one means 12,000 extra forward passes. Backprop gets every gradient from a single backward pass, costing about twice a forward pass. The nudging method is still useful: it's the standard way to check that your backprop is correct, called a numerical gradient check.

Backprop computes the exact gradient, up to floating-point error. Nudging a parameter gives a numerical approximation. The results differ slightly, so the acceptance criteria use relative error rather than exact equality. A large difference usually points to a backprop bug.

<details class="deep">
<summary>Going deeper: writing it with the chain rule</summary>

The "local rate" above is the derivative, and "multiplying" is the chain rule (← [Math Refresher](/en/guide/math-refresher/#the-chain-rule-and-backprop)).

- With two candidates and one score w, p = 1 ÷ (1 + e^(−w)) and dp/dw = p(1 − p), which is 0.25 at w = 0.
- loss = −ln p, so d loss / dp = −1/p, which is −2 at p = 0.5.
- Chain rule: d loss / dw = p(1 − p) × (−1/p) = p − 1 = −0.5.
- In general: the gradient of softmax plus cross-entropy with respect to each logit is "predicted probability − correct answer," i.e. subtract 1 in the correct character's slot and 0 elsewhere. That's why implementations often fuse the two into one operation, which is also more numerically stable.

</details>

<details class="deep">
<summary>Before you build: the structure of an autograd engine</summary>

- **Each node stores**: its value, its gradient (initially 0), the input nodes that produced it, and a function that "multiplies my gradient by the local derivative and adds it to each input node's gradient."
- **Common local derivatives**: a + b is 1 for both a and b; a × b is b for a and a for b; aⁿ (n a constant) is n·aⁿ⁻¹; eᵃ is eᵃ; tanh(a) is 1 − tanh(a)²; a ÷ b can be written as a × b⁻¹, so you don't need a separate rule.
- **Backward order**: topologically sort the computation graph so that every user of a node is processed before its gradient is passed further back. Set the output node's gradient to 1.
- **Accumulate gradients with `+=`**: this is "used twice means add." It's also why you reset gradients to 0 at the start of every training step.
- **Central difference**: (f(x + h) − f(x − h)) ÷ 2h is far more accurate than the one-sided (f(x + h) − f(x)) ÷ h; its error scales with h² rather than h. With float64, h = 1e-6 is a common compromise.

</details>

### ★ What do you do with the gradient?

The optimizer decides how to move once you have the gradient. The most basic one takes a small step against the gradient. The default for modern LLMs is AdamW, which gives each parameter its own step size.

**Gradient descent.** New parameter = old parameter − learning rate × gradient. The learning rate controls the step size and is the most important hyperparameter. Continuing from the last section, but now looking at 4 questions after `m`: 3 have answer a, 1 has answer m. The average loss at w = 0 is 0.693, and nudging gives a gradient of about −0.25.

| Learning rate | New w | New average loss | Result |
|---|---|---|---|
| 1 | 0 − 1 × (−0.25) = 0.25 | 0.638 | Better |
| 20 | 0 − 20 × (−0.25) = 5 | 1.257 | Overshoots in one step; worse than before |

With learning rate 1, repeating the loop makes w settle at about 1.10. At that point the probability of a is 0.75, exactly its share of the data, and the average loss is 0.562; it won't go lower (the floor from the previous section). With learning rate 20, the probability of a shoots to 0.993, and on the question whose answer is m the loss gets very large. The classic symptoms of a learning rate that's too high are a loss that oscillates, climbs, or even becomes NaN.

**SGD: look at a small batch each time.** The names dataset yields about 228,000 questions; computing over all of them for every step is too slow. In practice you sample a small random batch each time (a mini-batch, e.g. 32 questions) and compute the gradient on it. That gradient is noisy but much cheaper, so you can take many more steps. That's SGD (stochastic gradient descent).

**Adam: a step size per parameter.** Different parameters can have wildly different gradient sizes. Say parameter A's gradient is always around 100, parameter B's around 0.01, and the learning rate is 0.001. SGD moves A by 0.1 per step and B by only 0.00001; the same learning rate is too big for A and too small for B. Adam keeps two moving averages per parameter: the average gradient (which sets the direction and averages out the noise), and the average squared gradient (an estimate of how big this parameter's gradient usually is). Before stepping, it divides the step by the square root of the latter (roughly the typical size of this parameter's gradient). The result: A and B each move about 0.001 per step. That's how hundreds of millions of parameters at very different scales can share one learning rate, and it also makes training less sensitive to hyperparameters.

**AdamW: separating out weight decay.** Weight decay pulls each parameter a little toward 0 every step (e.g. learning rate 0.001 and decay 0.1 shrink each parameter by 0.01% per step). It keeps parameters from growing too large and is a form of regularization. The original Adam added weight decay into the gradient, so it also got "divided by the gradient size": parameters with large gradients were regularized less. AdamW pulls weight decay out of the gradient update and applies it directly to the parameters, so it acts the same on every parameter. It's the current default for training LLMs.

Adam makes the learning rate easier to choose, but you still need to tune it first. Large-scale training usually increases the learning rate slowly at the start, then lowers it gradually (→ [S3 Pretraining and Scaling](/en/stages/s03-pretraining/)).

<details class="deep">
<summary>Going deeper: the Adam and AdamW update rules</summary>

At each step, for each parameter θ (gradient g, learning rate η):

- m ← β₁·m + (1 − β₁)·g (moving average of the gradient, i.e. momentum)
- v ← β₂·v + (1 − β₂)·g² (moving average of the squared gradient)
- Bias correction: m̂ = m ÷ (1 − β₁ᵗ), v̂ = v ÷ (1 − β₂ᵗ). m and v start at 0, so they're too small for the first few steps; t is the step number.
- Adam: θ ← θ − η·m̂ ÷ (√v̂ + ε). With L2 regularization, λθ is added to g, so it also gets divided by √v̂.
- AdamW: θ ← θ − η·(m̂ ÷ (√v̂ + ε) + λθ); the decay term doesn't go through √v̂.

PyTorch's defaults are β₁ = 0.9, β₂ = 0.999, ε = 1e-8; `AdamW`'s `weight_decay` defaults to 0.01.

</details>

### ★ Why does training stall from the start?

The size of the initial weights decides whether training can get going. Too large, and signals saturate and gradients vanish; too small, and signals shrink layer after layer. Normalization layers keep pulling values back into a stable range throughout training.

**First check: the initial loss.** An untrained model should treat all 27 characters roughly equally, so the initial loss should be close to ln 27 ≈ 3.30. If the first step's loss is 15, the model gave the correct answer a probability of only e⁻¹⁵, about one in three million: it hasn't learned anything, yet it's very confidently wrong. The usual cause is output-layer weights that start too large, so the 27 scores are far apart and softmax puts nearly all the probability on some random character. The fix is to make the output layer's initial weights very small, so the 27 scores are close and the probabilities near uniform. That way the first few hundred steps aren't wasted on "talking the model down from overconfidence."

**Second check: is tanh saturated?** Hidden layers often use tanh to squash values into −1 to 1. Once the input passes ±3, the output is already ±0.995; nudging the input barely moves the output, and the local rate drops to about 0.01. By the rule of backprop, the gradient flowing back gets multiplied by that rate, so almost nothing gets through and the earlier parameters learn nothing. M1 makemore MLP uses |tanh| > 0.97 as the saturation threshold; there the local rate is under 0.06.

Why does it saturate? Each neuron in M1 makemore MLP's hidden layer adds up 30 weighted inputs. If every input and weight is around 1 in size, the 30 terms have random signs and mostly cancel, so the typical size of the sum grows to only about √30 ≈ 5.5, not 30. Even so, most of it lands in tanh's flat region. The fix is to scale the initial weights down by the number of inputs: multiply by about 1/√30 ≈ 0.18, and the typical size of the sum is back to about 1.

**Normalization layers.** Initialization only handles the first step. During training the weights keep changing, and the scale of each layer's inputs drifts with them. A normalization layer rescales each layer's input to a mean of about 0 and a spread of about 1, then multiplies by a learnable scale. BatchNorm does this across a batch for the same feature; LayerNorm does it across all the features of a single example. Transformers use the latter, and next chapter swaps it for the simpler RMSNorm (→ [S2 Transformers and Decoding](/en/stages/s02-transformer/)). M1 makemore MLP doesn't require normalization, but once a network gets deep you can't do without it.

An initial loss near 3.30 checks the output layer, but the hidden layer may still be saturated. Measure the initial loss and each layer's activation distribution. A histogram can show whether many activations cluster at ±1.

<details class="deep">
<summary>Before you build: initialization formulas and diagnostic plots</summary>

- **Scaling formula**: if each input has a spread of about 1, draw weights from random numbers with standard deviation gain ÷ √fan_in, where fan_in is the number of inputs. For tanh, gain = 5/3 is common; for ReLU, √2 (Kaiming initialization). PyTorch's `torch.nn.init.kaiming_normal_` does it for you.
- **The trouble with BatchNorm**: it uses the batch's mean and standard deviation, so during training one example's output depends on the other examples in its batch. At inference it switches to the averages accumulated during training, and getting the `model.train()` / `model.eval()` switch wrong gives strange results. LayerNorm looks only at a single example and has no such problem.
- **Three plots to draw**: a histogram of each layer's activations (piled up at ±1, or all 0?), a histogram of each layer's gradients (do layers differ by several orders of magnitude?), and for each parameter the ratio "update size per step ÷ size of the parameter." A common rule of thumb for the last one is about 1e-3: far below means the learning rate is too small, far above means it's too big.

</details>

### ★ What if the model is memorizing?

When a model keeps getting better on the training data but worse on data it hasn't seen, that's overfitting: it has started memorizing answers instead of learning patterns. Regularization is the umbrella term for ways to prevent memorizing.

**How to spot it: split the data three ways.** M1 makemore MLP splits the names into train / val / test (80 / 10 / 10). Train is for updating parameters; val is for comparing settings and deciding when to stop; test is used once at the very end to report the final score. Train loss alone can't tell you whether the model is good, because the model could memorize all 26,000 training names, get a very low loss, and still be unable to produce new names.

**Example.** Training loss falls steadily from 3.30 to 1.2, while val loss falls to 2.0 and then starts rising. From the moment val starts rising, what the model learns only helps on the training data. Your options:

- **Early stopping**: keep the parameters from the point where val loss was lowest. The simplest and almost free; usually tried first.
- **Weight decay**: the "pull toward 0 a little each step" from the previous section, which makes it harder for the model to memorize individual examples with very large weights.
- **Dropout**: at each training step, randomly switch off some neurons so the model can't rely on any single path.
- **More data, or a smaller model**: if it can't memorize, it has to learn the patterns.

A gap between train and val loss is normal. Watch for val loss that stops falling or starts rising. If both losses are high and close together, the model may be too small or undertrained (underfitting); more regularization would make that worse.

<details class="deep">
<summary>Going deeper: dropout and the rules for the test set</summary>

- **Dropout details**: during training, set each activation to 0 with probability p and divide the survivors by (1 − p) so the expected value is unchanged; at inference, drop nothing and don't rescale. Large LLM pretraining usually has plenty of data and passes over it only once or twice, so many models skip dropout entirely.
- **Use the test set only once**: if you keep checking test scores to pick settings, the test set becomes another val set and the reported score is overly optimistic.

</details>

### ★ How do you debug a training run?

Changing only the learning rate can produce very different results. Read the loss curves and log each run so you can compare settings without relying on memory.

**Common loss curve shapes.**

| What the curve looks like | Most likely cause | Try first |
|---|---|---|
| Far above 3.30 at the first step | Initialization makes the model overconfident | Shrink the output layer's initial weights |
| Wild oscillation, climbing, or NaN | Learning rate too high | Divide the learning rate by 3–10 |
| Almost flat from start to finish | Learning rate too low, gradients not getting through (saturation), or a bug | Do the debugging steps below first |
| Falling but very jittery | Batch too small, noisy gradients | Increase the batch size or lower the learning rate |
| Train keeps falling, val rises | Overfitting | See the previous section |

**Debugging order.** First make the model overfit a tiny amount of data (e.g. train repeatedly on a single batch; the loss should drop far below its starting value, and close to 0 with only a few examples; if it won't go down, the code has a bug) → check the initial loss is sensible → tune the learning rate → only then start tuning the architecture. Do it the other way around and you'll spend days tuning the architecture of buggy code.

**Experiment tracking.** An experiment tracker (such as [Weights & Biases](https://docs.coreweave.com/products/wandb)) records each run's hyperparameters, loss curves, code version and random seed, and lets you compare them side by side. For example, run three settings of M1 makemore MLP with learning rates 0.1, 0.03 and 0.01, everything else the same, and compare val loss at the same step count. You'll see which is best and by how much.

Repeat a run once or twice with different seeds to estimate the natural variation in val loss. A difference smaller than that variation is not evidence of improvement. Compare runs at the same step count, too, so extra training does not give one an advantage.

<section class="deep-section">

### ○ Where did the idea of word vectors come from?

word2vec and GloVe learn a vector for each word from the principle that "words that appear together have related meanings." They're where the idea of embeddings started, but they're different from the token embeddings inside a model (covered in S2 Transformers and Decoding) and the sentence embeddings used in S9 Retrieval and RAG (see the [Glossary](/en/reference/glossary/)). The history helps understanding but isn't a prerequisite for later chapters.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

1. A model gives the correct answer a probability of 0.1 on every question. Using the table in the lecture, what are the average loss and the perplexity?

   <details class="hint">
   <summary>Check your answer</summary>

   loss = −ln 0.1 ≈ 2.30, perplexity = e^2.30 ≈ 10: the model is as confused as if it were guessing uniformly among 10 characters each time. If every question gets probability p on the correct answer, the perplexity is just 1/p.

   </details>

2. A weight w = 1 has a measured gradient of +0.4, and the learning rate is 0.5. What is w after one step? Do you expect the loss to go up or down?

   <details class="hint">
   <summary>Check your answer</summary>

   1 − 0.5 × 0.4 = 0.8. A positive gradient means raising w would raise the loss, so you step down; as long as the step isn't too big, the loss goes down. With a learning rate that's too high, one step can overshoot and make it worse.

   </details>

### Core: Write a scalar autograd by hand

**Goal**: write a small engine that can backprop through any scalar expression, and prove its gradients are correct.

**Steps**
1. Define a `Value` type that stores its value, its gradient, and the operation and inputs that produced it.
2. Support `+`, `*`, `-`, `/`, `pow` (constant exponent), `exp` and `tanh`. Each operation must define its own local derivative.
3. Implement `backward()`: topologically sort the computation graph and accumulate gradients backward from the output. When the same node is used twice, its gradients must add, not overwrite.
4. Write a numerical gradient check: for each input, add and subtract h = 1e-6, estimate the gradient with a central difference, and compare it with the backprop result.
5. Use your engine to build a small 2-layer network (e.g. 2 → 8 → 1) and fit a simple dataset with SGD (e.g. XOR, or binary classification of 4–20 points). Plot the loss curve.
6. Raise the learning rate by 10× or more, run again, and plot it on the same chart.

**Acceptance criteria**
- At least 5 random expressions (each with at least 6 operations, including reusing the same variable) pass the gradient check with relative error |a − b| ÷ max(|a|, |b|, 1e-8) below 1e-5, or absolute error |a − b| below 1e-7. (a and b are the gradients from the two methods. The denominator has a floor because relative error is misleading when the gradient is near 0; when the gradient is tiny or the expression's value is large, the numerical gradient itself is inaccurate, hence the separate absolute threshold.)
- The small network's training loss decreases monotonically (small oscillations allowed) and ends at 100% classification accuracy on the training data.
- The two loss curves sit side by side, with a sentence or two on what's wrong with the high-learning-rate one (oscillating, diverging or stuck).
- You can point to the line in your code that handles "the same node used twice."

**Hints**
- TypeScript: one class plus closures for the local derivatives is enough, no packages needed. JS numbers are float64, precise enough for gradient checking.
- Python: plain Python is fine. When you're done, compute the same expression with PyTorch's `requires_grad` and cross-check.
- If you get stuck:
  - Reread: [Which way should each parameter move?](#-which-way-should-each-parameter-move) (including "Before you build: the structure of an autograd engine"), [How do you debug a training run?](#-how-do-you-debug-a-training-run)
  - Further: the backward section of Zero to Hero video 1 (micrograd)

<section class="deep-section">

### Advanced: Model project M1: makemore MLP and training diagnostics

**Goal**: train a character-level language model on the names dataset, going from bigram all the way to an MLP, and learn to diagnose training with numbers.

**Steps**
1. Get `names.txt` from [karpathy/makemore](https://github.com/karpathy/makemore) and split it into train / val / test (80 / 10 / 10).
2. Build a bigram baseline in two versions: the counting version and a gradient-descent "one linear layer + softmax" version. Their val losses should be close.
3. Build the MLP version: character embedding → concatenate the previous 3 characters → hidden layer → softmax. Write it with PyTorch tensors; the scalar engine from the core exercise is too slow.
4. Fix the initialization: get the initial loss close to ln 27 and stop tanh from saturating heavily. Plot each layer's activation histogram before and after the fix.
5. With W&B (or any experiment tracker), run at least 3 hyperparameter settings (learning rate, hidden size, embedding dimension) and log val loss.
6. Sample 20 names from the best model.

**Acceptance criteria**
- Report val loss and perplexity for the bigram and the MLP; the MLP's val loss is at least 0.15 lower than the bigram's.
- Initial loss within 3.30 ± 0.2.
- At initialization (step 0), measure the fraction of hidden-layer units with |tanh| > 0.97: after the fix it should be clearly lower than before (e.g. from over 50% to under 25%). Also report the fraction at the end of training (it's normal for it to rise after training).
- At least 3 runs on the experiment tracking page, and you can say which is best and by how much.

**Hints**
- Python: PyTorch (CPU or Apple MPS is enough; a training run takes a few minutes). W&B has a free personal plan; if you'd rather not sign up, use TensorBoard or write a CSV yourself.
- The model project is in Python throughout; for environment setup see [Model Project (M1–M5)](/en/projects/model-thread/).
- If you get stuck:
  - Reread: [What does the model learn, and how is it scored?](#-what-does-the-model-learn-and-how-is-it-scored) (including the MLP shape), [Why does training stall from the start?](#-why-does-training-stall-from-the-start), [experiment tracking](#-how-do-you-debug-a-training-run)
  - Further: Zero to Hero video 3 (MLP) and video 4 (activations, gradients, BatchNorm)

</section>

## Self-check

1. Is the gradient from backprop an approximation or exact? And what is a numerical gradient check checking?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: backprop is exact (up to floating-point error); the numerical gradient from nudging is the approximation. The check is whether your backprop is written correctly. **Common mistake**: requiring the two to be exactly equal. **Reread**: [Which way should each parameter move?](#-which-way-should-each-parameter-move)

   </details>

2. A 27-class classifier has a loss of 15 at the first training step. What do you suspect first?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a sensible starting point is ln 27 ≈ 3.30; 15 means the model is very confidently wrong, so suspect output-layer initial weights that are too large. **Common mistake**: going straight to tuning the learning rate or the architecture. **Reread**: [Why does training stall from the start?](#-why-does-training-stall-from-the-start)

   </details>

3. What's the difference between Adam and SGD? Why does nearly all LLM training use AdamW?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: Adam scales each parameter's step by the typical size of its gradient; AdamW also pulls weight decay out of the gradient update, so every parameter is regularized the same way. **Common mistake**: thinking Adam means you don't need to tune the learning rate. **Reread**: [What do you do with the gradient?](#-what-do-you-do-with-the-gradient)

   </details>

4. Scenario: training loss falls steadily to 1.2, while val loss falls to 2.0 and then starts rising. What do you do? List at least two options and say which you'd try first.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: this is overfitting. Options are early stopping, weight decay, dropout, more data or a smaller model; early stopping is cheapest and usually tried first. **Common mistake**: training longer to get train loss even lower. **Reread**: [What if the model is memorizing?](#-what-if-the-model-is-memorizing)

   </details>

5. Perplexity drops from 8 to 6. In plain words, what does that mean?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the model's confusion went from "guessing uniformly among 8 options" to "among 6." **Common mistake**: treating it like a loss difference; perplexity is about ratios, loss is about differences. **Reread**: [What does the model learn, and how is it scored?](#-what-does-the-model-learn-and-how-is-it-scored)

   </details>

6. Without looking at the lecture, walk through the nudging example yourself: two candidates, w = 0, the correct answer is a. Measure the local rates for w → p and p → loss, multiply them, and compare with the gradient from nudging w directly. If the correct answer were m instead, how would the sign of the gradient change?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: 0.25 × (−2) = −0.5, the same as measuring directly. If the answer is m, raising w raises the loss, so the gradient becomes +0.5. **Common mistake**: assuming the p → loss rate is still −2; the loss now depends on m's probability, 1 − p. **Reread**: [Which way should each parameter move?](#-which-way-should-each-parameter-move)

   </details>

7. Why do the parameters in earlier layers learn almost nothing when tanh is heavily saturated? Explain it in terms of backprop's "multiplying rates."

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: when saturated, tanh's local rate is close to 0, the gradient flowing back gets multiplied by it, and the earlier gradients go toward 0 too. **Common mistake**: just saying "the values are too big" without connecting it to multiplying rates. **Reread**: [Why does training stall from the start?](#-why-does-training-stall-from-the-start)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want to go deeper or code along with someone line by line. None of it is required.

### Code along

- [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) — The first 5 videos: micrograd, the makemore bigram, the MLP, activations / gradients / BatchNorm, and backprop by hand. They map one-to-one onto this chapter's core exercise and M1 makemore MLP, and are good for typing along. Video 6 (a WaveNet-style hierarchical architecture) turns the MLP into a deeper structure and is a bridge toward S2 Transformers and Decoding. The series hasn't been updated since 2024, but the fundamentals in these videos don't go out of date.
- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — Appendix A (an intro to PyTorch) and Appendix D (warmup, cosine decay and gradient clipping in the training loop).
- MiniTorch (Cornell) — Extends autograd to tensors and parallel computation; for those who want to go further after the core exercise.

### Courses and overviews

- [Stanford CS224N](https://web.stanford.edu/class/cs224n/) — The Winter 2026 Word Vectors and Backpropagation and Neural Network Basics lectures, for more on vector representations and backpropagation. They assume basic linear algebra and calculus.

</section>
