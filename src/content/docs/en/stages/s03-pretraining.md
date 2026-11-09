---
title: S3 Pretraining and Scaling
head:
  - tag: title
    content: An Introduction to LLM Pretraining and Scaling Laws (S3) | Token2Agent
description: Where a base model's abilities come from. How pretraining data is prepared and training is run, how scaling laws set the size of the model and the data, and how data and model parallelism split training across many GPUs.
sidebar:
  order: 3
  label: S3 Pretraining and Scaling
---

:::note[This chapter]
**Prerequisites**: [S2 Transformers and Decoding](/en/stages/s02-transformer/) (also uses AdamW and perplexity from [S1 Neural Network Basics](/en/stages/s01-neural-networks/))

**Next**: → [S4 Post-training and Reasoning](/en/stages/s04-post-training/)
:::

:::tip[Concepts route: key points]
- A pretrained model (base model) gets its abilities from practicing next-token prediction over and over on huge amounts of text.
- Abilities and flaws are mostly decided at the data stage. For the same compute, clean data often helps more than more data.
- How big the model and data should be is decided from the budget before training starts. Doubling the GPUs doesn't double the speed.
:::

## What this chapter covers

S2 Transformers and Decoding took apart the model's structure. This chapter asks: how are the parameters in that structure learned? The answer is pretraining: having the model practice "predict the next token" on huge amounts of text. The lecture follows a pretraining run in order: prepare the data, run the training loop, use scaling laws to decide how big the model and data should be, split the work across GPUs when the model is too big, and finally evaluate the result. By the end you'll see that much of a base model's abilities and flaws are decided at the data stage.

## After this chapter you can

- Describe the flow of a pretraining run, from preparing data and choosing the scale to multi-GPU training, and what problem each step guards against. (lecture and self-check)
- Give the case for and against the claim of "emergent abilities"; say what data, tensor and pipeline parallelism and ZeRO / FSDP each split. (lecture and self-check)
- Explain where a base model's abilities come from, and why data quality is more often the bottleneck than data quantity. (core)
- Plan a small pretraining run: given a compute budget, estimate a reasonable model size and token count. (core: the estimate; advanced: actually running it)
- Read a scaling curve. (advanced)

## Lecture

The big picture first. The training objective of pretraining is exactly the same as the small model in [S1 Neural Network Basics](/en/stages/s01-neural-networks/): given the preceding text, predict the next token, with cross-entropy as the loss. What's different is scale: parameters go from tens of thousands to billions, and data goes from one book to trillions of tokens. At that scale, four things become important:

1. **Data**: the model can only learn what's in the data, and it learns the junk and duplicates too.
2. **The training loop**: it runs tens of thousands of steps over several days and mustn't blow up partway.
3. **Allocation**: with fixed compute, do you want a big model on less data, or a small model on more?
4. **Parallelism**: how to split the work when one GPU can't hold it or is too slow.

What you get out is a base model: it's very good at "continuing the text," but it can't yet answer questions well. That's for the next chapter (S4 Post-training and Reasoning).

### ★ One budget, end to end

One concrete example runs through the whole chapter: **you have 1.2 × 10²⁰ FLOPs of compute and want to train a base model from web data.** Apart from what the formulas compute, the numbers below are illustrative.

1. **Choose the size**: as you learned last chapter, training compute is about 6·N·D (N is the parameter count, D the number of training tokens; ← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)). Using the rule of thumb from this chapter's scaling section, "about 20 tokens per parameter," substitute D = 20N: 6·N·20N = 120N² = C, so N = √(C ÷ 120) = √(10¹⁸) = 1 billion and D = 20N = 20 billion. Check: 6 × 10⁹ × 2 × 10¹⁰ = 1.2 × 10²⁰.
2. **Prepare the data**: you need 20 billion clean, non-duplicated tokens. After filtering and deduplication, raw web pages often keep only a small fraction, so you start from several times that much raw data.
3. **Run training**: each step processes 500,000 tokens, so 20 billion ÷ 500,000 = 40,000 steps.
4. **Estimate time and hardware**: suppose one GPU actually sustains 2 × 10¹⁴ operations per second. 1.2 × 10²⁰ ÷ (2 × 10¹⁴) = 600,000 seconds, about 167 hours; with 8 GPUs in parallel, about 21 hours (before communication overhead).
5. **Evaluate**: measure perplexity on data the model hasn't seen, then measure exact match on a set of questions with known answers.

Read the rest of the lecture in three parts. **Part one, data** (step 2): "How is training data prepared?" **Part two, training and scaling** (steps 3 and 1): "How do you keep a long run from blowing up?" and "How big should the model and data be?" **Part three, multi-GPU training and evaluation** (steps 4 and 5): "What if one GPU is not enough?" and "How do you know if training went well?"

### ★ How is training data prepared?

What a model learns depends on what it reads (data engineering). Most raw data scraped from the web can't be used as is; it has to go through a processing pipeline.

**Sources.** Mainly web crawls (such as Common Crawl), plus code, books, papers, math and so on. The web is the largest source but also the messiest: navigation bars, ads, duplicated templates, machine-generated text and garbled text are all in there.

**The pipeline, in order:**

| Step | What it does | Illustration with 1,000 web pages |
|---|---|---|
| Text extraction | Pull the main text out of the HTML, drop menus and footers | 1,000 pages |
| Language and quality filtering | Rules (length, symbol ratio, too many repeated lines, language detection), then scoring with a classifier | 300 left |
| Deduplication | Remove identical and near-identical documents | 200 left |
| Removing personal data (PII) | Replace emails, phone numbers, ID numbers and the like with placeholders | 200 pages, content masked |
| Mixing | Decide what share goes to web, code, books and so on | Training set assembled to those proportions |

The proportions vary a lot by source, but "most of it gets thrown away" is common. A common way to build a quality classifier: take a batch of widely accepted good text (e.g. encyclopedias, textbooks) as positives and random web pages as negatives, train a small model to score each document, and keep only the high scorers.

**Why deduplicate.** Repeated content gets seen many times, so the model tends to memorize it word for word. Spending compute on duplicates is also waste. And there's a hidden problem: if eval questions are scattered around the web, they can end up in the training data and the scores become meaningless (this is called data contamination; → [S8 Eval Methodology](/en/stages/s08-evals/)).

**Identical documents are easy to find with a hash:** compute a hash for each document, and equal hashes mean duplicates. The trouble is "nearly identical": an article reposted with a few words changed has a completely different hash. For those you have to compare how much the content overlaps.

**Jaccard similarity and shingles.** First cut each document into overlapping word groups, called shingles. With 3 consecutive words per group:

- A: `the cat sat on the mat today` → `the cat sat`, `cat sat on`, `sat on the`, `on the mat`, `the mat today`
- B: `the cat sat on the rug today` → `the cat sat`, `cat sat on`, `sat on the`, `on the rug`, `the rug today`

Jaccard similarity = shared shingles ÷ all distinct shingles = 3 ÷ 7 ≈ 0.43. Changing a single word made 2 shingles differ (changing a word in the middle affects 3 shingles; here it's near the end, so only 2), so shingle comparison is very sensitive to edits.

**MinHash: estimating Jaccard from a signature.** With many documents, comparing every pair's full shingle sets is too slow. MinHash gives each document a fixed-length signature: prepare k different hash functions, run each over all of the document's shingles, and keep only the minimum. The probability that two documents have the same minimum under a given hash function is exactly their Jaccard similarity (see the expandable section below for why). So with k = 128, if A's and B's signatures match in 55 positions, the estimate is 55 ÷ 128 ≈ 0.43. Comparing two signatures takes just 128 numbers, regardless of document length.

**LSH: only compare pairs that are likely similar.** Signatures fix "comparing one pair is slow," but 600 documents (the scale of the core exercise) still make about 180,000 pairs, and 1 million documents make about 500 billion. LSH (locality-sensitive hashing) with banding: cut the 128 values into b bands of r values each, e.g. 32 bands of 4. If two documents match exactly on any band, they become a candidate pair, and only candidate pairs get their similarity checked. Similar documents very likely collide on at least one band; dissimilar ones almost never do (see the expandable section for the actual rates). Tuning b and r trades off "missing pairs" against "comparing more."

**PII and the mix.** PII is usually handled with rules (regular expressions catching email and phone formats) plus a detection model, replacing matches with placeholders like `<EMAIL>`. The mix has a big effect on what the model is good at. Continuing the example, if the 20 billion tokens are split into 70% web, 15% code, 10% books and papers and 5% math, math is 1 billion tokens. If you only have 500 million distinct math tokens, the model has to see them twice (2 epochs). High-quality but scarce data is often upweighted like this, but repeat it too many times and memorization sets in.

**Common misconception: more data is always better.** For the same compute, replacing half the junk with clean data usually works better than scraping twice as much junk. Many of a base model's flaws (bias, factual errors, memorized personal data) trace back to the data.

<details class="deep">
<summary>Before you build: why MinHash works, how big the error is, and LSH probabilities</summary>

- **Why the chance of matching minimums is the Jaccard similarity**: order all the shingles in A ∪ B by the same random hash. Which shingle comes out smallest is random. A and B have the same minimum if and only if the minimum of the whole union is a shared shingle, which has probability |A ∩ B| ÷ |A ∪ B|.
- **Estimation error**: each hash function is one "same or different" trial, so the standard error is about √(J(1−J)/k). At J = 0.43 and k = 128 that's about 0.044. A larger k is more accurate, but the signature gets longer.
- **Where the hash functions come from**: a common approach is to hash each shingle string to a 32-bit integer x, then compute `(a·x + b) mod p` with k random pairs (a, b) (p a prime larger than 2³²), giving k different hashes. a·x can reach 2⁶⁴, beyond the 2⁵³ a JavaScript number can represent exactly, so in TypeScript compute it with BigInt.
- **LSH candidate probability**: the chance that all r values in a band match is J^r, and the chance that at least one of b bands matches is 1 − (1 − J^r)^b. This curve is S-shaped, with its threshold at about (1/b)^(1/r). For 32 × 4 the threshold is about 0.42: about 87% of pairs with Jaccard 0.5 become candidates, but only about 5% of pairs with Jaccard 0.2. For 16 × 8 it's about 0.71, and only about 6% of pairs at Jaccard 0.5 become candidates. Choose b and r to match your similarity threshold.
- **At scale**: real pipelines compute signatures, then bucket documents using each band's values as a key, and only compare documents in the same bucket. The whole process can run distributed on Spark; if the data fits on one machine, DuckDB works too.

</details>

<details class="deep">
<summary>Going deeper: other data decisions</summary>

- **Granularity of deduplication**: besides whole documents, some pipelines remove repeated paragraphs or long sentences (such as a site's boilerplate disclaimers).
- **Contamination checks**: a common approach compares n-gram overlap (e.g. 13 consecutive words) between eval questions and training data, then removes overlapping training data or notes it in the report.
- **How to set the mix**: often by experimenting with small models, comparing how different mixes perform on target tasks, then applying the result to the large model. The share of high-quality data is also often raised late in training.
- **Side effects of filtering**: filter rules can systematically drop certain dialects, languages or topics, and a quality classifier inherits the preferences of its "good text" positives.

</details>

### ★ How do you keep a long run from blowing up?

The pretraining loop itself is the same as in [S1 Neural Network Basics](/en/stages/s01-neural-networks/): forward → loss → backward → update, with AdamW as the optimizer. At scale, three practices are nearly standard, all aimed at keeping tens of thousands of steps from blowing up partway.

**Learning rate schedule (LR schedule).** The learning rate isn't fixed; it changes with the step count:

- **Warmup**: at the start the parameters are random and the gradients are large and chaotic, so one big step can push the model somewhere very bad. So for a short stretch at the beginning, the learning rate ramps up slowly from near 0 to the target value.
- **Decay**: later on the learning rate shrinks gradually, so the model can fine-tune around a good spot. A common choice is cosine decay: follow the shape of a cosine curve, falling smoothly from the peak to the minimum.

For the 40,000-step example: over the first 2,000 steps, rise from 0 to 3 × 10⁻⁴, then follow the cosine curve down to 3 × 10⁻⁵ (10% of the peak) at step 40,000.

**Gradient clipping.** Occasionally a batch produces an unusually large gradient, and a single step wrecks the parameters. The fix: compute the overall size (norm) of all the gradients together, and if it exceeds a threshold, scale them all down proportionally, keeping the direction. For example, with a threshold of 1.0 and a norm of 4.0 on this step, multiply every gradient by 0.25.

**Mixed precision.** bf16 takes only 2 bytes per number (← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)), computes fast and saves memory, so most of the forward and backward passes use bf16. But bf16's precision is coarse: near 1.0, adjacent representable numbers are about 0.0078 apart. If a weight is 1.0 and this step adds 0.0001, storing the result in bf16 still gives 1.0; the update simply disappears. So a separate fp32 copy of the weights (master weights) is kept, updates are applied to the fp32 copy, and it's converted to bf16 when needed for computation.

**Loss spikes.** One of the most common headaches in large-scale training is the loss suddenly shooting up. Common responses are rolling back to the latest checkpoint, skipping the offending batch, or lowering the learning rate and continuing. That's why you save checkpoints regularly during training.

**Common misconception: once training finishes, you can just keep going if you want a bit more.** The shape of a cosine schedule is computed in advance from the total step count, and by the end the learning rate is already very low. If you simply continue, either the learning rate is too low to learn anything, or you raise it again and the loss gets pushed up first. So the total token count has to be decided before you start. This also affected the conclusions of the scaling laws (see the next section).

<details class="deep">
<summary>Before you build: formulas and training details</summary>

- **Cosine schedule**: after warmup, the learning rate at step t = lr_min + ½ (lr_max − lr_min)(1 + cos(π · progress)), where progress = (t − warmup steps) ÷ (total steps − warmup steps), going from 0 to 1.
- **The clipping norm**: flatten every parameter's gradient into one long vector and compute its L2 length ‖g‖. If ‖g‖ > c, multiply each gradient by c ÷ ‖g‖. In PyTorch it's `torch.nn.utils.clip_grad_norm_`.
- **Packing**: tokenize documents and join them end to end with `<|endoftext|>` in between, then cut into sequences of fixed length (e.g. 1,024 tokens). No padding, so no compute is wasted.
- **Batch size counted in tokens**: tokens per step = sequences per step × sequence length (× gradient accumulation steps). When memory is short, use gradient accumulation: run several small batches, add up the gradients, then update once.
- **Other schedules**: WSD (warmup–stable–decay) holds the learning rate constant through the middle and decays only in a short final stretch. The upside is that you can branch training runs of different lengths off a mid-run checkpoint, easing the "decide the total steps up front" problem above.
- **bf16 precision**: bf16 has an 8-bit exponent and a 7-bit mantissa, so the spacing in [1, 2) is 2⁻⁷ ≈ 0.0078; its range is as large as fp32's, so it rarely overflows.

</details>

### ★ How big should the model and data be?

Scaling laws say that loss changes very regularly with model size, data size and compute, so you can use experiments on small models to predict how a large model should be configured and how good it will get.

**What a power law looks like on a chart.** Kaplan et al. (2020) found that loss follows a smooth power-law relationship with parameter count, data size and compute. In plain words: every 10× more compute brings the loss down another notch, by about the same proportion each time. Put both the horizontal axis (compute) and the vertical axis (loss) on log scales and this relationship is a straight line heading down to the right (for how to read a log–log plot, see the [Math Refresher](/en/guide/math-refresher/#log-scales-and-loglog-plots)). A straight line lets you extrapolate: train a few small models each at 10¹⁸, 10¹⁹ and 10²⁰ FLOPs, draw the line, and estimate roughly where 10²² FLOPs will land.

Plugging numbers into the formula fitted in the Chinchilla paper (formula in the expandable section below), with the best model size chosen for each budget, the loss falls from 2.95 (1.2 × 10¹⁹) to 2.57 (1.2 × 10²⁰) to 2.31 (1.2 × 10²¹). Loss has a floor it can't go below (the inherent uncertainty of text); after subtracting that floor, "the part that can still come down" shrinks to about 0.7× for every 10× more compute.

**How to split fixed compute between model and data.** Hoffmann et al. (2022, Chinchilla) revised the allocation advice: for fixed compute, model parameters and training tokens should scale up roughly in proportion, with a rule of thumb of about 20 tokens per parameter. Using the same formula on this chapter's budget of 1.2 × 10²⁰ FLOPs, with every row satisfying 6·N·D = 1.2 × 10²⁰:

| Parameters N | Training tokens D | Tokens ÷ parameters | Predicted loss |
|---|---|---|---|
| 100 million | 200 billion | 2,000 | 2.75 |
| 250 million | 80 billion | 320 | 2.62 |
| 1 billion | 20 billion | 20 | 2.58 |
| 2.5 billion | 8 billion | 3.2 | 2.64 |
| 10 billion | 2 billion | 0.2 | 2.87 |

The table reads as a U-shaped curve: a model that's too small can't hold more, however much data you give it; a model that's too big doesn't get enough data to reach what it could. The bottom is very flat: from 250 million to 2.5 billion parameters (a 10× range) the predicted loss stays within 2.58–2.64, so 20:1 is a good starting point, not an exact answer. Kaplan's earlier advice was for models to grow faster than data. One widely accepted reason is that they didn't adjust the LR schedule to each run's length, so short runs were underestimated: exactly the "common misconception" from the previous section.

**Why many new models use far more than 20× tokens.** 20:1 is the configuration that's cheapest *to train*. But once trained, a model serves users, and inference costs about 2N per generated token (← [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)), so smaller models are cheaper. If a model will serve trillions of tokens, spending more training compute to get a smaller model of similar quality is well worth it. That's why many models today deliberately train smaller models on far more than 20× tokens. For example, Meta reported that the 8B Llama 3 model was pretrained on over 15T tokens, close to 2,000 tokens per parameter.

**The emergent abilities debate.** Wei et al. (2022) proposed "emergent abilities": some abilities are nearly zero below a certain model scale and appear suddenly above it. Schaeffer et al. (2023) offered the opposing reading: much of the "sudden appearance" comes from scoring methods that are themselves discontinuous (e.g. exact match only gives credit for a fully correct answer). Switch to a continuous score and the progress is actually smooth.

Here's the counterargument in numbers. Suppose a task only counts as correct if 5 steps in a row are all right, and the model's per-step accuracy rises smoothly with scale:

| Per-step accuracy | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 0.95 |
|---|---|---|---|---|---|---|
| Probability all 5 steps are right | 0.03 | 0.08 | 0.17 | 0.33 | 0.59 | 0.77 |

Per-step accuracy improves steadily, but exact match is nearly 0 in the first half and only shoots up in the second. Plotted, it looks like the model "suddenly got it."

Both sides have a point, and the question is still debated. Schaeffer et al. also state explicitly that they aren't claiming models can't have emergent abilities, only that previously claimed examples may be artifacts of the analysis. On the other hand, some tasks really are only useful when fully correct (e.g. the final answer of a multi-step calculation). There, even if the underlying progress is smooth, what users see is still "suddenly got it."

**Common misconception: a chart showing a sudden jump means the model crossed some threshold.** First ask what the scoring method is, then ask whether the jump is still sudden on a continuous metric (such as the probability of the correct answer).

<details class="deep">
<summary>Going deeper: scaling law formulas and fitting</summary>

- **The Chinchilla form**: L(N, D) = E + A / N^α + B / D^β. E is the floor that can't be reduced, the second term is the loss from "the model isn't big enough," and the third is the loss from "there isn't enough data." The paper's Approach 3 fit is E = 1.69, A = 406.4, B = 410.7, α = 0.34, β = 0.28. The losses in both tables above come from plugging in these numbers, e.g. N = 10⁹, D = 2 × 10¹⁰: 1.69 + 406.4 ÷ 10^(9 × 0.34) + 410.7 ÷ (2 × 10¹⁰)^0.28 ≈ 1.69 + 0.354 + 0.536 ≈ 2.58. These numbers depend on their data and tokenizer and don't transfer directly to different data.
- **The three approaches don't fully agree**: the paper estimates the optimal configuration three ways. Approach 1 fixes model size and varies the token count, taking the lowest-loss point at each compute level; Approach 2 fixes compute (IsoFLOP) and varies model size, finding the bottom of the U-shaped curve; Approach 3 fits the formula above directly. Approaches 1 and 2 find that N and D each grow with compute at about the 0.5 power; Approach 3 gives about 0.46 / 0.54, and a later replication (Besiroglu et al. 2024) found its fitted values unreliable. The details differ too: computing 1.2 × 10²⁰ with the formula above puts the minimum at about 700 million parameters and about 40 tokens per parameter. 20:1 is a rounded rule of thumb.
- **The Kaplan form**: fits three separate power laws L(N), L(D) and L(C), with exponents of about 0.076, 0.095 and 0.050, and recommends that the optimal model size grow with compute at about the 0.73 power, much faster than Chinchilla's 0.5. Kaplan also counted only non-embedding parameters.
- **Fitting it yourself**: on a log–log plot a power law is a straight line, so a linear regression of log(loss − E) on log(N) estimates the exponent; when E is unknown you need a nonlinear fit. If the range of scales is too narrow (e.g. in M3 small-model pretraining, the largest and smallest differ by only 4×; see [what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)), the estimated exponent is very noisy.
- **Why small scales may not match**: in very small models, embeddings make up a large share of the parameters; learning rate and batch size aren't retuned for each size; and when data repeats (more than 1 epoch), the extra tokens have diminishing value.

</details>

### ★ What if one GPU is not enough?

When a model is too big for one GPU, or training is too slow, you split the work across several GPUs. Every way of splitting trades off memory, compute and communication.

**Do the memory math first.** Mixed-precision training with AdamW needs about 16 bytes per parameter: bf16 weights and gradients at 2 bytes each, fp32 master weights at 4 bytes, and AdamW's two moving averages at 4 bytes each (breakdown in the expandable section of [S2 Transformers and Decoding](/en/stages/s02-transformer/#-how-much-compute-and-memory-does-a-model-need)). That's before counting activations (each layer's intermediate results from the forward pass, needed for backprop).

| Model | Training state | One 80 GB GPU |
|---|---|---|
| 1 billion parameters (this chapter's example) | About 16 GB | Fits; parallelism is only for speed |
| 7 billion parameters | About 112 GB | Doesn't fit |
| 70 billion parameters | About 1,120 GB | Nowhere close |

**Data parallel: copy the model, split the data.** Every GPU holds the full model and processes different data. After computing gradients, they're averaged across all GPUs, and each GPU applies the same update, so the model on every GPU stays identical. In this chapter's example with 8 GPUs, each step's 500,000 tokens give each GPU 62,500. It only speeds things up; it doesn't save memory: every GPU has to hold the full 16 bytes × N.

**ZeRO / FSDP: the memory-saving version of data parallel.** In plain data parallel, each of 8 GPUs stores an identical copy of the optimizer state, gradients and weights, which is very wasteful. ZeRO has each GPU store only 1/8, fetching the rest from other GPUs when needed. 7 billion parameters on 8 GPUs: plain data parallel needs 112 GB per GPU; with all three spread out, each needs only about 14 GB. The cost is communication: before computing each layer, its weights have to be gathered, then discarded afterward. PyTorch's FSDP (fully sharded data parallel) is an implementation of the same idea.

**Tensor parallel: split the matrices within a layer.** Cut a large matrix into pieces, e.g. 4 GPUs each handle 1/4 of the columns, compute their part of the result, then stitch the parts together. Every layer has to exchange results, so communication is very frequent; it's usually used only within one machine, where the GPUs have fast interconnects.

**Pipeline parallel: put different layers on different GPUs.** For example, a 32-layer model on 4 GPUs, 8 layers each, with data passed from station to station like an assembly line. The problem is that while the line starts up and winds down, the GPUs at the back or front sit idle. Cutting a batch into many small micro-batches and feeding them in one after another reduces the idle time.

Large training runs usually combine several of these: tensor parallel within a machine, pipeline and data parallel (plus ZeRO) across machines.

**Common misconception: double the GPUs, double the speed.** Every way of splitting needs to move data between GPUs, and the more GPUs, the larger the share of time spent communicating. ZeRO saves memory, but the computation per step stays the same; the saved memory can go to a larger batch, which may raise throughput, while Stage 3 adds communication. These tradeoffs come back on the inference side too (→ [S5 Inference and Serving](/en/stages/s05-inference/)).

<details class="deep">
<summary>Going deeper: communication, the three ZeRO stages, and pipeline idle time</summary>

- **All-reduce**: the collective communication data parallel uses to average gradients; at the end every GPU has the average of all gradients. It can be split into reduce-scatter (each GPU gets the sum for one slice) plus all-gather (send every slice to everyone), and ZeRO takes advantage of this split.
- **The three ZeRO stages** (7 billion parameters, 8 GPUs, 16 bytes per parameter): Stage 1 shards only the optimizer state (fp32 master weights and the two moving averages, 12 bytes), so each GPU needs about 2 + 2 + 12 ÷ 8 = 5.5 bytes/parameter, about 38.5 GB. Stage 2 also shards gradients, about 2 + 14 ÷ 8 = 3.75 bytes/parameter, about 26.25 GB. Stage 3 shards the weights too, 16 ÷ 8 = 2 bytes/parameter, about 14 GB. Stages 1 and 2 have about the same communication as plain data parallel; Stage 3, which gathers weights once in the forward pass and once in the backward pass, has about 50% more.
- **How tensor parallel splits**: the MLP's first matrix is split by columns and the second by rows, so the nonlinearity in between can be computed separately and one MLP needs only a single all-reduce at the end. Attention is split by heads across GPUs.
- **Pipeline idle fraction**: with p stages and m micro-batches, idle time is about (p − 1) ÷ (m + p − 1). With p = 4 and m = 16, about 16%.
- **Activation checkpointing**: in the forward pass, don't store every activation, only the inputs of some layers, and recompute the rest during the backward pass. It trades about a third more compute for a lot of memory.
- **Other dimensions**: for very long sequences, split the sequence (sequence / context parallel); with MoE, put different experts on different GPUs (expert parallel).

</details>

### ★ How do you know if training went well?

After training, you need to judge whether the model is any good. This chapter uses only the two most basic metrics (perplexity and held-out exact match); the full eval methodology is in [S8 Eval Methodology](/en/stages/s08-evals/).

**Perplexity.** Compute perplexity on held-out data the model hasn't seen (← [S1 Neural Network Basics](/en/stages/s01-neural-networks/)). Intuitively it's "how many options the model is torn between on average," and lower is better. The validation set has to be split off before training and deduplicated together with the training data; otherwise it's like testing on questions the model has already seen.

**Common misconception: perplexity can be compared directly across tokenizers.** Perplexity is an average "per token," and a token from a different tokenizer covers a different amount of text. Example: the same 1,000-character text is split into 250 tokens by model A's tokenizer, with perplexity 18, and into 400 tokens by model B's, with perplexity 12. B looks better, but convert to total loss over the whole text: A is 250 × ln 18 ≈ 723 and B is 400 × ln 12 ≈ 994, so A actually predicts this text better. The fair comparison is loss per character or per byte (e.g. bits-per-byte).

**Held-out exact match.** Prepare a set of questions with known answers (e.g. "The capital of France is" → "Paris") and look at the fraction the model gets exactly right. It maps directly to "is it usable?", but it's crude: one extra space or period counts as wrong, and as the emergent-abilities discussion above showed, exact match can make smooth progress look like a sudden jump.

<details class="deep">
<summary>Before you build: converting to bits-per-byte</summary>

bits-per-byte = total loss over the text (in nats, i.e. average per-token cross-entropy × number of tokens) ÷ the text's UTF-8 byte count ÷ ln 2. In the example above, if all 1,000 characters are 1 byte each, A is about 1.04 and B about 1.43. The bits-per-character used in M2 tiny GPT is the same idea with the character count as the denominator.

</details>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

1. By hand: for the two texts `a b c d e f` and `a b c x e f`, with 3 consecutive words per shingle, what is the Jaccard similarity?

   <details class="hint">
   <summary>Check your answer</summary>

   The first text has `abc`, `bcd`, `cde`, `def`; the second has `abc`, `bcx`, `cxe`, `xef`. Only `abc` is shared and the union has 7, so 1 ÷ 7 ≈ 0.14. Changing one word touched 3 shingles, so the similarity drops a lot.

   </details>

2. A 7-billion-parameter model has about 112 GB of training state. Using ZeRO (optimizer state, gradients and weights all sharded) across 4 GPUs with 80 GB each, how much does each GPU store? Does it fit?

   <details class="hint">
   <summary>Check your answer</summary>

   112 ÷ 4 = 28 GB, which fits, though that's before activations. With plain data parallel, every GPU would store the full 112 GB, which doesn't fit.

   </details>

### Core: Near-duplicate detection with MinHash

**Goal**: implement the most central step of a pretraining data pipeline and measure how accurate it is.

**Steps**
1. From Hugging Face's [`Salesforce/wikitext`](https://huggingface.co/datasets/Salesforce/wikitext) (config `wikitext-2-raw-v1`, `train` split), take in order the first 500 paragraphs that have at least 100 words and aren't headings (don't start with ` =`). Each paragraph is one document.
2. Create your own near-duplicates: pick 100 documents at random and make one copy of each with 2–5% of the words randomly replaced, deleted or inserted. Record which pairs are real duplicates as your ground truth.
3. Turn each document into a set of shingles (3 consecutive words), and first compute the true Jaccard similarity of every document pair by brute force.
4. Implement MinHash: with k hash functions, take the minimum of each over the shingle set to form a signature. The fraction of positions where two signatures match is the Jaccard estimate.
5. Implement LSH banding: cut the signature into b bands of r values each; any band that matches exactly makes a candidate pair, and only candidate pairs get their similarity checked.
6. Try at least 3 (k, b, r) settings and compare accuracy and number of comparisons.
7. A small estimate (no code needed): given 10¹⁸ FLOPs of compute, use C ≈ 6·N·D and Chinchilla's rule of thumb of about 20 tokens per parameter to compute the recommended parameter count N and token count D.

**Acceptance criteria**
- On document pairs with true Jaccard > 0.1, the mean absolute error between the MinHash estimate and the true Jaccard is below 0.05 (at k = 128). It's computed only on these pairs because the vast majority of pairs have Jaccard 0, and averaging over all of them would make the error meaninglessly small.
- At a similarity threshold of 0.5, recall on the planted duplicate pairs ≥ 0.9, with false positives ≤ 5% of the number of ground-truth pairs.
- Report how many document pairs LSH actually compared, against about 180,000 pairs for brute force (all pairs of 600 documents).
- A table of recall, false positives and comparison count for the three settings.
- N and D for step 7, with the working.

**Hints**
- TypeScript: you can implement the hash yourself (e.g. a set of random parameters for `(a·x + b) mod p` on 32-bit integers); no packages needed. `a·x` exceeds `Number.MAX_SAFE_INTEGER`, and computing it with number silently gives wrong results, so use BigInt; compare number and BigInt results on one input to confirm.
- Python: write it yourself first, then compare against the `datasketch` package.
- If you get stuck:
  - Reread: [How is training data prepared?](#-how-is-training-data-prepared) (including the candidate probability formula in the expandable section), [One budget, end to end](#-one-budget-end-to-end) (step 7 of the core exercise uses its step 1)
  - Further: the slides from the Stanford CS336 data lecture

<section class="deep-section">

### Advanced: Model project M3: small-model pretraining and a mini scaling experiment

**Goal**: produce a loss-versus-compute scaling plot yourself, and see how data deduplication affects the result.

**Steps**
1. Starting from rasbt chapter 5 (or your model from M2 tiny GPT), prepare up to a few tens of millions of training tokens and split off a fixed held-out validation set. By default, use `wikitext-103-raw-v1` from [`Salesforce/wikitext`](https://huggingface.co/datasets/Salesforce/wikitext) (about 100 million tokens; take the first few tens of millions).
2. Pick three model sizes, with the largest at least 4× the smallest in parameter count.
3. Train each size with the same LR schedule (warmup + cosine), recording cumulative compute (estimated with 6·N·D) and val loss at each checkpoint.
4. Plot the three loss–compute curves on the same log–log chart.
5. Run your deduplication code from the core exercise over the training data, and train once on the data before and after deduplication with the same model size and the same number of tokens. Clean data like wikitext has almost no near-duplicates to begin with, so there may be no difference; you can plant 10–20% near-duplicates as in the core exercise and compare again, or treat "no difference" as a valid conclusion and explain why.
6. Write an interpretation: which size is best at your largest compute? How far is it from the Chinchilla 20:1 estimate? Why might small-scale experiments not match?

**Acceptance criteria**
- One log–log chart with three curves, FLOPs on the horizontal axis and val loss on the vertical.
- A table: document count, token count and val loss before and after deduplication.
- The interpretation states your best model size, its token-to-parameter ratio, and how far that is from 20:1.

**Hints**
- Python: PyTorch; Apple MPS or CPU can run models in the millions to tens of millions of parameters.
- If you want the full modern pipeline, you can use [karpathy/nanochat](https://github.com/karpathy/nanochat) instead. It has scaled-down scripts for CPU / MPS (the author notes the results won't be good); the full version is designed to run on an 8×H100 node, and the README estimates about 2 hours and about $48, possibly less on spot instances. Actual cost depends on cloud pricing, so do your own estimate first.
- For compute options, see [Model Project (M1–M5)](/en/projects/model-thread/).
- If you get stuck:
  - Reread: [How do you keep a long run from blowing up?](#-how-do-you-keep-a-long-run-from-blowing-up) (the cosine formula), [How big should the model and data be?](#-how-big-should-the-model-and-data-be) (the expandable section on why small scales may not match)
  - Further: Approach 1 of the Chinchilla paper (fix model size, vary token count), which is closest to this experiment

</section>

## Self-check

1. Why does pretraining data need deduplication? Is removing exact duplicates enough?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: duplicates cause memorization, waste compute and contaminate evals. Reposted or lightly edited documents have completely different hashes, so you also need near-duplicate detection (MinHash). **Common mistake**: thinking hash deduplication catches lightly edited reposts. **Reread**: [How is training data prepared?](#-how-is-training-data-prepared)

   </details>

2. Work it out yourself: with 1.2 × 10²¹ FLOPs of compute, using 6·N·D and 20 tokens per parameter, what are N and D?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: substituting D = 20N gives 120N² = C, so N = √(10¹⁹) ≈ 3.2 billion and D ≈ 63 billion. **Common mistake**: forgetting the square root, or just dividing the compute by 6. **Reread**: step 1 of [One budget, end to end](#-one-budget-end-to-end)

   </details>

3. Chinchilla says "about 20 tokens per parameter." Why do many new models use far more tokens than that?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: 20:1 only makes training cheapest. Inference costs about 2N, so when a model will serve a lot of tokens, spending more training compute for a smaller model pays off. **Common mistake**: treating 20:1 as the ceiling for "best quality." **Reread**: [How big should the model and data be?](#-how-big-should-the-model-and-data-be)

   </details>

4. Why does mixed-precision training keep a separate fp32 copy of the master weights?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: near 1.0, bf16's spacing is about 0.0078, so a small update simply vanishes; updates have to be applied in fp32. **Common mistake**: thinking it's for faster computation or to avoid overflow. **Reread**: [How do you keep a long run from blowing up?](#-how-do-you-keep-a-long-run-from-blowing-up)

   </details>

5. In your own words, explain Schaeffer 2023's challenge to "emergent abilities," and name a situation it may not explain.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: discontinuous scoring (exact match) can make smooth progress look like sudden appearance; but for tasks that are only useful when fully correct, users still see it "suddenly work." **Common mistake**: saying "emergent abilities have been proven not to exist." **Reread**: the emergence paragraphs in [How big should the model and data be?](#-how-big-should-the-model-and-data-be)

   </details>

6. What's the difference between ZeRO and plain data parallel? What does it trade to get the memory savings?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: plain data parallel stores a full copy of the state on every GPU; ZeRO shards the optimizer state, gradients and weights, removing the duplicate copies. Stages 1 and 2 communicate about as much as plain data parallel; Stage 3 needs about half again as much. Computation per step stays the same, and the saved memory can go to a larger batch, which may raise throughput. **Common mistake**: thinking ZeRO itself reduces computation. **Reread**: [What if one GPU is not enough?](#-what-if-one-gpu-is-not-enough)

   </details>

7. Scenario: you measure perplexities of 12 and 18 on two models with different tokenizers, and a colleague concludes the first model is better. How do you respond?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: perplexity is a per-token average, and tokens from different tokenizers cover different amounts of text; convert to bits-per-byte before comparing. **Common mistake**: comparing the raw numbers and deciding 12 is better. **Reread**: [How do you know if training went well?](#-how-do-you-know-if-training-went-well)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original research or want to code along with someone line by line. None of it is required.

### Code along

- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — Chapter 5: pretraining on unlabeled data, with complete code for the training loop, evaluation and loading pretrained weights. M3 small-model pretraining can build directly on it.
- [Hugging Face Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) — The standard reading on parallel training, with measured numbers and interactive charts. Goes beyond the lecture with communication analysis for each kind of parallelism and strategies for combining them.

### Original papers

- [Kaplan et al. 2020, Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) — The first systematic study of LM scaling laws.
- [Hoffmann et al. 2022, Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556) — The Chinchilla paper, with full details of the three estimation approaches.
- [Wei et al. 2022, Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) — The case for emergent abilities, with curves for many tasks.
- [Schaeffer et al. 2023, Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) — The case against; read it together with the previous paper.
- [Rajbhandari et al. 2019, ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) — The original ZeRO paper, with memory and communication analysis of the three stages.

### Courses and data engineering

- [Stanford CS336](https://cs336.stanford.edu/) — Spring 2026 lectures on data, scaling and parallelism, for a deeper look at training systems. They assume Python, PyTorch, linear algebra and probability.
- [Princeton COS 597R](https://princeton-cos597r.github.io) — A reading list on data curation, including the dataset papers for Dolma, FineWeb, DCLM and others. Read it when you want to go deeper into data engineering.
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) — Curated links in section 2 (pretraining) of the Scientist part.

### Extra practice

- ○ If you know data engineering: rewrite the core exercise's MinHash + LSH for DuckDB or Spark, run it on about 100,000 documents from the `sample-10BT` subset of [FineWeb](https://huggingface.co/datasets/HuggingFaceFW/fineweb), and report throughput and the deduplication rate.

</section>
