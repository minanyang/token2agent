---
title: S5 Inference and Serving
head:
  - tag: title
    content: 'Faster LLM Inference: KV Cache and Serving (S5) | Token2Agent'
description: Why LLM inference is slow and how to speed it up. Prefill and decode, the KV cache, the GPU bandwidth bottleneck, batching and serving systems; estimate memory and speed limits, and measure latency metrics such as TTFT and TPOT.
sidebar:
  order: 5
  label: S5 Inference and Serving
---

:::note[This chapter]
**Prerequisites**: [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (optional); if you only want intuition for cost and latency, the [Model Crash Course](/en/guide/app-first/) is enough for the main line　**Next**: → [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/); prompt caching → [S11 Context Engineering](/en/stages/s11-context-engineering/); constrained decoding → [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/); self-hosting vs APIs → [S18 Deployment and Architecture](/en/stages/s18-deployment/)
:::

:::tip[Concepts route: key points]
- A model reads its input all at once but writes its answer one token at a time, so output is slow and expensive.
- Text generation speed is mostly limited by how fast the model can be moved out of memory, not by compute.
- Processing many people's requests together saves money, but each person waits a little longer for each token.
:::

## What this chapter covers

Reasoning models (← [S4 Post-training and Reasoning](/en/stages/s04-post-training/)) spend a lot of tokens thinking. This chapter explains where the cost and latency of those tokens come from: how the model runs, why it's slow, and how to make it faster and cheaper. There's only one core idea: when generating text, the bottleneck is usually not compute but how fast the weights can be moved out of memory. Start from there and it all makes sense: why APIs charge more for output than input, why a long prompt delays the first token, and why serving systems bundle many people's requests together.

## After this chapter you can

- Use example numbers to show whether a request's time goes to prefill or decode, and what problem the KV cache and batching each solve. (lecture and self-check)
- Explain why API output tokens cost more than input tokens, and why a long prompt makes the first token arrive later. (core)
- Given a model and hardware, estimate how much memory the weights and KV cache need and the theoretical upper limit on decode speed. (core)
- Tell which speedups change the output and which don't, and name the cost of each. (advanced)
- Write a minimal inference server and measure TTFT, TPOT and throughput. (advanced; the core exercise only measures TTFT and TPOT)

## Lecture

The big picture first. When you send a request, the model's work has two phases: first it reads the whole input in one go, called **prefill**; then it writes the answer one token at a time, called **decode**. The two phases have completely different bottlenecks, and almost every "why is this so expensive, so slow" can be explained from here. The lecture first walks one request end to end, then explains the reasons behind it section by section.

### ★ One example, end to end

The whole chapter uses the same example. The model and GPU are made up, with numbers picked to be round and easy to work with; real models and hardware have different numbers, but the calculation is exactly the same.

| | Setup |
|---|---|
| Model "Example 8B" | 8 billion parameters, stored in bf16 (2 bytes per parameter) |
| GPU | 48 GB of GPU memory; memory bandwidth 1,000 GB/s (it can move 1,000 GB out of memory per second); compute 100 TFLOPS (100 trillion floating-point operations per second) |
| Request | 2,000 input tokens (system prompt, conversation history, question); the model answers with 500 tokens |

In time order:

1. **Load**: the weights are 8 billion × 2 bytes = 16 GB. Once they're in GPU memory, 32 GB is left.
2. **Prefill**: the 2,000 input tokens are computed together. Processing one token takes about 2 operations per parameter (one multiply, one add; ← [S2 Transformers and Decoding](/en/stages/s02-transformer/)), so the total is 2 × 8 billion × 2,000 = 32 trillion operations. At 100 trillion per second, that's about 0.32 seconds.
3. **First token appears**: the user has waited about 0.32 seconds (not counting queueing). This wait is called TTFT.
4. **Decode**: every token generated after that requires reading the 16 GB of weights from memory once: 16 GB ÷ 1,000 GB/s = 16 ms. 500 tokens is 500 × 16 ms = 8 seconds.
5. **The tally**: reading 2,000 tokens took 0.32 seconds, 0.16 ms each on average; writing 500 tokens took 8 seconds, 16 ms each. Output tokens are 100 times slower than input tokens.

<figure>
<svg viewBox="0 0 640 150" width="640" style="max-width:100%;height:auto;display:block;margin:0 auto" role="img" aria-label="Timeline of the example request: prefill processes 2,000 input tokens at once in about 0.32 seconds, which is the TTFT; after that, decode produces one token every 16 ms, and this interval is the TPOT" font-size="13" fill="currentColor">
<defs><marker id="s5-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="20" y="40" width="320" height="34" rx="4"/>
<rect x="344" y="40" width="13" height="34" rx="2"/><rect x="360" y="40" width="13" height="34" rx="2"/><rect x="376" y="40" width="13" height="34" rx="2"/><rect x="392" y="40" width="13" height="34" rx="2"/><rect x="408" y="40" width="13" height="34" rx="2"/><rect x="424" y="40" width="13" height="34" rx="2"/><rect x="440" y="40" width="13" height="34" rx="2"/><rect x="456" y="40" width="13" height="34" rx="2"/><rect x="472" y="40" width="13" height="34" rx="2"/><rect x="488" y="40" width="13" height="34" rx="2"/><rect x="504" y="40" width="13" height="34" rx="2"/><rect x="520" y="40" width="13" height="34" rx="2"/><rect x="536" y="40" width="13" height="34" rx="2"/><rect x="552" y="40" width="13" height="34" rx="2"/><rect x="568" y="40" width="13" height="34" rx="2"/>
<path d="M20,84 V92 H340 V84 M344,84 V92 H357 V84"/>
<path d="M20,130 H625" marker-end="url(#s5-arrow)"/>
</g>
<g stroke="none">
<text x="180" y="62" text-anchor="middle">prefill: 2,000 input tokens at once</text>
<text x="462" y="30" text-anchor="middle">decode: 1 token per step</text>
<text x="604" y="62" text-anchor="middle">…</text>
<text x="180" y="110" text-anchor="middle">TTFT ≈ 0.32 s</text>
<text x="344" y="110">TPOT ≈ 16 ms</text>
<text x="625" y="146" text-anchor="end" font-size="12" opacity="0.8">time</text>
</g>
</svg>
<figcaption>Drawn to scale: the 0.32 seconds of prefill equals exactly 20 decode steps. 500 output tokens take 500 steps, about 8 seconds; the figure shows only the beginning.</figcaption>
</figure>

This 100× gap is the root of why API price lists charge several times more for output than for input. The real price gap isn't 100×, because serving systems decode many people's requests together and share the cost (see [How do you serve many users at once?](#-how-do-you-serve-many-users-at-once)). It also shows why reasoning models are slow: thinking for 5,000 tokens takes 5,000 × 16 ms = 80 seconds of decode alone.

The times above are theoretical lower bounds; in practice it's somewhat slower, for reasons covered in [How do you measure latency and throughput?](#-how-do-you-measure-latency-and-throughput). First, the key question: if the GPU can do 100 trillion operations per second, why does decoding one token still take 16 ms?

### ★ What limits GPU speed?

A GPU has two limits: how fast it can compute (compute), and how fast it can move data (memory bandwidth). Whichever you hit first sets the speed.

**Memory has two tiers.** The weights and the KV cache live in GPU memory (HBM, often just called VRAM), which is large but takes time to move data to the compute units. Next to the compute units there's a very small, very fast on-chip memory (SRAM) that only holds the small chunk of data currently being computed. For every computation, data has to move from HBM into SRAM first.

**Arithmetic intensity: how many operations per byte moved.** The example GPU can compute 100 trillion operations and move 1,000 GB per second. Dividing one by the other gives 100: you need at least 100 operations per byte moved to keep the compute busy. Do fewer and the compute units sit waiting for data; that's **memory-bound**. Only above that are you **compute-bound**. Modern data center GPUs need several hundred operations per byte to saturate their compute.

**Applying this to LLMs.** In bf16 each parameter takes 2 bytes, and processing one token does 2 operations on it, so if each read of the weights processes only 1 token, the intensity is 1. If one read of the weights processes n tokens at once, the intensity is n. In other words, **intensity is roughly how many tokens share one read of the weights**.

| Phase | Tokens per weight read | Intensity | State on the example GPU |
|---|---|---|---|
| Prefill (2,000 input tokens) | 2,000 | about 2,000 | far above 100, compute-bound |
| Decode (single request) | 1 | about 1 | far below 100, memory-bound |

Decode uses only about 1/100 of the compute limit; the rest of the time it's waiting for the weights to arrive. That's where the 16 ms comes from: the speed is set by "weight size ÷ bandwidth" and has almost nothing to do with compute.

**Common misconception: the more "powerful" the GPU, the faster the generation.** Decode speed for a single request depends on memory bandwidth, not TFLOPS. Two GPUs with a 2× compute difference but the same bandwidth generate at almost the same speed for a single user chatting. The same goes for running models locally: when comparing machines, look at memory bandwidth first.

<details class="deep">
<summary>Going deeper: the roofline formula and what this estimate ignores</summary>

- **Roofline**: plot both limits on one chart, with intensity on the x-axis and achievable compute speed on the y-axis. At low intensity, speed rises in proportion to intensity (the bandwidth slope); past the turning point (100 for the example GPU) it hits the ceiling (the flat compute line). Decode sits at the very bottom of the slope.
- **Roofline formula**: achievable compute speed = min(peak compute, bandwidth × intensity). The turning-point intensity = peak compute ÷ bandwidth.
- **What's ignored**: the estimate above counts only the weights. Each decode step also reads that request's KV cache (next section) and writes a small amount of intermediate results; prefill also has the computation of the attention scores themselves, which grows with the square of the input length when the input is long.
- **Specs aren't reality**: the official bandwidth and compute figures are peaks that real code usually doesn't reach; quantized formats also spend a little extra time restoring values (dequantizing).
- **Reading official specs**: compute is often quoted with sparsity or at lower precision, which makes the number several times larger than dense bf16 compute.

</details>

### ★ What does the KV cache store, and how big is it?

The KV cache stores intermediate results already computed for earlier text, so each decode step only processes the new token. The price is memory: for a long conversation, the KV cache can be bigger than the model weights.

**Why you need it.** Without a cache, writing output token 501 means recomputing all 2,500 previous tokens; writing output token 502 means recomputing 2,501. The work snowballs with length. But thanks to the causal mask (← [S2 Transformers and Decoding](/en/stages/s02-transformer/)), the keys and values of earlier tokens aren't changed by later tokens, so they can be computed once and reused.

**What it stores.** Attention is split into several heads. For every layer and every head, each token stores a key vector and a value vector, each of head-dimension length. Many modern models use GQA, where several query heads share one set of keys and values, so the number of sets stored is the **number of KV heads**, called `num_key_value_heads` in `config.json`. Putting it together:

> KV cache per token = 2 (key and value) × layers × KV heads × head dimension × bytes per value

**Working it out for Example 8B.** Assume it has 32 layers, 8 KV heads, a head dimension of 128, and a KV cache also in bf16 (2 bytes):

- Per token: 2 × 32 × 8 × 128 × 2 = 131,072 bytes (128 KiB, about 0.13 MB).
- The example request (2,000 input + 500 output = 2,500 tokens): 2,500 × 131,072 ≈ 330 million bytes, about 0.33 GB.
- A long 32K-token (32,768-token) conversation: 32,768 × 131,072 ≈ 4.3 GB.

After loading the weights, 32 GB is left. Counting only the KV cache, that holds about 97 example requests at once, or 7 long 32K conversations. If this model didn't use GQA and had 32 KV heads per layer, the KV cache would be 4 times larger, a single 32K conversation would need about 17 GB, and 32 GB would hold only 1. That's why S2 Transformers and Decoding covers GQA and MLA as ways to shrink the KV cache.

**Decode reads the KV cache too.** For every token generated, attention looks back at all the earlier text, so besides the weights, the request's whole KV cache is read once. The longer the conversation, the more each step reads, and TPOT slowly grows. But the weights are usually still the bulk of it, so the change is much smaller than for TTFT.

**Common misconception: the KV cache caches "answers."** It only stores intermediate results for one request's own earlier text, and it's freed when the request ends. If two users ask exactly the same question, the model still computes each separately (unless the beginnings match exactly and prefix caching kicks in; see [later](#-how-does-prompt-caching-work)). Another common misconception: weights fitting in GPU memory doesn't mean you can run long contexts; you also need room for the KV cache.

<details class="deep">
<summary>Before you build: estimating parameter count and KV cache from config.json</summary>

**Units**: KiB = 1,024 bytes, GiB = 1,024³ bytes; GB = 10⁹ bytes. Have your calculator output bytes and convert separately, so you don't mix them up.

**Fields to read for the KV cache**: `num_hidden_layers` (layers), `num_key_value_heads`, `head_dim` (when it's missing, usually `hidden_size` ÷ `num_attention_heads`), and `torch_dtype` or whichever number format you specify.

**Parameter count**: for Llama/Qwen-style models, add up the size of every matrix (d = `hidden_size`, h = `num_attention_heads`, h_kv = `num_key_value_heads`, d_h = head dimension, m = `intermediate_size`, V = `vocab_size`, L = layers):

| Part | Parameters per layer |
|---|---|
| Attention q and output matrices | d × (h·d_h), one each |
| Attention k and v matrices | d × (h_kv·d_h), one each |
| SwiGLU MLP | 3 × d × m |
| Two RMSNorms | 2 × d (tiny) |

Then add the embedding table V × d, the final norm, and the output layer: when `tie_word_embeddings` is `true`, the output layer shares the embedding matrix and is counted once; only when it's `false` do you add another V × d. Some models have other tiny norm parameters that barely affect an estimate at the "hundreds of millions" level.

**Check it with a made-up config**: d = 4,096, h = 32, h_kv = 8, d_h = 128, m = 14,336, V = 128,000, L = 32, embeddings not tied.

- Attention per layer: 2 × 4,096 × 4,096 + 2 × 4,096 × 1,024 = 41,943,040
- MLP per layer: 3 × 4,096 × 14,336 = 176,160,768
- Norms per layer: 8,192; per-layer total 218,112,000, or 6,979,584,000 for 32 layers
- Embedding and output layer: 2 × 128,000 × 4,096 = 1,048,576,000; final norm 4,096
- Total 8,028,164,096, about 8 billion: the size of Example 8B.

**Trap**: some checkpoints store a separate output layer (lm_head) in the file even though the config says `tie_word_embeddings: true`, for example Qwen3-0.6B. So don't infer parameter count from file size.

**MLA**: models that use MLA, like DeepSeek's, store compressed vectors, so the KV formula above doesn't apply; you have to compute it separately from fields such as `kv_lora_rank`.

</details>

### ★ How do you serve many users at once?

If decode is stuck on reading weights, let many requests share the same read. This is the core of how serving systems save money; the hard part is that requests vary in length and KV cache memory is easy to waste.

**How batching saves.** Decode 32 requests together and each step reads the weights only once (16 GB), plus 32 separate KV caches. Assume each averages 0.33 GB:

- Each step reads 16 + 32 × 0.33 ≈ 26.6 GB, about 26.6 ms, and produces 32 tokens at once.
- Throughput goes from 62.5 tokens per second for a single request to about 1,200 per second, and the cost per output token drops to about 1/19.
- The price: each person's TPOT goes from 16 ms to 26.6 ms.

Two things cap how large it can get: the KV cache filling memory (as computed in the previous section, about 97 example requests), or the tokens processed per step growing until you become compute-bound (about 100 on the example GPU).

**Static vs continuous batching.** The simplest approach is to fill a batch and run it all to the end together, called static batching. The problem is uneven lengths: if 4 requests need 50, 100, 200 and 500 output tokens, the whole batch runs 500 steps, and the slots of the three that finished early sit idle. Only (50 + 100 + 200 + 500) ÷ (4 × 500) = 42.5% of the slots are actually used. **Continuous batching** (the iteration-level scheduling introduced by Orca) reschedules after every generated token, filling in a new request as soon as one finishes, so slots almost never sit empty.

**PagedAttention: don't reserve the KV cache in one big block.** Early systems reserved one contiguous block per request, sized for the maximum length it might use. If every request reserves enough for 32K (4.3 GB), 32 GB holds only 7; but most requests actually use only 2,500 tokens, and sized by actual use 97 would fit. vLLM's PagedAttention borrows the idea of virtual memory from operating systems: it splits the KV cache into fixed-size blocks (say 16 tokens each) and allocates a block only when it's needed, so the only waste is the unfilled part of the last block. Multiple requests can also share blocks with identical content.

**RadixAttention: share prefixes automatically.** Many requests start the same way: the same system prompt, the earlier turns of the same multi-turn conversation, the tool descriptions an agent carries at every step. SGLang's RadixAttention records every request's prefix in a radix tree (a tree that branches by prefix), so the shared beginning has its KV cache computed only once and shared by everyone.

**Common serving engines.**

| Engine | Good for | Highlights |
|---|---|---|
| vLLM | Serving many users on GPUs | PagedAttention, continuous batching |
| SGLang | Same, especially multi-turn conversations and agents | RadixAttention reuses prefixes automatically |
| llama.cpp, Ollama | Running models locally | Uses the GGUF quantized format; runs on Macs and ordinary computers |

**Common misconception: batching makes a single request faster.** It's the opposite: batching raises the whole system's throughput, and each person's TPOT gets a bit slower. So batch size is a tradeoff between cost and latency.

### ★ How do you measure latency and throughput?

Measure latency as two separate things, "how long until the first token" and "how fast tokens come after that," and measure system efficiency by throughput. The three pull against each other, and your report also has to look at the slowest requests.

| Metric | Meaning | Numbers from the example |
|---|---|---|
| **TTFT** (time to first token) | From sending the request until the first token appears; equals queueing + prefill | about 0.32 s (excluding queueing) |
| **TPOT** (time per output token) | Average interval between later tokens; sets how fast streamed text appears | 16 ms alone, 26.6 ms at batch 32 |
| **Throughput** | Tokens per second produced by the whole system; reflects cost efficiency | 62.5 per second alone, about 1,200 at batch 32 |
| **Goodput** | Counts only requests that meet the latency targets (SLOs) | see below |

A request's total latency ≈ TTFT + output tokens × TPOT. The example request at batch 32 takes 0.32 + 500 × 0.0265 ≈ 13.6 seconds, of which prefill is only a small part, so shortening the output usually cuts latency more than shortening the input.

**How it changes with prompt length.** TTFT is roughly proportional to input length: 4 times the input means 4 times the prefill work. With very long inputs, the cost of attention grows with the square of the length (each token is compared with every earlier token), so TTFT grows even faster. TPOT is insensitive to input length; it only grows slowly because each step reads more KV cache.

**The gap between the theoretical limit and measurements.** "Weight size ÷ bandwidth" is the upper limit on decode speed. Measurements are usually noticeably slower: real bandwidth doesn't reach the spec, each step also reads the KV cache, each step has fixed software overhead, and quantized models have to restore values. When comparing, the ratio "measured ÷ theoretical" means more than the absolute numbers.

**Goodput.** Say the targets are TTFT under 1 second and TPOT under 50 ms. The system completes 10 requests per second, 3 of which miss the targets, so goodput is 7 per second. A bigger batch can make throughput look better, but more requests miss the targets and goodput actually drops.

**P50 and P99.** P50 is the median; P99 is the value that 99% of requests are faster than. Of 100 requests, 98 have a TTFT of 0.4 seconds and 2 have 12 seconds: the average is about 0.63 seconds, which looks fine; P50 is 0.4 seconds, but P99 is 12 seconds.

**Common misconception: if average latency is good, users are happy.** Users remember the slowest times, so always report latency as P50 and P99. When TTFT occasionally spikes, the cause is often not the model itself but queueing: a few very long prompts happened to be in prefill ahead of it, or the KV cache was full and new requests had to wait.

### ★ Does speeding up change the output?

First sort speedups into two kinds: those that guarantee the same output as before (or the same probability distribution), and those that trade a little quality for speed or memory. Before using one, ask "which kind is it?" and you'll know whether you need to re-evaluate quality.

| Method | Kind | How it speeds things up | Cost |
|---|---|---|---|
| FlashAttention | Doesn't change output | Reorders the attention computation so intermediate results stay in SRAM and less data moves; mathematically the same result | Needs a specialized kernel (a dedicated program that runs on the GPU) |
| Prefix caching | Doesn't change output | Reuses the KV cache of an identical beginning, skipping that part of prefill | Takes memory; the beginning must match exactly |
| Speculative decoding | Doesn't change the output distribution | A small model guesses first, the large model verifies in one pass | An extra small model to run; no gain when guesses are often wrong |
| Quantization | Approximate | Stores weights in fewer bits, so they read faster and take less memory | Quality may drop |
| Distillation, pruning | Approximate | Switch to a smaller model (distillation ← [S4 Post-training and Reasoning](/en/stages/s04-post-training/)) or remove unimportant weights | Quality may drop, and it needs retraining |

**Speculative decoding.** This exploits exactly the fact that decode is memory-bound: one read of the weights takes about as long whether it processes 1 position or 5. So let a cheap small model (the draft model) guess the next 4 tokens, then have the target model check all 4 positions in one pass, costing about one decode step. Suppose the first 3 guesses are right: accept those 3, plus the 1 token the target model itself produces at the first wrong position, and this round yields 4 tokens that would otherwise take 4 steps. With the correct acceptance rule (see the expandable section below), the output's probability distribution is exactly the same as using the target model alone. The higher the hit rate, the bigger the payoff; when the batch is already large and the GPU is close to compute-bound, the premise that "verification is nearly free" no longer holds and the benefit shrinks.

**Quantization.** Switch Example 8B to 4-bit (0.5 bytes per parameter) and the weights go from 16 GB to about 4 GB (a bit more with the scale factors). The decode limit goes from 16 ms per token to about 4 ms, and there's more room for the KV cache. Common approaches:

- **GPTQ**: adjusts the quantized weights layer by layer to minimize the error in each layer's output.
- **AWQ**: uses activations to find important weight channels (a column of the weight matrix) and protects them.
- **GGUF**: the file format llama.cpp uses, with many quantization levels; the most common format for running models locally. Most models Ollama downloads by default are 4-bit.

**Common misconception: quantization is "close enough," so it doesn't need checking.** After quantizing, always retest quality on your own eval data; don't assume it's about the same. Different tasks are affected to different degrees. Also, the 4× from 4-bit is only an upper bound; measurements come in lower.

<details class="deep">
<summary>Going deeper: the speculative decoding acceptance rule and how FlashAttention works</summary>

**Acceptance rule**: for each guessed token x, the draft model gives it probability q(x) and the target model gives p(x). Accept with probability min(1, p(x) / q(x)); on a rejection, sample a replacement token from max(0, p − q) renormalized (so it sums to 1), and discard all later guesses. If every guess is accepted, the target model adds one more token at the last position. You can prove that every token produced this way follows the target model's distribution p. Under greedy decoding the rule simplifies to: accept a guessed token if it equals the target model's argmax.

**Variants**: you don't need a separate model. Some approaches add a few small prediction heads to the target model to guess several tokens at once; others look for matching spans in the prompt to use as guesses (good for tasks that copy large chunks of input, such as rewriting code).

**FlashAttention**: the straightforward implementation writes the whole L × L attention score table back to HBM, then reads it out for the softmax and the multiplication by V, so data movement grows with the square of the length. FlashAttention splits Q, K and V into small tiles, moves only one small tile into SRAM at a time, and accumulates the result with a softmax that updates as it goes (online softmax), so the score table is never written back to HBM. The number of operations is the same; data movement drops sharply. Floating-point operations happen in a different order, so values may differ very slightly, but mathematically it's the same result.

</details>

### ★ How does prompt caching work?

Two API features are inference-level mechanisms underneath: prompt caching is cross-request reuse of the KV cache, and constrained decoding restricts the candidate tokens at each decode step.

**Prompt caching.** An API's prompt caching is prefix KV reuse: when the beginning of this request exactly matches some recent request, the server pulls out the stored KV cache and skips that part of prefill. If the first 1,500 of the example request's 2,000 input tokens (system prompt and tool descriptions) hit the cache, only the remaining 500 need prefill, TTFT drops from 0.32 seconds to about 0.08 seconds, and those 1,500 tokens skip most of their computation, which is why cached input tokens are cheaper.

The cache only matches identical prefixes: change one character at the beginning (for example, putting the current time at the very top of the system prompt) and all the KV cache after it is different, so the whole thing has to be recomputed. The cache also expires after a period without use. How to arrange context to raise the hit rate → [S11 Context Engineering](/en/stages/s11-context-engineering/).

**Constrained decoding.** At each decode step, work out from the JSON schema or grammar "which tokens are allowed right now," set every other token's probability to 0, and choose from the remaining candidates. For example, if the output so far is `{"title": ` and the schema says title is a string, this step can't pick a number or `{`, only a token that can start a string. So as long as generation ends normally, the output follows the grammar. The cost is a bit more computation per step, and it can push the model toward tokens it wouldn't otherwise choose (in practice → [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)).

**Common misconception: constrained decoding guarantees complete JSON.** If the output is cut off by `max_tokens`, or the model refuses, the result can still be incomplete; your code still has to check it.

<section class="deep-section">

### ○ What else is there to serving at scale?

Since prefill and decode behave completely differently (one compute-bound, one memory-bound), you can put them on different GPUs and tune each separately; this is called prefill/decode disaggregation (for example DistServe, Mooncake). The KV cache can also be tiered: systems such as Mooncake and LMCache move KV cache that isn't needed right now to CPU memory or disk and bring it back when needed, which is cheaper than redoing prefill. CacheBlend lets segments that aren't at the beginning (such as RAG retrieval results) reuse precomputed KV caches too. To write kernels like FlashAttention yourself, learn CUDA or Triton.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** GPU A: 200 TFLOPS compute, 1,000 GB/s bandwidth. GPU B: 100 TFLOPS compute, 2,000 GB/s bandwidth. Running Example 8B (16 GB of weights) for a single user chatting, which one generates text faster? Which one gets the first token out faster (2,000 input tokens, as in the lecture example)?

<details class="hint">
<summary>Check your answer</summary>

Generation (decode) depends on bandwidth: A takes 16 ms per token, B 8 ms, so B is twice as fast. The first token (prefill, 2,000 input tokens) depends on compute: A takes about 0.16 seconds, B about 0.32 seconds, so A is faster.

</details>

**2.** One request has 4,000 input tokens and 200 output tokens; another has 200 input and 4,000 output. Using the example's numbers, which has the longer total latency, and why?

<details class="hint">
<summary>Check your answer</summary>

The first: prefill about 0.64 seconds + decode 200 × 16 ms = 3.2 seconds, about 3.8 seconds in total. The second: prefill about 0.03 seconds + decode 4,000 × 16 ms = 64 seconds. The second is far longer: output tokens are written one at a time, each requiring a read of the weights; input is computed all together.

</details>

### Core: An inference calculator and local measurements

**Goal**: predict inference memory and speed with formulas, then verify by measuring, to build intuition for the numbers.

**Steps**
1. Write a calculator. Input: the model's `config.json` (layers, hidden size, attention heads, KV heads, head dimension, MLP intermediate size `intermediate_size`, vocabulary size, whether input and output embeddings are tied `tie_word_embeddings`), the number format, and a context length. Output: an estimated parameter count, weight size, KV cache size per token, and total KV cache for the given length.
2. Add the hardware's memory bandwidth as an input and output the theoretical upper limit on decode speed (bandwidth ÷ weight bytes read per token).
3. Check it with [Qwen3-0.6B's config](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json), then pick a model you're interested in.
4. Run a small model locally with Ollama (or llama.cpp), generate 128 tokens from the same prompt, repeat 20 times, and pull the prefill and decode times from the responses.
5. Run prompts of 4 lengths (for example about 256, 1K, 4K and 8K tokens) 5 times each and record TTFT and TPOT.

**Acceptance criteria**
- For Qwen3-0.6B (bf16), the calculator gives a KV cache of 114,688 bytes per token and about 600 million parameters (input and output embeddings counted once).
- A table: theoretical decode limit, median and P90 of measured TPOT, the ratio between them, and one sentence explaining the gap.
- A chart: TTFT against prompt length; explain how TTFT and TPOT each change with prompt length, and why.

**Hints**
- TypeScript: call Ollama's HTTP API with `fetch`; the calculator itself needs no packages.
- Python: `requests` or the `ollama` package; read `config.json` with `json`.
- Ollama's [API](https://docs.ollama.com/api/usage) returns `prompt_eval_count`, `prompt_eval_duration`, `eval_count` and `eval_duration` (in nanoseconds). Note that `prompt_eval_duration` only counts prompt tokens that weren't cached, and `prompt_eval_cached_count` is how many were read from the cache. When measuring prefill, put the part that changes (for example a random string) at the **start** of the prompt: if you only change the end, the whole beginning still hits the cache. Check that `prompt_eval_cached_count` is 0 each run.
- When using Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)): the default may be only 4K, and the 4K and 8K prompts in step 5 will definitely hit it.
- Look up memory bandwidth in the official specs: for Apple Silicon it's on each model's tech specs page, for NVIDIA in the GPU's datasheet.
- For quantized models (such as Ollama's default 4-bit), a parameter isn't 2 bytes; convert accordingly when computing the limit.
- If you get stuck:
  - Reread: [KV cache](#-what-does-the-kv-cache-store-and-how-big-is-it) (including the parameter count formulas in "Before you build"), [What limits GPU speed?](#-what-limits-gpu-speed), [How do you measure latency and throughput?](#-how-do-you-measure-latency-and-throughput)
  - Further: the "Introduction to Inference" and "KV Cache" chapters in Part I of zero-to-sglang

<section class="deep-section">

### Advanced: Model project M5: KV cache, quantization and a mini inference server

**Goal**: implement the key inference components yourself on Qwen3-0.6B, and show each component's effect with measured numbers.

**Steps**
1. Load the weights of [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) and write your own generation loop (no KV cache yet).
2. Add a KV cache and compare the time to generate 256 tokens.
3. Implement or apply weight quantization (for example int8 per-channel, then try 4-bit), and compare quality, memory, TTFT and TPOT. Measure quality as perplexity on a fixed held-out text, or as accuracy on 100 questions with reference answers.
4. Build an HTTP inference server, first with static batching, then switch to continuous batching.
5. Write a load-testing tool and measure throughput and TTFT P50/P99 at concurrency 1, 4 and 16.
6. Read [nano-vllm](https://github.com/GeeeekExplorer/nano-vllm) (about 1,200 lines), compare it with your implementation, and list the optimizations it has that yours doesn't.

**Acceptance criteria**
- Correctness: for 20 prompts under greedy decoding at fp32 precision, the output with and without the KV cache is identical.
- bf16: using the token sequence generated by the fp32 version as fixed input (teacher forcing), compare the two paths' log-softmax at each step, converted to fp32, and report the maximum absolute difference (no fixed threshold like 1e-2: with logits of 10–30, adjacent representable bf16 values are 0.06–0.125 apart); argmax agrees on ≥ 99% of steps; on steps where it doesn't, the probability gap between the top two tokens should be < 0.05 (bf16 floating-point error can swap nearly tied candidates; that's not a bug).
- A before/after quantization table: quality metric, weight memory, TTFT, TPOT.
- A static vs continuous batching table: throughput and P50/P99 TTFT at the three concurrency levels.
- A comparison list: at least 3 optimizations in nano-vllm and what problem each solves.

**Hints**
- Python: PyTorch, `transformers` (only for loading weights and the tokenizer), FastAPI or any HTTP framework.
- **Compute**: you can verify correctness on a CPU, but latency and throughput numbers only mean something when measured on an NVIDIA GPU; Mac MPS isn't suited to this step. Renting a GPU for this step usually costs less than for M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 ([how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)), but still measure first. See [Model Project (M1–M5)](/en/projects/model-thread/).
- The measurements from this step are used in S18 Deployment and Architecture to compare costs against APIs.
- If you get stuck:
  - Reread: [KV cache](#-what-does-the-kv-cache-store-and-how-big-is-it), [batching](#-how-do-you-serve-many-users-at-once), [speedups](#-does-speeding-up-change-the-output)
  - Further: the KV Cache, Continuous Batching and Paged KV Cache chapters in Part II of zero-to-sglang

</section>

## Self-check

1. Why is decode memory-bound? Why does a larger batch raise throughput?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: for a single request, every token requires reading all the weights once, an intensity of about 1, far below the roughly 100 the GPU needs; a batch lets many tokens share the same read. **Common mistake**: thinking batching makes everyone faster. **Reread**: [What limits GPU speed?](#-what-limits-gpu-speed)

   </details>

2. To serve 32K-token conversations with a model, what besides the weights do you need to budget memory for? How do you estimate it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: KV cache = 2 × layers × KV heads × head dimension × bytes × tokens; one 32K conversation on Example 8B is about 4.3 GB, multiplied by however many you serve at once. **Common mistake**: counting only the weights and forgetting the KV cache grows with token count. **Reread**: [What does the KV cache store, and how big is it?](#-what-does-the-kv-cache-store-and-how-big-is-it)

   </details>

3. FlashAttention and int4 quantization both make inference faster. How do they differ on "does it change the output"?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: FlashAttention only changes the order of computation, so the result is mathematically the same; int4 quantization is an approximation, quality may drop, and you need to retest on your own eval data. **Common mistake**: treating both as "quality unchanged" speedups. **Reread**: [Does speeding up change the output?](#-does-speeding-up-change-the-output)

   </details>

4. Why do APIs charge less for "cached input tokens"? When does the cache stop working?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: a matched prefix uses the stored KV cache directly and skips the prefill computation; changing any character in the prefix (for example, putting the time at the very top), or expiry after a period without use, invalidates it. **Common mistake**: thinking the cache stores "answers." **Reread**: [How does prompt caching work?](#-how-does-prompt-caching-work)

   </details>

5. Scenario: your chat service has good average latency, but users complain that sometimes they wait more than ten seconds for the first token. Which metrics would you look at, and which causes would you suspect?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: look at TTFT P99, not the average; suspect queueing: a very long prompt ahead in prefill, or a full KV cache leaving new requests waiting. **Common mistake**: looking only at the average, or blaming a slow model outright. **Reread**: [How do you measure latency and throughput?](#-how-do-you-measure-latency-and-throughput)

   </details>

6. Switch Example 8B's weights to int8 (1 byte per parameter) and keep the KV cache in bf16. For one 32K-token conversation, how much memory do the weights and the KV cache each need?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the weights halve to 8 GB; the KV cache doesn't depend on the weight format and is still about 4.3 GB. **Common mistake**: halving the KV cache too. **Reread**: [What does the KV cache store, and how big is it?](#-what-does-the-kv-cache-store-and-how-big-is-it)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original sources, want to compare against real systems, or want to build an inference server step by step alongside someone. None of it is required.

### Code along

- [datawhalechina/zero-to-sglang](https://github.com/datawhalechina/zero-to-sglang) — in Chinese and English; a course from Datawhale and RadixArk (the company founded by the SGLang team), with some chapters written by SGLang core members. Part I (concepts, no GPU needed) and Part II (write your own mini-sglang) pair best with this chapter; Part III is only partly finished.
- The source code of [vLLM](https://github.com/vllm-project/vllm) and SGLang: after nano-vllm, pick one module (the scheduler or the KV cache manager) and compare how a real system handles the details the lecture skips.

### Original papers and surveys

- [Kwon et al. 2023, Efficient Memory Management for LLM Serving with PagedAttention](https://arxiv.org/abs/2309.06180) — the vLLM paper. Sections 1–3 quantify the waste of reserving the KV cache in one block; sections 4.1–4.3 give the full design of PagedAttention and the KV cache manager.
- [Yu et al. 2022, Orca](https://www.usenix.org/conference/osdi22/presentation/yu) (OSDI '22) — where continuous batching comes from, with scheduling details.
- [Zheng et al. 2023, SGLang](https://arxiv.org/abs/2312.07104) — where RadixAttention comes from, explaining how the prefix tree is managed and evicted.
- [Dao et al. 2022, FlashAttention](https://arxiv.org/abs/2205.14135) — IO-aware exact attention, with the full tiling algorithm and data-movement analysis.
- [Leviathan et al. 2022, Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) — the proof that the acceptance rule doesn't change the output distribution, and an analysis of the speedup.
- [Welleck et al. 2024, From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) — a full survey of inference-time algorithms, including speculative decoding and efficiency.

### Books and overviews

- [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation) (2025-02) — the "Accelerating inference" section also splits speedups into approximate and output-preserving, and lists more methods.
- Chip Huyen, *AI Engineering* (paid book), chapter 9 (Inference Optimization) — the [companion repo](https://github.com/chiphuyen/aie-book) has a summary. A complete map of inference optimization from an application engineer's point of view.

### Courses

- [CMU 15-442 ML Systems](https://mlsyscourse.org/schedule), [CMU 11-868 LLM Systems](https://llmsystem.github.io/llmsystem2026spring/docs/Syllabus) — lectures and reading lists on GPUs and serving systems; the papers on P/D disaggregation (DistServe, Mooncake), KV cache tiering (Mooncake, LMCache) and non-prefix KV reuse (CacheBlend) are all on the 11-868 list.
- [MIT 6.5940 TinyML and Efficient AI](https://hanlab.mit.edu/courses/2024-fall-65940) — the quantization lab and the "deploy an LLM on your laptop" lab.
- [Stanford CS25 Transformers United V6](https://web.stanford.edu/class/cs25/) — Charles Frye (Modal) on production serving.

</section>
