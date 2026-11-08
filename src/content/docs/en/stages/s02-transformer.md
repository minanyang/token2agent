---
title: S2 Transformers and Decoding
head:
  - tag: title
    content: "How Transformers Work: Attention and Decoding (S2) | Token2Agent"
description: An introduction to how Transformers work. Tokenizers, attention and the structure of GPT, how text is generated one token at a time, how temperature and top-p shape the output, and how to estimate parameter counts and memory.
sidebar:
  order: 2
  label: S2 Transformers and Decoding
---

:::note[This chapter]
**Prerequisites**: [S1 Neural Network Basics](/en/stages/s01-neural-networks/)　**Next**: → [S3 Pretraining and Scaling](/en/stages/s03-pretraining/). This chapter is part of the optional deep route. If you're on the [application route](/en/guide/app-first/), the Model Crash Course already covers the token and sampling concepts S6 LLM APIs and Application Basics needs
:::

:::tip[Concepts route: key points]
- Text is first split into tokens. A token isn't a character or a word, and many odd behaviors come from how text gets split.
- Every layer of the model looks back over the whole preceding text (attention) to compute the probabilities of the next token.
- The answer is generated one token at a time, each picked from those probabilities by a rule.
:::

## What this chapter covers

This chapter opens up the inside of an LLM. The model in S1 Neural Network Basics only sees a fixed-length window of preceding text. This chapter answers: how do you let a model draw on the entire preceding text while still training in parallel on a GPU? The answer is the Transformer. The lecture follows the data as it flows: text is split into tokens by the tokenizer, passes through layer after layer of attention and MLP, becomes probabilities for the next token, and a decoding rule picks one. Finally you'll learn to estimate any model's parameter count, compute and memory.

## After this chapter you can

- Draw the flow from text to the next token, and explain what attention, the mask and sampling each do. (lecture and self-check)
- Work out by hand one BPE merge, the attention output at one position, and how much memory the weights take in different formats. (lecture and self-check)
- Explain how temperature, top-k and top-p affect the output, and choose settings for different uses. (core)
- Assemble a small Llama-style model yourself, train it and generate text. (advanced)
- Read the architecture description of a new model (config or technical report) and say how it differs from a standard GPT. (advanced; the core exercise in S5 Inference and Serving also reads configs)
- Given a model size, estimate its parameter count, compute per token and the memory its weights need. (advanced; parameter counts and weight sizes also come up in the core exercise of S5 Inference and Serving)

## Lecture

The big picture first. Here's how a GPT-style model (a decoder-only Transformer) processes text:

<figure>
<svg viewBox="0 0 360 550" width="360" style="max-width:100%;height:auto;display:block;margin:0 auto" role="img" aria-label="GPT data flow: token IDs pass through the embedding, N blocks (each with attention and an MLP, plus residual connections), a final norm, the output layer and softmax, giving the probabilities of the next token" font-size="13" fill="currentColor">
<defs><marker id="s2-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="60" y="10" width="240" height="34" rx="6"/>
<rect x="60" y="60" width="240" height="34" rx="6"/>
<rect x="28" y="110" width="304" height="196" rx="8" stroke-dasharray="6 4" opacity="0.7"/>
<rect x="60" y="130" width="240" height="34" rx="6"/>
<circle cx="180" cy="197" r="10"/>
<rect x="60" y="222" width="240" height="34" rx="6"/>
<circle cx="180" cy="279" r="10"/>
<rect x="60" y="340" width="240" height="34" rx="6"/>
<rect x="60" y="390" width="240" height="34" rx="6"/>
<rect x="60" y="440" width="240" height="34" rx="6"/>
<rect x="60" y="490" width="240" height="34" rx="6" stroke-dasharray="6 4"/>
<path d="M180,44 V58 M180,94 V128 M180,164 V185 M180,207 V220 M180,256 V267 M180,289 V338 M180,374 V388 M180,424 V438 M180,474 V488" marker-end="url(#s2-arrow)"/>
<path d="M180,115 H44 V197 H168" stroke-dasharray="3 3" marker-end="url(#s2-arrow)"/>
<path d="M180,212 H316 V279 H192" stroke-dasharray="3 3" marker-end="url(#s2-arrow)"/>
</g>
<circle cx="180" cy="115" r="3"/><circle cx="180" cy="212" r="3"/>
<g text-anchor="middle" stroke="none">
<text x="180" y="32">Text → tokenizer → token IDs</text>
<text x="180" y="82">Token embedding (+ position info)</text>
<text x="180" y="152">Norm → masked self-attention</text>
<text x="180" y="202">+</text>
<text x="180" y="244">Norm → MLP</text>
<text x="180" y="284">+</text>
<text x="180" y="362">Final Norm</text>
<text x="180" y="412">Output layer: vector → logits</text>
<text x="180" y="462">softmax → next-token probabilities</text>
<text x="180" y="512">Decode: pick one, append, repeat</text>
</g>
<g stroke="none" font-size="12" opacity="0.8">
<text x="322" y="298" text-anchor="end">× N blocks</text>
<text x="48" y="190">residual</text>
<text x="252" y="268">residual</text>
</g>
</svg>
<figcaption>The block in the dashed frame repeats N times (12 times in GPT-2 small). The dashed arrows are residual connections: the input x from before the Norm is added straight onto the sublayer's output.</figcaption>
</figure>

### ★ One example, end to end

Take the sentence "I love cats" and watch how the model produces the next token. The splits and numbers below are illustrative, not values from a real model.

1. **Split into tokens**: the tokenizer splits the text into `I`, ` love` and ` cats` (the leading space belongs to the token; more on that below) and looks up their IDs in the vocabulary, say [12, 85, 47]. An ID is just a label, like a seat number; its size means nothing.
2. **Look up vectors**: the model has an embedding table with one row per token, each row a d-dimensional vector. ID 12 just means "take row 12." What actually goes into the model is these vectors, not the IDs. Position information is added too, so the model knows what comes before what (modern models handle this inside attention instead; see "Which parts do modern models swap?").
3. **Attention mixes in the context**: at the position of "cats," attention looks back at "I," "love" and "cats" and blends their information, weighted by relevance. The output is still one d-dimensional vector per position, but now it carries information from the context.
4. **MLP processing**: each position's vector goes through the same small network on its own, for another round of processing.
5. **Repeat N times**: attention plus MLP is one block, and GPT stacks N blocks (12 in GPT-2 small).
6. **Output layer turns it into scores**: when generating, take the vector at the last position ("cats"), multiply it by the output layer, and get one score for every token in the vocabulary, called logits (during training every position is computed; see the causal mask paragraph). To keep the math easy, pretend the vocabulary has only three tokens: ` and` 2.0, `.` 1.0, ` dogs` 0.0.
7. **Pick the next token**: softmax turns the scores into probabilities, about [0.665, 0.245, 0.090], and a decoding rule picks one. Say it picks ` and`. Then run again on "I love cats and" to produce the token after that (in practice the parts already computed are stored and not recomputed; → [S5 Inference and Serving](/en/stages/s05-inference/)).

Two hand-offs trip people up most: **an ID is only an index; the embedding is the model's actual input**; and **attention and the MLP both produce vectors; only the final output layer turns a vector into scores over the vocabulary**.

The following sections zoom in on these steps in order: step 1 is tokenization, steps 2–6 are the Transformer, and step 7 is decoding.

### ★ How does text become tokens?

The tokenizer decides the model's unit of input. How text gets split directly affects cost, and it's the source of many "model quirks."

**Why subwords.** With characters as the unit, sequences get too long; with whole words, the vocabulary gets impractically large and unseen words can't be represented. Modern LLMs go in between: common strings become one token, rare strings are split into a few smaller pieces. The most common method is BPE (Byte Pair Encoding).

**BPE has two phases: learn merge rules, then use them to split text.** To learn the rules, start from the smallest units and repeatedly merge "the pair that most often appears side by side" into a new unit. Take the string `aabaabaac`:

| Step | Most frequent pair | Merged into | Result |
|---|---|---|---|
| 0 | | | `a a b a a b a a c` |
| 1 | `aa` (3 times) | `X` | `X b X b X c` |
| 2 | `Xb` (2 times, tied with `bX`; take the one that appears first) | `Y` | `Y Y X c` |

Real training keeps merging until it hits a set number of merges (i.e. the target vocabulary size); modern models usually have tens of thousands to a couple hundred thousand tokens. This example stops here. What you learn is an ordered list of rules (`aa→X`, `Xb→Y`). Later, to split new text (encode), you apply the rules in the same order; you don't recount which pair is most frequent. For example, `aabaac`: apply `aa→X` to get `X b X c`, then `Xb→Y` to get `Y X c`.

**Start from bytes.** Unicode has well over a hundred thousand characters, and many barely appear in training data. So most modern LLMs start merging from UTF-8 bytes: there are only 256 base units, and any text (Chinese, emoji, code) can be represented. An English letter is 1 byte, but a Chinese character usually takes 3 (你, "you," is `E4 BD A0`). This is where language starts to affect cost. If the data the tokenizer learned its merges from had plenty of Chinese, 你 is likely merged into a single token; if not, one character can take 2–3 tokens. A common English word, by contrast, is usually a single token. So on some tokenizers the same sentence takes far more tokens in Chinese (or another language underrepresented in the tokenizer's training data) than in English, which costs more and uses up more context. Newer multilingual tokenizers narrow the gap considerably.

**Common misconception: a token is a character, or a word.** It's neither. Many problems that look like "the model isn't smart enough" actually come from how text is split:

- **Can't count letters**: "strawberry" might be split into 2–3 tokens. The input units don't correspond to single letters, which makes counting letter by letter harder.
- **Shaky arithmetic**: some tokenizers, for example, split numbers into chunks of 3 digits from left to right. For `12345 + 678`, the first number becomes `123|45` and the second is `678`. The last chunk of one represents two digits and the other three, so the place values don't line up, and adding digit by digit gets harder.
- **Trailing spaces**: a space usually sticks to the front of the next word (" world" is one token), so a prompt that ends in a space is a state rarely seen in training, and the output may get worse.

<details class="deep">
<summary>Before you build: what to know before implementing BPE</summary>

- **IDs for new tokens**: the X and Y in the table above are really new IDs. 0–255 are reserved for the original bytes; the first merge gets 256, then 257, and so on.
- **Decode**: look up an "ID → bytes" table. Each new ID's bytes are the bytes of the two IDs it merged, concatenated. Finally, convert the bytes back to text as UTF-8.
- **Pre-split, then merge**: real tokenizers first split the text into chunks with a rule (a regex), and each chunk carries its leading space with it, e.g. " hello" is one chunk. Merges never cross chunk boundaries, so " hello" and "hello" are different tokens.
- **Special tokens**: tokens like `<|endoftext|>` skip BPE and map straight to reserved IDs. They mark document ends, conversation roles and so on (chat templates rely on them; ← [Model Crash Course](/en/guide/app-first/#chat-templates)).
- **Byte fallback**: some models (such as Llama 1/2) aren't purely byte-level; they fall back to bytes only for characters they haven't seen.

</details>

### ★ How does attention look at earlier tokens?

**Why not an RNN.** An RNN reads one token at a time and squeezes everything it has read into a fixed-size vector. All the preceding text is crammed into that one vector, so the further back something is, the more likely it gets overwritten. And step t has to wait for step t−1 to finish, so training can't run in parallel.

**How self-attention works.** Instead of squeezing the context into one vector, let every position look straight back at all positions and pick out what's relevant. Think of it as a lookup. Each token's vector x is multiplied by three learned matrices (vector times matrix: each output number is a weighted sum of x's components, and the weights are the matrix; ← [S1 Neural Network Basics](/en/stages/s01-neural-networks/)), giving three vectors:

- **query (q)**: what kind of information I'm looking for.
- **key (k)**: what kind of information I have, used for matching.
- **value (v)**: what I provide if you pick me.

A token's q, k and v come from three different matrices, so their values differ. The output at position i is computed in four steps. Take the dot product of q_i with each position's k_j (multiply matching entries and add, e.g. [1, 0] · [1, 1] = 1 × 1 + 0 × 1 = 1; ← [Math Refresher](/en/guide/math-refresher/#dot-product-and-cosine-similarity)) to get similarity scores; divide by √d_k (d_k is the key dimension; the higher the dimension, the larger dot products tend to be, and dividing keeps softmax from piling all the weight on one position); apply softmax to get weights; and use the weights to average all the v_j.

Back to "I love cats." Compute the position of "cats" (2-dimensional vectors, illustrative numbers). The query for "cats" is [1, 0]. The keys of the three positions are "I" [1, 0], "love" [0, 1], "cats" [1, 1], and the values are "I" [1, 0], "love" [0, 1], "cats" [0.5, 0.5]:

| Token looked at | q · k | ÷ √2 | softmax weight |
|---|---|---|---|
| I | 1 | 0.707 | 0.401 |
| love | 0 | 0 | 0.198 |
| cats | 1 | 0.707 | 0.401 |

Output = 0.401 × [1, 0] + 0.198 × [0, 1] + 0.401 × [0.5, 0.5] ≈ [0.60, 0.40]. The key for "love" is perpendicular to the query (dot product 0), so its content is used the least. This output is a new vector that moves on to the next layer. The three matrices that produce q, k and v are learned: during training the model decides for itself "what should be matched against what."

<details class="deep">
<summary>Before you build: the matrix form, and why divide by √d_k</summary>

- **Matrix form**: stack the q of all L positions into an L × d_k matrix Q (likewise K and V). QKᵀ is an L × L score table whose row i, column j is q_i · k_j. Divide by √d_k, apply softmax to each row, multiply by V, and each position gets an output vector. All of attention fits on one line: softmax(QKᵀ / √d_k)·V.
- **Why divide by √d_k**: a dot product sums d_k terms, so the higher the dimension, the more spread out the scores. At d_k = 64, the dot product of random vectors (each component with variance 1) has a standard deviation of about 8. Softmax then gives nearly all the weight to the top-scoring position, gradients are nearly 0, and training crawls. Dividing by √d_k brings the scores back to a standard deviation of about 1.

</details>

**Causal mask: look only at the past.** A language model predicts the next token, so each position may only see itself and the positions before it. The trick is to set the scores for future positions to negative infinity before softmax, which makes their weights 0. Each row is "who's looking," each column is "the token being looked at":

| | I | love | cats |
|---|---|---|---|
| **I** | ✓ | ✗ | ✗ |
| **love** | ✓ | ✓ | ✗ |
| **cats** | ✓ | ✓ | ✓ |

For example, at the position of "love" (with the query also [1, 0]): only "I" and "love" take part, with scores 1 and 0. Divide by √2 and apply softmax, and the weights are about [0.670, 0.330], giving an output ≈ [0.67, 0.33]. Without the mask, "cats" would also take 0.401, and the three would be [0.401, 0.198, 0.401].

Remove the mask and, during training, every position can see the answer (the next token) directly. The loss drops beautifully, but the model only learns to copy the answer. At generation time the future tokens don't exist yet, and the output falls apart.

With the mask, a training sequence of length L yields predictions for all L positions in one parallel pass, which is like practicing L questions at once ("I → love," "I love → cats," …). That's the key reason Transformers are easier to train than RNNs. At generation time only the last position's prediction is used, and tokens have to come one at a time (→ [S5 Inference and Serving](/en/stages/s05-inference/)).

**Multi-head.** One set of q, k, v can express only one kind of "who to look at" relationship, but language has many at once: who a pronoun refers to, what a verb's subject is. So each token's q, k and v vectors are each cut into h pieces, attention runs on each piece separately, and the results are joined back and multiplied by an output matrix that mixes the heads. GPT-2 small's vectors have 768 dimensions, split into 12 heads of 64 dimensions each.

**Position information.** Attention only looks at whether contents are related; on its own it doesn't know order. "Dog bites man" and "man bites dog" look almost the same to it. So position information has to be added separately. GPT-2 learns a vector for each position and adds it to the token embedding; most modern models use RoPE instead (see "Which parts do modern models swap?").

**Building a block.** Matching the figure at the top, a block has four parts:

- **Attention**: lets tokens exchange information.
- **MLP** (also called feed-forward): processes each token on its own, first expanding the dimension 4×, passing through a nonlinearity, then shrinking it back. A lot of what the model knows is generally thought to be stored here.
- **Residual connection**: adds the input straight onto the sublayer's output (x + f(x)). Gradients can flow back to earlier layers along this shortcut, which is what makes dozens of layers trainable.
- **Normalization** (e.g. LayerNorm or RMSNorm): before each sublayer, pulls the scale of the vector's values back into a stable range.

### ★ How is the next token picked?

The model only gives scores for the next token; decoding decides which one is actually chosen. The same model can produce very different output with different settings.

**Greedy**: always pick the most likely token. Stable, but prone to loops ("I think it's good. I think it's good. …"), and picking the best token at every step doesn't guarantee the best sentence overall.

**Temperature**: before sampling according to the probabilities, divide the logits by T. Using the scores from step 6, ` and` 2.0, `.` 1.0, ` dogs` 0.0:

| T | and | . | dogs |
|---|---|---|---|
| 0.5 | 0.867 | 0.117 | 0.016 |
| 1 | 0.665 | 0.245 | 0.090 |
| 2 | 0.506 | 0.307 | 0.186 |

T below 1 makes the distribution more concentrated; T above 1 makes it flatter, with more variety; T approaching 0 is the same as greedy. **Common misconception: lowering the temperature only makes the output more concentrated and stable; it doesn't make the answer more correct.** If the model already gives the wrong answer the top score, a low temperature just makes it wrong more consistently.

**Top-k**: sample only among the k most likely candidates. The problem is that k is fixed. When the model is confident, k = 50 still leaves 49 candidates that shouldn't be picked; when it's unsure, k = 5 is too few. For example, with the probabilities from the top-p example below, [0.5, 0.3, 0.15, 0.05], and k = 2: keep only the first two and renormalize to [0.625, 0.375].

**Top-p (nucleus sampling)**: add up probabilities from highest to lowest until you reach p, and sample only among those candidates. For example, with probabilities [0.5, 0.3, 0.15, 0.05] and p = 0.9: the first two add up to 0.8, not enough; adding the third gives 0.95, so keep the first three and renormalize them to [0.526, 0.316, 0.158]. The fourth can never be picked. The number of candidates grows and shrinks with how confident the model is, which is why it usually works better than top-k.

**How to choose.** For tasks that need concentrated, stable output (data extraction, classification, code), start with a low temperature or greedy, and check accuracy separately with evals (→ S8 Eval Methodology). For tasks that need variety (brainstorming, writing), use a higher temperature plus top-p around 0.9–0.95 to cut off very-low-probability nonsense. Setting temperature to 0 doesn't guarantee identical output every time either; server-side batching and floating-point arithmetic can both introduce differences (→ [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)).

That's what the `temperature` and `top_p` parameters in an API mean. Some APIs no longer accept them (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)); in that case, control the output with prompt instructions, or with structured output (asking the model to output in a specified JSON format; → [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)).

<details class="deep">
<summary>Going deeper: beam search and the order settings are applied in</summary>

- **Beam search**: keep the b best candidate sentences at once, extend each at every step, and keep the best b again. It usually finds sentences with higher overall probability than greedy, which suits tasks with a right answer such as translation. But open-ended conversation tends to come out bland and repetitive, so chat models rarely use it.
- **Repetition penalties** (repetition / frequency / presence penalty): penalize tokens that have already appeared, lowering the chance of repeating the same sentence over and over. Too heavy a penalty makes the model avoid even proper names it should repeat, so they're usually set very light (e.g. repetition_penalty around 1.1, frequency / presence penalty 0.1–0.5).
- **Order of application**: these settings can be combined. This chapter's core exercise applies them in the order "temperature → top-k → top-p"; real frameworks don't always use the same order (llama.cpp, for instance, applies temperature last by default), so the same numbers can give different results.

</details>

### ★ Which parts do modern models swap?

Modern open models (Llama, Qwen and others) keep the skeleton above and swap out a few parts. On a first read, just learn what each part changes and why. Once this table makes sense, you can read most new models' `config.json`.

| Component | What changed | Why | How to spot it in `config.json` |
|---|---|---|---|
| RoPE | Instead of adding a position vector to the embedding, rotate q and k inside attention according to position | Expresses relative position | `rope_theta` |
| Pre-norm, RMSNorm | The original Transformer put Norm after the addition; modern models (and the figure above) put it before the sublayer, and use a simpler computation | Pre-norm makes training more stable; RMSNorm is simpler to compute | `rms_norm_eps` (shows RMSNorm; pre-norm can't be seen from the config) |
| SwiGLU | The MLP gets an extra "gate" matrix | Works better | Usually `hidden_act` is `silu`, and there's an `intermediate_size` |
| GQA / MLA | During generation each token's k and v are stored and reused, called the KV cache; GQA lets several heads share one set of k, v, and MLA compresses k, v | Shrinks KV cache memory | GQA: `num_key_value_heads` smaller than `num_attention_heads`; MLA: has `kv_lora_rank` |
| MoE | Replaces the MLP with many small parallel MLPs (experts), and each token uses only a few of them | More capacity while keeping compute in check | Number of experts (names vary, e.g. `num_experts`, `num_local_experts`) and `num_experts_per_tok` |

MoE needs special care: it has two parameter counts. **Total parameters** is all the experts combined; **active parameters** is what each token actually uses. Compute per token follows the active parameters, like a small model; but every expert has to sit in memory, so memory follows the total.

<details class="deep">
<summary>Going deeper: how each component works</summary>

**Pre-norm.** The original Transformer put normalization after the residual addition: norm(x + f(x)). Modern models put it before the sublayer: x + f(norm(x)). That leaves the residual shortcut free of any operations, so gradients flow straight through to the earliest layers, and deep models train much more stably.

**RMSNorm.** LayerNorm subtracts the mean, divides by the standard deviation, then scales and shifts. RMSNorm only divides by the root mean square √(mean(x²)) and scales. It's simpler and works about as well.

**SwiGLU.** A standard MLP has two matrices: expand → nonlinearity → shrink. SwiGLU multiplies the input by two matrices separately; one goes through SiLU (a smooth function shaped like ReLU) and is then multiplied element-wise with the other, deciding which dimensions get through; a final matrix shrinks it back. Because there's an extra matrix, the original recipe cut the middle layer from 4d to about (8/3)d to keep the total parameter count close to a standard MLP's (real models often make it larger again).

**RoPE.** Treat every two dimensions of q and k as a point in a plane, and rotate each by an angle of "position × rotation speed." Once both points are rotated and you take the dot product, the only effect of position left is the difference in their angles, i.e. **how many positions apart** the two tokens are, not where each one sits. Different dimensions use different rotation speeds: fast ones are sensitive to short distances, slow ones can tell long distances apart. `rope_theta` sets this range of speeds.

**GQA and MLA.** Because of the causal mask, the k and v of earlier tokens aren't affected by later tokens, so during generation they can be computed once and kept for reuse. This is the KV cache (→ [S5 Inference and Serving](/en/stages/s05-inference/)). Its size is proportional to the number of KV heads. GQA (grouped-query attention) has several query heads share one KV head, e.g. 32 query heads with 8 KV heads, cutting the KV cache to 1/4. MLA (multi-head latent attention, introduced by DeepSeek) doesn't store the full k and v at all, only a small compressed vector that's expanded back at compute time, saving even more.

**MoE.** Replace the MLP in most blocks with many parallel MLPs, called "experts," and add a router: for each incoming token, the router picks the few best-suited experts (e.g. 8 out of 64) and only those compute. Training needs an extra push to spread tokens evenly across experts; otherwise a few experts get all the traffic and the rest never learn anything.

</details>

### ★ How much compute and memory does a model need?

Parameter count, compute and memory can all be estimated in your head with a few simple formulas.

**Parameter count.** Each block of a standard GPT is mostly matrices (d is the vector dimension): attention's q, k, v and output are four d × d matrices (4d²), and the MLP's d → 4d and 4d → d are two more (8d²), about 12d² in total. Add the embedding table's V·d (V is the vocabulary size). For GPT-2 small (d = 768, 12 blocks, V = 50,257): 12 × 768² × 12 ≈ 84.93 million, plus 50,257 × 768 ≈ 38.60 million, about 123.5 million. Add the position embeddings, biases and other small items and you get the official 124M.

**Compute.** Each parameter does roughly one multiply and one add per token, so a forward pass is about 2N FLOPs (N is the parameter count; FLOPs are floating-point operations, with one multiply or one add counting as one). Training also needs the backward pass, about twice the forward, so about 6N per token and about 6·N·D in total (D is the number of training tokens). For example, 1 billion parameters trained on 20 billion tokens: 6 × 10⁹ × 2 × 10¹⁰ = 1.2 × 10²⁰ FLOPs. Next chapter's scaling laws use this formula (→ [S3 Pretraining and Scaling](/en/stages/s03-pretraining/)).

**Memory.** Memory for the weights = parameter count × bytes per parameter.

| Format | Per parameter | Weights for 7 billion parameters | Use |
|---|---|---|---|
| fp32 | 4 bytes | About 28 GB | Traditional training, optimizer state |
| bf16 / fp16 | 2 bytes | About 14 GB | Default for modern training and inference |
| int8 / fp8 | 1 byte | About 7 GB | Quantized inference; fp8 is also used in some newer training |
| int4 | 0.5 bytes | About 3.5 GB (a bit more with scale factors) | Common for running models locally |

Storing weights in fewer bits is called quantization; it trades a little quality for memory and speed, with details in [S5 Inference and Serving](/en/stages/s05-inference/). **Common misconception: if you can load the weights, you can train.** Training also has to store gradients and optimizer state, so it needs several times the memory of inference (see the expandable section below).

<details class="deep">
<summary>Before you build: counting parameters exactly, and how much memory training needs</summary>

- **Parameters in modern models**: many models (GPT-2 included) share one matrix between the output layer and the token embedding, called weight tying. A SwiGLU MLP has three d × `intermediate_size` matrices; GQA's k and v matrices are smaller than d × d; without weight tying, the output layer adds another V·d. List the shape of every matrix and you can count to the exact unit (that's an acceptance criterion of model project M2 tiny GPT; see [what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)).
- **Exception to the compute estimate**: 2N ignores the computation of the attention scores themselves, which you need to add for very long contexts.
- **bf16 vs fp16**: both are 16 bits. bf16 has the same range as fp32 with less precision; fp16 has more precision but a smaller range, so values easily go out of range during training (overflowing when too large, becoming 0 when too small). That's why modern training mostly uses bf16.
- **Training memory**: mixed-precision training with Adam stores, per parameter, the bf16 weights (2 bytes), bf16 gradients (2), an fp32 master copy of the weights (4), and Adam's first and second moments (4 each), about 16 bytes. 7 billion parameters need about 112 GB, before counting activations (each layer's intermediate results from the forward pass, needed for the backward pass).
- **Why quantization also speeds things up**: when serving only a few requests at a time, the inference bottleneck is "reading the weights from memory," so smaller weights are read faster.

</details>

<section class="deep-section">

### ○ How do you handle very long inputs?

The cost of attention grows with the square of the sequence length, and models are only stable within the lengths they saw in training. One family of fixes extends the range of positions RoPE can handle (RoPE scaling, YaRN); another replaces attention (linear attention, Mamba and others), bringing the cost down to linear at the price of not being able to look up any arbitrary position exactly. The mainstream today is a Transformer plus extension tricks, and some models mix the two.

</section>

<section class="deep-section">

### ○ How do images get into a language model?

How multimodal models do it: ViT cuts an image into small squares (patches) and treats each as a token; CLIP uses huge numbers of image–text pairs to put images and text into the same vector space; models like LLaVA pass the vision encoder's output through a small adapter layer and feed it into the LLM as input tokens. The computer use covered in S10 Tools and MCP needs this background.

</section>

<section class="deep-section">

### ○ How can you see what a model computes inside?

Interpretability studies what a model is computing internally. Common tools: looking at attention weights to see where each head looks; probing, training a small classifier to check whether a layer's vectors carry some piece of information; and sparse autoencoders, which break vectors down into a large number of interpretable features.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

1. Use the lecture's scores again: ` and` 2.0, `.` 1.0, ` dogs` 0.0. Temperature changes from 1 to 0.5. Without computing anything yet, predict which way each of the three probabilities moves.

   <details class="hint">
   <summary>Check your answer</summary>

   ` and` goes up (0.665 → 0.867); `.` and ` dogs` go down. Dividing by a T below 1 widens the gaps between scores, so after softmax the distribution concentrates more on the top score.

   </details>

2. Probabilities [0.4, 0.3, 0.2, 0.1], top-p with p = 0.6. Which candidates are kept, and what are the renormalized probabilities?

   <details class="hint">
   <summary>Check your answer</summary>

   The first two: 0.4 hasn't reached 0.6, and adding 0.3 gives 0.7, which passes it. Renormalized: 0.4 ÷ 0.7 ≈ 0.571 and 0.3 ÷ 0.7 ≈ 0.429.

   </details>

### Core: Write BPE and sampling from scratch

**Goal**: implement by hand the tokenizer and decoding, the two components that sit "outside the model, but decide what you see."

**Steps**
1. Implement byte-level BPE training: take a text and a number of merges, output the merge rules. Start from UTF-8 bytes so any text can be handled.
2. Implement `encode` (apply the merge rules) and `decode` (back to bytes, then back to text).
3. Train on [tiny Shakespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt) (about 1.1 MB of plain English text, also used in M2 tiny GPT) with 0, 64, 256 and 1024 merges, and record the compression ratio (UTF-8 bytes ÷ tokens). Check it runs on the first 100 KB before switching to the full text; the most straightforward implementation can take several minutes or more to do 1024 merges on the full text.
4. Encode the same passage in English and in Chinese (a machine translation is fine) and compare the token counts. Since your tokenizer is trained on English, expect the Chinese version to come out much longer.
5. Implement `sample(logits, temperature, top_k, top_p)`: take a set of logits and return the sampled index.
6. Take a fixed set of logits (e.g. length 10), sample 10,000 times for each setting, count how often each index appears, and compare with the theoretical probabilities.
7. Prepare 100 test strings: write 20 edge cases yourself (the empty string, a single Chinese character, emoji, full-width punctuation, consecutive spaces, `\n` and `\r\n`, mixed English and Chinese, and so on), then take 80 random snippets of 20–200 characters from tiny Shakespeare.

**Acceptance criteria**
- `decode(encode(s)) === s` holds for all 100 test strings from step 7 (including Chinese, emoji, spaces and newlines).
- The compression ratio rises monotonically with the number of merges; include the four numbers.
- With temperature → 0 (e.g. 1e-6) and with top_k = 1, all 10,000 samples are the argmax.
- With temperature = 1 and no top-k / top-p, each index's observed frequency is within 2 percentage points of its softmax probability.
- With top_p = 0.9, indices outside the nucleus appear 0 times.

**Hints**
- TypeScript: `TextEncoder` / `TextDecoder` handle UTF-8; count pairs with a `Map<string, number>`.
- Python: `str.encode("utf-8")`, `collections.Counter`. You can check your results against `tiktoken`, but don't just use it.
- Subtract the max logit from every logit before softmax, or exp will overflow when the temperature is tiny (e.g. 1e-6).
- If you get stuck:
  - Reread: [BPE](#-how-does-text-become-tokens), [decoding](#-how-is-the-next-token-picked)
  - Further: the first half of the "Let's build the GPT Tokenizer" video, and the decoding strategies section of rasbt chapter 5

<section class="deep-section">

### Advanced: Model project M2: Tiny GPT, Upgraded to Llama Components

**Goal**: train a small GPT from scratch, switch it to your own tokenizer, then swap in modern components one at a time, and count its size exactly.

**Steps**
1. Write a character-level GPT following the lecture's architecture (to code along, see the "Let's build GPT" video under Further reading) and train it on tiny Shakespeare.
2. Switch to the BPE tokenizer from the core exercise (vocabulary size about 512–1024) and retrain. Since the tokens differ, the losses can't be compared directly; compare bits-per-character instead (loss per token × number of tokens ÷ number of characters ÷ ln 2).
3. Swap in RMSNorm, RoPE, SwiGLU and GQA one at a time, recording val loss at the same step count after each swap.
4. Count the model's parameters by hand (layer by layer) and compare with the sum of `numel()` over all parameters in your code.
5. Estimate the forward FLOPs per token and the bf16 weight size.
6. Generate a passage each with temperature 0.5 / 1.0 / 1.5 and with top_p 0.9, and describe the differences.

**Reference setup** (fix these so val losses are comparable)
- Data: the full tiny Shakespeare text, first 90% of characters as the training set and last 10% as the validation set, no shuffling (same as nanoGPT's `prepare.py`).
- Character-level model: 4 layers, 4 heads, 128-dimensional vectors, a context of 64 characters, dropout 0, batch 12, learning rate 1e-3, at least 3000 training steps.
- Evaluation: average the loss over 200 random batches from the validation set (`eval_iters` = 200), judged at the end of training.
- This is the CPU command from the nanoGPT README, with `eval_iters` raised from 20 back to 200 and more steps. Leave everything else unchanged when swapping components.

**Acceptance criteria**
- The character-level version reaches val loss ≤ 1.9 (for reference, the nanoGPT README reports about 1.88 for the small CPU setup and about 1.47 for the single-A100 setup; with the small CPU setup, train for at least 3000 steps and raise `eval_iters` back to 200 before judging, or evaluation noise alone can make the result bounce around 1.9).
- Bits-per-character for the character-level and BPE versions side by side in a table.
- A row of val loss for every component swap.
- Hand-counted parameters match the count from code exactly (a difference of 0).
- Outputs from the four sampling settings side by side, each with a one-sentence explanation.

**Hints**
- Python: PyTorch; Apple MPS or CPU is enough, and a small model trains in ten-odd minutes. You can borrow settings from [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT), but write the model itself.
- For environment and compute, see [Model Project (M1–M5)](/en/projects/model-thread/).
- If you get stuck:
  - Reread: [modern components](#-which-parts-do-modern-models-swap), [resource accounting](#-how-much-compute-and-memory-does-a-model-need)
  - Further: the from-scratch Llama / Qwen implementations in rasbt's chapter 4 and chapter 5 bonus material

</section>

## Self-check

1. Without looking at the lecture, draw the flow from text to the next token, and mark where there are IDs, where there are vectors and where there are scores.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: IDs only exist between the tokenizer and the table lookup; from the embedding to the last layer everything is vectors; only after the output layer are there scores over the vocabulary. **Common mistake**: thinking attention outputs token probabilities directly. **Reread**: [One example, end to end](#-one-example-end-to-end)

   </details>

2. Given a q at one position and the k, v of three positions (make up your own 2-dimensional numbers), compute this position's attention output by hand.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the four steps in order are dot product, divide by √d_k, softmax, weighted average of v; the weights must add up to 1. **Common mistake**: multiplying the weights by k instead of v. **Reread**: [How does attention look at earlier tokens?](#-how-does-attention-look-at-earlier-tokens)

   </details>

3. Why does a language model need a causal mask? Without it, what happens in training and in generation?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: in training it can peek at the answer, so the loss is very low but it only learns to copy; in generation the future tokens don't exist, so the output falls apart. **Common mistake**: just saying "it sees the future" without separating training from generation. **Reread**: the causal mask paragraph in [How does attention look at earlier tokens?](#-how-does-attention-look-at-earlier-tokens)

   </details>

4. Why do LLMs often miscount "how many r's are in strawberry"? Does it have to do with how "smart" the model is?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the model sees 2–3 tokens, not individual letters; the main cause is the input unit. **Common mistake**: blaming it only on the model not being smart enough. **Reread**: [How does text become tokens?](#-how-does-text-become-tokens)

   </details>

5. Roughly how much memory does an 8-billion-parameter model need to load its weights in bf16? In int4?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: parameter count × bytes per parameter: about 16 GB in bf16, about 4 GB in int4 (a bit more with scale factors). **Common mistake**: treating this as the memory needed for training. **Reread**: [How much compute and memory does a model need?](#-how-much-compute-and-memory-does-a-model-need)

   </details>

6. An MoE model is labeled "1T total parameters, 32B active." At inference, which number is its compute closer to, and which is its memory closer to?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: compute follows the active parameters (32B), memory follows the total (1T), because every expert has to be in memory. **Common mistake**: thinking memory for 32B parameters is enough to run it. **Reread**: [Which parts do modern models swap?](#-which-parts-do-modern-models-swap)

   </details>

7. Scenario: you're using an LLM to extract fields from invoices, and another feature helps users brainstorm marketing copy. How would you set the temperature for each, and why? If the API model you use doesn't accept temperature, what would you use instead to get a similar effect?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: extraction uses a low temperature for stability, with accuracy checked separately by evals; brainstorming uses a higher temperature plus top-p. If the parameters aren't accepted, use prompt instructions or structured output. **Common mistake**: thinking a low temperature guarantees correctness. **Reread**: [How is the next token picked?](#-how-is-the-next-token-picked)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want to go deeper or code along with someone line by line. None of it is required.

### Code along

- [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) — The "Let's build GPT" and "Let's build the GPT Tokenizer" videos write attention, GPT and BPE from scratch. The best reference while doing M2 tiny GPT.
- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — Chapters 2–4 (text data and tokenization, attention, the GPT model) have step-by-step code and diagrams; the chapter 4 bonus material has from-scratch implementations of the KV cache, GQA, MLA and MoE.
- [CMU 11-711 Advanced NLP](https://cmu-l3.github.io/anlp-spring2026/) — Assignment 1, "Build Your Own LLaMa," is a good comparison for M2 tiny GPT.

### Original papers and surveys

- [Vaswani et al. 2017, Attention Is All You Need](https://arxiv.org/abs/1706.03762) — The original Transformer paper. Read it after the lecture and most of it will make sense.
- [Welleck et al. 2024, From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) — A thorough survey of decoding methods. This chapter covers the token-level part; the rest is left for S4 Post-training and Reasoning and S5 Inference and Serving.

### Courses and overviews

- [Stanford CS224N](https://web.stanford.edu/class/cs224n/) — The lectures on Transformers and attention.
- [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation) (2025-02) — An overview of architecture and decoding.
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) — Practical chapters on tokenizers and the Transformers library.

</section>
