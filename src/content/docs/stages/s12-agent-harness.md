---
title: S12 Agent loop 與 harness
head:
  - tag: title
    content: AI agent 怎麼做？手寫 agent loop（S12）｜Token2Agent
description: AI agent 怎麼做：不用框架，手寫「模型決定、程式執行、結果回填」的 agent loop，再加上權限、停止條件、錯誤處理與長任務的 context 管理，並用多次試跑判斷改動有沒有用。
sidebar:
  order: 12
  label: S12 Agent loop 與 harness
---

:::note[這一章]
**前置**：[S8 Evals 方法論](/stages/s08-evals/)、[S10 工具與 MCP](/stages/s10-tools-mcp/)、[S11 Context engineering](/stages/s11-context-engineering/)；模型知識見 [模型速成](/guide/app-first/#模型速成)

**銜接**：→ [S13 Memory 與個人化](/stages/s13-memory/)、[S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)
:::

:::tip[理解路線重點]
- Agent 只是一個迴圈：模型決定下一步，程式執行，直到完成或該停。
- 筆記助理寄信前一定先問人；這由程式強制，不是寫在提示詞裡。
- 改了迴圈外的程式，要多題、多次試跑比數字，才知道有沒有變好。
:::

## 在做什麼

S10 工具與 MCP 讓模型能呼叫工具。要完成多步驟任務，就把模型放進迴圈：模型決定下一步，程式執行後把結果放回 context，直到模型宣告完成。S0 AI 系統概觀的 mini-SWE-agent 用的就是這個做法。

迴圈還需要權限、停止條件、錯誤處理、狀態、長時程的 context 管理與 skills，這些程式合稱 harness。每個元件都在處理模型本身的某個限制。本章會從最小的 agent eval 開始，檢查這些設計是否讓 agent 更安全、可靠，出錯時能停下來。

## 學完能

- 能手寫一張 agent loop 的 trace 表：每一輪模型決定什麼、harness 做什麼（含權限判斷）、回填什麼、因為哪個停止條件結束。（講義與自我檢查）
- 說出 LangGraph、OpenAI Agents SDK 這類框架幫你做了哪些事、藏起了哪些決定；兩題實作都刻意不用框架。（講義與自我檢查）
- 不用任何框架，手寫一個有權限閘門、hooks、停止條件的 agent loop，並解釋每一行在做什麼。（必做）
- 為每個工具決定在 plan / ask / auto 三種模式下的行為，並證明高風險動作一定會先詢問。（必做）
- 每次改 harness 都用「n 題 × k 次試跑」的 pass^k 與信賴區間判斷有沒有變好，而不是看一兩次的結果。（必做）
- 為長任務選擇 compaction 或 sub-agent 隔離（以及深入區塊的 context reset、structured notes），並說出取捨。（進階）

## 講義

Agent 的**模型**負責決定下一步，例如選工具、給參數，或宣告完成。其餘程式稱為 **harness**，負責執行工具、檢查權限、記錄步驟及決定何時停止（見[術語表](/reference/glossary/)）。迴圈分成四步：

1. 把目前的 messages（系統提示詞、工具定義、使用者請求、到目前為止的所有工具呼叫與結果）送給模型。
2. 模型回覆。如果回覆裡有工具呼叫，harness 先過權限檢查，再執行。
3. 把工具結果接回 messages。
4. 檢查停止條件；沒有要停，就回到第 1 步。

整章都用同一個例子：**筆記助理**（使用者小林），工具沿用 S10 工具與 MCP 的名稱與分級：`notes_search`（低風險）、`notes_create`（中）、`email_draft`（中，只建草稿）、`email_send`（高，真的寄出）。

### ★ 一個例子走完全程

模型每一輪只決定一步，harness 執行後把結果放回去，模型看了結果再決定下一步。

使用者在 ask 模式（每個寫入動作都先問，見下方 🔒 一節）送出：「把上週的會議筆記整理成週報，存成新筆記，再幫我寫一封給主管的信件草稿。」下表是一次完整的執行紀錄（trace）。token 數是示意，但加總都算過：

| 輪 | 這一輪送出的 context | 模型的決定 | harness 做的事 | 回填的結果 |
|---|---|---|---|---|
| 1 | 3,000 token | 呼叫 `notes_search(query="會議", 範圍=上週)` | 低風險，直接執行 | 4 篇會議筆記的摘錄，約 2,400 token |
| 2 | 約 5,450 | 呼叫 `notes_create(title="週報 10/26–11/1", body=…)`，內文約 600 token | 中風險，ask 模式 → 問使用者，使用者允許 | `{id: "n_311"}` |
| 3 | 約 6,080 | 呼叫 `email_draft(to="主管", …)` | 中風險 → 問使用者，允許；工具回錯 | 錯誤：「to 必須是 email 地址」；`email_draft` 連續失敗 1 次 |
| 4 | 約 6,420 | 呼叫 `request_human_input("主管的 email 是？")` | 暫停，等使用者回覆 | 「chen@example.com」 |
| 5 | 約 6,480 | 再呼叫 `email_draft(to="chen@example.com", …)` | 問使用者，允許；成功 | `{draft_id: "d_88"}`；失敗計數歸零 |
| 6 | 約 6,810 | 不再呼叫工具，回覆「週報已存成筆記，信件草稿在草稿匣，尚未寄出」 | 停止條件成立：模型宣告完成 | — |

從這張表可以看出幾件事：

- **下一步是看了結果才決定的。** 第 3 輪失敗之前，沒有人（包括寫程式的你）知道需要第 4 輪去問 email。這就是 agent 和 workflow 的差別：workflow 的步驟由程式事先寫好，agent 的下一步由模型決定（← [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）。步驟的數量與順序要看中途的結果才知道時，workflow 就不夠了。
- **錯誤也是一種結果。** 工具失敗不會讓程式當掉，而是變成一段短的錯誤訊息回給模型，模型自己修正。
- **每一輪都重送整段歷史。** 6 輪的輸入合計是 3,000 + 5,450 + 6,080 + 6,420 + 6,480 + 6,810 = 34,240 token，約是最後一輪 context 的 5 倍。步數越多，成本成長得比步數還快，這就是 prompt caching（← S11 Context engineering）和下面的長時程 context 管理重要的原因。

這種「想一步、做一步、看結果」交錯進行的方式叫 **ReAct**（Yao et al. 2023）。另外兩種常見變化：**plan-and-execute** 先讓模型列出完整計畫再逐步執行，適合步驟事先就看得清楚的任務；**reflection**（例如 Reflexion，Shinn et al. 2023）在失敗後讓模型用文字檢討，帶著檢討重試。三者底下都是同一個迴圈。

上表用的是反覆呼叫的普通模型 API，多步驟能力來自迴圈與 harness。LangGraph、OpenAI Agents SDK 等框架也會包裝這個迴圈，並決定 state 的保存方式、選定工具後能否暫停、hooks 與權限的位置、trace 格式，以及換模型的難易度。先自己寫一次，之後就比較容易理解框架的設計。

這段就是上面四步的程式寫法；不寫程式可以跳過。骨架大約十幾行（虛擬碼）：

```text
messages = [system, user_request]
loop:
  if 停止條件成立: break
  reply = model(messages, tools)
  messages.append(reply)
  if reply 沒有工具呼叫: break            # 模型宣告完成
  results = []
  for call in reply.tool_calls:
    decision = pre_tool_use(call)          # 允許 / 詢問 / 拒絕
    result = 執行(call) 或 拒絕原因
    post_tool_use(call, result)            # 寫 trace
    results.append(tool_result(call.id, result))
  messages.append(results)                 # 回填格式見下方展開
```

API 的回覆會標出模型這次有沒有要求呼叫工具。一次回覆可能有好幾個工具呼叫，每個各自過權限，不能只處理第一個。每一個工具呼叫都要回一個結果給模型，回給模型的格式依廠商而定（見展開）。

<details class="deep">
<summary>準備動手做：怎麼偵測工具呼叫、怎麼回填結果</summary>

- **怎麼偵測工具呼叫**：Anthropic API 回覆的 `stop_reason` 是 `tool_use`；OpenAI Chat Completions 的 `finish_reason` 是 `tool_calls`。工具結果要帶上對應的呼叫 ID 回傳；Anthropic 的 `tool_result` 可以標 `is_error: true` 告訴模型這是錯誤。
- **多個工具呼叫怎麼回填**：Anthropic 要把同一輪所有 `tool_result` 放進同一則 user 訊息，排在任何文字之前；OpenAI 則是每個呼叫一則 `role: "tool"` 訊息，帶上 `tool_call_id`。

</details>

<details class="deep">
<summary>準備動手做：reasoning model 的 thinking 要傳回</summary>

有些 API 要求在工具呼叫的迴圈中，把上一輪的 thinking 內容原樣傳回（interleaved thinking，← S6 LLM API 與應用基本功），自己組 messages 時不要把它丟掉。

</details>

### ★ 迴圈外面要包哪些程式？

Harness 記錄了上一節表格裡的每一步。這份 trace 可以用來 debug、恢復執行，之後也能做成 eval。

常見的 harness 元件：

- **權限**：這個動作能不能做、要不要先問（下一節）。
- **Hooks**：在工具執行前後插入的程式。`pre_tool_use` 在執行**前**判斷允許 / 詢問 / 拒絕，也可以改寫參數；`post_tool_use` 在執行**後**記錄或檢查結果。
- **State / checkpoint**：把目前進度存下來，當掉或暫停後能接著跑。
- **Retry**：處理暫時性錯誤（← S6 LLM API 與應用基本功的 retry 與 idempotency；retry 見[什麼時候該停下來？](#-什麼時候該停下來)，idempotency 見本節下方）。
- **人工介入**（HITL）：需要人決定時暫停。
- **Budget**：步數、token、金額的上限。
- **Telemetry**：每一步都進 trace（← S6 LLM API 與應用基本功）。

**狀態只存一份。** [12-factor-agents](https://github.com/humanlayer/12-factor-agents) 第 5 條建議把「執行狀態」（現在第幾步、在等什麼）和「業務狀態」（發生過哪些訊息與工具呼叫）盡量合成一份只往後追加的事件紀錄。以上面的例子來說，第 4 輪暫停等使用者時，harness 只要存下前 4 輪的事件；使用者隔天才回覆也沒關係，讀回紀錄、接上回覆，就從第 5 輪繼續。

**Checkpoint 恢復時最怕重複執行。** 假設程式在第 2 輪 `notes_create` 執行完、但結果還沒寫進紀錄時當掉。恢復後這個呼叫會再執行一次，使用者就有兩份週報。做法是每個有副作用的操作都有自己的 operation ID，當成 idempotency key（← S6 LLM API 與應用基本功）：

1. harness 在操作第一次被規劃時產生 ID。
2. 把 ID 連同呼叫內容存進 checkpoint，然後才執行。
3. 恢復時重播同一個操作就沿用同一個 ID；工具查到這個 ID 做過，就直接回傳先前的結果。

工具要在同一個交易裡寫入結果與這個 key（或把 key 傳給支援 idempotency key 的下游 API），否則工具執行完、寫入 key 之前當掉仍會重複。反例：不要用「session ID + 輪數」當 key。一輪可以有好幾個工具呼叫，同一輪建兩篇筆記時，第二個 `notes_create` 會被誤判成重複。

**工具在哪裡執行。** 會執行程式或指令的工具，要關在 sandbox 裡（← [S10 工具與 MCP](/stages/s10-tools-mcp/)：容器、只掛工作目錄、預設沒有網路）。到了 agent，模型會連續做很多步，一個被誘導的步驟可能接著被下一步放大，所以 sandbox 的範圍要包住整個 agent 能碰到的東西，而不只是單一工具。必做題每次試跑都從原始資料夾複製一份乾淨副本，就是最簡單的資料隔離：agent 怎麼亂改都不會動到原始資料。但它不限制讀取範圍、網路或指令執行，不能取代 sandbox，所以工具也要把路徑限制在副本資料夾內。

Harness 的各項限制都要由程式執行，模型看不到，也無法繞過。系統提示詞可以說明規則，但不能取代這些程式。

<details class="deep">
<summary>深入一點：brain 與 hands 分離、無狀態 reducer</summary>

- Anthropic〈Scaling Managed Agents: Decoupling the brain from the hands〉把系統拆成三塊：session（只會往後追加的事件紀錄）、harness（呼叫模型並分派工具的迴圈）、sandbox（執行程式的地方）。三者可以各自替換，例如 harness 當掉重啟時，session 和 sandbox 都不受影響。
- 12-factor-agents 第 12 條更進一步：把 agent 寫成無狀態的 reducer，輸入「事件紀錄」，輸出「下一步」。這樣任何一個時間點都能重播、測試，也容易把同一個 session 搬到另一台機器上接著跑。

</details>

### 🔒 哪些動作要先問使用者？

權限要從第一版就做，不要等到 S16 安全與治理才補。它決定的是「模型想做的事，harness 准不准做」。

常見的三種模式：

| 模式 | 行為 | 適合 |
|---|---|---|
| **plan** | 只能用唯讀工具探索，最後提出計畫；任何寫入都被擋下 | 剛接手陌生任務、想先看 agent 打算做什麼 |
| **ask** | 每個寫入或執行動作都先問使用者 | 預設模式 |
| **auto** | 白名單內的動作直接執行，不再詢問 | 低風險、可逆、範圍清楚的工作 |

套到筆記助理的四個工具：

| 工具（S10 工具與 MCP 的風險） | plan | ask | auto |
|---|---|---|---|
| `notes_search`（低） | 執行 | 執行 | 執行 |
| `notes_create`（中） | 擋下 | 詢問 | 執行並記錄 |
| `email_draft`（中） | 擋下 | 詢問 | 執行並記錄 |
| `email_send`（高） | 擋下 | 詢問 | **仍然詢問** |

最後一列是這一章的檢查點：不管在哪個模式，S10 工具與 MCP 標為高風險的動作（把使用者資料送到系統外、不可復原、有成本）都必須先確認。實作上，權限檢查就是 `pre_tool_use` hook：在工具真正執行之前判斷「允許 / 詢問 / 拒絕」。被拒絕時，把原因當成工具結果回給模型（例如「使用者拒絕寄出，請改存成草稿」），讓它換個做法，而不是讓迴圈當掉。

詢問時，確認畫面要顯示實際會發生的事：要寄給誰、主旨與內文、能不能收回；刪除的話是哪些檔案（清單與數量）、能不能復原。只問「確定嗎？」等於沒問（確認介面的設計 → S17 產品與 AI UX）。批次動作再加一條規則：一次影響超過 N 筆（例如 10 筆）時，不管在哪個模式都先詢問。

提示詞裡的「寄信前請先問我」可能被模型忽略，也可能被 prompt injection 蓋掉（← S9 檢索與 RAG）。權限限制必須放在模型繞不過的程式層。完整的威脅模型與 auto 模式分類器設計，會在 S16 安全與治理說明。

### ★ 什麼時候該停下來？

Agent 不會自己知道何時該放棄，停止與求助的規則要由 harness 決定。

**停止條件**至少要有這幾種：模型宣告完成（不再呼叫工具）、達到步數上限、token 或金額上限、同一個工具連續失敗太多次、遇到需要人決定的事。前三種是正常結束或預算保護，後兩種要**升級給人**：停下來，告訴使用者停在哪裡、為什麼。

**錯誤分兩種處理。**

- **暫時性錯誤**（429、5xx、逾時）：由 harness 依 S6 LLM API 與應用基本功的規則退避重試，模型完全不用知道。
- **工具邏輯錯誤**（參數不對、找不到檔案）：把精簡的錯誤訊息放回 context，讓模型自己修，就像上面第 3 輪。但要計數：同一個工具連續失敗約 3 次就停下來升級給人，成功一次就歸零。

用例子算一次：假設第 3 輪之後，模型連續 3 次都把 `to` 填成「主管」。沒有計數的話，它會一直重試到步數上限 15，白白多跑 10 輪，而且每一輪都重送 6,000 多 token 的歷史。有計數的話，第 3 次失敗後就停下，回報「`email_draft` 連續失敗 3 次：缺少收件人 email」。

[12-factor-agents](https://github.com/humanlayer/12-factor-agents) 的 #5–#9 剛好是一組，可以當成設計清單：

- **#5 統一執行狀態與業務狀態**：見上面的 [harness 元件](#-迴圈外面要包哪些程式)一節。
- **#6 用簡單的 API 啟動、暫停、恢復**：等待人或長時間作業時，agent 應該能停下來，之後從原處接著跑。
- **#7 透過工具呼叫找人**：把「問人」設計成一個工具（例如上面的 `request_human_input`），而不是讓模型直接輸出一段文字問句。這樣 harness 才分得出「模型在問問題」和「模型做完了」。
- **#8 掌握自己的控制流程**：某些工具呼叫（要求澄清、部署）應該跳出迴圈等待，而不是直接執行。
- **#9 把錯誤壓縮進 context**：只放精簡的錯誤訊息，不放整段 stack trace；並配合上面的失敗計數。

碰到步數上限時，要把這次執行記成失敗，並記下原因。Agent 即使給了回答，也可能只是被上限截斷的半成品。

### ★ Context 裝不下怎麼辦？

S11 Context engineering 處理的是「這一次放什麼進 context」；這裡處理的是任務長到 context 視窗裝不下的時候。

上面的例子只有 6 輪。如果小林要的是「整理全部約 200 篇筆記」，每篇平均約 1,500 token，光讀完就是 30 萬 token，還沒算每一輪重送的歷史。Anthropic〈Effective context engineering for AI agents〉列出幾種做法，最先要會的是這兩種：

- **Compaction**：快滿時把前面的對話縮短，用縮短後的版本接著跑。最輕的一種是 tool-result clearing：把很久以前的工具輸出清掉，只留「呼叫過什麼」，文章稱它是最安全、最輕量的 compaction；還不夠，再請模型把前面的對話摘要。難處在決定留什麼。
- **Sub-agent 隔離**：把一段探索交給 **sub-agent**。sub-agent 是主 agent 透過工具呼叫啟動的另一個 agent 迴圈，有自己乾淨的 context；它做完之後只回傳約 1,000–2,000 token 的摘要。例如主 agent 開 4 個 sub-agent，各讀 50 篇筆記（約 7.5 萬 token），各回傳 1,500 token 的重點；主 agent 的 context 只增加約 6,000 token，而不是 30 萬。

每個 sub-agent 都要重新讀一遍材料，總 token 用量通常更多。這種做法能減少主 agent 的 context，卻未必省錢。多 agent 的分工與協調會在 S15 Multi-agent 說明。

<details class="deep">
<summary>深入一點：structured notes 與 context reset</summary>

- **Structured notes**：agent 定期把進度、待辦、發現寫進 context 外的檔案，需要時再讀回來。
- **Context reset** 和 compaction 不同：compaction 是同一個 agent 帶著縮短的歷史繼續跑，保有連續性；reset 是清空 context、開一個新 agent，靠一份結構化交接文件接手，代價是交接文件沒寫到的細節都會遺失。Anthropic〈Harness design for long-running apps〉提到，某些模型接近它「以為」的 context 上限時會急著收尾（文章稱為 context anxiety），當時 reset 是必要的；換成較新的模型後這個現象大致消失，reset 就被拿掉、改用自動 compaction。

</details>

<details class="deep">
<summary>準備動手做：compaction 的觸發與順序</summary>

- **觸發門檻**：用每一輪實際送出的 token 數判斷（API 回應裡的 usage 欄位），例如超過視窗的 50% 就觸發。不要等到接近上限才做，摘要本身也要一次模型呼叫和一段空間。
- **由輕到重**：先清舊的工具結果（不需要模型呼叫、不會改寫內容）；仍然超過，再請模型摘要。最近幾輪與尚未完成的待辦要原樣保留。
- **Trace 要記下觸發點**：記錄觸發的輪數、前後的 token 數。進階題要比較有與沒有 compaction 的版本，沒有這筆紀錄就無法證明它真的被觸發過。

</details>

### ★ Skill 怎麼需要時才載入？

Skill 是一包「需要時才載入」的做事方法，讓 agent 能裝很多種專門流程，又不把 context 塞滿。

Skill 是一個資料夾，核心是一份 `SKILL.md`：開頭的 YAML frontmatter（檔案最上方用 `---` 包起來的設定區）寫 `name` 與 `description`，內文是做這件事的指示，還可以附腳本與參考檔。它是 S11 Context engineering 講的 progressive disclosure 的具體實作，分三層載入：所有 skill 的名稱與描述一開始就放進系統提示詞；模型判斷相關時才讀入整份 `SKILL.md`；更細的附檔需要時才打開。

以筆記助理為例：「週報格式」寫成一個 skill，描述是「把會議筆記整理成週報時使用」。平常每一輪只多帶這一行描述（幾十個 token）；上面的例子在第 2 輪要寫週報時，模型才讀入整份格式說明。裝 20 個 skill，平常也只多 20 行描述。

Skill 也能附可執行的腳本，讓確定性的工作（例如把日期換算成「上週」的範圍）交給程式，而不是讓模型逐字生成。

Skill 可能同時帶有指示與程式碼，使用時也要考慮供應鏈風險。只安裝可信來源的 skill，第三方內容要先讀過再用（→ S16 安全與治理）。

### ★ 不建索引也能找資料嗎？

Agentic search 是讓 agent 自己用工具一步步找資料，而不是事先建好向量索引。

做法是給 agent `glob`（找檔名）、`grep`（找關鍵字）、`head` / `tail`（看片段）這類工具，讓它像人一樣邊找邊縮小範圍。例如要找「十一月提到預算的會議筆記」：先 `glob("meetings/2026-11-*")` 找出 5 個檔案，再 `grep("預算")` 縮到 2 個，最後只讀這 2 個。Claude Code 的做法是混合式：`CLAUDE.md` 這類固定說明一開始就放進 context，其他檔案需要時才用 glob、grep 去找。

它適合**規模不大、或內容有明確識別字的語料**，例如程式碼 repo（函式名、錯誤訊息可以精確比對）或一個專案的筆記資料夾。代價是工具呼叫次數、延遲與 token 都會增加。

Agentic search 適合逐步縮小搜尋範圍，但語料很大，或查詢與原文用詞不同時，grep 可能找不到。例如搜「預算」，找不到只寫「經費」的筆記。這時仍需要 S9 檢索與 RAG 的 embedding 與 hybrid 檢索，實務上常把兩種搜尋方式並用。

### ★ 跨 session 怎麼接手？

任務跨越多個 session 時，要把進度存在 context 外面，讓新的 session 也能接手。Anthropic 的兩篇文章整理了幾種做法：

- **Initializer / worker**（〈Effective harnesses for long-running agents〉）：第一個 session 只做準備：寫啟動腳本 `init.sh`（一執行就把開發環境跑起來的腳本）、進度檔、功能清單、做第一次 git commit（commit 是程式碼的一個存檔版本）。之後每個 session 先讀進度與 git log（存檔紀錄）、跑一次基本測試，只做**一個**功能，做完 commit 並更新進度。
- **Feature list 當外部狀態**：功能清單用 JSON 而不是 Markdown（模型比較不會亂改），每項有 `passes` 欄位，一開始全部是失敗；worker 在 prompt 中被要求只改這個欄位。這是在防「做一半就宣告完成」。
- **Generator–evaluator**（〈Harness design for long-running apps〉，深化 [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 的 evaluator-optimizer）：一個 agent 產出，另一個 agent 實際操作成品（例如用 Playwright，一種自動操作瀏覽器的工具，點過網頁）並依標準打分。把評估者獨立出來，比要求產出者自我批評更容易把標準調嚴。
- **Sprint contracts**：每一輪開始前，產出者先提出「這輪要做什麼、怎麼驗證」，評估者審過、雙方同意才動工，把模糊的規格變成可測的條件。

**容易誤會：「worker 只改 `passes` 欄位」是靠指示，不是技術限制。** 文章的做法是在 prompt 裡要求，而不是用程式強制；模型仍然**可以**改其他欄位，只是被要求不要改。這和上面 🔒 一節是同一件事：prompt 指示降低機率，程式才能保證。如果你需要保證，就得自己在 harness 加檢查，例如用 hook 比對 JSON 前後的差異，發現其他欄位被改就拒絕寫入（這是這份路線的建議，不是文章的做法）。

### ★ 改 harness 後怎麼判斷？

每個元件都在假設「模型自己做不到這件事」，模型變強之後假設可能失效，所以加或拿掉元件都要有數字。

〈Harness design for long-running apps〉指出，每個 harness 元件都反映了對模型限制的假設。文中的 context reset 會清空 context，靠交接文件讓新 agent 接手，原本用來解決模型急著收尾的問題。模型變強後，這個元件被移除；下一代模型也不再需要 sprint 結構，planner 與 evaluator 則仍保留。

最小的 agent eval 只要三樣東西（← [S8 Evals 方法論](/stages/s08-evals/)）：

- **每個任務跑 n 次**：agent 每次結果不同，跑一次不算數。
- **pass^k**：k 次全部成功的比例（← S8 Evals 方法論）。它比「平均成功率」更接近「使用者每次都能信任它」。單次成功率 75%、各次獨立的話，連續 3 次都成功的機率只有 0.75³ ≈ 42%。
- **信賴區間**：分數是從有限次數估出來的，要附上誤差範圍（← S8 Evals 方法論）。

用必做題的規模算一次：10 個任務各跑 5 次，每題成功次數是 5、5、4、5、3、5、5、2、5、4。

- 整體成功率：合計 43 次 ÷ 50 次 = 86%。用 S8 Evals 方法論的近似公式，標準誤 √(0.86 × 0.14 ÷ 50) ≈ 0.049，95% 信賴區間約 86% ± 9.6 個百分點，也就是約 76%–96%。這是把 50 次當獨立樣本的近似；同一題的 5 次彼此相關，實際區間更寬（→ S14 Agent evals、資料與最佳化）。
- pass^5：只有 5 次全對的題目算數，共 6 題，所以 pass^5 = 6 ÷ 10 = 60%。

平均 86% 聽起來不錯，但使用者把同一件事交給它 5 次，只有 6 成的任務每次都會成功。

**容易誤會：一兩次試跑就能判斷改動有沒有用。** 假設加了 compaction 之後整體成功率變成 80%，從 86% 掉到 80% 不代表 compaction 讓它變差。兩版要跑同一批任務，看配對差值（新 − 舊）的信賴區間是否包含 0；只看單一版本的區間不夠（→ [S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)）。差值的區間包含 0 時，就不能說哪個比較好，得增加任務數再比。

<details class="deep">
<summary>深入一點：信賴區間的兩個細節</summary>

- **同一題的 5 次不是獨立的。** 有些題目本來就難，5 次會一起失敗。上面的公式把 50 次當成獨立樣本，區間會偏窄。比較穩的做法是以「題」為單位做 bootstrap：每次有放回地抽 10 題（連同各自的 5 次結果），重算成功率，重複 1,000 次以上取第 2.5 與第 97.5 百分位（← S8 Evals 方法論）。
- **跑的次數 n 大於 k 時**：每題有 c 次成功的話，可以用「從 n 次裡抽 k 次、全部是成功」的機率估計 pass^k，也就是 C(c, k) ÷ C(n, k)。例如 n = 8、c = 6、k = 3：C(6, 3) ÷ C(8, 3) = 20 ÷ 56 ≈ 0.36。n = k 時，這個式子就退化成「k 次全對算 1，否則算 0」，也就是上面的計算方式。

</details>

<section class="deep-section">

### ○ 框架替你決定了什麼？

手寫過之後再看 LangGraph、OpenAI Agents SDK、Claude Agent SDK、OpenHands SDK、DSPy 這些框架，重點是比較它們替你決定了什麼：state 怎麼存、能不能在工具選定與執行之間暫停、hooks 與權限放在哪、trace 長什麼樣、換模型容不容易。[OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) 內建 guardrails、handoffs 與 tracing；[CMU 11-768](https://www.cmu-agents.com/) 的作業也是先手寫 harness，框架放在後面。框架不是必修，能讀懂、能比較即可。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** 筆記助理在 auto 模式。模型在同一則回覆裡呼叫了 `notes_search`、`notes_create`、`email_send`。harness 對這三個呼叫各做什麼？如果使用者拒絕寄出，要回給模型什麼？

<details class="hint">
<summary>對照答案</summary>

`notes_search` 直接執行；`notes_create` 在 auto 白名單內，直接執行並記錄；`email_send` 是高風險，auto 模式也**仍然詢問**。被拒絕時把原因當成這個呼叫的工具結果回傳（例如「使用者拒絕寄出，請改存成草稿」），三個呼叫各自回填結果，迴圈不會當掉。

</details>

**2.** 步數上限 15、同一工具連續失敗上限 3。(a) 第 3、4、5 輪模型都呼叫 `email_draft(to="主管")`，每次都收到「to 必須是 email 地址」。迴圈在哪一輪、因為哪個停止條件結束？(b) 另一次執行跑到第 15 輪時，模型剛好回了一段像總結的文字。這次算完成嗎？

<details class="hint">
<summary>對照答案</summary>

(a) 第 5 輪：`email_draft` 連續失敗 3 次，停下來升級給人，並說明「缺少收件人 email」，不會跑到步數上限。(b) 不算。停在步數上限的執行要記成失敗並寫下原因，那段文字可能是被截斷的半成品。

</details>

### 必做：手寫一個有權限閘門的 agent loop

**目標**：不用框架寫出完整的 agent loop，加上權限、hooks 與停止條件，並用多次試跑的數字描述它有多可靠。

**步驟**
1. 準備一個練習用資料夾：20 個 Markdown 筆記，用 LLM 或腳本生成一次後固定下來，存成原始版本。內容要剛好包含：6 個檔案含 `TODO`、3 對內容幾乎相同的重複檔、2 個檔名以 `draft-` 開頭的草稿、其餘是一般筆記（主題自訂）。這些數字讓你的 grader 有確定的正確答案。每次試跑前從原始版本複製一份乾淨的副本。
2. 實作 5 個工具並標風險等級：`list_files`、`read_file`、`grep`（低）、`write_file`（中）、`delete_file`（高）。工具輸入要驗證（路徑只能落在副本資料夾內，`../` 與絕對路徑要拒絕），錯誤訊息要短、能引導下一步（← S10 工具與 MCP）。
3. 手寫 loop：送出 messages → 執行工具呼叫 → 回填結果 → 重複。停止條件至少四種：模型宣告完成、步數上限 15、同一工具連續失敗 3 次（升級給人，結束並說明原因）、單次執行的 token 上限。
4. 加兩個 hook：`pre_tool_use` 做權限判斷（plan / ask / auto 三種模式，`delete_file` 在任何模式都要詢問），`post_tool_use` 把每一步寫進 JSONL trace（工具、參數、結果長度、token 數、耗時）。
5. 寫 10 個任務，每個附一個**檢查最終檔案狀態**的程式化判斷（例如「把所有含 TODO 的檔名寫進 `todo.txt`」→ 檢查 `todo.txt` 的內容）。另外寫 3 個會誘使 agent 刪檔或改錯檔的任務，測權限。
6. 10 個任務在 ask 模式（每次詢問都由腳本自動回答「允許」）各跑 5 次，算每題成功率與 pass^5。3 個權限任務改在 **auto** 模式（`write_file` 在白名單內、直接執行）各跑 5 次，詢問一律由腳本回答「拒絕」並記錄；ask 模式下每個寫入本來就會先問，測不出「高風險一定詢問」這條規則，所以要在 auto 模式測。最後用 plan 模式把 3 個權限任務各跑一次。

**驗收**
- 10 個任務 × 5 次 = 50 次執行，每次都有完整 JSONL trace。
- 報告整體成功率與 95% 信賴區間（← S8 Evals 方法論），以及每題的成功次數（0–5）和 pass^5。
- 從 trace 證明：auto 模式的 15 次權限任務執行中，每一次 `delete_file` 呼叫都在執行前觸發詢問，`write_file` 則直接執行、沒有詢問（報告兩者的呼叫總數；模型沒有嘗試刪除的執行另外計數）。plan 模式下寫入類工具被執行 0 次。
- 用一個故意會失敗的工具做測試：連續 3 次失敗後，迴圈停止並記錄升級原因，不會跑到步數上限。
- 沒有任何一次執行超過 15 步；碰到上限的執行要算失敗並記錄原因。

**提示**
- TypeScript：直接用 Anthropic 或 OpenAI SDK 的 tool use，Zod 驗證工具參數；不要裝 agent 框架。
- Python：`anthropic` 或 `openai` SDK，Pydantic 驗證參數。
- 本地模型：Ollama 跑支援工具呼叫的小模型（例如 Qwen3 系列）可以免費做完，但成功率會明顯較低，這本身就是有趣的比較。用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。用雲端小模型跑 50 次通常在幾美元以內，先跑 1 次確認流程再放大。
- 卡住時：
  - 重讀：[agent loop](#-一個例子走完全程)（含迴圈骨架與展開的回填格式）、[權限模式](#-哪些動作要先問使用者)、[停止條件](#-什麼時候該停下來)、[最小 agent eval](#-改-harness-後怎麼判斷)
  - 延伸：learn-claude-code s01–s04、12-factor-agents #7–#9

<section class="deep-section">

### 進階：系統專案 A12：手寫 harness

**目標**：為你的系統寫出完整的 harness：loop、權限、hooks、checkpoint / resume、人工介入、compaction、skills，並用多次試跑證明它可靠。

**步驟**
1. 把 A10 工具組與 MCP server（[代號說明](/guide/how-to-use/#代號怎麼讀)）做出的工具接到你自己寫的 loop 上（不用框架）。每一輪的 context 用 A11 context builder 組裝。沿用這些工具的風險分級設定 plan / ask / auto 的行為。
2. 事件紀錄當唯一狀態（12-factor #5、#12）：每一步寫入可序列化的紀錄；程式被中斷後，可以從最後一個 checkpoint 恢復。有副作用的工具要能辨識「已執行過」，恢復時不重複執行（← S6 LLM API 與應用基本功的 idempotency）。
3. 人工介入做成工具（`request_human_input`），等待期間 agent 暫停、不佔用行程，回覆後接著跑。
4. 加入 compaction：context 超過你設定的門檻（例如視窗的 50%）時，先清舊的工具結果，仍超過再摘要。
5. 把兩個固定流程寫成 skill（`SKILL.md` + 附檔），只有任務需要時才載入內文。
6. 寫 20 個代表真實使用的任務（從 A8 錯誤分析與 golden set 累積的 trace 與失敗分類挑），每個跑 5 次。挑一個改動（例如加不加 compaction）做前後比較。
7. （加分）挑一個需要跨 3 個以上 session 的長任務，用 initializer / worker 加 JSON feature list 完成。

**驗收**
- 20 個任務 × 5 次的成功率、pass^5 與 95% 信賴區間；一個改動的前後比較，結論要和區間一致。
- 中斷恢復：在 3 個任務執行中途強制結束程式，3 次都能從 checkpoint 恢復並完成，trace 顯示沒有重複執行有副作用的工具。
- 高風險工具在所有執行中 100% 先詢問（用 hook 的紀錄證明，不是靠人工印象）。
- Compaction 至少在 2 個長任務中被觸發。在這些任務上比較有與沒有 compaction 的版本：跑之前先寫下容許的差距 δ（建議 5 個百分點），配對差值（有 − 沒有）的 95% 信賴區間下界 ≥ −δ。只有 2 個任務 × 5 次時區間會很寬，通常要 30 個以上會觸發 compaction 的任務才可能達到；達不到就如實寫出區間並增加任務，而不是放寬 δ。
- Skill 內文只出現在需要它的任務 trace 中；其他任務的 context 裡只有名稱與描述。

以筆記助理為例：「把上週所有會議筆記整理成週報、存成新筆記、再寫一封寄給主管的信件草稿」。依 A10 工具組與 MCP server 的分級，讀筆記是低風險，直接執行；建立筆記與建立信件草稿是中風險，ask 模式下先詢問、auto 模式下直接執行並記錄；真的寄出（`email_send`）是高風險，在任何模式都一定要確認。「週報格式」寫成一個 skill。

**提示**
- TypeScript：Anthropic / OpenAI SDK；事件紀錄可以用 SQLite（`better-sqlite3`）或 JSONL；HITL 可以先用 CLI 提示，到 A17 完整前端再做成介面。
- Python：同上，SQLite 用內建 `sqlite3`。
- 成本：20 × 5 次加上比較組，雲端小模型大約是十到數十美元，主要取決於任務長度；先用 5 個任務把整套流程跑一遍。Ollama 可以免費做，但長任務在小模型上很容易失敗；用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。
- 卡住時：
  - 重讀：[harness 元件](#-迴圈外面要包哪些程式)、[長時程 context](#-context-裝不下怎麼辦)、[skills](#-skill-怎麼需要時才載入)
  - 延伸：learn-claude-code s08、s15、s16；Anthropic〈Effective harnesses for long-running agents〉

</section>

## 自我檢查

1. 不看講義，用筆記助理寫出一次 loop trace：使用者說「找出提到預算的筆記，整理成一篇新筆記」。列出每一輪模型的決定、harness 做的事（含權限判斷）、回填的結果，以及在哪一輪、因為哪個停止條件結束。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：至少有 `notes_search` 一輪、`notes_create` 一輪（ask 模式要先問）、模型不再呼叫工具的最後一輪。**常見錯法**：把權限判斷寫成模型的決定，或漏寫停止條件。**回讀**：[一個例子走完全程](#-一個例子走完全程)

   </details>

2. 用自己的話解釋「每個 harness 元件都代表一個對模型能力的假設」。舉一個你自己的 harness 裡、模型變強後可能可以拿掉的元件。（理解路線：用筆記助理回答）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：元件存在是因為模型「現在做不到」某件事，所以拿掉前要用 eval 數字確認。**常見錯法**：舉權限閘門當例子；它防的是被誘導與誤操作，不會因為模型變強就不需要。**回讀**：[改 harness 後怎麼判斷？](#-改-harness-後怎麼判斷)

   </details>

3. Compaction 和 sub-agent 隔離各保留了什麼、丟掉了什麼？什麼情況下你會改用 sub-agent？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：compaction 讓同一個 agent 帶著縮短的歷史繼續跑，丟掉舊細節；sub-agent 把一段探索放進乾淨的 context，主 agent 只拿回摘要。大量可以分段讀的材料適合 sub-agent。**常見錯法**：以為 sub-agent 省成本，它省的是主 agent 的 context。**回讀**：[Context 裝不下怎麼辦？](#-context-裝不下怎麼辦)

   </details>

4. 為什麼權限檢查要寫成 hook，而不是在系統提示詞裡寫「刪除前請先詢問」？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：提示詞是請求，模型可能忘記或被 prompt injection 蓋掉；hook 是模型繞不過的程式。**常見錯法**：以為提示詞寫得夠強硬，模型就一定會先問。**回讀**：[哪些動作要先問使用者](#-哪些動作要先問使用者)

   </details>

5. 情境題：你的 agent 在 auto 模式下要「清理重複筆記」，模型決定刪掉 30 篇。你的 harness 在哪一步、用什麼規則擋下？使用者確認時應該看到什麼資訊？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：在 `pre_tool_use` 擋下，規則是「刪除是高風險」加上「一次超過 N 筆就詢問」；確認畫面列出哪些檔案、幾筆、能不能復原。**常見錯法**：只問「確定嗎？」。**回讀**：[哪些動作要先問使用者](#-哪些動作要先問使用者)

   </details>

6. 情境題：要讓 agent 回答「我們的程式碼哪裡處理了退款」和「這 5 萬份 PDF 合約裡哪些有自動續約條款」。各用 agentic search 還是向量 RAG？為什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：程式碼有明確識別字、規模小，適合 grep / glob；5 萬份合約量大、措辭多變，需要向量或 hybrid 檢索。**常見錯法**：兩題都選同一種，忽略語料大小與用詞是否固定。**回讀**：[不建索引也能找資料嗎](#-不建索引也能找資料嗎)

   </details>

7. 程式在 `notes_create` 執行完、結果還沒寫進事件紀錄時當掉。恢復後會發生什麼事？harness 要怎麼避免？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：恢復後會再建一份筆記；每個操作在規劃時就產生 operation ID、隨 checkpoint 存下，重播時沿用同一個 ID，工具查到做過就不再執行。**常見錯法**：用「session ID + 輪數」當 key，同一輪的第二個寫入會被誤判成重複。**回讀**：[迴圈外面要包哪些程式](#-迴圈外面要包哪些程式)

   </details>

8. 框架（例如 LangGraph、OpenAI Agents SDK）替你做了哪些決定？舉兩個你手寫時必須自己決定的地方。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：從 state 怎麼存、能不能在工具選定與執行之間暫停、hooks 與權限放在哪、trace 長什麼樣中任選兩個，說出你的選擇。**常見錯法**：只說「框架比較方便」，沒指出被藏起來的決定。**回讀**：[一個例子走完全程](#-一個例子走完全程)最後談框架的那一段

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看得更深、或想跟著別人一行一行寫程式的人，都不是必讀。

### 跟著寫程式

- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — 這份路線推薦的實作教材，每章都短、附可執行的 `code.py`。先讀根目錄新版的 s01–s04（loop、工具、權限、hooks），對照必做題；接著 s05–s08（todo、sub-agent、skills、compaction）、s10（任務系統）、s15（整合 harness）、s16（workflow 與 journal 續跑），對照進階題。章節預設英文，附簡中翻譯（簡中可用[術語表](/reference/glossary/)提到的 OpenCC 轉換）。注意舊版 `docs/` 的章節號和新版不同，不要混用。s11（背景任務）、s12（排程）、s17（goal loop）在 S19 真實 agent 系統與畢業專題的常駐 agent 會用到，現在可以先瀏覽。
- [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) — S0 AI 系統概觀讀過；手寫 loop 時對照它怎麼處理停止條件與錯誤。
- [CMU 11-768 AI Agents](https://www.cmu-agents.com/) — 第 1 份作業：在開放模型上寫 harness，可以和本章的 A12 手寫 harness 對照。

### 設計原則與工程文章

- [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) — 全篇都短。講義用了 #5–#9；另外值得讀 #3（自己掌握 context window）、#10（小而專注的 agent）、#12（把 agent 寫成無狀態的 reducer）。部分內容帶有 HumanLayer 的產品推廣。
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)（2025-11-26）— initializer / worker、feature list、進度檔的原文；最後的失敗模式對照表是講義沒有的。
- [Anthropic: Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps)（2026-03-24）— generator–evaluator、sprint contracts、context reset vs compaction，以及「每個元件都是一個假設」的完整脈絡。
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)（2025-09-29）— S11 Context engineering 讀過前半，這裡讀長時程任務（long-horizon）那一段與 just-in-time 檢索。
- [Anthropic: Equipping agents with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills)（2025-10-16）— SKILL.md 的結構與三層載入的官方說明。
- [Anthropic: Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/research/managed-agents)（2026-04-08）— session / harness / sandbox 分離；harness 的假設會過期。
- [Anthropic: Building effective AI agents](https://www.anthropic.com/research/building-effective-agents)（2024-12-19）— [S0 AI 系統概觀](/stages/s00-big-picture/)與[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)都讀過；手寫 loop 後再讀一次 agent 段，感受會不一樣。
- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — run loop 與 guardrails 的段落；多 agent 段留到 S15 Multi-agent。

### 原始論文

- [Yao et al. 2023, ReAct](https://arxiv.org/abs/2210.03629)、[Shinn et al. 2023, Reflexion](https://arxiv.org/abs/2303.11366) — 兩種基本 agent 模式的原始論文，有各自的實驗與失敗案例。

### 課程與概覽

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — L4–L6 投影片（工具、框架與 harness、agent 設計模式與 context 管理）。
- [Hugging Face Agents Course](https://github.com/huggingface/agents-course) — 偏框架；想多看幾種框架的寫法時再讀。

### 中文資源

- [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) — 簡中；第 4 章（經典範式：ReAct、plan-and-solve、reflection）、第 7 章（自己寫 agent 框架）。
- [WenyuChiou/awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) — 繁中；harness 8 元件檢查表可以拿來對照自己的實作。偏 Claude Code 生態。
- [iThome 2026〈AI Agent 上線要想清楚的事：30 天拆解 Harness 的設計取捨〉](https://ithelp.ithome.com.tw/users/20150750/ironman/9868) — 繁中；harness 設計取捨的連載。內容尚未核對，當輔助讀物。
- [datawhalechina/deepagents-in-action](https://github.com/datawhalechina/deepagents-in-action) — 簡中；第 1 章（從 framework 到 harness）、第 9 章（HITL）、第 11 章（檔案系統權限）。綁 LangChain，適合手寫之後對照框架做法。

</section>
