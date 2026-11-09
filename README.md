<div align="center">

<img src="public/favicon.svg" alt="" width="88" height="88">

# Token2Agent

從 token 到 agent 的 AI/LLM 學習路線。

![內容授權：CC BY-NC-SA 4.0](https://img.shields.io/badge/content-CC%20BY--NC--SA%204.0-lightgrey.svg)
![程式碼授權：MIT](https://img.shields.io/badge/code-MIT-blue.svg)
![網站](https://img.shields.io/badge/website-token2agent.com-orange.svg)

**繁體中文** · [English](README.en.md)

</div>

Token2Agent 是一份免費的 AI/LLM 工程學習路線，以繁體中文撰寫。從文字怎麼變成 token 講起，一路到能評估、能防護、能上線的 agent 系統。每一章都有完整的講義，只讀這個網站就能學會，想深入時再看延伸閱讀。

線上閱讀：[**token2agent.com**](https://token2agent.com)

<a href="https://token2agent.com">
<picture>
<source media="(prefers-color-scheme: dark)" srcset=".github/assets/hero-ids-fast-dark.gif">
<img alt="Token2Agent 首頁：標題與標語依序展示 token ID，旁邊示範從請求、工具呼叫到回應的七步流程，底部列出 S0–S19 課程章節" src=".github/assets/hero-ids-fast-light.gif">
</picture>
</a>

## 路線圖

<a href="https://token2agent.com">
<picture>
<source media="(prefers-color-scheme: dark)" srcset=".github/assets/roadmap-dark.gif">
<img alt="Token2Agent 路線圖：20 章包含入門章與六個 Part，每章列出核心主題" src=".github/assets/roadmap-light.gif">
</picture>
</a>

點圖片可以到網站上看互動版：每章和每個主題都能點進對應的講義。


| Part             | 章                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 從這裡開始        | [S0 AI 系統概觀](https://token2agent.com/stages/s00-big-picture/)                                                                                                                                                                                                                                                                                                                              |
| Part I 模型原理（選修） | [S1 神經網路基礎](https://token2agent.com/stages/s01-neural-networks/)<br>[S2 Transformer 與 decoding](https://token2agent.com/stages/s02-transformer/)<br>[S3 Pretraining 與 scaling](https://token2agent.com/stages/s03-pretraining/)<br>[S4 Post-training 與 reasoning](https://token2agent.com/stages/s04-post-training/)<br>[S5 推論與 serving](https://token2agent.com/stages/s05-inference/) |
| Part II 應用基礎    | [S6 LLM API 與應用基本功](https://token2agent.com/stages/s06-llm-api/)<br>[S7 Prompt、structured output 與 workflows](https://token2agent.com/stages/s07-prompting/)<br>[S8 Eval 方法論](https://token2agent.com/stages/s08-evals/)                                                                                                                                                                |
| Part III 知識與工具    | [S9 檢索與 RAG](https://token2agent.com/stages/s09-rag/)<br>[S10 工具與 MCP](https://token2agent.com/stages/s10-tools-mcp/)<br>[S11 Context engineering](https://token2agent.com/stages/s11-context-engineering/)                                                                                                                                                                             |
| Part IV Agent 系統  | [S12 Agent loop 與 harness](https://token2agent.com/stages/s12-agent-harness/)<br>[S13 Memory 與個人化](https://token2agent.com/stages/s13-memory/)<br>[S14 Agent eval、資料與最佳化](https://token2agent.com/stages/s14-agent-evals/)<br>[S15 Multi-agent](https://token2agent.com/stages/s15-multi-agent/)                                                                                        |
| Part V 產品上線 | [S16 安全與治理](https://token2agent.com/stages/s16-security/)<br>[S17 產品與 AI UX](https://token2agent.com/stages/s17-ai-ux/)<br>[S18 部署與架構](https://token2agent.com/stages/s18-deployment/)                                                                                                                                                                                                  |
| Part VI 綜合實戰    | [S19 真實 agent 系統與畢業專題](https://token2agent.com/stages/s19-capstone/)                                                                                                                                                                                                                                                                                                                    |


## 內容

- **20 章**，包含入門章與六個 Part：模型原理（選修）、應用基礎、知識與工具、Agent 系統、產品上線、綜合實戰。
- **三條路線**：給多數人的應用路線（不需要機器學習背景）、含模型原理的完整路線，以及不寫程式的理解路線。
- **每頁兩種讀法**：「淺顯」只顯示主線；「深入」會展開推導、實作細節、選修主題和進階題。
- **實作題只給規格**：目標、步驟、有數字的驗收標準，不附解答。兩個實作專案跨章累積：系統專案（A6–A19，做出你自己的 AI 應用）與模型專案（M1–M5，訓練小模型）。
- **整理 300 多份來源寫成**：包括 Stanford、CMU、Berkeley、台大等 24 門大學課程，Anthropic、OpenAI、Google 的工程指南、經典論文，以及繁中、簡中社群教材。講義用自己的話重新講解，每份來源都標上日期，列在[來源清單](https://token2agent.com/reference/sources/)。
- **附提示的自我檢查**，以及術語表和概念索引。
- **專案分享**：任何人都可以分享自己做的 AI 應用或 agent。

## 為什麼做這份路線

學 AI/LLM 的好資源很多，但分散在不同的課程、論文和官方文件裡，用語和深淺也不一樣，初學者很難知道該從哪裡開始、按什麼順序讀。Token2Agent 把它們整理成一條連貫的路線：每個概念用中文從頭講清楚，應用的各章用同一個例子（筆記助理）貫穿，搭配有數字的小例子、常見誤會和可以自己驗收的題目。想深入時，延伸閱讀會帶你回到原始來源。

## 怎麼開始

不確定從哪裡開始，先看[怎麼使用這份路線](https://token2agent.com/guide/how-to-use/)，依目標選一條路線：

- **應用路線**（推薦給多數人）：想做出 AI 應用或 agent。從 [S0 AI 系統概觀](https://token2agent.com/stages/s00-big-picture/) 開始，讀完[模型速成](https://token2agent.com/guide/app-first/)後，從 S6 LLM API 與應用基本功一路讀到 S19 真實 agent 系統與畢業專題。
- **完整路線**：也想懂模型內部怎麼運作，S0 到 S19 依序走。
- **理解路線**：先看懂 AI 系統怎麼運作，暫時不寫程式。

## 參與貢獻

- **分享你的專案**：用 LLM 做了應用或 agent，歡迎加進[專案分享](https://token2agent.com/showcase/)，開一個 Pull Request 就好，不必走過這份路線。
- **回報與修正**：發現錯誤、過時的內容或失效的連結，歡迎開 Issue 或 Pull Request。

開發環境、撰寫規則與投稿步驟見 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權

- **內容**（`src/content/docs/` 底下的所有檔案）以 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant) 授權，見 [LICENSE-content](LICENSE-content)。對內容的修改與貢獻也以相同授權釋出。
- **程式碼**（`src/content/docs/` 與 `src/data/showcase/` 以外的網站原始碼）以 [MIT License](LICENSE) 授權。
- **專案分享的資料**（`src/data/showcase/`）由投稿者提供，並同意本網站展示；各專案維持自己的授權。
- 網站引用或提及的第三方內容屬於原作者。

「Token2Agent」這個名稱代表本專案，fork 不得使用這個名稱；寫「based on Token2Agent」沒有問題。
