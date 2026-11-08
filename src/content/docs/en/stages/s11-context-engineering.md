---
title: S11 Context Engineering
head:
  - tag: title
    content: "Context Engineering Tutorial: Budgets and Caching (S11) | Token2Agent"
description: A context engineering tutorial — decide what goes into the context for a call, how to order, truncate and summarize it, set token budgets, recognize the ways context fails, and use prompt caching to cut cost and latency.
sidebar:
  order: 11
  label: S11 Context Engineering
---

:::note[This chapter]
**Prerequisites**: [S9 Retrieval and RAG](/en/stages/s09-rag/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/); for how prompt caching works, see "[KV cache](/en/guide/app-first/#kv-cache-and-why-output-tokens-cost-more)" in the Model Crash Course (deeper: [S5 Inference and Serving](/en/stages/s05-inference/))　**Next**: → [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) (managing context over long runs), [S13 Memory and Personalization](/en/stages/s13-memory/)
:::

:::tip[Concepts route: key points]
- Every call has to decide what goes in: give each part a budget, and truncate or summarize whatever goes over.
- More isn't always better: too much context leads to missed details and distraction, and nothing raises an error.
- Put what doesn't change first and what changes last, so the repeated beginning can be cached to save money.
:::

## What this chapter covers

By now, the system prompt, tool definitions, retrieval results, tool output and conversation history all want a place in the context. Context engineering decides "for this call, what goes in, how much of each, and in what order." This chapter covers how to allocate a token budget, why more can make things worse, how to truncate and summarize when over budget, and how to order the context to get the prompt caching discount.

This chapter only deals with assembling the context for a *single call*. What to do when an agent runs many rounds and the context keeps growing (compaction, reset, sub-agent isolation) is in S12 The Agent Loop and Harness.

## After this chapter you can

- List the parts of one call's context and the order they go in, and say which part to cut first when over budget, and why. (lecture and self-check)
- Recognize the type of context failure from a trace and propose a matching fix. (lecture and self-check; in the core exercise you'll see the effects of length and position firsthand)
- Order the context so prompt caching works, and measure the cache hit rate. (core)
- Plot a "context tokens vs quality" curve. (core; using it to choose a budget is in the advanced exercise)
- Measure each part's token count and set budgets. (advanced)

## Lecture

The big picture first. Before every model call, your code has a **context builder**: it gathers the material available for this call, measures each part's token count, truncates or summarizes whatever is over budget, puts everything in a fixed order and sends it. The sections of this chapter answer its decisions in order:

1. Which parts there are and how much budget each gets.
2. Why you can't put everything in (degradation in long contexts).
3. How detailed the system prompt should be, and whether to load data up front or let the model fetch it.
4. What to cut when over budget.
5. How to order the context so prompt caching kicks in.

The whole chapter uses one example: a single request to the notes assistant.

### ★ How do you budget the context?

Context isn't "put in everything you can get." You budget each part separately. Every part costs money and latency (← [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/)) and takes a share of the model's attention.

One call's context usually includes: **tool definitions** (each tool's name, description and parameter schema, ← S10 Tools and MCP), the **system prompt**, **retrieval results** (← S9 Retrieval and RAG), **tool results** (what came back from the model's previous tool call), **conversation history**, **memory** (user preferences remembered across conversations, → S13 Memory and Personalization), and the user's input for this turn. The context window limit counts the output too, so you also have to leave room for the answer.

Anthropic calls this the "attention budget": a model reading its context has a limited amount of "attention" to spread around, and every extra token slightly dilutes the influence of the others. So the goal is **the smallest set of high-signal tokens that makes the desired outcome most likely**.

**Example.** Sam tells the notes assistant: "What budget did we settle on in the last meeting with the design team? Create a to-do reminding me to follow up next week." This turn goes like this:

1. The context builder first retrieves notes using the question (← S9 Retrieval and RAG) and gets the 8 most relevant chunks, about 700 tokens each.
2. First call: after reading them, the model decides it also needs the quotes, so it calls `notes_search("quote")`. The tool returns 20 results, about 400 tokens each.
3. Second call: the tool results go back into the context, and the model answers and calls `notes_create` to create the to-do.

The table below is the context for the second call. The total budget is 16K input tokens (the part budgets add up to 16,000; the user's input for this turn has no cap), well below the model's context window, for reasons the next section explains.

| Part | Content | Budget | Raw size | Actually included |
|---|---|---|---|---|
| Tool definitions | `notes_search`, `notes_create`, `web_clip`, `email_draft` | 2,000 | 1,600 | 1,600 |
| System prompt | Role, answer rules, citation format | 1,500 | 1,400 | 1,400 |
| User profile | Name, time zone, today's date | 500 | 300 | 300 |
| Conversation history | The previous 15 turns | 4,000 | 9,000 | 2,900 |
| Retrieved notes | 8 chunks × 700 | 6,000 | 5,600 | 5,600 |
| Tool results | 20 `notes_search` results × 400 | 2,000 | 8,000 | 1,750 |
| This turn's input | The user's question | — | 100 | 100 |
| Total | | | 26,000 | 13,650 |

Two parts are over budget, and each is cut down to fit (how to cut is in [What do you cut when over budget?](#-what-do-you-cut-when-over-budget)):

- **History**: keep the last 4 turns verbatim (4 × 600 = 2,400) and replace the earlier 11 turns with a 500-token summary, 2,900 in total.
- **Tool results**: keep the first 3 results in full (3 × 400 = 1,200), keep only the titles of the other 17 (17 × 30 = 510), plus a truncation note of about 40 tokens, 1,750 in total.

Result: each call's input drops from 26,000 to 13,650 tokens, roughly half, and everything the answer needs is still there. Separately, `max_tokens` reserves about 1,000 tokens for the answer.

**Common misconception: only the total matters.** Budgets have to be set per part; otherwise the parts that swell the most (usually tool results and history) crowd out the retrieval results that actually help. In practice, measure first: log each part's token count in the trace. Many systems find on their first measurement that tool definitions or overlong history take up more than half, while the useful retrieval results are only a small slice.

<details class="deep">
<summary>Before you build: how to measure each part's token count</summary>

- **The usage field is the source of truth**: the input token count in the API response is the real billed number, but it's only a total, not broken down by part.
- **Per-part counts are on you**: calibrate by measuring each part separately with your provider's token counting API, then use an approximation for real-time counting (for example, a tokens-per-word ratio measured on your own data). The ratio varies by tokenizer and by language (Chinese text, for instance, comes out very differently from English), so don't borrow someone else's number.
- **Trace fields**: for every call, log each part's token count, how many items were truncated, how many tokens were dropped, and cache read/write token counts (see the ordering section). The advanced exercise A11 Context Builder ([what the codes mean](/en/guide/how-to-use/#how-to-read-the-codes)) requires these fields on 100% of calls.
- **Write the builder as a pure function**: material in, messages out, no side effects, so you can use snapshot tests (← S6 LLM APIs and Application Basics) to confirm ordering and truncation don't change unexpectedly.

</details>

### ★ Why does more context make things worse?

Fitting in the context window doesn't mean the model uses it well. The longer the input, the more likely the model misses things, gets distracted, or gets led astray by wrong information, usually without raising any error.

**Length by itself hurts performance.** Chroma tested 18 models and found that the longer the input, the less stable the performance, even on simple retrieval and copying tasks; this has been called **context rot**. They also found that distractor passages that are related to the answer but wrong make accuracy worse, and that the less the question's wording resembles the answer passage, the faster performance falls. Two results you met in [S9 Retrieval and RAG](/en/stages/s09-rag/) point the same way: the length a model can actually use is often shorter than advertised (RULER), and the same information is more likely to be ignored in the middle of a long context than at the start or end (Lost in the Middle, Liu et al. 2023).

**Four common failure modes.** Beyond plain length, Drew Breunig groups the ways context goes wrong into four types. With notes-assistant examples:

| Type | What it is | Notes-assistant example | Common fix |
|---|---|---|---|
| Distraction | The history is so long that the model repeats what the history did instead of judging the next step itself | The history has 10 `notes_search` calls, and the model searches again with an almost identical query | Summarize the older history |
| Poisoning | Wrong content (an answer the model made up, a tool result that came back wrong) stays in the history and keeps being cited as fact | In turn 3 the model wrongly says "the budget is $50,000," and every later answer reuses that number | Remove or correct the wrong content; don't let it stay in the history |
| Confusion | Content irrelevant to this task is included and throws off the model's judgment | 40 unneeded tools are connected, and the model picks the wrong one | Include only the tools this task might use (tool search, ← S10 Tools and MCP) |
| Clash | The history contains statements that contradict each other, and the model doesn't know which to trust | Early on the user says "My time zone is Chicago," later "I moved to Tokyo," and both are in the history | Overwrite with the newest information instead of keeping both |

So budgets aren't just about saving money: the 13,650-token version in the table may well answer more accurately than the 26,000-token version, because the full text of those 17 quotes and the 11 old turns are mostly distraction.

**Common misconception: "the model supports 200K, so 100K is fine."** The context window is a limit, not a recommended amount. Measure the effective length on your own data (that's what the core exercise does), and measure at different positions, because information in the middle is the easiest to miss.

<details class="deep">
<summary>Going deeper: Chroma's experimental design and the source's limits</summary>

- Chroma's experiments treat input length as the only variable, holding task difficulty fixed, and watch how performance changes with length. Some of the manipulations: adding distractor passages similar to the answer but wrong, and varying the semantic similarity between the question and the answer passage. The core exercise's design (needles, same-domain distractor passages, questions worded differently from the passages) is a scaled-down version of this approach.
- Chroma is a vector database vendor, and the conclusion "long context is unreliable" favors its product. It published its methodology, and the core exercise has you rerun a scaled-down version of it yourself.
- The name "context rot" comes from Chroma; the four types distraction, poisoning, confusion and clash come from Breunig. Classifications in different articles overlap; what matters is being able to recognize them in a trace.

</details>

### ★ How detailed should the system prompt be?

Write the system prompt at the right "altitude" (Anthropic's term): don't turn every situation into a rule, and don't give just one vague expectation either. Anthropic recommends starting with the leanest version and adding only when you see failures.

**Too low** means hard-coding a pile of if-else rules ("if... then... otherwise...") into the prompt, which is brittle and hard to maintain. For example: "If the user asks about the budget, first search notes containing 'budget'; if nothing turns up, search for 'quote' instead; if there's still nothing..." **Too high** is an instruction like "You are a helpful notes assistant," which gives the model nothing to follow. The right altitude states the principles and the necessary format clearly: "Check the retrieved notes before answering; cite the note's title and date in your answer; if you can't find it, say so instead of guessing; confirm the content before creating or editing a note."

This ties directly into the error analysis from [S8 Eval Methodology](/en/stages/s08-evals/): every instruction you add should map to an observed failure category.

**Common misconception: more rules are safer.** With many rules, they tend to conflict (the clash in the previous section) and each one's influence gets diluted. A system prompt with 60 rules can usually be boiled down to a dozen or so principles plus a few examples.

**Custom context formats.** Factor 3 of 12-factor-agents (a set of agent engineering principles compiled by HumanLayer, 12 factors plus an appendix), "Own your context window," goes further: you don't have to use the standard messages list. You can serialize events, tool results and state (turn data into a piece of text that can be stored or sent) into a compact format of your own design and put it in a single message. The upside is fewer tokens and full control over what the model sees; the cost is losing the provider's support for the standard format (such as native tool-call parsing), and you have to prove with evals that it's better.

<details class="deep">
<summary>Before you build: what a custom format looks like</summary>

Write what happened in this notes-assistant turn as a single message, for example:

```xml
<history_summary>The user is organizing the design team's project; prefers answers as bullet points.</history_summary>
<event type="search" query="quote" results="20" shown="3" />
<note title="2026-10-14 Design team meeting" date="2026-10-14">...</note>
<question>What budget did we settle on?</question>
```

Compared with several messages in the standard format, this drops each message's role markers and JSON wrapper, and compresses "what was searched, how many came back, how many are shown" into one line. Whether it's worth it is decided by comparing the two formats' quality and token counts with an eval (← S8 Eval Methodology).

</details>

### ★ Load data up front or fetch it when needed?

Data can go into the context before the call, or you can give the model only pointers and tools and let it fetch data when needed. Each has costs, and real systems often mix the two.

**Pre-loading** puts the data that might be needed into the context before the call; that's what S9 Retrieval and RAG does. **Just-in-time** gives the model only lightweight references (file names, queries, links) plus tools, and lets it fetch things when needed; Claude Code exploring a codebase with `grep` (find keywords in file contents) and `glob` (find files by name pattern) works this way. The former is fast and predictable; the latter saves context and handles needs nobody could predict, but it's slower and needs good tools and guidance.

Run the numbers for the notes assistant. Pre-loading 8 note chunks every time adds 5,600 tokens to every call, even when the user just says "create a to-do for me" and needs no notes at all. Switch everything to just-in-time, and asking about the budget takes an extra round: the model calls `notes_search` first and calls the model again when the results come back, adding a round trip of latency, and the second call resends the whole context. So the common compromise: retrieve up front when the question clearly needs notes, and otherwise only provide the tools. Factor 13 in the 12-factor-agents appendix also points out: if you **know** the model will need some data, fetch it up front instead of spending a round letting the model get it.

**Progressive disclosure** is a just-in-time design: give a summary or index first, and expand the details when the model needs them. For example, the notes assistant first provides a list of 200 note titles (about 30 tokens each, 6,000 in total), and the model reads the full text of the ones it picks; including every full note would be 200 × 1,500 = 300,000 tokens. Tool lists work the same way: give a one-line description first and load the full schema only once a tool is picked (tool search, ← S10 Tools and MCP). The skills in [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) are built on this idea.

**Common misconception: just-in-time always saves tokens.** Every extra round of tool calls resends the context before it. When the data is needed almost every time, pre-loading actually uses fewer tokens and is faster.

### ★ What do you cut when over budget?

Tool results and conversation history are the two fastest-growing parts of the context. Cap every kind of tool result, replace older content with summaries, and always tell the model that something was cut.

**Tool results.** One search that returns 50 full results, or one file read that returns a whole file, fills the context fast. Common approaches:

- Paginate and truncate by default: searches return only the top few results unless asked for the next page.
- Return only the fields needed: a note's title, date and summary, not all its metadata.
- For long content, include only a summary and a reference: the model reads the full text with a tool when it needs it.
- Clear old tool results in later calls, or replace them with one line of "what was called, how many results came back." This is the lightest form of compression.

**Conversation history.** Keep the last few turns verbatim and replace earlier ones with a summary. In the table's example, 9,000 tokens of history become "the last 4 turns verbatim + a summary of 11 turns," 2,900 tokens in total. The summary should keep facts that will matter later (the user's decisions, preferences, to-dos) and drop small talk and steps that are already done.

**Example: the truncation note.** The table's tool results include only the first 3 in full. If you include just those 3, the model will think there are only 3 quotes. So add one line: "20 results in total. Below are the first 3 in full and the titles of the other 17; to see the full text of one, call `notes_search` with its title."

**Common misconception: truncating is fine, the model will figure it out.** The model only sees what's in the context. Unless you state clearly "truncated, N in total, here's how to get more," it assumes what it sees is everything, and gives a confident but incomplete answer based on that.

<details class="deep">
<summary>Before you build: setting truncation rules</summary>

- **Fix the drop order**: for example, cut tool results first, then compress history, and touch retrieval results last; never cut the system prompt or the user's input for this turn. A fixed order makes behavior predictable and testable.
- **Don't rewrite the summary every time**: the summary sits at the start of the history, and if it's rewritten every turn, nothing after it can hit the cache (see the next section). A common approach is to fold the oldest batch into the summary only after a set number of turns (say every 10).
- **Who writes the summary**: a cheap small model is fine, but spot-check it with the S8 Eval Methodology approach for dropped decisions or numbers; a fact the summary drops no longer exists as far as the model is concerned.
- **The truncation note costs tokens too**: leave room for that line in the budget.

</details>

### ★ How do you order the context to hit the cache?

Put what doesn't change first and what changes last, so the repeated beginning can be cached, which is much cheaper and somewhat faster. With Claude, caching only turns on when you mark it yourself.

**Why there's a discount.** As the model processes input, it stores each token's intermediate results as the KV cache (← "[KV cache](/en/guide/app-first/#kv-cache-and-why-output-tokens-cost-more)" in the Model Crash Course; deeper: [S5 Inference and Serving](/en/stages/s05-inference/)). Prompt caching reuses the KV cache of an identical prefix on the server side: as long as the beginning of this request is **exactly the same** as some recent request's, that portion doesn't have to be recomputed.

**Pricing.** As of when this was checked (2026-11), cache reads commonly cost a tenth (0.1×) of the normal input price, and less for some models. Cache writes may cost extra; for example, Anthropic's 5-minute cache writes cost 1.25× and its 1-hour cache 2×. Caches have a lifetime and prefixes have a minimum length, which differ by vendor and model; go by the official docs (details in the expandable section below).

**A worked example.** Suppose the notes assistant adds more tools and attaches note templates to the system prompt, so the fixed prefix (tool definitions + system prompt + shared documents) grows to 20,000 tokens and is used 50 times while the cache is live:

- Without caching: 50 × 20,000 = 1,000,000 input tokens.
- With caching: 1 write (20,000 × 1.25 = 25,000) plus 49 reads (49 × 20,000 × 0.1 = 98,000), the price of about 123,000 tokens.

That saves about 88% on the prefix, and latency drops too.

**How to order it.** The cache only recognizes the part that is "identical from the very start"; everything after the first differing token has to be recomputed. So the notes assistant's context is ordered by how often each part changes:

1. Tool definitions (in a fixed order)
2. System prompt
3. User profile (name, time zone, date: different per user and per day)
4. Conversation history (append only)
5. This turn's input, with the retrieved notes attached
6. Tool calls and tool results (in the standard messages format these follow the model's tool call)

Parts 1 and 2 are shared by all users; part 4 grows turn by turn within a conversation while its beginning stays the same. The user profile goes in a separate block **after** the system prompt, not at the start, so it doesn't invalidate the cache for every user, every day.

**With Claude, you turn caching on yourself.** Claude's prompt caching is opt-in: you mark the last block of the prefix you want cached with `cache_control`, and without it there are no cache reads at all. In the ordering above, mark the last block of part 2 (the system prompt) (another way to mark it is in the expandable section below). OpenAI and Gemini cache sufficiently long prefixes automatically, no setup needed. Whichever vendor you use, confirm hits with the usage field in the response (e.g. Claude's `cache_read_input_tokens`).

**Common cache breakers.** A timestamp at the start of the system prompt; a tool list in a different order each time (e.g. when loading from several MCP servers in no fixed order); rewriting earlier history (e.g. rewriting the summary every turn). Any one of these invalidates the cache for everything after it.

**Common misconception: OpenAI caches automatically, so Claude does too.** Move the same code to Claude without adding `cache_control` and cache reads stay at 0 forever, with no discount on the bill. When you switch providers, check again how caching is enabled and what the usage field is called.

<details class="deep">
<summary>Before you build: caching details by vendor</summary>

**Pricing (as of 2026-11).** Cache reads: 0.1× for most Anthropic models, lower for the newest few (0.05× or 0.025×); mostly 0.1× for newer OpenAI models and 0.05× for a few, while older models may be 0.25× to 0.5×, so check each model's pricing. Writes: Anthropic's 5-minute cache is 1.25×, the 1-hour cache 2×.

**Claude.**

- The cached prefix is computed in the order "tool definitions → system prompt → messages," so the ordering above matches it exactly.
- One request can mark up to 4 `cache_control` breakpoints, for example one after the system prompt and one on the last message of the history.
- You can also put `cache_control` at the top level of the request: the breakpoint is placed automatically on the last block and moves forward as the conversation goes on, which is the simplest option for multi-turn conversations. But if the last block differs every time (e.g. the user's new question) and no earlier request wrote the same prefix, it rarely hits (step 5 of the core exercise is exactly this case), so mark the fixed prefix's last block yourself.
- Usage fields: `cache_creation_input_tokens` is the number of tokens written to the cache this time, and `cache_read_input_tokens` the number read from it.
- A cache entry's lifetime resets whenever it's read within that lifetime.

**OpenAI.** Automatic, best-effort caching; you can set `prompt_cache_key` to make requests sharing a prefix more likely to hit the same cache.

**Local models.** llama.cpp and Ollama also reuse prefixes, but there are no billing fields; look at the timing information the server returns (whether prefill time drops noticeably).

Minimum lengths, lifetimes and prices all change; check the official docs before you start.

</details>

<section class="deep-section">

### ○ Compress the prompt, or move knowledge into the weights?

LongLLMLingua (Jiang et al. 2023) uses a small model to delete the less important tokens in a prompt, compressing the input for long contexts while maintaining or even improving performance; the cost is that compressed text is hard for humans to read, and compression that comes out differently each time can conflict with caching. Another question worth thinking about: should a piece of knowledge go into the context every time, or into the weights through fine-tuning (← S4 Post-training and Reasoning, and the decision in [S9 Retrieval and RAG](/en/stages/s09-rag/))?

</section>

## Exercises

Concepts route (no code): after "Try it first", you can skip to the self-check.

### Try it first (about 10 minutes)

**1.** The notes assistant's total budget is 16K input tokens. This call's material: tool definitions 1,600, system prompt 1,400, user profile 300, conversation history 2,800, retrieved notes 5,600, tool results 9,000 (30 full results), the user's question 100, totaling 20,800. You need to cut about 5,000 tokens. Which part do you cut first, and why?

<details class="hint">
<summary>Check your answer</summary>

Cut the tool results first: they're the biggest, most of the 30 full results are distraction, and anything cut can be fetched again with the tool. Don't cut the system prompt or the user's question; the retrieval results are the basis for the answer, so touch them last.

</details>

**2.** A 10,000-token fixed prefix is used 30 times while the cache is live. With writes at 1.25× and reads at 0.1×, how much does caching save on the prefix compared with no caching?

<details class="hint">
<summary>Check your answer</summary>

Without caching: 30 × 10,000 = 300,000. With caching: 1 write at 10,000 × 1.25 = 12,500, plus 29 reads at 29 × 10,000 × 0.1 = 29,000, for 41,500. That saves (300,000 − 41,500) ÷ 300,000 ≈ 86%. The common mistake is counting all 30 as reads and forgetting the first one is a write.

</details>

### Core: Length, position and caching experiments

**Goal**: see for yourself, in your own experiment, how context length and the position of information affect accuracy, and measure how much prompt caching saves.

**Steps**
1. Prepare 20 needles: have an LLM generate 20 short reports about fictional companies (about 60–110 words each, each with one unique, askable fact, such as a number or a person's name), then have it write a question for each report that doesn't reuse the report's wording. Fictional content guarantees the model can't already know the answers. Check by hand that each of the 20 questions has exactly one correct answer.
2. Prepare distractor passages: use the same prompt to generate 250 more fictional company reports (same domain as the needles but without those 20 facts, and with no repeated company names), about 30K tokens in total. You can also mix in chunks from your S9 Retrieval and RAG document set.
3. Build contexts at 3 lengths (about 2K, 8K and 32K tokens) × 3 positions (start, middle, end), 9 conditions in all, running the 20 questions in each. Don't set temperature (Claude won't accept it; see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#limits-on-sampling-parameters)); use the model's defaults, run each condition 3 times, and average accuracy over the 3 runs.
4. Record each condition's accuracy (an answer counts as correct only if it matches the needle's fact), average input tokens, average latency and cost.
5. Caching experiment: with a fixed prefix of about 10K tokens, send 30 different questions in sequence (not in parallel) while the cache is live, and record each request's cache reads and writes from the usage field. With Claude, put the fixed prefix in the system prompt (or a separate first block) and mark its last block with `cache_control`; don't use top-level `cache_control` on the request (see [How do you order the context to hit the cache?](#-how-do-you-order-the-context-to-hit-the-cache) for why). OpenAI and Gemini cache automatically.
6. Run it again, this time adding a line at the very start of the prefix with a timestamp that differs on every request (to the millisecond, or a per-request UUID instead; a timestamp only down to the minute can still hit the cache), and compare.

**Acceptance criteria**
- A 3 × 3 accuracy table, each cell with a 95% confidence interval (with n = 20 the intervals will be wide, which is itself an observation worth noting).
- A plot of "average input tokens vs accuracy."
- In the caching experiment, at least 28 of requests 2–30 have cache reads. That's what Claude does with `cache_control` added per step 5 and requests sent in sequence; OpenAI's and Gemini's automatic caching is best-effort (with OpenAI you can set `prompt_cache_key`), and the hit rate may be a bit lower, so just record the actual numbers.
- In the caching experiment, the actual cost computed from the usage fields, side by side with the cost without caching.
- The version with the timestamp drops to 0 (or nearly 0) cache reads, with the reason written down.

**Hints**
- TypeScript: the call layer from S6 LLM APIs and Application Basics is enough; always read token counts from the usage field; generate needles and distractor passages with structured output (← S7 Prompts, Structured Output and Workflows) and store them as JSONL.
- Python: same as above, using the S6 LLM APIs and Application Basics call layer and structured output (← S7 Prompts, Structured Output and Workflows).
- Use a cheap small model: 540 calls (9 conditions × 20 questions × 3 runs) averaging about 14K input tokens is about 7.5 million tokens in total, usually under $10 with a cheap model. The model's context window must be larger than 32K (say 64K or more), because the 32K condition plus the question and output goes over 32K. Local models are free, but a 32K context can be very slow on a laptop, so you can do just 2K and 8K. With Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)).
- Local models (llama.cpp, Ollama) also have prefix caching, but you measure it differently: look at the timing information the server returns.
- If you get stuck:
  - Reread: [Why does more context make things worse?](#-why-does-more-context-make-things-worse), [How do you order the context to hit the cache?](#-how-do-you-order-the-context-to-hit-the-cache)
  - Further: the experimental design section of Chroma's "Context Rot"; the usage-field explanation in the official prompt caching docs

**Heads-up**: about half the work is preparing the needles and distractor passages.

<section class="deep-section">

### Advanced: System project A11: Context Builder

**Goal**: consolidate the scattered context-assembly logic in your system into one context builder that has budgets, a fixed order and is cache-friendly, and choose the budget from experimental results.

**Steps**
1. Write a context builder: its input is all the material available for this request (system prompt, tools, retrieval results, tool results, history), and its output is the messages to send.
2. Set a token budget for each part; when a part goes over, truncate, summarize or drop by rule (for example, older tool results keep only a one-line summary).
3. Ordering: fixed content first, changing content last; tool definitions in a fixed order.
4. Log each part's token count, the number of truncated items, and cache read/write token counts in the trace.
5. Using the question set from A8 Error Analysis and Golden Set plus the query set from A9 RAG with Citations, run evals under at least 4 total budgets and plot the token count vs quality curve.
6. Run needle-in-a-haystack on your own documents: hide one fact in each of 10 documents, at the start, middle and end, and test at your system's maximum budget.
7. Replay a 50-turn conversation (record / replay or a script) and measure the cache hit rate. With Claude you need `cache_control` for caching: for multi-turn conversations, top-level `cache_control` on the request is simplest, since the breakpoint is placed automatically on the last block and moves forward with the conversation; OpenAI caches automatically.

**Acceptance criteria**
- 100% of calls have per-part token counts in the trace.
- A quality curve with at least 4 budget points, each with a 95% confidence interval.
- The budget you choose from it is no worse than A9 RAG with Citations on the golden set: ① before running, write down the tolerated gap δ (e.g. 5 percentage points); ② the lower bound of the 95% confidence interval of the paired difference (new budget − A9) is no lower than −δ; ③ if there are too few questions and the interval is too wide to meet this, add questions instead of loosening the threshold.
- In the 50-turn replay, cache-read tokens make up ≥ 60% of total input tokens; if not, identify which part broke the prefix.
- Needle test: a recall table of 10 facts × 3 positions.
- With the chosen budget, average cost per request side by side with A9 RAG with Citations.

Using the notes assistant as an example: the budget can be split into "tool definitions, system prompt and user profile 4K, retrieved notes 6K, conversation history 4K, tool results 2K"; put the user's name and time zone in a dynamic block **after** the system prompt, not at the start, so it doesn't invalidate the cache for every user, every day.

**Hints**
- TypeScript: calibrate token counts with your provider's token counting API first, then use an approximation for real-time counting; write the context builder as a pure function so it's easy to snapshot-test (← S6 LLM APIs and Application Basics).
- Python: same as above; define the builder's input and output with Pydantic so they're easy to log and replay.
- Cost: 4 budget points × about 100 questions from the golden set plus query set, plus a 50-turn replay, is a few dollars with a mid-tier model. With Ollama, raise the context length first (see [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/#context-length-in-ollama)).
- If you get stuck:
  - Reread: [How do you budget the context?](#-how-do-you-budget-the-context), [What do you cut when over budget?](#-what-do-you-cut-when-over-budget), [How do you order the context to hit the cache?](#-how-do-you-order-the-context-to-hit-the-cache)
  - Further: the "The anatomy of effective context" section of "Effective context engineering"; the sections of the prompt caching docs on prefix order and invalidation conditions

</section>

## Self-check

1. Why isn't more data in the context always better? Name two different failure modes, with an example of each.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: length by itself makes performance unstable, and information in the middle is easy to miss; then pick two of distraction, poisoning, confusion and clash, each with a concrete example. **Common mistake**: saying only "it will exceed the context window"; that's a limit problem, not a quality problem. **Reread**: [Why does more context make things worse?](#-why-does-more-context-make-things-worse)

   </details>

2. A system's cache hit rate is nearly 0. List three causes you'd check first.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: first check whether the prefix changes every time (timestamps, tool order, rewritten summaries), then check whether `cache_control` is set when using Claude. **Common mistake**: reading only the code without confirming in the usage field. **Reread**: [How do you order the context to hit the cache?](#-how-do-you-order-the-context-to-hit-the-cache)

   </details>

3. When should you pre-load data instead of letting the model fetch it just-in-time?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: pre-load data that's certain, or almost certain, to be used every time, saving a round trip and a resend of the whole context. **Common mistake**: assuming just-in-time always saves tokens. **Reread**: [Load data up front or fetch it when needed?](#-load-data-up-front-or-fetch-it-when-needed)

   </details>

4. Your system prompt already has 60 rules, and the model makes more mistakes, not fewer. How would you rewrite it, and on what basis would you cut?

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: start over from the leanest principle-based version; every instruction you keep should map to a failure category observed in error analysis, and conflicting rules get merged. **Common mistake**: adding one more rule, "Please follow all the rules above." **Reread**: [How detailed should the system prompt be?](#-how-detailed-should-the-system-prompt-be)

   </details>

5. Scenario: a search tool returns 30 full results of about 800 tokens each every time, and after three rounds the context is nearly full. Design a budget strategy for tool results, and explain how you'd verify it doesn't hurt quality.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: cap the results returned and add a truncation note, then compare quality before and after on a fixed question set (with confidence intervals). **Common mistake**: cutting without telling the model, or declaring success just because the token count went down. **Reread**: [What do you cut when over budget?](#-what-do-you-cut-when-over-budget)

   </details>

6. Without looking at the lecture, list the parts of the context for one notes-assistant request and their order, and explain where `cache_control` goes when using Claude and why the user's time zone can't go at the start of the system prompt.

   <details class="hint">
   <summary>Hint</summary>

   **Key point**: order from least to most frequently changing, and put `cache_control` on the last block of the system prompt. **Common mistake**: putting the time zone at the start, which invalidates the cache for everything after it, for every user, every day. **Reread**: [How do you order the context to hit the cache?](#-how-do-you-order-the-context-to-hit-the-cache)

   </details>

<section class="deep-section">

## Further reading

The lecture already covers what this chapter needs. The material below is for readers who want the original experiments, official details or other ways of organizing the topic. None of it is required.

### Official docs and vendor articles

- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) (2025-09-29) — The original statements of attention budget, right altitude and just-in-time, with more Claude Code examples; S12 The Agent Loop and Harness revisits the long-running-task techniques in the second half.
- Official prompt caching docs: [Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching) — Pricing, minimum lengths, lifetimes and usage fields for each model, plus the full list of changes that invalidate the cache.

### Long-context research

- [Chroma: Context Rot](https://www.trychroma.com/research/context-rot) (2025-07-14) — Length experiments on 18 models, with more manipulated conditions and full charts. Research by a vector database vendor.
- [Liu et al. 2023, Lost in the Middle](https://arxiv.org/abs/2307.03172) — The original experiments on how the position of information matters.
- [Jiang et al. 2023, LongLLMLingua](https://arxiv.org/abs/2310.06839) — Prompt compression methods and experiments.

### Practical guides

- [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) — Factor 3, "Own your context window," has a full custom-format example; appendix Factor 13 is "Pre-fetch all the context you might need." Parts of it promote HumanLayer's product.
- [Drew Breunig: How Long Contexts Fail](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html) (2025-06-22) and [How to Fix Your Context](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html) (2025-06-26) — The original write-up of the four failure modes, and the research each fix cites.
- [roadmap.sh AI Agents](https://roadmap.sh/ai-agents) — The context-related nodes, for checking whether you've missed a topic.

### Courses

- [Stanford CS 329Z](https://cs329z.stanford.edu/) lectures 2 and 6; the context engineering lecture in [Stanford CS 224G](https://web.stanford.edu/class/cs224g/).

### What's next

- Managing context over long runs: compaction, context reset, structured notes, sub-agent isolation (→ [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/)).
- Memory: what to keep across conversations and how to retrieve it (→ [S13 Memory and Personalization](/en/stages/s13-memory/)).
- KV-level context reuse (CacheBlend and others), which stitches together precomputed KV caches of documents (← an extension of S5 Inference and Serving).

</section>
