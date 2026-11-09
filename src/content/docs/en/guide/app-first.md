---
title: The Application Route and Model Crash Course
head:
  - tag: title
    content: LLM App Development Route and Model Crash Course | Token2Agent
description: The recommended route for building LLM apps. After S0 AI Systems Overview, a model crash course covers tokens, sampling, context windows and cost, then you go straight to apps and agents in S6–S19.
sidebar:
  order: 3
  label: The Application Route and Model Crash Course
prev:
  link: /en/stages/s00-big-picture/
  label: S0 AI Systems Overview
next:
  link: /en/stages/s06-llm-api/
  label: S6 LLM APIs and Application Basics
---

If you want to build AI apps or agents, this route is all you need:

1. **[S0 AI Systems Overview](/en/stages/s00-big-picture/)**: see what parts an AI system is made of.
2. **Model Crash Course** (the second half of this page): the least model knowledge you need to build apps. Ten topics, a few paragraphs each.
3. **Part II to Part VI** (S6–S19): start at [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) and work through in order to S19 Real Agent Systems and the Capstone.

Part I Models (S1–S5) covers neural networks, Transformers, pretraining, post-training and inference. This **optional deep route** uses more math and examines model internals. You can complete Part II to Part VI (S6–S19) without it. Later chapters link to this crash course for the model knowledge they need, then offer a Part I reference such as "Deeper: S2 Transformers and Decoding".

## Who this is for

- Engineers who want to put LLMs into products and build systems that work, what the industry calls an AI engineer (building products on existing models rather than training them from scratch).
- People without a machine learning background who first want to know how these things are used and why they're designed the way they are.
- People who don't code and just want to understand (the concepts route): read "Four things to know now" below, then go straight to S6 LLM APIs and Application Basics. In each chapter, read only the main line and do Try it first and the self-check.
- People short on time who want something visible to show early (the hands-on routes). The first result is A6 Streaming Chat and Traces, the system project's advanced exercise in S6 LLM APIs and Application Basics: a chat interface that streams. Gradio, Chainlit or a CLI will do; no frontend required.

If you want to research or train models, or build inference infrastructure, take Part I as well (go from S0 AI Systems Overview through S19 Real Agent Systems and the Capstone in order).

Core exercises form the main route. Advanced exercises are optional projects that build over several chapters: the system project (A6–A19) develops your AI application, while the model project (M1–M5) trains small models in Part I. Advanced exercises are collapsed in Simple mode.

## When Part I is worth reading

Learn the application methods first, then use these references when you want the underlying model explanation. See [How to read the codes](/en/guide/how-to-use/#how-to-read-the-codes) for chapter labels:

| Where you are | Model knowledge you'll use | Deeper reading |
|---|---|---|
| [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) | Why input and output tokens are priced differently, what latency is made of | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | How constrained decoding guarantees the format | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S8 Evals Methodology](/en/stages/s08-evals/) | Logprobs and confidence, randomness from sampling | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [S9 Retrieval and RAG](/en/stages/s09-rag/) | Fine-tuning an embedding model (A9 RAG with Citations) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [model project](/en/projects/model-thread/) |
| [S11 Context Engineering](/en/stages/s11-context-engineering/) | Why prompt caching saves money | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | Reward hacking, distilling a router (A14 Agent Evals and Optimization) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [S18 Deployment and Architecture](/en/stages/s18-deployment/) | Self-hosting vs. API cost (A18 Multi-user Deployment uses measured numbers from the M5 mini inference server) | [S5 Inference and Serving](/en/stages/s05-inference/), [model project](/en/projects/model-thread/) |

For application-related intuition, choose a section rather than a whole model chapter. After S8 Evals Methodology, try the tokenization and decoding sections of [S2 Transformers and Decoding](/en/stages/s02-transformer/), or the opening example and the prefill/decode section of S5 Inference and Serving. After [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), compare the [reward hacking](/en/stages/s04-post-training/#-why-do-models-game-the-reward) and [distillation](/en/stages/s04-post-training/#-how-does-a-small-model-learn-from-a-big-one) sections in S4 Post-training and Reasoning. For the full training mechanisms and derivations, follow the prerequisites through S1–S4. For softmax, standard error, bootstrap and other math tools, see the [Math Refresher](/en/guide/math-refresher/).

## Model Crash Course

Read "Four things to know now" before S6 LLM APIs and Application Basics. The topics in "Look it up later" can wait until you need them. Each topic links to an optional Part I chapter for more detail.

:::tip[How to read this section]
Read "Four things to know now" first. You can skim "Look it up later" and return when a chapter needs it. You can continue to S6 LLM APIs and Application Basics without completing the model chapters or their exercises first.
:::

### Four things to know now

Before S6 LLM APIs and Application Basics, understand tokens, text generation, context limits, and cost and latency. Text generation is split into next-token prediction and sampling below.

#### Tokens and tokenization

A tokenizer uses an algorithm such as BPE to merge frequent character sequences into tokens and map them to integers. An English word is usually one or two tokens; one or two Chinese characters often form a token.

Equivalent text can use more tokens in Chinese than in English, especially with a small or English-heavy vocabulary. Newer multilingual tokenizers narrow that gap. Check this for any languages your users write: API pricing, context limits and speed depend on tokens, not word counts. Tokenization also contributes to letter-counting errors and unreliable arithmetic. → [S2 Transformers and Decoding](/en/stages/s02-transformer/)

#### Next-token prediction

An LLM predicts a probability distribution for the next token from all preceding tokens. To generate an answer, it repeatedly predicts, picks a token and appends it until completion. Conversation, tool calls and JSON all use this process with different formats.

The model contains billions of parameters, also called weights. Training adjusts them to improve predictions. Generating text does not itself query a database: factual statements come from learned statistical patterns, which can produce plausible but false content, or hallucination. → [S1 Neural Network Basics](/en/stages/s01-neural-networks/), [S2 Transformers and Decoding](/en/stages/s02-transformer/)

#### Sampling and temperature

Sampling settings determine which token to pick from the predicted distribution. A low temperature, such as 0–0.3, concentrates probability on the most likely tokens and makes output more stable. Higher temperature gives less likely tokens more chances, increasing variety and errors. Even 0 does not guarantee identical output. Use the testing methods in S6 LLM APIs and Application Basics to handle variation between runs. → [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)

<details class="deep">
<summary>Going deeper: top-p, and APIs that don't accept these parameters</summary>

- **Top-p** samples only from the candidates whose cumulative probability reaches p.
- Output still varies at temperature 0 because server-side batching and the order of floating-point operations can both introduce differences.
- Some APIs no longer accept these parameters (for example, Claude returns a 400 if you send `temperature`; see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)). There, stability comes from the prompt, structured output and your testing methods. For exercises that need you to tune temperature, use a local model (Ollama, llama.cpp).

</details>

#### Context window

The context window limits the total tokens in a call, including the system prompt, conversation history, retrieved passages, tool results and output. More input costs more, adds latency and can make important information harder to find. S11 Context Engineering covers choosing what to include; S9 Retrieval and RAG retrieves only relevant passages. → [S9 Retrieval and RAG](/en/stages/s09-rag/), [S11 Context Engineering](/en/stages/s11-context-engineering/)

#### Cost and latency basics

API cost is roughly "input tokens × input price + output tokens × output price". Output usually costs several times more per token, and cached input usually costs less; see "KV cache" below. A reasoning model's thinking tokens are generally billed as output and often outnumber its answer tokens.

Latency is roughly TTFT, the wait for the first token, plus "output tokens × time per token". TTFT grows with input length, but shortening output usually reduces total latency more. Smaller models, output limits and stable prompt prefixes can reduce cost or latency; streaming lets users see content sooner. Starting in S6 LLM APIs and Application Basics, log tokens, cost and latency for each call so you can measure later optimizations. → [S5 Inference and Serving](/en/stages/s05-inference/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S18 Deployment and Architecture](/en/stages/s18-deployment/)

### Look it up later

Pages from S6 LLM APIs and Application Basics on link back to these five topics when they need them. For now, knowing the names and what they're for is enough. Each topic ends with when it's worth coming back.

#### Logits and softmax

The final model layer assigns each vocabulary token a score called a logit. Softmax converts the scores to probabilities summing to 1, with higher scores producing higher probabilities. Temperature divides logits by T before softmax. Some APIs return the logarithms of these probabilities, or logprobs, which S8 Evals Methodology uses to assess confidence. For a calculation, see the [Math Refresher](/en/guide/math-refresher/#logits-softmax-and-temperature). → [S2 Transformers and Decoding](/en/stages/s02-transformer/)

**When to come back**: when S8 Evals Methodology uses logprobs to judge how sure the model is.

#### KV cache, and why output tokens cost more

A model handles a request in two phases. Prefill processes the whole input in parallel in one pass and stores each token's intermediate results as the KV cache. Decode produces one token at a time, and every token it produces means reading all the model's weights from memory once. So input tokens can be processed massively in parallel and are cheaper, while output tokens come one at a time and are more expensive and slower; on API price lists the output price is usually several times the input price. Prompt caching reuses the KV cache for an identical prefix: if every request starts the same way (with the same system prompt, say), that part is billed at a lower rate and processed faster. → [S5 Inference and Serving](/en/stages/s05-inference/)

**When to come back**: before S11 Context Engineering explains why prompt caching saves money.

#### Training stages: pretrain → SFT → preference / RL → reasoning

LLM training roughly breaks into several stages. Pretraining trains next-token prediction on large amounts of web text and produces a base model that can only "keep writing"; most of its knowledge is learned here. SFT uses "instruction → good answer" data to teach it to follow instructions and answer in a conversation format. Preference learning (RLHF, DPO) uses human comparisons between answers to make it more helpful and safer. Recent reasoning models add reinforcement learning on tasks whose answers can be checked automatically (math, code), often combined with distillation, so the model learns to write a long thinking process before answering. That makes them better at hard problems, but also slower and more token-hungry. → [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/)

**When to come back**: when [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) and [S16 Security and Governance](/en/stages/s16-security/) bring up reward hacking and model specs.

#### Chat templates

The messages you send to an API (system, user, assistant, tool calls and tool results) don't go into the model as they are. The server uses a chat template to join them into one long text, with special tokens marking each message's role and boundaries, such as `<|im_start|>user` … `<|im_end|>` in the Qwen family. That text is what the model sees, and it then predicts the next assistant token. A tool call is also a piece of text the model outputs in the format the template defines, which the server then parses into a structured tool call. Training and inference must use the same template. With an API the vendor handles this; when you run an open model yourself, use the template that comes with its tokenizer. → [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)

**When to come back**: when [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) shows what a raw tool call looks like.

#### What fine-tuning can and can't do

Fine-tuning adjusts **behavior**, such as output format, tone, style or performance on a narrow task. It can also distill a large model into a smaller, cheaper one. For changing **knowledge**, RAG is usually more reliable: updating facts through fine-tuning requires retraining, and the model cannot cite the source of its answer.

SFT on a small dataset generally cannot teach reasoning the model could not already do. That usually requires large-scale RL or SFT on many solutions from a strong model, known as distillation; see S4 Post-training and Reasoning. Fine-tuning may also degrade other abilities. Improve the prompt first, use RAG for knowledge needs, and consider fine-tuning last. Prepare eval data before starting so you can check the result. → [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S9 Retrieval and RAG](/en/stages/s09-rag/)

**When to come back**: when S9 Retrieval and RAG has you decide between prompting, RAG and fine-tuning.


## Crash course check

Before you start S6 LLM APIs and Application Basics, try these questions. If you can't answer one, go back to the matching section or chapter.

1. Why might the same passage cost more through an API once it's translated from English into Chinese?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: pricing is per token, not per word or character, and on some tokenizers Chinese takes more tokens for the same meaning. **Common mistake**: assuming Chinese is cheaper because it uses fewer characters. **Reread**: [Tokens and tokenization](#tokens-and-tokenization)

   </details>

2. Can you treat a temperature of 0 as a guarantee that a test will always get the same output?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: no. Server-side processing can still make the output differ. **Common mistake**: using "output is exactly identical" as a test's pass condition. **Reread**: [Sampling and temperature](#sampling-and-temperature)

   </details>

3. One request has 10,000 input tokens and 500 output tokens; another has 500 input and 10,000 output. Which is slower? Which costs more? Why?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: output is produced one token at a time, so the one with more output is slower. The output price is usually several times the input price, so it usually costs more too. **Common mistake**: looking only at the total token count and assuming the two are about the same. **Reread**: [Cost and latency basics](#cost-and-latency-basics)

   </details>

4. (Look it up later) Your company wants the model to answer questions about the latest product specs, and a coworker suggests fine-tuning the model on the spec sheets. What would you recommend?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: use RAG for knowledge that changes; fine-tuning is for changing behavior. **Common mistake**: assuming that after fine-tuning the model will reliably recite the new specs. **Reread**: [What fine-tuning can and can't do](#what-fine-tuning-can-and-cant-do)

   </details>

<section class="deep-section">

## Optional: hands-on model practice

This is extra practice for model internals, not a prerequisite for S6 LLM APIs and Application Basics. Read the tokenization and decoding sections of [S2 Transformers and Decoding](/en/stages/s02-transformer/) before attempting ["Write BPE and sampling from scratch"](/en/stages/s02-transformer/#core-write-bpe-and-sampling-from-scratch). You need basic programming, UTF-8 bytes, logits, softmax, temperature, top-k and top-p; see the [Math Refresher](/en/guide/math-refresher/#logits-softmax-and-temperature) for the math. You do not need the M1 model project, but the crash course alone does not cover everything the exercise needs. It is S2's core exercise and extra practice for the application route.

</section>
