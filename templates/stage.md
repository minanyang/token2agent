---
title: S{N} {章名}
description: {一句話：這章在解決什麼問題}
sidebar:
  order: {N}
  label: S{N} {章名}
---

<!--
Authoring rules (keep this comment out of published pages):
- Language: Traditional Chinese (Taiwan) with English technical terms. Follow /reference/glossary/.
  First mention: 中文（English）. 推論 = inference, 推理 = reasoning. No Simplified-Chinese vocabulary.
- Every link to an external source must come from /reference/sources/ (same URL). If a needed source is
  not there, add it to sources.md with a status mark, do not invent URLs.
- Markers: ★ core, ○ optional, 🔒 security checkpoint. Optional items never become prerequisites of core items.
- "First taught" rule: a concept is introduced in exactly one stage (see /reference/concepts/). Elsewhere
  write 「（← S{n}）」 when building on it, 「（→ S{n}）」 when deferring it.
- Exercises are specs only: no solution code. Language-agnostic; give hints for both TypeScript and Python.
- System-thread exercises are written for "your system" (reader picks the theme); add one line
  「以筆記助理為例：…」 as the worked example.
- Numbers in acceptance criteria must be checkable by the reader alone.
- Put prerequisites and next steps in separate paragraphs in the chapter note, in both editions.
- Keep short table labels together with non-breaking spaces (e.g. `Level&nbsp;0`). Let descriptive cells
  wrap normally; do not disable wrapping for an entire table or column.
- Do not overclaim; keep sources' caveats (dates, vendor bias, unread content).
- Lecture-first: the 講義 section must be enough on its own to understand the stage (intuition, mechanism,
  a worked example with numbers, common misconceptions). External material is optional 延伸閱讀 only.
- Two reading depths: the main text is what a first-time reader needs (why → how → one example → one
  common misconception, without fixed sub-headings). Implementation details, derivations and extra
  mechanisms go in `<details class="deep">` blocks with a summary starting 「準備動手做：」 or 「深入一點：」.
  The header toggle (淺顯 / 深入) collapses or expands them. Never put something the main line needs in one.
- Wrap every ○ concept, every 進階 exercise and the 延伸閱讀 section in `<section class="deep-section">` …
  `</section>` (blank line after the opening tag and before the closing tag). In 淺顯 mode only their heading
  and a notice whose button opens that one section are shown.
- Headings (★/○) are short questions a beginner understands (「文字怎麼變成 token？」), not lists of terms;
  technical names go in the paragraph or table.
- 學完能: list main-text abilities first (tag （講義與自我檢查）, checkable without code), then 必做, then 進階.
- Under 實作, start with 「### 先試一下（約 10 分鐘）」: 1–2 pen-and-paper exercises, each with a collapsed
  `<details class="hint"><summary>對照答案</summary>…</details>`.
- Every self-check question gets a collapsed `<details class="hint"><summary>提示</summary>` with 判斷重點 /
  常見錯法 / 回讀 (link). Small knowledge questions may state the answer; programming tasks get judging points
  only, never a solution. `details.hint` ignores the 淺顯/深入 toggle.
- Right after the note box, a 「理解路線重點」 tip box: three plain one-sentence bullets (≤ 45 characters each)
  summarising what a non-programmer must take away; they introduce nothing the main text doesn't say.
- Before the first code block in a page's main text, add 「不寫程式的讀者可以略過 Python／TypeScript 程式碼；prompt、筆記與 JSON 範例請照常讀。」
- Write everything in your own words and your own examples. Never copy text, figures or worked examples
  from other sources unless their LICENSE allows it, and then attribute them. Facts and formulas are fine.
-->

:::note[這一章]
**前置**：S{a}、S{b}

**銜接**：→ S{c}
:::

:::tip[理解路線重點]
- {不寫程式的讀者要帶走的第一個重點，一句話}
- {第二個重點}
- {第三個重點}
:::

## 在做什麼

{2–4 句：這章要回答的問題、為什麼排在這裡。}

## 學完能

- {可以檢驗的能力 1}
- {可以檢驗的能力 2}

## 講義

{一段全貌：這章的內容怎麼串起來，必要時附一張圖。}

### ★ {概念名}

{主文：為什麼需要 → 怎麼運作 → 一個有數字的小例子 → 一個容易誤會的地方。讀者不看外部資料也能懂。}

<details class="deep">
<summary>準備動手做：{實作細節、推導}</summary>

{內容}

</details>

<section class="deep-section">

### ○ {選修概念名}

{1 段。}

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

1. {紙筆小練習}

   <details class="hint">
   <summary>對照答案</summary>

   {簡短答案與理由}

   </details>

### 必做：{題目名}

**目標**：{一句話}

**步驟**
1. …

**驗收**
- {有數字、讀者自己能檢查的標準}

**提示**
- TypeScript：{工具或套件}
- Python：{工具或套件}
- 卡住時：{講義的哪一節；需要時再指向延伸閱讀的哪一段}

<section class="deep-section">

### 進階：{模型線 M{n} 或 系統線 A{n}}：{題目名}

{同上格式。系統線題目寫成「你的系統」，並附「以筆記助理為例：…」。若需要付費 API 或 GPU，寫出大概成本與免費替代方案。}

</section>

## 自我檢查

1. {問題：能不能用自己的話解釋…}

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：… **常見錯法**：… **回讀**：[{段落}](#{anchor})

   </details>

2. …（3–5 題，至少一題是情境判斷題）

<section class="deep-section">

## 延伸閱讀

{一句話：講義已涵蓋本章內容，下面都是選讀。}

### {分類，例如：跟著寫程式 / 原始論文與綜述 / 課程與概覽 / 中文資源}

- [{標題}]({url}) — {比講義多了什麼；繁中 / 簡中；對應哪幾章}

</section>
