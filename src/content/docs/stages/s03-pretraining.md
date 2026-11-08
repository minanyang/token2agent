---
title: S3 Pretraining 與 scaling
head:
  - tag: title
    content: LLM 預訓練與 scaling laws 入門（S3）｜Token2Agent
description: base model 的能力從哪來：pretraining 的資料準備與訓練流程、scaling laws 怎麼決定模型與資料的大小，以及資料平行、模型平行怎麼把訓練拆到多張 GPU 上。
sidebar:
  order: 3
  label: S3 Pretraining 與 scaling
---

:::note[這一站]
**⏱ 講義** 首次閱讀約 3 小時，手算與深入內容約 2 小時　**必做題** 約 6 小時　**進階題** 約 17 小時

**前置**：[S2 Transformer 與 decoding](/stages/s02-transformer/)（也會用到 [S1 神經網路基礎](/stages/s01-neural-networks/) 的 AdamW 與 perplexity）　**銜接**：→ [S4 Post-training 與 reasoning](/stages/s04-post-training/)
:::

:::tip[理解路線重點]
- 預訓練模型（base model）的能力，來自在大量文字上反覆練習預測下一個 token。
- 能力和缺陷多半在資料階段就決定；同樣算力下，資料乾淨常比數量多有用。
- 模型和資料多大要在開訓前依預算決定；GPU 加倍也不等於速度加倍。
:::

## 在做什麼

S2 Transformer 與 decoding 拆開了模型的結構，這一站回答：結構裡的參數是怎麼學出來的？答案是 pretraining，讓模型在大量文字上練習「預測下一個 token」。講義依一次 pretraining 的順序走：先準備資料，再跑訓練迴圈，用 scaling laws 決定模型與資料該多大，模型太大時把工作拆到多張 GPU，最後評估結果。學完你會知道，一個 base model 的能力和缺陷，很大一部分在資料階段就決定了。

## 學完能

- 能說出一次 pretraining 從準備資料、決定規模到多卡訓練的流程，以及每一步在防什麼問題。（講義與自我檢查）
- 對「湧現能力」的說法提出正反兩面的解讀；說出 data / tensor / pipeline 平行與 ZeRO / FSDP 各自在切什麼。（講義與自我檢查）
- 解釋 base model 的能力從哪裡來，以及為什麼資料品質比資料量更常是瓶頸。（必做）
- 規劃一次小型 pretraining：給定算力，估出合理的模型大小與 token 數。（必做：試算；進階：實際跑一次）
- 看懂 scaling 曲線圖。（進階）

## 講義

先看全貌。Pretraining 的訓練目標和 [S1 神經網路基礎](/stages/s01-neural-networks/)的小模型完全一樣：給定前文，預測下一個 token，loss 是 cross-entropy。不同的是規模：參數從幾萬變成幾十億，資料從一本書變成上兆個 token。規模一大，四件事變得重要：

1. **資料**：模型只能學到資料裡有的東西，垃圾和重複也會一起學進去。
2. **訓練迴圈**：跑幾萬步、花幾天，中途不能爆掉。
3. **分配**：算力固定時，要大模型少資料，還是小模型多資料。
4. **平行化**：一張 GPU 放不下或跑太慢時，怎麼拆。

訓練出來的是 base model：它很會「接著寫」，但還不會好好回答問題，那是下一站（S4 Post-training 與 reasoning）的事。

### ★ 一筆預算走完全程

用一個具體的例子貫穿整站：**你有 1.2 × 10²⁰ FLOPs 的算力，要從網頁資料訓練一個 base model。** 下面的數字除了公式算出來的部分，都是教學用的示意。

1. **決定大小**：上一站學過，訓練的計算量約是 6·N·D（N 是參數量，D 是訓練 token 數，← [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體)）。依本站 scaling 一節的經驗法則「每個參數約 20 個 token」，把 D = 20N 代入：6·N·20N = 120N² = C，所以 N = √(C ÷ 120) = √(10¹⁸) = 10 億，D = 20N = 200 億。驗算：6 × 10⁹ × 2 × 10¹⁰ = 1.2 × 10²⁰。
2. **準備資料**：需要 200 億個乾淨、不重複的 token。原始網頁經過過濾和去重，常常只留下一小部分，所以要從好幾倍的原始資料開始。
3. **跑訓練**：每一步處理 50 萬個 token，200 億 ÷ 50 萬 = 4 萬步。
4. **估時間與硬體**：假設一張 GPU 實際每秒能做 2 × 10¹⁴ 次運算，1.2 × 10²⁰ ÷ (2 × 10¹⁴) = 60 萬秒，約 167 小時；用 8 張 GPU 平行，約 21 小時（還沒算通訊的損耗）。
5. **評估**：在沒看過的資料上量 perplexity，再用一組有標準答案的題目量 exact match。

接下來的講義分三段讀。**第一段，資料**（步驟 2）：「訓練資料怎麼準備？」。**第二段，訓練與 scaling**（步驟 3、1）：「長時間訓練怎麼不爆掉？」「模型和資料該多大？」。**第三段，多卡訓練與驗收**（步驟 4、5）：「一張 GPU 不夠怎麼辦？」「怎麼知道練得好不好？」。

### ★ 訓練資料怎麼準備？

模型學到什麼，取決於它讀了什麼（資料工程）。從網路抓來的原始資料大多不能直接用，要經過一條處理管線。

**來源。** 主要是網頁爬取（例如 Common Crawl），再加上程式碼、書籍、論文、數學等。網頁量最大，但品質最雜：導覽列、廣告、重複模板、機器產生的文字、亂碼都有。

**管線依序是：**

| 步驟 | 做什麼 | 1,000 份網頁的示意 |
|---|---|---|
| 擷取文字 | 從 HTML 取出正文，丟掉選單、頁尾 | 1,000 份 |
| 語言與品質過濾 | 規則（長度、符號比例、重複行太多、語言偵測），再用分類器評分 | 剩 300 份 |
| 去重 | 刪掉完全相同與幾乎相同的文件 | 剩 200 份 |
| 移除個人資料（PII） | 把 email、電話、身分證號等換成佔位符 | 200 份，內容遮蔽 |
| 混合 | 決定網頁、程式碼、書籍等各佔多少 | 依比例組成訓練集 |

比例依來源差很多，但「大部分會被丟掉」很常見。品質分類器的常見做法：拿一批公認的好文字（例如百科、教科書）當正例，隨機網頁當反例，訓練一個小模型替每份文件打分，只留高分的。

**為什麼要去重。** 重複的內容會被模型看很多次，容易逐字背下來；同樣的算力花在重複資料上也是浪費；還有一個隱藏的問題：評估用的題目如果散落在網路上，可能混進訓練資料，分數就失真了（這叫資料汙染，→ [S8 Eval 方法論](/stages/s08-evals/)）。

**完全相同的文件用 hash 就能找到：** 每份文件算一個 hash，hash 相同就是重複。麻煩的是「幾乎相同」：同一篇文章被轉載、只改了幾個字，hash 就完全不同。這時要比的是內容重疊多少。

**Jaccard 相似度與 shingle。** 先把文件切成重疊的詞組，叫 shingle。以連續 3 個詞為一組：

- A：`the cat sat on the mat today` → `the cat sat`、`cat sat on`、`sat on the`、`on the mat`、`the mat today`
- B：`the cat sat on the rug today` → `the cat sat`、`cat sat on`、`sat on the`、`on the rug`、`the rug today`

Jaccard 相似度 = 共同的 shingle 數 ÷ 全部不同的 shingle 數 = 3 ÷ 7 ≈ 0.43。只改了一個詞，就有 2 個 shingle 不一樣（改中間的一個詞會影響 3 個 shingle，這裡因為靠近結尾只有 2 個），所以 shingle 的比較對修改很敏感。

**MinHash：用簽章估 Jaccard。** 文件很多時，兩兩比對全部 shingle 太慢。MinHash 替每份文件做一個固定長度的簽章：準備 k 個不同的 hash 函式，每個函式把文件的所有 shingle 都算一次，只留下最小值。兩份文件在某個 hash 函式下最小值相同的機率，正好等於它們的 Jaccard 相似度（原因見下方展開）。所以 k = 128 時，如果 A、B 的簽章有 55 個位置相等，估計值就是 55 ÷ 128 ≈ 0.43。比較兩份簽章只要比 128 個數字，和文件長度無關。

**LSH：只比較可能相似的文件對。** 簽章解決了「比一對很慢」，但 600 份文件（必做題的規模）兩兩比較仍有約 18 萬對，100 萬份就有約 5,000 億對。LSH（locality-sensitive hashing）的 banding 做法：把 128 個值切成 b 段、每段 r 個值，例如 32 段、每段 4 個。只要兩份文件有任何一段完全相同，就列為候選對，只對候選對確認相似度。相似的文件很容易至少有一段撞上，不相似的幾乎不會（實際比例見下方展開）。調 b 和 r 就是在調「漏抓」和「多比」之間的平衡。

**PII 與混合比例。** PII 通常用規則（正規表示式抓 email、電話格式）加上偵測模型，換成 `<EMAIL>` 這類佔位符。混合比例對模型擅長什麼影響很大。延續例子，200 億 token 若配成網頁 70%、程式碼 15%、書與論文 10%、數學 5%，數學就是 10 億 token；如果手上只有 5 億個不重複的數學 token，就要讓它重複看 2 遍（2 個 epoch）。高品質但量少的資料常這樣加權，重複太多遍又會開始背誦。

**容易誤會：資料越多越好。** 同樣的算力下，把一半的垃圾換成乾淨資料，通常比多抓一倍的垃圾更有效。base model 的很多缺陷（偏見、事實錯誤、背誦個資）都能追溯到資料。

<details class="deep">
<summary>準備動手做：MinHash 為什麼有效、誤差多大、LSH 的機率</summary>

- **為什麼最小值相同的機率是 Jaccard**：把 A ∪ B 的所有 shingle 用同一個隨機 hash 排序，最小的那個落在誰身上是隨機的。A 和 B 的最小值相同，若且唯若整個聯集的最小值剛好是共同的 shingle，機率 = |A ∩ B| ÷ |A ∪ B|。
- **估計的誤差**：每個 hash 函式是一次「相同或不同」的試驗，標準誤約 √(J(1−J)/k)。J = 0.43、k = 128 時約 0.044，所以 k 越大越準，但簽章也越長。
- **hash 函式怎麼來**：常見做法是先把 shingle 字串 hash 成一個 32-bit 整數 x，再用 k 組隨機的 (a, b) 算 `(a·x + b) mod p`（p 是大於 2³² 的質數），得到 k 個不同的 hash。
- **LSH 的候選機率**：一段 r 個值全部相等的機率是 J^r，b 段裡至少一段相等的機率是 1 − (1 − J^r)^b。這條曲線是 S 形，轉折點大約在 (1/b)^(1/r)。32 × 4 的轉折點約 0.42，Jaccard 0.5 的文件對約 87% 會成為候選，Jaccard 0.2 的只有約 5%；16 × 8 約 0.71，在 Jaccard 0.5 時只有約 6% 會成為候選。要配合你的相似度門檻挑 b、r。
- **規模化**：真實管線把簽章算好後，用每段的值當 key 分桶，同一桶裡的文件才互相比較，整個流程可以用 Spark 或 DuckDB 分散執行。

</details>

<details class="deep">
<summary>深入一點：其他資料決策</summary>

- **去重的粒度**：除了整份文件，也有人去掉重複的段落或長句（例如網站的固定聲明）。
- **汙染檢查**：常見做法是比對評估題目和訓練資料的 n-gram（例如連續 13 個詞）重疊，重疊的就從訓練資料刪掉或在報告中註明。
- **混合比例怎麼定**：常用小模型做實驗，比較不同配比在目標任務上的表現，再套到大模型上；訓練後段也常提高高品質資料的比例。
- **過濾的副作用**：過濾規則可能系統性地丟掉某些方言、語言或主題，品質分類器會繼承「好文字」正例的偏好。

</details>

### ★ 長時間訓練怎麼不爆掉？

Pretraining loop 本身和 [S1 神經網路基礎](/stages/s01-neural-networks/)一樣是「前向 → loss → 反向 → 更新」，用的 optimizer 是 AdamW。規模大了之後，三個做法幾乎是標準配備，目的都是讓幾萬步的訓練不要中途爆掉。

**學習率排程（LR schedule）。** 學習率不是固定的，而是隨步數變化：

- **Warmup**：剛開始的參數是隨機的，梯度又大又亂，一步走太大會把模型推到很糟的地方。所以前面一小段把學習率從接近 0 慢慢升到目標值。
- **Decay**：後期讓學習率逐步變小，模型才能在好的位置附近細調。常見是 cosine decay：照餘弦曲線的形狀，從最高點平滑降到最低點。

以 4 萬步的例子示意：前 2,000 步從 0 升到 3 × 10⁻⁴，之後沿 cosine 曲線降，第 4 萬步時降到 3 × 10⁻⁵（最高值的 10%）。

**Gradient clipping。** 偶爾某一批資料會產生特別大的梯度，一步就把參數推壞。做法是算所有梯度合起來的整體大小（norm），超過門檻就整體等比例縮小，方向不變。例如門檻 1.0、這一步的 norm 是 4.0，就把每個梯度乘上 0.25。

**混合精度（mixed precision）。** bf16 每個數只佔 2 byte（← [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體)），運算快、省記憶體，所以前向與反向大多用 bf16。但 bf16 的精度很粗：在 1.0 附近，它能表示的相鄰兩個數相差約 0.0078。如果某個權重是 1.0、這一步要加 0.0001，用 bf16 存的話，結果還是 1.0，更新直接消失。所以另外保留一份 fp32 的主權重（master weights），更新加在 fp32 上，需要計算時再轉成 bf16。

**Loss spike。** 大規模訓練最常見的麻煩之一是 loss 突然往上衝。常見的處理是退回最近的 checkpoint、跳過出問題的那批資料、或調低學習率再繼續，所以訓練時要定期存 checkpoint。

**容易誤會：訓練跑完了，想再多練一點，接著跑下去就好。** Cosine 排程的形狀是依總步數事先算好的，學習率在最後已經降到很低；直接接著跑，不是學習率太低學不動，就是重新拉高會先把 loss 推上去。所以總 token 數要在開始前就決定。這一點也影響了 scaling laws 的結論（見下一節）。

<details class="deep">
<summary>準備動手做：公式與訓練細節</summary>

- **Cosine 排程**：warmup 之後，第 t 步的學習率 = lr_min + ½ (lr_max − lr_min)(1 + cos(π · 進度))，進度 = (t − warmup 步數) ÷ (總步數 − warmup 步數)，從 0 走到 1。
- **Clipping 的 norm**：把所有參數的梯度攤平接成一個長向量，算它的 L2 長度 ‖g‖。若 ‖g‖ > c，每個梯度乘上 c ÷ ‖g‖。PyTorch 是 `torch.nn.utils.clip_grad_norm_`。
- **資料打包**（packing）：把文件 tokenize 後首尾相接，中間插入 `<|endoftext|>`，再切成固定長度（例如 1,024 個 token）的序列，不用 padding，算力不浪費。
- **Batch size 用 token 數算**：每步的 token 數 = 每步序列數 × 序列長度（× 梯度累積步數）。記憶體不夠時，用梯度累積：跑好幾個小批次、梯度加起來，再更新一次。
- **其他排程**：WSD（warmup–stable–decay）在中段維持固定學習率，只在最後一小段衰減，好處是可以從中段的 checkpoint 分支出不同長度的訓練，緩解上面「總步數要先決定」的問題。
- **bf16 的精度**：bf16 有 8 bit 指數、7 bit 尾數，所以在 [1, 2) 之間的間距是 2⁻⁷ ≈ 0.0078；範圍和 fp32 一樣大，不容易溢位。

</details>

### ★ 模型和資料該多大？

Scaling laws 說的是：loss 隨模型大小、資料量、算力的變化非常規律，所以可以用小模型的實驗，預測大模型該怎麼配置、會練到多好。

**冪次關係在圖上長什麼樣。** Kaplan 等人（2020）發現，loss 隨模型參數量、資料量、計算量呈現平滑的冪次關係。白話說：算力每多 10 倍，loss 就再降一截，而且每次降的比例差不多。把橫軸（算力）和縱軸（loss）都改成對數刻度，這種關係就是一條往右下的直線（怎麼讀 log–log 圖見[數學補給](/guide/math-refresher/#對數尺度與-loglog-圖)）。直線的好處是可以外插：在 10¹⁸、10¹⁹、10²⁰ FLOPs 各練幾個小模型，畫出直線，就能估計 10²² FLOPs 大概會到哪裡。

用 Chinchilla 論文擬合出的公式代入數字（公式見下方展開）：每個預算都挑最好的模型大小，loss 從 2.95（1.2 × 10¹⁹）降到 2.57（1.2 × 10²⁰）再到 2.31（1.2 × 10²¹）。loss 有一個降不下去的底（文字本身的不確定性）；扣掉這個底之後，「還能降的部分」每多 10 倍算力大約變成原來的 0.7 倍。

**算力固定時，怎麼分給模型和資料。** Hoffmann 等人（2022，Chinchilla）修正了分配建議：在固定算力下，模型參數和訓練 token 應該大致等比例放大，經驗法則約是每個參數 20 個 token。用同一個公式算本站的預算 1.2 × 10²⁰ FLOPs，每列都滿足 6·N·D = 1.2 × 10²⁰：

| 參數量 N | 訓練 token D | token ÷ 參數 | 預測 loss |
|---|---|---|---|
| 1 億 | 2,000 億 | 2,000 | 2.75 |
| 2.5 億 | 800 億 | 320 | 2.62 |
| 10 億 | 200 億 | 20 | 2.58 |
| 25 億 | 80 億 | 3.2 | 2.64 |
| 100 億 | 20 億 | 0.2 | 2.87 |

這張表讀起來是一條 U 形曲線：模型太小，再多資料也裝不下；模型太大，資料不夠，練不到它該有的程度。最低點附近很平，2.5 億到 25 億參數（相差 10 倍）的預測 loss 都在 2.58–2.64 之間，所以 20:1 是一個好起點，不是精確答案。Kaplan 當年建議模型要比資料長得快，一個公認的原因是他們沒有依每次訓練的長度調整 LR schedule，短訓練的結果被低估了，正是上一節的「容易誤會」。

**為什麼很多新模型的 token 數遠多於 20 倍。** 20:1 是「訓練最省」的配置；但模型訓練完要服務使用者，每產生一個 token 的推論成本約 2N（← [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體)），模型越小越便宜。如果模型要服務上兆個 token，多花一些訓練算力換一個更小、品質相近的模型很划算。所以現在很多模型刻意用遠多於 20 倍的 token 訓練較小的模型，例如 Meta 公布 Llama 3 的 8B 模型用了超過 15T token 預訓練，每個參數將近 2,000 個 token。

**湧現能力的爭論。** Wei 等人（2022）提出「湧現能力」：某些能力在模型小於某個規模時幾乎為零，超過之後突然出現。Schaeffer 等人（2023）提出反方解讀：很多「突然出現」來自評分方式本身是不連續的（例如 exact match 只有全對才給分），換成連續的評分後，進步其實是平滑的。

用數字看反方的論點。假設一個任務要連續做對 5 步才算答對，模型每一步的正確率隨規模平滑上升：

| 每步正確率 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 0.95 |
|---|---|---|---|---|---|---|
| 5 步全對的機率 | 0.03 | 0.08 | 0.17 | 0.33 | 0.59 | 0.77 |

每步正確率是穩定地進步，但 exact match 在前半段幾乎是 0，後半段才快速竄升，畫成圖就像「突然會了」。

兩派都有道理，這個問題目前仍有爭論。Schaeffer 等人也特別聲明，他們沒有主張模型不可能有湧現能力，只是說之前宣稱的例子可能是分析方式造成的。另一方面，有些任務實際使用時本來就只有全對才有用（例如多步驟計算的最終答案）。這時就算底層進步是平滑的，使用者看到的仍是「突然會了」。

**容易誤會：看到「突然變好」的圖，就認定模型跨過了某個門檻。** 先問評分方式是什麼，再問換成連續的指標（例如正確答案的機率）是否仍然是突然的。

<details class="deep">
<summary>深入一點：scaling law 的公式與擬合</summary>

- **Chinchilla 的形式**：L(N, D) = E + A / N^α + B / D^β。E 是降不下去的底，第二項是「模型不夠大」的損失，第三項是「資料不夠多」的損失。論文 Approach 3 的擬合值是 E = 1.69、A = 406.4、B = 410.7、α = 0.34、β = 0.28，上面兩張表的 loss 都是代入這組數字算的，例如 N = 10⁹、D = 2 × 10¹⁰：1.69 + 406.4 ÷ 10^(9 × 0.34) + 410.7 ÷ (2 × 10¹⁰)^0.28 ≈ 1.69 + 0.354 + 0.536 ≈ 2.58。這組數字依賴他們的資料與 tokenizer，換一份資料不能直接套用。
- **三種方法不完全一致**：論文用三種方法估最佳配置。Approach 1 固定模型大小、變化 token 數，取每個算力下 loss 最低的點；Approach 2 固定算力（IsoFLOP）、變化模型大小，找 U 形曲線的底；Approach 3 直接擬合上面的公式。Approach 1、2 得出 N 與 D 隨算力約各以 0.5 次方成長；Approach 3 約 0.46 / 0.54，且後續重現研究（Besiroglu et al. 2024）指出這組擬合值不夠可靠。細節也不同：用上面的公式算 1.2 × 10²⁰，最低點約在 7 億參數、每參數約 40 個 token。20:1 是取整後的經驗法則。
- **Kaplan 的形式**：分別擬合 L(N)、L(D)、L(C) 三條冪次律，指數約 0.076、0.095、0.050，並建議最佳模型大小隨算力約以 0.73 次方成長，比 Chinchilla 的 0.5 快得多。Kaplan 也只計算不含 embedding 的參數。
- **怎麼自己擬合**：在 log–log 圖上，冪次律是直線，所以對 log(loss − E) 和 log(N) 做線性回歸就能估指數；E 未知時要用非線性擬合。規模範圍太窄（例如 M3 小模型 pretraining 最大最小只差 4 倍；[代號說明](/guide/how-to-use/#代號怎麼讀)），估出來的指數雜訊很大。
- **小規模為什麼可能不符**：模型很小時，embedding 佔參數的比例很高；學習率、batch size 沒有對每個大小重新調；資料重複（epoch 超過 1）時，多出來的 token 價值遞減。

</details>

### ★ 一張 GPU 不夠怎麼辦？

模型大到一張 GPU 放不下、或訓練太慢時，就要把工作拆到多張 GPU。每種拆法都在記憶體、計算、通訊量之間取捨。

**先算記憶體。** 用 AdamW 做混合精度訓練，每個參數大約要 16 byte：bf16 權重與梯度各 2 byte，fp32 主權重 4 byte，AdamW 的兩個移動平均各 4 byte（細項見 [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體) 的展開）。這還沒算 activation（前向時每層的中間結果，反向傳播要用）。

| 模型 | 訓練狀態 | 一張 80 GB 的 GPU |
|---|---|---|
| 10 億參數（本站的例子） | 約 16 GB | 放得下，平行只為了加速 |
| 70 億參數 | 約 112 GB | 放不下 |
| 700 億參數 | 約 1,120 GB | 遠遠放不下 |

**Data parallel：複製模型，切資料。** 每張 GPU 都有完整模型，各自處理不同的資料，算完梯度後全部平均，再各自做相同的更新，所以每張 GPU 上的模型始終一樣。本站的例子用 8 張 GPU，每步的 50 萬個 token 每張分到 6.25 萬個。它只能加速，不省記憶體：每張 GPU 都要放完整的 16 byte × N。

**ZeRO / FSDP：data parallel 的省記憶體版。** 一般 data parallel 裡，8 張 GPU 各存一份一模一樣的 optimizer 狀態、梯度和權重，非常浪費。ZeRO 讓每張 GPU 只負責存 1/8，需要時再從別張 GPU 傳過來。70 億參數、8 張 GPU：一般 data parallel 每張要 112 GB，三樣都分散存放後每張只要約 14 GB。代價是通訊：每一層計算前要先把權重收集過來，算完再丟掉。PyTorch 的 FSDP（fully sharded data parallel）是同一個想法的實作。

**Tensor parallel：切開一層裡的矩陣。** 把一個大矩陣切成幾塊，例如 4 張 GPU 各負責 1/4 的欄，各自算出結果的一部分再拼起來。每一層都要交換結果，通訊非常頻繁，通常只在同一台機器裡、GPU 之間有高速連線時使用。

**Pipeline parallel：不同的層放不同的 GPU。** 例如 32 層的模型放在 4 張 GPU，每張 8 層，資料像生產線一樣一站傳一站。問題是生產線剛啟動和收尾時，後面或前面的 GPU 在空等；把一批資料切成很多小批（micro-batch）依序送進去，可以減少空等。

大型訓練通常把幾種一起用：機器內用 tensor parallel，跨機器用 pipeline 和 data parallel（加上 ZeRO）。

**容易誤會：GPU 加倍，速度就加倍。** 每種拆法都要在 GPU 之間傳資料，GPU 越多、通訊佔的比例越高；ZeRO 省下記憶體，但不會讓計算變快，反而多了通訊。這些取捨在推論端也會再出現（→ [S5 推論與 serving](/stages/s05-inference/)）。

<details class="deep">
<summary>深入一點：通訊方式、ZeRO 三個階段、pipeline 的空等</summary>

- **All-reduce**：data parallel 平均梯度用的集體通訊，每張 GPU 最後都拿到全部梯度的平均。它可以拆成 reduce-scatter（每張 GPU 拿到一段的總和）加 all-gather（把各段發給所有人），ZeRO 就是利用這個拆法。
- **ZeRO 的三個階段**（以 70 億參數、8 張 GPU、每參數 16 byte 計）：Stage 1 只分散 optimizer 狀態（fp32 主權重與兩個移動平均，共 12 byte），每張約 2 + 2 + 12 ÷ 8 = 5.5 byte/參數，約 38.5 GB；Stage 2 再分散梯度，約 2 + 14 ÷ 8 = 3.75 byte/參數，約 26.25 GB；Stage 3 連權重也分散，16 ÷ 8 = 2 byte/參數，約 14 GB。Stage 1、2 的通訊量和一般 data parallel 相當，Stage 3 因為要在前向與反向各收集一次權重，通訊量約多一半。
- **Tensor parallel 的切法**：MLP 的第一個矩陣按欄切、第二個按列切，中間的非線性可以各自算，一個 MLP 只需要在最後做一次 all-reduce；attention 則按 head 分給不同 GPU。
- **Pipeline 的空等比例**：p 個階段、m 個 micro-batch 時，空等時間約佔 (p − 1) ÷ (m + p − 1)。p = 4、m = 16 時約 16%。
- **Activation checkpointing**：前向時不存所有 activation，只存部分層的輸入，反向時再重算一次。用約多三分之一的計算換大量記憶體。
- **其他維度**：序列很長時把序列切開（sequence / context parallel）；MoE 把不同專家放不同 GPU（expert parallel）。

</details>

### ★ 怎麼知道練得好不好？

訓練完要能判斷模型好不好。這一站只用兩個最基本的指標（perplexity 與 held-out exact match），完整的評估方法論在 [S8 Eval 方法論](/stages/s08-evals/)。

**Perplexity。** 在模型沒看過的 held-out 資料上算 perplexity（← [S1 神經網路基礎](/stages/s01-neural-networks/)），直觀理解是「模型平均在幾個選項之間猶豫」，越低越好。驗證集要在訓練前就切出來，而且要和訓練資料一起去重，否則等於拿看過的題目考試。

**容易誤會：不同 tokenizer 的 perplexity 可以直接比。** Perplexity 是「每個 token」的平均，而不同 tokenizer 的一個 token 代表的文字量不同。例子：同一段 1,000 個字元的文字，模型甲的 tokenizer 切成 250 個 token、perplexity 18；模型乙切成 400 個 token、perplexity 12。乙看起來比較好，但換算成整段文字的總 loss：甲是 250 × ln 18 ≈ 723，乙是 400 × ln 12 ≈ 994，甲預測這段文字其實更準。公平的比法是換成每個字元或每個 byte 的 loss（例如 bits-per-byte）。

**Held-out exact match。** 準備一組有標準答案的題目（例如「法國的首都是」→「巴黎」），看模型完全答對的比例。它直接對應「能不能用」，但很粗糙：多一個空白或句號就算錯，而且如前面湧現能力的討論所說，exact match 會讓平滑的進步看起來像突然跳升。

<details class="deep">
<summary>準備動手做：換算成 bits-per-byte</summary>

bits-per-byte = 整段文字的總 loss（以 nats 計，也就是每 token 的平均 cross-entropy × token 數）÷ 文字的 UTF-8 byte 數 ÷ ln 2。上面的例子若 1,000 個字元都是 1 byte，甲約 1.04、乙約 1.43。M2 tiny GPT 用的 bits-per-character 是同一個想法，分母換成字元數。

</details>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

1. 手算：兩段文字 `a b c d e f` 與 `a b c x e f`，以連續 3 個詞為 shingle，Jaccard 相似度是多少？

   <details class="hint">
   <summary>對照答案</summary>

   第一段是 `abc`、`bcd`、`cde`、`def`，第二段是 `abc`、`bcx`、`cxe`、`xef`。共同的只有 `abc`，聯集 7 個，1 ÷ 7 ≈ 0.14。只改一個詞就碰到 3 個 shingle，所以相似度掉很多。

   </details>

2. 70 億參數的模型，訓練狀態約 112 GB。用 ZeRO（optimizer 狀態、梯度、權重都分散存放）分到 4 張 80 GB 的 GPU，每張要存多少？放得下嗎？

   <details class="hint">
   <summary>對照答案</summary>

   112 ÷ 4 = 28 GB，放得下，但還沒算 activation。一般 data parallel 每張都要存完整的 112 GB，放不下。

   </details>

### 必做：MinHash 近似去重

**目標**：實作 pretraining 資料管線中最核心的一步，並量測它的準確度。

**步驟**
1. 從 Hugging Face 的 [`Salesforce/wikitext`](https://huggingface.co/datasets/Salesforce/wikitext)（設定 `wikitext-2-raw-v1`、`train` split）依序取前 500 個至少 100 個詞、且不是標題（不以 ` =` 開頭）的段落，每段當一份文件。
2. 自己製造「近似重複」：隨機挑 100 份，每份產生一個副本，隨機替換、刪除或插入 2–5% 的詞。記下哪些是真正的重複對，當作標準答案。
3. 把每份文件轉成 shingle 集合（連續 3 個詞），先用暴力法算所有文件對的真實 Jaccard 相似度。
4. 實作 MinHash：用 k 個 hash 函式，每個取 shingle 集合的最小值，組成簽章；兩份簽章相同位置相等的比例就是 Jaccard 的估計值。
5. 實作 LSH banding：把簽章切成 b 段、每段 r 個值，任一段完全相同就列為候選對，只對候選對確認相似度。
6. 試至少 3 組（k, b, r）設定，比較準確度與比較次數。
7. 小試算（不寫程式也可以）：給定 10¹⁸ FLOPs 的算力，用 C ≈ 6·N·D 與 Chinchilla 每個參數約 20 個 token 的經驗法則，算出建議的參數量 N 與 token 數 D。

**驗收**
- 在真實 Jaccard > 0.1 的文件對上，MinHash 估計值和真實 Jaccard 的平均絕對誤差小於 0.05（k = 128 時）。只在這些文件對上算，是因為絕大多數文件對的 Jaccard 都是 0，全部一起平均會讓誤差小到沒有意義。
- 在相似度門檻 0.5 下，找出人工重複對的 recall ≥ 0.9，誤判對數 ≤ 標準答案對數的 5%。
- 報告 LSH 實際比較的文件對數，與暴力法的約 18 萬對（600 份文件兩兩比較）相比。
- 三組設定的 recall、誤判數、比較次數列成一張表。
- 步驟 7 的 N 與 D，附算式。

**提示**
- TypeScript：hash 可以自己實作（例如對 32-bit 整數做 `(a·x + b) mod p` 的一組隨機參數），不需要套件。
- Python：先自己寫一次，再用 `datasketch` 套件對照結果。
- 卡住時：
  - 重讀：[訓練資料怎麼準備？](#-訓練資料怎麼準備)（含展開裡的候選機率公式）、[一筆預算走完全程](#-一筆預算走完全程)（必做步驟 7 用到其中的步驟 1）
  - 延伸：diy-llm 第 11 章的去重段落，或 Stanford CS336 資料講次的投影片

**預估**：6 小時

<section class="deep-section">

### 進階：模型線 M3：小模型 pretraining 與迷你 scaling 實驗

**目標**：親手跑出一張 loss 對 compute 的 scaling 圖，並看到資料去重對結果的影響。

**步驟**
1. 以 rasbt 第 5 章（或 M2 tiny GPT 的模型）為基礎，準備一份約數千萬 token 以內的訓練資料，切出固定的 held-out 驗證集。預設用 [`Salesforce/wikitext`](https://huggingface.co/datasets/Salesforce/wikitext) 的 `wikitext-103-raw-v1`（約 1 億 token，取前數千萬）。
2. 選三種模型大小，最大和最小的參數量至少差 4 倍。
3. 每種大小用相同的 LR schedule（warmup + cosine）訓練，記錄每個 checkpoint 的累積 compute（用 6·N·D 估算）與 val loss。
4. 把三條 loss–compute 曲線畫在同一張 log–log 圖上。
5. 用必做題的去重程式處理訓練資料，在去重前後的資料上用同一個模型大小、同樣的 token 數各訓練一次。wikitext 這類乾淨資料本身幾乎沒有近似重複，去重前後可能沒差；可以像必做題一樣人工注入 10–20% 的近似重複再比較，或把「沒差」當成有效結論並解釋原因。
6. 寫一段解讀：在你的最大 compute 下哪個大小最好？和 Chinchilla 20:1 的估計差多少？為什麼小規模實驗可能不符合？

**驗收**
- 一張三條曲線的 log–log 圖，橫軸是 FLOPs、縱軸是 val loss。
- 一張表：去重前後的文件數、token 數、val loss。
- 解讀段落明確寫出你的最佳模型大小、對應的 token 數與參數量的比，以及與 20:1 的差距。

**提示**
- Python：PyTorch；Apple MPS 或 CPU 可以跑百萬到千萬參數等級的模型。
- 想走完整的現代流程，可以改用 [karpathy/nanochat](https://github.com/karpathy/nanochat)：它有 CPU / MPS 的縮小版腳本（作者說明結果不會好），完整版設計在 8×H100 節點上跑，README 估計約 2 小時、約 48 美元，spot instance 可能更便宜；實際費用依雲端價格而定，請先自己試算。
- 算力選擇見[模型線總覽](/projects/model-thread/)。
- 卡住時：
  - 重讀：[長時間訓練怎麼不爆掉？](#-長時間訓練怎麼不爆掉)（cosine 公式）、[模型和資料該多大？](#-模型和資料該多大)（展開說明小規模為什麼可能不符）
  - 延伸：Chinchilla 論文的 Approach 1（固定模型大小、變化 token 數），最接近這個實驗

**預估**：17 小時

</section>

## 自我檢查

1. 為什麼 pretraining 資料要去重？只做完全相同的去重夠嗎？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：重複會導致背誦、浪費算力、評估題目汙染。轉載或小改的文件 hash 完全不同，所以還要近似去重（MinHash）。**常見錯法**：以為 hash 去重就抓得到小改的轉載。**回讀**：[訓練資料怎麼準備？](#-訓練資料怎麼準備)

   </details>

2. 自己算一次：算力 1.2 × 10²¹ FLOPs，依 6·N·D 與每個參數 20 個 token，N 與 D 各是多少？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：代入 D = 20N 得 120N² = C，N = √(10¹⁹) ≈ 32 億，D ≈ 630 億。**常見錯法**：忘了開根號，或把算力直接除以 6。**回讀**：[一筆預算走完全程](#-一筆預算走完全程) 步驟 1

   </details>

3. Chinchilla 說「每個參數約 20 個 token」，為什麼很多新模型用的 token 數遠多於此？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：20:1 只讓訓練最省；推論成本約 2N，模型要服務大量 token 時，多花訓練算力換小模型更划算。**常見錯法**：把 20:1 當成「品質最好」的上限。**回讀**：[模型和資料該多大？](#-模型和資料該多大)

   </details>

4. 混合精度訓練為什麼要另外保留一份 fp32 的主權重？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：bf16 在 1.0 附近的間距約 0.0078，很小的更新加上去會直接消失，所以更新要加在 fp32 上。**常見錯法**：以為是為了計算更快或避免溢位。**回讀**：[長時間訓練怎麼不爆掉？](#-長時間訓練怎麼不爆掉)

   </details>

5. 用自己的話說明 Schaeffer 2023 對「湧現能力」的質疑，並說出一個它可能解釋不了的情況。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：不連續的評分（exact match）會讓平滑的進步看起來像突然出現；但只有全對才有用的任務，使用者看到的仍是突然會了。**常見錯法**：說成「湧現能力已被證明不存在」。**回讀**：[模型和資料該多大？](#-模型和資料該多大) 的湧現一段

   </details>

6. ZeRO 和一般 data parallel 的差別是什麼？它用什麼換到了記憶體？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：一般 data parallel 每張 GPU 存完整一份狀態；ZeRO 把 optimizer 狀態、梯度、權重分散存，用更多通訊換記憶體，計算不會變快。**常見錯法**：以為 ZeRO 也會加速訓練。**回讀**：[一張 GPU 不夠怎麼辦？](#-一張-gpu-不夠怎麼辦)

   </details>

7. 情境題：你在兩個不同 tokenizer 的模型上量到 perplexity 分別是 12 和 18，同事據此說第一個模型比較好。你會怎麼回應？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：perplexity 是每個 token 的平均，不同 tokenizer 的 token 代表的文字量不同，要換成 bits-per-byte 再比。**常見錯法**：直接比數字大小，認定 12 比較好。**回讀**：[怎麼知道練得好不好？](#-怎麼知道練得好不好)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一站需要的內容。下面的資料適合想看原始研究、或想跟著別人一行一行寫程式的人，都不是必讀。

### 跟著寫程式

- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — 第 5 章：在無標註資料上 pretraining，有完整的訓練迴圈、評估與載入預訓練權重的程式碼，M3 小模型 pretraining 可以直接以它為基礎。
- [Hugging Face Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) — 平行化訓練的標準讀物，有實測數字與互動圖；比講義多了每種平行方式的通訊量分析與組合策略。

### 原始論文

- [Kaplan et al. 2020, Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) — 第一篇系統性的 LM scaling laws。
- [Hoffmann et al. 2022, Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556) — Chinchilla 論文；三種估計方法的完整細節。
- [Wei et al. 2022, Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) — 湧現能力的正方，有大量任務的曲線圖。
- [Schaeffer et al. 2023, Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) — 反方；和上一篇一起讀。
- [Rajbhandari et al. 2019, ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) — ZeRO 原始論文，三個階段的記憶體與通訊分析。

### 課程與資料工程

- [Stanford CS336](https://cs336.stanford.edu/) — 資料、scaling、平行化的講次，是這個主題最深的課。
- [Princeton COS 597R](https://princeton-cos597r.github.io) — 資料策展（data curation）的論文清單，包含 Dolma、FineWeb、DCLM 等資料集論文，想深入資料工程時讀。
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) — Scientist 部分第 2 節（pretraining）的連結整理。

### 中文資源

- [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) — 簡中；第 8 章（分散式訓練）、第 9 章（Scaling Laws）、第 11 章（資料工程：過濾、MinHash 去重、PII、配比）。
- [RUC《大语言模型》](https://llmbook-zh.github.io/) — 簡中；資料準備與預訓練的章節。
- [清大 高宏宇 NLP 2026](https://github.com/IKMLab/NTHU_Natural_Language_Processing) — 繁中 / 英文雙語。

### 延伸練習

- ○ 熟資料工程的話：把必做題的 MinHash + LSH 改寫成 DuckDB 或 Spark 版本，在 [FineWeb](https://huggingface.co/datasets/HuggingFaceFW/fineweb) 的 `sample-10BT` 中取約 10 萬份文件跑一次，報告吞吐量與去重比例。

</section>
