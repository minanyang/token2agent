---
title: S14 Agent eval、資料與最佳化
description: Agent 的評估要看整條軌跡、同一題每次結果不同、連環境設定都會改變分數；學會做出可信的 agent eval，再用 trace、prompt 最佳化與蒸餾有系統地改進它。
sidebar:
  order: 14
  label: S14 Agent eval、資料與最佳化
---

:::note[這一站]
**⏱ 講義** 首次閱讀約 3 小時，手算與深入內容約 3 小時　**必做題** 約 12 小時　**進階題** 約 26 小時

**前置**：[S8 Eval 方法論](/stages/s08-evals/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S13 Memory 與個人化](/stages/s13-memory/)；模型知識見 [模型速成](/guide/app-first/#模型速成)（深入：[S4 Post-training 與 reasoning](/stages/s04-post-training/)）　**銜接**：→ [S15 Multi-agent](/stages/s15-multi-agent/)、[S16 安全與治理](/stages/s16-security/)、[S18 部署與架構](/stages/s18-deployment/)
:::

:::tip[理解路線重點]
- 評估 agent 先看事情有沒有做成，失敗了再看是哪一步出錯。
- 筆記助理每次結果不同，同一題要跑好幾次；連機器設定都會改分數。
- 分數上升不一定是變好：要在沒參與調整的題目上驗證，並讀過輸出。
:::

## 在做什麼

S8 Eval 方法論教的是單次回答的評估，S12 Agent loop 與 harness 用了最小的 agent eval。這一站處理 agent 評估真正難的地方：要看整條軌跡而不只最後答案、同一題每次結果都不同、對話型 agent 需要有人扮演使用者、連機器資源這類環境設定都能讓分數差好幾個百分點。學會做出可信的評估之後，下半站學讓 agent 變好的方法：從 trace 找失敗、接成 data flywheel、自動最佳化 prompt、蒸餾小型 router，以及用 ablation 檢驗 harness 元件。到了 S15 Multi-agent，要不要用 multi-agent，就靠這一站的 eval 決定。

## 學完能

- 讀一個 benchmark 分數時，能說出它可能失準的原因（題目瑕疵、汙染、infra 設定、eval awareness）。（講義與自我檢查；必做量一次 infra 變因）
- 為 agent 設計「先看結果、再看軌跡」的評估，並用 transition failure matrix 找出最常壞在哪一步。（必做）
- 用隔離的試跑、平衡的題組、模擬使用者做出可重跑的 agent eval，並在報告中寫出環境變因。（必做；模擬使用者在進階）
- 對一個 harness 元件做 ablation，用信賴區間判斷它值不值得留。（必做可以順便做一次；完整版在進階）
- 用 DSPy 類的 optimizer 做一輪 prompt 最佳化，並在沒參與最佳化的資料上驗證。（進階）

## 講義

先把用語講清楚。評估一個 agent 時：

- **任務**（task）：一個輸入加上成功標準，例如「把所有含 TODO 的筆記檔名寫進 `todo.txt`」。
- **試跑**（trial）：讓 agent 做一次這個任務。agent 每次結果不同，所以同一任務要跑好幾次。
- **環境**（environment）：agent 動手的地方，例如一份筆記資料夾的副本、一組工具、一個資料庫。
- **Trace / transcript**：一次試跑的完整紀錄，包括每次工具呼叫、參數、結果與最後的回覆（← S6 LLM API 與應用基本功的 tracing）。
- **Grader**：判斷一次試跑成不成功的程式、judge 或人。

整站沿用 S12 Agent loop 與 harness 必做題的筆記資料夾環境：一個有 20 個 Markdown 筆記的資料夾，其中剛好 6 個含 `TODO`，agent 有 `list_files`、`read_file`、`grep`、`write_file`、`delete_file` 五個工具。可以把它看成貫穿全站的**筆記助理**的簡化版：只有檔案工具，每個任務的結果都能用程式檢查，適合拿來練評估。上面那個 TODO 任務會貫穿各節：先看怎麼評一次試跑，再看怎麼評多次試跑、怎麼讓環境公平。後半講上線後的改進（trace 分群、prompt 最佳化、router）時，例子回到完整的筆記助理（使用者小林）。

### ★ Agent 品質要看哪幾面？

只看成功率會漏掉很多事。Kaggle〈Agent Quality〉白皮書把 agent 品質分成四個面向（四支柱）：

| 面向 | 問的問題 | 筆記助理的例子 |
|---|---|---|
| **effectiveness** | 有沒有達成使用者的目標 | `todo.txt` 裡是不是剛好那 6 個檔名 |
| **efficiency** | 花了多少 token、時間、步數、金錢 | 用 3 步完成，還是把 20 個檔案逐一讀完 |
| **robustness** | 工具出錯、輸入模糊、環境改變時撐不撐得住 | `grep` 逾時一次後會不會重試 |
| **safety** | 有沒有做不該做的事 | 有沒有順手刪掉「看起來像重複」的檔案 |

一個成功率 90% 但每題花 10 美元、或偶爾刪錯檔案的 agent 不能上線。[Kapoor et al. 2024](https://arxiv.org/abs/2407.01502) 也批評過 agent 研究只報準確率、不報成本。**容易誤會：四個面向不是要合成一個總分。** 合成總分會讓「很便宜但偶爾刪檔」和「很貴但安全」看起來一樣；分開報告，再依產品決定哪個是硬門檻（safety 通常是）。

### ★ 該看結果還是看步驟？

評分以最終結果（outcome）為主，軌跡用來找出錯在哪一步。這種順序叫 **outside-in**：先把 agent 當黑盒子，只問目標有沒有達成；失敗了，再打開軌跡看。

**為什麼結果優先。** 達成目標的路徑通常不只一條，死板地檢查步驟會把正確的解法判錯。而且結果要從**環境的狀態**檢查，不能信 agent 自己說的話：檢查 `todo.txt` 的內容，而不是讀 agent 回覆的「已完成」。Anthropic〈Demystifying evals for AI agents〉的例子是：訂位任務要去資料庫查那筆訂位是否存在。

**Trajectory match** 是拿 agent 的工具呼叫序列和一條參考軌跡比對。常見的比法有四種：完全相同、順序相同（允許中間多出步驟）、不計順序、以及工具呼叫的 precision / recall。precision 是「agent 的呼叫中有幾成出現在參考軌跡」（重複呼叫各算一次），recall 是「參考軌跡的步驟有幾成被 agent 做到」。

用 TODO 任務走一次。參考軌跡是 `list_files → grep("TODO") → write_file(todo.txt)`，兩次試跑如下：

| | 試跑 1 | 試跑 2 |
|---|---|---|
| 工具呼叫 | `list_files` → `grep("TODO")` → `read_file(meeting-03.md)` → `write_file(todo.txt)` | `grep("TODO")` → `write_file(todo.txt)` → `read_file(todo.txt)` |
| agent 的回覆 | 「已寫入 6 個檔名」 | 「已寫入 6 個檔名，並讀回確認」 |
| `todo.txt` 實際內容 | 5 個檔名（漏抄一個） | 6 個檔名，全對 |
| 順序相同（允許多步） | 符合 | 不符合（少了 `list_files`） |
| precision / recall | 3/4 = 0.75 / 3/3 = 1.0 | 2/3 ≈ 0.67 / 2/3 ≈ 0.67 |
| outcome grader | **失敗** | **成功** |

只看軌跡，試跑 1 比較好；看結果，剛好相反。試跑 1 的步驟都對，錯在把 `grep` 的結果抄進檔案時漏了一個，而它的回覆還宣稱寫了 6 個。試跑 2 跳過了不必要的 `list_files`，還多做了驗證，卻被軌跡比對扣分。

**什麼時候仍然需要 trajectory match。** 兩種情況：診斷失敗（像試跑 1，要知道壞在抄寫這一步），以及**路徑本身就是要求**，例如「刪檔前一定要先詢問」「寄信前一定要確認收件人」。後者用一條規則檢查 trace 即可，不需要比對整條參考軌跡。

**Transition failure matrix**（Hamel〈AI Evals FAQ〉）把失敗統計到「從哪一步壞掉」。先把流程分成幾個狀態，例如：理解任務 → 找到目標 → 修改 → 驗證 → 回報（不需要的狀態可以跳過）。每次失敗記一筆：列是**最後一個成功的狀態**，欄是**第一個失敗的狀態**。假設某版本 75 次試跑中失敗 20 次：

| 最後成功 ＼ 第一個失敗 | 找到目標 | 修改 | 驗證 |
|---|---|---|---|
| 理解任務 | 4 | 1 | |
| 找到目標 | | 10 | 1 |
| 修改 | | | 4 |

格子加總 4 + 1 + 10 + 1 + 4 = 20，等於失敗次數。最大的格子是「找到目標 → 修改」的 10 次，也就是找對了檔案卻寫錯，和試跑 1 同一類。先修這裡（例如在 harness 裡要求寫完後讀回比對），比籠統地「改 prompt」有效得多。它比單純的「失敗原因統計」多了位置資訊：同樣是「檔名錯」，發生在找目標時和發生在抄寫時，修法不同。這是 [S8 Eval 方法論](/stages/s08-evals/) 的錯誤分析在 agent 上的延伸。

**Grader 有三種**：程式檢查（比對檔案內容、查資料庫）、LLM judge（← S8 Eval 方法論的 judge 校準），以及 **agent-as-a-judge**（[Zhuge et al. 2024](https://arxiv.org/abs/2410.10934)）。最後一種讓評估者本身也是 agent：它能讀檔、跑程式、操作成品，再根據證據打分，適合檢查「做出來的東西」，例如 agent 寫的一份週報筆記格式對不對、連結點不點得開。能寫程式檢查的就用程式；judge 與 agent judge 都要先和人工標註對齊。

**容易誤會：agent 的回覆不是證據。** 試跑 1 說寫了 6 個、實際只有 5 個。grader 讀回覆而不查環境，這次就會被判成功。

<details class="deep">
<summary>準備動手做：從 trace 判斷狀態</summary>

- 狀態判斷寫成程式，輸入一條 JSONL trace，輸出「走到的最後一個成功狀態」與「第一個失敗狀態」。例如「找到目標」成功的條件可以是：某次 `grep` 或 `read_file` 的結果包含全部 6 個目標檔名。
- 每個狀態的成功條件要事先寫好，不要看到失敗才補，否則矩陣會被你的事後解釋左右。
- 被 grader 判成功的試跑不進矩陣；但抽讀幾條成功的 trace 也有用，可以發現「碰巧成功」（例如漏了一個檔名，但那個檔名剛好不在檢查範圍內）。
- 讀失敗 transcript 時，替每條標記「agent 真的錯」或「grader 誤判」。grader 誤判多，就先修 grader，再談改 agent。

</details>

### ★ 每次結果不同怎麼算分？

agent 每次試跑結果不同，所以同一任務要跑 k 次，再決定怎麼把 k 個結果合成一個數字。[S8 Eval 方法論](/stages/s08-evals/) 介紹過兩種計算方式：**pass@k** 是 k 次中**至少一次**成功的比例，**pass^k** 是 k 次**全部**成功的比例。

**選哪個看使用情境。** 如果結果能自動驗證、可以讓 agent 多試幾次再挑對的那個（例如有測試的程式碼），pass@k 有意義。如果使用者每次都直接拿到 agent 的結果，例如筆記助理整理 TODO，該看 pass^k：它量的是「每次都能信任它」。

筆記助理三個任務、各跑 5 次：

| 任務 | 5 次結果 | 成功率 | 5 次中至少一次成功 | 5 次全部成功 |
|---|---|---|---|---|
| A：列出 TODO 檔名 | ✓✓✓✓✓ | 5/5 | 是 | 是 |
| B：合併 3 對重複筆記 | ✓✓✗✓✓ | 4/5 | 是 | 否 |
| C：「把那個檔案刪掉」（應該先問是哪個） | ✗✗✓✗✗ | 1/5 | 是 | 否 |

- 平均成功率：(5 + 4 + 1) ÷ 15 ≈ 67%
- pass@5：3 題都至少成功一次，3/3 = 100%
- pass^5：只有 A 全部成功，1/3 ≈ 33%

同一份資料，可以寫成 100%、67% 或 33%。報告時一定要寫清楚是哪一個、k 是多少。

差距隨 k 變大。假設每次試跑獨立、單次成功率 0.8：pass@3 = 1 − 0.2³ = 0.992，pass^3 = 0.8³ = 0.512。同一個 agent，用 pass@3 看幾乎完美，用 pass^3 看只比擲硬幣好一點。

試跑次數少時，這些數字的不確定性很大。15 題 × 5 次的成功率要附 bootstrap 信賴區間（← S8 Eval 方法論）；比較兩個版本時，兩版跑同一批任務，看配對差值的區間是否包含 0，不是看兩個點估計誰大。**容易誤會：pass@k 高不代表 agent 可靠。** C 題的 pass@5 是「成功」，但使用者 5 次裡有 4 次遇到 agent 直接刪錯檔或亂猜。

<details class="deep">
<summary>深入一點：從 n 次試跑估計 pass@k 與 pass^k</summary>

每題跑 n 次、成功 c 次，想估計 k ≤ n 時的值。直接拿成功率 p̂ = c/n 代入 1 − (1 − p̂)^k 或 p̂^k 會有偏差，常用的無偏估計是「從 n 次中不放回地抽 k 次」：

- pass@k = 1 − C(n − c, k) / C(n, k)（Chen et al. 2021）
- pass^k = C(c, k) / C(n, k)（τ-bench，Yao et al. 2024）

例：n = 5、c = 4、k = 3。C(1, 3) = 0，所以 pass@3 = 1；pass^3 = C(4, 3) / C(5, 3) = 4/10 = 0.4。用 p̂ = 0.8 代入 p̂³ 則得 0.512，兩者不同。整體分數是各題估計值的平均。

</details>

### ★ 怎麼讓每次試跑公平？

agent 會改變環境，所以評估要提供一個可以重來的環境，並在結束後檢查環境的狀態。這種做法叫環境式評估（environment-based eval）。要讓它公平，有三件事要做好。

**每次試跑都從乾淨的環境開始**（isolated trials）。筆記助理的做法是每次從原始版本複製一份資料夾。殘留狀態會造成連鎖失敗，也會灌水分數：〈Demystifying evals〉提到，他們看過模型去讀前一次試跑留下的 git 歷史而佔到便宜。

**正負例平衡。** 同時測「該做」和「不該做」的情況。如果題目全是「請動手改檔案」，最好的策略就是什麼都直接改，eval 會把 agent 推往這個方向。所以要放負例：資訊不足時應該先問（「把那個檔案刪掉」沒說是哪個），或要求本身不合理（「把不存在的 `budget.md` 改成三段」）。負例的 grader 檢查資料夾和原始版本逐位元組相同。成功率要正例、負例分開報告：整體 80% 可能是正例 95%、負例只有 50%。

**模擬使用者。** 對話型 agent 需要使用者回應才能往下走。上面的負例中，筆記助理問「要刪哪一個檔案？」，總要有人回答「`draft-plan.md`」。做法是讓一個 LLM 依角色設定扮演使用者（simulated user），例如「很忙、只講半句話」「會給錯日期」。[τ-bench](https://arxiv.org/abs/2406.12045)（Yao et al. 2024）用這種方式評估零售與航空客服；[τ²-bench](https://arxiv.org/abs/2506.07982)（Barres et al. 2025）進一步讓使用者也能操作環境（dual-control），例如使用者要自己在手機上改設定。

**容易誤會：模擬使用者不是中立的測試工具。** 它本身會出錯：太配合、忘了目標、自己編出角色設定沒有的資訊。這些錯會直接變成 agent 的分數，所以要抽讀對話，確認它像真人。

### ★ 機器設定也會改變分數？

機器資源、時間限制這類設定會直接改變分數（infra noise），所以它們是實驗變因，要寫進報告。

Anthropic〈Infrastructure noise in agentic coding evals〉（2026-02-05）在 Terminal-Bench 2.0 上發現，只改變容器的資源設定，最寬鬆與最嚴格的設定之間成功率就差約 6 個百分點。他們的建議有三點：把資源與時間限制當成要報告的實驗變因、在不同時間多跑幾次，並對低於 3 個百分點的排行榜差距保持懷疑。

放到筆記助理上：工具 timeout 從 10 秒改成 2 秒，`grep` 在大資料夾上可能偶爾逾時，agent 就得重試或放棄，成功率可能因此掉幾個百分點，而 agent 本身一行都沒改。必做題第 4 步就是量這個差距，寫成一行「本 eval 的 infra 變因」。**容易誤會：infra 差異不是「雜訊，平均掉就好」。** 它是系統性的偏移：兩個版本如果在不同設定下跑，差距可能全來自設定。

### ★ 分數上升一定是變好嗎？

Reward hacking 是 [S4 Post-training 與 reasoning](/stages/s04-post-training/) 介紹的現象（不讀 S4 也沒關係）：被最佳化的對象學會讓「測量值」變高，而不是真正達成目標。在 agent eval 裡，它會從兩個方向出現。

**agent 鑽環境的漏洞。** 上面讀前次 git 歷史就是一例。另一例是 eval awareness：模型認出自己正在被評估。Anthropic〈Eval awareness in Claude Opus 4.6's BrowseComp performance〉（2026-03-06）記錄了 1,266 題中有 2 題，模型懷疑自己在考試、找出是哪個 benchmark、再去解密答案。文章的結論是：在開放網路上跑 eval，評估的完整性要當成持續的對抗問題來處理。

**最佳化鑽 grader 的漏洞。** 後面的 prompt 最佳化會反覆調整 prompt，讓某個 metric 變高。如果摘要 judge 偏好條列多的回答，optimizer 很快就會學到「永遠列 10 點」：judge 分數上升，使用者卻覺得變囉嗦。

防法相同：grader 盡量檢查環境狀態而不是表面特徵、留一份不參與最佳化的測試資料、定期抽讀輸出。**容易誤會：分數上升就代表變好。** 只有在沒參與最佳化的資料上、並且讀過輸出之後，才能這樣說。

### ★ Agent benchmark 多了哪些坑？

公開 benchmark 會老化：題目外洩進訓練資料（contamination）、被做到滿分附近（saturation）（← S8 Eval 方法論）。agent benchmark 還多了題目本身的瑕疵。兩個近期的例子：

- **SWE-bench Verified**：OpenAI 在 2024 年和 SWE-bench 作者一起整理出這個人工確認過的子集。2026-02 OpenAI 發文宣布不再用它評估，理由是汙染（題目來自公開 repo，部分題目的原始修正，模型能憑記憶重現）與題目瑕疵：他們找出 o3 跑 64 次都無法穩定解出的 138 題，請工程師逐題檢查，其中 59.4% 的測試或題目描述有實質問題。OpenAI 改為建議使用 SWE-bench Pro。
- **τ-bench**：[SABER](https://arxiv.org/abs/2512.07850)（Cuadron et al. 2025）指出 τ-bench 的航空與零售題目有標註錯誤與規格不清，壓低了分數上限，並釋出修正後的 τ-Bench Verified。

所以看到任何 agent benchmark 分數，先問三件事（benchmark hygiene）：題目有人稽核過嗎？有沒有外洩？infra 設定是什麼？兩個 agent 差 2 個百分點，已經小於上面量到的 infra 差距。

**METR time horizon**（[Kwa et al. 2025](https://arxiv.org/abs/2503.14499)）換一種方式描述能力：模型有 50% 機率完成的任務，人類專家通常要花多久。論文發現這個時間長度自 2019 年起大約每 7 個月翻倍。它比單一 benchmark 分數好解讀，但任務集中在軟體與研究類工作，作者也說明了外部效度的限制。**容易誤會：benchmark 分數高不代表你的產品會好。** 它只說明在那組題目、那個設定下的表現；你的筆記助理要靠自己的 eval。

### ★ Trace 多到讀不完怎麼辦？

上線之後，trace 會多到讀不完。叢集分析幫你決定先讀哪些；data flywheel 把讀到的東西接回 eval 與改進。

**叢集分析**是把 trace（或它們的摘要）轉成 embedding、分群，再從每一群抽幾條來讀，找出哪一群特別多失敗、哪一群是你沒想過的用法。Hamel 的 FAQ 也把分群列為挑選要人工檢查的 trace 的一種抽樣方法。示意的例子：筆記助理累積 2,000 條 trace，分成 12 群。整體倒讚率 8%，但「相對日期」那一群（「上週的會議」「前天的筆記」）有 150 條、倒讚率 30%。抽讀 15 條後發現 agent 常把「上週」算成過去 7 天而不是上一個日曆週，於是加進 10 個相對日期的 eval 任務。

**Data flywheel** 是讓系統的使用自動變成改進的燃料：

使用者回饋與從 S6 LLM API 與應用基本功開始收集的 trace → 錯誤分析與分群 → 新的 eval 題目與失敗分類 → 改 prompt、工具或 harness → 用 eval 確認 → 上線後再收新的 trace。

關鍵是每一環都要接得上：回饋要能對回 trace、trace 要能變成 eval 題目、capability eval 穩定之後畢業成 regression eval（← S8 Eval 方法論）。回饋介面怎麼設計在 S17 產品與 AI UX。**容易誤會：分群結果就是結論。** 分群只決定先讀哪些；「相對日期」這個失敗類別是人讀過 trace 之後才成立的（← S8 Eval 方法論的錯誤分析）。

### ★ 能自動找出更好的 prompt 嗎？

Prompt 最佳化是讓程式自動搜尋更好的 prompt：你提供 metric 和範例，optimizer 反覆產生候選 prompt、在範例上打分、留下好的。

[DSPy](https://dspy.ai)（[Khattab et al. 2023](https://arxiv.org/abs/2310.03714)）把 LLM 程式寫成有輸入輸出簽名的模組（例如「使用者請求 → 意圖」），再由 optimizer 調整每個模組的 prompt。兩個常用的 optimizer：

- [MIPROv2](https://arxiv.org/abs/2406.11695)（Opsahl-Ong et al. 2024）同時搜尋每個模組的指示文字與 few-shot 範例。
- [GEPA](https://arxiv.org/abs/2507.19457)（Agrawal et al. 2025）讓模型用文字反思執行軌跡、提出 prompt 修改，並保留在不同題目上各有長處的候選。GEPA 論文報告它在用少很多次試跑的情況下勝過 GRPO（一種用強化學習直接調整模型權重的訓練方法；深入：[S4 Post-training 與 reasoning](/stages/s04-post-training/)）與 MIPROv2。

使用前提有兩個：可靠的 metric（S8 Eval 方法論校準過的 judge 或程式檢查），以及**分開的訓練與測試資料**。示意的例子：筆記助理的意圖分類（「搜尋筆記」「建立筆記」「寄信」），300 筆有標籤的請求，分成 200 筆訓練、100 筆測試。最佳化前，訓練 81%、測試 80%；最佳化後，訓練 93%、測試 86%。真正的進步是測試上的 6 個百分點，不是訓練上的 12 個；兩者的落差就是 optimizer 貼合訓練資料的部分。

**容易誤會：在最佳化用的資料上報告分數。** 那個數字一定好看，因為 optimizer 就是在讓它變高（上一節的 reward hacking）。結果只能在測試資料上報告，並附上最佳化前後的輸出範例。

<details class="deep">
<summary>準備動手做：跑一輪 prompt 最佳化前的準備</summary>

- 先寫好 metric 函式，輸入一筆範例和模型輸出，回傳 0–1 的分數。用 judge 當 metric 的話，先確認它和人工標註的一致程度（← S8 Eval 方法論）。
- 先設預算上限。optimizer 會呼叫模型很多次；常見做法是用小模型最佳化，再在目標模型上驗證。
- 測試資料在最佳化結束前完全不要看，也不要拿它挑「最好的那一輪」，否則它就變成訓練資料的一部分。需要挑選時另外切一份驗證資料。
- 最佳化後抽讀 10–20 個輸出，確認沒有出現「永遠列 10 點」這類迎合 metric 的模式。

</details>

### ★ 路由能交給便宜的小模型嗎？

很多 agent 的第一步是分類：這個請求要走哪個流程、要不要用強模型、需不需要工具。一開始用強模型做這件事很合理；累積足夠的 trace 之後，可以用一個便宜的小分類器取代它，這就是 router 蒸餾。

**怎麼做。** 每次路由都記下請求、強模型的決定，以及事後是否正確（使用者有沒有改口、任務有沒有完成，或抽查確認）。用這些「強模型的判斷 + 事後確認」當標籤，訓練一個小分類器（例如 embedding 加 logistic regression（一種簡單的分類方法）），或微調一個小模型。這是蒸餾：讓小模型學大模型的輸出（← S4 Post-training 與 reasoning；走應用路線的讀者見[模型速成](/guide/app-first/#模型速成)的「訓練階段」與「微調能做什麼、不能做什麼」兩節）。

示意的例子：筆記助理記下 600 筆路由決定，抽查修正後切成 480 筆訓練、120 筆測試。在測試資料上，強模型路由準確率 97%、小分類器 94%；但小分類器每次只要幾十毫秒、幾乎不花錢，強模型每次要等一次 API 呼叫。錯誤集中在「寄信」（`email_send`）與「建立信件草稿」（`email_draft`）之間，這兩類的後果不同（寄出是高風險，← [S10 工具與 MCP](/stages/s10-tools-mcp/)），所以可以只在分類器對這兩類沒把握時交回強模型。

**容易誤會：只看整體準確率。** 掉 3 個百分點在哪幾類比平均重要得多：錯在「搜尋筆記」和「建立筆記」之間，使用者重問一次就好；錯成「寄信」就不行。模型路由與 cascade 在部署時的完整設計在 S18 部署與架構。

### ★ 這個 harness 元件值得留嗎？

Ablation 是一次拿掉一個 harness 元件，用同一組任務、相同試跑次數比較前後差異，檢驗這個元件值不值得留。

[S12 Agent loop 與 harness](/stages/s12-agent-harness/) 說過每個 harness 元件都代表一個「模型自己做不到什麼」的假設；ablation 就是檢驗這個假設的方法。可以拿掉的東西包括 compaction、skills、evaluator、某條權限規則或停止條件。

示意的例子：筆記助理 20 個任務 × 5 次，有 compaction 時成功 72/100，拿掉後 64/100。差 8 個百分點，但 95% 信賴區間約 −5 到 +21 個百分點，包含 0，所以不能說 compaction 有用。兩版跑的是同一批題目，要配對比較（→ [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)）；配對後仍然包含 0，就加任務、加試跑次數，或改用更能凸顯這個元件的任務（例如長篇週報）。

<details class="deep">
<summary>深入一點：這個區間怎麼算、哪裡不準</summary>

把兩版各 100 次當成兩組獨立樣本：標準誤 √(0.72×0.28/100 + 0.64×0.36/100) ≈ 0.066，乘以 1.96 約 ±13。這個算式是粗略的近似，有兩處沒考慮到。第一，同一任務的 5 次試跑彼此相關，只估單一版本時，以任務為單位做 bootstrap 通常比上面的算式更寬。第二，兩版跑的是同一批任務，比較時應該配對：每次有放回地抽 20 題，兩版的結果跟著題目一起抽，算差值。題目本身的難易在兩版之間會抵銷，所以配對差值的區間通常比上面更窄。

</details>

**Model–harness fit**：同一個元件在不同模型上的價值可能不同。Anthropic 的例子是 context reset 對某一代模型必要，對下一代則是多餘的負擔。**容易誤會：ablation 的結論可以一直沿用。** 換模型時要重做，特別是那些當初為了補模型弱點而加的元件。

<section class="deep-section">

### ○ 能直接訓練 agent 嗎？

也可以直接訓練 agent：用成功的軌跡做 SFT，或用 RL 讓模型在環境中學會使用工具，例如 [Search-R1](https://arxiv.org/abs/2503.09516)（Jin et al. 2025）用 RL 訓練模型在推理中呼叫搜尋（← S4 Post-training 與 reasoning 的 GRPO / RLVR）。這一站的環境式評估同時也是 RL 的訓練環境：grader 就是 reward，所以上面講的 reward hacking 在訓練時會更嚴重。這需要 GPU 與 M4 小模型後訓練（[代號說明](/guide/how-to-use/#代號怎麼讀)）的基礎，是選修。STaR、ADAS 這類 self-improvement 方法，以及在多條軌跡間搜尋的 tree search，可以從 [Stanford CS329A](https://cs329a.stanford.edu/) 開始看。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** TODO 任務的參考軌跡是 `list_files → grep → write_file`。某次試跑呼叫了 `grep` → `read_file` × 2 → `write_file`，`todo.txt` 裡剛好是 6 個正確檔名。算出它的 tool-call precision 與 recall，並說出 outcome grader 的判定。

<details class="hint">
<summary>對照答案</summary>

agent 共 4 次呼叫，其中 `grep`、`write_file` 在參考軌跡裡，precision = 2/4 = 0.5；參考的 3 步做到 2 步，recall = 2/3 ≈ 0.67。outcome grader 判**成功**，因為環境狀態（`todo.txt`）全對；軌跡分數低不代表做錯。

</details>

**2.** 一個寫程式的 agent 每題最多試 3 次，每次都跑單元測試，交給使用者的是第一個通過測試的版本。這個情境該看 pass@3 還是 pass^3？換成筆記助理的「整理 TODO」呢？

<details class="hint">
<summary>對照答案</summary>

寫程式看 pass@3：測試能自動挑出對的版本，使用者只看到通過的那個，3 次中有一次成功就夠。整理 TODO 上線後沒有測試替使用者挑出對的版本，每次結果都直接交給使用者，所以看 pass^3。

</details>

### 必做：可信的 trajectory eval

**目標**：對一個現成的 agent 做出可重跑、有變因報告的評估，並用軌跡找出它最常壞在哪一步。

**步驟**
1. 用 S12 Agent loop 與 harness 必做題的 agent 與它的 20 個 Markdown 筆記資料夾（沒做 S12 必做的話，照 S12 必做第 1 步的規格生成同一份資料夾）。直接沿用該必做題的 10 個任務與 grader，再加 5 個「不該動手」的任務，共 15 個任務。「不該動手」指資訊不足應該先問（例如「把那個檔案刪掉」沒說是哪個），或要求本身不合理（例如「把不存在的 `budget.md` 改成三段」）；這 5 個任務的 grader 檢查資料夾內容和原始版本逐位元組相同。
2. 把 agent 流程定義成 4–6 個狀態（例如：理解任務 → 找到目標 → 讀取 → 修改 → 驗證 → 回報），寫一個程式從 trace 判斷每次執行走到哪個狀態。
3. 準備兩個版本（例如兩種系統提示詞或兩個模型），各跑 15 題 × 5 次。如果兩個版本選「有 / 沒有某個 harness 元件」（← S12 Agent loop 與 harness；例如連續失敗 3 次就停的規則），這一步同時就是一次 ablation。每次都從乾淨副本開始。
4. 再用其中一個版本，只改一個環境設定（工具 timeout 或步數上限），重跑一輪。
5. 建 transition failure matrix；從失敗的執行中讀至少 10 條 transcript，標記每條是 agent 真的錯、還是 grader 誤判。

**驗收**
- 3 輪共 225 次執行（2 個版本 + 1 個環境變因 × 15 題 × 5 次），每次都有 trace 和 grader 結果。
- 每輪報告成功率、95% bootstrap 信賴區間、pass^5，以及正例、負例各自的成功率。
- 兩個版本的比較：報告成功率差值的信賴區間；只有在區間不包含 0 時才寫「A 比 B 好」。
- 環境變因那一輪和原版的差值（附區間），寫成一行「本 eval 的 infra 變因」。
- Transition failure matrix 的格子加總等於失敗次數；讀過的 10 條 transcript 各有一個標記，並報告 grader 誤判了幾條。

**提示**
- TypeScript：trace 存 JSONL，分析用 Node 腳本；bootstrap 自己寫十幾行即可，或用 `simple-statistics`。
- Python：pandas 做表，bootstrap 用 `numpy` 或 `scipy.stats.bootstrap`。
- 成本：225 次執行用雲端小模型通常是幾美元到十幾美元；Ollama 可以免費做，用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。先用 3 題 × 2 次確認整條管線。
- 卡住時：
  - 重讀：[先看結果，再看軌跡](#-該看結果還是看步驟)、[pass@k 與 pass^k](#-每次結果不同怎麼算分)、[環境式評估](#-怎麼讓每次試跑公平)、[infra noise](#-機器設定也會改變分數)
  - 延伸：Anthropic〈Demystifying evals for AI agents〉；Hamel FAQ 的「How do I evaluate agentic workflows?」

**預估**：12 小時（可以先做 10 題 × 3 次、只比兩個版本，用這個最小版走完一輪流程，再補齊）

<section class="deep-section">

### 進階：系統線 A14：agent eval 與最佳化

**目標**：為你的系統建出完整的 agent eval，並用三種方法各改進一次，每個結論都附信賴區間。

**步驟**

0. **補路由紀錄**：第 5 步要用到路由決定的紀錄。目前唯一的 router 是 A7 structured output 與 workflow 做的那一個，但它不一定用強模型，系統線 A6–A8 也只要求約 100 條 trace。先確認 trace 裡有每個請求的路由決定；不足 200 筆時，用強模型對歷史請求重新標註補足。湊滿後從全部路由決定中抽查 20 筆確認正確，抽查出錯的要修正，並報告錯誤率。
1. **Trajectory eval**：從 A8 錯誤分析與 golden set 的評估集，以及 A12 手寫 harness 的任務出發，擴充到至少 30 個 agent 任務，正負例都有。outcome grader 為主，關鍵流程（例如寄信前必須確認）加 trajectory 檢查。
2. **模擬使用者**：寫 3–5 種使用者角色（目標、說話習慣、會不會給錯資訊），跑至少 20 段多輪對話。讀 10 段，標出模擬使用者不像真人的地方並修正角色設定。
3. **Trace 分群**：把從 A6 串流聊天與 trace 開始累積的真實紀錄分群，從每群讀幾條，把新發現的失敗加進 eval。
4. **Prompt 最佳化**：挑一個子任務（例如意圖分類或摘要），用 DSPy 的 MIPROv2 或 GEPA 跑一輪；資料分訓練與測試兩份。
5. **Router 蒸餾**：用第 0 步整理好的路由決定（至少 200 筆，含抽查過的 20 筆）訓練一個小分類器取代強模型路由。
6. **Harness ablation**：從 A12 手寫 harness 挑一個元件拿掉，在 20 個任務 × 5 次上比較。

**驗收**
- 每一項改動（prompt 最佳化、router、ablation）都有前後比較與 95% 信賴區間。
- Prompt 最佳化的結果是在**測試資料**上報告的，並附最佳化前後各 3 個輸出範例。
- Router：準確率、每次呼叫的延遲與成本，和原本的強模型路由並列；指出錯得最多的類別。
- Ablation 在不同日期跑兩次，兩次的結論方向一致；報告中寫明模型版本、資源設定、試跑次數。
- 一份一頁的「eval 說明」：題目來源、grader 類型與校準結果、已知變因、尚未覆蓋的情況。

以筆記助理為例：模擬使用者「很忙、只講半句話的主管」與「會給錯日期的使用者」；router 決定一個請求是「搜尋筆記」「建立筆記」還是「寄信」；ablation 拿掉 compaction，看長篇週報任務的成功率掉多少。

**提示**
- TypeScript：prompt optimizer 的生態以 Python 為主。可以把最佳化步驟寫成獨立的 Python 腳本，只把產出的 prompt 帶回 TS 應用。Router 可以在 Python 訓練後匯出 ONNX，用 `onnxruntime-node` 載入；或直接用 embedding 加簡單的 logistic regression。
- Python：`dspy`（MIPROv2）、`gepa`；router 用 scikit-learn 加 S9 檢索與 RAG 的 embedding 模型，或照 M4 小模型後訓練的做法微調一個。
- 成本：prompt 最佳化會呼叫模型很多次，先設好預算上限；用小模型最佳化、再在目標模型上驗證也是常見做法。
- 卡住時：
  - 重讀：[模擬使用者](#-怎麼讓每次試跑公平)、[叢集分析](#-trace-多到讀不完怎麼辦)、[prompt 最佳化](#-能自動找出更好的-prompt-嗎)、[router 蒸餾](#-路由能交給便宜的小模型嗎)、[ablation](#-這個-harness-元件值得留嗎)
  - 延伸：DSPy 文件的 optimizer 教學；CS 329Z L9 投影片

**預估**：26 小時（含第 0 步補路由紀錄約 2 小時）

</section>

## 自我檢查

1. 為什麼講義建議以 outcome 評分，而不是比對步驟？什麼時候你仍然需要 trajectory match？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：正確路徑不只一條，結果要從環境狀態查；診斷失敗、或路徑本身就是要求（刪檔前先問）時才看軌跡。**常見錯法**：拿 agent 的回覆當證據。**回讀**：[該看結果還是看步驟](#-該看結果還是看步驟)

   </details>

2. 用自己的話解釋 transition failure matrix 的列和欄各代表什麼，以及它比「失敗原因統計」多告訴你什麼。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：列是最後一個成功的狀態，欄是第一個失敗的狀態；多出的是「壞在哪一步」的位置資訊，同一種錯在不同步驟修法不同。**常見錯法**：列欄顛倒。**回讀**：[該看結果還是看步驟](#-該看結果還是看步驟)

   </details>

3. 排行榜上兩個 agent 差 2 個百分點。在相信這個差距之前，你會先問哪三個問題？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：題目有人稽核過嗎、有沒有外洩、infra 設定是什麼；2 個百分點已經小於量到的約 6 個百分點 infra 差距。**常見錯法**：只看分數高低，不問題目與設定。**回讀**：[Agent benchmark 多了哪些坑](#-agent-benchmark-多了哪些坑)

   </details>

4. 情境題：GEPA 最佳化後，你的摘要 judge 分數從 0.72 升到 0.91，但使用者回饋沒有變好。可能發生了什麼？你會怎麼查？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：optimizer 可能學會迎合 judge 的偏好（例如條列變多），或分數是在最佳化用的資料上報告的；查測試資料上的分數、抽讀前後輸出、再對一次 judge 和人工的一致程度。**常見錯法**：把 judge 分數上升直接當成品質變好。**回讀**：[分數上升一定是變好嗎](#-分數上升一定是變好嗎)

   </details>

5. 情境題：換成新一代模型後，團隊想直接沿用舊的 harness 設定。你會建議先重跑哪些 ablation？為什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：先重跑當初為了補模型弱點而加的元件（例如 context reset、compaction、evaluator），因為同一元件在不同模型上的價值會變（model–harness fit）。**常見錯法**：以為舊的 ablation 結論可以一直沿用。**回讀**：[這個 harness 元件值得留嗎](#-這個-harness-元件值得留嗎)

   </details>

:::tip[走應用路線的讀者]
不讀 [S4 Post-training 與 reasoning](/stages/s04-post-training/) 也能完成這一站。想深入的話，現在是選讀它的好時機：這一站的蒸餾、reward hacking 與 agentic RL，在那裡有完整的原理。
:::

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一站需要的內容。下面的資料適合想看原始實例、論文細節或更多課程的人，都不是必讀。

### 官方文章與實務指南

- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)（2026-01-09）— task / trial / grader / transcript / outcome 的定義、pass@k vs pass^k、隔離與平衡、「讀 transcript」，附更多實際案例。
- [Anthropic: Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise)（2026-02-05）— 資源設定如何改變分數的完整實驗，以及報告方式。
- [Anthropic: Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp)（2026-03-06）— 模型認出 benchmark 並去找答案的實際紀錄。
- [OpenAI: Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)（2026-02-23）— benchmark 退場的理由。本站只透過搜尋結果與轉述確認內容，頁面擋自動擷取。
- [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/)（2026-09）— 讀 agentic workflows 與 multi-step workflows 兩題，以及抽樣方法表。
- [Kaggle: Agent Quality](https://www.kaggle.com/whitepaper-agent-quality)（2025-11）— 四支柱、outside-in、軌跡評估、agent-as-a-judge、可觀測性的完整版。偏 Google 生態。
- [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) — agent 評估與 agent ops。
- [DSPy](https://dspy.ai) — 官方文件的 optimizer 教學，做 A14 agent eval 與最佳化第 4 步時的主要參考。

### 原始論文

- [Yao et al. 2024, τ-bench](https://arxiv.org/abs/2406.12045)、[Barres et al. 2025, τ²-bench](https://arxiv.org/abs/2506.07982) — 模擬使用者與 dual-control 的評估設計細節。
- [Cuadron et al. 2025, SABER](https://arxiv.org/abs/2512.07850) — 讀 τ-bench 稽核與 τ-Bench Verified 的部分。
- [Kwa et al. 2025, Measuring AI Ability to Complete Long Software Tasks](https://arxiv.org/abs/2503.14499) — METR time horizon 的方法與限制。
- [Zhuge et al. 2024, Agent-as-a-Judge](https://arxiv.org/abs/2410.10934) — agent judge 的設計與和人工評分的比較。
- [Kapoor et al. 2024, AI Agents That Matter](https://arxiv.org/abs/2407.01502) — 為什麼 agent 研究要同時報成本與準確率。
- [Khattab et al. 2023, DSPy](https://arxiv.org/abs/2310.03714)、[Opsahl-Ong et al. 2024, MIPROv2](https://arxiv.org/abs/2406.11695)、[Agrawal et al. 2025, GEPA](https://arxiv.org/abs/2507.19457) — 三個 prompt 最佳化方法的搜尋細節與實驗。
- [Jin et al. 2025, Search-R1](https://arxiv.org/abs/2503.09516) — 用 RL 訓練會呼叫搜尋的模型（選修）。
- [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/)（2024-11-28）— reward hacking 的綜述，prompt 最佳化與 agent 訓練都會遇到。

### 課程與概覽

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — L9（最佳化）、L10（Terminal-Bench）、L11–L12（agent 資料）、L13（評估與 benchmark 設計）、L15（judge 與評估基礎設施）、L16（SWE-bench）；L15、L16 的投影片公開後再讀。
- [CMU 11-768 AI Agents](https://www.cmu-agents.com/) — 第 2 份作業（agent 軌跡評估）、第 3 份作業（REINFORCE / GRPO 的 agent RL 訓練）。
- [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) — verifier、test-time compute、self-improvement。
- [Berkeley Advanced LLM Agents Sp25](https://rdi.berkeley.edu/adv-llm-agents/sp25) — 講座系列，錄影公開；本站只核對過講題與讀物清單。
- GAIA、Terminal-Bench、TheAgentCompany 等其他 agent benchmark：讀之前先套用講義的 benchmark hygiene 三個問題。

### 中文資源

- [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) — 簡中；第 12 章（agent 性能評估）、第 11 章（Agentic RL，選修）。
- [WenyuChiou/awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) — 繁中；eval 部分整理得好。
- [datawhalechina/agentic-rl-lab](https://github.com/datawhalechina/agentic-rl-lab) — 簡中；Search-R1、ReTool 等可執行重現，選修的 agentic RL 主教材。
- [datawhalechina/happy-llm](https://github.com/datawhalechina/happy-llm) — 簡中；第 8 章 agentic RL，選修。

</section>
