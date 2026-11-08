---
title: S6 LLM APIs and Application Basics
head:
  - tag: title
    content: "LLM API Tutorial: Streaming, Retries and Cost (S6) | Token2Agent"
description: "Learn to call LLM APIs reliably: message structure and pricing, streaming and cancellation, how to retry on 429 and 5xx, switching between cloud and local models with the same code, and logging cost, tracing and testing without hitting the real API."
sidebar:
  order: 6
  label: S6 LLM APIs and Application Basics
prev:
  link: /en/guide/app-first/
  label: The Application Route and Model Crash Course
---

:::note[This chapter]
**Prerequisites**: [S0 The Big Picture](/en/stages/s00-big-picture/); for model background see the [Model Crash Course](/en/guide/app-first/#model-crash-course) (tokens, next-token prediction and sampling, the context window, cost and latency; deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S5 Inference and Serving](/en/stages/s05-inference/))　**Next**: → [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) (the complete frontend)
:::

:::tip[Concepts route: key points]
- The model doesn't remember the previous turn. The notes assistant resends the whole conversation every time, so the longer the chat, the more it costs.
- When something fails, first decide whether it can be retried. Actions like creating a note also need protection against running twice.
- Output can differ every time, so tests check properties instead of comparing the model's exact text.
:::

## What this chapter covers

This chapter answers one question: how do you wire a model into your code reliably? It covers the structure and cost of one API call, streaming and cancellation, errors and retries, how the SDKs differ, local models, using reasoning models from the application side, and how to log and test code whose output is different every time. This is where the application route starts, and every later chapter builds on it: error analysis in S8 Eval Methodology reads traces, the agents in S12 The Agent Loop and Harness depend on reliable retries and cancellation, and cost control in S18 Deployment and Architecture depends on the token counts you log for every call.

## After this chapter you can

- Explain why multi-turn conversations get more expensive as they go, which errors should be retried, and how an idempotency key prevents a side effect from running twice. (lecture and self-check)
- Describe the messages structure of an API call and work out what a call cost from the response's usage field. (lecture and self-check; the core exercise has you do it for real)
- Write a call layer that streams, can be canceled, and retries correctly on 429 / 5xx. (core)
- Switch between a cloud API and a local model with the same code, and name the tradeoffs. (core)
- Log the token counts, cost and latency of every call. (core uses a JSONL log; the OpenTelemetry trace is in the advanced exercise)
- Use record / replay to write tests that never hit the real API and give the same result every run. (core)

## Lecture

The whole chapter follows one example: the **notes assistant**. Its user, Sam (user ID `u_017`), has about 200 Markdown notes and asks, "What did I write about Project X last week?" The first version takes the simplest approach: put the full text of the 20 most recent notes into the system prompt, about 30,000 input tokens per request (S9 Retrieval and RAG brings that down). Your code has to turn the notes and the question into one API call, stream the answer to the screen as it's generated, retry correctly on errors, and record how many tokens, how much money and how much time the call took. The sections follow that path one step at a time: building the request and doing the math, streaming and stopping, retries, switching providers and local models, reasoning models, logging and testing.

### ★ What does one API call look like?

A call sends "a system prompt + a list of messages with roles" and gets back some output plus a token usage report. The cost is computed from that usage.

To run this chapter's examples yourself, you need:

- Basic Python (or TypeScript): writing functions, reading dicts / objects.
- Installing packages: for example `pip install anthropic` or `npm install @anthropic-ai/sdk`.
- Setting environment variables: the API key goes in an environment variable (such as `ANTHROPIC_API_KEY`), never in the code.
- Knowing what HTTP and JSON are: an API call is an HTTP request, and what you send and get back is JSON.

(If any of these are unfamiliar, start with the [Glossary](/en/reference/glossary/).)

If you're not writing code, you can skip the Python / TypeScript snippets; do read the prompt, note and JSON examples.

Using Anthropic's format, one notes-assistant call looks roughly like this (to keep the numbers easy, this example includes only 2 notes):

```json
{
  "model": "…",
  "system": "You are a notes assistant. Answer only from the notes below. <notes>…2 notes…</notes>",
  "messages": [
    { "role": "user", "content": "What did I write about Project X last week?" }
  ],
  "max_tokens": 500
}
```

Messages have a **role**: `user` is what the user said, `assistant` is the model's earlier replies. Where the **system prompt** (the global instructions) goes differs by vendor; here it's the top-level `system` parameter. A message's content can be several blocks: text, images, tool calls, tool results. `max_tokens` is the most tokens this call may output.

With the official Python SDK, the smallest possible call is:

```python
import anthropic

client = anthropic.Anthropic()  # reads the key from the ANTHROPIC_API_KEY environment variable
MODEL = "……"                     # use a model name listed in the official docs

response = client.messages.create(
    model=MODEL,
    max_tokens=1024,
    system="You are Sam's notes assistant. Answer only from the notes below; if the notes don't say, say you don't know.\n<notes>……</notes>",
    messages=[{"role": "user", "content": "What's the budget cap from the last design team meeting?"}],
)

print(response.content[0].text)                   # the model's answer
print(response.stop_reason)                       # e.g. "end_turn"
print(response.usage.input_tokens, response.usage.output_tokens)
```

The TypeScript SDK (`@anthropic-ai/sdk`) has the same shape; OpenAI's SDK uses different field names (see [How do you switch providers without a rewrite?](#-how-do-you-switch-providers-without-a-rewrite) below). This is only the minimal call; the core exercise adds streaming, retries and logging.

Besides the text, the response has a `usage` field, for example `{"input_tokens": 2000, "output_tokens": 300}`. Pricing is per token (for what a token is, see [Model Crash Course, "Tokens and tokenization"](/en/guide/app-first/#tokens-and-tokenization); deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/)), and **input and output are priced separately**, with output usually several times more expensive:

```
cost = input tokens × input price + output tokens × output price (+ cache reads/writes, → S11)
```

With illustrative prices ($3 per million input tokens, $15 per million output tokens), this call costs 2,000 × 3 / 1,000,000 + 300 × 15 / 1,000,000 = 0.006 + 0.0045 = **$0.0105**. For the real first version (20 notes, about 30,000 input tokens), the input alone is 30,000 × 3 / 1,000,000 = $0.09. Don't estimate token counts yourself; read `usage`. Tokenizers differ by vendor, and the same text can produce very different token counts on two vendors' models, especially for non-English text.

**Common misconception: the model remembers the previous turn.** LLM APIs are essentially **stateless**: every call has to resend the whole conversation, including the system prompt, the earlier user and assistant messages, and tool results. So the cost of a multi-turn conversation adds up. Suppose (again with only 2 notes) the notes plus system prompt are 1,800 tokens, each question 200 tokens and each answer 300 tokens. Turn 1 has 2,000 input tokens. Turn 2 has to carry turn 1's question and answer, so it's 2,500, and each turn after that adds 500, so turn 10 is 6,500. The input over 10 turns totals 42,500 tokens, more than twice the "2,000 every turn" you might expect. There are two kinds of fixes: keep the unchanging start of the request so it hits prompt caching (→ [S11 Context Engineering](/en/stages/s11-context-engineering/)), and truncate or summarize old turns (→ the tool-result budget in S11, compaction in [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)).

A **Batch API** lets you submit many requests at once and collect the results asynchronously (usually within 24 hours) at roughly half the price of real-time calls. It suits work that isn't urgent, such as generating summaries for a thousand notes, or running evals (→ S8 Eval Methodology).

<details class="deep">
<summary>Going deeper: message format differences and server-side conversation state</summary>

- **Where the system prompt goes**: Anthropic uses the top-level `system` parameter; OpenAI treats it as a kind of message (the `system` or `developer` role), and the Responses API also accepts an `instructions` parameter.
- **Server-side conversation state**: some APIs offer optional server-side state, such as `previous_response_id` in OpenAI's Responses API, so you don't have to resend the history yourself. But the model still reads the whole history on every call and you're still billed for those input tokens, so the cost buildup above doesn't go away.

</details>

### ★ How do you stream the answer?

Streaming lets the user see the first words while the model is still generating. When the user presses "Stop", you have to actually close the connection.

Say the notes assistant's answer is 300 tokens and takes 6 seconds to generate in full. Without streaming, the screen stays blank for 6 seconds. With streaming, the first word shows up after about 0.8 seconds and the rest keeps coming. Perceived latency depends on **TTFT** (time to first token, the time before the first token appears; see [Model Crash Course, "Cost and latency basics"](/en/guide/app-first/#cost-and-latency-basics), deeper: [S5 Inference and Serving](/en/stages/s05-inference/)), not total latency.

Most APIs use **SSE** (Server-Sent Events): an HTTP response that stays open and sends lines of `event:` and `data:`, each event carrying a small piece of text:

```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Last week"}}
```

Your code reads line by line and appends each piece of text to the display. Just before the last event there's usually one carrying the final `usage`; compute the cost from that.

Two common pitfalls:

- **Errors mid-stream**: once the HTTP response has returned 200, an error can still arrive as an `error` event in the middle of the stream. Your code can't rely on the status code alone.
- **Partial JSON**: tool call arguments (→ [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/)) are a piece of JSON that arrives in fragments while streaming, and the fragments in between aren't valid JSON. Either wait until the block ends before parsing, or use a parser that handles incomplete JSON for progressive display.

**Common misconception: stopping the display is the same as canceling.** If you only stop updating the screen, the model keeps generating on the server and you keep paying. Actually close the connection: in JS use `AbortController`; in Python cancel the task or close the response. Tokens already generated are usually still billed, so the earlier you cancel, the more you save.

<details class="deep">
<summary>Before you build: event order and browser limits</summary>

- **Anthropic's event order** is roughly `message_start` → for each content block `content_block_start` / `content_block_delta` / `content_block_stop` → `message_delta` (with the final usage) → `message_stop`. Tool argument fragments come as `input_json_delta`.
- **In the browser**: the native `EventSource` can only send GET, while LLM requests are usually POST, so frontends mostly parse the stream themselves with `fetch` plus `ReadableStream`, or leave it to the SDK. Python clients (httpx, the official SDK) don't have this limit; just read the response line by line.
- **Measuring TTFT**: start the clock when you send the request and stop it at the first *text* chunk, not the first event of any kind (`message_start` carries no text).

</details>

### ★ Should you retry on an error?

Some errors go away if you wait; others fail the same way a hundred times. Classify first, then decide whether to retry, how long to wait and when to give up.

**Retryable**: 429 (rate limit, too many requests), 500, 502, 503, 504, 529 (Anthropic's overloaded), network drops, timeouts. **Not retryable**: 400 (malformed request), 401 / 403 (key or permissions), 413 (request too large).

Wait before retrying, and wait longer each time: **exponential backoff** plus random **jitter**. Jitter keeps all the clients from retrying at the same instant and knocking over a service that just recovered. If the response has a `retry-after` header, wait that long. Cap the number of retries.

The notes assistant's call layer allows at most 3 retries with a base wait of 1 second:

| Situation | Attempts | Result |
|---|---|---|
| 429 with `retry-after: 2` | Attempt 1 gets 429 → wait 2 seconds → attempt 2 succeeds | 2 attempts total |
| Repeated 500s | Attempt 1 → wait (cap about 1 second) → attempt 2 → wait (cap about 2 seconds) → attempt 3 → wait (cap about 4 seconds) → attempt 4 | Reports an error only after all 4 fail |
| 400 | Attempt 1 | No retry; reports the error right away |

(The actual wait is a random value between 0 and the cap. That's the jitter; the formula is in the collapsible section below.) Official SDKs usually retry already; if you implement retries yourself, turn off the SDK's built-in retries first so you don't stack retries on retries.

There are at least two kinds of **timeout**: the connection timeout, and the idle timeout "between two chunks" while streaming. A short total timeout on a streaming request (say 30 seconds) also kills answers that are healthy but long; an idle timeout (say 10 seconds without a new chunk) is what catches a connection that's really stuck.

**Common misconception: at worst, a retry costs you one more call.** That's true for a plain LLM call, but not when the call is followed by an action with side effects. The notes assistant will later get a "create note" tool (→ S10 Tools and MCP). If the server has already created the note but the response is lost on the network, a retry creates a duplicate note. The fix is to generate an **idempotency key** for each action (for example, the conversation ID plus the tool call ID), check before executing whether that key has already run, and if it has, return the previous result. This becomes very important when you build agents in S12 The Agent Loop and Harness.

<details class="deep">
<summary>Before you build: the backoff formula, SDK defaults, and 429s that won't recover</summary>

- **Backoff formula**: the wait cap for retry n (counting from 0) is `min(cap, base × 2^n)`; the common full jitter picks a random value between 0 and that cap. If there's a `retry-after`, use it instead.
- **SDK defaults**: the Anthropic SDK retries 2 times by default. Turn that off (for example `maxRetries: 0`) before testing your own retry logic, or you'll be testing the SDK's behavior.
- **429s that won't recover on their own**: a 429 caused by an Anthropic usage tier's monthly limit has no `retry-after` and keeps failing until the quota resets; a spend limit you set yourself on the organization or workspace returns 400. So when a 429 has no `retry-after` and keeps failing, stop retrying and raise an alert.

</details>

### ★ How do you switch providers without a rewrite?

Vendors' APIs are similar but not the same. Put a thin interface in your own code and keep the differences inside it.

There are three kinds of tools to choose from. **Official SDKs** (Anthropic, OpenAI) give you types, built-in retries and streaming helpers, and support each vendor's new features first. The **Vercel AI SDK** (TypeScript) talks to many providers through one interface and comes with frontend chat hooks; it's the most natural fit for frontend engineers. **LiteLLM** (Python) calls a hundred-plus models using OpenAI's format and can also be self-hosted as a gateway that centralizes retries, fallback and usage logging.

The notes assistant's approach: define a `callLLM(messages) → { text, toolCalls, usage }`, and read the provider, model name, base URL and key from a config file. Switching providers or moving to a local model only changes the config; the rest of the code stays the same.

**Common misconception: "OpenAI-compatible" means identical.** Ollama, the llama.cpp server and vLLM all offer OpenAI-compatible APIs, but the details can differ:

- Where the system prompt goes, and the tool call format
- Stop reason names: Anthropic uses `end_turn` for a normal finish and `max_tokens` for hitting the limit; OpenAI Chat Completions uses `stop` and `length`
- Usage field names: Anthropic uses `input_tokens` / `output_tokens`; OpenAI Chat Completions uses `prompt_tokens` / `completion_tokens`
- Reasoning-related parameters, and whether certain parameters are supported at all

So that interface is responsible for converting all of this into your own format, and for keeping the raw response in the log or trace so you can investigate when something goes wrong.

### ★ When should you use a local model?

A local model runs on your own machine: it's free and the data never leaves, but quality, context length and tool-calling reliability usually fall short of frontier models.

Three common ways to run one: **Ollama** is the easiest to start with; one command downloads and runs a model, and it offers an OpenAI-compatible API. **llama.cpp** is the underlying engine; it runs quantized GGUF models (GGUF is the model file format llama.cpp uses), ships an HTTP server, and has the most knobs. **MLX** is Apple's framework for Apple Silicon; `mlx-lm` runs and fine-tunes models on a Mac.

When to use one: the data can't leave the machine, you need to work offline, you don't want to pay for every call during development and testing, or your volume is high enough that API costs exceed hardware costs. The price: quality is usually lower, the usable context window shorter, tool calling less reliable, and the hardware and operations are on you. During development, the notes assistant can start on a small Ollama model (such as `qwen3:0.6b`) to confirm the whole pipeline works, then switch back to a cloud model to compare quality. Choosing a model works the same way: first confirm the task is doable with the strongest model, then use evals to decide whether you can move to a smaller, cheaper or local one (→ S8 Eval Methodology, S18 Deployment and Architecture).

**Quantization** stores each parameter in fewer bits, for example 4 bits instead of 16. It saves a lot of memory at a small cost in quality. Local models are almost always run quantized.

**Rough memory estimate**: parameter count × bytes per parameter. An 8B (8 billion parameter) model quantized to 4-bit uses 0.5 byte per parameter, so the weights are about 4 GB; with runtime overhead you need about 4–5 GB. Add the KV cache on top, which grows with context length (see [Model Crash Course, "KV cache"](/en/guide/app-first/#kv-cache-and-why-output-tokens-cost-more); for quantization details, deeper: [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/)).

<details class="deep">
<summary>Going deeper: where models come from and how to choose</summary>

- **Closed vs. open-weight**: you can't get the weights of closed models (such as Claude, OpenAI's flagship GPT models, Gemini); you can only use them through an API (the vendor's own, a cloud platform, or an aggregator). Open-weight models (such as Llama, Qwen, Gemma, DeepSeek, Mistral's open-weight series, OpenAI's gpt-oss) can be downloaded and run on your own machine or server, and fine-tuned. The former usually have the best quality and the least operations work; the latter keep data in-house and give you more control, but the hardware and operations are your responsibility.
- **Where to get them**: call the vendor's API directly; use an aggregator (such as OpenRouter) that puts many vendors' models behind one OpenAI-compatible API, which is handy for comparisons but adds a middleman; Hugging Face Hub is the central place for open-weight models, where you can download models or use its inference services; to run locally, use Ollama, llama.cpp, or LM Studio, which has a GUI.
- **How to choose**: list the task's hard requirements first (can the data leave, context length, whether you need tool calling and structured output, latency and budget), cross off the models that don't meet them, then compare the rest with your own evals. Public leaderboards are only good for a first cut; see the benchmark section of S8 Eval Methodology.

</details>

#### Context length in Ollama

When a prompt exceeds Ollama's default context, it may silently drop the earlier content without an error. Before running long prompts on Ollama, set `num_ctx` and check with `ollama ps`.

<details class="deep">
<summary>Going deeper: the defaults, and what truncation looks like</summary>

Ollama's default context depends on VRAM (GPU memory): 4K at 24 GiB or less. When a prompt exceeds it, by default the earlier content is dropped (with only a warning in the server log), and the API doesn't necessarily return an error. Set `num_ctx` or `OLLAMA_CONTEXT_LENGTH`, and check with `ollama ps`. Every later exercise that runs long prompts on Ollama needs this step first.

**Common misconception: no error means the whole prompt got in.** This chapter's notes assistant puts the 20 most recent notes into the system prompt, about 30,000 tokens, far beyond 4K. Without adjusting, the beginning (often the system prompt and most of the notes) is silently dropped, the model only sees the last small piece, and the answers just look like "poor quality".

</details>

### ★ What's different about reasoning models?

A reasoning model generates a stretch of thinking before it answers. That thinking costs money, counts against the output limit, and makes the first visible word show up much later.

For what a reasoning model is, see [Model Crash Course, "Training stages"](/en/guide/app-first/#training-stages-pretrain--sft--preference--rl--reasoning) (deeper: [S4 Post-training and Reasoning](/en/stages/s04-post-training/)). From the application side, you need to know these things:

- **Thinking tokens are billed as output tokens** and count against the output limit.
- **Controls differ by vendor and keep changing.** As of this writing (2026-11): OpenAI uses `reasoning.effort`; Anthropic's newer models use adaptive thinking plus `effort`, and the old `budget_tokens` is deprecated and rejected by newer models. Always check the current docs before writing code.
- **The raw thinking is usually hidden**; you only get a summary or encrypted content. In multi-turn tool calling you must pass the previous turn's thinking blocks (or reasoning items) back **unchanged**, or you'll get errors or worse quality.
- **Interleaved thinking**: the model also thinks between two tool calls, which matters a lot for agents (→ [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)).
- **UX**: the interface should let the user know "thinking…" is happening, and allow canceling.

**Common misconception: thinking doesn't take space from the answer.** The notes assistant sets the output limit to 1,000 tokens; the model spends 900 thinking, leaving 100 tokens for the answer, which gets cut off mid-sentence with a stop reason of "hit the limit". With reasoning models, size the limit to include the thinking, and log the stop reason.

### ★ What should you log for every call?

Leave one structured record per call: which model, how many tokens, how much money, how long, and whether it succeeded. Start on day one, because the error analysis and cost control that come later all read this data.

The simplest approach is one line of JSONL (one JSON object per line) per call. The record for the notes-assistant call above:

```json
{"ts":"2026-11-07T10:00:00Z","model":"…","input_tokens":2000,"output_tokens":300,"cost_usd":0.0105,"ttft_ms":800,"latency_ms":6000,"retries":0,"status":"ok"}
```

With this, "how much did we spend this week" and "which kinds of questions are especially slow" are each a single query.

Once the system gets more complex (retrieval, several LLM calls and tool executions inside one request), switch to a **trace**: the full record of one request, made of **spans**. Each LLM call and each tool execution is a span; spans have parent-child relationships, so you can see where the time went. **OpenTelemetry** is the open standard for recording traces, and its GenAI semantic conventions define field names for LLM calls, such as `gen_ai.request.model` and `gen_ai.usage.input_tokens`. Follow the standard names and you can view the traces in different backends.

The smallest version of **feedback collection** starts here too: put thumbs up / thumbs down next to each answer, and when you store a vote, link it to that answer's trace ID. Later, when you see a thumbs down, you can open the full prompt and response from that moment directly.

**Common misconception: add logging once the system is stable.** The error analysis in S8 Eval Methodology reads exactly these records; if you add them later, you lose the earliest and most realistic batch of data. Also, full prompts and responses may contain personal data, so decide now whether to log them and how long to keep them (→ [S16 Security and Governance](/en/stages/s16-security/)).

<details class="deep">
<summary>Before you build: common GenAI convention fields and backends</summary>

- **Common fields**: `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.response.finish_reasons`. Use custom attributes for cost, TTFT and the user ID.
- **Two caveats**: as of this writing (2026-11) the conventions are still in Development status, so fields may change; and there's no standard "cost" field, so compute the cost yourself and store it as a custom attribute.
- **Where the spec lives**: it has moved to its own repo (see Further reading); go by the client inference span docs there.
- **Backends**: Jaeger, Langfuse, Phoenix and others all accept OTLP, and all of them run locally in Docker.

</details>

### ★ How do you test output that changes?

The model's output can differ every time, so tests don't compare its exact text. Instead, test in layers: your own logic against a fake model, and real output only for properties.

Even with temperature set to 0, output isn't guaranteed to be identical, and some APIs no longer let you set temperature at all (see [Limits on sampling parameters](#limits-on-sampling-parameters) below). The notes assistant's tests have four layers:

1. **Mock**: when testing your own logic (retries, parsing, error handling), replace the model with a fake that returns fixed content or fixed errors. For example, have the fake return a 429 and then a normal response, and check that the call layer makes exactly 2 attempts.
2. **Record / replay**: the first run hits the real API and saves the HTTP exchange to a file (a fixture); later tests replay it, with no network, the same result every time, and no cost. When you change the prompt or model, re-record and review the diff.
3. **Snapshot**: snapshot *what you send*, such as the assembled system prompt and tool definitions. That's far more stable than snapshotting model output, and it's the best way to catch an accidentally broken prompt.
4. **Assert properties, don't compare full text**: for real output, check only properties, such as valid JSON, cited note titles that actually exist, length within range. Full quality evaluation is the job of [S8 Eval Methodology](/en/stages/s08-evals/).

**Common misconception: if it fails, rerun until it's green.** That lets flaky tests quietly hide real problems. **Flaky policy**: deterministic tests (mock, replay) must pass in CI (continuous integration); tests that hit a real model run separately N times and are judged by a pass-rate threshold (for example, at least 9 out of 10), with every run's result recorded.

#### Limits on sampling parameters

On the current Anthropic API version, Claude models don't accept `temperature` (nor `top_p` or `top_k`; sending any of them returns 400). For experiments that need to control sampling, use a local model or a provider whose docs explicitly support it.

<details class="deep">
<summary>Going deeper: API versions, SDKs and other providers</summary>

As of this writing (2026-11), under Anthropic API version `2026-10-21`, any Messages request that includes `temperature`, `top_p` or `top_k` returns 400 for every Claude model. The latest major version of the Anthropic SDK in each language sends this API version; older major versions still send `2023-06-01`. Even so, models after Claude 4.7 only accept the default values under the old API version too. OpenAI's reasoning models also restrict these parameters. So "set temperature to 0 to reduce noise" doesn't work on these models: when comparing, use the model's default sampling and average several runs per condition. For experiments that need controlled sampling, use a local model (Ollama, llama.cpp) or another provider / model whose docs explicitly say these parameters are supported, and note it in your records. Rules like these change quickly, so check the current docs before you start.

</details>

<section class="deep-section">

### ○ Can models run in the browser?

A model can run directly in the user's browser (WebGPU / WASM), with no server cost and no data leaving the device. The limits: the model has to be downloaded first (usually hundreds of MB at least), only small models work, and device support varies. It suits small tasks such as classification, summarization and embeddings. S17 Product and AI UX comes back to where it fits in a product.

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** Should the call layer retry in each of these five cases? (a) 429 (too many requests) with `retry-after: 5`; (b) 401 (not authenticated); (c) 503 (service temporarily unavailable); (d) 400 (bad request); (e) the network drops mid-stream.

<details class="hint">
<summary>Check your answer</summary>

Retry: (a) wait 5 seconds, then retry; (c) exponential backoff with jitter; (e) is a network drop, so it can be retried, but if the call is followed by side effects, an idempotency key is needed to prevent duplicates. Don't retry: (b) is a key or permissions problem and (d) a malformed request; retrying gives the same result every time.

</details>

**2.** Do the notes assistant's math yourself: system prompt plus notes is 3,000 tokens, each question 100 tokens, each answer 400 tokens. Using the lecture's illustrative prices, what do turn 1 and turn 5 each cost?

<details class="hint">
<summary>Check your answer</summary>

Turn 1: input 3,100 × 3 / 1,000,000 = 0.0093, output 400 × 15 / 1,000,000 = 0.006, total $0.0153. Turn 5 has to carry the previous 4 turns' questions and answers: input 3,000 + 4 × 500 + 100 = 5,100 tokens, so 0.0153 + 0.006 = $0.0213. Output stays the same; input grows every turn.

</details>

### Core: A reliable LLM call layer

**Goal**: write a small module that streams, can be canceled, retries correctly and logs cost, and prove with offline tests that it really does.

**Steps**
1. Write a `callLLM` function: send some messages, get back the text and usage. Prepare a price config file (input / output prices, copied from the provider's pricing page with the date noted) and compute each call's cost from usage. Fix the test inputs as 20 short prompts, such as "Explain what HTTP status code N means in one sentence", with N set in turn to 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 413, 418, 422, 429, 500, 502, 503, 504, 529.
2. Add streaming: print tokens as they arrive, and measure TTFT (from sending to the first text chunk) and total latency.
3. Add cancellation: a timeout or keypress triggers it; confirm the connection is actually closed. Log the timestamp of the cancellation and the timestamp of the last chunk received.
4. Write a local mock server that can be configured to return: a 429 with `retry-after: 2` (429 the first time, a normal response the second), repeated 500s, a 400, an error event mid-stream, and a 10-second pause between two chunks.
5. Implement retries: retry only retryable errors, with exponential backoff and jitter, honoring `retry-after`, at most 3 retries. Turn off the SDK's built-in retries first (for example `maxRetries: 0`), or you'll be testing the SDK's behavior.
6. Write one JSONL log line per call: timestamp, model, input tokens, output tokens, cost, TTFT, total latency, retry count, final status.
7. Record one real call with record / replay and write a test that replays it.
8. Change only the config (environment variables or config file) to point `callLLM` at a local model (for example, Ollama's OpenAI-compatible API with `qwen3:0.6b`) and run 5 of the prompts.

**Acceptance criteria**
- Call the real model 20 times; all 20 log entries have the 9 fields above. Pick any 3 and your hand-computed cost matches the log exactly.
- Against the mock server: the 429 case succeeds on attempt 2, with ≥ 2 seconds between the two attempts; repeated 500s make 4 attempts in total (1 + 3 retries) before reporting an error; the 400 makes only 1 attempt.
- A stream that goes idle for 10 seconds is cut off by your between-chunk timeout and logged as a timeout, not a success.
- No new chunk is printed more than 500 ms after canceling: in the log, "last chunk timestamp − cancellation timestamp" ≤ 500 ms (it can be negative), and the connection is closed.
- With the network unplugged, the whole test suite passes 10 runs in a row.
- The 5 log entries from the local model also have all 9 fields (cost recorded as 0), and nothing but the config changed.

**Hints**
- TypeScript: the official SDK (`@anthropic-ai/sdk` or `openai`), or plain `fetch` + `ReadableStream`; `AbortController` for cancellation; `node:http` or [MSW](https://mswjs.io/) for the mock server; Vitest for tests.
- Python: the official SDK or [httpx](https://github.com/encode/httpx) + `asyncio`; [respx](https://github.com/lundberg/respx) for mocking, [pytest-recording](https://github.com/kiwicom/pytest-recording) (built on VCR.py) for record / replay; FastAPI or the standard library's `http.server` for the mock server.
- Cost: 20 small calls usually come to under $1. If you don't want to pay, use Ollama throughout and let the mock server simulate the 429s and 500s.
- Short on time? Do the three mocks (429 / 500 / 400) and their acceptance criteria first, and add the mid-stream error and between-chunk timeout later.
- If you get stuck:
  - Reread: [Should you retry on an error?](#-should-you-retry-on-an-error) (formula in the collapsible section), [streaming](#-how-do-you-stream-the-answer), [testing](#-how-do-you-test-output-that-changes)
  - Further: the HTTP errors section of Anthropic's "Errors" page, the "Jitter" section of the AWS article

<section class="deep-section">

### Advanced: System project A6: Start your system

This is the first step of the system project (for the step codes, see [how to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)): you pick a topic, and the next 13 chapters (S7–S19) all add capabilities to the same system.

**Choosing a topic**: a good topic has **your own documents** (not something freely available online), some **actions that do things** (create, edit, send), room for **2–3 users**, and is something **you'll actually use**. That way you get to practice RAG, tools, security and multi-user deployment later on. Four sample topics are in [System Project, "Pick a topic"](/en/projects/system-thread/#pick-a-topic); if you're unsure, pick the notes assistant.

**Goal**: build a minimal system that streams chat, has a trace and cost for every call, collects feedback, and can switch between cloud and local models.

**Steps**
1. Build a minimal chat interface: an input box, streaming display and a stop button. A web page, Gradio, Chainlit, Streamlit or a CLI all work (see the hints); the acceptance criteria for streaming, stopping and feedback are the same. The complete frontend comes in S17 Product and AI UX.
2. Connect the model using the core exercise's call layer (or an SDK configured to do the same).
3. **Naive context**: put the full text of your documents (or the first N tokens) straight into the system prompt. This is a deliberate simplification: S9 Retrieval and RAG replaces it with retrieval and S11 Context Engineering adds budgeting. For now, get the system working and see in the trace how many tokens it uses.
4. Switch between a cloud model and a local model (Ollama or llama.cpp) via a config file or environment variable, without changing the rest of the code.
5. Create one OpenTelemetry span per LLM call, recording the model, provider and token counts in `gen_ai.*` fields, plus cost, TTFT and total latency; send it to a backend you can view locally. Store the trace ID with every assistant message.
6. Put thumbs up / thumbs down buttons and optional text feedback next to each answer (a CLI version can use commands like `/good` and `/bad reason`), store it, and link it to the same trace ID.
7. Attach a user ID to every request: switching it via a config file or request header is enough for now, no login needed (real authentication comes in A18 Multi-user Deployment). Write the user ID into every trace and every piece of feedback; the isolation tests in A9 RAG with Citations and A13 Layered Memory use it later.
8. Start using it yourself, and collect at least 30 real conversations before moving on to S8 Eval Methodology.

**Acceptance criteria**
- 100% of the last 50 LLM calls have a trace, and every trace has the model, provider, input / output token counts, cost, TTFT and total latency.
- Against mocked 429s, repeated 500s and 400s, the system's retry behavior meets the core exercise's three numeric criteria.
- You can switch to a local model by changing only the config; run the same 5 questions once on cloud and once locally, both sets of traces are visible, and record the average latency and total cost for each.
- Pick any 5 pieces of feedback; each one leads you to its trace.
- Send 3 requests each from two different user IDs; all 6 traces carry the correct user ID.
- After pressing stop, no new text appears within 1 second, and the trace is marked "canceled".
- Collect ≥ 30 real conversations before moving on to S8 Eval Methodology.

With the notes assistant as the example: put the full text of the 20 most recent notes into the system prompt and ask "What did I conclude about Project X last month?" The trace shows about 30,000 input tokens per call; that's the number S9 Retrieval and RAG sets out to bring down.

**Hints**
- TypeScript: the Vercel AI SDK's `streamText` + `useChat` gets you an interface quickly; its telemetry settings connect to OpenTelemetry (the parameter names have changed between versions, so go by the Telemetry page); local models work through an OpenAI-compatible provider or the [Ollama community provider](https://ai-sdk.dev/providers/community-providers/ollama).
- Python: FastAPI + SSE for the backend; LiteLLM to unify cloud and local calls; [OpenLLMetry](https://github.com/traceloop/openllmetry) or the OpenTelemetry SDK to build spans yourself.
- If you'd rather not write a frontend, you can build the interface entirely in Python (it takes about as long as a web version, or less):
  - [Gradio](https://www.gradio.app/docs/gradio/chatinterface)'s `gr.ChatInterface`: write the response function as a generator and yield piece by piece to stream; a stop button appears while streaming (`stop_btn`, on by default); thumbs up / down don't show by default (`flagging_mode` defaults to `"never"`) and only appear with `flagging_mode="manual"` (the default `flagging_options`, Like / Dislike, show up as thumbs up / down and are saved to CSV). To link feedback to a trace ID, use `gr.Chatbot` with a `.like()` event and store it yourself.
  - [Chainlit](https://docs.chainlit.io/): stream with `msg.stream_token()`; while a task runs the interface shows a stop button that cancels the task and calls `@cl.on_stop`; the built-in thumbs up / down and text feedback need data persistence turned on first, or you can make two buttons yourself.
  - [Streamlit](https://docs.streamlit.io/develop/api-reference/write-magic/st.write_stream): `st.write_stream` for streaming, [`st.feedback`](https://docs.streamlit.io/develop/api-reference/widgets/st.feedback) for thumbs up / down; stopping interrupts the whole script run, which makes it harder to confirm the model connection was closed, so verify that with the log.
  - CLI: Ctrl-C as the stop button (catch `KeyboardInterrupt` or cancel the asyncio task, then close the stream connection); enter feedback as commands.
  - Whichever you pick, stopping must actually cancel the model stream on the backend, not just stop updating the screen: confirm it with the cancellation timestamp and the last chunk's timestamp in the log.
- Trace backends: [Jaeger](https://www.jaegertracing.io/) (tracing only), [Langfuse](https://github.com/langfuse/langfuse) or [Phoenix](https://github.com/arize-ai/phoenix) (with LLM-specific views); all of them run locally in Docker.
- Cost: daily personal use with a cheap model usually stays within a few dollars a week; running local models throughout is free, just lower quality.
- Local models: with Ollama, raise the context first (see [Context length in Ollama](#context-length-in-ollama) above). The naive context from step 3 may be tens of thousands of tokens, so set it larger than that, or include only part of your documents at first.
- If you get stuck:
  - Reread: [tracing](#-what-should-you-log-for-every-call), [SDK differences](#-how-do-you-switch-providers-without-a-rewrite)
  - Further: the client inference span docs in the OpenTelemetry GenAI conventions, the AI SDK's Chatbot page

</section>

## Self-check

1. Why does the cost of a multi-turn conversation grow with the number of turns? Name two ways to reduce it. (One of them is in S11 Context Engineering.)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the API is stateless, so every turn resends the whole conversation; you reduce the cost by keeping the unchanging start of the request so it hits prompt caching, and by truncating or summarizing old turns. **Common mistake**: thinking the model remembers the previous turn. **Reread**: [What does one API call look like?](#-what-does-one-api-call-look-like)

   </details>

2. The stream's HTTP status code is 200. Why does your code still need to handle errors?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the status code is sent at the very start of the stream, and later errors show up as `error` events in the middle of it. **Common mistake**: assuming 200 means the whole answer succeeded. **Reread**: [How do you stream the answer?](#-how-do-you-stream-the-answer)

   </details>

3. After a call, your code is supposed to send an email, but the network drops before the response arrives. What goes wrong if you simply retry? How do you make it safe?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the email may already have gone out, and a retry sends a second one; generate an idempotency key for the action, check before executing whether it has already run, and if so return the previous result. **Common mistake**: thinking a retry at worst costs one more call. **Reread**: [Should you retry on an error?](#-should-you-retry-on-an-error)

   </details>

4. Does an "OpenAI-compatible API" let you switch providers without changing any code? Give two things that may differ.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: there's no guarantee; for example stop reason names, usage field names, the system prompt and tool call formats, and whether certain parameters are supported. **Common mistake**: treating "compatible" as identical. **Reread**: [How do you switch providers without a rewrite?](#-how-do-you-switch-providers-without-a-rewrite)

   </details>

5. Scenario: your team wants to set temperature to 0 in every LLM test and then compare the full output strings. How do you respond? (Hint: temperature 0 doesn't guarantee identical output, and some models don't accept the parameter at all.) Propose a layered testing alternative. (Concepts route: just explain why you check properties instead of comparing exact text.)

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the layers should include mocks, record / replay, snapshots of what you send, and property-only assertions on real output, plus a flaky policy (a pass-rate threshold). **Common mistake**: only saying "run it a few more times" without any layering. **Reread**: [How do you test output that changes?](#-how-do-you-test-output-that-changes), [Limits on sampling parameters](#limits-on-sampling-parameters)

   </details>

6. After hooking the notes assistant up to Ollama, the answers seem to ignore the earlier notes entirely, and the API reports no error. What's the most likely cause? What do you set, and which command confirms it?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: the prompt exceeds Ollama's default context and the earlier content is silently dropped; set `num_ctx` and confirm with `ollama ps`. **Common mistake**: assuming no error means the whole prompt got in. **Reread**: [Context length in Ollama](#context-length-in-ollama)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original specs, more detail, or a different language or framework. None of it is required.

### Official docs

- Three pages of the Anthropic API docs: [Messages](https://platform.claude.com/docs/en/api/messages), [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming), [Errors](https://platform.claude.com/docs/en/api/errors) — the full request fields, every SSE event type, and an explanation of each error code. If you use OpenAI, read the matching [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) and [Error codes](https://developers.openai.com/api/docs/guides/error-codes).
- Anthropic [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) and OpenAI [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) — reasoning model parameters, pricing, and how to pass thinking back in multi-turn conversations. These change quickly; go by the current version.
- Anthropic [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing), [Rate limits](https://platform.claude.com/docs/en/api/rate-limits), [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — the actual batch workflow, the limits for each tier, and current prices (copy the core exercise's price config from here).
- [Ollama: OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility), [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [mlx-lm](https://github.com/ml-explore/mlx-lm) — installation and parameters for the three ways to run local models.
- [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — the rules of the SSE format itself.

### SDKs and frameworks

- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction) — Introduction, Generating Text, [Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot); the fastest TypeScript path to A6's streaming chat and trace interface.
- [AI SDK: Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) and [Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing) — wiring OpenTelemetry into the AI SDK and writing tests with mock models.
- [AI SDK: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) — how the backend streams text, tool calls and custom data to the frontend together; you'll use it when building the complete interface in S17 Product and AI UX.
- Getting Started and [Fallbacks](https://docs.litellm.ai/docs/proxy/reliability) in the [LiteLLM docs](https://docs.litellm.ai/docs/) — a unified calling interface for Python; it can also act as a gateway that centrally manages keys, budgets and fallback (→ S18 Deployment and Architecture).

### Reliability and observability

- [AWS: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) — the classic explanation of retries and jitter, not specific to LLMs, comparing several kinds of jitter.
- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) — how idempotency keys are designed in a real payment system.
- [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) — the status of standardizing idempotency keys.
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) — read the client inference span and metrics docs under `docs/gen-ai/` for the full field list. Still in Development status.
- [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) (2024-06) — read the Operational part for lessons from real teams.

### In-browser models

- [transformers.js](https://github.com/huggingface/transformers.js), [WebLLM](https://github.com/mlc-ai/web-llm), [Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) — three ways to do ○ in-browser models.

</section>
