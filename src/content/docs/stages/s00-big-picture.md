---
title: S0 全局地圖
head:
  - tag: title
    content: AI 系統怎麼運作？AI/LLM 全局地圖（S0）｜Token2Agent
description: 看懂一個 AI 系統由哪些元件組成：使用者的一句話怎麼經過模型與程式變成答案、最小的 agent 迴圈怎麼運作，以及什麼時候該用單次呼叫、workflow 或 agent。
sidebar:
  order: 0
  label: S0 全局地圖
next:
  link: /guide/app-first/
  label: 應用路線與模型速成
---

:::note[這一章]
**前置**：無　**銜接**：多數人 → [模型速成](/guide/app-first/#模型速成) → [S6 LLM API 與應用基本功](/stages/s06-llm-api/)；想懂模型內部 → [S1 神經網路基礎](/stages/s01-neural-networks/)（Part II 模型原理，選修的深入路線）

這一章沒有進階題；選做的進階題從 S1 神經網路基礎、S6 LLM API 與應用基本功開始，見〈接下來怎麼走〉。
:::

:::tip[理解路線重點]
- AI 產品是模型加上檢索、工具、記憶等元件，每個元件補模型的一個缺口。
- 模型只會輸出文字；搜尋、存檔、寄信都是程式替它執行的。
- 下一步能事先決定就用固定流程，決定不了時才值得做 agent。
:::

## 在做什麼

一個 AI 產品背後不只有模型。這一章畫出整張地圖：AI 系統由哪些元件組成、使用者的一句話怎麼一步步變成答案、workflow 和 agent 差在哪、什麼時候根本不該做 agent，最後看一個不到 200 行的完整 agent（mini-SWE-agent）怎麼運作。後面十九章都在打開這張地圖的某一塊，所以它排在最前面；讀完也會知道自己該走哪條路線。

## 學完能

- 能說出一個 request 從使用者輸入到最後答案經過哪幾步，哪幾步是模型在計算、哪幾步是程式在執行。（講義與自我檢查）
- 能用自己的話說明一個最小的 agent 迴圈怎麼運作、會在什麼情況停下來。（講義與自我檢查）
- 為筆記助理的一個請求畫出完整路徑圖，並標出後面哪一章在講哪一步。（必做）
- 給定一個需求，判斷它該用單次呼叫、固定 workflow，還是 agent，並說出理由。（必做）
- 對照 mini-SWE-agent 的原始碼，逐段說明它在做什麼、什麼時候停下來。（選做，需要 Python 基礎）

## 講義

先認識三個詞，後面會一直用到：

- **大型語言模型**（LLM）：一個訓練好的程式。給它一段文字，它預測接下來最可能出現的文字，一小段一小段往下寫。各家聊天助理背後都是 LLM。
- **Token**：模型讀寫文字的單位，大約是英文單字的一部分，或一兩個中文字。計價、速度、長度上限都以 token 計算（→ [模型速成](/guide/app-first/#token-與斷詞)，深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)）。
- **Context**：每次送進模型的整段輸入。模型不會記得上一次呼叫，它只看得到這次 context 裡的內容；context 能放的 token 數有上限，叫上下文視窗（context window）。

整章用同一個例子：**筆記助理**。它保存使用者的 Markdown 筆記，能回答關於筆記的問題、搜尋筆記、建立新筆記。Part III 到 Part VII（S6–S19）的講義也用它當範例，一路從這裡的雛形長成完整系統。

### ★ 為什麼不只用模型？

好用的 AI 產品很少是「一個模型直接回答」，而是模型加上其他元件組成的系統。

**為什麼不只用模型。** 單獨一個 LLM 有三個先天限制：它只知道訓練時看過的資料，看不到使用者的筆記；它只能輸出文字，不能自己去搜尋或存檔；它每次呼叫都從零開始，不記得使用者上週說過什麼。直接問它「我上週的會議結論是什麼」，它只能說不知道，或編一個看似合理的答案（這叫幻覺）。

**怎麼補。** 在模型外面加上程式與元件，各補一個缺口。柏克萊 BAIR 的文章把這種系統叫做**複合式 AI 系統**（compound AI system），並指出品質的進步越來越多來自系統設計，而不只是換更大的模型。Anthropic 把最基本的積木叫做 **augmented LLM**：一個能檢索、能呼叫工具、能存取記憶的模型。

筆記助理的元件大致如下（「深入章節」欄的 S 加數字是章號，代號怎麼讀見[怎麼使用這份路線](/guide/how-to-use/#代號怎麼讀)）：

| 元件 | 在筆記助理裡做什麼 | 深入章節 |
|---|---|---|
| 模型 | 理解問題、決定要做什麼、寫出回答 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（怎麼呼叫）；模型內部是 Part II 模型原理（S1–S5） |
| 提示詞與 context | 告訴模型它的角色和規則，並放進這次要用的資料 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S11 Context engineering](/stages/s11-context-engineering/) |
| 檢索 | 從約 200 篇筆記裡找出和問題相關的幾篇 | [S9 檢索與 RAG](/stages/s09-rag/) |
| 工具 | `notes_search`、`notes_create` 這類模型可以要求執行的動作 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S10 工具與 MCP](/stages/s10-tools-mcp/) |
| 記憶 | 記住「回答用條列、最多三點」這類使用者偏好 | [S13 Memory 與個人化](/stages/s13-memory/) |
| 控制迴圈的程式 | 呼叫模型、執行工具、決定何時停下 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| 介面 | 串流顯示回答、寄信前讓使用者確認草稿 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| 評估、安全與上線 | 確認回答正確、防範攻擊、記錄成本與延遲 | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S16 安全與治理](/stages/s16-security/)、[S18 部署與架構](/stages/s18-deployment/) |

**容易誤會：元件越多越好。** 每加一個元件，就多一處可能出錯，也多一份延遲與成本。元件是用來補具體缺口的：如果筆記助理只需要把使用者貼上的一段文字改寫成條列，一次模型呼叫就夠了，不需要檢索或工具。

### ★ 一句話怎麼變成答案？

使用者按下送出之後，一個請求（request）會經過固定的幾個步驟；模型要用工具時，中間幾步會重複繞圈。

下表是一輪的步驟，每一步後面都有一章專門講它：

| 步驟 | 發生什麼事 | 深入章節 |
|---|---|---|
| 1. 組 context | 系統提示詞、對話歷史、檢索結果、工具說明組合成一段輸入 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S11 Context engineering](/stages/s11-context-engineering/) |
| 2. 斷詞（tokenize） | 文字被切成 token，變成一串整數 | [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| 3. Prefill | 模型一次讀完整段輸入，並把已讀過的 token 的中間結果存起來（KV cache），之後不用重算 | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/) |
| 4. Decode | 模型一次產生一個 token，每一步依 sampling 設定挑出下一個 | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/) |
| 5. 工具呼叫 | 輸出是一個結構化的工具呼叫，程式去執行它 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S10 工具與 MCP](/stages/s10-tools-mcp/) |
| 6. 回填 context | 工具結果放回 context，回到步驟 3，直到模型決定回答 | [S11 Context engineering](/stages/s11-context-engineering/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| 7. 回應與紀錄 | 串流給使用者，同時記錄 trace、成本、延遲 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S17 產品與 AI UX](/stages/s17-ai-ux/)、[S18 部署與架構](/stages/s18-deployment/) |

表中幾個詞的意思：**系統提示詞**是開發者寫給模型的固定說明（「你是筆記助理，只根據使用者的筆記回答」）；**串流**是邊產生邊顯示，使用者不必等整段寫完；**trace** 是這次請求每一步的紀錄，出問題時用來回頭查。

**步驟 3 和 4 是模型真正在計算的地方，兩者性質不同。** Prefill 處理的是已經知道的輸入，所有 token 可以同時算，所以輸入有幾千個 token 也很快。Decode 產生的是還不存在的輸出：第 5 個 token 要等第 4 個產生之後才能算，只能一個一個來，所以輸出越長，等得越久。每產生一個 token，模型會給出所有候選 token 的機率，sampling 設定（例如 temperature）決定怎麼從中挑一個（→ [模型速成](/guide/app-first/#sampling-與-temperature)，深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/)）。

**步驟 5 和 6 讓模型能「做事」。** 開發者事先在 context 裡列出工具的名稱、用途與參數。模型想用工具時，輸出的不是給人看的句子，而是一段固定格式的文字，內容相當於 `notes_search(query="會議", range="上週")`。程式認出這段格式、真正去執行，再把結果放回 context，模型下一輪就看得到。

用筆記助理走一次。使用者說：「找出我上週的會議筆記，整理成三點摘要，存成一篇新筆記。」下面的 token 數是示意：

| 輪次 | 送進模型的輸入（prefill） | 模型的輸出（decode） | 程式做什麼 |
|---|---|---|---|
| 1 | 系統提示詞 800 + 工具說明 400 + 使用者訊息 30 = 1,230 token | 呼叫 `notes_search`，25 token | 搜尋，找到 3 篇筆記，共 2,400 token |
| 2 | 1,230 + 25 + 2,400 = 3,655 token | 呼叫 `notes_create`，內容是三點摘要，200 token | 存檔，回傳「已建立」，20 token |
| 3 | 3,655 + 200 + 20 = 3,875 token | 回答「已整理並存成〈上週會議摘要〉」，60 token | 串流給使用者，記錄這次請求 |

從這張表可以看出兩件事。第一，一句話的請求，模型被呼叫了 3 次。第二，每一輪都把之前的全部內容重新送一次，所以輸入加起來是 1,230 + 3,655 + 3,875 = 8,760 token，輸出只有 25 + 200 + 60 = 285 token。控制每一輪放進什麼，是 S11 Context engineering 的主題。

<details class="deep">
<summary>深入一點：這個請求花多少錢</summary>

API 依 token 數計價，輸出的單價通常是輸入的好幾倍（原因是上面說的 decode 只能一個一個來，→ [S5 推論與 serving](/stages/s05-inference/)）。假設輸入每百萬 token 3 美元、輸出每百萬 token 15 美元（示意，不是任何廠商的報價）：

- 輸入：8,760 × 3 ÷ 1,000,000 ≈ 0.0263 美元
- 輸出：285 × 15 ÷ 1,000,000 ≈ 0.0043 美元
- 合計約 0.031 美元

輸出單價是輸入的 5 倍，花費卻主要來自輸入，因為 agent 每一輪都重送整段 context。兩個常見對策：讓每一輪的開頭（系統提示詞、工具說明）保持不變，讓 API 的 prompt caching 重用這段已算過的結果、以較低單價計費（→ [S11 Context engineering](/stages/s11-context-engineering/)）；以及不要把整篇工具結果原封不動塞回去（→ [S11 Context engineering](/stages/s11-context-engineering/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)）。注意 KV cache 是「一次呼叫之內」不重算已讀過的 token；prompt caching 是「跨呼叫」重用相同的開頭，兩者相關但不同。

</details>

模型本身為什麼能做到步驟 3–4，是 S1 神經網路基礎到 S4 Post-training 與 reasoning 的內容；整個迴圈怎麼評估、怎麼防攻擊、怎麼上線，是後面幾章的內容（[S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S16 安全與治理](/stages/s16-security/)、[S18 部署與架構](/stages/s18-deployment/)）。表外還有三章：

- **S13 Memory 與個人化**：步驟 1 組 context 時讀取使用者的長期記憶，步驟 7 之後把值得記住的事寫回去。
- **S15 Multi-agent**：步驟 5 呼叫的「工具」也可以是另一個 agent，由它跑自己的一整條路徑再回報結果。
- **S19 真實 agent 系統與畢業專題**：把整條路徑組成一個長時間運作的真實系統，不對應單一步驟。

**容易誤會：模型自己去搜尋了。** 模型只會輸出文字；搜尋、存檔、寄信都是程式執行的。所以模型能做什麼，取決於開發者給它哪些工具，安全把關也落在程式這一側（→ [S10 工具與 MCP](/stages/s10-tools-mcp/)、[S16 安全與治理](/stages/s16-security/)）。

### ★ 下一步該由誰決定？

用模型和工具組系統有兩種方式，差別在「下一步由誰決定」。

**Workflow** 的步驟由程式事先寫好，模型只負責每一步的內容。**Agent** 的下一步由模型自己決定，程式只負責執行與回填結果（見[術語表](/reference/glossary/)）。上一節的步驟 6「回到步驟 3」就是 agent 的迴圈：繞幾圈、每圈用哪個工具，都由模型決定。

以筆記助理的三個需求為例：

| 需求 | 做法 | 誰決定步驟 |
|---|---|---|
| 「把這段筆記改寫成條列」 | 單次呼叫：一次 prompt、一次回答 | 只有一步，不需要決定 |
| 「每天早上 8 點，把昨天新增的筆記整理成摘要」 | Workflow：程式撈出昨天的筆記 → 呼叫模型摘要 → 存檔，每天都是這三步 | 程式 |
| 「幫我準備明天和設計團隊的會議」 | Agent：模型可能先搜尋「設計團隊」，看到上次提到預算，再搜尋「預算」，最後整理成清單；要搜幾次、搜什麼，事先寫不死 | 模型 |

兩者各有代價。Workflow 可預測、好測試、成本固定，但遇到沒寫進流程的情況就無法處理。Agent 能走事先想不到的路徑，代價是延遲和成本較高、不容易預測，而且錯誤會累積：第一步搜錯關鍵字，後面整理得再好，結論也是錯的。

**容易誤會：agent 比 workflow 先進。** 兩者不是好壞之分，而是「把多少控制權交給模型」的取捨。能用 workflow 穩定完成的事，改成 agent 通常只會更慢、更貴、更難除錯。實際系統也常混用，例如 workflow 中的某一步交給一個小 agent。

<details class="deep">
<summary>深入一點：Anthropic 整理的五種 workflow</summary>

Anthropic〈Building effective AI agents〉把常見的 workflow 整理成五種，現在記得名稱即可，[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)會細講：

- **Prompt chaining**：上一步的輸出當下一步的輸入，例如先列大綱、再依大綱寫全文。
- **Routing**：先分類，再交給不同的處理流程，例如把使用者訊息分成「問問題」「新增筆記」兩條路。
- **Parallelization**：同時跑幾個呼叫再合併結果。
- **Orchestrator-workers**：由一個模型把工作拆開，分給其他呼叫完成。
- **Evaluator-optimizer**：一個呼叫產生結果，另一個評分並要求修改，反覆幾輪。

</details>

### ★ 什麼時候該做 agent？

Agent 的能力可以分級；分級的重點是提醒你，多數需求停在低等級就夠了。

Google / Kaggle 的〈Introduction to Agents〉白皮書把 agent 系統分成五級。對照筆記助理：

| 等級 | 白皮書的描述 | 筆記助理的樣子 |
|---|---|---|
| Level 0 | 只有模型、沒有工具的推理系統 | 只能憑訓練資料回答，看不到使用者的筆記 |
| Level 1 | 接上工具，能查即時資訊 | 能呼叫 `notes_search` 查筆記再回答 |
| Level 2 | 能為多步驟任務做規劃、主動管理 context | 能完成「把上週的會議整理成週報」這類多步驟任務，並挑出該放進 context 的筆記 |
| Level 3 | 多個 agent 分工合作 | 一個負責搜尋、一個寫草稿、一個檢查引用（→ [S15 Multi-agent](/stages/s15-multi-agent/)） |
| Level 4 | 能自己補上缺少的工具或 agent | 發現沒有「匯出 PDF」的工具時，自己做一個加進來 |

**什麼時候值得做 agent。** OpenAI〈A Practical Guide to Building Agents〉列了三種情況：

1. 決策複雜，需要判斷而非規則。
2. 規則多到難以維護。
3. 大量依賴非結構化資料（文件、對話）。

Anthropic〈Building effective AI agents〉的建議更直接：先找最簡單的解法，單次呼叫加檢索夠用就不要做 agent；agent 用延遲和成本換彈性，而且錯誤會累積。

把兩份建議合起來，判斷順序是：

1. 單次呼叫（必要時加上檢索）能不能做到？能就停在這裡。
2. 步驟能不能事先寫死？能就用 workflow。
3. 步驟真的無法事先決定，而且符合上面三種情況之一，才考慮 agent。

套到筆記助理：「每天摘要昨天的筆記」步驟固定，三種情況都不符合，用 workflow。「準備明天的會議」要在一堆非結構化的筆記裡判斷什麼相關、下一步搜什麼，符合第 1、3 種，才是 agent 的好題目。

**容易誤會：流程長或規則多就該用 agent。** 一個有 10 個步驟、每步都寫得清楚的流程，仍然是 workflow；規則少而明確時，直接寫成程式最可靠。要看的是「下一步能不能事先決定」，不是步驟多寡。

### ★ 一個 agent 的骨架多小？

一個能修程式 bug 的完整 agent，核心可以只有一百多行，就是上面那個迴圈。

**為什麼讀它。** 讀過之後會發現 agent 的骨架真的很小。後面要學的 harness（包住模型、讓 agent 可靠運作的那層程式）元件，例如權限、checkpoint、compaction（→ S12 Agent loop 與 harness），全都是在這個迴圈外面加東西。

**它長什麼樣。** [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent) 是 SWE-bench 團隊寫的極簡 coding agent（SWE-bench 是一組用真實 GitHub issue，也就是開源專案上回報問題的單子，測試模型能不能修好程式的評測題）。README 說 agent 類別約 100 行；目前的 `default.py` 不到 200 行，多出來的是設定與序列化。它的設計有三個特點：

- **只有一個工具**：執行 bash 指令（bash 是在終端機裡下指令操作檔案的方式）。每個動作用獨立的 `subprocess.run` 執行。
- **對話歷史完全線性**：每一步只是把新訊息接在後面，不刪改舊內容。
- **主迴圈很單純**：把歷史送給模型 →（由 model 層）從回應中取出指令 → 由 environment 執行 → 把輸出接回歷史，再重來。

它會在這些情況停下：模型送出約定好的完成指令；觸發步數或成本上限；觸發實際執行時間（wall-clock）上限；模型連續太多次沒有照格式輸出指令。

用一個示意的任務走一次：「`test_parse_date` 測試失敗，修好它。」指令本身看不懂沒關係，知道它們依序在找檔、讀檔、改檔、跑測試即可。

1. 模型輸出 `grep -rn "def parse_date" src/`；執行結果「`src/utils/date.py:12`」接回歷史。
2. 模型輸出 `sed -n '1,40p' src/utils/date.py`，讀到函式內容，接回歷史。
3. 模型輸出一行修改檔案的指令，執行結果接回歷史。
4. 模型輸出 `python -m pytest tests/test_date.py`，結果「1 passed」接回歷史。
5. 模型送出完成指令，迴圈結束。

每一圈都對應路徑表的步驟 1–6：歷史就是 context，bash 指令就是工具呼叫，指令輸出就是回填的結果。

**只有 bash 為什麼夠用。** bash 本身就能讀檔、搜尋、編輯、跑測試，等於一個通用工具。代價有兩個：沒有持續的 shell 狀態（`cd`、環境變數不會保留到下一步）；也沒有 SWE-agent 那種專為模型設計的檢視與編輯指令（→ [S10 工具與 MCP](/stages/s10-tools-mcp/) 的 ACI）。

**容易誤會：做 agent 需要龐大的框架。** 迴圈本身很小。真實產品的複雜度來自迴圈外面的東西：哪些指令要先問使用者、跑到一半當掉怎麼接續、歷史太長怎麼壓縮，這些是 S12 Agent loop 與 harness 的內容。

<details class="deep">
<summary>準備動手做：選做題讀 default.py 前要知道的事</summary>

- **檔案分工**：`agents/default.py` 是 agent 類別，負責迴圈與停止判斷；解析模型回應、取出指令的程式在 model 層；真正執行指令的是 environment。看到 `message["extra"]["actions"]` 時，知道它是 model 層解析好放進來的即可。
- **每步獨立執行的後果**：因為 `cd` 不會保留，模型每次都得在同一行指令裡先切換目錄再執行。好處是每一步互不干擾、容易重現。
- **線性歷史的後果**：整段歷史就是完整的紀錄，容易存檔、重播與除錯；但每一步都讓 context 變長，任務一長就會碰到上一節算過的成本問題，這正是 S12 Agent loop 與 harness 裡 compaction 要解決的事。

</details>

### 接下來怎麼走

讀完這一章之後，依目標選一條路：

| 你的目標 | 路線 | 說明 |
|---|---|---|
| 把 LLM 接進產品、做出 AI 應用或 agent（多數人） | S0 全局地圖 → [模型速成](/guide/app-first/#模型速成) → [S6 LLM API 與應用基本功](/stages/s06-llm-api/) → … → [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) | 模型速成用十個短主題講完做應用最少要知道的模型知識。應用的 14 章（S6–S19）不需要 Part II 模型原理（S1–S5）；用到模型概念時，會先連回模型速成，再標出「深入：Sn 章名」 |
| 想懂模型內部怎麼運作，或要研究、訓練模型、做推論基礎設施 | S0 全局地圖 → [Part II 模型原理（S1–S5）](/stages/s01-neural-networks/) → 應用的 14 章（S6–S19） | Part II 模型原理（S1–S5）由下往上講神經網路、Transformer、預訓練、後訓練、推論，比較底層、用到較多數學，是選修的深入路線 |
| 先看懂 AI 系統在做什麼，暫時不寫程式 | 理解路線：和第一條同樣的順序 | 每章讀講義、做「先試一下」與自我檢查，跳過要寫程式的題目；見[怎麼使用這份路線](/guide/how-to-use/#先選路線) |

不確定就走第一條。走到一半想知道「為什麼」時，再回頭讀 Part II 模型原理的對應章節；[應用路線頁](/guide/app-first/)說明什麼時候值得讀哪一章。

每一章的實作分兩種。**必做題**是主線，搭配講義就能完成；**進階題**可以不做，在淺顯模式下收合起來。標成「選做」的小題（例如本章的原始碼閱讀）同樣可以跳過。進階題串成兩個專案：**系統專案**（A6–A19，[代號說明](/guide/how-to-use/#代號怎麼讀)）從 S6 LLM API 與應用基本功開始，一章一章做出你自己的 AI 應用；**模型專案**（M1–M5）在 Part II 模型原理（S1–S5）親手訓練小模型。

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

1. 回到上面筆記助理的三輪表格。如果第 1 輪的搜尋只找到 1 篇筆記、共 600 token，第 2 輪送進模型的輸入是多少 token？

   <details class="hint">
   <summary>對照答案</summary>

   1,230 + 25 + 600 = 1,855 token。每一輪的輸入都是「上一輪的輸入 + 模型上一輪的輸出 + 工具結果」，所以工具結果越長，後面每一輪都跟著變長。

   </details>

2. 「使用者每新增一篇筆記，就自動加上 3 個標籤」該用單次呼叫、workflow 還是 agent？

   <details class="hint">
   <summary>對照答案</summary>

   Workflow。步驟固定（新增筆記 → 呼叫模型產生標籤 → 存檔），由程式決定；模型只負責「標籤是什麼」這一步的內容，不需要決定下一步做什麼。

   </details>

### 必做：畫出 request 路徑並判斷該不該做 agent

**目標**：用一張圖和三個判斷，證明你看得懂 AI 系統的全貌，也知道什麼時候該做 agent。這題不需要讀或寫程式。

**步驟**
1. 選筆記助理的一個請求（例如「把我這週的讀書筆記整理成一份待辦清單，存成新筆記」），畫出它的完整路徑。至少包含上表的 7 個步驟，每個方框標上對應的章號。
2. 在圖上用另一種顏色標出：哪些步驟由程式決定、哪些由模型決定。這就是 workflow 與 agent 的分界。
3. 寫三個需求情境（例如「每天把信件摘要寄給我」「幫我修這個 bug」「回答公司 FAQ」），分別判斷該用單次呼叫、workflow 還是 agent，各寫兩三句理由。

**驗收**
- 路徑圖至少 7 個步驟，每個步驟都標上上表的對應章號；圖旁另外說明下面這幾章分別作用在哪一段（依[一句話怎麼變成答案？](#-一句話怎麼變成答案)表格後「表外還有三章」那段說明）：
  - S1 神經網路基礎到 S4 Post-training 與 reasoning
  - S8 Eval 方法論
  - S13 Memory 與個人化到 S16 安全與治理
  - S19 真實 agent 系統與畢業專題
- 三個情境的判斷都引用了「何時該做 agent」的條件之一。

**提示**
- 畫圖可以用紙筆、Excalidraw 或 Mermaid，TypeScript 和 Python 讀者做法相同。
- 卡住時：
  - 重讀：[一句話怎麼變成答案？](#-一句話怎麼變成答案)、[什麼時候該做 agent？](#-什麼時候該做-agent)
  - 延伸：Anthropic〈Building effective AI agents〉的「Building blocks, workflows, and agents」段

#### 選做：對照 mini-SWE-agent 原始碼（需要 Python 基礎）

不會 Python 可以跳過，不影響後面任何一章。

**步驟**
1. 打開 mini-SWE-agent 的 [agent 類別](https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/agents/default.py)，為每個方法寫一句「它做什麼」，並把主迴圈的每一步對應回你圖上的步驟。解析模型回應、取出指令的程式不在這個檔案裡，而在 model 層；看到 `message["extra"]["actions"]` 時知道它從哪來即可。
2. 找出迴圈的所有停止條件，以及執行指令失敗時會發生什麼。

**驗收**
- mini-SWE-agent 的每個方法都有一句說明，至少列出 3 種停止條件（例如完成指令、步數或成本上限、連續格式錯誤）。

**提示**
- 讀之前先看[一個 agent 的骨架多小？](#-一個-agent-的骨架多小)和其中的「準備動手做」。
- 想實際跑 mini-SWE-agent 的話，需要一組模型 API key，費用通常在幾分錢等級；不跑也能完成這題。

## 自我檢查

1. workflow 和 agent 的差別是什麼？為什麼「agent 比較先進」是錯誤的說法？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：差別在「下一步由程式還是模型決定」。**常見錯法**：把差別說成步驟多寡或聰明程度；兩者是控制權的取捨，不是好壞。**回讀**：[下一步該由誰決定？](#-下一步該由誰決定)

   </details>

2. 一個 request 在 prefill 和 decode 兩個階段分別在做什麼？（細節見[模型速成〈KV cache〉](/guide/app-first/#kv-cache以及為什麼輸出-token-比較貴)；深入：S5 推論與 serving。現在說出大意即可。）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：prefill 一次讀完已知的輸入、可以同時算；decode 一次產生一個 token、只能依序來。**常見錯法**：把兩者都想成逐字處理；只有 decode 必須一個一個來。**回讀**：[一句話怎麼變成答案？](#-一句話怎麼變成答案)

   </details>

3. mini-SWE-agent 只有 bash 一個工具，為什麼還能解很多程式問題？這個設計放棄了什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：bash 能讀檔、搜尋、編輯、跑測試，等於通用工具。**常見錯法**：只答優點；要說出放棄的兩件事：持續的 shell 狀態，以及專為模型設計的檢視與編輯指令。**回讀**：[一個 agent 的骨架多小？](#-一個-agent-的骨架多小)

   </details>

4. 情境題：主管想做一個「自動處理退款」的 agent，退款規則有 5 條、都寫得很清楚。你會建議做 agent 嗎？為什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：規則少而明確、下一步能事先決定，寫成程式或 workflow 最可靠。**常見錯法**：因為「自動處理」或涉及判斷就選 agent。**回讀**：[什麼時候該做 agent？](#-什麼時候該做-agent)

   </details>

5. 不看講義，用筆記助理的請求「找出上週提到預算的筆記，回答預算是多少」想一次：為什麼模型第 2 次被呼叫時的輸入比第 1 次長？多出來的是哪些內容？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：每一輪都重送完整 context，第 2 次的輸入多了第 1 次的工具呼叫與搜尋結果。**常見錯法**：以為模型記得上一輪，所以只送新內容。**回讀**：[一句話怎麼變成答案？](#-一句話怎麼變成答案)

   </details>

6. 單獨一個 LLM 有哪三個先天限制？筆記助理分別用哪個元件補上？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：看不到使用者的資料（檢索）、只能輸出文字（工具）、不記得上次對話（記憶）。**常見錯法**：說「換更大的模型」就能補；這三個缺口要靠模型外的元件。**回讀**：[為什麼不只用模型？](#-為什麼不只用模型)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看原文、或想找更多例子的人，都不是必讀。

### 工程指南與白皮書

- [Anthropic: Building effective AI agents](https://www.anthropic.com/research/building-effective-agents)（2024-12-19）— augmented LLM、五種 workflow 與「何時不用 agent」的原文，每種 workflow 都附了使用情境。
- [Kaggle: Introduction to Agents](https://www.kaggle.com/whitepaper-introduction-to-agents)（2025-11）— agent 的組成（模型、工具、編排層）與 Level 0–4 分級的原文。偏 Google 生態，產品段可略過。
- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — 「何時該做 agent」三個條件的出處，另有 guardrail 與編排模式的實務建議。

### 觀念與綜述

- [BAIR: The Shift from Models to Compound AI Systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/)（2024-02-18）— 為什麼系統設計比單一模型更重要，附了多個產品的實例。
- [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/)（2023-06-23）— planning、memory、tool use 的經典整理；部分例子已過時，但分類仍好用。
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — agent 評估只看準確率、不看成本的問題；先建立懷疑精神，[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)會再用到。
- [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/)（2024-06）— 讀 Strategic 部分，看實際做產品的團隊怎麼取捨。

### 課程與地圖

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — 第 1 講投影片，整門課的地圖。
- [roadmap.sh AI Engineer](https://roadmap.sh/ai-engineer) — 拿來檢查有沒有漏掉的主題，不適合當教材。

### 程式

- [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) 的其他檔案：environment 與 model 的實作，之後自己寫 harness 時（→ S12 Agent loop 與 harness）可以回來參考。

### 中文資源

- [台大 李宏毅 Introduction to GenAI and ML 2025 秋](https://speech.ee.ntu.edu.tw/~hylee/GenAI-ML/2025-fall.php) — 繁中；第一講的整體介紹。
- [台大 李宏毅 生成式 AI 導論 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php) — 繁中；由上而下講生成式 AI 的原理，適合當整條 Part II 模型原理的預習。
- [RUC《大语言模型》](https://llmbook-zh.github.io/) — 簡中；第 1–2 章的發展脈絡與概覽。

</section>
