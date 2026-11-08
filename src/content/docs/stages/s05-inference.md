---
title: S5 推論與 serving
head:
  - tag: title
    content: LLM 推論加速：KV cache 與 serving（S5）｜Token2Agent
description: LLM 推論為什麼慢、怎麼加速：prefill 與 decode、KV cache、GPU 頻寬瓶頸、batching 與 serving 系統，估算記憶體與速度上限，並量測 TTFT、TPOT 等延遲指標。
sidebar:
  order: 5
  label: S5 推論與 serving
---

:::note[這一章]
**⏱ 講義** 首次閱讀約 3 小時，手算與深入內容約 2 小時　**必做題** 約 6 小時　**進階題** 約 21 小時

**前置**：[S2 Transformer 與 decoding](/stages/s02-transformer/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/)（選讀）；只想要成本與延遲的直覺，讀過 [模型速成](/guide/app-first/)就能讀主線　**銜接**：→ [S6 LLM API 與應用基本功](/stages/s06-llm-api/)；prompt caching → [S11 Context engineering](/stages/s11-context-engineering/)；constrained decoding → [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)；自架與 API 的比較 → [S18 部署與架構](/stages/s18-deployment/)
:::

:::tip[理解路線重點]
- 模型讀輸入是一次整段讀，寫回答卻要一個字一個字寫，所以輸出又慢又貴。
- 生成文字的速度多半卡在從記憶體搬模型的速度，而不是運算能力。
- 把很多人的請求一起處理能省錢，但每個人等字出來會稍微慢一點。
:::

## 在做什麼

reasoning model（← [S4 Post-training 與 reasoning](/stages/s04-post-training/)）會多花很多 token 思考，這一章回答這些 token 的成本和延遲從哪裡來：模型怎麼跑、為什麼慢、怎麼變快又省。核心只有一個觀念：生成文字時，瓶頸多半不是算力，而是把權重從記憶體搬出來的速度。從這裡出發，API 為什麼輸出比輸入貴、長 prompt 為什麼第一個字出來得慢、serving 系統為什麼要把很多人的請求綁在一起，都會變得有道理。

## 學完能

- 能用範例數字說明一個請求的時間花在 prefill 還是 decode，以及 KV cache、batching 各解決什麼問題。（講義與自我檢查）
- 解釋為什麼 API 的輸出 token 比輸入 token 貴、為什麼長 prompt 的第一個字出來得比較慢。（必做）
- 給定模型與硬體，估算權重與 KV cache 需要多少記憶體、decode 速度的理論上限。（必做）
- 區分哪些加速方法會改變輸出、哪些不會，並說出各自的代價。（進階）
- 寫出一個最小的推論伺服器，並量測 TTFT、TPOT 與吞吐量。（進階；必做只量 TTFT 與 TPOT）

## 講義

先看全貌。你送出一個請求，模型的工作分成兩段：先一次讀完整段輸入，叫 **prefill**；再一個 token 一個 token 地寫出回答，叫 **decode**。兩段的瓶頸完全不同，「為什麼這麼貴、這麼慢」幾乎都能從這裡解釋。講義先用一個例子把整個請求走一遍，再逐節說明背後的原因。

### ★ 一個例子走完全程

整章都用同一個例子。模型和 GPU 都是虛構的，數字挑成好算的整數；真實的模型和硬體數字不同，但計算方式完全一樣。

| | 設定 |
|---|---|
| 模型「範例 8B」 | 80 億個參數，用 bf16 存（每個參數 2 byte） |
| GPU | 顯示記憶體 48 GB；記憶體頻寬 1,000 GB/s（每秒能從記憶體搬出 1,000 GB）；算力 100 TFLOPS（每秒 100 兆次浮點運算） |
| 請求 | 輸入 2,000 個 token（系統提示詞、對話歷史、問題），模型回答 500 個 token |

依時間順序：

1. **載入**：權重是 80 億 × 2 byte = 16 GB，放進顯示記憶體後還剩 32 GB。
2. **Prefill**：2,000 個輸入 token 一起算。處理一個 token，每個參數大約做 2 次運算（一次乘法、一次加法，← [S2 Transformer 與 decoding](/stages/s02-transformer/)），所以總共 2 × 80 億 × 2,000 = 32 兆次運算。GPU 每秒 100 兆次，約 0.32 秒。
3. **第一個 token 出現**：使用者等了約 0.32 秒（還沒算排隊），這段時間叫 TTFT。
4. **Decode**：之後每產生一個 token，都要把 16 GB 的權重從記憶體讀一遍：16 GB ÷ 1,000 GB/s = 16 毫秒。500 個 token 就是 500 × 16 毫秒 = 8 秒。
5. **算總帳**：讀 2,000 個 token 花 0.32 秒，平均每個 0.16 毫秒；寫 500 個 token 花 8 秒，每個 16 毫秒。輸出 token 比輸入 token 慢 100 倍。

<figure>
<svg viewBox="0 0 640 150" width="640" style="max-width:100%;height:auto;display:block;margin:0 auto" role="img" aria-label="範例請求的時間軸：prefill 一次處理 2,000 個輸入 token，約 0.32 秒，等於 TTFT；之後 decode 每 16 毫秒產生一個 token，這個間隔是 TPOT" font-size="13" fill="currentColor">
<defs><marker id="s5-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="20" y="40" width="320" height="34" rx="4"/>
<rect x="344" y="40" width="13" height="34" rx="2"/><rect x="360" y="40" width="13" height="34" rx="2"/><rect x="376" y="40" width="13" height="34" rx="2"/><rect x="392" y="40" width="13" height="34" rx="2"/><rect x="408" y="40" width="13" height="34" rx="2"/><rect x="424" y="40" width="13" height="34" rx="2"/><rect x="440" y="40" width="13" height="34" rx="2"/><rect x="456" y="40" width="13" height="34" rx="2"/><rect x="472" y="40" width="13" height="34" rx="2"/><rect x="488" y="40" width="13" height="34" rx="2"/><rect x="504" y="40" width="13" height="34" rx="2"/><rect x="520" y="40" width="13" height="34" rx="2"/><rect x="536" y="40" width="13" height="34" rx="2"/><rect x="552" y="40" width="13" height="34" rx="2"/><rect x="568" y="40" width="13" height="34" rx="2"/>
<path d="M20,84 V92 H340 V84 M344,84 V92 H357 V84"/>
<path d="M20,130 H625" marker-end="url(#s5-arrow)"/>
</g>
<g stroke="none">
<text x="180" y="62" text-anchor="middle">prefill：2,000 個輸入 token 一起算</text>
<text x="462" y="30" text-anchor="middle">decode：一次產生 1 個 token</text>
<text x="604" y="62" text-anchor="middle">…</text>
<text x="180" y="110" text-anchor="middle">TTFT ≈ 0.32 秒</text>
<text x="344" y="110">TPOT ≈ 16 毫秒</text>
<text x="625" y="146" text-anchor="end" font-size="12" opacity="0.8">時間</text>
</g>
</svg>
<figcaption>依時間比例畫：prefill 的 0.32 秒剛好等於 20 個 decode 步驟。500 個輸出 token 要走 500 步、約 8 秒，圖只畫了開頭。</figcaption>
</figure>

這 100 倍的差距，就是 API 價目表上輸出單價比輸入貴好幾倍的根源。真實價差沒有 100 倍，因為 serving 系統會把很多人的請求一起 decode，分攤成本（見[怎麼同時服務很多人？](#-怎麼同時服務很多人)）。也看得出 reasoning model 為什麼慢：思考 5,000 個 token，光 decode 就是 5,000 × 16 毫秒 = 80 秒。

上面的時間都是理論下限，實際會再慢一些，原因在[延遲和吞吐量怎麼量？](#-延遲和吞吐量怎麼量)。接下來先回答最關鍵的問題：GPU 每秒能算 100 兆次，為什麼 decode 一個 token 還要 16 毫秒？

### ★ GPU 的速度卡在哪？

GPU 有兩個上限：算得多快（算力），和資料搬得多快（記憶體頻寬）。哪一個先碰到，就決定了速度。

**記憶體分兩層。** 權重和 KV cache 放在顯示記憶體（HBM，也就是常說的 VRAM），容量大，但搬到運算單元要時間。運算單元旁邊還有很小、很快的晶片內記憶體（SRAM），只放得下正在算的一小塊資料。每次計算，資料都要從 HBM 搬到 SRAM 才能算。

**Arithmetic intensity：每搬 1 byte 做幾次運算。** 範例 GPU 每秒能算 100 兆次、能搬 1,000 GB，兩者相除是 100：每搬 1 byte 至少要做 100 次運算，算力才不會閒著。做得比這少，運算單元一直在等資料，叫 **memory-bound**（受頻寬限制）；做得比這多，才是 **compute-bound**（受算力限制）。現代資料中心 GPU 大約要每個 byte 做數百次運算才會吃滿算力。

**套到 LLM 上。** bf16 的每個參數佔 2 byte，處理一個 token 對它做 2 次運算，所以每讀一次權重只處理 1 個 token 的話，intensity 是 1。讀一次權重同時處理 n 個 token，intensity 就是 n。也就是說，**intensity 約等於一次權重讀取被多少個 token 共用**。

| 階段 | 一次權重讀取處理幾個 token | intensity | 範例 GPU 上的狀態 |
|---|---|---|---|
| Prefill（2,000 個輸入 token） | 2,000 | 約 2,000 | 遠超過 100，compute-bound |
| Decode（單一請求） | 1 | 約 1 | 遠低於 100，memory-bound |

Decode 只做了算力上限的約 1/100，其餘時間都在等權重搬過來。這就是 16 毫秒的來源：速度由「權重大小 ÷ 頻寬」決定，和算力幾乎無關。

**容易誤會：GPU 越「強」，生成就越快。** 單一請求的 decode 速度看的是記憶體頻寬，不是 TFLOPS。兩張 GPU 算力差兩倍但頻寬相同，單人聊天時生成速度幾乎一樣。本機跑模型時也一樣：比較機器時先看記憶體頻寬。

<details class="deep">
<summary>深入一點：roofline 公式與這個估算忽略了什麼</summary>

- **Roofline**：把兩個上限畫在同一張圖上，橫軸是 intensity，縱軸是實際能達到的運算速度。intensity 低時，速度隨 intensity 等比例上升（頻寬那條斜線）；過了轉折點（範例 GPU 是 100）就碰到天花板（算力那條水平線）。Decode 落在斜線的最底端。
- **Roofline 公式**：可達到的運算速度 = min（峰值算力，頻寬 × intensity）。轉折點的 intensity = 峰值算力 ÷ 頻寬。
- **忽略的部分**：上面只算了權重。decode 每一步還要讀這個請求的 KV cache（下一節），以及寫入少量中間結果；prefill 還有 attention 分數本身的計算，輸入很長時這部分隨長度的平方成長。
- **規格不等於實際**：官方頻寬與算力是峰值，實際的程式通常達不到；量化格式還要多花一點時間把數值還原（dequantize）。
- **讀官方規格時注意**：算力常以稀疏運算（sparsity）或較低精度標示，數字會比 bf16 的密集運算大好幾倍。

</details>

### ★ KV cache 存什麼、佔多少？

KV cache 把前文算過的中間結果存起來，讓 decode 每一步只需要處理新的 token。代價是記憶體：長對話的 KV cache 可能比模型權重還大。

**為什麼需要。** 沒有快取的話，寫第 501 個 token 時，要把前面 2,500 個 token 全部重算一次；寫第 502 個再重算 2,501 個。工作量隨長度越滾越大。但因為 causal mask（← [S2 Transformer 與 decoding](/stages/s02-transformer/)），前面 token 的 key 和 value 不會被後來的 token 改變，算一次就能一直用。

**存了什麼。** Attention 分成好幾個 head，每一層、每個 head 都要為每個 token 存一個 key 向量和一個 value 向量，每個向量的長度是 head 維度。很多現代模型用 GQA，讓多個 query head 共用同一組 key、value，所以要存的組數是 **KV head 數**，在 `config.json` 裡叫 `num_key_value_heads`。合起來：

> 每個 token 的 KV cache = 2（key 和 value）× 層數 × KV head 數 × head 維度 × 每個數值的 byte 數

**用範例 8B 算一次。** 假設它有 32 層、8 個 KV head、head 維度 128，KV cache 也用 bf16（2 byte）：

- 每個 token：2 × 32 × 8 × 128 × 2 = 131,072 byte（128 KiB，約 0.13 MB）。
- 範例請求（2,000 輸入 + 500 輸出 = 2,500 個 token）：2,500 × 131,072 ≈ 3.3 億 byte，約 0.33 GB。
- 一段 32K（32,768 個）token 的長對話：32,768 × 131,072 ≈ 4.3 GB。

載入權重後剩 32 GB。只看 KV cache 的話，大約能同時放 97 個範例請求，或 7 段 32K 的長對話。如果這個模型沒用 GQA、每層有 32 個 KV head，KV cache 變成 4 倍，一段 32K 對話就要約 17 GB，32 GB 只放得下 1 段。這就是 S2 Transformer 與 decoding 講的 GQA、MLA 要縮小 KV cache 的原因。

**Decode 也要讀 KV cache。** 每產生一個 token，attention 都要回頭看所有前文，所以除了權重，還要把這個請求的整份 KV cache 讀一遍。對話越長，每一步要讀的越多，TPOT 會慢慢變長；但權重通常仍是大頭，所以變化比 TTFT 小得多。

**容易誤會：KV cache 不是把「回答」快取起來。** 它只存這一個請求自己前文的中間結果，請求結束就釋放；兩個使用者問一模一樣的問題，模型仍然各算各的（除非開頭完全相同，用上 prefix caching，見[後面](#-prompt-caching-怎麼運作)）。另一個常見誤會：權重放得進顯示記憶體，不代表跑得動長 context，還要留空間給 KV cache。

<details class="deep">
<summary>準備動手做：從 config.json 估算參數量與 KV cache</summary>

**單位**：KiB = 1,024 byte、GiB = 1,024³ byte；GB = 10⁹ byte。計算器最好輸出 byte 數，再另外換算，免得混用。

**KV cache 要讀的欄位**：`num_hidden_layers`（層數）、`num_key_value_heads`、`head_dim`（沒有這個欄位時，通常是 `hidden_size` ÷ `num_attention_heads`）、`torch_dtype` 或你指定的數值格式。

**參數量**：Llama / Qwen 風格的模型，逐項加總每個矩陣的大小（d = `hidden_size`，h = `num_attention_heads`，h_kv = `num_key_value_heads`，d_h = head 維度，m = `intermediate_size`，V = `vocab_size`，L = 層數）：

| 部分 | 每層的參數 |
|---|---|
| Attention 的 q、輸出矩陣 | d × (h·d_h)，各一個 |
| Attention 的 k、v 矩陣 | d × (h_kv·d_h)，各一個 |
| SwiGLU MLP | 3 × d × m |
| 兩個 RMSNorm | 2 × d（很小） |

再加上 embedding 表 V × d、最後一層 norm，以及輸出層：`tie_word_embeddings` 為 `true` 時輸出層和 embedding 共用同一個矩陣，只算一次；為 `false` 才再加一次 V × d。有些模型還有其他很小的 norm 參數，對「約幾億」的估算影響不大。

**用一個虛構的 config 驗算**：d = 4,096、h = 32、h_kv = 8、d_h = 128、m = 14,336、V = 128,000、L = 32、不共用 embedding。

- 每層 attention：2 × 4,096 × 4,096 + 2 × 4,096 × 1,024 = 41,943,040
- 每層 MLP：3 × 4,096 × 14,336 = 176,160,768
- 每層 norm：8,192；每層合計 218,112,000，32 層共 6,979,584,000
- embedding 與輸出層：2 × 128,000 × 4,096 = 1,048,576,000；最後一層 norm 4,096
- 總計 8,028,164,096，約 80 億，就是範例 8B 的大小。

**陷阱**：有些 checkpoint 即使 config 寫 `tie_word_embeddings: true`，檔案裡仍另存了一份輸出層（lm_head），例如 Qwen3-0.6B。所以不要用檔案大小反推參數量。

**MLA**：DeepSeek 這類用 MLA 的模型存的是壓縮過的向量，上面的 KV 公式不適用，要看 `kv_lora_rank` 等欄位另外算。

</details>

### ★ 怎麼同時服務很多人？

Decode 卡在讀權重，那就讓很多請求共用同一次讀取。這是 serving 系統省錢的核心；難處在於請求長短不一，KV cache 的記憶體又很容易浪費。

**Batching 怎麼省。** 32 個請求一起 decode，每一步權重只讀一次（16 GB），再加上 32 份各自的 KV cache。假設每份平均 0.33 GB：

- 每一步要讀 16 + 32 × 0.33 ≈ 26.6 GB，約 26.6 毫秒，一次產生 32 個 token。
- 吞吐量從單一請求的每秒 62.5 個 token，變成每秒約 1,200 個，每個輸出 token 的成本降到約 1/19。
- 代價：每個人的 TPOT 從 16 毫秒變成 26.6 毫秒。

能加到多大有兩個限制：KV cache 塞滿記憶體（上一節算過，範例請求大約 97 個），或者每步處理的 token 數多到變成 compute-bound（範例 GPU 約 100 個）。

**Static vs continuous batching。** 最簡單的做法是湊滿一批、一起跑到結束，叫 static batching。問題是長度不一：4 個請求分別要輸出 50、100、200、500 個 token，整批要跑 500 步，前三個早就結束的位置只能空轉，實際只用了 (50 + 100 + 200 + 500) ÷ (4 × 500) = 42.5% 的位置。**Continuous batching**（Orca 提出的 iteration-level scheduling）每產生一個 token 就重新排程一次，有請求結束就立刻補進新的，位置幾乎不會空著。

**PagedAttention：KV cache 不要預留整塊。** 早期的做法替每個請求預留一整塊連續空間，大小是它可能用到的最大長度。如果每個請求都預留 32K 的量（4.3 GB），32 GB 只放得下 7 個；但大多數請求實際只用 2,500 個 token，照實際用量可以放 97 個。vLLM 的 PagedAttention 借用作業系統虛擬記憶體的做法，把 KV cache 切成固定大小的 block（例如每塊 16 個 token），用到才配一塊，浪費只剩最後一塊沒填滿的部分；多個請求也能共用相同內容的 block。

**RadixAttention：自動共用前綴。** 很多請求的開頭相同：同一份系統提示詞、同一段多輪對話的前面幾輪、agent 每一步都帶著的工具說明。SGLang 的 RadixAttention 用 radix tree（一種依前綴分支的樹）記錄所有請求的前綴，開頭相同的部分只算一次 KV cache，大家共用。

**常見的 serving 引擎。**

| 引擎 | 適合 | 特色 |
|---|---|---|
| vLLM | 在 GPU 上服務很多使用者 | PagedAttention、continuous batching |
| SGLang | 同上，特別是多輪對話與 agent | RadixAttention 自動重用前綴 |
| llama.cpp、Ollama | 在本機跑模型 | 使用 GGUF 量化格式，Mac 與一般電腦都能跑 |

**容易誤會：batching 讓單一請求變快。** 剛好相反：batching 提高的是整個系統的吞吐量，每個人的 TPOT 會變慢一點。所以 batch 開多大，是成本和延遲之間的取捨。

### ★ 延遲和吞吐量怎麼量？

延遲要分成「第一個字多久出來」和「之後字出來多快」兩件事來量，系統效率則看吞吐量；三者會互相拉扯，報告時還要看最慢的那幾次。

| 指標 | 意思 | 範例的數字 |
|---|---|---|
| **TTFT**（time to first token） | 送出請求到第一個 token 出現，等於排隊 + prefill | 約 0.32 秒（不含排隊） |
| **TPOT**（time per output token） | 之後每個 token 的平均間隔，決定串流文字出現的速度 | 單獨跑 16 毫秒，batch 32 時 26.6 毫秒 |
| **Throughput**（吞吐量） | 整個系統每秒產生的 token 數，代表成本效率 | 單獨跑每秒 62.5 個，batch 32 時約 1,200 個 |
| **Goodput** | 只計算符合延遲目標（SLO）的請求 | 見下方 |

一個請求的總延遲 ≈ TTFT + 輸出 token 數 × TPOT。範例請求在 batch 32 下是 0.32 + 500 × 0.0265 ≈ 13.6 秒，其中 prefill 只佔一小部分，所以縮短輸出通常比縮短輸入更能降低延遲。

**隨 prompt 長度怎麼變。** TTFT 大致和輸入長度成正比：輸入變 4 倍，prefill 的運算量也變 4 倍；輸入很長時，attention 的成本隨長度平方成長（每個 token 都要和前面每個 token 比一次），TTFT 增加得更快。TPOT 對輸入長度不敏感，只因為每步要讀的 KV cache 變多而緩慢增加。

**理論上限和實測的差距。** 「權重大小 ÷ 頻寬」是 decode 速度的上限。實測通常明顯慢於它：實際頻寬達不到規格值、每一步還要讀 KV cache、每一步有固定的程式開銷，量化模型還要還原數值。比較時算「實測 ÷ 理論」的比例，比只看絕對數字更有意義。

**Goodput。** 例如目標是 TTFT 小於 1 秒、TPOT 小於 50 毫秒。系統每秒完成 10 個請求，其中 3 個超過目標，goodput 就是每秒 7 個。把 batch 開大可以讓吞吐量更好看，但違反目標的請求變多，goodput 反而下降。

**P50 與 P99。** P50 是中位數，P99 是「99% 的請求比它快」的那個值。100 個請求裡 98 個 TTFT 是 0.4 秒、2 個是 12 秒：平均約 0.63 秒，看起來不錯；P50 是 0.4 秒，P99 卻是 12 秒。

**容易誤會：平均延遲好，使用者就滿意。** 使用者記得的是最慢的那幾次，所以延遲一定要報 P50 與 P99。TTFT 偶爾暴增時，原因常常不在模型本身，而是排隊：前面剛好有幾個很長的 prompt 在 prefill，或 KV cache 滿了、新請求只能等。

### ★ 加速會改變輸出嗎？

加速方法先分兩類：一類保證輸出和原本一樣（或機率分布相同），另一類用一點品質換速度或記憶體。選用前先問「它屬於哪一類」，就知道需不需要重新評估品質。

| 方法 | 類別 | 怎麼加速 | 代價 |
|---|---|---|---|
| FlashAttention | 不改變輸出 | 重新安排 attention 的計算順序，讓中間結果留在 SRAM，少搬資料；結果和原本數學上相同 | 需要專門的 kernel（在 GPU 上跑的一段專用程式） |
| Prefix caching | 不改變輸出 | 重用相同開頭的 KV cache，跳過那段 prefill | 佔記憶體；開頭要完全相同 |
| Speculative decoding | 不改變輸出分布 | 小模型先猜、大模型一次驗證 | 要多跑一個小模型；猜錯多時沒好處 |
| 量化 | 近似 | 權重用更少的 bit 存，讀得更快、更省記憶體 | 品質可能下降 |
| 蒸餾、剪枝 | 近似 | 換成更小的模型（← [S4 Post-training 與 reasoning](/stages/s04-post-training/) 的蒸餾），或拿掉不重要的權重 | 品質可能下降，還要重新訓練 |

**Speculative decoding。** 利用的正是 decode 的 memory-bound：讀一次權重處理 1 個位置和處理 5 個位置，花的時間差不多。所以讓一個便宜的小模型（draft model）先猜接下來 4 個 token，再讓目標模型（target model）一次檢查這 4 個位置，成本約等於 decode 一步。假設前 3 個猜對：接受這 3 個，再加上目標模型在第一個猜錯的位置自己給出的 1 個，這一輪就得到 4 個 token，原本要走 4 步。經過正確的接受規則（見下方展開），輸出的機率分布和只用目標模型完全相同。猜中率越高越划算；batch 已經很大、GPU 接近 compute-bound 時，這個「驗證幾乎免費」的前提不成立，好處會變小。

**量化。** 範例 8B 改用 4-bit（每個參數 0.5 byte），權重從 16 GB 變成約 4 GB（加上縮放係數會再多一點），decode 上限從每 token 16 毫秒變成約 4 毫秒，還多出空間給 KV cache。常見做法：

- **GPTQ**：逐層調整量化後的權重，讓該層輸出的誤差最小。
- **AWQ**：根據 activation 找出重要的權重通道（權重矩陣的某一欄），加以保護。
- **GGUF**：llama.cpp 使用的檔案格式，包含多種量化等級，是本機跑模型最常見的格式；Ollama 預設下載的模型多半是 4-bit。

**容易誤會：量化只是「差不多」，不用驗證。** 量化後一定要用自己的評估資料重新測品質，不能假設差不多；不同任務受影響的程度不同。另外，4-bit 帶來的 4 倍只是上限，實測會打折扣。

<details class="deep">
<summary>深入一點：speculative decoding 的接受規則與 FlashAttention 的做法</summary>

**接受規則**：對每個猜的 token x，draft model 給它的機率是 q(x)，目標模型給的是 p(x)。以 min(1, p(x) / q(x)) 的機率接受；一旦拒絕，就從 max(0, p − q) 重新 normalize（使總和為 1）後的分布抽一個 token 取代它，並丟掉後面所有猜測。如果全部接受，目標模型在最後一個位置再多給一個 token。可以證明這樣產生的每個 token 都服從目標模型的分布 p。greedy decoding 下規則簡化成：猜的 token 等於目標模型的 argmax 就接受。

**變體**：不一定要另一個模型。有的做法在目標模型上加幾個小的預測頭一次猜多個 token，有的從 prompt 裡找相同的片段當猜測（適合「照抄大段輸入」的任務，例如改寫程式碼）。

**FlashAttention**：一般寫法會先把 L × L 的 attention 分數表完整寫回 HBM，再讀出來做 softmax、乘上 V，搬運量隨長度平方成長。FlashAttention 把 Q、K、V 切成小塊（tiling），每次只把一小塊搬進 SRAM，用「邊算邊更新」的 softmax（online softmax）累積結果，分數表從頭到尾不寫回 HBM。運算次數沒變，搬運大幅減少。浮點運算的順序不同，數值可能有極小的差異，但數學上是同一個結果。

</details>

### ★ Prompt caching 怎麼運作？

兩個 API 功能，背後都是推論層的機制：prompt caching 是 KV cache 的跨請求重用，constrained decoding 是在 decode 的每一步限制候選 token。

**Prompt caching。** API 的 prompt caching 就是 prefix 的 KV 重用：這次請求的開頭和最近某個請求完全相同時，伺服器直接拿出存好的 KV cache，跳過那段 prefill。範例請求的 2,000 個輸入 token 裡，如果前 1,500 個（系統提示詞與工具說明）命中快取，只需要 prefill 剩下的 500 個，TTFT 從 0.32 秒降到約 0.08 秒，那 1,500 個 token 也少了大部分計算，所以有快取的輸入 token 比較便宜。

快取只認完全相同的前綴：開頭改了一個字（例如在系統提示詞最前面放了當下時間），之後的 KV cache 全部不同，整段都要重算；快取也會在一段時間沒用後過期。怎麼安排 context 來提高命中率 → [S11 Context engineering](/stages/s11-context-engineering/)。

**Constrained decoding。** 每一步 decode 時，依照 JSON schema 或文法算出「目前允許哪些 token」，把其他 token 的機率設成 0，再從剩下的候選裡選。例如輸出已經是 `{"title": `，schema 規定 title 是字串，這一步就不能選數字或 `{`，只能選能開始一個字串的 token。所以只要生成正常結束，輸出就符合文法。代價是每一步多一點計算，而且可能把模型推向它本來不太想選的 token（實際使用 → [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）。

**容易誤會：用了 constrained decoding 就保證拿到完整的 JSON。** 輸出被 `max_tokens` 截斷，或模型拒答時，結果仍可能不完整，程式端還是要檢查。

<section class="deep-section">

### ○ 大規模 serving 還有什麼？

既然 prefill 和 decode 的特性完全不同（一個 compute-bound、一個 memory-bound），可以把它們放到不同的 GPU 上，各自調整，叫 prefill / decode disaggregation（例如 DistServe、Mooncake）。KV cache 也可以分層存放：Mooncake、LMCache 等系統把暫時用不到的 KV cache 移到 CPU 記憶體或硬碟，需要時再搬回來，比重新 prefill 便宜。CacheBlend 則讓不在開頭的段落（例如 RAG 的檢索結果）也能重用預先算好的 KV cache。想自己寫 FlashAttention 這類 kernel，要學 CUDA 或 Triton。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** GPU 甲：算力 200 TFLOPS、頻寬 1,000 GB/s；GPU 乙：算力 100 TFLOPS、頻寬 2,000 GB/s。跑範例 8B（16 GB 權重）給單一使用者聊天，哪一張生成文字比較快？哪一張第一個字出來比較快（輸入 2,000 token，同講義範例）？

<details class="hint">
<summary>對照答案</summary>

生成（decode）看頻寬：甲每個 token 16 毫秒，乙 8 毫秒，乙快一倍。第一個字（prefill，2,000 個輸入 token）看算力：甲約 0.16 秒，乙約 0.32 秒，甲比較快。

</details>

**2.** 一個請求輸入 4,000 個 token、輸出 200 個 token，另一個輸入 200 個、輸出 4,000 個。用範例的數字估算，哪一個的總延遲比較長？為什麼？

<details class="hint">
<summary>對照答案</summary>

第一個：prefill 約 0.64 秒 + decode 200 × 16 毫秒 = 3.2 秒，共約 3.8 秒。第二個：prefill 約 0.03 秒 + decode 4,000 × 16 毫秒 = 64 秒。第二個長得多：輸出 token 一個一個寫，每個都要讀一次權重；輸入是一起算的。

</details>

### 必做：推論計算器與本機實測

**目標**：用公式預測推論的記憶體與速度，再用實測驗證，建立對數字的直覺。

**步驟**
1. 寫一個計算器：輸入模型的 `config.json`（層數、hidden size、attention head 數、KV head 數、head 維度、MLP 中間層大小 `intermediate_size`、詞彙表大小、輸入輸出 embedding 是否共用 `tie_word_embeddings`）、數值格式、context 長度，輸出參數量估計、權重大小、每個 token 的 KV cache 大小、指定長度的 KV cache 總量。
2. 再輸入硬體的記憶體頻寬，輸出 decode 速度的理論上限（頻寬 ÷ 每個 token 需讀取的權重 byte 數）。
3. 用 [Qwen3-0.6B 的 config](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json) 驗算，再挑一個你有興趣的模型。
4. 在本機用 Ollama（或 llama.cpp）跑一個小模型，對同一個 prompt 生成 128 個 token，重複 20 次，從回應中取出 prefill 與 decode 的時間。
5. 用 4 種長度的 prompt（例如約 256、1K、4K、8K token）各跑 5 次，記錄 TTFT 與 TPOT。

**驗收**
- 計算器對 Qwen3-0.6B（bf16）算出每個 token 的 KV cache 為 114,688 bytes，參數量約 6 億（輸入與輸出 embedding 只算一次）。
- 一張表：理論 decode 上限、實測 TPOT 的中位數與 P90、兩者比例，並寫一句話解釋差距。
- 一張圖：TTFT 對 prompt 長度；說明 TTFT 和 TPOT 各自隨 prompt 長度怎麼變化，以及原因。

**提示**
- TypeScript：用 `fetch` 呼叫 Ollama 的 HTTP API，計算器本身不需要套件。
- Python：`requests` 或 `ollama` 套件；`config.json` 用 `json` 讀即可。
- Ollama 的 [API](https://docs.ollama.com/api/usage) 會回傳 `prompt_eval_count`、`prompt_eval_duration`、`eval_count`、`eval_duration`（單位是奈秒）。注意 `prompt_eval_duration` 只算沒被快取的 prompt token，所以每次要換一點 prompt 內容。
- 用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）：預設可能只有 4K，步驟 5 的 4K、8K prompt 一定會碰到。
- 記憶體頻寬查官方規格：Apple Silicon 寫在各機型的技術規格頁，NVIDIA 寫在 GPU 的 datasheet。
- 量化過的模型（例如 Ollama 預設的 4-bit），每個參數不是 2 bytes，計算上限時要換算。
- 卡住時：
  - 重讀：[KV cache](#-kv-cache-存什麼佔多少)（含「準備動手做」的參數量算式）、[GPU 的速度卡在哪？](#-gpu-的速度卡在哪)、[延遲和吞吐量怎麼量？](#-延遲和吞吐量怎麼量)
  - 延伸：zero-to-sglang Part I 的「Introduction to Inference」與「KV Cache」兩章

**預估**：6 小時

<section class="deep-section">

### 進階：模型專案 M5：KV cache、量化與 mini 推論伺服器

**目標**：在 Qwen3-0.6B 上自己實作推論的關鍵元件，並用實測數字說明每個元件的效果。

**步驟**
1. 載入 [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) 的權重，自己寫生成迴圈（先不用 KV cache）。
2. 加上 KV cache，比較生成 256 個 token 的時間。
3. 實作或套用權重量化（例如 int8 per-channel，再試 4-bit），比較品質、記憶體、TTFT、TPOT。品質用固定的 held-out 文字算 perplexity，或用 100 題有標準答案的題目算準確率。
4. 做一個 HTTP 推論伺服器，先用 static batching，再改成 continuous batching。
5. 寫一個負載測試工具，在並行數 1、4、16 下量測吞吐量與 TTFT 的 P50 / P99。
6. 讀 [nano-vllm](https://github.com/GeeeekExplorer/nano-vllm)（約 1,200 行），把你的實作和它對照，列出它有而你沒有的最佳化。

**驗收**
- 正確性：20 個 prompt 在 greedy decoding、fp32 精度下，有無 KV cache 的輸出完全相同。
- bf16：用 fp32 版生成的 token 序列當固定輸入（teacher forcing），比較兩種路徑每一步轉成 fp32 後的 log-softmax，報告最大絕對差（不設 1e-2 這類固定門檻：logit 在 10–30 時，bf16 相鄰兩個可表示值就差 0.06–0.125）；argmax 一致的步數 ≥ 99%；不一致的步，前兩名 token 的機率差應 < 0.05（bf16 的浮點誤差會讓幾乎同分的候選互換，這不是 bug）。
- 一張量化前後的表：品質指標、權重記憶體、TTFT、TPOT。
- 一張 static vs continuous batching 的表：三種並行數下的吞吐量與 P50 / P99 TTFT。
- 一份對照清單：nano-vllm 的至少 3 個最佳化，以及各自解決什麼問題。

**提示**
- Python：PyTorch、`transformers`（只用來載入權重與 tokenizer）、FastAPI 或任何 HTTP 框架。
- **算力**：正確性可以在 CPU 上驗證，但延遲與吞吐量的數字要在 NVIDIA GPU 上量才有意義，Mac 的 MPS 不適合這一步。租用 GPU 的費用通常比 M4 小模型後訓練（[代號說明](/guide/how-to-use/#代號怎麼讀)）低，但仍請先實測。詳見[模型專案總覽](/projects/model-thread/)。
- 這一步的實測結果會在 S18 部署與架構用來和 API 比較成本。
- 卡住時：
  - 重讀：[KV cache](#-kv-cache-存什麼佔多少)、[batching](#-怎麼同時服務很多人)、[加速方法](#-加速會改變輸出嗎)
  - 延伸：zero-to-sglang Part II 的 KV Cache、Continuous Batching、Paged KV Cache 三章

**預估**：21 小時

</section>

## 自我檢查

1. 為什麼 decode 是 memory-bound？把 batch 加大為什麼能提高吞吐量？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：單一請求每個 token 都要讀一遍全部權重，intensity 約 1，遠低於 GPU 需要的約 100；batch 讓多個 token 共用同一次讀取。**常見錯法**：以為 batch 讓每個人都變快。**回讀**：[GPU 的速度卡在哪？](#-gpu-的速度卡在哪)

   </details>

2. 一個模型要服務 32K token 的長對話，記憶體除了權重還要算什麼？怎麼估？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：KV cache = 2 × 層數 × KV head 數 × head 維度 × byte 數 × token 數；範例 8B 的一段 32K 對話約 4.3 GB，同時服務幾段就乘幾倍。**常見錯法**：只算權重，忘了 KV cache 隨 token 數成長。**回讀**：[KV cache 存什麼、佔多少？](#-kv-cache-存什麼佔多少)

   </details>

3. FlashAttention 和 int4 量化都能讓推論變快，它們在「是否改變輸出」上有什麼差別？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：FlashAttention 只改計算順序，數學上結果相同；int4 量化是近似，品質可能下降，要用自己的評估資料重測。**常見錯法**：把兩者都當成「品質不變」的加速。**回讀**：[加速會改變輸出嗎？](#-加速會改變輸出嗎)

   </details>

4. 為什麼 API 對「有快取的輸入 token」收比較便宜的價格？什麼情況下快取會失效？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：命中的前綴直接拿存好的 KV cache，跳過 prefill 的計算；前綴改了任何一個字（例如最前面放了時間），或一段時間沒用而過期，就失效。**常見錯法**：以為快取存的是「回答」。**回讀**：[Prompt caching 怎麼運作？](#-prompt-caching-怎麼運作)

   </details>

5. 情境題：你的聊天服務平均延遲很好，但使用者抱怨偶爾要等十幾秒才看到第一個字。你會看哪些指標、懷疑哪些原因？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：看 TTFT 的 P99 而不是平均；懷疑排隊：前面有很長的 prompt 在 prefill，或 KV cache 滿了新請求只能等。**常見錯法**：只看平均，或直接怪模型太慢。**回讀**：[延遲和吞吐量怎麼量？](#-延遲和吞吐量怎麼量)

   </details>

6. 把範例 8B 的權重換成 int8（每個參數 1 byte），KV cache 維持 bf16。一段 32K token 的對話，權重和 KV cache 各要多少記憶體？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：權重減半成 8 GB；KV cache 和權重格式無關，仍約 4.3 GB。**常見錯法**：把 KV cache 也跟著減半。**回讀**：[KV cache 存什麼、佔多少？](#-kv-cache-存什麼佔多少)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看原始出處、對照真實系統、或跟著別人一步一步寫推論伺服器的人，都不是必讀。

### 跟著寫程式

- [vLLM](https://github.com/vllm-project/vllm) 與 SGLang 的原始碼：讀完 nano-vllm 後，可以挑一個模組（scheduler 或 KV cache manager）對照真實系統怎麼處理講義略過的細節。

### 原始論文與綜述

- [Kwon et al. 2023, Efficient Memory Management for LLM Serving with PagedAttention](https://arxiv.org/abs/2309.06180) — vLLM 論文。第 1–3 節量化了 KV cache 預留整塊的浪費，第 4.1–4.3 節是 PagedAttention 與 KV cache manager 的完整設計。
- [Yu et al. 2022, Orca](https://www.usenix.org/conference/osdi22/presentation/yu)（OSDI '22）— continuous batching 的出處，含排程的細節。
- [Zheng et al. 2023, SGLang](https://arxiv.org/abs/2312.07104) — RadixAttention 的出處，說明前綴樹怎麼管理與淘汰。
- [Dao et al. 2022, FlashAttention](https://arxiv.org/abs/2205.14135) — IO-aware 的精確 attention，有完整的分塊演算法與搬運量分析。
- [Leviathan et al. 2022, Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) — 接受規則為什麼不改變輸出分布的證明，以及加速比的分析。
- [Welleck et al. 2024, From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) — 推論時演算法的完整綜述，含 speculative decoding 與效率。

### 書與概覽

- [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation)（2025-02）— 推論加速（Accelerating inference）一節約 1 小時，同樣把加速方法分成會近似輸出與不改變輸出兩類，列出更多方法。
- Chip Huyen《AI Engineering》（付費書）第 9 章（Inference Optimization）— [配套 repo](https://github.com/chiphuyen/aie-book) 有摘要。從應用工程師的角度看完整的推論最佳化地圖。

### 課程

- [CMU 15-442 ML Systems](https://mlsyscourse.org/schedule)、[CMU 11-868 LLM Systems](https://llmsystem.github.io/llmsystem2026spring/docs/Syllabus) — GPU 與 serving 系統的講次與論文清單；P/D disaggregation（DistServe、Mooncake）、KV cache 分層（Mooncake、LMCache）與非前綴 KV 重用（CacheBlend）的論文都在 11-868 的清單中。
- [MIT 6.5940 TinyML and Efficient AI](https://hanlab.mit.edu/courses/2024-fall-65940) — 量化 lab 與「在筆電上部署 LLM」的 lab。
- [Stanford CS25 Transformers United V6](https://web.stanford.edu/class/cs25/) — Charles Frye（Modal）談 production serving 的講座。

### 中文資源

- [datawhalechina/zero-to-sglang](https://github.com/datawhalechina/zero-to-sglang) — 簡中 / 英文；Datawhale 與 RadixArk（SGLang 團隊創立的公司）合作的課程，部分章節由 SGLang 核心成員撰寫。Part I（概念，不需 GPU）與 Part II（自己寫 mini-sglang）是本章最好的中文搭配；Part III 只有部分章節完成，其餘仍在撰寫中。
- [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) — 簡中；第 6 章（GPU 與 FlashAttention）、第 7 章（GPU 程式設計與 Triton）、第 10 章（KV cache、speculative decoding、量化、continuous batching）。

</section>
