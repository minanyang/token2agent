---
title: S15 Multi-agent
head:
  - tag: title
    content: Multi-agent 何時值得用？多 agent 架構（S15）｜Token2Agent
description: 什麼時候值得用 multi-agent：單一與多 agent 的取捨、manager 與 handoff 架構怎麼選、交接時該帶哪些 context、token 成本會放大多少，以及多 agent 最常見的失敗。
sidebar:
  order: 15
  label: S15 Multi-agent
---

:::note[這一章]
**⏱ 講義** 首次閱讀約 2.5 小時，手算與深入內容約 1.5 小時　**必做題** 約 8 小時　**進階題** 約 12 小時

**前置**：[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)；模型知識見 [模型速成](/guide/app-first/)　**銜接**：→ [S16 安全與治理](/stages/s16-security/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)
:::

:::tip[理解路線重點]
- 預設一個 agent 就夠；像筆記助理分查三個城市這種互不依賴的工作，才值得拆。
- 分到工作的 agent 只知道交接時寫給它的內容，漏寫的它就不知道。
- 多個 agent 一定更花錢，只有在評測上確實贏過一個 agent 才保留。
:::

## 在做什麼

多個 agent 分工聽起來很自然，但它會讓 token 成本倍增、多出交接時遺失資訊的風險，也更難除錯。這一章回答：什麼時候值得把一個 agent 拆成好幾個、怎麼拆、要付出多少代價。它刻意排在 [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 之後，因為答案只能由 eval 給：**只有在 eval 上勝過單一 agent，才保留 multi-agent**。

## 學完能

- 給定一個需求，能說出用單一 agent 和多 agent 各自的理由，並判斷它的子任務能不能各自平行完成。（講義與自我檢查）
- 區分 manager（agent-as-tool）與 handoff 架構，並為交接設計要傳遞的 context。（必做：manager 型的 orchestrator；handoff 在進階選做）
- 設計能分出高下的單一 vs 多 agent 實驗，估算 token 成本並和品質提升並列。（必做）
- 用 Cemri et al. 2025 的失敗分類標記多 agent 執行的失敗。（必做）
- 讓多個平行 agent 修改同一個專案而不互相覆蓋。（進階）

## 講義

先看全貌。到 [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 為止，筆記助理是**一個** agent：一個 loop、一份 context、一組工具。Multi-agent 是把工作分給好幾個 agent，各自有自己的 context，彼此之間靠訊息交接。這一章依序回答五件事：

1. **要不要拆**：多數情況單一 agent 就夠，只有少數條件下拆開才有好處。
2. **怎麼拆**：manager 模式（一個 agent 把其他 agent 當工具）或 handoff 模式（把對話交給另一個 agent）。
3. **交接帶什麼**：sub-agent 只知道你傳給它的東西，傳太少會漏、傳太多會亂。
4. **代價多少**：token、成本、延遲，要和品質一起算。
5. **怎麼壞、怎麼決定**：用失敗分類讀 trace，用 eval 決定保留或移除。

### ★ 一個例子：筆記助理的研究任務

整章都用同一個任務。小林問筆記助理：「整理我筆記裡和網路上關於家用太陽能板補助的資料，比較台北、台中、高雄三個市的方案，寫成一篇筆記。」

**單一 agent 版**：一個 agent loop（← S12 Agent loop 與 harness），加上 S10 工具與 MCP 的 `notes_search`、`web_clip`（讀一個網頁）、`notes_create`；這一章另加 `web_search` 工具。它依序查台北、再查台中、再查高雄，所有搜尋結果都留在同一份 context 裡，最後寫筆記。

**Multi-agent 版**：一個 **orchestrator**（負責拆工作、彙整結果的 agent）把任務拆成三份，各交給一個 **sub-agent**（被呼叫去做一小段工作的 agent），每個 sub-agent 只查一個城市，在自己的 context 裡搜尋、閱讀，最後只回傳 1,000 token 以內的摘要。orchestrator 拿到三份摘要後寫成筆記。

兩個版本用同一個模型、同一組工具。差別只有一個：工作是放在一份 context 裡依序做，還是分到三份 context 裡平行做。後面每一節都回到這兩個版本比較。

### ★ 什麼時候值得拆成多個 agent？

預設用單一 agent。只有在任務能拆成很多互不依賴的子任務、或資訊量超過一個 context 能好好處理時，才考慮多 agent。

兩方的論點都值得知道。Graham Neubig 的部落格文章〈Don't Sleep on Single-Agent Systems〉（2024-09-26）主張：一個通用模型、加上一組通用工具（寫程式、執行、瀏覽）與好的 prompt，就能做到很多多 agent 設計想做的事；多 agent 則會帶來角色僵化、agent 之間遺失 context、程式碼變複雜等問題。他認為多 agent 真正有理由的情況只有兩種：**某個 agent 握有其他 agent 不該看到的資訊**，或**不同 agent 代表不同的人行事**。

Anthropic〈How we built our multi-agent research system〉則說明了收益：在 BrowseComp（一組答案難找、但容易驗證的網路搜尋題）評估上，光是 token 用量就解釋了約 80% 的分數變異（加上工具呼叫次數與模型選擇，三個因素共解釋約 95%），而多 agent 是平行花更多 token 的方法。同一篇也說，需要所有 agent 共享同一份 context、或可平行的子任務不多的工作（文章舉多數 coding 任務為例）並不適合。

套到筆記助理：三個城市的補助可以各查各的，互不依賴，搜尋結果又多，適合拆。反過來，「把這篇筆記的語氣改得正式一點」只有一份文件、每一步都依賴前一步，拆開只會增加交接。介於兩者之間還有 [S12 Agent loop 與 harness](/stages/s12-agent-harness/) 學過的 **sub-agent 隔離**：主 agent 仍是一個，只把某段很吵的探索丟給 sub-agent，換回一份摘要。

**容易誤會：「任務有好幾個步驟」不等於「需要好幾個 agent」。** 研究 → 寫作 → 審查是三個步驟，但如果每一步都要看到前一步的全部內容，一個 agent 依序做通常更好。要拆的是能平行、能各自完成的工作，不是流程上的階段。

### ★ 多個 agent 怎麼分工？

OpenAI〈A Practical Guide to Building Agents〉把多 agent 分成兩種，差別在「誰對使用者說話」：

- **Manager 模式**：一個中央 agent 把其他 agent 當工具呼叫（**agent-as-tool**），sub-agent 做完回傳結果，控制權和對使用者的對話一直留在 manager 身上。
- **Decentralized 模式**（handoff）：agent 之間是對等的，一個 agent 把對話**交給**另一個專門的 agent，由它接手和使用者互動。

筆記助理的研究任務是 manager 模式：使用者始終只和筆記助理對話，三個城市的 sub-agent 對使用者是看不見的，就像三次比較複雜的工具呼叫。handoff 的典型例子是客服：分流 agent 判斷這是退款問題，把對話交給退款專員 agent，之後由專員直接回覆使用者，分流 agent 就退場了。

怎麼選：使用者需要一個固定的對話對象、結果要統一彙整時，用 manager；不同階段需要完全不同的專業與工具、而且交出去之後不必再回來時，用 handoff。

**容易誤會：handoff 不是「把任務交出去、等它回報」。** 那是 manager 模式。handoff 之後，原本的 agent 不再參與，接手的 agent 就是使用者現在的對話對象。

<details class="deep">
<summary>準備動手做：在 OpenAI Agents SDK 裡兩種模式長什麼樣</summary>

- 在 [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) 裡，manager 模式是把 sub-agent 包成工具（Python 版是 `Agent.as_tool`），manager 呼叫它、拿回輸出，對話仍由 manager 負責。
- handoff 預設會把完整對話歷史交給接手的 agent。**handoff input filter** 讓你決定接手的 agent 看到什麼，例如去掉前一個 agent 的工具呼叫細節。
- 不用框架也能做：manager 就是一個工具，工具的實作是「開一個新的 messages 陣列、跑一個 agent loop（← S12 Agent loop 與 harness）、回傳最後的文字」。

</details>

### ★ 交接時要傳什麼？

Sub-agent 的 context 是全新的。它看不到使用者的原始對話、看不到 orchestrator 想過什麼，只看得到交接時傳給它的那段文字。所以交接內容決定了 sub-agent 能做多好。

這是 [S11 Context engineering](/stages/s11-context-engineering/) 的 context 預算問題在多 agent 上的版本：**傳太少**，sub-agent 不知道重點，做出用不到的東西；**傳太多**，把無關內容、甚至不可信的內容（例如網頁裡藏的指令）一起帶過去。好處也在這裡：每個 sub-agent 只處理自己那一份資料，不會被其他城市的搜尋結果干擾，這就是 **context 隔離**。

筆記助理交給台中 sub-agent 的交代（brief），應該包含：

| 欄位 | 內容 |
|---|---|
| 目標 | 找出台中市 2026 年家用太陽能板補助的金額、申請資格、申請期限 |
| 範圍 | 只查台中市；先搜使用者筆記，再搜網頁；只採用政府網站或新聞來源 |
| 輸出格式 | 1,000 token 以內；每個論點附來源（筆記標題或網址）；查不到的欄位寫「查無」 |
| 預算 | 最多 8 次搜尋 |
| 不要做的事 | 不建立或修改筆記；不比較其他城市 |

回傳的方向同樣要設計：orchestrator 只收摘要，不收 sub-agent 讀過的整頁網頁。三份摘要加起來約 3,000 token，比三個城市的全部搜尋結果小得多。

**容易誤會：sub-agent 不會「記得」使用者剛才說過的話。** 使用者在對話開頭說「我住透天，不是公寓」，orchestrator 沒寫進 brief，sub-agent 就不知道，可能整理了一堆公寓適用的方案。

### ★ 誰來拆工作、彙整結果？

[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 學過 orchestrator-workers workflow：由程式或模型把任務拆給多個 worker。在 agent 版本中，orchestrator 自己決定要拆成幾份、每份交代什麼、何時夠了。Deep research（深度研究：自動搜尋大量來源、彙整成有引用的報告）是這個架構最典型的用途。

Anthropic 的研究系統是一個具體例子：lead agent 規劃研究方向、平行產生多個 sub-agent 各自搜尋不同面向，sub-agent 在自己的 context 裡探索、只回傳精簡結果，lead agent 彙整後，再交給一個專門的 citation agent 把每個論點對應到來源。對應到筆記助理：orchestrator 是 lead agent，三個城市各一個 sub-agent，最後可以再加一個檢查引用的步驟。

這個架構的難處多在 orchestrator 的指示。文章提到早期版本的 lead agent 會為簡單問題產生多達 50 個 sub-agent；任務描述不夠具體時，sub-agent 會重複彼此的工作或留下缺口。他們的解法是在 prompt 裡寫明「依問題複雜度決定投入多少」的規則。套到筆記助理：「台中的補助是多少」一個 sub-agent 都不需要；「比較三個市」才拆成三份。

**容易誤會：sub-agent 越多越好。** 每多一個 sub-agent，就多一份 context 的成本、多一次交接的風險；子任務切得重疊，還會重複搜尋同樣的網頁。Deep research 系統的完整拆解在 [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)。

<details class="deep">
<summary>準備動手做：寫 orchestrator prompt 的檢查清單</summary>

- 寫明投入規則，例如「單一事實問題直接回答；比較 N 個對象時，每個對象一個 sub-agent，最多 4 個」。
- 要求 orchestrator 在產生 sub-agent 之前先列出子任務，檢查兩兩是否重疊、合起來是否涵蓋整個問題。
- 每個 brief 都用同一個模板（上面的五個欄位），方便在 trace 裡比對。
- sub-agent 回傳格式固定，orchestrator 才能可靠地彙整；可以用 structured output（← [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）。

</details>

### ★ 多 agent 要多花多少錢？

多 agent 平行花更多 token，品質可能更好，帳單一定更高。所以每次都要兩個數字一起看：品質提升多少、成本放大多少。

Anthropic 的研究系統報告：agent 平均用掉約一般聊天 4 倍的 token，multi-agent 系統約 15 倍。兩個數字的基準都是聊天；換算成「多 agent 相對單一 agent」，大約是 15 ÷ 4 ≈ 3.75 倍。同一篇文章報告，Opus 4 當 lead、Sonnet 4 當 sub-agent 的多 agent 系統，在他們內部的研究 eval 上比單一 Opus 4 agent 高 90.2%；但這是在特別適合平行的研究任務上、用他們自己的 eval 量到的結果。

自己的系統要自己算。用筆記助理的例子手算一次（數字是示意）：

- 系統提示詞與工具說明：單一 agent 2,000 token，每個 sub-agent 1,500 token。
- 每次搜尋或讀網頁，連同模型自己的呼叫，讓 context 多 3,000 token。
- agent 每呼叫一次模型，都要把**目前整份 context** 重新送一次，所以輸入 token 會越滾越多。輸出 token 相對少，這裡為了好算省略。

**單一 agent**：每個城市 4 次搜尋，共 12 次，加上最後寫筆記，共 13 次模型呼叫。第 k 次的輸入是 2,000 + 3,000 ×（k − 1），最後一次約 38,000 token。總和 = 13 × 2,000 + 3,000 ×（0 + 1 + … + 12）= 26,000 + 234,000 = **260,000 token**。

**Multi-agent**：sub-agent 專心查一個城市，各做 8 次搜尋，加上寫摘要共 9 次呼叫，每個 sub-agent = 9 × 1,500 + 3,000 ×（0 + 1 + … + 8）= 13,500 + 108,000 = 121,500 token，三個共 364,500。orchestrator 規劃一次（輸入 2,000）、彙整一次（2,000 + 規劃 500 + 三份摘要 3,000 = 5,500），共 7,500。總和 **372,000 token**。

| | 單一 agent | Multi-agent |
|---|---|---|
| 搜尋次數 | 12 | 24 |
| 總輸入 token | 260,000 | 372,000 |
| 相對單一 agent 的倍數 | 1× | 約 1.43× |
| 成本（假設每百萬輸入 token 1 美元） | 0.26 美元 | 約 0.37 美元 |
| 依序進行的模型呼叫數 | 13 | 11（規劃 1 + 平行的 9 + 彙整 1） |

這張表說明三件事：

- **多 agent 貴，主要是因為做了更多事。** 如果每個 sub-agent 也只搜 4 次，總和只有 3 × 37,500 + 7,500 = 120,000 token，反而比單一 agent 少，因為各自的 context 不會互相累積。真正放大成本的是平行之後搜得更多。
- **倍數取決於設計。** 這裡是 1.43×，Anthropic 的系統約 3.75×，你的必做題會量到自己的數字。
- **平行可能更快。** 總 token 較多，但依序的呼叫數較少，實際耗時可能較短。

報告多 agent 結果時，一定要把總 token（包含所有 sub-agent）、成本、延遲和品質放在同一張表（← [S8 Eval 方法論的成本會計](/stages/s08-evals/)）。

**容易誤會：只看 orchestrator 的 token 用量。** 上面的例子裡 orchestrator 自己只用了 7,500 token，總和卻是 372,000。每個 sub-agent 的每次呼叫都要加總，先各跑 1 題對帳。

<details class="deep">
<summary>深入一點：為什麼單一 agent 的輸入 token 會越滾越多</summary>

- 每步讓 context 增加 c 個 token、起始是 s 時，n 次呼叫的總輸入是 n·s + c·n(n − 1)/2，隨 n 的平方成長。把 n 次呼叫拆成 m 個互不相干的 sub-agent，每個只有 n/m 次，平方項大約變成原本的 1/m。這就是「做同樣的事，拆開反而省」的來源。
- 實際帳單還受 prompt caching 影響：重複送出的前綴可以用較便宜的價格計費，越滾越多的那部分因此便宜不少（← [模型速成](/guide/app-first/#成本與延遲的基本功)；深入：[S5 推論與 serving](/stages/s05-inference/)）。用 token 數比較兩個版本最穩；換算成金額時，兩邊用同樣的計價方式。

</details>

### ★ 多 agent 最常怎麼壞？

讀多 agent 的 trace 時，先用一套現成的分類標記失敗，才看得出哪一類最常發生、該先修哪裡。

[Cemri et al. 2025, Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) 標註了 7 個多 agent 框架的大量執行紀錄，整理出多 agent 系統失敗分類（MAST）：14 種失敗模式，歸成三大類：

| 大類 | 例子 | 筆記助理的樣子 |
|---|---|---|
| **系統設計問題** | 不遵守任務或角色規格、重複步驟、不知道何時該停 | 台中 sub-agent 把高雄也查了；orchestrator 搜完還一直開新的 sub-agent |
| **agent 之間沒對齊** | 沒把資訊傳給其他 agent、忽略其他 agent 的輸入、偏離任務、該問清楚卻沒問 | 「住透天」沒寫進 brief；orchestrator 彙整時漏掉高雄摘要裡的申請期限 |
| **任務驗證問題** | 太早結束、沒有驗證、驗證不完整或驗證錯誤 | 檢查引用的步驟只看「有沒有附網址」，沒看網址內容是否支持論點 |

論文的觀察是：多 agent 在常見 benchmark 上的提升常常很小，而很多失敗來自系統設計，不只是模型能力。

做法上，把 MAST 當成 [S8 Eval 方法論](/stages/s08-evals/) 錯誤分析的起始分類：讀 trace 時先用這三大類標記，再依你的系統細分子類，數出每類的次數，從最多的那類開始修。

**容易誤會：失敗出現在哪個 agent，就是哪個 agent 的錯。** 最後的筆記漏了申請期限，表面上是 orchestrator 寫漏了；讀 trace 可能發現是 brief 沒要求 sub-agent 找期限，根源在交接。

### ★ 多 agent 值得保留嗎？

多 agent 是一個要付成本的假設。決定保不保留，看的是同一組 eval 上的兩個數字：品質差值的信賴區間，和成本倍數。

[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 講過怎麼建立可信的 agent eval。比較時的規則：

1. **跑之前**寫下可以接受的成本倍數上限（多 agent ÷ 單一 agent），以及預期多 agent 贏在哪裡。事後才定上限，很容易替結果找理由。
2. 兩個版本跑同一組題目、同一個模型、同樣的工具，每題多跑幾次。
3. 只有在品質差值的 95% 信賴區間不包含 0、**且**成本倍數在上限內，才保留 multi-agent（信賴區間 ← [S8 Eval 方法論](/stages/s08-evals/)）。

用筆記助理舉兩個示意結果，事先寫下的成本上限都是 2 倍：

- 涵蓋率多 7 個百分點，差值的信賴區間 +2 到 +12，成本 1.43 倍 → 兩個條件都過，保留。
- 涵蓋率多 3 個百分點，信賴區間 −2 到 +8，成本 1.43 倍 → 信賴區間包含 0，看不出真的比較好，移除。

**容易誤會：移除代表實驗失敗。** 結論是「單一 agent 就夠」，省下的是之後每一次執行的成本與除錯時間，這和「保留」一樣是有用的結果，也很常見。

### ★ 平行修改怎麼不互相覆蓋？

多個 agent 平行修改同一份東西時，最直接的問題是互相覆蓋。解法是每個 agent 有自己的工作區，最後由一個步驟負責合併。

程式專案用 `git worktree`：同一個 repo 可以同時有好幾個工作目錄，每個在自己的分支上。每個 agent 在自己的目錄改，完成後再合併，誰也不會蓋掉誰的檔案。非程式的資料用每個 agent 獨立的草稿區。

筆記助理的例子：兩個 writer 平行改同一篇筆記，一個寫台北段、一個寫台中段。直接寫同一個檔案時，後存檔的會蓋掉先存檔的，台北段就不見了。改成各寫各的草稿，最後由一個合併步驟依段落組起來。

隔離也是安全邊界：一個 agent 被 prompt injection 劫持時，損害限制在它自己的工作區（→ [S16 安全與治理](/stages/s16-security/)）。

**容易誤會：有了隔離就不會衝突。** 隔離只是把衝突延到合併時；兩個 agent 改了同一段，合併步驟仍要決定留哪一個。所以分工時就要讓它們改不同的部分。

<details class="deep">
<summary>準備動手做：git worktree 的基本操作</summary>

- 建立：`git worktree add ../agent-a -b agent-a` 在上一層目錄開一個新的工作目錄，並建立分支 `agent-a`。每個 agent 一個。
- 每個 agent 的工具（讀檔、寫檔、執行指令）都限定在自己的目錄裡。
- 合併：agent 做完後在主目錄 `git merge agent-a`，有衝突時由合併步驟（或人）處理。
- 清理：`git worktree remove ../agent-a`，再刪掉分支。
- 草稿區版本：每個 writer 一個暫存目錄，寫成獨立檔案；合併步驟讀所有檔案、依段落組裝，並檢查每個 writer 的修改都出現在結果裡。

</details>

<section class="deep-section">

### ○ 多個 agent 互動會出現什麼？

多個 agent 長時間互動時出現的合作、競爭、說服等行為（emergence），是研究主題而不是工程主題。有興趣可以看 [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) 課程的 multi-agent 社會行為與 Theory of Mind 講次。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** 自己算一次講義的筆記助理例子：如果每個城市的 sub-agent 搜 6 次（其他假設不變），multi-agent 版的總輸入 token 是多少？相對單一 agent 的倍數是多少？

<details class="hint">
<summary>對照答案</summary>

每個 sub-agent 6 次搜尋加寫摘要共 7 次呼叫：7 × 1,500 + 3,000 ×（0 + 1 + … + 6）= 10,500 + 63,000 = 73,500；三個共 220,500，加 orchestrator 7,500，總和 228,000 token。相對單一 agent 的 260,000 約 0.88×，反而比較省：成本放大來自搜得更多，不是拆開本身。

</details>

### 必做：單一 agent vs orchestrator-worker 對照實驗

**目標**：在同一組任務上公平比較單一 agent 與 orchestrator-worker，用品質、token、延遲三個數字決定要不要用多 agent。

**步驟**
1. 用 [MultiHop-RAG](https://huggingface.co/datasets/yixuantt/MultiHopRAG)（Tang & Yang 2024；2023 年的英文新聞，`corpus.json` 609 篇文章、`MultiHopRAG.json` 2,556 題，ODC-BY 授權）。用固定的亂數種子挑 10 題 `evidence_list` 來自 3 篇以上不同文章的題目；語料是這 10 題的全部證據文章，再隨機補足到 50 篇（想更難可以直接用全部 609 篇）。符合條件的題目中，同一個標準答案很集中（例如很多題的答案都是同一個人），挑題時同一個 `answer` 最多取 1 題。每題的「好答案必須包含的要點」清單 = 標準答案 `answer`，加上每篇證據文章的 `fact` 欄位。開始跑之前，寫下你可以接受的成本倍數上限（多 agent ÷ 單一 agent）。
2. 單一 agent 版本：用一個 agent loop（← S12 Agent loop 與 harness），給它 `search`、`read_document` 兩個工具。
3. Orchestrator-worker 版本：orchestrator 把問題拆成 2–4 個子問題，每個 worker 在自己的 context 中用同樣的工具研究，回傳 1,000 token 以內的摘要；orchestrator 彙整成答案。兩個版本用同一個模型、同樣的工具。
4. 每個版本每題跑 3 次。記錄總 token（包含所有 worker）、實際耗時（wall-clock time）、成本。
5. 用要點清單評分（每題的要點涵蓋率），可以用 S8 Eval 方法論校準過的 judge 判斷每個要點是否出現。
6. 失敗執行定義為要點涵蓋率 < 100% 的執行。從兩個版本的失敗執行中各挑 3 條讀 trace（不足 3 條就全部讀），用 MAST 三大類標記多 agent 版本的失敗。

**驗收**
- 一張對照表：兩個版本的平均要點涵蓋率（附 95% 信賴區間）、平均總 token、平均延遲、平均成本。
- 算出多 agent / 單一 agent 的 token 倍數，和上面從 Anthropic 數字換算的約 3.75 倍比較（不要直接和相對聊天的 15 倍比），說明差異可能的原因。
- 多 agent 版本讀過的失敗執行（最多 3 條；不足 3 條就是全部失敗執行）都有 MAST 類別標記與一句說明；完全沒有失敗時，寫明 0 次失敗。
- 一段結論：只有在涵蓋率差值的信賴區間不包含 0、**且**成本倍數在第 1 步寫下的上限內，才寫「保留 multi-agent」。

**提示**
- TypeScript：沿用 agent loop（← S12 Agent loop 與 harness）；worker 用 `Promise.all` 平行跑，每個 worker 一個獨立的 messages 陣列。
- Python：`asyncio.gather` 平行跑 worker。
- 搜尋工具可以直接用 S9 檢索與 RAG 的檢索，或用 grep 類的 agentic search（← S12 Agent loop 與 harness）。
- 成本：60 次執行中多 agent 那一半會明顯較貴，用雲端小模型通常在數美元內；先各跑 1 題確認 token 記錄有包含所有 worker。
- 卡住時：
  - 重讀：[交接](#-交接時要傳什麼)、[orchestrator-worker](#-誰來拆工作彙整結果)、[token 經濟](#-多-agent-要多花多少錢)、[先有 eval，贏了才保留](#-多-agent-值得保留嗎)
  - 延伸：Anthropic〈How we built our multi-agent research system〉的 prompt 原則段

**預估**：8 小時

<section class="deep-section">

### 進階：系統線 A15：有證據才保留的 multi-agent

**目標**：為你的系統試做一個 research → write → review 的多 agent 流程，在 A14 agent eval 與最佳化（[代號說明](/guide/how-to-use/#代號怎麼讀)）建立的評估集上和單一 agent 比較，只有贏了才保留。

**步驟**
1. 從 A14 agent eval 與最佳化的評估集中挑（或新增）至少 20 個適合拆分的任務。先寫下你預期 multi-agent 會贏在哪裡、你可以接受的成本上限。
2. 用 manager 模式實作：manager 把 researcher、writer、reviewer 當工具呼叫。為每個交接寫明傳遞的內容（哪些欄位、多少 token、是否包含不可信的工具輸出）。
3. （選做）做一個 handoff 版本，用 input filter 控制交接內容，和 manager 版本比較。
4. 如果有多個 writer 平行修改資料，給每個 writer 獨立的工作區（git worktree 或獨立草稿區），由一個步驟負責合併。
5. 單一 agent 與 multi-agent 各跑 20 題 × 3 次，grader 沿用 A14 agent eval 與最佳化。
6. 讀多 agent 的失敗 trace，用 MAST 分類，修一輪最常見的失敗後重跑。

**驗收**
- 單一 vs multi-agent 對照表：品質（附 95% 信賴區間）、總 token、成本、延遲；修正前後各一版。
- 失敗分類計數表（MAST 三大類與你細分的子類）。
- 隔離測試：讓 2 個 writer 平行修改同一份文件的不同段落，跑 10 次，合併後遺失的修改為 0 次。
- 一份決策紀錄：保留或移除 multi-agent，理由引用上面的數字。結論是「移除」完全可以接受，也是常見的結果。

以筆記助理為例：「研究『家用太陽能板補助』→ 寫成一篇整理筆記 → 審查每個論點是否有引用」。researcher 平行搜尋筆記與網頁，writer 寫草稿，reviewer 檢查引用；和「一個 agent 從頭做到尾」比較涵蓋率與成本。

**提示**
- TypeScript：可以手寫 manager，或用 OpenAI Agents SDK 的 JS 版本對照框架做法；隔離用 `git worktree` 指令或每個 writer 一個暫存目錄。
- Python：手寫，或用 `openai-agents` 的 `Agent.as_tool` 與 handoffs 對照。
- 成本：multi-agent 版本可能是單一 agent 的數倍，20 × 3 次先用小模型跑；把成本上限寫進 harness 的 budget（← S12 Agent loop 與 harness）。
- 卡住時：
  - 重讀：[兩種架構](#-多個-agent-怎麼分工)、[失敗分類](#-多-agent-最常怎麼壞)、[worktree 隔離](#-平行修改怎麼不互相覆蓋)
  - 延伸：Cemri et al. 2025 的失敗例子、learn-claude-code s13

**預估**：12 小時

</section>

## 自我檢查

1. Neubig 認為多 agent 真正有理由的兩種情況是什麼？你的系統有沒有符合其中之一？（理解路線：用筆記助理回答）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：某個 agent 握有其他 agent 不該看到的資訊，或不同 agent 代表不同的人行事。**常見錯法**：拿「任務有好幾個步驟」當理由。**回讀**：[什麼時候值得拆](#-什麼時候值得拆成多個-agent)

   </details>

2. Manager 模式和 handoff 模式，對使用者來說差別在哪裡？各舉一個適合的例子。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：manager 模式下使用者始終和同一個 agent 對話（筆記助理的研究任務）；handoff 之後由接手的 agent 直接回覆使用者（客服分流到退款專員）。**常見錯法**：把「交出去、等它回報」當成 handoff。**回讀**：[多個 agent 怎麼分工](#-多個-agent-怎麼分工)

   </details>

3. 為什麼「在 BrowseComp 上，token 用量解釋了約 80% 的分數變異」這件事，同時是 multi-agent 的優點和警訊？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：多 agent 能平行花更多 token，所以分數會上升；但提升多半來自花更多 token，成本也跟著放大，一定要和成本並列。**常見錯法**：只看分數上升，不看 token 也跟著放大。**回讀**：[什麼時候值得拆](#-什麼時候值得拆成多個-agent)、[多 agent 要多花多少錢](#-多-agent-要多花多少錢)

   </details>

4. 情境題：多 agent 版本在你的 eval 上品質高 4 個百分點（信賴區間 −1 到 +9），成本是 6 倍。你會怎麼寫結論？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：區間包含 0，看不出真的比較好，又要付 6 倍成本，所以移除。**常見錯法**：看到點估計 +4 就寫「多 agent 比較好」。**回讀**：[多 agent 值得保留嗎](#-多-agent-值得保留嗎)

   </details>

5. 情境題：reviewer agent 一直說「看起來沒問題」，最後的筆記卻有兩個沒引用的論點。這屬於 MAST 的哪一類？你會怎麼改？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：任務驗證問題（驗證不完整或錯誤）；給 reviewer 明確的檢查標準，例如每個論點都要對到來源內容，能用程式檢查的部分用程式。**常見錯法**：歸成「agent 之間沒對齊」，或只叫 reviewer「更仔細」。**回讀**：[多 agent 最常怎麼壞](#-多-agent-最常怎麼壞)

   </details>

6. 為台北 sub-agent 寫一份 brief（目標、範圍、輸出格式、預算、不要做的事），並指出如果漏掉「輸出格式」一欄，orchestrator 彙整時可能出什麼問題。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：五欄都要具體到台北；漏掉輸出格式時，三份回傳的長度與結構不一、可能沒附來源或把整頁網頁貼回，orchestrator 很難比對，context 也會被塞滿。**常見錯法**：範圍只寫「台北」，沒寫來源限制與不要做的事。**回讀**：[交接時要傳什麼](#-交接時要傳什麼)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看原始數字與實際系統細節的人，都不是必讀。

### 原始文章與論文

- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)（2025-06-13）— 講義的 token 經濟與 deep research 架構都來自這篇；全文另有 prompt 原則、怎麼評估、上線遇到的問題。
- [Cemri et al. 2025, Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) — 完整的 14 種失敗模式表與每類的真實例子。
- [Graham Neubig: Don't Sleep on Single-Agent Systems](https://www.openhands.dev/blog/dont-sleep-on-single-agent-systems)（2024-09-26）— 單一 agent 的完整論點；部落格文章，篇幅短。
- [Wu et al. 2023, AutoGen](https://arxiv.org/abs/2308.08155) — 用多 agent 對話組系統的早期框架。
- [Anthropic: Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp)（2026-03-06）— [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 讀過；注意其中一個數字：同一批 1,266 題重跑，非預期的解法在單一 agent 下約 0.24%，多 agent 下約 0.87%，原文寫約 3.7 倍（兩個百分比是四捨五入後的數字，直接相除約 3.6）。作者認為模型的傾向沒有變，而是平行花更多 token、搜尋更多次，碰到外洩答案或察覺自己在被測試的機會也跟著變多。

### 官方文件與指南

- [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — 多 agent 段：manager 與 decentralized 兩種模式的原始說明。
- [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/) — handoff、input filter 的實際 API，以及和 agent-as-tool 的差別。
- [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) — multi-agent 章。偏 Google 生態。

### 課程與概覽

- [Stanford CS 329Z](https://cs329z.stanford.edu/) — L8 投影片（orchestration 模式、handoffs、A2A、為什麼會失敗）；L18（投影片公開後再讀）：看多 agent 在真實產品中怎麼取捨；deep research 與 coding agent 的拆解見 [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)。
- [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) — multi-agent 社會行為、Theory of Mind（選修）。
- A2A 等 agent 之間的協定：S10 工具與 MCP 選修、S18 部署與架構再談。

### 中文資源

- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — 英文，附簡中翻譯；s13（agent teams：隊友協作、認領任務、任務綁定的 worktree），可以看 worktree 隔離的實際程式。
- [datawhalechina/deepagents-in-action](https://github.com/datawhalechina/deepagents-in-action) — 簡中；第 5 章（sub-agent 與上下文隔離）、第 6 章（非同步 sub-agent）。綁 LangChain。
- [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) — 簡中；第 14 章（自動化深度研究 agent）可以當 deep research 架構的實作參考。

</section>
