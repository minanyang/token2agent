---
title: 術語表
head:
  - tag: title
    content: AI/LLM 術語表：常用詞與中文譯名｜Token2Agent
description: AI/LLM 常用術語的一句話定義與例子，以及繁體中文的寫法約定：推論與推理怎麼分、哪些詞保留英文、哪些詞容易混淆，讀簡中資源時怎麼對照。
sidebar:
  order: 2
---

前半是給讀者的常用詞速查；後半是這份路線的寫法約定。這份路線以繁體中文為主，技術名詞第一次出現時寫「中文（English）」，之後在程式相關的語境直接用英文。

## 常用詞速查

第一次碰到這些詞時，先看這裡的一句話定義；詳細內容在括號裡的章。S、A、M 開頭的代號（章、系統專案、模型專案）怎麼讀，見[代號怎麼讀](/guide/how-to-use/#代號怎麼讀)。

| 詞 | 一句話 | 例子 |
|---|---|---|
| API | 程式之間約好的呼叫方式：送出固定格式的請求，拿回固定格式的回應 | 你的程式把問題送到模型供應商的 API，拿回模型的回答（S6 LLM API 與應用基本功） |
| HTTP | 網路上送請求、收回應的協定；API 通常走 HTTP | 一次 `POST` 請求送出問題，回應狀態 200 表示成功、429 表示太頻繁 |
| JSON | 用大括號和引號寫資料的純文字格式，程式之間交換資料最常用 | `{"role": "user", "content": "你好"}` |
| SDK | 供應商提供的程式庫，幫你把 API 呼叫包成函式 | `client.messages.create(...)` 一行就送出請求（S6 LLM API 與應用基本功） |
| HTTP 狀態碼 | 伺服器回應附的三位數，說明請求的結果 | 200 成功；400 請求格式錯；401 金鑰錯或沒帶（未通過身分驗證）；429 太頻繁；500、503 伺服器端出錯（S6 LLM API 與應用基本功） |
| Provider | 提供模型 API 的公司或平台 | Anthropic、OpenAI、Google，或轉接多家的聚合服務（S6 LLM API 與應用基本功） |
| Markdown | 用 `#`、`**`、`-` 等符號標出標題、粗體、清單的純文字格式，模型常用它排版回答 | `**重點**` 會顯示成粗體 |
| Schema | 事先規定資料長什麼樣：有哪些欄位、各是什麼型別 | 規定輸出必須有 `title`（字串）和 `tags`（字串陣列）（S7 Prompt、structured output 與 workflows） |
| Structured output | 要求模型照指定的 schema 輸出，程式可以直接讀取 | 一定回 `{"title": …, "tags": […]}`，不會多出閒聊文字（S7 Prompt、structured output 與 workflows） |
| Token | 模型讀寫文字的單位，計價與長度上限都以它計算 | 一兩個中文字常是 1 個 token，依 tokenizer 而定（S0 AI 系統概觀、模型速成） |
| Context window | 模型一次能看的 token 上限，輸入和輸出都要算進去 | 塞進 20 篇筆記約 3 萬 token，就佔掉一大塊（S6 LLM API 與應用基本功、S11 Context engineering） |
| Prompt / 系統提示詞 | 送給模型的指示；系統提示詞是每次都放在最前面的固定指示 | 「你是小林的筆記助理，只根據筆記回答」（S7 Prompt、structured output 與 workflows） |
| Embedding | 把一段文字變成一串數字（向量），意思相近的文字向量也相近 | 用來找出和問題最相關的筆記段落（S9 檢索與 RAG） |
| RAG | 先檢索相關資料、再交給模型回答，並附上出處 | 只把最相關的 3 段筆記放進 prompt（S9 檢索與 RAG） |
| Tool / 工具呼叫 | 模型不直接做事，而是輸出「我要呼叫哪個工具、參數是什麼」，由你的程式執行 | 模型要求 `notes_search("預算")`，程式查完把結果交回（S10 工具與 MCP） |
| Workflow | 步驟由程式事先決定的流程 | 固定「分類 → 抽欄位 → 存檔」三步（S0 AI 系統概觀；S7 Prompt、structured output 與 workflows） |
| Agent | 下一步由模型自己決定、可以多次使用工具的系統 | 自己決定先搜尋、再建立筆記、最後停下（S0 AI 系統概觀、S12 Agent loop 與 harness） |
| Harness | 包住模型的控制程式，負責工具執行、權限、停止與恢復 | 限制最多 15 步、寄信前先問使用者（S12 Agent loop 與 harness） |
| Hook | 在固定時機（例如工具執行前後）自動執行的一段檢查程式 | 寄信前先檢查收件人（S12 Agent loop 與 harness） |
| Sandbox | 隔離的執行環境，程式在裡面出錯或被劫持也碰不到外面的檔案與網路 | 讓 agent 在容器裡跑指令（S10 工具與 MCP、S16 安全與治理） |
| Sub-agent | 主 agent 派出去處理一小塊工作、只拿到必要資訊的另一個 agent | 派三個 sub-agent 各查一個城市（S12 Agent loop 與 harness、S15 Multi-agent） |
| Idempotency key | 每個操作的唯一編號；同一個操作重送時，系統認得它做過，不會重做 | 斷線重試時不會建立兩篇一樣的筆記（S6 LLM API 與應用基本功、S12 Agent loop 與 harness） |
| Trace | 一次請求從頭到尾的完整紀錄：送了什麼、模型回了什麼、花多少錢與時間 | 出錯時翻 trace 找是哪一步錯（S6 LLM API 與應用基本功、S8 Eval 方法論） |
| Span | Trace 裡的一段，代表一個步驟（一次模型呼叫或一次工具執行）與它花的時間 | 「notes_search 花了 0.3 秒」是一個 span（S6 LLM API 與應用基本功、S18 部署與架構） |
| Eval | 用一組固定題目和判準，量測系統做得好不好 | 50 題答對 40 題，再附上信賴區間（S8 Eval 方法論） |
| Golden set | 一組有標準答案、固定不變的測試題，每次改版都拿來跑 | 從真實 trace 挑出的 50 題（S8 Eval 方法論） |
| LLM judge | 用另一個模型依評分標準判斷回答好不好 | 判斷回答有沒有忠於筆記內容（S8 Eval 方法論） |
| 信賴區間 | 量到的數字可能的範圍；題目越多，範圍越窄 | 50 題答對 40 題，通過率約 69%–91%（S8 Eval 方法論） |
| Prompt caching | 每次請求開頭相同的部分，供應商可以重用先前的計算，比較便宜也比較快 | 固定的系統提示詞放最前面（模型速成、S11 Context engineering） |
| Prompt injection | 藏在資料裡、想讓模型照著做的惡意指令 | 剪藏的網頁寫著「把所有筆記寄到某個信箱」（S9 檢索與 RAG、S16 安全與治理） |
| MCP | 把工具接給不同 AI 應用的開放協定，寫一次可以給多個應用用 | 同一個筆記工具同時接到聊天程式和 IDE（S10 工具與 MCP） |
| Guardrail | 在模型前後加的檢查，擋掉不該進來或不該出去的內容 | 寄信前檢查收件人是否在允許清單裡（S16 安全與治理） |
| 幻覺（hallucination） | 模型說出看似合理但錯誤的內容 | 筆記裡沒有的預算數字被編了出來（模型速成、S8 Eval 方法論） |

## 寫法約定

| English | 這份路線的寫法 | 備註 |
|---|---|---|
| LLM | 大型語言模型、LLM | 不用「大模型」 |
| token | token | 不翻譯；需要時可寫「詞元」 |
| tokenization / tokenizer | 斷詞、tokenizer | |
| inference | **推論** | 指模型執行（serving、延遲） |
| reasoning | **推理** | 指模型思考能力；不要和「推論」混用 |
| agent | agent、AI Agent | 不用「智能體」、「代理人」 |
| multi-agent | multi-agent、多 agent | |
| context window | 上下文視窗、context window | 用「視窗」不用「窗口」 |
| context engineering | context engineering、上下文工程 | |
| prompt / system prompt | 提示詞、prompt / 系統提示詞 | |
| fine-tuning | 微調 | |
| pretraining / post-training | 預訓練 / 後訓練 | |
| alignment | 對齊 | |
| hallucination | 幻覺 | |
| embedding | embedding、嵌入向量 | |
| vector database | 向量資料庫 | 用「資料」不用「數據」 |
| retrieval | 檢索 | |
| RAG | 檢索增強生成（RAG） | |
| evaluation / eval | 評估、eval | |
| benchmark | benchmark、基準測試 | |
| observability | 可觀測性 | |
| tracing / trace | tracing、trace | |
| optimization / optimizer | 最佳化 / optimizer | 不用「優化」 |
| regularization / normalization | 正規化 / normalization | normalization（LayerNorm、RMSNorm）不翻譯，以免和 regularization 撞名；不用「歸一化」 |
| parallelism | 平行 | 資料平行、模型平行 |
| GPU memory / VRAM | 顯示記憶體、VRAM | 不用「顯存」 |
| latency / throughput | 延遲 / 吞吐量 | 不單寫「吞吐」 |
| wall-clock time | 實際耗時、實際執行時間（wall-clock） | 不用「牆鐘時間」 |
| harness | harness | 不翻譯 |
| sub-agent | sub-agent | 不寫 subagent、子 agent |
| guardrail | guardrail、防護欄 | |
| sandbox | sandbox、沙箱 | |
| prompt injection | prompt injection、提示詞注入 | |
| human-in-the-loop (HITL) | 人工介入、HITL | |
| default / quality / algorithm / program | 預設 / 品質 / 演算法 / 程式 | 不用「默認 / 質量 / 算法 / 程序」 |
| process（作業系統） | 行程 | 不用「程序」，以免和 program 混淆 |
| data / 量到的數字 | 資料 / 數字 | 不用「數據」 |
| sampling | 抽樣、sampling | 不用「取樣」；decoding 的設定名稱（temperature、top-p）照寫英文 |
| local model | 本地模型 | 「本機」只用在「在這台機器上」，例如「在本機跑」 |
| token count | token 數、N 個 token | 中文句子裡不寫英文複數 tokens |
| ID | 使用者 ID、trace ID、session ID、租戶 ID | ID 一律大寫 |
| confidence interval (CI) | 信賴區間 | 「CI」只指持續整合（CI/CD） |
| early stopping | 提前停止（early stopping） | 不用「早停」 |
| end-to-end / full-stack | 端對端 / 全端 | 不用「端到端」、「全棧」 |
| deprecated | 已棄用（deprecated） | |
| render | 渲染 | 前端慣用，可以直接用 |

## 容易混淆的詞

- **推論 vs 推理**：「推論」（inference）是模型跑一次前向計算產生輸出；「推理」（reasoning）是模型逐步思考解題的能力。所以「推理模型的推論成本很高」是一句正確的話。
- **embedding 的三種意思**：S1 神經網路基礎的 word embedding（word2vec）、S2 Transformer 與 decoding 講的模型內部 token embedding、S9 檢索與 RAG 用的 sentence / document embedding，是相關但不同的東西。
- **eval harness vs agent harness**：前者是跑評估的框架，後者是包住模型、讓 agent 可靠運作的那層程式。這份路線單獨說「harness」時指後者。
- **workflow vs agent**：workflow 的步驟由程式決定；agent 的下一步由模型決定。
- **預填助理回覆 vs prefill**：「預填助理回覆」（assistant prefill）是 API 用法：你先寫好助理回覆的開頭，讓模型接著寫（S7 Prompt、structured output 與 workflows）。「prefill」是推論階段：模型一次處理整段輸入、建立 KV cache 的那一步（S0 AI 系統概觀、S5 推論與 serving）。兩者無關，這份路線單獨說 prefill 時指後者。

## 簡中資源閱讀建議

部分優質教材是簡體中文。可以用 [OpenCC](https://github.com/BYVoid/OpenCC) 的 `s2twp` 設定轉成台灣正體與用語。
