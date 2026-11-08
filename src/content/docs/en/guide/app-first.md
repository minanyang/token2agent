---
title: The Application Route and Model Crash Course
head:
  - tag: title
    content: LLM App Development Route and Model Crash Course | Token2Agent
description: The recommended route for building LLM apps. After S0 The Big Picture, a model crash course covers tokens, sampling, context windows and cost, then you go straight to apps and agents in S6–S19.
sidebar:
  order: 3
  label: The Application Route and Model Crash Course
prev:
  link: /en/stages/s00-big-picture/
  label: S0 The Big Picture
next:
  link: /en/stages/s06-llm-api/
  label: S6 LLM APIs and Application Basics
---

If you want to build AI apps or agents, this route is all you need:

1. **[S0 The Big Picture](/en/stages/s00-big-picture/)**: see what parts an AI system is made of.
2. **Model Crash Course** (the second half of this page): the least model knowledge you need to build apps. Ten topics, a few paragraphs each.
3. **Part III to Part VII** (S6–S19): start at [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) and work through in order to S19 Real Agent Systems and the Capstone.

Part II How Models Work (S1–S5) covers how models work inside: neural networks, Transformers, pretraining, post-training and inference. It's lower-level, uses more math, and is the **optional deep route**. You can finish Part III to Part VII (S6–S19) without it. From S6 LLM APIs and Application Basics on, when a page needs model knowledge it first points back to the crash course sections on this page, then marks the matching Part II chapter with "Deeper:", as in "Deeper: S2 Transformers and Decoding".

## Who this is for

- Engineers who want to put LLMs into products and build systems that work, what the industry calls an AI engineer (building products on existing models rather than training them from scratch).
- People without a machine learning background who first want to know how these things are used and why they're designed the way they are.
- People who don't code and just want to understand (the concepts route): read "Four things to know now" below, then go straight to S6 LLM APIs and Application Basics. In each chapter, read only the main line and do Try it first and the self-check.
- People short on time who want something visible to show early (the hands-on routes). The first result is A6 Streaming Chat and Traces, the system project's advanced exercise in S6 LLM APIs and Application Basics: a chat interface that streams. Gradio, Chainlit or a CLI will do; no frontend required.

If you want to research or train models, or build inference infrastructure, take Part II as well (go from S0 The Big Picture through S19 Real Agent Systems and the Capstone in order).

Each chapter's **core exercise** is the main line. **Advanced exercises** are optional long-running projects, split in two: the system project (A6–A19, one step per chapter toward your own AI app) and the model project (M1–M5, training small models in Part II). Advanced exercises are collapsed in Simple mode.

## When Part II is worth reading

On the application route, these are the places where you first learn *how* to do something. When you want to know *why*, read the matching chapter (for what the codes mean, see [How to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)):

| Where you are | Model knowledge you'll use | Deeper reading |
|---|---|---|
| [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) | Why input and output tokens are priced differently, what latency is made of | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | How constrained decoding guarantees the format | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S8 Eval Methodology](/en/stages/s08-evals/) | Logprobs and confidence, randomness from sampling | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [S9 Retrieval and RAG](/en/stages/s09-rag/) | Fine-tuning an embedding model (A9 RAG with Citations) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [model project](/en/projects/model-thread/) |
| [S11 Context Engineering](/en/stages/s11-context-engineering/) | Why prompt caching saves money | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | Reward hacking, distilling a router (A14 Agent Evals and Optimization) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [S18 Deployment and Architecture](/en/stages/s18-deployment/) | Self-hosting vs. API cost (A18 Multi-user Deployment uses measured numbers from the M5 mini inference server) | [S5 Inference and Serving](/en/stages/s05-inference/), [model project](/en/projects/model-thread/) |

If you do want to fill in, start with these sections, which don't need S1 Neural Network Basics first. After S8 Eval Methodology, read the tokenization and decoding sections of [S2 Transformers and Decoding](/en/stages/s02-transformer/), and the opening example and the prefill/decode section of S5 Inference and Serving (the parts most relevant to apps). After [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), read the main line of the S4 Post-training and Reasoning lecture. When you want the full picture, read from S1 in order. For the math tools (softmax, standard error, bootstrap and so on), see the [Math Refresher](/en/guide/math-refresher/).

## Model Crash Course

This section has two parts. "Four things to know now" is what you need before starting S6 LLM APIs and Application Basics. For "Look it up later", knowing the names is enough for now; come back when you need them. Each topic ends with the chapter that goes deeper (Part II, optional).

:::tip[How to read this section]
Read "Four things to know now" first; you can skim "Look it up later". If you're on a hands-on route and want to build something, do [the S2 Transformers and Decoding core exercise, "Write BPE and sampling from scratch"](/en/stages/s02-transformer/#core-write-bpe-and-sampling-from-scratch) (optional). It doesn't depend on any other chapter, and it will make your grasp of tokens and sampling much more solid.
:::

### Four things to know now

Before you start S6 LLM APIs and Application Basics, make sure you understand these four things: the unit a model reads and writes (tokens), how it produces text (covered below in two parts, next-token prediction and sampling), how much it can see at once (context), and what it costs in money and time.

#### Tokens and tokenization

A model doesn't see characters; it sees tokens. A tokenizer uses an algorithm such as BPE to merge character sequences that often appear together into single units, then maps them to integers. An English word is usually one or two tokens; in Chinese, one or two characters often make a token. Whether the same meaning costs more tokens in Chinese than in English (and so costs more and takes more context) depends on the tokenizer: the gap is large for tokenizers with a small vocabulary or an English-heavy one, and much smaller for newer multilingual tokenizers. This matters whenever your users write in a language other than English. API pricing, context limits and speed are all counted in tokens, not words. Many "weird LLM habits", such as miscounting the letters in a word or unreliable arithmetic, come from how text is split into tokens. → [S2 Transformers and Decoding](/en/stages/s02-transformer/)

#### Next-token prediction

An LLM does exactly one thing: given all the tokens so far, it outputs a probability distribution over the next token. Generating an answer means repeating "predict → pick a token → append it → predict again" until done. Conversations, tool calls and JSON output are all text produced by this mechanism, just in different formats. The model itself is billions of numbers called parameters (or weights); training adjusts these numbers so the predictions get better. This also means the model never "looks things up in a database". The facts it states come from statistical patterns learned in training, so it can produce content that sounds plausible but is wrong (hallucination). → [S1 Neural Network Basics](/en/stages/s01-neural-networks/), [S2 Transformers and Decoding](/en/stages/s02-transformer/)

#### Sampling and temperature

Once the model outputs a probability distribution at each step, the sampling settings decide which token gets picked. Temperature controls how sharp the distribution is: at low temperature (say 0–0.3) it almost always picks the most likely token and the output is stable; at high temperature unlikely tokens get a chance too, and the output is more varied and more error-prone. Note that a temperature of 0 still doesn't guarantee identical output every time, so when you test LLM code, use the methods from S6 LLM APIs and Application Basics for handling output that may differ from run to run. → [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)

<details class="deep">
<summary>Going deeper: top-p, and APIs that don't accept these parameters</summary>

- **Top-p** samples only from the candidates whose cumulative probability reaches p.
- Output still varies at temperature 0 because server-side batching and the order of floating-point operations can both introduce differences.
- Some APIs no longer accept these parameters (for example, Claude returns a 400 if you send `temperature`; see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)). There, stability comes from the prompt, structured output and your testing methods. For exercises that need you to tune temperature, use a local model (Ollama, llama.cpp).

</details>

#### Context window

The context window is the most tokens a model can handle at once, counting both the input (system prompt, conversation history, retrieval results, tool output) and the output. A large limit doesn't mean you should fill it: the more you put in, the higher the cost and latency, and the worse the model gets at finding the key information in a long context. Deciding what goes into the context on each call is the subject of S11 Context Engineering; RAG, taught in S9 Retrieval and RAG, is the way to include only the relevant parts. → [S9 Retrieval and RAG](/en/stages/s09-rag/), [S11 Context Engineering](/en/stages/s11-context-engineering/)

#### Cost and latency basics

API cost is roughly "input tokens × input price + output tokens × output price", and the output price is usually several times the input price. Cached input is usually cheaper (see "KV cache" below for why). Reasoning models write out a thinking process before they answer; these thinking tokens are generally billed as output and often outnumber the final answer. Latency is roughly TTFT (the time before the first token appears, which grows with input length) plus "output tokens × time per token", so shortening the output usually cuts latency more than shortening the input. Common ways to save money and time: switch to a smaller model, cap the output length, keep the start of the prompt fixed to raise the cache hit rate, and stream so users see content sooner. From S6 LLM APIs and Application Basics on, log the token counts, cost and latency of every call; every later optimization is based on them. → [S5 Inference and Serving](/en/stages/s05-inference/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S18 Deployment and Architecture](/en/stages/s18-deployment/)

### Look it up later

Pages from S6 LLM APIs and Application Basics on link back to these five topics when they need them. For now, knowing the names and what they're for is enough. Each topic ends with when it's worth coming back.

#### Logits and softmax

Here's what "outputs a probability distribution" means concretely: the model's last layer outputs one score for each token in the vocabulary, called a logit. Softmax turns these scores into probabilities that sum to 1; a higher score means a higher probability. Temperature is just dividing the logits by T before the softmax. Some APIs return logprobs, the logarithms of these probabilities, and S8 Eval Methodology uses them to see how "sure" the model is. For a worked example by hand, see the [Math Refresher](/en/guide/math-refresher/#logits-softmax-and-temperature). → [S2 Transformers and Decoding](/en/stages/s02-transformer/)

**When to come back**: when S8 Eval Methodology uses logprobs to judge how sure the model is.

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

Fine-tuning is good for changing a model's **behavior**: a fixed output format, a particular tone or style, performance on one narrow task, or distilling a large model's abilities into a smaller, cheaper one. It's not good for adding **knowledge** that changes: teaching new facts by fine-tuning is usually less reliable than RAG, you have to retrain whenever the data changes, and it can't cite its sources. Ordinary SFT on a small dataset also can't really teach reasoning the model couldn't already do (reasoning ability mostly comes from large-scale RL, or from SFT on many solutions written by a strong model, which is distillation; see S4 Post-training and Reasoning), and it can make other abilities worse. In practice the order is: get the prompt right first, use RAG for knowledge problems, and consider fine-tuning last. And you need eval data first, or you can't tell whether fine-tuning helped. → [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S9 Retrieval and RAG](/en/stages/s09-rag/)

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
