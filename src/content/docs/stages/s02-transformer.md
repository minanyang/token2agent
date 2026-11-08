---
title: S2 Transformer 與 decoding
head:
  - tag: title
    content: Transformer 原理：attention 與 decoding（S2）｜Token2Agent
description: Transformer 原理入門：tokenizer、attention 與 GPT 的結構，文字怎麼一個 token 一個 token 生成，temperature、top-p 怎麼影響輸出，以及怎麼估算參數量與記憶體。
sidebar:
  order: 2
  label: S2 Transformer 與 decoding
---

:::note[這一站]
**⏱ 講義** 首次閱讀約 2 小時，手算與深入內容約 4 小時　**必做題** 約 8 小時　**進階題** 約 21 小時

**前置**：[S1 神經網路基礎](/stages/s01-neural-networks/)　**銜接**：→ [S3 Pretraining 與 scaling](/stages/s03-pretraining/)。本站屬於選修的深入路線；走[應用路線](/guide/app-first/)的人，模型速成已涵蓋 S6 LLM API 與應用基本功需要的 token 與 sampling 概念
:::

:::tip[理解路線重點]
- 文字先被切成 token；token 不等於字或詞，很多怪現象出自切法。
- 模型每一層都回頭參考整段前文（attention），算出下一個 token 的機率。
- 回答是一個 token 一個 token 生成的，每次依規則從機率裡挑一個。
:::

## 在做什麼

這一站打開 LLM 的內部。S1 神經網路基礎的模型只看固定長度的前文，這一站要回答：怎麼讓模型同時參考整段前文、又能在 GPU 上平行訓練？答案是 Transformer。講義依資料流動的順序走一遍：文字先被 tokenizer 切成 token，經過一層層 attention 與 MLP，變成下一個 token 的機率，再由 decoding 規則挑出一個。最後學會估算任何模型的參數量、計算量與記憶體。

## 學完能

- 能畫出文字到下一個 token 的流程，並解釋 attention、mask 與 sampling 各做了什麼。（講義與自我檢查）
- 能手算一次 BPE 合併、一個位置的 attention 輸出，以及權重在不同格式下佔多少記憶體。（講義與自我檢查）
- 解釋 temperature、top-k、top-p 對輸出的影響，並為不同用途選擇設定。（必做）
- 自己組出一個 Llama 風格的小模型，訓練它並生成文字。（進階）
- 看一份新模型的架構說明（config 或技術報告），說出它和標準 GPT 差在哪裡。（進階；S5 推論與 serving 的必做題也會讀 config）
- 給定模型大小，估算參數量、每個 token 的計算量、權重需要多少記憶體。（進階；參數量與權重大小在 S5 推論與 serving 的必做題也會練到）

## 講義

先看全貌。GPT 類模型（decoder-only Transformer）處理文字的流程如下：

<figure>
<svg viewBox="0 0 360 550" width="360" style="max-width:100%;height:auto;display:block;margin:0 auto" role="img" aria-label="GPT 的資料流：token ID 經過 embedding、N 個 block（各含 attention 與 MLP，外加 residual）、最後的 norm、輸出層與 softmax，得到下一個 token 的機率" font-size="13" fill="currentColor">
<defs><marker id="s2-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="60" y="10" width="240" height="34" rx="6"/>
<rect x="60" y="60" width="240" height="34" rx="6"/>
<rect x="28" y="110" width="304" height="196" rx="8" stroke-dasharray="6 4" opacity="0.7"/>
<rect x="60" y="130" width="240" height="34" rx="6"/>
<circle cx="180" cy="197" r="10"/>
<rect x="60" y="222" width="240" height="34" rx="6"/>
<circle cx="180" cy="279" r="10"/>
<rect x="60" y="340" width="240" height="34" rx="6"/>
<rect x="60" y="390" width="240" height="34" rx="6"/>
<rect x="60" y="440" width="240" height="34" rx="6"/>
<rect x="60" y="490" width="240" height="34" rx="6" stroke-dasharray="6 4"/>
<path d="M180,44 V58 M180,94 V128 M180,164 V185 M180,207 V220 M180,256 V267 M180,289 V338 M180,374 V388 M180,424 V438 M180,474 V488" marker-end="url(#s2-arrow)"/>
<path d="M180,115 H44 V197 H168" stroke-dasharray="3 3" marker-end="url(#s2-arrow)"/>
<path d="M180,212 H316 V279 H192" stroke-dasharray="3 3" marker-end="url(#s2-arrow)"/>
</g>
<circle cx="180" cy="115" r="3"/><circle cx="180" cy="212" r="3"/>
<g text-anchor="middle" stroke="none">
<text x="180" y="32">文字 → tokenizer → token ID</text>
<text x="180" y="82">token embedding（＋位置資訊）</text>
<text x="180" y="152">Norm → masked self-attention</text>
<text x="180" y="202">+</text>
<text x="180" y="244">Norm → MLP</text>
<text x="180" y="284">+</text>
<text x="180" y="362">最後一層 Norm</text>
<text x="180" y="412">輸出層：向量 → logits</text>
<text x="180" y="462">softmax → 下一個 token 的機率</text>
<text x="180" y="512">decoding 挑一個，接到文字後面再跑</text>
</g>
<g stroke="none" font-size="12" opacity="0.8">
<text x="322" y="298" text-anchor="end">× N 個 block</text>
<text x="48" y="190">residual</text>
<text x="252" y="268">residual</text>
</g>
</svg>
<figcaption>虛線框裡的 block 重複 N 次（GPT-2 small 是 12 次）。虛線箭頭是 residual 連接：把 Norm 之前的輸入 x 直接加到子層的輸出上。</figcaption>
</figure>

### ★ 一個例子走完全程

先用一句話「我愛貓」，看模型怎麼產生下一個 token。下面的切法和數字都是教學用的示意，不是真實模型的值。

1. **切成 token**：tokenizer 把文字切成「我」「愛」「貓」，查詞彙表得到 ID，例如 [12, 85, 47]。ID 只是編號，像座號一樣，數字大小沒有意義。
2. **查表變成向量**：模型有一張 embedding 表，每個 token 一列，每列是一個 d 維向量。ID 12 就是取第 12 列。真正送進模型的是這些向量，不是 ID。再加上位置資訊，模型才知道誰在前、誰在後（現代模型改在 attention 裡處理，見「現代模型換了哪些零件」）。
3. **Attention 混合前文**：在「貓」這個位置，attention 回頭看「我」「愛」「貓」，依相關程度把它們的資訊加權混合。輸出仍然是每個位置一個 d 維向量，只是內容已經帶有前文的資訊。
4. **MLP 加工**：每個位置的向量各自通過同一個小網路，再加工一次。
5. **重複 N 次**：attention 加 MLP 合起來是一個 block，GPT 把 block 疊 N 層（GPT-2 small 是 12 層）。
6. **輸出層變成分數**：生成時拿最後一個位置（「貓」）的向量，乘上輸出層，得到詞彙表裡每個 token 一個分數，叫 logits（訓練時每個位置都算，見 causal mask 一段）。為了好算，假設詞彙表只有三個 token：「咪」2.0、「。」1.0、「狗」0.0。
7. **挑出下一個 token**：softmax 把分數變成機率，約 [0.665, 0.245, 0.090]，再由 decoding 規則挑一個。假設挑到「咪」，就用「我愛貓咪」再跑一次，產生再下一個 token（實際上前面算過的部分會存起來，不用重算，→ [S5 推論與 serving](/stages/s05-inference/)）。

有兩個銜接最容易卡住：**ID 只是索引，embedding 才是模型的輸入**；**attention 和 MLP 產生的都是向量，只有最後的輸出層才把向量變成詞彙表上的分數**。

接下來各節依序放大這些步驟：步驟 1 是 tokenization，步驟 2–6 是 Transformer，步驟 7 是 decoding。

### ★ 文字怎麼變成 token？

Tokenizer 決定模型的輸入單位。切法會直接影響成本，也是很多「模型怪毛病」的來源。

**為什麼要 subword。** 以字元為單位，序列太長；以單字為單位，詞彙表會大到不實際，而且沒看過的字無法表示。現代 LLM 取中間：常見的字串變成一個 token，罕見的字串拆成幾個小片段。最常用的切法是 BPE（Byte Pair Encoding）。

**BPE 分兩個階段：先學合併規則，再用規則切文字。** 學規則時，從最小的單位開始，反覆把「最常相鄰出現的一對」合併成新單位。以字串 `aabaabaac` 為例：

| 步驟 | 最常出現的一對 | 合併成 | 結果 |
|---|---|---|---|
| 0 | | | `a a b a a b a a c` |
| 1 | `aa`（3 次） | `X` | `X b X b X c` |
| 2 | `Xb`（2 次，和 `bX` 平手，取先出現的） | `Y` | `Y Y X c` |

實際訓練是合併到指定次數（也就是目標詞彙表大小）為止，現代模型通常是數萬到二十幾萬個 token；這個例子就先停在這裡。學到的是一串有順序的規則（`aa→X`、`Xb→Y`）。之後切新文字（encode）時，按同樣的順序套用這些規則，不會重新統計哪一對最常出現。例如 `aabaac`：先套 `aa→X` 得到 `X b X c`，再套 `Xb→Y` 得到 `Y X c`。

**從 byte 開始。** Unicode 有十幾萬個字元，很多幾乎不出現在訓練資料裡。所以現代 LLM 大多從 UTF-8 的 byte 開始合併：基本單位只有 256 個，任何文字（中文、emoji、程式碼）都能表示。一個中文字在 UTF-8 通常佔 3 個 byte（例如「你」是 `E4 BD A0`）。tokenizer 學合併規則的資料裡中文多，「你」就可能被合併成一個 token；不夠多，一個字可能要 2–3 個 token。所以同一句話，中文在某些 tokenizer 上 token 數特別多，既貴又佔 context；新一代多語 tokenizer 的差距小得多。

**容易誤會：token 不等於字，也不等於詞。** 很多看起來是「模型不夠聰明」的問題，其實和切法有關：

- **數不清字母**：「strawberry」可能被切成 2–3 個 token，輸入單位不對應單一字母，逐字母計數因此更難。
- **算術不穩**：例如有的 tokenizer 由左往右每 3 位切一塊。算 `12345 + 678` 時，前者切成 `123|45`、後者是 `678`，最後一塊一個代表兩位數、一個代表三位數，位數對不上，對位相加就變難。
- **句尾空白**：空白通常黏在下一個字的前面（「 world」是一個 token），所以 prompt 以空白結尾是訓練時很少見的狀態，輸出可能變差。

<details class="deep">
<summary>準備動手做：實作 BPE 前要知道的事</summary>

- **新 token 的 ID**：上表的 X、Y 實際上是新的 ID。0–255 留給原本的 byte，第一個合併得到 256，接著 257……。
- **Decode**：查一張「ID → bytes」的表。每個新 ID 的 bytes，就是它合併的那兩個 ID 的 bytes 接起來；最後把 bytes 依 UTF-8 轉回文字。
- **先粗切再合併**：實際的 tokenizer 會先用規則（regex）把文字切成片段，片段會把前面的空白一起帶著，例如「 hello」是一塊。合併不跨越片段，所以「 hello」和「hello」是不同的 token。
- **特殊 token**：`<|endoftext|>` 這類 token 不經過 BPE，直接對應保留的 ID，用來標示文件結尾、對話角色等（chat template 就靠它們，← [模型速成](/guide/app-first/#chat-template)）。
- **byte fallback**：有些模型（例如 Llama 1/2）不是純 byte-level，而是遇到沒看過的字元才退回 byte。

</details>

### ★ Attention 怎麼參考前文？

**為什麼不用 RNN。** RNN 一次讀一個 token，把讀過的內容壓進一個固定大小的向量。所有前文都擠在同一個向量裡，越遠的資訊越容易被蓋掉；而且第 t 步要等第 t−1 步算完，訓練無法平行。

**注意力（self-attention）怎麼運作。** 不把前文壓成一個向量，而是讓每個位置直接回頭看所有位置，挑出相關的內容。可以想成查資料：每個 token 的向量 x 乘上三個學出來的矩陣（向量乘矩陣：每個輸出數字都是 x 各分量的一組加權總和，權重就是矩陣，← [S1 神經網路基礎](/stages/s01-neural-networks/)），得到三個向量：

- **query（q）**：我在找什麼樣的資訊。
- **key（k）**：我這裡有什麼樣的資訊，用來被比對。
- **value（v）**：如果你選中我，我提供的內容。

同一個 token 的 q、k、v 由三個不同的矩陣算出，所以數值彼此不同。位置 i 的輸出分四步算：q_i 和每個位置的 k_j 做內積（對應位置相乘再相加，例如 [1, 0] · [1, 1] = 1 × 1 + 0 × 1 = 1；← [數學補給](/guide/math-refresher/#內積與-cosine-相似度)），得到相似度分數；除以 √d_k（d_k 是 key 的維度。維度越高，內積越容易很大，除掉之後 softmax 才不會把權重全壓在一個位置）；做 softmax 變成權重；用權重對所有 v_j 加權平均。

回到「我愛貓」，算「貓」這個位置（向量取 2 維，數字是示意）。「貓」的 query 是 [1, 0]；三個位置的 key 是「我」[1, 0]、「愛」[0, 1]、「貓」[1, 1]，value 是「我」[1, 0]、「愛」[0, 1]、「貓」[0.5, 0.5]：

| 被看的 token | q · k | ÷ √2 | softmax 權重 |
|---|---|---|---|
| 我 | 1 | 0.707 | 0.401 |
| 愛 | 0 | 0 | 0.198 |
| 貓 | 1 | 0.707 | 0.401 |

輸出 = 0.401 × [1, 0] + 0.198 × [0, 1] + 0.401 × [0.5, 0.5] ≈ [0.60, 0.40]。「愛」的 key 和 query 垂直（內積為 0），所以它的內容被拿得最少。這個輸出是一個新的向量，會繼續往下一層送。產生 q、k、v 的三個矩陣是學出來的：模型在訓練中自己決定「什麼該和什麼比對」。

<details class="deep">
<summary>準備動手做：寫成矩陣，以及為什麼除以 √d_k</summary>

- **矩陣形式**：把 L 個位置的 q 疊成 L × d_k 的矩陣 Q（K、V 同理）。QKᵀ 是一張 L × L 的分數表，第 i 列第 j 欄是 q_i · k_j；除以 √d_k、每列做 softmax，再乘上 V，每個位置就得到一個輸出向量。整個 attention 寫成一行：softmax(QKᵀ / √d_k)·V。
- **為什麼除以 √d_k**：內積是 d_k 項相加，維度越高，分數的分散程度越大。d_k = 64 時，隨機向量（每個分量變異數 1）的內積標準差約 8，softmax 幾乎會把全部權重給分數最高的位置，梯度幾乎為 0，訓練變得很慢。除以 √d_k 把分數拉回標準差約 1。

</details>

**Causal mask：只能看過去。** 語言模型要預測下一個 token，所以每個位置只能看自己和前面的位置。做法是在 softmax 之前把未來位置的分數設成負無限大，權重就變成 0。每一列是「誰在看」，每一欄是「被看的 token」：

| | 我 | 愛 | 貓 |
|---|---|---|---|
| **我** | ✓ | ✗ | ✗ |
| **愛** | ✓ | ✓ | ✗ |
| **貓** | ✓ | ✓ | ✓ |

例如算「愛」這個位置（query 也取 [1, 0]）：只有「我」「愛」參與，分數 1、0，除以 √2 再做 softmax，權重約 [0.670, 0.330]，輸出 ≈ [0.67, 0.33]。不加 mask 時「貓」也會分走 0.401，三者是 [0.401, 0.198, 0.401]。

如果拿掉 mask，訓練時每個位置都能直接看到答案（下一個 token），loss 降得很漂亮，模型卻只學會抄答案；到了生成時未來的 token 還不存在，輸出就會亂掉。

有了 mask，訓練時一段長度 L 的序列可以一次平行算出 L 個位置的預測，等於同時練習 L 題（「我 → 愛」、「我 愛 → 貓」……），這是 Transformer 比 RNN 好訓練的關鍵。生成時則只用最後一個位置的預測，而且要一個 token 一個 token 來（→ [S5 推論與 serving](/stages/s05-inference/)）。

**Multi-head。** 一組 q、k、v 只能表達一種「該看誰」的關係，但語言裡同時有很多種：代名詞指誰、動詞的主詞是誰。所以把每個 token 的 q、k、v 向量各切成 h 段，各做一次 attention，接回來後再乘一個輸出矩陣，把各 head 的結果混合。GPT-2 small 的向量是 768 維，切成 12 個 head，每個 64 維。

**位置資訊。** Attention 只看內容相不相關，本身不知道順序，「狗咬人」和「人咬狗」在它眼中幾乎一樣。所以要另外加入位置資訊：GPT-2 為每個位置學一個向量，加到 token embedding 上；現代模型多半改用 RoPE（見「現代模型換了哪些零件」）。

**組成一個 block。** 對照開頭的圖，一個 block 有四個零件：

- **Attention**：讓 token 之間交換資訊。
- **MLP**（也叫 feed-forward）：每個 token 各自加工，先把維度放大 4 倍、經過非線性函數、再縮回來。一般認為模型學到的很多知識存在這裡。
- **殘差連接**（residual connection）：把輸入直接加到子層的輸出上（x + f(x)），梯度可以沿這條捷徑傳回前面的層，幾十層才訓練得動。
- **Normalization**（例如 LayerNorm 或 RMSNorm）：在每個子層之前把向量的數值尺度拉回穩定範圍。

### ★ 怎麼挑出下一個 token？

模型只給出下一個 token 的分數，decoding 決定實際選哪個。同一個模型，設定不同，輸出可以差很多。

**Greedy**：每次挑機率最高的。穩定，但容易陷入重複（「我覺得很好，我覺得很好……」），而且每步都挑最好的，不代表整句最好。

**Temperature**：依機率隨機抽之前，先把 logits 除以 T。用步驟 6 的分數「咪」2.0、「。」1.0、「狗」0.0：

| T | 咪 | 。 | 狗 |
|---|---|---|---|
| 0.5 | 0.867 | 0.117 | 0.016 |
| 1 | 0.665 | 0.245 | 0.090 |
| 2 | 0.506 | 0.307 | 0.186 |

T 小於 1 讓分布更集中；T 大於 1 讓分布更平均、更多變化；T 趨近 0 就等於 greedy。**容易誤會：降低 temperature 只是讓輸出更集中、更穩定，不代表答案更正確。** 模型本來就給錯答案最高分時，低溫只會更穩定地答錯。

**Top-k**：只在機率最高的 k 個候選裡抽。問題是 k 固定：模型很有把握時，k = 50 仍留下 49 個不該選的候選；模型沒把握時，k = 5 又太少。例如沿用下面 top-p 例子的機率 [0.5, 0.3, 0.15, 0.05]、k = 2：只留前兩個，重新換算成 [0.625, 0.375]。

**Top-p（nucleus sampling）**：由高到低累加機率，加到 p 為止，只在這些候選裡抽。例如機率 [0.5, 0.3, 0.15, 0.05]、p = 0.9：前兩個加起來 0.8 還不夠，加上第三個是 0.95，所以保留前三個，重新換算成總和為 1 的機率 [0.526, 0.316, 0.158]，第四個永遠抽不到。候選數會隨模型的把握程度自動伸縮，所以通常比 top-k 好用。

**怎麼選。** 需要較集中、較穩定輸出的任務（資料擷取、分類、程式碼），可以先從低 temperature 或 greedy 開始，正確率另用 eval 確認（→ S8 Eval 方法論）；要多樣性的任務（發想、寫作）用較高的 temperature 加上 top-p 約 0.9–0.95，擋掉機率極低的胡言亂語。temperature 設成 0 也不保證每次輸出完全相同，伺服器端的批次處理與浮點運算都可能造成差異（→ [S6 LLM API 與應用基本功](/stages/s06-llm-api/)）。

這些就是 API 裡 `temperature`、`top_p` 參數的意思。部分 API 已不接受它們（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#sampling-參數的限制)），這時改用 prompt 指示，或用 structured output（要求模型照指定的 JSON 格式輸出，→ [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）來控制輸出。

<details class="deep">
<summary>深入一點：beam search 與套用順序</summary>

- **Beam search**：同時保留 b 條最好的候選句子，每步都往下延伸、再留下最好的 b 條。通常比 greedy 找到整體機率更高的句子，適合翻譯這類有標準答案的任務；但開放式對話容易變得平淡重複，所以聊天模型很少用。
- **重複懲罰**（repetition / frequency / presence penalty）：對已經出現過的 token 扣分，降低一再重複同一句話的機率。扣太重會讓模型連該重複的專有名詞都避開，所以通常只設得很輕（例如 repetition_penalty 1.1 左右、frequency／presence penalty 0.1–0.5）。
- **套用順序**：這些設定可以一起用。本站的必做題依「temperature → top-k → top-p」的順序套用；實際框架的順序不一定相同（例如 llama.cpp 預設最後才套 temperature），同樣的數字結果可能不一樣。

</details>

### ★ 現代模型換了哪些零件？

現代開源模型（Llama、Qwen 等）沿用上面的骨架，只換了幾個零件。第一次讀只要知道每個零件改了什麼、為什麼改；看懂這張表，就能讀懂大部分新模型的 `config.json`。

| 元件 | 改了什麼 | 為了什麼 | 在 `config.json` 怎麼看出來 |
|---|---|---|---|
| RoPE | 不在 embedding 加位置向量，改成在 attention 裡依位置旋轉 q、k | 表達相對位置 | `rope_theta` |
| Pre-norm、RMSNorm | 原始 Transformer 把 Norm 放在相加之後，現代模型（和上圖）改放在子層之前，並改用更簡單的計算方式 | pre-norm 讓訓練更穩定；RMSNorm 計算更簡單 | `rms_norm_eps`（看得出用 RMSNorm；pre-norm 從 config 看不出來） |
| SwiGLU | MLP 多一個「閘門」矩陣 | 效果較好 | 通常 `hidden_act` 是 `silu`，並有 `intermediate_size` |
| GQA / MLA | 生成時每個 token 的 k、v 會存起來重複用，叫 KV cache；GQA 讓多個 head 共用一組 k、v，MLA 把 k、v 壓縮 | 減少 KV cache 的記憶體 | GQA：`num_key_value_heads` 小於 `num_attention_heads`；MLA：有 `kv_lora_rank` |
| MoE | 把 MLP 換成很多個平行的小 MLP（專家），每個 token 只挑其中幾個來算 | 增加容量，同時控制計算量 | 專家數（各家名稱不同，例如 `num_experts`、`num_local_experts`）與 `num_experts_per_tok` |

MoE 要特別注意：它有兩個參數量。**總參數**是全部專家加起來，**啟用參數**是每個 token 實際用到的。每個 token 的計算量看啟用參數，像小模型；但全部專家都要放在記憶體裡，所以記憶體看總參數。

<details class="deep">
<summary>深入一點：各元件怎麼運作</summary>

**Pre-norm。** 原始 Transformer 把 normalization 放在 residual 相加之後：norm(x + f(x))。現代模型改放在子層之前：x + f(norm(x))。這樣 residual 這條捷徑上沒有任何運算，梯度能直通最前面，深層模型訓練穩定得多。

**RMSNorm。** LayerNorm 會減掉平均、除以標準差，再縮放和平移。RMSNorm 只除以均方根 √(mean(x²)) 再縮放，更簡單，效果相當。

**SwiGLU。** 標準 MLP 有兩個矩陣：放大 → 非線性 → 縮小。SwiGLU 讓輸入分別乘上兩個矩陣，一個經過 SiLU（形狀類似 ReLU 的平滑函數），再和另一個逐元素相乘，決定哪些維度要通過，最後縮回原維度。因為多了一個矩陣，原始做法把中間層從 4d 縮到約 (8/3)d，讓總參數量和標準 MLP 相當（實際模型常再調大）。

**RoPE。** 把 q、k 每兩個維度看成平面上的一個點，各自轉「位置 × 旋轉速度」的角度。兩個點都轉過之後再做內積，位置的影響只剩下兩者的角度差，也就是兩個 token **相隔幾格**，而不是它們在第幾格。不同維度用不同的旋轉速度，轉得快的對近距離敏感，轉得慢的能分辨遠距離；`rope_theta` 控制這組速度。

**GQA 與 MLA。** 因為 causal mask，前面 token 的 k、v 不受後來的 token 影響，生成時算一次就能存起來一直用，這叫 KV cache（→ [S5 推論與 serving](/stages/s05-inference/)）。它的大小和 KV head 的數量成正比。GQA（grouped-query attention）讓多個 query head 共用同一組 KV head，例如 32 個 query head 配 8 個 KV head，KV cache 就只剩 1/4。MLA（multi-head latent attention，DeepSeek 提出）不存完整的 k 和 v，只存一個壓縮過的小向量，計算時再還原，能省得更多。

**MoE。** 把多數 block 裡的 MLP 換成很多個平行的 MLP，叫「專家」，再加一個 router：每個 token 進來，router 挑出最合適的幾個專家（例如 64 個裡挑 8 個），只用它們計算。訓練時要額外讓 token 平均分給各專家，否則少數專家被搶著用，其他的學不到東西。

</details>

### ★ 模型要多少算力與記憶體？

參數量、計算量、記憶體都能用幾個簡單公式心算出來。

**參數量。** 標準 GPT 的每個 block 主要是矩陣（d 是向量維度）：attention 的 q、k、v、輸出四個 d × d 矩陣（4d²），MLP 的 d → 4d 和 4d → d 兩個矩陣（8d²），合計約 12d²。再加上 embedding 表的 V·d（V 是詞彙表大小）。以 GPT-2 small 為例（d = 768、12 個 block、V = 50,257）：12 × 768² × 12 ≈ 8,493 萬，加上 50,257 × 768 ≈ 3,860 萬，約 1.235 億；再加上位置 embedding、bias 等小項，就是官方的 124M。

**計算量。** 每個參數處理一個 token 時大約做一次乘法和一次加法，所以前向約 2N FLOPs（N 是參數量；FLOPs 是浮點運算次數，一次乘法或加法算一次）。訓練還要反向傳播，約是前向的兩倍，所以每個 token 約 6N，總計約 6·N·D（D 是訓練 token 數）。例如 10 億參數訓練 200 億 token：6 × 10⁹ × 2 × 10¹⁰ = 1.2 × 10²⁰ FLOPs。下一站的 scaling law 會用到這個公式（→ [S3 Pretraining 與 scaling](/stages/s03-pretraining/)）。

**記憶體。** 權重佔的記憶體 = 參數量 × 每個參數的 byte 數。

| 格式 | 每個參數 | 70 億參數的權重 | 用途 |
|---|---|---|---|
| fp32 | 4 byte | 約 28 GB | 傳統訓練、optimizer 狀態 |
| bf16 / fp16 | 2 byte | 約 14 GB | 現代訓練與推論的預設 |
| int8 / fp8 | 1 byte | 約 7 GB | 量化推論；fp8 也用在部分新式訓練 |
| int4 | 0.5 byte | 約 3.5 GB（加上縮放係數會再多一點） | 本機跑模型常見 |

用更少的 bit 存權重叫量化（quantization），以一點品質換記憶體與速度，細節在 [S5 推論與 serving](/stages/s05-inference/)。**容易誤會：能載入權重不代表能訓練。** 訓練要另外存梯度與 optimizer 狀態，記憶體是推論的好幾倍（見下方展開）。

<details class="deep">
<summary>準備動手做：精確計算參數，以及訓練要多少記憶體</summary>

- **現代模型的參數**：很多模型（包括 GPT-2）讓輸出層和 token embedding 共用同一個矩陣，叫 weight tying。SwiGLU 的 MLP 是三個 d × `intermediate_size` 的矩陣；GQA 的 k、v 矩陣比 d × d 小；沒有 weight tying 的話，輸出層要再算一次 V·d。逐項列出每個矩陣的形狀，就能算準到個位數（模型線 M2 tiny GPT 的驗收要求；[代號說明](/guide/how-to-use/#代號怎麼讀)）。
- **計算量的例外**：2N 忽略了 attention 分數本身的計算，context 很長時要另外加。
- **bf16 vs fp16**：兩者都是 16 bit。bf16 能表示的範圍和 fp32 一樣大、精度較低；fp16 精度較高、範圍小，訓練時數值容易超出範圍（太大溢位、太小變成 0）。所以現代訓練多半用 bf16。
- **訓練的記憶體**：用 Adam 做混合精度訓練時，每個參數要存 bf16 權重（2 byte）、bf16 梯度（2）、fp32 權重主副本（4）、Adam 的一階與二階動差（moment，各 4），約 16 byte。70 億參數就要約 112 GB，還沒算 activation（前向時每層的中間結果，反向要用）。
- **量化為什麼也會加速**：一次只服務少量請求時，推論的瓶頸是「從記憶體讀權重」，權重變小就讀得快。

</details>

<section class="deep-section">

### ○ 怎麼處理很長的輸入？

Attention 的成本隨序列長度的平方成長，模型也只在訓練見過的長度內表現穩定。一類解法是延長 RoPE 能處理的位置範圍（RoPE scaling、YaRN）；另一類是換掉 attention（linear attention、Mamba 等），成本降成線性，代價是不能精確回頭查找任意位置。目前主流是 Transformer 加延長技巧，也有模型兩者混用。

</section>

<section class="deep-section">

### ○ 圖片怎麼進入語言模型？

多模態模型的做法：ViT 把圖片切成小方塊（patch），每塊當一個 token；CLIP 用大量圖文配對，把圖片和文字放進同一個向量空間；LLaVA 這類模型把視覺 encoder 的輸出經過小轉接層，接進 LLM 當輸入 token。S10 工具與 MCP 講的 computer use 需要這個背景。

</section>

<section class="deep-section">

### ○ 怎麼看懂模型內部？

Interpretability 研究模型內部在算什麼。常見工具：看 attention 權重，觀察每個 head 在看哪裡；probing，訓練小分類器檢查某層向量是否帶有某種資訊；sparse autoencoder，把向量拆成大量可解釋的特徵。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

1. 沿用講義的分數「咪」2.0、「。」1.0、「狗」0.0。temperature 從 1 改成 0.5，先不算數字，預測三個機率各往哪個方向變。

   <details class="hint">
   <summary>對照答案</summary>

   「咪」上升（0.665 → 0.867），「。」和「狗」下降。除以小於 1 的 T 會把分數差距放大，softmax 後分布更集中在最高分。

   </details>

2. 機率 [0.4, 0.3, 0.2, 0.1]、top-p 的 p = 0.6，保留哪幾個？重新換算後的機率是多少？

   <details class="hint">
   <summary>對照答案</summary>

   保留前兩個：0.4 還不到 0.6，加上 0.3 是 0.7 才超過。換算成 0.4 ÷ 0.7 ≈ 0.571、0.3 ÷ 0.7 ≈ 0.429。

   </details>

### 必做：從零寫 BPE 與 sampling

**目標**：親手實作 tokenizer 與 decoding 這兩個「模型外面、但決定你看到什麼」的元件。

**步驟**
1. 實作 byte-level BPE 的訓練：輸入一段文字與 merge 次數，輸出 merge 規則。從 UTF-8 byte 開始，所以任何文字都能處理。
2. 實作 `encode`（套用 merge 規則）與 `decode`（轉回 byte 再轉回文字）。
3. 用 [tiny Shakespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt)（約 1.1 MB 的英文純文字，M2 tiny GPT 也會用到）訓練，merge 次數分別取 0、64、256、1024，記錄壓縮率（UTF-8 byte 數 ÷ token 數）。先用前 100 KB 確認能跑，再換成全文；最直接的寫法在全文上跑 1024 次 merge 可能要幾分鐘以上。
4. 把同一段意思的中文與英文各 encode 一次，比較 token 數。
5. 實作 `sample(logits, temperature, top_k, top_p)`：輸入一組 logits，回傳抽到的 index。
6. 拿一組固定的 logits（例如長度 10），每種設定各抽 10,000 次，統計每個 index 的出現頻率，和理論機率比較。
7. 準備 100 個測試字串：自己寫 20 個邊界案例（空字串、單一中文字、emoji、全形標點、連續空白、`\n` 與 `\r\n`、混合中英文等），再從 tiny Shakespeare 隨機取 80 段長度 20–200 字元的片段。

**驗收**
- 步驟 7 的 100 個測試字串（含中文、emoji、空白、換行）`decode(encode(s)) === s` 全部成立。
- 壓縮率隨 merge 次數單調上升，附上四個數字。
- temperature → 0（例如 1e-6）與 top_k = 1 時，10,000 次全部抽到 argmax。
- temperature = 1、不設 top-k / top-p 時，每個 index 的實際頻率和 softmax 機率相差不超過 2 個百分點。
- top_p = 0.9 時，落在 nucleus 外的 index 出現 0 次。

**提示**
- TypeScript：`TextEncoder` / `TextDecoder` 處理 UTF-8；用 `Map<string, number>` 計數 pair。
- Python：`str.encode("utf-8")`、`collections.Counter`；可以拿 `tiktoken` 的結果對照，但不要直接用它。
- 計算 softmax 前先把每個 logit 減去最大值，否則 temperature 很小（例如 1e-6）時 exp 會溢位。
- 卡住時：
  - 重讀：[BPE](#-文字怎麼變成-token)、[decoding](#-怎麼挑出下一個-token)
  - 延伸：「Let's build the GPT Tokenizer」影片前半段、rasbt 第 5 章 decoding strategies 小節

**預估**：8 小時

<section class="deep-section">

### 進階：模型線 M2：tiny GPT，升級成 Llama 元件

**目標**：從零訓練一個小 GPT，換上自己的 tokenizer，再逐一換成現代元件，並準確算出它的大小。

**步驟**
1. 依講義的架構寫一個字元級 GPT（想跟著寫可以看延伸閱讀的「Let's build GPT」影片），在 tiny Shakespeare 上訓練。
2. 換成必做題的 BPE tokenizer（詞彙表大小約 512–1024）重新訓練。因為 token 不同，loss 不能直接比，改用 bits-per-character（每 token 的 loss × token 數 ÷ 字元數 ÷ ln 2）比較。
3. 逐一換上 RMSNorm、RoPE、SwiGLU、GQA，每換一個都在相同步數下記錄 val loss。
4. 手算模型的參數量（逐層列出），和程式中所有參數的 `numel()` 總和比較。
5. 估算每個 token 的前向 FLOPs 與 bf16 權重大小。
6. 用 temperature 0.5 / 1.0 / 1.5 與 top_p 0.9 各生成一段文字，描述差異。

**參考設定**（固定下來，val loss 才能互相比較）
- 資料：tiny Shakespeare 全文，前 90% 字元當訓練集、後 10% 當驗證集，不打亂（和 nanoGPT 的 `prepare.py` 相同）。
- 字元級模型：4 層、4 個 head、向量 128 維、context 64 個字元、dropout 0，batch 12，學習率 1e-3，訓練 3000 步以上。
- 評估：從驗證集隨機取 200 個 batch，算平均 loss（`eval_iters` = 200），以訓練結束時的值判定。
- 這就是 nanoGPT README 的 CPU 指令，只把 `eval_iters` 從 20 調回 200、步數加長。換元件時其他設定都不動。

**驗收**
- 字元級版本的 val loss ≤ 1.9（nanoGPT README 的 CPU 小設定約 1.88，單張 A100 設定約 1.47，可當參考；用 CPU 小設定時，建議訓練 3000 步以上，並把 `eval_iters` 調回 200 再判定，否則評估雜訊就足以讓結果在 1.9 上下跳動）。
- 字元級與 BPE 版本的 bits-per-character 並列在表中。
- 每換一個元件都有一列 val loss 紀錄。
- 手算參數量與程式統計完全一致（差 0）。
- 四種 sampling 設定的輸出並列，各附一句解釋。

**提示**
- Python：PyTorch；Apple MPS 或 CPU 即可，小模型一次訓練約十幾分鐘。可以參考 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) 的設定，但自己寫模型本體。
- 環境與算力說明見[模型線總覽](/projects/model-thread/)。
- 卡住時：
  - 重讀：[現代元件](#-現代模型換了哪些零件)、[resource accounting](#-模型要多少算力與記憶體)
  - 延伸：rasbt 第 4 章與第 5 章 bonus 的 Llama / Qwen 從零實作

**預估**：21 小時

</section>

## 自我檢查

1. 不看講義，畫出從文字到下一個 token 的流程，標出哪裡是 ID、哪裡是向量、哪裡是分數。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：ID 只出現在 tokenizer 和查表之間；embedding 之後到最後一層都是向量；只有輸出層之後才是詞彙表上的分數。**常見錯法**：以為 attention 直接輸出 token 機率。**回讀**：[一個例子走完全程](#-一個例子走完全程)

   </details>

2. 給定一個位置的 q，以及三個位置的 k、v（自己編 2 維的數字），手算這個位置的 attention 輸出。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：四步依序是內積、除以 √d_k、softmax、對 v 加權平均；權重加起來要等於 1。**常見錯法**：拿權重去乘 k 而不是 v。**回讀**：[Attention 怎麼參考前文？](#-attention-怎麼參考前文)

   </details>

3. 為什麼語言模型需要 causal mask？拿掉它，訓練和生成各會發生什麼事？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：訓練時能偷看答案，loss 很低卻只學會抄；生成時未來 token 不存在，輸出會亂掉。**常見錯法**：只說「會看到未來」，沒分開講訓練與生成。**回讀**：[Attention 怎麼參考前文？](#-attention-怎麼參考前文) 的 causal mask 一段

   </details>

4. 為什麼 LLM 常數錯「strawberry 裡有幾個 r」？這和模型「聰不聰明」有關嗎？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：模型看到的是 2–3 個 token，不是逐個字母，主因在輸入單位。**常見錯法**：只歸因於模型不夠聰明。**回讀**：[文字怎麼變成 token？](#-文字怎麼變成-token)

   </details>

5. 一個 80 億參數的模型，用 bf16 載入權重大約需要多少記憶體？用 int4 呢？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：參數量 × 每個參數的 byte 數，bf16 約 16 GB，int4 約 4 GB（加上縮放係數再多一點）。**常見錯法**：把這個數字當成訓練所需記憶體。**回讀**：[模型要多少算力與記憶體？](#-模型要多少算力與記憶體)

   </details>

6. MoE 模型標示「總參數 1T、啟用參數 32B」，推論時的計算量和記憶體需求分別比較接近哪一個數字？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：計算量看啟用參數（32B），記憶體看總參數（1T），因為全部專家都要放在記憶體裡。**常見錯法**：以為只要放得下 32B 參數的記憶體就能跑。**回讀**：[現代模型換了哪些零件？](#-現代模型換了哪些零件)

   </details>

7. 情境題：你要用 LLM 從發票擷取欄位，另一個功能是幫使用者發想行銷文案。兩者的 temperature 你會怎麼設？為什麼？如果你用的 API 模型不接受 temperature，你會改用什麼方法達到類似的效果？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：擷取用低 temperature 求穩定、正確率另用 eval 確認；發想用較高 temperature 加 top-p。不接受參數時改用 prompt 指示或 structured output。**常見錯法**：以為低溫就保證正確。**回讀**：[怎麼挑出下一個 token？](#-怎麼挑出下一個-token)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一站需要的內容。下面的資料適合想看得更深、或想跟著別人一行一行寫程式的人，都不是必讀。

### 跟著寫程式

- [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) — 「Let's build GPT」與「Let's build the GPT Tokenizer」兩支影片，從零寫出 attention、GPT 與 BPE。做 M2 tiny GPT 時最好的參考。
- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — 第 2–4 章（文字資料與 tokenization、attention、GPT 模型）有逐步的程式碼與圖解；第 4 章 bonus 有 KV cache、GQA、MLA、MoE 的從零實作。
- [CMU 11-711 Advanced NLP](https://cmu-l3.github.io/anlp-spring2026/) — 第 1 份作業「Build Your Own LLaMa」，很適合拿來對照 M2 tiny GPT。

### 原始論文與綜述

- [Vaswani et al. 2017, Attention Is All You Need](https://arxiv.org/abs/1706.03762) — Transformer 的原始論文。讀完講義後再讀，大部分都看得懂。
- [Welleck et al. 2024, From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) — decoding 方法的完整綜述；這一站對應 token-level 的部分，其餘留到 S4 Post-training 與 reasoning、S5 推論與 serving。

### 課程與概覽

- [Stanford CS224N](https://web.stanford.edu/class/cs224n/) — Transformer 與 attention 的講次。
- [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation)（2025-02）— 架構與 decoding 的概覽。
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) — tokenizer 與 Transformers 函式庫的實用章節。

### 中文資源

- [台大 李宏毅 機器學習 2025 春](https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php) — 繁中；模型架構相關講次。
- [清大 高宏宇 NLP 2026](https://github.com/IKMLab/NTHU_Natural_Language_Processing) — 繁中 / 英文雙語投影片與影片。
- [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) — 簡中；第 2 章（分詞器）、第 3 章（資源核算）、第 4 章（RoPE、RMSNorm、SwiGLU）、第 5 章（MoE）。
- [datawhalechina/happy-llm](https://github.com/datawhalechina/happy-llm) — 簡中；第 2 章（Transformer 架構）、第 5 章（動手實作 LLaMA2 與 tokenizer）。
- [datawhalechina/tiny-universe](https://github.com/datawhalechina/tiny-universe) — 簡中；TinyTransformer 是很短的參考實作。


</section>