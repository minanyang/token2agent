---
title: 數學補給
head:
  - tag: title
    content: AI 數學入門：softmax、標準誤與 cosine｜Token2Agent
description: 學 AI 與 LLM 會用到的六個數學與統計工具：連鎖律、softmax、對數圖、標準誤、bootstrap 信賴區間、cosine 相似度，各附一個能手算的小例子。
sidebar:
  order: 4
---

這頁不是數學課，而是「忘了的時候回來翻」的補給站。每一節先講直覺，再給一個能用計算機驗算的小例子，最後標出哪幾章會用到。只要看得懂例子，就足以讀完對應的章。

## 連鎖律與 backprop

**直覺**：如果 y 依賴 u、u 又依賴 x，那 x 動一點點時，y 變化的倍率等於「u 對 x 的倍率」乘上「y 對 u 的倍率」：dy/dx = dy/du · du/dx。

**例子**：y = (2x + 1)²，在 x = 1。令 u = 2x + 1 = 3，則 y = u² = 9。局部導數 dy/du = 2u = 6，du/dx = 2，所以 dy/dx = 6 × 2 = 12。用數值驗算：x 取 1.001 與 0.999，y 分別是 9.012004 與 8.988004，差 0.024 ÷ 0.002 = 12。

**為什麼 backprop 就是它**：模型是一張由加、乘、tanh 等小運算組成的計算圖。每個運算只需要知道自己的局部導數；backprop 從 loss 出發，沿著圖反向把「上游傳來的梯度 × 局部導數」一路乘下去，就得到 loss 對每個參數的梯度。唯一要額外記住的規則：一個值被用了兩次時，兩條路徑傳回來的梯度要**相加**。例如 f = x · x，兩條路徑各貢獻 x，所以 df/dx = x + x = 2x。上面那種「加減一點點再相除」的數值驗算，就是 S1 神經網路基礎必做題的梯度檢查。

**用在**：[S1 神經網路基礎](/stages/s01-neural-networks/)（autograd、梯度檢查）、[S2 Transformer 與 decoding](/stages/s02-transformer/)（看懂 Transformer 的訓練）。

## Logits、softmax 與 temperature

**直覺**：模型最後一層對詞彙表裡的每個 token 各輸出一個分數，叫 logit，可以是任何實數。Softmax 把這些分數變成加總為 1 的機率：每個分數取 exp，再除以總和。分數差 1，機率就差 e ≈ 2.72 倍。

**例子**：三個 token 的 logits 是 [2, 1, 0]。exp 之後是 [7.389, 2.718, 1]，總和 11.107，所以機率是 [0.665, 0.245, 0.090]。

**Temperature** 是在 softmax 之前把 logits 除以 T：

| T | logits ÷ T | 機率 |
|---|---|---|
| 0.5 | [4, 2, 0] | [0.867, 0.117, 0.016] |
| 1 | [2, 1, 0] | [0.665, 0.245, 0.090] |
| 2 | [1, 0.5, 0] | [0.506, 0.307, 0.186] |

T 越小分布越尖（趨近 0 時就是永遠挑第一名，等於 greedy），T 越大分布越平。

**兩個實作細節**：
- 算 exp 之前先把每個 logit 減去最大值，結果不變，但可以避免 T 很小時 exp 溢位。
- 訓練用的 cross-entropy loss 就是 −ln(正確 token 的機率)。上例若正確答案是第一個 token，loss = −ln 0.665 ≈ 0.41。對 27 個字元完全平均亂猜時，每個機率是 1/27，loss = ln 27 ≈ 3.30，這就是 S1 神經網路基礎說的「初始 loss 應接近的值」。API 回傳的 logprobs 也就是這裡的 ln(機率)。

API 的 `temperature` 參數就是這個 T，但部分 API 已不接受這些參數（例如 Claude 帶 `temperature` 會回 400，見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#sampling-參數的限制)）；需要調 T 的練習請用本地模型（Ollama、llama.cpp）。

**用在**：[S1 神經網路基礎](/stages/s01-neural-networks/)（cross-entropy、perplexity）、[S2 Transformer 與 decoding](/stages/s02-transformer/)（decoding 與 sampling 必做題）、[S4 Post-training 與 reasoning](/stages/s04-post-training/)（抽樣多次）、[模型速成](/guide/app-first/)、[S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S8 Eval 方法論](/stages/s08-evals/)（logprobs 與 calibration）。

## 對數尺度與 log–log 圖

**直覺**：對數軸上，等距代表「等倍數」，不是「等差」。1 → 10 → 100 → 1000 在軸上間隔相同。

**為什麼 scaling 曲線用 log–log 圖**：scaling laws 的形式通常是冪次關係 L = a · C^(−b)（L 是 loss，C 是計算量）。兩邊取對數得到 log L = log a − b · log C，在 log–log 圖上就是一條斜率 −b 的直線。所以：
- 看到一條直線，代表「計算量每乘上固定倍數，loss 就乘上固定比例」。
- 斜率越陡，加算力越划算。
- 曲線開始往上彎離直線，通常表示某個資源（資料、模型大小）不夠了。

**例子**：若 b = 0.05，計算量乘 10 倍，loss 變成原來的 10^(−0.05) ≈ 0.89 倍，也就是降約 11%。再乘 10 倍（總共 100 倍），又再降約 11%。這就是為什麼「再好一點」常常要多花一個數量級的算力。

**Loss 與 perplexity**：perplexity = exp(loss)，所以 loss 的「差」對應 perplexity 的「比」。Loss 從 2.0 降到 1.9，perplexity 從 7.39 降到 6.69。這份路線的 ln 是自然對數，log–log 圖用 log10 或 ln 都可以，斜率相同。

**用在**：[S1 神經網路基礎](/stages/s01-neural-networks/)（perplexity）、[S3 Pretraining 與 scaling](/stages/s03-pretraining/)（scaling laws、M3 小模型 pretraining 的 log–log 圖）。

## 平均、變異數與標準誤

**直覺**：你在 n 題上量到的分數只是一個估計，換一批題目就會不一樣。標準誤（standard error，SE）回答「這個估計大概會晃多少」。

**公式**：
- 平均 = 總和 ÷ n。
- 變異數 = 每個值與平均之差的平方，再取平均；標準差 = √變異數。除以 n 叫母體標準差，除以 n − 1 叫樣本標準差，n 小時兩者差很多（只有 2 個值時差 √2 倍），寫測試時要說清楚用哪一種。
- 平均的標準誤 = 標準差 ÷ √n。通過率 p 這種 0 / 1 分數的標準差是 √(p(1 − p))，所以 SE = √(p(1 − p) / n)。
- 95% 信賴區間大約是「估計值 ± 1.96 × SE」。

**例子**：50 題、通過率 0.8。SE = √(0.8 × 0.2 / 50) = √0.0032 ≈ 0.057，95% 信賴區間約 ±11 個百分點，也就是 69%–91%。題數變 4 倍（200 題），SE 才減半（約 ±5.5 個百分點）。所以想看出幾個百分點的差異，通常需要數百題。

**用在**：[S4 Post-training 與 reasoning](/stages/s04-post-training/)（GRPO 的組內標準差、self-consistency 比較）、[S8 Eval 方法論](/stages/s08-evals/)（統計一節）。

## Bootstrap 信賴區間

**直覺**：不想推公式時，就用電腦模擬「如果重新抽一批題目，分數會怎麼變」。手上的 n 題就當作整個母體，從中重複抽樣，看指標晃多大。

**做法**：
1. 手上有 n 題，每題一個分數（例如答對 1、答錯 0）。
2. 有放回地隨機抽 n 題（同一題可能被抽到好幾次、有的沒抽到），算一次指標。
3. 重複 B 次（1,000–10,000 次）。
4. 把 B 個結果排序，取第 2.5 與第 97.5 百分位，就是 95% 信賴區間。

```text
results = []
repeat B times:
    sample = pick n items from scores, with replacement
    results.append(metric(sample))
sort(results)
ci = (results[0.025 * B], results[0.975 * B])
```

**例子**：50 題答對 40 題（80%），bootstrap 出來的 95% 區間大約落在 68%–90%，和上一節的公式結果相近。公式能算的時候兩者會一致；bootstrap 的好處是指標換成中位數延遲、F1、多數決準確率、Recall@k 時一樣能用。

**比較兩個版本**時，要做**配對** bootstrap：兩個版本在同一批題目上跑，每次重抽的是「題目編號」，算的是兩者分數的差。題目難度造成的變異會互相抵銷，區間會窄很多。差的區間不包含 0，才有把握說「真的有差」。

**什麼時候不適用**：
- 題數太少（例如少於 20 題）時，區間不可靠。這時直接說「樣本太少」，不要報一個看起來很精確的數字。
- 題目之間不獨立（例如同一段對話拆成好幾題）時，要整組一起抽，不能逐題抽。

**用在**：[S4 Post-training 與 reasoning](/stages/s04-post-training/)（N = 1 vs N = 8 的比較）、[S8 Eval 方法論](/stages/s08-evals/)（judge 通過率）、[S9 檢索與 RAG](/stages/s09-rag/)（Recall@k）、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S18 部署與架構](/stages/s18-deployment/)。

## 內積與 cosine 相似度

**直覺**：兩個向量的內積（dot product）是對應位置相乘再加總，方向越一致、長度越長，內積越大。Cosine 相似度把長度除掉，只看方向：1 是同方向，0 是無關（垂直），−1 是相反。

**公式**：a · b = Σ aᵢbᵢ；cos(a, b) = (a · b) ÷ (|a| × |b|)，其中 |a| = √(a · a)。

**例子**：a = [1, 2, 0]，b = [2, 1, 1]。內積 = 2 + 2 + 0 = 4；|a| = √5 ≈ 2.236，|b| = √6 ≈ 2.449；cosine = 4 ÷ 5.477 ≈ 0.73。

**在路線上的兩個用法**：
- **Attention**：用 query 和每個 key 的內積當相似度分數（再除以 √維度，避免數值太大讓 softmax 過尖），經過 softmax 變成權重。
- **Embedding 檢索**：查詢與段落各轉成向量，用 cosine 相似度排序。向量先正規化成長度 1 的話，cosine 就等於內積，很多向量資料庫因此直接用內積。

注意：cosine 的絕對數值依 embedding 模型而不同，「0.8 算相似」這種門檻不能跨模型沿用，要在自己的資料上看分布再決定。

**用在**：[S2 Transformer 與 decoding](/stages/s02-transformer/)（self-attention）、[S9 檢索與 RAG](/stages/s09-rag/)（dense retrieval）、[S13 Memory 與個人化](/stages/s13-memory/)（記憶檢索）。
