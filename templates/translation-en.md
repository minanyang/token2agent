# English translation guide

The English edition lives in `src/content/docs/en/`, mirroring the zh-TW tree (same file names and slugs). A page that is not translated yet falls back to zh-TW under `/en/` with a notice. This guide is what every English page follows, so pages translated at different times read as one book.

## Localize, don't transliterate

Write for an English-speaking engineer who never saw the Chinese edition.

- **Same teaching, natural English.** Keep every concept, number, formula, step, acceptance criterion and the order of sections. Rewrite sentences freely; don't carry over Chinese sentence structure.
- **Examples in English.** Replace Chinese example text (prompts, notes, user messages, sample outputs) with English equivalents that make the same point. Where the point *is* about Chinese or CJK text (e.g. how a tokenizer splits CJK characters, token counts per character), keep a short Chinese example and say why it matters; adjust numbers that change with language (token counts for an English sentence differ — recompute or phrase them as approximate, never keep a number that is now wrong).
- **Running persona.** The notes assistant's user 小林 is **Sam** (they/them). Other names: pick ordinary English names, consistent within a page.
- **Locale-specific details.** Taiwan-specific services, currency (NT$) and places become neutral or US equivalents (USD). Prices stated in USD stay as they are.
- **Chinese-only resources.** Drop "中文資源" subsections from Further reading and drop advice that only applies to Chinese readers (OpenCC, Simplified-Chinese reading tips). In `reference/sources.md`, keep Chinese-language entries but mark them *(in Chinese)*.
- **Voice.** Second person, plain and direct, short sentences. American spelling. No hype words.
- **Evaluation terminology.** Use `evals` for the topic or evaluations collectively, `eval` for one evaluation (which may contain many test cases), and singular modifiers such as `eval runner`, `eval score` and `eval harness`. Follow the fixed chapter and project names below; preserve code identifiers and external source titles.
- **Table labels.** Keep short labels such as `Level&nbsp;0` together with a non-breaking space (`&nbsp;`) in both editions. Descriptive cells should wrap normally; do not disable wrapping for an entire table or column.

## Fixed names

Chapter titles (frontmatter `title` and every in-text reference use exactly these; the code always comes first, as in the zh edition):

| | English title |
|---|---|
| S0 | AI Systems Overview |
| S1 | Neural Network Basics |
| S2 | Transformers and Decoding |
| S3 | Pretraining and Scaling |
| S4 | Post-training and Reasoning |
| S5 | Inference and Serving |
| S6 | LLM APIs and Application Basics |
| S7 | Prompts, Structured Output and Workflows |
| S8 | Evals Methodology |
| S9 | Retrieval and RAG |
| S10 | Tools and MCP |
| S11 | Context Engineering |
| S12 | The Agent Loop and Harness |
| S13 | Memory and Personalization |
| S14 | Agent Evals, Data and Optimization |
| S15 | Multi-agent Systems |
| S16 | Security and Governance |
| S17 | Product and AI UX |
| S18 | Deployment and Architecture |
| S19 | Real Agent Systems and the Capstone |

Other pages: How to Use This Roadmap · The Application Route and Model Crash Course · Math Refresher · Model Project (M1–M5) · System Project (A6–A19) · Concept Index · Glossary · Sources · Showcase.

Entry group: Start here (S0). Parts: Part I Models (optional; omit the optional marker from sidebar headings) · Part II Applications · Part III Knowledge & Tools · Part IV Agents · Part V Production · Part VI Capstone. These also live in `src/data/parts.ts` and the sidebar `translations` in `astro.config.mjs`.

Project steps (use these after the code in running text and on the project pages; a chapter's own `### Advanced:` heading translates that chapter's zh subtitle instead):

| | System project | | Model project |
|---|---|---|---|
| A6 | Streaming Chat and Traces | M1 | micrograd and the makemore MLP |
| A7 | Structured Output and Workflows | M2 | Tiny GPT, Upgraded to Llama Components |
| A8 | Error Analysis and Golden Set | M3 | Small-model Pretraining and a Mini Scaling Experiment |
| A9 | RAG with Citations | M4 | SFT → LoRA → DPO → GRPO on a Small Qwen3 |
| A10 | Toolset and MCP Server | M5 | KV Cache, Quantization and a Mini Inference Server |
| A11 | Context Builder | | |
| A12 | Hand-written Harness | | |
| A13 | Layered Memory | | |
| A14 | Agent Evals and Optimization | | |
| A15 | Multi-agent Experiment | | |
| A16 | Security Attack, Defense and Governance | | |
| A17 | Complete Frontend | | |
| A18 | Multi-user Deployment | | |
| A19 | Capstone | | |

| zh | en |
|---|---|
| 章 | chapter |
| 應用路線 / 完整路線 / 理解路線 / 實作路線 | application route / full route / concepts route / hands-on routes |
| 淺顯 / 深入（閱讀模式） | Simple / Deep (reading mode) |
| 系統專案 / 模型專案 | system project / model project |
| 必做題 / 進階題 | core exercise / advanced exercise |
| 先試一下 | Try it first |
| 模型速成 | Model Crash Course |
| 現在要懂的四件事 | Four things to know now |
| 安全檢查點 | security checkpoint |
| 推論 / 推理 | inference / reasoning |
| （← S2 Transformer 與 decoding） | (← S2 Transformers and Decoding) |
| 深入：S2 … | Deeper: S2 … |

## Page structure and markup

Keep all markup exactly: frontmatter keys, `:::note`/`:::tip` asides, `<details class="deep">`, `<details class="hint">`, `<section class="deep-section">`, tables, code blocks, math. Only translate text. Code comments and string literals in code blocks are translated; identifiers stay.

Frontmatter: translate `title`, `description` and `head` title (format `… | Token2Agent`, ASCII pipe with spaces). Keep `sidebar.order`. Description: one or two sentences, written for search results.

Fixed headings and labels:

| zh | en |
|---|---|
| ## 在做什麼 | ## What this chapter covers |
| ## 學完能 | ## After this chapter you can |
| ## 講義 | ## Lecture |
| ## 實作 | ## Exercises |
| ### 先試一下（約 10 分鐘） | ### Try it first (about 10 minutes) |
| ### 必做：… | ### Core: … |
| ### 進階：系統專案 A6：… | ### Advanced: System project A6: … (translate that chapter's own zh subtitle, sentence case) |
| ### 進階：模型專案 M1：… | ### Advanced: Model project M1: … (same) |
| ## 自我檢查 | ## Self-check |
| ## 延伸閱讀 | ## Further reading |
| :::note[這一章] | :::note[This chapter] |
| :::tip[理解路線重點] | :::tip[Concepts route: key points] |
| 準備動手做：… (summary) | Before you build: … |
| 深入一點：… (summary) | Going deeper: … |
| （必做）（進階）（講義與自我檢查） | (core) (advanced) (lecture and self-check) |
| ### 選做：… | ### Optional: … |
| 對照答案 / 提示 (hint summaries) | Check your answer / Hint |
| 判斷重點 / 常見錯法 / 回讀 | Key point / Common mistake / Reread |
| 驗收 / 提示 (exercise sections) | Acceptance criteria / Hints |
| 容易誤會 | Common misconception (see below) |
| **提醒** | **Note** |
| 卡住時 / 重讀 / 延伸 | If you get stuck: / Reread: / Further: |
| :::tip[走應用路線的讀者] | :::tip[On the application route] |
| 下一步去哪裡 | Where to go next |

`Common misconception:` must be followed by the **wrong belief**, which the next sentences correct. zh often writes the correction after 容易誤會 (「token 不等於字」); turn it around in English (`Common misconception: a token is a character, or a word.`).

Fixed collocations: worked example (not "worked numbers"), meet the acceptance criteria (not "pass the numbers"), raw similarity score (not "absolute value" unless |x| is meant).

Topic headings keep their markers: `### ★ …` (core topic), `### ○ …` (optional topic), 🔒. The home roadmap builds its chips from `★` h3 headings and skips running-example sections, so a running example's heading must end in **"end to end"** (e.g. `### ★ One example, end to end`) or start with `★ An example:`. Topic headings are questions in zh; keep them as short questions in English.

## Links

- Internal links get the `/en` prefix: `/stages/s06-llm-api/` → `/en/stages/s06-llm-api/`.
- Anchors use the **English** heading slug of the target page (lowercase, spaces → `-`, punctuation dropped; `★` leaves a leading `-`, as in `#-what-does-one-api-call-look-like`). When the target page is not translated yet, translate it first or keep the zh anchor (the fallback page still has it) followed by `<!-- TODO anchor -->` (`{/* TODO anchor */}` in `.mdx`), so `grep -rn 'TODO anchor'` finds them once the target is translated; `pnpm check:links` lists what is broken.
- External links: only URLs already in `reference/sources.md` (`pnpm check:sources` fails otherwise). Prefer the English version of a doc when the source lists one.

## Checks

Preserve the learning contract across editions: prerequisites, optional bridges, acceptance criteria,
resource readiness and difficulty must agree. Verify course-number recommendations against the
specified edition's original syllabus; do not turn a checked topic match into a claim that the entire
resource was watched, implemented or benchmarked. Follow the recommendation rules in `stage.md`.

```sh
pnpm build && pnpm check:links && pnpm check:sources
```
