---
title: S8 Evals 方法論
head:
  - tag: title
    content: LLM 評估怎麼做？Evals 與 LLM judge（S8）｜Token2Agent
description: LLM 評估怎麼做才可信：從真實 trace 做錯誤分析、寫二元評分標準、用人工標註校準 LLM judge，並為每個指標附上信賴區間，判斷系統是不是真的變好了。
sidebar:
  order: 8
  label: S8 Evals 方法論
---

:::note[這一章]
**前置**：[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)（進階題需要 A6 串流聊天與 trace、A7 structured output 與 workflow 累積的 trace；[代號怎麼讀](/guide/how-to-use/#代號怎麼讀)）；logprobs 的背景見 [模型速成](/guide/app-first/#logits-與-softmax)（深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)）

**銜接**：→ [S9 檢索與 RAG](/stages/s09-rag/)、[S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)（agent evals）
:::

:::tip[理解路線重點]
- 先一條條讀筆記助理的真實紀錄，把失敗分類並計數，再決定要量什麼。
- 每種失敗用一個過或不過的檢查；讓模型當評分者前，先和人工判斷對照。
- 分數會因題目不同而晃動，兩版差距要大過這個晃動才算真的變好。
:::

## 在做什麼

改了 prompt、換了模型、加了檢索之後，怎麼知道系統真的變好了？只看幾個例子的感覺，很容易被少數印象深刻的案例誤導。這一章學一套可以重跑的方法：先讀真實的 trace、歸納出失敗類型，再針對每種失敗設計評分方式，驗證模型評分者跟人的判斷一致，最後用誤差範圍判斷差異是不是真的。

Evals 排在 RAG 和工具之前，因為後面每一章的改動都需要它來判斷值不值得。

## 學完能

- 能從「人工 vs judge」對照表算出 TPR、TNR，並手算通過率的 95% 信賴區間。（講義與自我檢查）
- 能說明 pass@k 與 pass^k 的差別，以及某個 benchmark 分數為什麼不能代表你的產品。（講義與自我檢查）
- 從真實 trace 做錯誤分析，歸納出有計數的失敗分類。（必做用 60 筆輸出；進階用 100 條真實 trace）
- 為每種失敗選擇合適的評分方式，並寫出二元（pass / fail）的評分標準。（必做）
- 用人工標註校準 LLM judge，回報 TPR 與 TNR。（必做）
- 為每個指標附上 95% 信賴區間（必做），並用配對比較判斷兩個版本的差異是不是雜訊（進階）。

## 講義

先看全貌。一套 eval 是一個迴圈：

1. **讀 trace，找出失敗類型**（錯誤分析）：系統實際上怎麼出錯、各有幾筆。
2. **建立 golden set**：從 trace 挑出一批題目，寫下每題的預期行為。
3. **為每種失敗選一個評分者**（grader）：程式、模型或人，各自判 pass / fail。
4. **算分數，附上誤差範圍**：分數是從有限題目估出來的，要知道它會晃多少。
5. **改系統，在同一批題目上重跑**，用配對比較判斷是不是真的變好。

整章沿用同一個例子：**筆記助理**。小林問「上次和設計團隊開會的結論是什麼」，助理讀筆記、回答。上一章讓它的輸出穩定可解析（← [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)），這一章要回答：它的答案到底好不好、改了之後有沒有更好。

### ★ 系統到底怎麼出錯？

在設計任何指標之前，先一條條讀真實的 trace，把失敗歸納成有計數的類別。錯誤分析是 eval 的起點，不是事後補做的事。

**為什麼不直接打分數。** 最直覺的做法是讓人或模型替每個答案打「有用性 1–5 分」。問題是平均 3.6 分不會告訴你哪裡壞了、該修什麼。錯誤分析則會告訴你「40% 的失敗是日期算錯」，這是一個可以寫程式檢查、可以修的具體問題。

**怎麼做。** 做法借自質性研究，分兩步：

- **Open coding**：逐條讀 trace（使用者的問題、助理讀了哪些筆記、最後的回答），用自己的話寫一句「這裡哪裡不對」。每條只記**第一個**出錯的地方，因為後面的錯常是前面的錯連帶造成的；這一步先不分類。
- **Axial coding**：讀完一批之後，把這些註記歸成幾個失敗類別，並數每類有幾條。

持續讀新的 trace，直到不再出現新類別，這個狀態叫 **theoretical saturation**（理論飽和）。Hamel Husain 建議從約 100 條開始，並由一位懂領域的人主導判斷，避免標準搖擺。

**例子。** 讀筆記助理的 100 條 trace，open coding 註記像這樣：「說會議在週四，筆記寫的是週三」「筆記裡沒提到預算，助理自己編了一個數字」「使用者要新增筆記，助理卻當成問題回答」。歸納之後：

| 失敗類別 | 筆數 | 能用程式檢查嗎 |
|---|---|---|
| 答案沒有根據筆記、自己編 | 14 | 否，需要 judge 或人 |
| 搞錯筆記的日期 | 9 | 部分可以（比對日期字串） |
| 把新增筆記的請求當成問題回答 | 5 | 可以（檢查路由結果） |
| 標籤不在詞表內 | 3 | 可以 |
| 沒有失敗 | 69 | — |

這張表直接決定接下來的工作：「自己編」最多，先為它建評分者。

**容易誤會：錯誤分析不是一次性的。** 系統改了、使用者變了，新的失敗類型就會出現。每次大改之後都要再讀一批新的 trace，表格跟著更新。

<details class="deep">
<summary>準備動手做：記錄格式與節奏</summary>

- **欄位**：試算表就夠了。每列一條 trace：trace ID、使用者輸入、輸出（或連到 trace 檢視頁）、open coding 註記、類別（axial coding 之後才填）。
- **先寫註記，後定類別**：一開始就套用預設類別（例如「幻覺」「格式錯誤」），會讓你只看見預期中的問題。類別要從註記裡長出來，名稱要具體到看了就知道怎麼修。
- **一人主導**：多人一起標時，每人對「算不算錯」的門檻不同。由一位懂領域的人決定標準，其他人提出疑問，比投票有效。
- **飽和怎麼判斷**：讀一批新的 trace，如果每條都能歸進既有類別、沒有新的類別出現，就可以先停。
- **工具**：Langfuse、Phoenix 都能在 trace 上加註記；自己做一個「一筆一筆看、鍵盤快速標註」的小頁面，常常更快。

</details>

### ★ 題目從哪裡來？

Golden set 是一組固定的題目，每題附上預期行為，每次改系統都在同一批題目上重跑。它就是你的產品自己的 benchmark。

**為什麼要從 trace 來。** 自己憑空想題目，會偏向你想得到、通常也已經處理好的情況。從錯誤分析的 trace 挑題，題目的分布才接近真實使用，失敗案例也一定涵蓋在內。

**怎麼建。** 每題記三樣東西：輸入（使用者的問題，加上當時的筆記狀態）、預期行為、來源 trace ID。預期行為不一定是一段標準答案，常常是幾條可以檢查的條件。筆記助理的一題可能是：

- 輸入：「上次和設計團隊開會的結論是什麼？」（筆記庫固定在某個版本）
- 預期行為：提到「Q4 改版預算上限 48 萬」與「小林負責追蹤」；引用的筆記是〈2026-10-14 設計團隊會議〉；不出現筆記裡沒有的數字。
- 來源：trace ID `t-0412`

**成功和失敗都要收。** 只收失敗案例，你只會知道修好了沒，不會知道有沒有改壞原本正常的功能。

**容易誤會：golden set 不是越大越好。** 50 題仔細寫好預期行為，比 500 題只有模糊標準答案有用。題數影響的是誤差範圍（見下面的統計一節），題目品質影響的是你量到的東西對不對。

### ★ 誰來判對錯、怎麼判？

評分者（grader）決定每題是 pass 還是 fail。能用程式判斷的就用程式，主觀但描述得清楚的才交給模型，人用來建立標準和檢查模型。

**三種評分者。**

- **程式**：schema 檢查、正規表示式（描述字串樣式的寫法）、比對執行結果。便宜、快、每次結果一樣，能用就先用。例如「標籤都在詞表的 5 個標籤裡」（詞表見 [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）、「引用的筆記 ID 真的存在」。
- **模型**：LLM-as-judge，適合「答案有沒有根據筆記」「語氣是否得體」這類主觀但可以描述的標準。
- **人**：最準但最貴，用來建立標準答案和校準模型評分者。

**二元標準優於 Likert 量表。** Likert 量表是從 1（很差）到 5（很好）這種分級評分。評分標準盡量用二元的 pass / fail：二元標準逼你把「好」講清楚，標註者之間比較一致，結果也直接告訴你要修什麼。3 分和 4 分的差別，換一個人常常就判不一樣。

**一種失敗，一個檢查。** 每個失敗類別對應一個 **unit assertion**（像單元測試一樣，一個檢查只驗一件事）或一個專門的 judge，而不是一個萬用的「整體品質」分數。筆記助理的例子：

| 失敗類別 | 評分者 | pass 的條件 |
|---|---|---|
| 標籤不在詞表內 | 程式 | 每個標籤都在詞表裡 |
| 把新增筆記當成問題 | 程式 | 路由結果等於人工標註的路由 |
| 搞錯日期 | 程式 + judge | 答案裡的日期都出現在引用的筆記中 |
| 自己編 | judge | 答案的每個事實都能在引用的筆記裡找到 |

**容易誤會：pass / fail 不代表只能看單一數字。** 每個類別各有一個通過率，報告時並列；把它們加總成一個「總分」，反而又回到看不出哪裡壞的狀態。

<details class="deep">
<summary>準備動手做：寫一個二元 judge prompt</summary>

- **只判一件事**：prompt 裡寫清楚這個 judge 只看哪個失敗類別，例如「答案中的每個事實是否都能在提供的筆記裡找到」。
- **寫出 pass 與 fail 的定義和邊界例子**：從錯誤分析的註記裡各挑幾條真實的 pass、fail 案例放進 prompt，特別是容易判錯的邊界情況。
- **先寫理由，再給結論**：輸出 `{reason, pass}`，理由在前，讓模型先檢查再下結論；理由也方便你在 judge 判錯時看出原因。用 structured output（← S7 Prompt、structured output 與 workflows）固定格式。
- **給 judge 足夠的資料**：判「有沒有根據筆記」時，要把助理當時讀到的筆記一起給 judge，不然 judge 只能憑常識猜。

</details>

### ★ 模型評分者可信嗎？

模型評分者（LLM-as-judge）方便，但它本身也是一個會出錯的系統，要先拿人工標註驗證，才能相信它給的分數。

**已知的偏誤。** Zheng et al. 2023 整理了三種：**position bias**（比較兩個答案時偏好某個位置）、**verbosity bias**（偏好較長的答案）、**self-enhancement bias**（偏好自己產生的答案）。比較兩個答案時，要交換順序各評一次，兩次結論一致才算數；不一致就記成平手或交給人。

**把 judge 當成分類器來檢查。** 拿一批人工標好 pass / fail 的資料，把 pass 當成要抓的那一類，算兩個數字：

- **TPR**（true positive rate）：人工判 pass 的題目中，judge 也判 pass 的比例。
- **TNR**（true negative rate）：人工判 fail 的題目中，judge 也判 fail 的比例。

**例子。** 「自己編」judge 在 30 筆人工標註上的結果：人工判 pass 的 20 筆，judge 判對 18 筆；人工判 fail 的 10 筆，judge 判對 7 筆。

| | judge 判 pass | judge 判 fail |
|---|---|---|
| 人工 pass（20） | 18 | 2 |
| 人工 fail（10） | 3 | 7 |

TPR = 18 ÷ 20 = 0.9，TNR = 7 ÷ 10 = 0.7。整體準確率是 25 ÷ 30 ≈ 83%，看起來不錯，但 TNR 0.7 代表每 10 個真的在亂編的答案，judge 會放過 3 個，而抓出亂編正是這個 judge 存在的目的。

**為什麼不看整體準確率。** 資料不平衡時它會騙人：如果 90% 的答案都通過，一個永遠說「通過」的 judge 也有 90% 準確率，TNR 卻是 0。

**dev 與 test 分開。** 調整 judge prompt 時只看一組資料（dev），調完之後在另一組沒看過的資料（test）上算 TPR、TNR 再回報。在同一組資料上調到滿意再回報，數字會偏高，因為 prompt 已經「背」過這批題目的特例。

**容易誤會：評分標準不是一開始就能定死。** Shankar et al. 2024 指出 **criteria drift**：人在評分的過程中，對「好」的定義會改變。看了 30 個答案之後，你可能才發現「引用了正確的筆記、但漏掉關鍵結論」也該算 fail。所以標準要寫下來、隨著看更多資料修訂，修訂後重新標註受影響的題目。

<details class="deep">
<summary>準備動手做：fail 太少，以及 TPR / TNR 的誤差</summary>

- **fail 太少**：系統表現不錯時，30 筆裡可能只有 2–3 筆 fail，TNR 根本算不準。可以用較小的模型或故意弱化的 prompt 再產生一批輸出，專門用來湊 fail 樣本校準 judge；這些輸出不計入系統本身的通過率。
- **TPR / TNR 也要附區間**：它們也是從有限樣本估出來的比例。只有 10 筆 fail 時，TNR = 0.8 的 95% 信賴區間大約是 ±25 個百分點（√(0.8 × 0.2 ÷ 10) ≈ 0.126，乘以 1.96），也就是說 TNR 真正落在 0.55 到 1 之間都有可能。區間很寬本身就是結論：需要更多 fail 樣本。n 小、p 接近 0 或 1 時，這個公式的區間不準（上例上限超過 1），改用 Wilson 區間（這例約 0.49–0.94）。
- **用 judge 的結果估通過率**：judge 判出來的通過率帶著 judge 自己的錯誤。TPR、TNR 都高時影響小；TNR 低時，judge 報的通過率會比實際高。

</details>

### ★ 差幾分才算真的變好？

Eval 分數是從有限的題目估出來的，換一批題目就會不一樣。每個分數都要附上「它大概會晃多少」，比較兩個版本時，差異要大過這個晃動才算數。

**分數會晃多少。** 筆記助理在 golden set 的 50 題上答對 40 題，通過率 80%。如果再從同樣的使用情境裡另外抽 50 題，結果可能是 37 題或 43 題。描述這種晃動的數字叫**標準誤**（standard error，SE）；通過率 80%、50 題時約 5.7 個百分點（算式見下方展開）。

**信賴區間。** 把估計值往兩邊各延伸約 2 個標準誤（精確是 1.96 個），就得到 **95% 信賴區間**（confidence interval）：80% ± 11 個百分點，也就是約 69%–91%。意思是：用這種方法算區間，100 次裡大約有 95 次會涵蓋真正的通過率。報告時寫「80%（95% 信賴區間 69%–91%）」，而不是只寫「80%」。

**題數和誤差的關係。** 標準誤隨題數的平方根縮小：題數變 4 倍，標準誤才減半。50 題時區間約 ±11 個百分點，200 題時約 ±5.5 個百分點。所以想看出幾個百分點的差異，通常需要數百題，而不是幾十題。

**Bootstrap：不用公式的做法。** 通過率有上面的公式，但其他指標（例如中位數延遲）不一定有簡單公式。**Bootstrap** 用電腦模擬「重新抽一批題目」：把手上的 50 題當成全部，從中有放回地重抽 50 題、重算分數，重複上千次，看分數分布的中間 95% 落在哪裡。50 題答對 40 題時，bootstrap 得到的區間大約也是 68%–90%，和公式一致；好處是任何指標都能這樣算。白話的完整說明見[數學補給〈Bootstrap 信賴區間〉](/guide/math-refresher/#bootstrap-信賴區間)。

**配對比較。** 改了 prompt 之後，新版本答對 43 題（86%），舊版 40 題（80%），差 6 個百分點。如果把兩個分數當成互不相關、各自算區間，差值的 95% 信賴區間約是 6 ± 15 個百分點（兩個分數各自的晃動疊加起來，算式見下方展開），幾乎什麼都說不出來。但兩個版本跑的是**同一批題目**，可以逐題比較：

| 舊版 | 新版 | 題數 |
|---|---|---|
| 對 | 對 | 38 |
| 錯 | 錯 | 5 |
| 錯 | 對 | 5（新版修好） |
| 對 | 錯 | 2（新版改壞） |

兩版都對或都錯的 43 題，不管題目難易，對差值都沒有貢獻；真正有資訊的只有結果不同的 7 題。逐題看差值算區間（**配對比較**），差值的 95% 信賴區間縮到約 6 ± 10 個百分點，也就是 −4 到 +16（算式見下方展開）。區間包含 0，結論是「無法區分」：新版可能較好，但 50 題還不足以確定。要分出這樣的差距，需要更多題目。

**判斷規則。** 配對差值的 95% 信賴區間不包含 0 才算顯著：整個區間大於 0 是較好，小於 0 是較差，包含 0 就是無法區分。用 bootstrap 算配對差值的區間時，每次重抽的是**題目編號**：同一題在兩個版本的結果一起被抽到，再算差值（步驟見下方展開）。

**容易誤會：「無法區分」不等於「一樣好」。** 它只表示目前的題數看不出差別。上面的例子裡，新版其實修好 5 題、只改壞 2 題，值得加題目再測，而不是直接判定改動沒用。

<details class="deep">
<summary>準備動手做：公式、bootstrap 步驟與題目不獨立的情況</summary>

公式版（白話複習見[數學補給〈標準誤〉](/guide/math-refresher/#平均變異數與標準誤)）：

- 通過率 p、題數 n 時，標準誤 SE = √(p(1 − p) / n)。50 題、p = 0.8：√(0.8 × 0.2 ÷ 50) = √0.0032 ≈ 0.057。
- 95% 信賴區間 ≈ p ± 1.96 × SE。0.8 ± 1.96 × 0.057 ≈ 0.8 ± 0.11。
- 不配對時，兩個版本差值的 SE = √(SE₁² + SE₂²)。上例：√(0.0032 + 0.86 × 0.14 ÷ 50) ≈ √0.0056 ≈ 0.075，乘以 1.96 約 ±15 個百分點。
- 配對時，每題算差值 dᵢ（新版分數 − 舊版分數，只會是 +1、0、−1），差值的 SE = dᵢ 的樣本標準差 ÷ √n。上例 5 題 +1、2 題 −1、43 題 0：平均 0.06，樣本變異數約 0.139，SE = √(0.139 ÷ 50) ≈ 0.053，乘以 1.96 約 ±10 個百分點。

Bootstrap 的步驟（完整版與虛擬碼見[數學補給](/guide/math-refresher/#bootstrap-信賴區間)）：

1. 從 n 題中**有放回**地隨機抽 n 題（同一題可能被抽到多次），在這批題目上重算指標。
2. 重複 1,000 次以上。
3. 把得到的指標排序，取第 2.5 與第 97.5 百分位當 95% 信賴區間。

- **配對 bootstrap**：每次抽的是「題目編號」，兩個版本用同一批抽到的題目算差值，再對差值取百分位。
- **題目不獨立**：同一篇筆記出了好幾題、或同一段對話拆成好幾題時，這些題目的對錯會一起動。Miller 2024 建議用 clustered standard errors；用 bootstrap 的話，要以整組題目為單位重抽，不能逐題重抽，否則區間會窄得不真實。
- **題數太少**（例如少於 20 題）時，bootstrap 區間不可靠，直接寫「樣本太少」。
- **Miller 2024 的兩個主要建議**就是本節的兩件事：每個分數附上信賴區間；比較版本時用配對比較。
- 樣本數要怎麼事先規劃、一次比較很多版本時要注意什麼，見下方 ○ 統計進階。

</details>

### ★ 要量能力還是可靠度？

題目分兩組：量「還做不到的事」的 capability eval，和量「應該一直做得到的事」的 regression eval。同一題跑多次時，要看的是「至少一次成功」還是「每次都成功」，取決於使用者怎麼用這個功能。

**兩種 evals。** **Capability eval** 的通過率低，目的是告訴你往哪裡改進，例如「回答需要跨三篇筆記整合的問題」。**Regression eval** 的通過率應該接近 100%，目的是防止改 A 壞 B，例如「標籤都在詞表內」。capability eval 裡的題目穩定通過之後，就「畢業」移到 regression eval。

**同一題跑多次。** LLM 的輸出每次可能不同，所以同一題常會跑 k 次：

- **pass@k**：k 次中至少一次成功的機率。來自程式碼生成的評估（Chen et al. 2021），適合你能自動驗證、從多個答案中挑出正確那個的情況，例如生成程式碼後跑測試。
- **pass^k**：k 次全部成功的機率。來自 τ-bench（Yao et al. 2024），量的是可靠度。使用者每次都會遇到的功能應該看這個。

**例子。** 筆記助理的路由單次正確率 90%，各次獨立。pass@3 = 1 − 0.1³ = 99.9%，聽起來很好；但使用者一天用 8 次，8 次全對的機率 pass^8 = 0.9⁸ ≈ 43%，也就是一半以上的日子會遇到至少一次路由錯誤。

**容易誤會：pass@k 高不代表使用者體驗好。** 使用者只會看到一個答案，沒有人幫他從 k 個答案裡挑對的那個。除非系統真的會自動驗證並挑選，否則應該看 pass^k 或單次成功率。

Agent 的多步驟任務怎麼評估（trajectory eval、模擬使用者）留到 [S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)。

<details class="deep">
<summary>深入一點：從 n 次樣本估 pass@k 與 pass^k</summary>

直接跑 k 次算一次「有沒有成功」，估計值的變異很大。實務上每題跑 n 次（n ≥ k），其中 c 次成功，再用組合數估計：

- pass@k ≈ 1 − C(n − c, k) ÷ C(n, k)：從 n 次中隨機挑 k 次，全部失敗的機率，再用 1 減掉。Chen et al. 2021 提出這個無偏估計。
- pass^k ≈ C(c, k) ÷ C(n, k)：從 n 次中隨機挑 k 次，全部成功的機率。τ-bench 用這個方式計算。

例如 n = 10、c = 8、k = 2：pass@2 = 1 − C(2, 2) ÷ C(10, 2) = 1 − 1 ÷ 45 ≈ 0.978；pass^2 = C(8, 2) ÷ C(10, 2) = 28 ÷ 45 ≈ 0.622。最後對所有題目取平均。

</details>

### ★ 公開 benchmark 能信嗎？

公開 benchmark 適合縮小候選模型的範圍，但它量的不是你的產品；最後的判斷要靠自己的 golden set。

**三個常見問題。**

- **Contamination（汙染）**：測試題出現在模型的訓練資料裡，分數高可能只是背過。
- **Saturation（飽和）**：頂尖模型都接近滿分，benchmark 再也分不出高下。
- **Construct validity（建構效度）**：benchmark 量到的東西，是不是它宣稱要量的能力。Bean et al. 2025 審閱了 445 個 LLM benchmark，發現許多在任務設計與評分方式上都有削弱結論可信度的問題。

**例子。** 某模型在一個通用問答 benchmark 上比現在用的模型高 3 分。對筆記助理來說，這 3 分可能來自 benchmark 裡的百科知識題，而筆記助理的工作是根據使用者的筆記回答、不准自己補知識。拿兩個模型在自己的 golden set 上做配對比較，才知道換了是不是真的更好。

**容易誤會：benchmark 分數高的模型，在你的任務上不一定比較好。** 即使 benchmark 本身設計良好，它的題目分布和你的使用者也不同。

### ★ 模型知道自己沒把握嗎？

如果能知道模型對某個答案有多少把握，就可以在沒把握時讓它說「我不確定」，而不是自信地答錯。前提是這個「把握」要和實際正確率對得上。

**信心從哪裡來。** 模型輸出每個 token 時，都先給出一個機率分布（logits 經過 softmax，← [模型速成](/guide/app-first/#logits-與-softmax)；深入：[S2 Transformer 與 decoding](/stages/s02-transformer/)）。部分 API 和本地推論引擎可以回傳這些機率的對數，叫 **logprobs**。答案 token 的機率可以當作「信心」：logprob −0.1 換回機率約 0.90，−2.3 約 0.10（機率＝e 的 logprob 次方）。

**Abstention（棄答）。** 信心低於某個門檻時，不給答案，改說「我不確定」或轉給人。筆記助理被問到筆記裡沒有的事時，棄答比編一個答案好得多。

**Calibration（校準）。** 只有模型 **calibrated** 時，信心才能拿來決定要不要棄答：信心 80% 的答案，大約 80% 是對的。檢查方法是畫 **reliability diagram**：把答案依信心分組（例如 0.6–0.7、0.7–0.8……），每組算實際準確率，畫成圖和對角線比較。如果信心 0.9 那組實際只對了 60%，模型就是過度自信，門檻要另外調。Kadavath et al. 2022 發現大型模型在部分設定下相當 calibrated，但後訓練、題型和提問方式都會影響。

**拿不到 logprobs 時。** 不是每家 API、每個模型都提供 logprobs（推理模型通常沒有）。替代做法是同一題抽樣多次，看答案是否一致（self-consistency）：5 次有 5 次答案相同，比 5 次各說各話可信；或讓模型自己說出信心，但這通常較不可靠。不管用哪種，都要用 reliability diagram 檢查。

**容易誤會：模型說「我很確定」不代表它很可能是對的。** 文字裡的信心和實際正確率常常對不上，一定要拿有標準答案的資料量過。[S17 產品與 AI UX](/stages/s17-ai-ux/) 會再談怎麼把不確定性呈現給使用者。

### ★ 一個任務花多少錢？

成本要以「完成一個任務」為單位計算，而且和品質一起報；否則品質的提升可能是用好幾倍的成本換來的。

**為什麼以任務為單位。** 使用者問一個問題，系統可能呼叫模型好幾次：先分類路由、再回答，失敗時重試。只看「每次呼叫多少錢」會低估真正的成本。

**例子（價格為示意）。** 筆記助理回答一個問題：路由呼叫 0.1 美分、回答呼叫 0.8 美分，10% 的請求要重試回答一次。每任務成本 = 0.1 + 0.8 × 1.1 = 0.98 美分。如果新版 prompt 讓通過率提升 2 個百分點，但 prompt 加長讓回答呼叫的成本變成三倍（2.4 美分），每任務成本會變成約 2.7 美分（0.1 + 2.4 × 1.1 = 2.74），這個取捨要明白寫出來。Kapoor et al. 2024 對 agent 評估提出同樣的批評：只報準確率、不報成本，比較就不公平。

**預算與警示。** 替整個 eval run 和日常使用各設一個預算，超過時發出警示。Judge 的呼叫也是成本，一次 eval run 要算進去。從 [S6 LLM API 與應用基本功](/stages/s06-llm-api/) 開始記錄的每次呼叫成本，就是這裡的原始資料。

**容易誤會：便宜的模型不一定讓每任務成本變低。** 如果它的失敗率高、需要更多重試或人工處理，算到任務層級反而可能更貴。

<section class="deep-section">

### ○ 統計進階：樣本數規劃、多重比較、標註者一致性、校準指標

給熟統計、想算得更精確的讀者。這些都不是必做題的要求。

**樣本數規劃（檢定力）**：先決定想偵測多大的差異 d，再算要幾題。配對比較時，以 5% 顯著水準、80% 檢定力（真的有差異 d 時，有 80% 的機率偵測到）為例，題數約為 (1.96 + 0.84)² × 配對差值的變異數 ÷ d²。配對差值的變異數不知道時，先用 30–50 題的小樣本估一個，再算需要的題數。

**多重比較**：一次比較 4 個 prompt 變體、每個都用 95% 信賴區間判斷時，至少一個「看起來顯著」的機率會比 5% 高很多。可以用 Bonferroni 校正（顯著水準除以比較次數，例如 4 次比較就用 98.75% 信賴區間），或事先只指定一組要正式比較的版本，其他當探索。

**標註者一致性（Cohen's κ）**：兩位標註者的一致率，扣掉「隨便猜也會一致」的部分之後還剩多少，就是 Cohen's κ；1 是完全一致，0 是和隨機猜一樣。有多位標註者時，先用 κ 檢查人和人之間是否一致；人和人都對不齊時，評分標準本身需要改寫，這時拿人工標註算 judge 的 TPR / TNR 沒有意義。

**校準指標（ECE、Brier score）**：要用一個數字總結 calibration 時，**ECE**（expected calibration error）把答案依信心分組，算每組「平均信心 − 實際準確率」的絕對值，再依組內筆數加權平均；**Brier score** 是每筆（信心 − 實際對錯 0 或 1）² 的平均，越小越好。ECE 依分組方式而變，報告時寫明分幾組。

</section>

<section class="deep-section">

### ○ 繁中評測和合成題能用嗎？

想知道模型在台灣語境、繁體中文上的表現，可以參考 TMLU、TMMLU+、TCEval 等評測（見 [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM)）。用 LLM 產生評測題目可以快速擴充數量，但題目常偏簡單、風格單一，而且用同一家模型出題又答題會高估分數；合成題應該補充、而不是取代從真實 trace 來的題目。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

小林問「設計團隊下次什麼時候開會？」，引用的筆記寫「下次 10/28 再開」，助理回答：「下次會議是 10/21，屆時會確認 Q4 預算。」寫出這條 trace 的 open coding 註記，再為這種失敗寫一條二元的 pass 條件，並說明該用哪種評分者。

<details class="hint">
<summary>對照答案</summary>

註記只記第一個錯：「下次開會日期說成 10/21，筆記寫 10/28」。「屆時會確認預算」筆記裡也沒有，先不記；它若反覆出現，之後可另成一類。pass 條件例如「答案裡的每個日期都出現在引用的筆記中，而且指的是同一件事」；比對日期字串可以用程式，判斷「是不是同一件事」要加 judge。

</details>

### 必做：從輸出到校準過的 judge

必做題沿用 [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 的合成短文，而不是筆記助理：資料有標準答案、別人也能重跑，練的方法完全相同。

**目標**：為一個小型 LLM 功能做完一輪錯誤分析，並建立一個經人工校準的 judge。

**步驟與驗收**（分四個階段，做完任一階段都能停下來檢查成果）

**階段 1：錯誤分類**（步驟 1–3）

1. 選一個 LLM 功能並準備 60 筆輸入，二選一：
   - **預設**：[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 必做題的 `summary` 欄位。取那 100 段短文的前 60 段，功能是「用一句話摘要這段文字」。
   - **英文替代**：Hugging Face 資料集 [`abisee/cnn_dailymail`](https://huggingface.co/datasets/abisee/cnn_dailymail)（版本 3.0.0）test split 的前 60 篇新聞，功能是「把新聞摘要成一句話」。

   產生 60 筆輸出並存下來，連同產生它們的程式與 prompt 一起 commit。
2. Open coding：逐筆閱讀，每筆寫一句「哪裡不對」（沒問題就寫 OK）。
3. Axial coding：把註記歸成失敗類別（通常 3–6 個；資料裡實際有幾類就幾類，不要硬湊），數每類幾筆。

驗收：60 筆都有 open coding 註記；失敗類別從註記歸納而來，每類有計數。

**階段 2：寫 grader**（步驟 4）

4. 選一個無法用程式檢查的類別，寫一個二元 judge prompt：輸出理由與 pass / fail。

成果：一份 judge prompt，可以先拿幾筆輸出試跑（這個階段沒有數字驗收）。

**階段 3：校準 judge**（步驟 5–6）

5. 自己為 60 筆標註這個類別的 pass / fail（把 pass 當成要抓的那一類）。分成 dev 30 筆、test 30 筆，確保 test 裡至少有 10 筆 fail。fail 不夠的話，用較小的模型或故意弱化的 prompt（例如拿掉長度限制）再產生一批輸出，標註後依比例分到 dev 與 test，並記下補了幾筆；之後的 dev / test 筆數以實際筆數為準。
6. 只用 dev 調整 judge prompt。調整完先 commit judge prompt，再在 test 上跑一次，算 TPR（人工 pass 中 judge 也判 pass 的比例）與 TNR（人工 fail 中 judge 也判 fail 的比例），並把 test 結果檔也 commit。

驗收：
- Judge 在 test 上（至少 30 筆、其中至少 10 筆 fail，以實際筆數為準）TPR ≥ 0.8 且 TNR ≥ 0.8，並附上兩者的 95% 信賴區間（只有 10 筆左右的 fail 時，TNR 的區間會很寬，這也是結論的一部分）；沒達到 0.8 的話，寫出你認為的原因與下一步。
- 證明 test 結果出來之後 judge prompt 沒有再修改：judge prompt 最後一次修改的 commit 是 test 結果 commit 的祖先，而且之後沒有再改 judge prompt（用 `git log -- <judge prompt 檔>` 可以驗證）。

**階段 4：統計比較**（步驟 7）

7. 用 judge 在原本的 60 筆輸出上算通過率，再用 bootstrap 算 95% 信賴區間。第 5 步補進來的弱化輸出只是為了湊到足夠的 fail 來校準 judge，不計入通過率。

驗收：原本 60 筆的通過率附 95% bootstrap 信賴區間（例如「72%，95% 信賴區間 60%–83%」）。

**提示**
- TypeScript：用 structured output（← S7 Prompt、structured output 與 workflows）讓 judge 輸出 `{reason, pass}`；bootstrap 自己寫 20 行即可。
- Python：pandas 整理標註；[`scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) 算區間。
- 標註工具：試算表就夠了。想快一點，可以做一個按 `p` / `f` 逐筆標註的小網頁、Streamlit 頁面、Jupyter `ipywidgets` 按鈕或終端機腳本，通常 30–60 分鐘。
- 成本：60 筆產生加上 judge 迭代約數百次呼叫，用便宜的模型通常不到 2 美元。
- 卡住時：
  - 重讀：[系統到底怎麼出錯？](#-系統到底怎麼出錯)、[模型評分者可信嗎？](#-模型評分者可信嗎)（含「fail 太少」）、[差幾分才算真的變好？](#-差幾分才算真的變好)
  - 延伸：[數學補給〈Bootstrap 信賴區間〉](/guide/math-refresher/#bootstrap-信賴區間)；Hamel〈Using LLM-as-a-Judge〉

**提醒**：主要的工作量在兩輪人工閱讀與標註。

<section class="deep-section">

### 進階：系統專案 A8：錯誤分析、golden set 與 eval runner

**目標**：用你系統的真實 trace 建立第一套可重跑的 eval。

**步驟**
1. 從系統專案前兩步（A6 串流聊天與 trace、A7 structured output 與 workflow）的系統匯出至少 100 條真實 trace（不夠的話繼續用到夠，或請你的使用者幫忙用）。
2. 做 open / axial coding 直到飽和，產出一張失敗分類表：類別、定義、計數、範例 trace ID。
3. 從 trace 建立 golden set ≥ 50 題：包含失敗和成功的案例，每題記錄來源 trace ID 與預期行為。
4. 對至少 2 種失敗寫程式 assertion；對至少 1 種主觀失敗建立 LLM judge，用 ≥ 20 筆未參與調整的人工標註校準。
5. 寫一個 eval runner：一個指令跑完 golden set，輸出每個指標的通過率、95% 信賴區間、這次 eval 的總成本，以及系統的平均每任務成本。
6. 把題目標成 capability 或 regression 兩組。
7. 用 runner 比較兩個 prompt 版本（或兩個模型），用配對比較判斷差異是否顯著。

**驗收**
- 失敗分類表至少涵蓋 100 條 trace，類別有計數。
- Golden set ≥ 50 題，100% 都有來源 trace ID。
- Judge 在保留的標註資料上 TPR、TNR 都 ≥ 0.8。
- 每個指標都附 95% 信賴區間；報告中有 eval 總成本與每任務成本。
- 一份配對比較報告，結論明確寫出「顯著較好 / 較差 / 無法區分」：配對差值的 95% 信賴區間不包含 0 才算顯著（整個區間大於 0 是較好、小於 0 是較差），包含 0 就是無法區分。

以筆記助理為例：常見的失敗類別可能是「答案沒有根據筆記、自己編」「搞錯筆記的日期」「標籤不在詞表內」「把新增筆記的請求當成問題回答」；前兩類需要 judge 或人工，後兩類可以寫程式檢查。

**提示**
- TypeScript：eval runner 可以是一個 Vitest 以外的獨立 script，避免和單元測試混在一起；結果存成 JSONL 方便比較。
- Python：pytest 或純 script 皆可；[promptfoo](https://www.promptfoo.dev/docs/intro/) 也能當 runner，但先自己寫一次，才知道它幫你做了什麼。
- 資料檢視：Langfuse、Phoenix 都能標註 trace；或自己做一個簡單的檢視頁，Hamel 的 Field Guide 很推薦這樣做。不寫網頁的話，Jupyter notebook 或 Streamlit 也能做出同樣的「一筆一筆看、快速標註」流程。
- 成本：一次 eval run 通常是幾十到幾百次呼叫；記下來，到 [S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/) 時會反覆跑。
- 卡住時：
  - 重讀：[系統到底怎麼出錯？](#-系統到底怎麼出錯)、[題目從哪裡來？](#-題目從哪裡來)、[差幾分才算真的變好？](#-差幾分才算真的變好)
  - 延伸：Hamel〈A Field Guide to Rapidly Improving AI Products〉；Miller 2024 的配對比較段落

</section>

## 自我檢查

1. 為什麼錯誤分析要在設計指標之前？如果直接用「有用性 1–5 分」會漏掉什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：平均分數不告訴你哪裡壞、該修什麼；錯誤分析給出有計數、可以檢查和修的失敗類別，指標從這些類別來。**常見錯法**：先定指標再找資料，只量到預期中的問題。**回讀**：[系統到底怎麼出錯？](#-系統到底怎麼出錯)

   </details>

2. 一個 judge 的準確率是 92%，你可以直接相信它嗎？還需要看什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：fail 少時，準確率高也可能 TNR 很低；要看 test 上的 TPR 與 TNR，而且 test 沒參與調整 prompt。**常見錯法**：資料不平衡時只看整體準確率。**回讀**：[模型評分者可信嗎？](#-模型評分者可信嗎)

   </details>

3. 版本 A 通過率 78%、版本 B 82%，各 50 題。你能說 B 比較好嗎？要怎麼判斷？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：50 題的區間約 ±11 個百分點，4 點差距不夠；要在同一批題目上做配對比較，看差值的 95% 信賴區間是否包含 0。**常見錯法**：把「無法區分」說成「一樣好」。**回讀**：[差幾分才算真的變好？](#-差幾分才算真的變好)

   </details>

4. 一個功能單次成功率 95%，使用者每天用 10 次。用 pass^k 的觀點，這對使用者體驗代表什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：pass^10 = 0.95¹⁰ ≈ 0.60，約 40% 的日子會遇到至少一次失敗。**常見錯法**：看到單次 95% 就以為體驗夠好。**回讀**：[要量能力還是可靠度？](#-要量能力還是可靠度)

   </details>

5. 情境題：主管看到某模型在一個公開 benchmark 上贏了 3 分，要求立刻換模型。你會怎麼回應，並提出什麼驗證步驟？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：benchmark 可能有汙染、飽和或效度問題，題目分布也不是你的使用者；在自己的 golden set 上做配對比較，並一起看每任務成本。**常見錯法**：把 benchmark 分數當成自己產品的表現。**回讀**：[公開 benchmark 能信嗎？](#-公開-benchmark-能信嗎)

   </details>

6. 一個 judge 在 test 上的結果：人工 pass 的 25 筆中判 pass 22 筆，人工 fail 的 10 筆中判 fail 6 筆。算出 TPR、TNR 與整體準確率，這個 judge 可以用嗎？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：TPR = 22 ÷ 25 = 0.88，TNR = 6 ÷ 10 = 0.6，整體 28 ÷ 35 = 80%；TNR 0.6 代表每 10 個 fail 放過 4 個，還不能用。**常見錯法**：看整體 80% 就說可以用。**回讀**：[模型評分者可信嗎？](#-模型評分者可信嗎)

   </details>

7. 筆記助理 50 題答對 40 題，95% 信賴區間約 ±11 個百分點。題數加到 200 題、通過率不變，區間大約變成多少？為什麼不是 ±2.75？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：標準誤隨題數的平方根縮小，題數 4 倍、區間減半，約 ±5.5 個百分點。**常見錯法**：以為區間和題數成反比。**回讀**：[差幾分才算真的變好？](#-差幾分才算真的變好)

   </details>


:::tip[走應用路線的讀者]
不讀 Part I 模型原理也能繼續往下走。想深入的話，現在是選讀 [S2 Transformer 與 decoding](/stages/s02-transformer/) 與 [S5 推論與 serving](/stages/s05-inference/) 的好時機，這兩章和應用最相關（見[應用路線](/guide/app-first/#什麼時候值得讀-part-i)）。
:::

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看更多實務細節、原始論文或跟著課程練習的人，都不是必讀。

### 實務指南

- [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)（2024-03-29）— 為什麼要做 eval，以及三個層級的評估，有完整的真實案例。
- [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/)（2026-09）— 錯誤分析、binary vs Likert、judge 校準的問答集；持續更新，是這一章最值得追蹤的來源。
- [Hamel Husain: A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/)（2025-03-24）— 錯誤分析與資料檢視工具的實務，做 A8 錯誤分析與 golden set 時很有用。
- [Hamel Husain: Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/)（2024-10-29）— 一步步建立並校準 judge，對應必做題。
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)（2026-01-09）— 先讀詞彙與 grader 分類的部分，agent 部分留到 S14 Agent evals、資料與最佳化。
- Chip Huyen《AI Engineering》（付費書）第 3–4 章 — 評估方法與評估流程的系統性整理。

### 原始論文

- [Miller 2024, Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) — 信賴區間、配對比較、clustered standard errors 與樣本數的完整推導。
- [Zheng et al. 2023, Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) — judge 三種偏誤的原始實驗。
- [Shankar et al. 2024, Who Validates the Validators?](https://arxiv.org/abs/2404.12272) — criteria drift 與 judge 對齊的使用者研究。
- [Chen et al. 2021, Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) — pass@k 的定義與無偏估計。
- [Yao et al. 2024, τ-bench](https://arxiv.org/abs/2406.12045) — pass^k 的出處。
- [Bean et al. 2025, Measuring what Matters: Construct Validity in LLM Benchmarks](https://arxiv.org/abs/2511.04703) — 445 個 benchmark 效度的系統性審閱。
- [Kadavath et al. 2022, Language Models (Mostly) Know What They Know](https://arxiv.org/abs/2207.05221) — 大型模型 calibration 的實驗。
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — 品質與成本要一起報的論證。

### 課程與工具

- [Stanford CS 329Z](https://cs329z.stanford.edu/) 第 13、15 講（2026 秋季；第 15 講的投影片公開後再讀）；[Stanford CS224N](https://web.stanford.edu/class/cs224n/) 的第 4 份作業（LLM 評估）。
- [anthropics/courses](https://github.com/anthropics/courses) — prompt evaluations 課程，有可執行的範例。已封存。
- [Ragas](https://docs.ragas.io/) 等 RAG 評估框架 — S9 檢索與 RAG 會用到；先理解它的指標怎麼算，再拿來用。

### 中文資源

- [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) — 簡中；第 12 章評估與作業 6。
- [datawhalechina/tiny-universe](https://github.com/datawhalechina/tiny-universe) — 簡中；TinyEval 是最小的評估框架實作。
- [台大 李宏毅 生成式 AI 導論 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php) — 繁中；第 12 講〈淺談檢定大型語言模型能力的各種方式〉。
- [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM) — 繁中評測集（TMLU 等）的入口。是模型 repo，不是教材。

</section>
