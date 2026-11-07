---
title: S6 LLM API 與應用基本功
description: 把模型接進程式的基本功：訊息結構與計價、串流、錯誤處理、SDK、本地模型、tracing 與測試。
sidebar:
  order: 6
  label: S6 LLM API 與應用基本功
prev:
  link: /guide/app-first/
  label: 應用路線與模型速成
---

:::note[這一站]
**⏱ 講義** 首次閱讀約 2.5 小時，手算與深入內容約 1 小時　**必做題** 約 12 小時　**進階題** 約 13 小時

**前置**：[S0 全局地圖](/stages/s00-big-picture/)；模型知識見 [模型速成](/guide/app-first/#模型速成)（token、next-token 與 sampling、context window、成本與延遲；深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S5 推論與 serving](/stages/s05-inference/)）　**銜接**：→ [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S17 產品與 AI UX](/stages/s17-ai-ux/)（完整前端）
:::

:::tip[理解路線重點]
- 模型不記得上一輪，筆記助理每次都要重送整段對話，所以聊越久越貴。
- 出錯時先分清能不能重試；建立筆記這類動作還要防止重複執行。
- 輸出每次可能不同，所以測試只檢查性質，不比對模型的原文。
:::

## 在做什麼

這一站回答：怎麼把模型可靠地接進程式。內容是一次 API 呼叫的結構與成本、串流與取消、錯誤與重試、各家 SDK 的差異、本地模型、推理模型的應用端用法，以及怎麼記錄與測試「每次輸出都不一樣」的程式。這些是應用路線的起點，後面每一站都建立在它們上面：S8 Eval 方法論的錯誤分析要讀 trace，S12 Agent loop 與 harness 的 agent 要靠可靠的重試與取消，S18 部署與架構的成本控管要靠每次呼叫都記下的 token 數。

## 學完能

- 能說明為什麼多輪對話的成本會累加、哪些錯誤該重試，以及怎麼用 idempotency key 避免重複執行副作用。（講義與自我檢查）
- 說出一次 API 呼叫的 messages 結構，並從回應的 usage 欄位算出這次呼叫花了多少錢。（講義與自我檢查；必做實際判斷一次）
- 寫出能串流、能取消、遇到 429 / 5xx 會正確重試的呼叫層。（必做）
- 用同一份程式切換雲端 API 與本地模型，並說出兩者的取捨。（必做）
- 為每次呼叫記錄 token 數、成本、延遲。（必做用 JSONL log；OpenTelemetry trace 在進階）
- 用 record / replay 寫出不打真實 API、每次結果都一樣的測試。（必做）

## 講義

整站跟著一個例子走：**筆記助理**。使用者小林（使用者 ID `u_017`）有大約 200 篇 Markdown 筆記，問「我上週對 X 專案記了什麼？」。第一版用最簡單的做法：把最近 20 篇筆記全文塞進系統提示詞，每次請求約 3 萬個輸入 token（S9 檢索與 RAG 會把它降下來）。程式要把筆記和問題組成一次 API 呼叫，把回答一個字一個字串流到畫面上，遇到錯誤時正確重試，並記下這次花了多少 token、多少錢、多久。各節依序處理這條路上的一步：組請求與算帳、串流與停止、重試、換 provider 與本地模型、推理模型、紀錄與測試。

### ★ 一次 API 呼叫長什麼樣？

一次呼叫就是送出「系統提示詞 + 一串有角色的訊息」，拿回一段輸出和一份 token 用量；費用用這份用量算。

動手跑這一站的例子前，需要：

- 基本的 Python（或 TypeScript）：會寫函式、讀 dict / 物件。
- 會安裝套件：例如 `pip install anthropic` 或 `npm install @anthropic-ai/sdk`。
- 會設定環境變數：API 金鑰放在環境變數（例如 `ANTHROPIC_API_KEY`），不寫進程式碼。
- 知道 HTTP 與 JSON 是什麼：一次 API 呼叫就是一個 HTTP 請求，送出與收回的內容都是 JSON。

（不熟的話先看[術語表](/reference/glossary/)）

不寫程式的讀者可以略過 Python／TypeScript 程式碼；prompt、筆記與 JSON 範例請照常讀。

以 Anthropic 的格式為例，筆記助理的一次呼叫大致長這樣（為了讓數字好算，這個例子只放 2 篇筆記）：

```json
{
  "model": "…",
  "system": "你是筆記助理，只根據下面的筆記回答。<notes>…2 篇筆記…</notes>",
  "messages": [
    { "role": "user", "content": "我上週對 X 專案記了什麼？" }
  ],
  "max_tokens": 500
}
```

訊息有**角色**（role）：`user` 是使用者說的話，`assistant` 是模型過去的回答；放全域指示的**系統提示詞**（system prompt）各家放法不同，這裡是頂層的 `system` 參數。每則訊息的內容可以是多個區塊：文字、圖片、工具呼叫、工具結果。`max_tokens` 是這次最多輸出多少 token。

用官方 Python SDK 寫，最小的一次呼叫是：

```python
import anthropic

client = anthropic.Anthropic()  # 從環境變數 ANTHROPIC_API_KEY 讀金鑰
MODEL = "……"                     # 填入官方文件列出的模型名稱

response = client.messages.create(
    model=MODEL,
    max_tokens=1024,
    system="你是小林的筆記助理。只根據下面的筆記回答；筆記裡沒有就說不知道。\n<notes>……</notes>",
    messages=[{"role": "user", "content": "上次設計團隊會議的預算上限是多少？"}],
)

print(response.content[0].text)                   # 模型的回答
print(response.stop_reason)                       # 例如 "end_turn"
print(response.usage.input_tokens, response.usage.output_tokens)
```

TypeScript SDK（`@anthropic-ai/sdk`）的形狀相同；OpenAI 的 SDK 欄位名稱不同（見下方〈[怎麼換 provider 不重寫？](#-怎麼換-provider-不重寫)〉）。這只是最小的呼叫，必做題會再加上串流、重試與紀錄。

回應除了文字，還有一個 `usage` 欄位，例如 `{"input_tokens": 2000, "output_tokens": 300}`。計價以 token 為單位（token 是什麼見[模型速成〈Token 與斷詞〉](/guide/app-first/#token-與斷詞)；深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)），**輸入和輸出分開計價**，輸出通常貴好幾倍：

```
成本 = 輸入 token 數 × 輸入單價 + 輸出 token 數 × 輸出單價（+ 快取讀寫，→ S11）
```

用示意單價（輸入每百萬 token 3 美元、輸出每百萬 token 15 美元）算這次：2,000 × 3 / 1,000,000 + 300 × 15 / 1,000,000 = 0.006 + 0.0045 = **0.0105 美元**。換成真正的第一版（20 篇筆記、約 3 萬輸入 token），光輸入就要 30,000 × 3 / 1,000,000 = 0.09 美元。token 數不要自己估，直接讀 `usage`：各家 tokenizer 不同，同一段中文在兩家模型上的 token 數可能差很多。

**容易誤會：模型記得上一輪。** LLM API 基本上是**無狀態**的，每次呼叫都要把整段對話重新送一次：系統提示詞、過去的使用者與助理訊息、工具結果。所以多輪對話的成本會累加。假設（同樣只放 2 篇筆記）筆記加系統提示詞 1,800 token、每個問題 200 token、每個回答 300 token：第 1 輪輸入 2,000 token，第 2 輪要帶上第 1 輪的問答，變成 2,500，之後每輪多 500，第 10 輪是 6,500。10 輪的輸入合計 42,500 token，是「每輪都只送 2,000」的兩倍多。降低方法有兩類：讓不變的開頭命中 prompt caching（→ [S11 Context engineering](/stages/s11-context-engineering/)），以及截斷或摘要舊對話（→ S11 的工具結果預算、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) 的 compaction）。

**Batch API** 讓你一次送出大量請求、非同步取回結果（通常在 24 小時內），價格大約是即時呼叫的一半。適合不急的工作，例如替一千篇筆記產生摘要，或跑 eval（→ S8 Eval 方法論）。

<details class="deep">
<summary>深入一點：各家的訊息格式差異與伺服器端對話狀態</summary>

- **系統提示詞放哪**：Anthropic 用頂層的 `system` 參數；OpenAI 把它當成一種訊息（`system` 或 `developer` 角色），Responses API 也可以用 `instructions` 參數。
- **伺服器端對話狀態**：有些 API 提供選用的伺服器端狀態，例如 OpenAI Responses API 的 `previous_response_id`，讓你不必自己重送歷史。但模型每次仍要讀完整段歷史，計價時也照樣算這些輸入 token，所以上面的累加成本不會消失。

</details>

### ★ 怎麼讓回答邊產生邊顯示？

串流讓使用者在模型還在產生時就看到第一個字；使用者按「停止」時，要真的切斷連線。

筆記助理的回答有 300 token，假設整段要 6 秒才產生完。不串流，畫面空白 6 秒；串流的話，第一個字大約在 0.8 秒出現，之後一路長出來。體感延遲取決於 **TTFT**（time to first token，第一個 token 出現前的時間；見[模型速成〈成本與延遲的基本功〉](/guide/app-first/#成本與延遲的基本功)，深入：[S5 推論與 serving](/stages/s05-inference/)），而不是總延遲。

大多數 API 用 **SSE**（Server-Sent Events）：一個不關閉的 HTTP 回應，內容是一行行的 `event:` 與 `data:`，每個事件帶一小段文字：

```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"上週"}}
```

程式逐行讀、把每段文字接起來顯示。最後一個事件之前，通常會有一個帶最終 `usage` 的事件，成本要從那裡算。

兩個常見的坑：

- **串流中途出錯**：HTTP 已經回 200 之後，錯誤可能以一個 `error` 事件出現在串流中間。程式不能只看狀態碼。
- **Partial JSON**：工具呼叫的參數（→ [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S10 工具與 MCP](/stages/s10-tools-mcp/)）是一段 JSON，串流時被切成碎片，中途的碎片不是合法 JSON。不是等這個區塊結束再解析，就是用能解析不完整 JSON 的 parser 做漸進顯示。

**容易誤會：停止顯示就等於取消。** 只是不再更新畫面的話，模型在伺服器上還會繼續產生、繼續計費。要真的中斷連線：JS 用 `AbortController`，Python 取消 task 或關閉 response。已經產生的 token 通常仍會計費，所以越早取消越省。

<details class="deep">
<summary>準備動手做：事件順序與瀏覽器端的限制</summary>

- **Anthropic 的事件順序**大致是 `message_start` → 每個內容區塊的 `content_block_start` / `content_block_delta` / `content_block_stop` → `message_delta`（含最終 usage）→ `message_stop`。工具參數的碎片是 `input_json_delta`。
- **瀏覽器端**：原生的 `EventSource` 只能發 GET，LLM 請求通常是 POST，所以前端多半用 `fetch` 加 `ReadableStream` 自己解析，或交給 SDK。Python client（httpx、官方 SDK）沒有這個限制，直接逐行讀 response 即可。
- **量 TTFT**：從送出請求開始計時，到收到第一個「文字」chunk 為止，不是收到第一個任意事件（`message_start` 不帶文字）。

</details>

### ★ 出錯時該不該重試？

有些錯誤等一下就會好，有些重試一百次也一樣；先分類，再決定重試、等多久、何時放棄。

**可以重試的**：429（rate limit，請求太頻繁）、500、502、503、504、529（Anthropic 的 overloaded）、網路中斷、逾時。**不該重試的**：400（請求格式錯）、401 / 403（金鑰或權限）、413（請求太大）。

重試前要等，而且越等越久：**指數退避**（exponential backoff）加上**隨機抖動**（jitter）。抖動是為了避免所有 client 在同一刻重試，把剛恢復的服務又打垮。回應帶 `retry-after` header 就照它等。重試要有上限。

筆記助理的呼叫層設成最多重試 3 次、基準等待 1 秒：

| 情況 | 嘗試過程 | 結果 |
|---|---|---|
| 429，帶 `retry-after: 2` | 第 1 次 429 → 等 2 秒 → 第 2 次成功 | 共 2 次嘗試 |
| 連續 500 | 第 1 次 → 等待（上限約 1 秒）→ 第 2 次 → 等待（上限約 2 秒）→ 第 3 次 → 等待（上限約 4 秒）→ 第 4 次 | 4 次都失敗才報錯 |
| 400 | 第 1 次 | 不重試，直接報錯 |

（實際等待是 0 到上限之間的隨機值，這就是抖動；公式在下方展開區塊。）官方 SDK 通常已內建重試；自己實作重試時，先關掉 SDK 內建的重試，以免重試疊重試。

**逾時**至少分兩種：連線逾時，以及串流中「兩個 chunk 之間」的閒置逾時。對串流請求設一個很短的總逾時（例如 30 秒），會把正常但很長的回答也砍掉；閒置逾時（例如 10 秒沒有新 chunk）才抓得到真正卡住的連線。

**容易誤會：重試最多就是多付一次錢。** 單純的 LLM 呼叫確實如此，但如果呼叫之後的動作有副作用就不是了。筆記助理之後會有「建立筆記」工具（→ S10 工具與 MCP）：伺服器已經建好筆記，回應卻在網路上斷掉，程式一重試，就多出一篇重複的筆記。做法是為每個動作產生一個 **idempotency key**（冪等鍵，例如對話 ID 加工具呼叫 ID），執行前先查這個 key 是否做過，做過就直接回傳上次的結果。到了 S12 Agent loop 與 harness 做 agent，這會非常重要。

<details class="deep">
<summary>準備動手做：退避公式、SDK 預設與不會恢復的 429</summary>

- **退避公式**：第 n 次重試（n 從 0 起）的等待上限是 `min(上限, 基準 × 2^n)`；常見的 full jitter 是在 0 到這個上限之間隨機取一個值。有 `retry-after` 時以它為準。
- **SDK 預設**：Anthropic SDK 預設重試 2 次。測自己的重試邏輯前，先把它關掉（例如 `maxRetries: 0`），否則你測到的是 SDK 的行為。
- **不會自己恢復的 429**：Anthropic 用量層級（usage tier）的每月上限造成的 429 沒有 `retry-after`，會一直失敗到額度恢復；你自己設的組織或 workspace 消費上限則回 400。所以沒有 `retry-after`、又連續失敗的 429，要停止重試並發出警示。

</details>

### ★ 怎麼換 provider 不重寫？

各家 API 很像但不一樣；在自己的程式裡包一層很薄的介面，把差異關在裡面。

可選的工具有三類。**官方 SDK**（Anthropic、OpenAI）提供型別、內建重試、串流 helper，最快支援各家新功能。**Vercel AI SDK**（TypeScript）用統一介面接多家 provider，還附前端的聊天 hooks，對前端工程師最順手。**LiteLLM**（Python）用 OpenAI 的格式呼叫上百種模型，也可以自架成 gateway，集中做重試、fallback 與用量紀錄。

筆記助理的做法：定義一個 `callLLM(messages) → { 文字, 工具呼叫, usage }`，provider、模型名稱、base URL、金鑰都從設定檔讀。換 provider 或換成本地模型，只改設定，其他程式不動。

**容易誤會：「OpenAI 相容」就是完全相同。** Ollama、llama.cpp server、vLLM 都提供 OpenAI 相容 API，但細節可能不同：

- 系統提示詞放哪、工具呼叫的格式
- 停止原因的名稱：Anthropic 正常結束是 `end_turn`、達到上限是 `max_tokens`；OpenAI Chat Completions 是 `stop` 與 `length`
- usage 的欄位名稱：Anthropic 是 `input_tokens` / `output_tokens`，OpenAI Chat Completions 是 `prompt_tokens` / `completion_tokens`
- 推理相關的參數，以及某些參數是否支援

所以那層介面要負責把這些轉成你自己的格式，並在 log 或 trace 裡保留原始回應，出問題時才查得到。

### ★ 什麼時候用本地模型？

本地模型跑在你自己的機器上：免費、資料不離開，但品質、context 長度和工具呼叫的穩定度通常比不上前沿模型。

三種常見跑法：**Ollama** 最容易上手，一行指令下載並執行模型，提供 OpenAI 相容 API。**llama.cpp** 是底層引擎，執行量化後的 GGUF 模型（GGUF 是 llama.cpp 用的模型檔格式），附一個 HTTP server，可調的參數最多。**MLX** 是 Apple 為 Apple Silicon 做的框架，`mlx-lm` 可以在 Mac 上執行與微調模型。

什麼時候用：資料不能離開機器、要離線運作、開發與測試時不想每次付費、量大到 API 費用超過硬體成本。代價是品質通常較差、可用的上下文視窗較短、工具呼叫較不穩定，而且硬體與維運都是你的事。筆記助理開發時可以先接 Ollama 的小模型（例如 `qwen3:0.6b`）先確認整條流程能動，再切回雲端模型比品質。選模型的順序也一樣：先用最強的模型確認任務做得到，再用 eval 決定能不能換成更小、更便宜或本地的模型（→ S8 Eval 方法論、S18 部署與架構）。

**量化**（quantization）是把每個參數用更少的位元存，例如從 16 位元降到 4 位元：省下大量記憶體，品質略降。本地模型幾乎都跑量化版。

**粗估記憶體**：參數量 × 每個參數的位元組數。8B（80 億參數）模型量化到 4-bit，每個參數 0.5 byte，權重約 4 GB，加上執行時的額外開銷約需 4–5 GB；再加上 KV cache，它隨 context 長度增加（見[模型速成〈KV cache〉](/guide/app-first/#kv-cache以及為什麼輸出-token-比較貴)；量化的細節見深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/)）。

<details class="deep">
<summary>深入一點：模型從哪裡取得、怎麼挑</summary>

- **閉源與開放權重**：閉源模型（例如 Claude、OpenAI 的 GPT 主力模型、Gemini）拿不到權重，只能透過 API 使用（供應商自家、雲端平台或聚合服務轉接）；開放權重模型（例如 Llama、Qwen、Gemma、DeepSeek、Mistral 的開放權重系列、OpenAI 的 gpt-oss）可以下載到自己的機器或伺服器上執行，也能微調。前者通常品質最好、維運最少；後者資料不離開、可控性高，但硬體與維運都要自己負責。
- **取得管道**：供應商 API 直接呼叫；聚合服務（例如 OpenRouter）用一組 OpenAI 相容 API 接很多家模型，方便比較，但多了一層轉手；Hugging Face Hub 是開放權重模型的集散地，可以下載模型或用它的推論服務；本機執行則用 Ollama、llama.cpp，或有圖形介面的 LM Studio。
- **怎麼挑**：先列出任務的硬條件（資料能不能出去、context 長度、要不要工具呼叫與結構化輸出、延遲與預算），刪掉不符合的，再用你自己的 eval 比剩下的幾個。公開排行榜只能當初篩，見 S8 Eval 方法論的 benchmark 一節。

</details>

#### Ollama 的 context 長度

Ollama 超過預設 context 時可能默默截掉較早的內容而不報錯：用 Ollama 跑長 prompt 前，先設定 `num_ctx` 並用 `ollama ps` 確認。

<details class="deep">
<summary>深入一點：預設值與被截掉時的樣子</summary>

Ollama 預設 context 依 VRAM（顯示記憶體）而定（24 GiB 以下為 4K）；prompt 超過時，預設會丟掉較早的內容（只在伺服器 log 留警告），API 不一定回錯誤。請設定 `num_ctx` 或 `OLLAMA_CONTEXT_LENGTH`，並用 `ollama ps` 確認。之後各站用 Ollama 跑長 prompt 的練習，都要先做這一步。

**容易誤會：沒報錯就代表整段 prompt 都送進去了。** 這一站的筆記助理把最近 20 篇筆記塞進系統提示詞，約 3 萬 token，遠超過 4K。不調整的話，前面的內容（常常就是系統提示詞和大部分筆記）會被默默丟掉，模型只看到最後一小段，回答看起來只是「品質差」。

</details>

### ★ 推理模型要注意什麼？

推理模型回答前會先產生一段思考，這段思考要付錢、佔輸出上限，也讓第一個可見的字晚很多出現。

推理模型（reasoning model）是什麼，見[模型速成〈訓練階段〉](/guide/app-first/#訓練階段pretrain--sft--偏好--rl--reasoning)（深入：[S4 Post-training 與 reasoning](/stages/s04-post-training/)）。從應用端看，要知道這幾件事：

- **思考 token 以輸出 token 計價**，而且算在輸出上限內。
- **控制方式各家不同、而且一直在變**。查證時（2026-11）：OpenAI 用 `reasoning.effort`；Anthropic 的新模型改用 adaptive thinking 加 `effort`，舊的 `budget_tokens` 已棄用（deprecated），新模型會拒絕。寫程式前一定要看當下的文件。
- **原始思考內容通常看不到**，只拿得到摘要或加密內容。多輪工具呼叫時，必須把上一輪的思考區塊（或 reasoning item）**原封不動**傳回去，否則會出錯或品質下降。
- **Interleaved thinking**：模型在兩次工具呼叫之間也會思考，對 agent（→ [S12 Agent loop 與 harness](/stages/s12-agent-harness/)）很重要。
- **UX**：介面要讓使用者知道「正在思考」，並允許取消。

**容易誤會：思考不佔回答的空間。** 筆記助理把輸出上限設成 1,000 token，模型思考用掉 900，回答只剩 100 token，在句子中間被截斷，停止原因是「達到上限」。用推理模型時，上限要把思考的量一起算進去，並在 log 裡記錄停止原因。

### ★ 每次呼叫要記下什麼？

每次呼叫都留下一筆結構化紀錄：用了哪個模型、多少 token、多少錢、多久、成功與否。從第一天就記，因為後面的錯誤分析與成本控管都要讀這些資料。

最簡單的做法是每次呼叫寫一行 JSONL（每行一個 JSON 物件）。筆記助理那次呼叫的紀錄：

```json
{"ts":"2026-11-07T10:00:00Z","model":"…","input_tokens":2000,"output_tokens":300,"cost_usd":0.0105,"ttft_ms":800,"latency_ms":6000,"retries":0,"status":"ok"}
```

有了它，「這週總共花多少」「哪類問題特別慢」都只是一個查詢。

系統變複雜之後（一個請求裡有檢索、多次 LLM 呼叫、工具執行），改用 **trace**：一次請求的完整紀錄，由多個 **span** 組成，每次 LLM 呼叫、每次工具執行各是一個 span，彼此有父子關係，看得出時間花在哪裡。**OpenTelemetry** 是記錄 trace 的開放標準，它的 GenAI semantic conventions 規定了 LLM 呼叫的欄位名稱，例如 `gen_ai.request.model`、`gen_ai.usage.input_tokens`。照標準命名，就能換不同的 trace 後端查看。

**回饋收集**的最小版本也從這裡開始：每則回答旁放「讚 / 倒讚」，存下時連到那次回答的 trace ID。之後看到一個倒讚，就能直接打開當時的完整 prompt 與回應。

**容易誤會：等系統穩定再補紀錄。** S8 Eval 方法論的錯誤分析要讀的正是這些紀錄；事後才補，你會缺少最早、最真實的那批資料。另外，prompt 與回應全文可能含個資，要不要記錄、存多久，現在就要決定（→ [S16 安全與治理](/stages/s16-security/)）。

<details class="deep">
<summary>準備動手做：GenAI conventions 的常用欄位與後端</summary>

- **常用欄位**：`gen_ai.operation.name`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`、`gen_ai.response.finish_reasons`。成本、TTFT、使用者 ID 用自訂屬性。
- **兩點要注意**：這份規範在查證時（2026-11）仍是 Development 狀態，欄位可能還會改；規範中沒有標準的「成本」欄位，成本要自己算、存成自訂屬性。
- **規範的位置**：已搬到獨立的 repo（見延伸閱讀），以那裡的 client inference span 文件為準。
- **後端**：Jaeger、Langfuse、Phoenix 等都支援 OTLP，都能在本機用 Docker 跑。

</details>

### ★ 輸出會變怎麼測試？

模型的輸出每次可能不同，所以測試不比對模型的原文，而是分層：自己的邏輯用假模型測，真實輸出只檢查性質。

即使 temperature 設 0，輸出也不保證完全一樣；而且部分 API 已經不讓你設 temperature（見下方〈[Sampling 參數的限制](#sampling-參數的限制)〉）。筆記助理的測試分四層：

1. **Mock**：測自己的程式邏輯（重試、解析、錯誤處理）時，把模型換成假的，回傳固定內容或固定錯誤。例如讓假模型先回 429 再回正常內容，檢查呼叫層只嘗試 2 次。
2. **Record / replay**：第一次打真實 API，把 HTTP 互動存成檔案（fixture），之後的測試都重播它，不連網、每次結果一樣、不花錢。換 prompt 或換模型時重新錄製，並檢視差異。
3. **Snapshot**：對「你送出去的東西」做 snapshot，例如組好的系統提示詞與工具定義。比起對模型輸出做 snapshot，這穩定得多，也最能抓到不小心改壞 prompt 的情況。
4. **斷言性質而非比對全文**：對真實輸出只檢查性質，例如 JSON 合法、引用的筆記標題確實存在、長度在範圍內。完整的品質評估是 [S8 Eval 方法論](/stages/s08-evals/) 的事。

**容易誤會：失敗就重跑，綠了就好。** 這會讓不穩定（flaky）的測試默默藏住真正的問題。**Flaky 政策**：確定性的測試（mock、replay）放在 CI（持續整合）必過；打真實模型的測試另外跑 N 次，用通過率門檻判斷（例如 10 次至少過 9 次），並記錄每次結果。

#### Sampling 參數的限制

在目前的 Anthropic API 版本下，Claude 模型不接受 `temperature`（`top_p`、`top_k` 也一樣，帶了會回 400）；需要控制抽樣的實驗，請用本地模型或文件明確支援的 provider。

<details class="deep">
<summary>深入一點：API 版本、SDK 與其他 provider</summary>

查證時（2026-11），Anthropic API 版本 `2026-10-21` 下，Messages 請求只要帶 `temperature`、`top_p` 或 `top_k`，任何 Claude 模型都會回 400。各語言 Anthropic SDK 的最新主版本都送這個 API 版本；較舊的主版本仍送 `2023-06-01`。不過 Claude 4.7 之後的模型在舊版 API 下也只接受預設值。OpenAI 的推理模型也限制這些參數。所以「把 temperature 設成 0 來降低雜訊」在這些模型上行不通：比較時用模型的預設抽樣、每個條件多跑幾次取平均。需要控制抽樣的實驗，請用本地模型（Ollama、llama.cpp），或文件明確寫出支援這些參數的其他 provider / 模型，並在紀錄裡寫明。這類規則變動很快，動手前先查當下的文件。

</details>

<section class="deep-section">

### ○ 模型能在瀏覽器裡跑嗎？

模型直接在使用者的瀏覽器裡跑（WebGPU / WASM），沒有伺服器成本、資料不離開裝置。限制是模型要先下載（通常數百 MB 起跳）、只能用小模型、裝置支援度不一。適合分類、摘要、embedding 這類小任務。S17 產品與 AI UX 會再談它在產品上的位置。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** 下面五種情況，呼叫層該不該重試？(a) 429（請求太頻繁），帶 `retry-after: 5`；(b) 401（未通過身分驗證）；(c) 503（服務暫時無法使用）；(d) 400（請求內容有誤）；(e) 串流到一半網路斷線。

<details class="hint">
<summary>對照答案</summary>

該重試：(a) 等 5 秒再試；(c) 指數退避加抖動；(e) 屬於網路中斷，可以重試，但呼叫之後若有副作用要靠 idempotency key 防重複。不該重試：(b) 金鑰或權限問題、(d) 請求格式錯，重試幾次結果都一樣。

</details>

**2.** 自己走一次筆記助理的帳：系統提示詞加筆記 3,000 token、每個問題 100 token、每個回答 400 token，用講義的示意單價，算第 1 輪與第 5 輪各花多少錢。

<details class="hint">
<summary>對照答案</summary>

第 1 輪：輸入 3,100 × 3 / 1,000,000 = 0.0093，輸出 400 × 15 / 1,000,000 = 0.006，共 0.0153 美元。第 5 輪要帶上前 4 輪的問答：輸入 3,000 + 4 × 500 + 100 = 5,100 token，0.0153 + 0.006 = 0.0213 美元。輸出不變，輸入逐輪變多。

</details>

### 必做：可靠的 LLM 呼叫層

**目標**：寫一個小模組，能串流、能取消、會正確重試、會記錄成本，並用離線測試證明它真的會。

**步驟**
1. 寫一個 `callLLM` 函式：送一段 messages，回傳文字與 usage。準備一份單價設定檔（輸入 / 輸出單價，抄自 provider 的 pricing 頁並記下日期），用 usage 算出每次的成本。測試用的輸入固定成 20 個短 prompt，例如「用一句話解釋 HTTP 狀態碼 N 的意思」，N 依序取 200、201、204、301、302、304、400、401、403、404、409、413、418、422、429、500、502、503、504、529。
2. 加上串流：把 token 一邊收一邊印出來，並量 TTFT（送出到第一個文字 chunk）與總延遲。
3. 加上取消：給一個逾時或按鍵觸發的取消，確認連線真的被關閉。log 裡記下取消的時間戳記與最後一個收到的 chunk 的時間戳記。
4. 寫一個本地的 mock server，可以依設定回傳：帶 `retry-after: 2` 的 429（第一次回 429、第二次回正常回應）、連續的 500、400、串流到一半送出 error 事件、兩個 chunk 之間停 10 秒。
5. 實作重試：只重試可重試的錯誤，指數退避加 jitter，遵守 `retry-after`，最多重試 3 次。先把 SDK 內建的重試關掉（例如 `maxRetries: 0`），否則你測到的是 SDK 的行為。
6. 每次呼叫寫一行 JSONL log：時間、模型、輸入 token 數、輸出 token 數、成本、TTFT、總延遲、重試次數、最終狀態。
7. 用 record / replay 錄一次真實呼叫，寫測試重播它。
8. 只改設定（環境變數或設定檔）把 `callLLM` 切到本地模型（例如 Ollama 的 OpenAI 相容 API 加 `qwen3:0.6b`），跑其中 5 個 prompt。

**驗收**
- 對真實模型呼叫 20 次，log 裡 20 筆都有上面 9 個欄位；任選 3 筆，手算成本和 log 完全一致。
- 對 mock server：429 那次在第 2 次嘗試成功，兩次嘗試間隔 ≥ 2 秒；連續 500 時總共嘗試 4 次（1 次 + 重試 3 次）後才報錯；400 只嘗試 1 次。
- 閒置 10 秒的串流會被你的 chunk 間逾時中斷，log 記為逾時而非成功。
- 取消後 500 ms 內不再印出新的 chunk：log 裡「最後一個 chunk 的時間戳記 − 取消時間戳記」≤ 500 ms（可以是負數），而且連線已關閉。
- 拔掉網路，整個測試套件連續跑 10 次都通過。
- 切到本地模型的 5 筆 log 一樣有 9 個欄位（成本記為 0），程式除了設定之外沒有改動。

**提示**
- TypeScript：官方 SDK（`@anthropic-ai/sdk` 或 `openai`），或直接用 `fetch` + `ReadableStream`；`AbortController` 處理取消；mock server 用 `node:http` 或 [MSW](https://mswjs.io/)；測試用 Vitest。
- Python：官方 SDK 或 [httpx](https://github.com/encode/httpx) + `asyncio`；mock 用 [respx](https://github.com/lundberg/respx)，record / replay 用 [pytest-recording](https://github.com/kiwicom/pytest-recording)（基於 VCR.py）；mock server 用 FastAPI 或標準函式庫的 `http.server`。
- 成本：20 次小呼叫通常不到 1 美元。不想付費就全程用 Ollama，429 / 500 都由 mock server 模擬。
- 時間分配參考：步驟 1–3 約 4 小時，mock server 與重試約 4 小時，log、record / replay、離線測試與切換本地模型約 4 小時。時間不夠的話，先完成 429 / 500 / 400 三種 mock 與對應驗收，串流中途錯誤與 chunk 間逾時之後再補。
- 卡住時：
  - 重讀：[出錯時該不該重試？](#-出錯時該不該重試)（公式在展開區塊）、[streaming](#-怎麼讓回答邊產生邊顯示)、[測試](#-輸出會變怎麼測試)
  - 延伸：Anthropic〈Errors〉頁的 HTTP errors 段、AWS 那篇的「Jitter」段

**預估**：12 小時（熟悉重試與串流的人約 9 小時）

<section class="deep-section">

### 進階：系統線 A6：開始你的系統

這是系統線的第一步（各步代號見[代號說明](/guide/how-to-use/#代號怎麼讀)）：你要選定一個主題，之後的 13 站（S7–S19）都在同一個系統上加能力。

**選主題**：好主題要有**自己的文件**（不是網路上隨手可得的）、有一些**能做事的動作**（建立、修改、寄送）、可以有 **2–3 位使用者**，而且**你自己會真的用**。這樣後面的 RAG、工具、安全、多使用者部署都練得到。四個範例主題見[系統線〈選一個主題〉](/projects/system-thread/#選一個主題)；不確定就選筆記助理。

**目標**：做出一個能串流聊天、每次呼叫都有 trace 與成本、能收集回饋、能切換雲端與本地模型的最小系統。

**步驟**
1. 做一個最小的聊天介面：輸入框、串流顯示、停止按鈕。網頁、Gradio、Chainlit、Streamlit 或 CLI 都可以（做法見提示），串流、停止與回饋的驗收標準都一樣；完整的前端在 S17 產品與 AI UX。
2. 用必做題的呼叫層（或同等功能的 SDK 設定）接上模型。
3. **Naive 版 context**：把你的文件全文（或前 N 個 token）直接塞進系統提示詞。這是故意的簡化，S9 檢索與 RAG 會換成檢索、S11 Context engineering 會做預算管理；現在先讓系統能用，並在 trace 裡看到它花了多少 token。
4. 用設定檔或環境變數切換雲端模型與本地模型（Ollama 或 llama.cpp），程式其他部分不用改。
5. 每次 LLM 呼叫產生一個 OpenTelemetry span，用 `gen_ai.*` 欄位記錄模型、provider、token 數，另外加上成本、TTFT、總延遲；送到一個可在本機查看的後端。每則助理訊息都存下它的 trace ID。
6. 在每則回答旁放「讚 / 倒讚」按鈕和選填的文字回饋（CLI 版可以用 `/good`、`/bad 原因` 這類指令），存下來並連到同一個 trace ID。
7. 每個請求帶一個使用者 ID：先用設定檔或 request header 切換即可，不必做登入（正式的身分驗證在 A18 多使用者部署）。使用者 ID 寫進每個 trace 與每筆回饋；之後 A9 附引用的 RAG、A13 分層記憶的隔離測試都用它。
8. 自己開始用它，在進入 S8 Eval 方法論前累積至少 30 段真實對話。

**驗收**
- 最近 50 次 LLM 呼叫，100% 都有 trace，而且每個 trace 都有模型、provider、輸入 / 輸出 token 數、成本、TTFT、總延遲。
- 對 mock 的 429、連續 500、400，系統的重試行為符合必做題的三條數字標準。
- 只改設定就能切到本地模型；同一組 5 個問題在雲端和本地各跑一次，兩邊的 trace 都看得到，並各記錄平均延遲與總成本。
- 任選 5 個回饋，都能從回饋找到對應的 trace。
- 用兩個不同的使用者 ID 各送 3 個請求，6 個 trace 都帶著正確的使用者 ID。
- 按停止後 1 秒內不再出現新文字，trace 標記為「已取消」。
- 進入 S8 Eval 方法論前，累積 ≥ 30 段真實對話。

以筆記助理為例：把最近 20 篇筆記全文塞進系統提示詞，問「我上個月對 X 專案的結論是什麼」；trace 會顯示每次呼叫約 3 萬個輸入 token，這個數字就是 S9 檢索與 RAG 要降下來的目標。

**提示**
- TypeScript：Vercel AI SDK 的 `streamText` + `useChat` 可以很快做出介面；它的 telemetry 設定可接 OpenTelemetry（參數名稱隨版本改過，以 Telemetry 頁為準）；本地模型可透過 OpenAI 相容 provider 或 [Ollama community provider](https://ai-sdk.dev/providers/community-providers/ollama)。
- Python：FastAPI + SSE 做後端；LiteLLM 統一雲端與本地呼叫；[OpenLLMetry](https://github.com/traceloop/openllmetry) 或自己用 OpenTelemetry SDK 建 span。
- 不寫前端的話，介面可以全部用 Python 做（時間和網頁版差不多，甚至更少）：
  - [Gradio](https://www.gradio.app/docs/gradio/chatinterface) 的 `gr.ChatInterface`：回應函式寫成 generator、逐段 yield 就是串流；串流時會出現停止鍵（`stop_btn`，預設開啟）；讚 / 倒讚預設不顯示（`flagging_mode` 預設是 `"never"`），設 `flagging_mode="manual"` 才會出現（`flagging_options` 的預設值 Like / Dislike 會顯示成讚 / 倒讚，存成 CSV）；要把回饋連到 trace ID，改用 `gr.Chatbot` 掛 `.like()` 事件自己存。
  - [Chainlit](https://docs.chainlit.io/)：用 `msg.stream_token()` 串流；任務執行中介面有停止鍵，按下會取消任務並呼叫 `@cl.on_stop`；內建的讚 / 倒讚與文字回饋要先開啟 data persistence，或自己做兩個按鈕。
  - [Streamlit](https://docs.streamlit.io/develop/api-reference/write-magic/st.write_stream)：`st.write_stream` 串流、[`st.feedback`](https://docs.streamlit.io/develop/api-reference/widgets/st.feedback) 做讚 / 倒讚；停止會中斷整次腳本執行，比較難確認模型連線有沒有關，要特別用 log 驗證。
  - CLI：Ctrl-C 當停止鍵（攔下 `KeyboardInterrupt` 或取消 asyncio task，再關閉串流連線）；回饋用指令輸入。
  - 不管哪一種，停止都要真的取消後端的模型串流，而不只是畫面不再更新：用 log 的取消時間戳記與最後一個 chunk 的時間戳記確認。
- Trace 後端：[Jaeger](https://www.jaegertracing.io/)（純 tracing）、[Langfuse](https://github.com/langfuse/langfuse) 或 [Phoenix](https://github.com/arize-ai/phoenix)（有 LLM 專用介面），都能在本機用 Docker 跑。
- 成本：用便宜的模型自己日常使用，一週通常在數美元以內；全程用本地模型則免費，只是品質較差。
- 本地模型：用 Ollama 時先調大 context（見上方〈[Ollama 的 context 長度](#ollama-的-context-長度)〉）。步驟 3 的 naive context 可能有數萬 token，要設得比它大，或先只塞部分文件。
- 卡住時：
  - 重讀：[tracing](#-每次呼叫要記下什麼)、[SDK 差異](#-怎麼換-provider-不重寫)
  - 延伸：OpenTelemetry GenAI conventions 的 client inference span 文件、AI SDK 的 Chatbot 頁

**預估**：13 小時

</section>

## 自我檢查

1. 為什麼多輪對話的成本會隨輪數累加？有哪兩種方法可以降低它？（其中一種在 S11 Context engineering。）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：API 無狀態，每輪都重送整段對話；降低方法是讓不變的開頭命中 prompt caching，以及截斷或摘要舊對話。**常見錯法**：以為模型記得上一輪。**回讀**：[一次 API 呼叫長什麼樣？](#-一次-api-呼叫長什麼樣)

   </details>

2. 串流的 HTTP 狀態碼是 200，為什麼你的程式還是要處理錯誤？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：狀態碼在串流一開始就送出了，之後的錯誤會以 `error` 事件出現在串流中間。**常見錯法**：以為 200 就代表整段回答成功。**回讀**：[怎麼讓回答邊產生邊顯示？](#-怎麼讓回答邊產生邊顯示)

   </details>

3. 一個呼叫之後要寄出 email，網路在收到回應前斷線了。直接重試會有什麼問題？要怎麼設計才安全？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：email 可能已經寄出，重試會寄第二封；為動作產生 idempotency key，執行前查是否做過，做過就回傳上次的結果。**常見錯法**：以為重試最多只是多付一次錢。**回讀**：[出錯時該不該重試？](#-出錯時該不該重試)

   </details>

4. 「OpenAI 相容 API」可以讓你換 provider 時完全不改程式嗎？舉兩個可能不同的地方。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：不能保證；例如停止原因的名稱、usage 欄位名稱、系統提示詞與工具呼叫的格式、某些參數是否支援。**常見錯法**：把「相容」當成完全相同。**回讀**：[怎麼換 provider 不重寫？](#-怎麼換-provider-不重寫)

   </details>

5. 情境題：你的團隊想把所有 LLM 測試都設成 temperature 0，然後比對完整輸出字串。你會怎麼回應？（提示：temperature 0 不保證輸出相同，而且有些模型根本不接受這個參數。）請提出替代的測試分層。（理解路線：說出「不比對原文、只檢查性質」的理由即可）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：分層要包含 mock、record / replay、對送出內容做 snapshot、對真實輸出只斷言性質，再加上 flaky 政策（通過率門檻）。**常見錯法**：只說「多跑幾次」而沒有分層。**回讀**：[輸出會變怎麼測試？](#-輸出會變怎麼測試)、[Sampling 參數的限制](#sampling-參數的限制)

   </details>

6. 筆記助理接上 Ollama 後，回答好像完全沒看到前面的筆記，API 也沒有報錯。最可能的原因是什麼？要設定什麼、用什麼指令確認？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：prompt 超過 Ollama 的預設 context，較早的內容被默默丟掉；設定 `num_ctx`，用 `ollama ps` 確認。**常見錯法**：以為沒報錯就代表整段 prompt 都送進去了。**回讀**：[Ollama 的 context 長度](#ollama-的-context-長度)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一站需要的內容。下面的資料適合想查原始規格、看更多細節或換成別的語言與框架的人，都不是必讀。

### 官方文件

- Anthropic API 文件三頁：[Messages](https://platform.claude.com/docs/en/api/messages)、[Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)、[Errors](https://platform.claude.com/docs/en/api/errors) — 完整的請求欄位、所有 SSE 事件類型、每個錯誤碼的說明。用 OpenAI 的話，讀對應的 [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) 與 [Error codes](https://developers.openai.com/api/docs/guides/error-codes)。
- Anthropic [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) 與 OpenAI [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) — 推理模型的參數、計價、多輪時怎麼傳回思考內容。變動很快，以當下版本為準。
- Anthropic [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)、[Rate limits](https://platform.claude.com/docs/en/api/rate-limits)、[Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — 實際的批次流程、各層級的限制與當下單價（必做題的單價設定檔從這裡抄）。
- [Ollama: OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)、[llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)、[mlx-lm](https://github.com/ml-explore/mlx-lm) — 本地模型三種跑法的安裝與參數。
- [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — SSE 格式本身的規則。

### SDK 與框架

- [Vercel AI SDK 文件](https://ai-sdk.dev/docs/introduction) — Introduction、Generating Text、[Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)；TypeScript 做 A6 串流聊天與 trace 的介面最快的路。
- [AI SDK: Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) 與 [Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing) — 在 AI SDK 裡接 OpenTelemetry、用 mock 模型寫測試。
- [AI SDK: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) — 後端怎麼把文字、工具呼叫、自訂資料一起串流給前端；S17 產品與 AI UX 做完整介面時會用到。
- [LiteLLM 文件](https://docs.litellm.ai/docs/)的 Getting Started 與 [Fallbacks](https://docs.litellm.ai/docs/proxy/reliability) — Python 的統一呼叫介面；也可以當 gateway，集中管理金鑰、預算與 fallback（→ S18 部署與架構）。

### 可靠性與可觀測性

- [AWS: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) — 重試與 jitter 的經典說明，不限 LLM，比較了幾種 jitter 的效果。
- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) — idempotency key 在真實支付系統裡的設計。
- [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) — idempotency key 標準化的進度。
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) — 讀 `docs/gen-ai/` 下的 client inference span 與 metrics，有完整的欄位清單。仍在 Development 狀態。
- [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/)（2024-06）— 讀 Operational 部分，實際團隊的經驗談。

### 瀏覽器內模型

- [transformers.js](https://github.com/huggingface/transformers.js)、[WebLLM](https://github.com/mlc-ai/web-llm)、[Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) — ○ 瀏覽器內模型的三種做法。

### 中文資源

- [iThome 2025〈前端工程師的AI應用開發實戰：30天從Prompt到Production〉](https://ithelp.ithome.com.tw/users/20129072/ironman/8834) — 繁中；前端視角的 AI 應用。內容本站沒有逐篇讀過，當輔助讀物。
- [datawhalechina/llm-cookbook](https://github.com/datawhalechina/llm-cookbook) — 簡中；吳恩達系列短課的中文版，〈Building Systems with the ChatGPT API〉可當 API 入門暖身。範例偏舊、以 OpenAI 為主。
- [datawhalechina/base-llm](https://github.com/datawhalechina/base-llm) — 簡中；附錄（Extra-chapter）有一篇以 MiniMax API 為例的 API 呼叫入門（基本對話、串流、多輪、OpenAI 相容）。

</section>
