---
title: 系統專案（A6–A19）
head:
  - tag: title
    content: AI agent 實作專案：從 API 到上線（A6–A19）｜Token2Agent
description: 選一個你在意的應用，從 S6 串接 LLM API 一路做到 S19 常駐 agent：每一章幫它長出一種能力，最後完成一個可上線、可評估的 AI agent 專案。
sidebar:
  order: 2
---

系統專案是一個**橫跨 Part II 到 Part VI（S6–S19）的累積實作**：每一章都在**同一個應用**上加一種新能力，而不是每章各做一個不相關的練習（代號見[代號說明](/guide/how-to-use/#代號怎麼讀)）。這樣你會看到各層怎麼疊在一起，例如在 S9 檢索與 RAG 做出的檢索答錯時，S8 Eval 方法論建好的評估集會抓到它；在 S10 工具與 MCP 加上的工具，到 S16 安全與治理會被反過來攻擊。

系統專案是**進階題**。只做每章的必做題也能走完整條路線，終點是 S19 真實 agent 系統與畢業專題的必做題；那一章的 A19 畢業專題同樣是進階題，需要系統專案前面 A6–A18 累積的系統。

## 選一個主題

主題由你決定，在 [S6 LLM API 與應用基本功](/stages/s06-llm-api/) 的 A6 串流聊天與 trace 確定。一個好主題最好具備這些條件，後面每一章才都練得到：

- **有自己的文件或資料**，而且不是公開網路上隨手可得的（→ S9 檢索與 RAG、🔒 間接 injection）
- **有一些可以「做事」的動作**，例如建立、修改、寄送（→ S10 工具與 MCP、S12 Agent loop 與 harness、S16 安全與治理）
- **至少可以有 2–3 位使用者**（→ S13 Memory 與個人化、S18 部署與架構的多租戶部署）
- **你自己會實際用它**，這樣才會累積真實的 trace 與回饋（→ [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)）

| 主題範例 | 資料 | 動作 | 使用者 |
|---|---|---|---|
| **筆記助理**（這份路線預設的範例） | 你的筆記、PDF、剪藏的網頁 | 建立筆記、整理標籤、擷取網頁、寫信草稿 | 你和家人或同事 |
| 團隊知識庫問答 | 內部文件、會議紀錄 | 建立工單、更新文件 | 團隊成員 |
| 個人財務助理 | 對帳單、收據 | 分類、建立預算、提醒 | 你和家人 |
| 開發者助理 | 你的 repo、issue、文件 | 開 issue、草擬 PR 說明 | 你和協作者 |

每一題都會寫成「你的系統」，並附一行「以筆記助理為例：……」。不知道選什麼，就用筆記助理。

## 技術棧

不限語言。前端工程師可以用 TypeScript（例如 Vercel AI SDK）寫應用本體，評估與 RAG 實驗用 Python（工具比較多）；全部用其中一種也可以。每題的提示都會列出兩種語言的參考工具。

不寫前端也能走到 A16 安全攻防與治理：從 A6 串流聊天與 trace 到 A16 的介面都可以用 Gradio、Chainlit、Streamlit 或 CLI，串流、停止與回饋的驗收標準不變（做法見 [A6 串流聊天與 trace 的提示](/stages/s06-llm-api/#進階系統專案-a6開始你的系統)）。S17 產品與 AI UX 的必做題也有不寫前端的版本；只有 A17 完整前端這一題需要真正的前端，那一題的提示有入門建議。後端或資料工程師可以先看[怎麼使用這份路線](/guide/how-to-use/#誰適合)裡的建議。

## 每一章長出什麼

| 步驟 | 章 | 你的系統長出什麼 |
|---|---|---|
| A6 串流聊天與 trace | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | 串流聊天介面（網頁、Gradio、Chainlit、Streamlit 或 CLI 都可以）、每次呼叫都有 trace 與成本紀錄、回饋按鈕、可切換雲端與本地模型；每個請求帶使用者 ID（設定檔或 header，不做登入） |
| A7 structured output 與 workflow | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | 穩定的 structured output 與一個固定 workflow；prompt 有版本 |
| A8 錯誤分析與 golden set | [S8 Eval 方法論](/stages/s08-evals/) | 從真實 trace 做錯誤分析，長出 golden set 與經人工校準的 judge |
| A9 附引用的 RAG | [S9 檢索與 RAG](/stages/s09-rag/) | RAG 加引用；檢索與生成分開評估；依使用者 ID 過濾檢索並測跨使用者隔離；🔒 文件內嵌 injection 測試 |
| A10 工具組與 MCP server | [S10 工具與 MCP](/stages/s10-tools-mcp/) | 工具組與帶認證的 MCP server；每個工具有風險等級（例如寄信拆成「建立草稿」＝中、「寄出」＝高）；🔒 egress 白名單 |
| A11 context builder | [S11 Context engineering](/stages/s11-context-engineering/) | Context builder：預算、排序、快取 |
| A12 手寫 harness | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | 手寫 harness：權限、hooks、可暫停恢復、人工介入、compaction、skills |
| A13 分層記憶 | [S13 Memory 與個人化](/stages/s13-memory/) | 先備一個 pairwise judge（← S8 Eval 方法論）；分層記憶與個人化；使用者可檢視與刪除記憶；用 A6 串流聊天與 trace 以來就帶著的使用者 ID 測跨使用者隔離；🔒 memory poisoning |
| A14 agent eval 與最佳化 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | Trajectory eval、模擬使用者、prompt 最佳化、harness ablation；選做 router 蒸餾時再補路由紀錄 |
| A15 multi-agent 實驗 | [S15 Multi-agent](/stages/s15-multi-agent/) | 試做 multi-agent，只有在評估上勝過單一 agent 才保留 |
| A16 安全攻防與治理 | [S16 安全與治理](/stages/s16-security/) | Trifecta 稽核、威脅模型、重現並修補一次 injection、guardrail 誤報 / 漏報、資料治理說明 |
| A17 完整前端 | [S17 產品與 AI UX](/stages/s17-ai-ux/) | 完整前端：工具呼叫呈現、可中斷、引用、不確定性（先備逐筆回答的不確定性訊號，← S8 Eval 方法論）、回饋 |
| A18 多使用者部署 | [S18 部署與架構](/stages/s18-deployment/) | 多使用者部署：把 A6 串流聊天與 trace 以來就帶著的使用者 ID 換成正式身分驗證；模型路由、負載測試、eval 把關的發布流程、canary 與回滾演練、成本儀表板 |
| A19 畢業專題 | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) | 畢業專題（進階題）：延伸成常駐 agent，並交出完整的工程證據 |

## 與模型專案的橋接

- **A9 附引用的 RAG**：微調 embedding 模型（用到 [S4 Post-training 與 reasoning](/stages/s04-post-training/) 的微調技術）
- **A14 agent eval 與最佳化（選做橋接）**：從自己的 trace 蒸餾出小型 router 或分類器
- **A18 多使用者部署**：自架模型與 API 的比較，拿 [M5 迷你推論伺服器](/projects/model-thread/) 的實測數字來對照

## 成本

- 大部分步驟即使用付費 API，每章花費也不高；每題會標出估計，並盡量提供本地模型（Ollama、llama.cpp、MLX）的替代方案。
- 從 A6 串流聊天與 trace 起就記錄每次呼叫的成本，你會隨時知道自己花了多少。
