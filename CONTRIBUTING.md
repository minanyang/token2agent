# 參與貢獻

謝謝你願意幫忙。這份文件說明怎麼分享專案、回報問題，以及修改內容時要遵守的規則。

## 分享你的專案

1. Fork [minanyang/token2agent](https://github.com/minanyang/token2agent)。
2. 把 `src/data/showcase/_template.yaml` 複製成 `src/data/showcase/你的專案名.yaml`（小寫英文與連字號），照檔案裡的註解填好。
3. 開一個 Pull Request，標題寫「分享：專案名」。

收錄條件見網站的[專案分享](https://token2agent.com/showcase/)頁。送出 PR 即同意本網站展示你填的名稱、介紹、連結與作者名稱；你的專案維持它自己的授權。

## 回報問題

發現錯誤、過時的內容或失效的連結，請開 Issue，寫出哪一頁、哪一段，以及你認為正確的內容或來源。小錯字可以直接開 Pull Request。

## 開發環境

需要 Node.js 22.23 以上（Astro 的要求）與 pnpm。

```sh
pnpm install
pnpm dev             # 本機開發伺服器
pnpm build           # 靜態輸出到 dist/
pnpm check:sources   # 檢查外部連結都列在 reference/sources.md
```

送出 PR 前請確認 `pnpm build` 與 `pnpm check:sources` 都通過。

## 專案結構

```
src/content/docs/
  index.mdx          首頁與路線總覽圖
  guide/             使用說明、應用路線與模型速成、數學補給
  stages/s00–s19     每站一頁
  projects/          模型線（M1–M5）、系統線（A6–A19）
  reference/         來源清單、術語表、概念索引
  showcase.mdx       專案分享頁
src/data/showcase/   專案分享的資料，每個專案一個 YAML 檔
src/components/      首頁路線圖、閱讀模式切換等元件
templates/stage.md   每站頁面的範本與完整撰寫規則
```

## 撰寫規則

- **語言**：繁體中文（台灣用語）搭配英文技術詞，用語依[術語表](src/content/docs/reference/glossary.md)。
- **自己寫，不照抄**：講義用自己的話與自己的例子講解。事實、數字和公式可以引用，但文字、圖表與範例不要照抄或逐句翻譯；引用時要短，並註明出處。
- **代號都帶名稱**：提到站或步驟時寫成「S6 LLM API 與應用基本功」「A10 工具組與 MCP server」；範圍要帶 Part 或實作線的名稱，例如「Part II 模型原理（S1–S5）」「系統線 A6–A18」。
- **外部連結**：都要列在[來源清單](src/content/docs/reference/sources.md)，新增來源時寫上日期。`pnpm check:sources` 會列出沒登錄的網址。
- **每個概念只首次教一次**：其他站用「（← S2 Transformer 與 decoding）」標出來源站；有變動時更新[概念索引](src/content/docs/reference/concepts.md)。
- **兩種讀法**：第一次讀的人需要的內容放主線；推導、實作細節與選修主題放進 `<details class="deep">` 或 `<section class="deep-section">`。
- **實作題只寫規格**：目標、步驟、有數字的驗收標準與提示，不附解答。

完整的檢查清單在 [`templates/stage.md`](templates/stage.md) 開頭的註解裡。

## 翻譯

繁體中文是根語系。英文、簡體中文、日文預計以 `/en/`、`/zh-cn/`、`/ja/` 加進 `astro.config.mjs`，譯文放在 `src/content/docs/en/` 這類資料夾。想參與翻譯，請先開 Issue 討論，避免重工。

## 授權

對內容（`src/content/docs/`）的貢獻以 [CC BY-NC-SA 4.0](LICENSE-content) 釋出，對程式碼的貢獻以 [MIT License](LICENSE) 釋出。
