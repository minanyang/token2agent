---
title: S4 Post-training 與 reasoning
description: 讓 base model 變成好用的助手與推理模型：SFT、LoRA、RL、偏好對齊、可驗證獎勵，以及這些方法的副作用。
sidebar:
  order: 4
  label: S4 Post-training 與 reasoning
---

:::note[這一站]
**⏱ 講義** 首次閱讀約 3 小時，手算與深入內容約 2 小時　**必做題** 約 10 小時　**進階題** 約 22 小時

**前置**：[S3 Pretraining 與 scaling](/stages/s03-pretraining/)（也會用到 [S2 Transformer 與 decoding](/stages/s02-transformer/) 的 sampling）　**銜接**：→ [S5 推論與 serving](/stages/s05-inference/)；agentic RL 在 [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)接續
:::

:::tip[理解路線重點]
- 剛預訓練完的模型只會接著寫，要再訓練才會變成聽指令、會解題的助手。
- 主要的訓練訊號有三種：示範好回答、比較兩個回答、讓程式自動對答案。
- 模型只追求給它的分數；分數和真正目標有落差，它就會鑽漏洞。
:::

## 在做什麼

Pretraining 出來的 base model 只會「接著寫下去」，不會好好回答問題。這一站回答：怎麼用相對少的資料與算力，把它變成聽指令的助手，再變成會一步步解題的推理模型？主線是三種訓練訊號：理想回答的範例（SFT）、兩個回答的比較（偏好學習）、程式自動對答案（可驗證獎勵的 RL），再加上推論時多花算力換品質。同樣重要的是副作用：reward hacking、sycophancy、遺忘，以及怎麼判斷「模型變好了」是不是真的。

## 學完能

- 能用一道例題說明 base、instruct、reasoning model 的回答差在哪，以及各自靠哪一種訓練訊號（範例、比較、自動對答案）得到。（講義與自我檢查）
- 判斷一個「模型變好了」的說法是否可信：有沒有 held-out 資料、有沒有和 base 比、有沒有信賴區間。（講義與自我檢查；必做實際判斷一次）
- 在真實的小模型上跑完 SFT → LoRA → DPO → GRPO，並用實測數字說明每一步帶來什麼改變。（進階；必做只寫 GRPO 的 advantage 計算）
- 認出 reward hacking 與 sycophancy 的徵兆。（進階）

## 講義

先看全貌。後訓練（post-training）是 pretraining 之後的所有訓練，大致分三種訊號：

| 階段 | 訓練訊號 | 教會模型什麼 | 產物 |
|---|---|---|---|
| SFT | 「指令 → 理想回答」的範例 | 對話格式、聽指令、回答風格，也能教窄任務 | instruct model 的雛形 |
| 偏好學習（RLHF、DPO） | 「兩個回答哪個比較好」的比較 | 更有用、語氣更好、更安全 | instruct model |
| RLVR | 程式自動判定對錯的分數 | 在可驗證的任務上更會解題 | reasoning model 的關鍵成分之一 |

越往下，訓練訊號越不需要人寫出標準回答：SFT 要人寫範例，偏好學習只要人挑好壞，RLVR 連人都不用，只要能自動對答案。

### ★ 一個例子走完全程

整站用同一個任務：教一個小模型（例如 Qwen3-0.6B-Base）解小學數學應用題。例題是：

> 一盒鉛筆 12 枝，買了 3 盒，送給同學 7 枝，還剩幾枝？（答案：29）

1. **Base model**：給它這題，它很可能接著寫「第二題：一盒蠟筆 24 枝……」，因為網路上的題目常常一題接一題。它不是不會算，而是不知道現在該「回答」。
2. **SFT 之後**：看過幾千筆「題目 → 解題步驟＋答案」的範例，它學會回答：「12 × 3 = 36，36 − 7 = 29。答案：29」。
3. **偏好學習之後**：兩個都答對的回答，一個簡潔、一個囉嗦且語氣生硬，人比較喜歡前者；訓練後模型更常寫出前者。
4. **RLVR 之後**：同一題讓它答 8 次，程式檢查「答案：」後面的數字是不是 29，答對的寫法被強化。練了大量題目後，它開始先寫一段長長的思考、自己檢查，再給答案。
5. **推論時**：不改模型，也可以讓它答 8 次取多數決，準確率常會再高一點，代價是 8 倍的 token 數。

每一步都要問同一個問題：在沒看過的題目上，真的比上一步好嗎？這是最後一節「[怎麼確認微調有效？](#-怎麼確認微調有效)」的主題。

### ★ 怎麼教模型好好回答？

SFT（supervised fine-tuning，監督式微調）是拿理想回答當範例，用和 pretraining 一樣的 next-token loss 繼續訓練；差別在資料格式與「只對回答算 loss」。

SFT 的資料是一筆筆對話。對話不會直接以「題目」「回答」兩個欄位進入模型，而是用 **chat template** 串成一整段文字，用特殊 token 標出誰在說話。以 Qwen 系列的格式為例：

```text
<|im_start|>user
一盒鉛筆 12 枝，買了 3 盒，送給同學 7 枝，還剩幾枝？<|im_end|>
<|im_start|>assistant
12 × 3 = 36，36 − 7 = 29。答案：29<|im_end|>
```

訓練時通常只對 assistant 的部分（包括結尾的 `<|im_end|>`）算 loss，user 的部分只當作條件，這叫 **loss masking**。原因很直接：要模型學的是怎麼回答，不是怎麼出題。也有對整段對話都算 loss 的做法，但只算回答是常見預設。學會在回答結尾輸出 `<|im_end|>` 也很重要，模型才知道何時停下來。

推論時，伺服器用同一個 template 把對話串好，最後接上 `<|im_start|>assistant` 讓模型接著寫。**容易誤會：template 只是格式，差一點沒關係。** 實際上，訓練與推論的 template 只要有一點不同（少一個換行、角色名稱不同），模型就會看到訓練時沒見過的文字，表現可能莫名變差，而且不會報錯。自己跑開源模型時，一律用 tokenizer 提供的 template。

SFT 需要的資料比想像中少：有研究（LIMA）只用 1,000 筆精選範例，就得到相當好的助手。知識大多來自 pretraining，SFT 主要教行為：回答的格式、風格、何時停下，以及特定的窄任務（例如固定欄位的資訊擷取）。少量 SFT 很難教進大量新知識；但大量高品質的解題範例做 SFT，也能教出推理能力（見後面的蒸餾）。

<details class="deep">
<summary>準備動手做：loss masking 的實作</summary>

- **做法**：把整段對話 tokenize 成一串 ID，另外準備一串同長度的 label。user 與 system 部分的 label 設成忽略值（PyTorch 的 `cross_entropy` 預設是 `-100`），assistant 部分的 label 就是下一個 token。loss 只在非忽略的位置平均。
- **怎麼找邊界**：用 tokenizer 的 `apply_chat_template` 分別產生「到 assistant 開頭為止」與「整段」，兩者長度的差就是回答的範圍。多輪對話要對每一個 assistant 回合都這樣標。
- **Packing**：把好幾筆短對話接成一條長序列以減少 padding，要注意 attention 不該跨過不同對話的邊界，否則會互相干擾。
- **常見 bug**：base model 的 tokenizer 可能沒有 chat template，或特殊 token 沒有對應的 embedding 被訓練過；SFT 前要先確認 template 存在、特殊 token 會被正確切成單一 ID。

</details>

### ★ LoRA 怎麼省記憶體？

LoRA 不改原本的權重，只在旁邊加一對很小的矩陣來學「要改多少」，可訓練參數常常不到 1%。

**為什麼需要。** 全參數微調要為每個參數存梯度與 optimizer 狀態。用 Adam 做混合精度訓練，每個參數約 16 byte（← [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體)），0.6B 的模型光這些就約 9.6 GB，7B 的模型要上百 GB。只訓練少量參數的方法裡，LoRA 最常用。

**怎麼運作。** 一個權重矩陣 W 凍結不動。旁邊加兩個瘦長的矩陣 A 和 B，相乘後的大小和 W 一樣，加到 W 上：新的權重是 W + B·A。A、B 中間的維度 r（rank）很小，例如 8，所以 B·A 只能表達「少數幾個方向」的修改。LoRA 的核心假設是：微調需要的改變比原本的權重簡單得多，少數幾個方向就夠。

**例子。** 一個 4096 × 4096 的矩陣有 16,777,216 個參數。r = 8 時，A 是 8 × 4096、B 是 4096 × 8（B·A 是 (4096 × 8) 乘 (8 × 4096)，得到 4096 × 4096，和 W 一樣大），合計 65,536 個參數，約原本的 0.39%。只有這些參數需要梯度與 optimizer 狀態，記憶體大幅下降。訓練完可以把 B·A 直接加回 W，推論時沒有額外成本；也可以保留成獨立的小檔案，同一個 base model 切換不同的 LoRA。

**容易誤會：LoRA 是「比較弱的微調」，只適合省錢。** 對改變格式、風格、窄任務這類常見目標，LoRA 常常和全參數微調差不多；差距主要出現在要學大量新內容的時候。反過來，LoRA 也不是免費的：r 太小、只套在少數矩陣上，都可能學不起來。

<details class="deep">
<summary>準備動手做：LoRA 的細節</summary>

- **公式**：輸出 h = W·x + (α / r)·B·A·x。α 是縮放係數，讓換 r 時不必重調學習率。
- **初始化**：A 隨機、B 全為 0，所以一開始 B·A = 0，模型和原本完全相同，訓練從「不改」出發。
- **套在哪裡**：原始論文只套在 attention 的 q、v 矩陣；現在常見做法是套在所有線性層（q、k、v、o 與 MLP），效果通常較好，參數仍很少。
- **學習率**：LoRA 通常用比全參數微調大的學習率（常見 1e-4 到 2e-4 的量級，視設定而定）。
- **QLoRA**：再把凍結的 W 量化成 4-bit 存放（量化 ← [S2 Transformer 與 decoding](/stages/s02-transformer/#-模型要多少算力與記憶體)），A、B 仍用 16-bit 訓練，單張消費級 GPU 也能微調中型模型，代價是計算稍慢、品質可能略低。這類只訓練少量參數的方法統稱 PEFT（parameter-efficient fine-tuning）。
- **QLoRA 的三個技巧**：NF4（為常態分布的權重設計的 4-bit 格式）、double quantization（連量化用的縮放係數也再量化）、paged optimizer（記憶體不夠時把 optimizer 狀態暫時移到 CPU）。

</details>

### ★ 怎麼用分數訓練模型？

SFT 要有人寫出理想回答；RL 只要能替模型「自己寫的回答」打分數，就能讓它往高分的方向改。

**把模型當成 policy。** 在強化學習（RL）的說法裡，模型是一個 policy：給定題目，它一個 token 一個 token 地產生回答（每個 token 是一個動作），回答寫完後拿到一個獎勵（reward），例如答對 1 分、答錯 0 分。

**基本想法**（policy gradient）：讓高獎勵回答裡的每個 token 機率變高，低獎勵回答的變低。直接拿獎勵當權重有個問題：如果獎勵全是正數（例如 0 到 10 分），每個回答的機率都會被往上推，只是推的程度不同，訓練很不穩。解法是先減掉一個 **baseline**，通常是平均獎勵。減掉之後的值叫 **advantage**：這個回答比平均好多少。

**例子。** 例題答 4 次，獎勵是 1、1、0、0，平均 0.5。答對的兩次 advantage 是 +0.5，機率被推高；答錯的兩次是 −0.5，機率被壓低。如果 4 次全對，平均是 1，advantage 全是 0：已經會的題目，不需要再改。

RLHF 傳統上用的演算法 **PPO** 另外訓練一個 **value model** 來估 baseline；value model 和模型本身差不多大，所以 PPO 很吃記憶體。

**KL penalty**：LLM 的 RL 幾乎都會懲罰模型偏離原本的參考模型（通常是 SFT 後的模型）太遠。沒有這個限制，模型可能為了拿高分，輸出參考模型幾乎不會寫的怪異文字。**容易誤會：KL penalty 只是一個可有可無的調整。** 它其實是讓模型保留原本語言能力的主要約束；係數太小容易被獎勵帶偏，太大則幾乎學不到東西。

<details class="deep">
<summary>深入一點：policy gradient、PPO 與 GAE 的公式</summary>

數學工具見[數學補給](/guide/math-refresher/)。

- **REINFORCE**：最簡單的 policy gradient，直接拿（減掉 baseline 後的）獎勵當權重。
- **PPO 做了兩件事**：用 clipping 限制新 policy 不能離舊 policy 太遠（見下面），避免一步改壞；用 value model 估計「這個狀態平均能拿幾分」，當作比平均獎勵更精細的 baseline。
- **Policy gradient**：目標是最大化期望獎勵 J(θ) = E[R]。它的梯度可以寫成 E[(R − b)·∇ log π_θ(y | x)]，其中 log π_θ(y | x) 是整個回答每個 token 的 log 機率總和，b 是 baseline。只要 b 不依賴回答本身，減掉它不改變梯度的期望值（不引入偏差），但能降低變異。
- **PPO 的 clipping**：令 ρ = π_θ(token) ÷ π_old(token)，即新舊 policy 對同一個 token 的機率比。目標函數是 min(ρ·A, clip(ρ, 1 − ε, 1 + ε)·A)，ε 常取 0.2。A > 0 時，ρ 超過 1.2 就不再有好處；A < 0 時，ρ 低於 0.8 就不再有好處。所以同一批資料可以重複用幾次而不至於改過頭。
- **GAE**（generalized advantage estimation）：用 value model V 估計每個 token 位置的 advantage。δ_t = r_t + γ·V(s_{t+1}) − V(s_t)，Â_t = Σ_l (γλ)^l·δ_{t+l}。λ 在「偏差小但變異大」與「變異小但偏差大」之間取捨。
- **RLHF 裡的 KL**：目標寫成 max E[r(x, y)] − β·KL(π_θ ‖ π_ref)。實作上常把每個 token 的 −β·log(π_θ / π_ref) 加進獎勵，最後一個 token 再加上 reward model 的分數。

</details>

### ★ 沒有標準答案怎麼教？

很多品質沒有標準答案，但人很會比較兩個回答哪個好；偏好學習把「比較」變成訓練訊號。

**Reward model。** 收集大量偏好配對：同一題的回答 A、B，標註者選 A。用這些資料訓練一個 reward model，給任何回答打一個分數 r。訓練就是調整打分，讓實際被選中的回答分數較高；兩個回答的分數差越大，代表人越可能選分數高的那個。

**RLHF**（reinforcement learning from human feedback）分兩步：先訓練 reward model，再用 PPO 讓模型最大化這個分數，同時加上 KL penalty。回到例題：兩個都答對的回答，標註者偏好簡潔的那個，reward model 學到「簡潔、步驟清楚」分數高，PPO 再讓模型往那個方向寫。

**DPO**（Direct Preference Optimization）發現：在 RLHF 同樣的目標（最大化獎勵、加上 KL 限制）下，可以跳過 reward model 與 RL 迴圈，直接在偏好配對上訓練模型。直覺是：對每一對，提高模型寫出「被選中的回答」的機率、降低「被拒絕的回答」的機率，而且都是相對於參考模型來衡量。整個流程像一般的監督式訓練，不用抽樣、不用 value model，所以簡單、穩定，成為開源社群最常用的方法之一。

**容易誤會：DPO 是 RLHF 的免費簡化版。** 它付出的代價是：DPO 是離線方法，只從一批固定的偏好配對學，模型不會像 RL 那樣自己產生新回答再被評分（少了探索）；偏好資料和目前模型的輸出分布差太遠時（例如配對是別的模型寫的），效果會變差；也比較容易 overfit 這批配對。

<details class="deep">
<summary>深入一點：reward model 與 DPO 的 loss</summary>

- **Bradley–Terry 模型**：假設人選 A 勝過 B 的機率只由分數差決定，= σ(r(A) − r(B))。σ（sigmoid）把任何數字壓到 0 到 1 之間：分數差 0 時機率 50%，差 1 時約 73%，差 2 時約 88%。
- **Reward model 的 loss**：對每一對（被選中 y_w、被拒絕 y_l），loss = −log σ(r(x, y_w) − r(x, y_l))。reward model 通常是把語言模型的輸出層換成輸出單一數字的小頭。
- **DPO 的推導重點**：「最大化 r 減掉 β·KL」這個目標的最佳 policy 有封閉解 π*(y | x) ∝ π_ref(y | x)·exp(r(x, y) / β)。反過來，r 可以用 policy 表示：r(x, y) = β·log(π*(y | x) / π_ref(y | x)) + 只和 x 有關的常數。代入 Bradley–Terry 時兩個回答相減，常數消掉，就得到只含 policy 的 loss。
- **DPO 的 loss**：loss = −log σ(β·[log(π_θ(y_w) / π_ref(y_w)) − log(π_θ(y_l) / π_ref(y_l))])。
- **數字例子**：β = 0.1。訓練開始時 π_θ = π_ref，括號內為 0，loss = log 2 ≈ 0.693。若之後被選中回答的 log 比值是 +2、被拒絕的是 −1，括號內是 3，乘上 β 得 0.3，σ(0.3) ≈ 0.574，loss ≈ 0.554。
- **陷阱**：loss 下降可能只是「被拒絕的回答機率降得更多」，被選中的回答機率也可能一起下降。訓練時要同時看兩者的 log 機率，不只看 loss。

</details>

### ★ 推理模型怎麼練出來？

數學、程式這類答案可以自動判定對錯的任務，可以拿程式當評分者做 RL，不需要人，也不需要 reward model。在大規模上這樣訓練，是近年 reasoning model 的關鍵做法之一。

**RLVR**（reinforcement learning with verifiable rewards）的獎勵來自驗證器：數學題比對最後答案，程式題跑測試。驗證器是規則，不是學出來的模型，比 reward model 難騙得多（但不是騙不了，見後面的 reward hacking 一節）。

**GRPO**（Group Relative Policy Optimization，DeepSeekMath 提出）的做法：同一題抽樣一組 G 個回答，用驗證器打分，再拿每個回答和「同組的其他回答」比，算出 advantage：

> advantage =（這個回答的獎勵 − 組平均）÷ 組標準差

組平均取代了 PPO 的 value model 當 baseline，省下一整個大模型的記憶體。除以標準差則讓每題的 advantage 尺度相近，難題和簡單題的訊號一樣大。

**例子。** 例題抽 8 次，5 次答對（獎勵 1）、3 次答錯（獎勵 0）：

| | 獎勵 | 減去平均 0.625 | 除以標準差 0.484 |
|---|---|---|---|
| 答對的 5 個 | 1 | +0.375 | +0.775 |
| 答錯的 3 個 | 0 | −0.625 | −1.291 |

標準差是母體標準差。獎勵只有 0 和 1 時，標準差 = √(答對比例 × 答錯比例)，這裡是 √(0.625 × 0.375) ≈ 0.484。檢查：5 × 0.775 ≈ 3 × 1.291，正負相抵，平均是 0。這個 advantage 會套用到該回答的每一個 token：答對的寫法整段被強化，答錯的整段被壓低。

**整組同分就沒有訊號。** 8 個全對或全錯時，每個回答都等於平均，advantage 全是 0，這題對訓練沒有貢獻。所以題目太簡單或太難都浪費算力，題目難度要配合模型目前的程度。

**Reasoning model 怎麼出現。** DeepSeek-R1-Zero 直接在 base model 上用 GRPO 訓練，獎勵只看答案對錯與格式。訓練過程中，回答越來越長，模型自己學會了列步驟、檢查、發現錯誤後重來。沒有人教它這樣寫，只是這樣寫比較容易答對。這種「先長時間思考再回答」的模型就是 reasoning model。但這不是 RLVR 自動帶來的：要有夠強的 base model、大量難度合適的題目與可靠的驗證器；在小模型上，從強模型蒸餾往往更有效（見後面）。

**容易誤會：reasoning model 的思考是免費的品質提升。** 思考的 token 一樣要生成，推論成本與延遲都隨之上升（推論成本 → [S5 推論與 serving](/stages/s05-inference/)，應用端怎麼用 → [S6 LLM API 與應用基本功](/stages/s06-llm-api/)）。而且它主要在可驗證的任務上變強，不保證在寫作、聊天上更好。

<details class="deep">
<summary>深入一點：GRPO 的目標函數與變體</summary>

- **Advantage**：Â_i = (r_i − mean(r)) ÷ std(r)。只看最後答案（outcome supervision）時，同一個回答的每個 token 都用同一個 Â_i。
- **目標函數**：對 G 個回答、每個回答 o_i 的每個 token t，用和 PPO 相同的 clipping：min(ρ_{i,t}·Â_i, clip(ρ_{i,t}, 1 − ε, 1 + ε)·Â_i)，ρ 是新舊 policy 對該 token 的機率比。先在每個回答內對 token 平均（除以 |o_i|），再對 G 個回答平均。
- **KL 放在 loss 裡**：PPO 版 RLHF 常把 KL 加進獎勵；GRPO 改成在 loss 裡直接減 β·D_KL(π_θ ‖ π_ref)，並用一個不需要額外抽樣、恆為非負的估計式：π_ref / π_θ − log(π_ref / π_θ) − 1（逐 token 計算）。
- **Dr. GRPO**：除以標準差會放大幾乎全對或全錯的題目，所以拿掉這一步。
- **DAPO**：把 clipping 的上下界分開、上界放寬（clip-higher，避免模型很快失去多樣性）；dynamic sampling（濾掉整組同分的題目）；token 層級的 loss 平均（長回答不會因為除以長度而被稀釋）；對過長的回答做懲罰；並拿掉 KL 項。
- **GSPO**：把機率比從單一 token 改成整段序列（除以長度），clipping 也在序列層級做，論文報告這讓訓練更穩定，對 MoE 模型尤其有幫助。
- **組大小 G**：G 越大，「整組同分」的機率越低、baseline 越準，但每題的抽樣成本線性增加。常見設定是數個到數十個。

</details>

### ★ 不改模型能變準嗎？

可以：推論時多花算力（test-time compute）換品質；關鍵是量清楚「多花幾倍 token，換到多少準確率」。

**Self-consistency**：同一題用 temperature 大於 0 抽樣多次（temperature ← [S2 Transformer 與 decoding](/stages/s02-transformer/#-怎麼挑出下一個-token)），取出現最多次的答案。例題抽 8 次，得到 29 四次、31 兩次、24 兩次，多數決選 29。即使單次只有一半機會答對，錯誤答案往往分散在不同數字上，正確答案比較容易成為最多數。

**Best-of-N 與 verifier**：抽樣 N 次，用一個 verifier（驗證器或 reward model）挑分數最高的那個。有可靠驗證器時（例如程式能跑測試），效果比多數決更好。

**容易誤會：抽越多次越好。** 成本大約隨抽樣數線性增加，收益卻會遞減：從 1 次到 8 次可能進步明顯，從 8 次到 64 次通常進步很少；模型對某題系統性地答錯時，多數決只會更穩定地選錯。必做題就是要量這條曲線的前兩個點。

<details class="deep">
<summary>深入一點：對每一步打分與搜尋</summary>

**Process reward model（PRM）** 對推理的每一步打分，而不只看最後答案。它可以拿來引導搜尋：例如每一步產生幾個候選，留下分數高的繼續往下寫（beam search 或 tree search）。

</details>

### ★ 為什麼會鑽獎勵漏洞？

只要獎勵是代理指標，模型就可能找到「拿高分但沒做到真正目標」的捷徑。

**Reward hacking**：回到例題，假設驗證器只檢查回答裡「有沒有出現 29」。模型可能學會寫「答案可能是 24、29 或 31」，每題都列一串數字，分數很高，題目卻沒解。程式任務只看測試是否通過，模型可能學會修改測試或寫死答案；reward model 偏好長回答，模型就越寫越長。修法是讓獎勵更接近真正目標：只取最後一個「答案：」後的數字、多個答案直接給 0 分、隱藏測試、限制長度。

**Over-optimization**：對 reward model 最佳化過頭。訓練初期，reward model 的分數和真實品質一起上升；之後代理分數繼續上升，真實品質卻開始下降，因為模型找到了 reward model 判斷錯誤的區域。KL penalty 與提前停止是常見的緩解手段，但要靠獨立的評估（不是訓練用的那個 reward model）才看得出來。

**Sycophancy**（諂媚）：模型傾向同意使用者、說使用者想聽的話。使用者說「我算出來是 31，對吧？」，模型就附和「對，是 31」。部分原因在偏好資料本身：人在比較回答時，往往給認同自己的回答比較高的分數，偏好學習就把這個傾向放大了。

**容易誤會：reward hacking 代表模型「想作弊」。** 它只是在最佳化你給的分數；分數和目標之間的落差，才是問題所在。這些概念在本站首次出現，[S8 Eval 方法論](/stages/s08-evals/) 的 judge、[S13 Memory 與個人化](/stages/s13-memory/) 的個人化迎合、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 的 agent 最佳化、[S16 安全與治理](/stages/s16-security/) 的安全都會再遇到。

### ★ 小模型怎麼向大模型學？

用強模型產生訓練資料，再拿來訓練較小的模型，是讓小模型變強最便宜的方法之一。

**蒸餾（distillation）** 的常見做法：讓強的老師模型對大量題目寫出解題過程，用驗證器濾掉答錯的，留下來的當作學生模型的 SFT 資料。例如老師對 5,000 道應用題各寫一次，答對的 4,000 筆拿來訓練學生。DeepSeek-R1 就用這種方式，把推理能力蒸餾到較小的 Qwen 與 Llama 模型；他們也發現，對小模型而言，蒸餾往往比直接做 RL 更有效。

**容易誤會：合成資料又便宜又多，越多越好。** 合成資料會繼承老師的錯誤與偏好，大量使用也可能讓輸出的多樣性下降。使用前還要看授權條款是否允許拿某模型的輸出訓練別的模型（→ [S16 安全與治理](/stages/s16-security/)）。

<details class="deep">
<summary>深入一點：on-policy distillation</summary>

**On-policy distillation** 讓學生自己寫回答，由老師在每個 token 上給回饋（老師認為這個 token 的機率有多高）。學生學的是「修正自己實際會犯的錯」，而不只是模仿老師寫好的範例。

</details>

### ★ 怎麼確認微調有效？

每一步微調都要回答「比 base 好嗎？好多少？」，而且答案要附上誤差範圍。

**用沒看過的題目。** 準備訓練時沒看過的 held-out 題目：有標準答案的（例如數學題）算準確率；沒有標準答案的（例如回答品質），算 **win rate**：讓人或 judge 模型兩兩比較微調前後的回答，看新模型贏的比例（→ [S8 Eval 方法論](/stages/s08-evals/)）。永遠和 base 及上一步比，不只報一個絕對數字。

**附上信賴區間。** 例如 50 題上，base 答對 30 題（60%），SFT 後答對 32 題（64%）。60% 在 50 題上的標準誤是 √(0.6 × 0.4 ÷ 50) ≈ 6.9 個百分點，95% 信賴區間約是標準誤的 2 倍（精確是 1.96 倍），也就是 ±13.6 個百分點。差 4 個百分點，很可能只是雜訊（標準誤怎麼算見[數學補給](/guide/math-refresher/#平均變異數與標準誤)，bootstrap 見[數學補給〈Bootstrap 信賴區間〉](/guide/math-refresher/#bootstrap-信賴區間)；完整的統計方法在 S8 Eval 方法論）。

**檢查沒被訓練到的能力。** 數學變好了，聊天、寫作有沒有退步？微調新任務讓舊能力退步，叫遺忘（catastrophic forgetting）。

**容易誤會：測試題是公開 benchmark，分數就可信。** 公開題目很可能已經出現在 pretraining 資料裡（資料汙染，← [S3 Pretraining 與 scaling](/stages/s03-pretraining/)），分數只適合做相對比較；自己挑、自己出的少量題目，又容易不自覺地挑到有利的題目。

<section class="deep-section">

### ○ 還有哪些改模型的方法？

微調新任務可能讓舊能力退步（catastrophic forgetting），常見緩解是在微調資料裡混入一部分一般資料，或用 LoRA 限制改動的範圍。Model editing 嘗試只改模型的某一條知識（例如某位總統的任期），而不影響其他知識。Model merging 把幾個從同一個 base 微調出來的模型權重直接合併（例如加權平均），得到兼具多種能力的模型，不必重新訓練。偏好學習背後的理論（Bradley–Terry 的假設何時不成立、怎麼聚合不同人的偏好等社會選擇問題）在 [Stanford CS329H](https://web.stanford.edu/class/cs329h/) 有完整講解。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** 下面三個目標，各自最適合哪一種訓練訊號（理想回答的範例、兩個回答的比較、程式自動對答案）？(a) 讓模型一律用固定的 JSON 欄位回覆；(b) 讓回答語氣更友善、不囉嗦；(c) 讓模型更會解有單元測試的程式題。

<details class="hint">
<summary>對照答案</summary>

(a) 範例（SFT）：格式是行為，給範例最直接。(b) 比較（偏好學習）：「友善」很難寫出唯一標準答案，但人很會比較。(c) 自動對答案（RLVR）：測試能自動判定對錯，不需要人。

</details>

**2.** 一題抽樣 4 次，獎勵是 1、1、1、0。手算每個回答的 GRPO advantage（母體標準差），並確認平均為 0。

<details class="hint">
<summary>對照答案</summary>

平均 0.75，標準差 √(0.75 × 0.25) ≈ 0.433。答對的三個：0.25 ÷ 0.433 ≈ +0.577；答錯的：−0.75 ÷ 0.433 ≈ −1.732。檢查：3 × 0.577 − 1.732 ≈ 0。只有一次答錯時，那一次被壓低得特別多。

</details>

### 必做：Self-consistency 與 group-relative advantage

**目標**：親手量測 test-time compute 的效益，並寫出 GRPO 最核心的那一行計算。

**步驟**
1. 寫一個 `groupAdvantages(rewards: number[][])` 函式：輸入多組獎勵（每組是同一題的 G 個回答），輸出每個回答的 advantage =（獎勵 − 組平均）÷（組標準差 + ε）。組標準差用母體標準差（除以 G，不是 G − 1），ε 取 1e-6。
2. 為它寫單元測試，包含「整組都答對」「整組都答錯」「一半對一半錯」三種情況，並用一句話寫下「整組同分」對訓練代表什麼。
3. 從 [GSM8K](https://huggingface.co/datasets/openai/gsm8k) 的 `main` 設定、`test` split 取前 50 題（注意：這個資料集很可能已出現在模型的訓練資料裡，分數只能拿來做相對比較）。
4. 選一個能設 temperature 的小模型：用 Ollama 或 llama.cpp 在本機跑 [Qwen3](https://ollama.com/library/qwen3) 0.6B 或 1.7B，或用文件明確寫出支援 `temperature` 的其他 provider / 模型。Claude 模型在目前的 API 版本下不接受 `temperature`（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#sampling-參數的限制)）。
5. 每題用 temperature 0.7 抽樣 8 次，從回答中解析出最後的數字。50 題 × 8 次 = 400 次生成，在筆電上可能要跑一到數小時，先用 5 題試跑估時間。
6. 計算兩個準確率：只取第 1 次抽樣（N = 1）、8 次多數決（N = 8），並用 bootstrap 算 95% 信賴區間，做法照[數學補給〈Bootstrap 信賴區間〉](/guide/math-refresher/#bootstrap-信賴區間)的十行寫法即可（S8 Eval 方法論會完整教）。
7. 記錄兩種做法的總 token 數。

**驗收**
- advantage 函式的測試全部通過：非同分組中，同一組內 advantages 的母體標準差約為 1、平均約為 0（標準差受 ε 影響的誤差 < 1e-3，平均的誤差 < 1e-9）；同分組全部輸出 0（浮點誤差 < 1e-9 即可）。
- 一張表：N = 1 與 N = 8 的準確率、95% 信賴區間、總 token 數、token 倍數。
- 一段結論：兩個信賴區間是否重疊？多花的 token 值不值得？

**提示**
- TypeScript：Ollama 有 HTTP API，也提供 OpenAI 相容端點，可直接用 `fetch` 或 OpenAI SDK；bootstrap 自己寫十幾行即可。
- Python：`ollama` 或 `openai` 套件；GSM8K 可從 Hugging Face 的 `datasets` 取得。
- Qwen3 預設會先輸出思考過程，token 數會大很多；比較時兩種做法要用同一種模式。用 Ollama 的 `/api/chat` 時，可以傳 `"think": false` 關閉思考輸出。
- 卡住時：
  - 重讀：[推理模型怎麼練出來？](#-推理模型怎麼練出來)（手算過的 advantage 可當測試案例）、[不改模型能變準嗎？](#-不改模型能變準嗎)、[怎麼確認微調有效？](#-怎麼確認微調有效)
  - 延伸：DeepSeekMath 論文的 GRPO 公式段落、self-consistency 原始論文

**預估**：10 小時

<section class="deep-section">

### 進階：模型線 M4：Qwen3 小模型的 SFT → LoRA → DPO → GRPO

**目標**：在真實的小模型上走完整條 post-training 流程，並為每一步提供有信賴區間的證據。

**步驟**
1. 以 [Qwen3-0.6B-Base](https://huggingface.co/Qwen/Qwen3-0.6B-Base)（或 1.7B-Base）為起點。先準備評估集：至少 100 題 held-out 指令題（用來算 win rate）與至少 100 題數學題（用來算準確率），之後每一步都用同一套評估。
2. **SFT**：用一份公開的 instruction 資料集做全參數 SFT，確認訓練與推論用的是同一個 chat template。
3. **LoRA**：用相同資料改做 LoRA，比較可訓練參數比例、記憶體峰值、訓練時間與結果。
4. **DPO**：在 SFT 後的模型上，用一份公開的偏好配對資料做 DPO。
5. **GRPO**：在數學題上做 GRPO，獎勵函式是「最後答案是否正確」加上簡單的格式檢查。
6. 每一步都和 base 及上一步比較，並仔細讀模型的輸出，記錄至少一個 reward hacking 或 sycophancy 的實例。

**驗收**
- 一張表：base、SFT、LoRA、DPO、GRPO 各自的 win rate（對 base）或數學準確率，全部附 95% 信賴區間。
- LoRA 與全參數 SFT 的可訓練參數比例、記憶體峰值並列。
- 一段實例紀錄：模型輸入、輸出、為什麼算 reward hacking 或 sycophancy、你會怎麼修改獎勵或資料。
- 所有實驗的設定（資料集、超參數、seed）都有紀錄，可以重跑。

**提示**
- Python：Hugging Face [TRL](https://huggingface.co/docs/trl)（SFT、DPO、GRPO 都有對應的 trainer）、[PEFT](https://huggingface.co/docs/peft)（LoRA）。win rate 的 judge 可以先用簡單版本，S8 Eval 方法論會教怎麼校準它。
- **算力**：這一步需要 NVIDIA GPU。可以用 Colab、Modal、Lambda 等租用服務，整個 M4 小模型後訓練（[代號說明](/guide/how-to-use/#代號怎麼讀)）預估是數十美元等級，但很依賴模型大小、資料量與實作效率，**請先用小設定實測再放大**。Mac 的 MPS 只建議用在模型線的前三步 M1–M3（micrograd 與 MLP、tiny GPT、小模型 pretraining），不建議用在這一步。詳見[模型線總覽](/projects/model-thread/)。
- 卡住時：
  - 重讀：[SFT](#-怎麼教模型好好回答)、[LoRA](#-lora-怎麼省記憶體)、[偏好學習](#-沒有標準答案怎麼教)、[GRPO](#-推理模型怎麼練出來)、[reward hacking](#-為什麼會鑽獎勵漏洞)
  - 延伸：Hugging Face LLM Course 第 11–12 章 TRL 範例、happy-llm 第 6、8 章

**預估**：22 小時

</section>

## 自我檢查

1. Base model 和 instruct model 對同一個問題的回答會有什麼典型差別？差別來自哪個訓練階段？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：base model 只會接著寫（例如接著出下一題），SFT 教會它「回答」並在結尾停下。**常見錯法**：以為 base model 不會算；它多半會，只是不知道該回答。**回讀**：[一個例子走完全程](#-一個例子走完全程)

   </details>

2. DPO 省掉了 RLHF 的哪些部分？它付出了什麼代價或限制？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：省掉 reward model 與 RL 迴圈（抽樣、value model）；代價是離線學習、沒有探索、偏好資料和模型輸出差太遠時效果變差。**常見錯法**：以為 DPO 沒有代價、和 RLHF 完全等效。**回讀**：[沒有標準答案怎麼教？](#-沒有標準答案怎麼教)

   </details>

3. GRPO 中，如果一題的 8 個回答全部答對，這題對訓練的貢獻是什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：每個回答都等於組平均，advantage 全是 0，沒有貢獻。**常見錯法**：以為全對會被「再強化一次」。**回讀**：[推理模型怎麼練出來？](#-推理模型怎麼練出來)

   </details>

4. 舉一個 reward hacking 的例子，並說明你會怎麼設計獎勵來避免它。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：例子要是「分數高但沒做到目標」，修法要縮小分數和目標的落差（例如只取最後一個答案、多答案給 0 分、隱藏測試）。**常見錯法**：說成模型「想作弊」。**回讀**：[為什麼會鑽獎勵漏洞？](#-為什麼會鑽獎勵漏洞)

   </details>

5. 情境題：同事微調了一個客服模型，在 40 題自選的測試上準確率從 70% 升到 78%，想馬上上線。你會先問哪些問題？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：題目是否 held-out、是否自己挑的、有沒有和 base 同題比；40 題的 95% 信賴區間約 ±14 個百分點。**常見錯法**：把 8 個百分點直接當成真的進步。**回讀**：[怎麼確認微調有效？](#-怎麼確認微調有效)

   </details>

6. SFT 時為什麼通常只對 assistant 的回答算 loss？如果推論時用的 chat template 和訓練時不同，會發生什麼事？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：要學的是回答，不是出題；template 不同時模型看到沒見過的文字，表現變差而且不報錯。**常見錯法**：以為 template 差一點沒關係。**回讀**：[怎麼教模型好好回答？](#-怎麼教模型好好回答)

   </details>

7. 一個 4096 × 4096 的矩陣套上 r = 16 的 LoRA，可訓練參數是多少？約佔原矩陣的百分之幾？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：A 是 16 × 4096、B 是 4096 × 16，合計 131,072，約 0.78%（r = 8 的兩倍）。**常見錯法**：只算 A 或 B 其中一個。**回讀**：[LoRA 怎麼省記憶體？](#-lora-怎麼省記憶體)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一站需要的內容。下面的資料適合想看原始推導、或想跟著別人一行一行寫程式的人，都不是必讀。

### 跟著寫程式

- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) — 第 6–7 章（分類微調、instruction 微調）與第 7 章的 DPO bonus。從零寫一次 chat template 與 loss masking。
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) — 第 11–12 章：用 TRL 做 SFT 與 GRPO，和 M4 小模型後訓練直接對應。
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) — Scientist 部分第 3–6 節（post-training 資料集、SFT、偏好對齊、評估）的連結整理，適合找工具與資料集。

### 原始論文

- [Shao et al. 2024, DeepSeekMath](https://arxiv.org/abs/2402.03300) — GRPO 的出處，讀 RL 段落，有完整的目標函數與和 PPO 的比較。
- [Rafailov et al. 2023, Direct Preference Optimization](https://arxiv.org/abs/2305.18290) — DPO 原始論文，含完整推導。
- [Lambert et al. 2024, Tülu 3](https://arxiv.org/abs/2411.15124) — 完整公開的 post-training 配方：SFT → DPO → RLVR，資料與程式都公開，看真實規模的超參數與資料比例。
- [Zhou et al. 2023, LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) — 1,000 筆精選資料的 SFT 能走多遠。
- [Hu et al. 2021, LoRA](https://arxiv.org/abs/2106.09685)、[Dettmers et al. 2023, QLoRA](https://arxiv.org/abs/2305.14314) — 參數高效微調的原始論文。
- [Wang et al. 2022, Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171)、[Lightman et al. 2023, Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) — self-consistency 與 PRM。
- [Yu et al. 2025, DAPO](https://arxiv.org/abs/2503.14476)、[Zheng et al. 2025, Group Sequence Policy Optimization](https://arxiv.org/abs/2507.18071) — GRPO 的兩個常見變體。

### 整理文章

- [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/)（2024-11-28）— 大量 reward hacking 實例與研究整理；讀 RLHF 與 LLM 相關的段落。
- [Lilian Weng: Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/)（2025-05-01）— test-time compute 與 reasoning 的研究整理。

### 課程

- [Stanford CS224N](https://web.stanford.edu/class/cs224n/) — post-training 與 reasoning 的講次。
- [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) — test-time compute、verifier。
- [Stanford CS329H](https://web.stanford.edu/class/cs329h/) — 偏好學習的理論。
- [Harvard CS 2881R AI Safety](https://boazbk.github.io/mltheoryseminar/) — reward hacking、model spec 的延伸讀物。

### 中文資源

- [台大 李宏毅 機器學習 2025 春](https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php)、[生成式 AI 導論 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php) — 繁中；推理、微調與遺忘、對齊的講次。
- [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) — 簡中；第 13 章（SFT、DPO、RLHF PPO）、第 14 章（GRPO 與 RLVR）。
- [datawhalechina/happy-llm](https://github.com/datawhalechina/happy-llm) — 簡中；第 6 章（預訓練、SFT、LoRA / QLoRA）、第 8 章（GRPO 等 agentic RL）。
- [Lordog/dive-into-llms](https://github.com/Lordog/dive-into-llms) — 簡中；「數學推理」（蒸餾一個迷你 R1）、「RLHF 安全對齊」（PPO）兩章有可執行的實驗。
- [ZJU-LLMs/Foundations-of-LLMs](https://github.com/ZJU-LLMs/Foundations-of-LLMs) — 簡中；參數高效微調與 model editing 的章節。

</section>
