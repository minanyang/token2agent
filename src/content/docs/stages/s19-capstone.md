---
title: S19 真實 agent 系統與畢業專題
head:
  - tag: title
    content: 拆解 coding agent 與 deep research（S19）｜Token2Agent
description: 拆解 coding agent、deep research、常駐個人 agent 三類真實系統的設計，再把自己的專案做成可上線、可評估、可辯護的常駐 agent，完成畢業專題。
sidebar:
  order: 19
  label: S19 真實 agent 系統與畢業專題
---

:::note[這一章]
**前置**：必做題只需要 agent loop 的概念（← [S12 Agent loop 與 harness](/stages/s12-agent-harness/)）；畢業專題需要做完[系統專案](/projects/system-thread/) A6–A18　**銜接**：路線的終點；之後回到 [S0 AI 系統概觀](/stages/s00-big-picture/)，挑一層往深處走
:::

:::tip[理解路線重點]
- 任何 agent 都能拆成同樣的六塊，看懂每塊的取捨，就能比較不同產品。
- 流程事先知道的任務，固定流程常比讓模型自己決定更便宜、更可靠。
- 筆記助理在背景常駐時，每次定時檢查都要花錢，也多了被攻擊的入口。
:::

## 在做什麼

前面十八章把 AI 系統拆成一層一層學。這章反過來，看目前最成熟的三類 agent 怎麼把這些層組合起來：coding agent、deep research、常駐個人 agent。目的不是照抄，而是看懂任何 agent 產品背後的取捨：為什麼這裡用固定的 workflow、那裡交給模型決定，為什麼要拆成多個 agent，為什麼要讓人核准。

畢業專題把你的系統延伸成一個常駐的 agent，並交出五份工程證據，證明它能上線（shippable）、能被量測（evaluable）、每個決定都有理由（defensible）。只做必做題的讀者，做完必做題（拆解一個開源 coding agent）就走完整條路線；畢業專題（A19）是進階題，前提是你一路做了系統專案 A6–A18。理解路線讀完講義、先試一下與自我檢查即完成。

## 學完能

- 讀一條 trajectory，指出每一步落在六塊地圖（loop、工具、context、memory、eval、安全）的哪一塊、對應哪一章。（講義與自我檢查）
- 說明 deep research 系統的 orchestrator-worker 與 citation 設計，以及它們的成本。（講義與自我檢查）
- 拿到任何一個開源 agent，畫出它的六塊並在程式碼裡找到位置。（必做）
- 解釋 Agentless 與 SWE-agent 為什麼都能在同一個 benchmark 上有競爭力，以及這對「何時該用 agent」的意義。（必做）
- 設計常駐 agent 的排程、通知管道與主動行為，並控制它的成本與安全風險。（進階）
- 交出一個常駐 agent 與五份工程證據：regression suite、infra 變因報告、trifecta 稽核、harness ablation 筆記、架構文件。（進階）

## 講義

先看全貌。這章用同一把尺（六塊地圖）拆三個真實系統，並用各章沿用的**筆記助理**例子當橋：筆記助理要修自己的程式，會長得像 coding agent；要替你做研究，會像 deep research；要在你沒打開它時也能工作，就是常駐 agent。最後一節說明畢業專題的五份證據，以及判讀它們的兩個統計觀念。

### ★ 怎麼拆解任何 agent？

任何 agent，不管包裝成什麼產品，都能拆成六塊。拆完之後，每一塊都對得回前面某一章，產品之間的差別就變成「每一塊做了什麼選擇」。

功能清單之間沒辦法比較；固定成六塊，才能問出有用的問題（表中的代號見[代號說明](/guide/how-to-use/#代號怎麼讀)）：

| 塊 | 要問的問題 | 筆記助理的樣子 | 對應章節 |
|---|---|---|---|
| Loop | 下一步由程式還是模型決定？什麼時候停？ | 模型決定要不要再搜一次；最多 15 步 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)（workflow）、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| 工具 | 模型能做哪些動作？介面怎麼設計？ | `notes_search`、`notes_create`、`web_clip` | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| Context | 每一步模型看到什麼？太長怎麼辦？ | 系統提示詞、問題、搜到的 5 篇筆記；對話太長時做 compaction | [S9 檢索與 RAG](/stages/s09-rag/)、[S11 Context engineering](/stages/s11-context-engineering/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| Memory | 跨 session 記得什麼？ | 「使用者偏好條列式」、時區 UTC+9 | [S13 Memory 與個人化](/stages/s13-memory/) |
| Eval | 怎麼知道它變好或變壞？ | 50 題的 regression suite，每題跑 3 次 | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| 安全 | 能碰哪些資料、能對外做什麼、誰核准？ | 寄信草稿要人按送出；剪藏的網頁一律當不可信輸入 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)（權限）、[S16 安全與治理](/stages/s16-security/) |

最快的拆法是從一條 trajectory 讀起，也就是一次任務從頭到尾的完整紀錄：每一次模型回應、每一次工具呼叫與結果。它的每一步都會落在某一塊上。以筆記助理回答「上個月我記了哪些 RAG 的重點？」為例：

1. 載入系統提示詞，加上記憶「偏好條列式」。→ context、memory
2. 模型呼叫 `notes_search(query="RAG", month="2026-10")`。→ loop、工具
3. 回傳 5 篇筆記，其中 1 篇是剪藏的網頁，hook 把它標成不可信內容。→ 安全
4. 模型判斷資料夠了，用條列式回答並附筆記連結，不再呼叫工具。→ loop 的停止條件
5. 這次的 trace 被抽樣，之後可能變成 regression suite 的一題。→ eval

容易誤會的是，以為六塊就是程式裡的六個模組。一段程式常同時屬於兩塊（compaction 既管 context，也決定留下什麼），一列標兩章是正常的。另外，「沒有」也是一種選擇：mini-SWE-agent 完全沒有 memory，也沒有專用工具，這本身就是值得寫下的設計取捨。

### ★ Coding agent 怎麼設計？

Coding agent 是目前最成熟的 agent 類型。四個代表系統各自把六塊中的一塊推到極致，對照著看，最能看出「該讓模型決定多少」。

它成熟是因為任務條件特別好：目標清楚（讓測試通過）、回饋即時（編譯器與測試馬上指出錯誤），環境可以放進 sandbox，做錯了丟掉重來。四個系統分別示範：

- **SWE-agent**（Yang et al. 2024）推的是工具這一塊。它提出 agent-computer interface（ACI）（← [S10 工具與 MCP](/stages/s10-tools-mcp/)）：給模型用的指令要像給人用的 UI 一樣設計。例如檔案檢視器一次只顯示 100 行並標行號、搜尋結果限制筆數、編輯後立刻做語法檢查，出錯就拒絕這次編輯。這樣比直接給模型一個 shell 效果好。你在 S0 AI 系統概觀讀過的 [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent) 是另一個極端：約 100 行，只給 bash。
- **Agentless**（Xia et al. 2024）推的是 loop 這一塊，而且是把它拿掉：完全不讓模型決定流程，改用固定的三階段 workflow：定位問題、產生修補、驗證並挑選修補。模型只在每個階段內做事，以很低的成本達到有競爭力的結果。
- **OpenHands**（Wang et al. 2024）是開放平台，重點在執行環境與安全：agent 在 sandbox 裡用寫程式的方式行動，每個動作與結果都記錄成事件串流，方便重播與除錯。
- **Claude Code** 把 harness 元件（← [S12 Agent loop 與 harness](/stages/s12-agent-harness/)）做成使用者可以設定的介面：`CLAUDE.md`（專案記憶）、hooks（在工具呼叫前後執行的程式）、skills、sub-agent、權限模式。

用同一個 issue 對照 SWE-agent 和 Agentless。假設筆記助理的 repo 有一個 bug：「標籤後面緊接全形標點時（`#讀書心得，`），搜尋 `#讀書心得` 找不到這篇筆記」。

| | SWE-agent 式（模型決定流程） | Agentless 式（程式決定流程） |
|---|---|---|
| 找位置 | 模型自己搜 `tag`，打開 `parser.py`，捲到第 40 行 | 第 1 階段：給模型 repo 結構，依序縮小到檔案、函式、行號 |
| 改程式 | 模型編輯第 40–42 行，語法檢查通過 | 第 2 階段：一次產生 4 個候選修補 |
| 驗證 | 模型決定跑測試，看結果，必要時再改 | 第 3 階段：程式跑原有測試與重現測試，4 個剩 2 個，再挑一個 |
| 步數 | 看情況，可能 6 步也可能 30 步 | 固定 3 階段 |

兩種做法在 SWE-bench 這類 benchmark 上都有競爭力，原因在任務的形狀：每題都是「一個 issue、一個 repo、測試決定成敗」。結構事先知道，固定流程就涵蓋得了，而且更便宜、更可預測、壞了也容易查是哪一階段出錯。這是 workflow vs agent（← [S0 AI 系統概觀](/stages/s00-big-picture/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)）最好的實例：先用 workflow，任務真的需要時才把決定權交給模型。

固定 workflow 不夠用的情況，是下一步要看前一步的結果才知道：要先把程式跑起來才能重現 bug、要讀 log 才知道該改哪個模組、一個功能要改五個檔案而順序事先看不出來，或是 issue 本身寫得不清楚、得先問人。

容易誤會的是「benchmark 分數相近就代表一樣好」。分數相近時，成本、每次結果的穩定度（pass^k：k 次都成功的比例，← S8 Eval 方法論）可能差很多；而且你自己的任務不一定長得像 benchmark 的題目。必做題就是在你自己的 5 個任務上把這些量出來。

<details class="deep">
<summary>深入一點：spec-driven development 與 Claude Code 的設定點</summary>

- **Spec-driven development** 是和 coding agent 協作的一種方法：先寫清楚要做什麼、為什麼做（spec），再轉成技術計畫、拆成任務，最後才實作並驗證。GitHub 的 spec-kit 把這個流程做成工具。它的價值在於讓「人的意圖」成為可檢查的文件，而不是散落在對話裡；對照六塊地圖，spec 是一份每個 session 都會載入的 context，也是驗收時的 eval 依據。
- **Claude Code 的設定點對應到哪一塊**：
  - `CLAUDE.md` 在 session 開始時載入（context、memory）。
  - hooks 可以在工具呼叫前擋下或改寫動作、呼叫後做檢查或紀錄（安全、eval）。
  - skills 平時只露出名稱與描述，需要時才載入全文（progressive disclosure，← S11 Context engineering、S12 Agent loop 與 harness）。
  - sub-agent 在自己的 context 裡工作、只回傳結果（context 隔離，← S12 Agent loop 與 harness）。
  - 權限模式決定哪些動作要先問人（← S12 Agent loop 與 harness）。

  官方的 Best practices 是一份「怎麼跟 agent 協作」的指南，也能從中反推它的 harness 設計。
- **OpenHands 的「用寫程式行動」**：與其定義幾十個工具，不如讓 agent 寫一段 Python 或 bash 在 sandbox 裡執行。動作空間變大，sandbox 與 egress 限制（← S10 工具與 MCP、S16 安全與治理）因此更重要。

</details>

### ★ 研究型 agent 怎麼分工？

Deep research 系統回答需要大量搜尋與整合的問題：一個 lead agent 拆題，多個 sub-agent 平行搜尋，最後由專門的 citation agent 把結論對回來源。它能做得更廣，代價是用掉多很多 token。

研究型問題面向多、每個面向都要搜很多次。全部塞進一個 agent，context 很快被搜尋結果塞滿（← [S11 Context engineering](/stages/s11-context-engineering/)），而且只能一個面向接一個做。Anthropic 在〈How we built our multi-agent research system〉（2025-06）公開了目前最完整的架構說明，用六塊地圖對照：

- **Loop 有兩層**：lead agent 規劃研究方向、決定派幾個 sub-agent、看回報後決定夠不夠；每個 sub-agent 各自跑自己的搜尋 loop。這是 [S15 Multi-agent](/stages/s15-multi-agent/) 的 orchestrator-worker。
- **Context 互相隔離**：每個 sub-agent 在自己的 context 裡讀幾十頁資料，只回傳精簡的結論給 lead agent（← S12 Agent loop 與 harness 的 sub-agent 隔離）。
- **專門的 citation agent**：lead agent 寫完報告後，另一個 agent 逐一把論點對應到來源。讓一個角色只做這件事，比要求寫報告的 agent 順便附出處可靠。
- **安全**：所有網頁都是不可信輸入（← S9 檢索與 RAG、S16 安全與治理）。

以筆記助理為例：使用者問「整理 2025 年以來 RAG chunking 的主要做法，和我筆記裡的實驗結果比較」。lead agent 拆成三個面向，分給三個 sub-agent：論文、工程部落格、使用者自己的筆記。三個 sub-agent 同時搜尋，各回傳一段約 300 字的摘要與來源清單；lead agent 彙整後寫報告，citation agent 再把每句話對回筆記或網址。

成本要算清楚。Anthropic 的數字是：agent 平均用掉約一般對話 4 倍的 token，multi-agent 系統約 15 倍；這是他們系統上的平均值，你的系統要自己量。

值不值得用 multi-agent，問四個問題：答案的價值是否高過多出來的成本？問題能不能拆成互不依賴、可以平行的面向？資料量是否超過一個 context 裝得下的範圍？答錯或漏掉的代價有多高？前兩題的答案是否定的，單一 agent 通常就夠了。

評估這類系統也難，因為研究報告常常沒有唯一的標準答案。BrowseComp（Wei et al. 2025）用「很難找、但一找到就容易驗證」的問題繞過這個困難：答案是一個短字串，對錯一比就知道，難的是找到它的過程。設計自己的 eval 時可以借用這個思路，例如筆記助理的題目「我第一次記下 GraphRAG 是哪一天？」，要翻很多筆記才找得到，但答案是一個日期，自動就能判斷對錯。

容易誤會的是「multi-agent 比單一 agent 貴 15 倍」：兩個倍數的基準都是一般對話，決定要不要拆成多 agent 時要和單一 agent 比，約 15 ÷ 4 ≈ 3.75 倍（← [S15 Multi-agent](/stages/s15-multi-agent/)）。

<details class="deep">
<summary>深入一點：orchestrator 的指示怎麼寫壞、又怎麼修</summary>

- 同一篇文章提到，早期版本的 lead agent 會為簡單問題產生多達 50 個 sub-agent；任務描述不夠具體時，sub-agent 會重複彼此的工作或留下缺口。解法是在 prompt 裡寫明「依問題複雜度決定投入多少」的規則，並要求每個 sub-agent 的任務描述包含目標、輸出格式、可用工具與範圍邊界（← S15 Multi-agent）。
- 研究可能跑很久，context 可能超過上限。lead agent 會先把研究計畫寫進 memory，context 被截斷時還找得回來，這是 S12 Agent loop 與 harness 講的 structured notes 的同一個想法。
- 同一篇文章報告的品質提升（多 agent 比單一 agent 在他們內部 eval 上高 90.2%），是在特別適合平行的研究任務、用他們自己的 eval 量到的（← S15 Multi-agent），不能直接套到別的任務。

</details>

### ★ 常駐 agent 多了什麼？

常駐 agent 不等使用者打開網頁才工作，而是一直在背景執行，透過使用者已經在用的管道互動。它沒有新的魔法，只是在 loop 前面加上新的「觸發來源」，結果把前面幾章的難題都放大了。

以開源的 OpenClaw 為例，這類系統通常有幾個元件：

- **Gateway**：一個長時間執行的行程（process），負責連接各種訊息管道與 agent，並管理 session 與路由。
- **Channels**：使用者接觸 agent 的地方，例如聊天 app、email、webhook、桌面通知。每一個管道都是一個新的輸入來源，也可能是新的不可信輸入（← [S16 安全與治理](/stages/s16-security/)）。
- **Cron**：在精確時間觸發的排程工作，例如每天早上八點的摘要。
- **Heartbeat**：定期喚醒 agent，讓它自己檢查有沒有需要處理的事；沒事就安靜結束。
- **Goal loop**：給 agent 一個目標，讓它跨多輪持續工作，直到評估器判定達成、預算用完，或需要人介入為止（← [S12 Agent loop 與 harness](/stages/s12-agent-harness/) 的停止條件）。

對照六塊地圖：cron 與 heartbeat 是 loop 的新觸發來源，channels 改變了安全這一塊，goal loop 是加上停止條件與預算的 loop。以筆記助理為例：每天早上整理前一天的新筆記並寄出摘要（cron）；每 30 分鐘檢查有沒有筆記提到即將到期的事項，有才提醒（heartbeat）；使用者在聊天 app 說「把這個月的讀書筆記整理成大綱」，agent 跨多輪工作直到完成（goal loop）。

成本要先算再決定間隔。每 30 分鐘一次 heartbeat，一天 48 次，30 天 1,440 次。假設每次帶 5,000 個輸入 token、價格是每百萬輸入 token 3 美元（示意價格，忽略輸出），一個月是 1,440 × 5,000 = 720 萬個 token，約 21.6 美元。如果每次帶的 context 隨時間長到 20,000 個 token，就變成 2,880 萬個 token、約 86.4 美元，是原本的 4 倍。省錢的常見做法是加一層便宜的過濾：先用規則或本地小模型查「有沒有含到期日的新筆記」，有才呼叫雲端模型。如果一天只有 6 次真的需要，一個月就從 1,440 次降到 180 次。

常駐把三個老問題放大：

- **長時間沒人看著**：行程重啟、provider 出錯都會發生，所以狀態要能恢復，這是 durable execution 與監控（← [S18 部署與架構](/stages/s18-deployment/)）。
- **主動發訊息**：每則通知都消耗使用者的注意力，要有通知預算、能延後或關閉某一類通知（← [S17 產品與 AI UX](/stages/s17-ai-ux/)）。
- **三項全中**：lethal trifecta 指 agent 同時能讀不可信內容、能存取私人資料、能對外傳送（← S16 安全與治理）。筆記助理接上聊天 app 之後，任何人傳來的訊息都是不可信輸入；它又讀得到私人筆記、發得出訊息，三項一次湊齊。

容易誤會的是「沒事就安靜結束，所以 heartbeat 很便宜」。每次 heartbeat 都是一次完整的 agent turn，就算最後什麼都沒做，模型呼叫的錢已經花了，間隔越短越貴。常見的超支原因還有：每次帶的 context 隨時間變長（← S11 Context engineering，上面的例子）、失敗重試層層疊加（← S6 LLM API 與應用基本功）、heartbeat 觸發了 goal loop 或一連串工具呼叫。

<details class="deep">
<summary>深入一點：heartbeat 與 cron 的分工還在變</summary>

- 各家產品對 heartbeat 與 cron 的分工不同，也還在調整。OpenClaw 的文件顯示它正把 heartbeat 遷移到一般的排程工作。設計自己的系統時，重點不是名稱，而是分清楚「固定時間做固定的事」與「定期看看有沒有事」兩種觸發，各自設預算。
- Goal loop 至少要有三種停止條件：評估器判定達成、預算（步數、token、金額）用完、連續失敗達門檻時升級給人（← S12 Agent loop 與 harness）。只有第一種，壞掉時就會一路燒錢。
- 背景執行時沒有人在畫面前核准動作，所以高風險動作要改成「先排進待核准清單，下次使用者上線時確認」，而不是自動放行（← S12 Agent loop 與 harness 的權限模式、S16 安全與治理）。

</details>

### ★ 怎麼證明它能上線？

Demo 只能證明某一次跑得起來；系統要證明它能上線、能被量測、每個決定都有理由。常駐 agent 長時間沒人盯著，能依靠的只有事先建立的證據。

畢業專題要交五份證據：regression suite（改動不會讓已經能做的事壞掉）、infra 變因報告（分數變化是真的，不是環境雜訊）、trifecta 稽核（新管道與排程沒有開出新的攻擊路徑）、harness ablation 筆記（每個 harness 元件都有存在的理由），以及架構文件（能上線、出事時知道怎麼辦）。前三份與第五份大多是前面各章做過的事加上常駐元件；真正新的是判讀分數的方式，需要兩個觀念。

<details class="hint">
<summary>怎麼開始寫：每份證據的最小格式</summary>

每份證據都先寫這五行，寫得出來就有初稿：

```text
問題：這份證據要回答什麼？
做法：跑了什麼、幾個案例 × 幾次、比較哪兩版或哪個因素
數字：核心數字，附 95% 信賴區間或分布
結論：保留 / 移除 / 可以上線，以及依據哪個數字
限制：哪些情況沒測到、下一步做什麼
```

| 證據 | 「數字」那一行至少要有 |
|---|---|
| Regression suite | 案例數、pass^3、和 A18 多使用者部署完成時的版本的配對差值區間與事先定的 δ |
| Infra 變因報告 | 同一 commit 5 次的分數分布寬度、改變一個因素後的差距 |
| Trifecta 稽核 | 三項全中的組合數與對策、新管道 injection 測試修補前後的成功次數 |
| Harness ablation 筆記 | 任務數 × 試跑次數、配對差值的 95% 信賴區間 |
| 架構文件 | 7 天的執行、失敗、恢復次數與每日成本、30 分鐘講解測試的結果 |

</details>

**第一，先量出雜訊有多大。** 同一個 commit（程式碼的一個存檔版本）重跑，分數也會變，原因可能只是環境：工具 timeout、並行數、容器資源。[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 提過，Anthropic 只改容器的資源設定，最寬鬆與最嚴格的設定之間成功率就差約 6 個百分點，並建議對低於 3 個百分點的差距保持懷疑。所以 infra 變因報告先在同一個 commit 上跑 5 次，看分數的分布有多寬；之後任何「變好了」的差距，都要比這個寬度大才算數。

**第二，同一批題目要做配對比較。** 比較兩個版本時，讓它們跑同一批案例，對每個案例算「新版減舊版」的差值，再算差值平均的 95% 信賴區間（← S8 Eval 方法論）。配對的好處是題目本身的難易度互相抵消，區間比兩版各算一個區間窄得多。只有兩版都能跑的案例才能配對：A18 多使用者部署完成時的版本沒有排程與通知，新增的常駐行為案例就無法配對，只能單獨報 pass^3。

要證明新版「沒有變差」，跑之前先寫下容許的差距 δ，例如 5 個百分點；配對差值的 95% 信賴區間下界不低於 −δ，才算過關。δ 一定要事先定，看完結果再定就失去意義。

例子：ablation 拿掉 compaction，20 個任務 × 5 次試跑。保留時 100 次成功 82 次，拿掉後 79 次，差 −3 個百分點。假設對 20 個任務的差值做 bootstrap，得到配對差值的 95% 信賴區間是 [−7, +1]。區間包含 0，所以不能說 compaction 一定有幫助；但下界 −7 低於 −δ = −5，也不能說拿掉它沒有影響。這時的合理決定是暫時保留，並增加任務數或試跑次數把區間縮窄，或者看成本：如果拿掉 compaction 每任務省下的錢很可觀，值得多花一輪 eval 把答案弄清楚。

容易誤會的是「兩版各自的信賴區間重疊，所以沒有差別」。區間重疊不代表差值的區間包含 0，更不代表差距小於 δ；同一批題目上的比較，要看配對差值的區間。

<section class="deep-section">

### ○ 還有哪些 agent 領域？

Science agents、theorem proving、embodied agents 把 agent 用在科學發現、形式化證明、實體機器人上，各自有專門的環境與評估方法，不在本路線範圍內。如果你有興趣，可以從前面的 eval、harness、安全概念出發，再去讀該領域的綜述。

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

1. Trajectory 裡有一步：「模型呼叫 `web_clip` 剪藏一個網頁，hook 把回傳的內容標成不可信。」這一步落在六塊地圖的哪兩塊？為什麼一步會落在兩塊？

   <details class="hint">
   <summary>對照答案</summary>

   工具（模型執行一個動作）與安全（harness 決定這份內容能不能信）。六塊是要問的問題，不是程式裡的六個模組，同一步可以同時回答兩個問題。

   </details>

2. Heartbeat 每 60 分鐘一次，每次帶 4,000 個輸入 token，價格每百萬輸入 token 3 美元（示意價格，忽略輸出）。一個月（30 天）多少錢？

   <details class="hint">
   <summary>對照答案</summary>

   24 × 30 = 720 次；720 × 4,000 = 288 萬個 token；2.88 × 3 ≈ 8.64 美元。就算每次都「沒事」，錢也照付。

   </details>

### 必做：拆解一個開源 coding agent

**目標**：實際執行一個開源 coding agent，把它的每個元件對應到你學過的概念，並量出它的穩定度與成本。

**步驟**
1. 選一個開源 coding agent。建議用 mini-SWE-agent（程式短，讀得完）；有餘力可以選 SWE-agent 或 OpenHands。
2. 準備 5 個任務，每個任務都要有能自動判斷成敗的測試。可重現的做法（和 SWE-bench 建題的方式相同）：
   - 選一個有測試、你看得懂的小型開源 repo（例如 2,000 行以內的 Python 或 TypeScript 函式庫）。
   - 從它的 git history 找 5 個「修 bug 或加小功能，同時新增測試」的 commit。
   - 每個任務：checkout 到該 commit 的上一版，只把新增的測試檔加回來（此時測試應該失敗），把 commit message 或對應 issue 改寫成任務描述。agent 讓這些測試通過、且原有測試沒有壞掉，就算成功。
   - 如果 history 裡找不到 5 個，用同樣格式自己補：先寫測試、再拿掉實作。
3. 每個任務跑 3 次，記錄是否成功、步數、token 數、成本、時間。
4. 讀它的程式碼與一條完整的 trajectory，填一張拆解表：元件（loop、工具與 ACI、prompt、context 管理、停止條件、權限 / sandbox、錯誤處理、eval 方式等）、在程式碼的哪個位置、對應哪一章。
5. 寫出它做的 3 個設計取捨，例如「它不給模型任何專用工具，只給 bash」，以及你認為各自的代價。其中至少一個和 Agentless 的固定三階段 workflow 對照：在你的 5 個任務上，哪一種做法比較合適？

**驗收**
- 一張 5 任務 × 3 次的結果表，含成功率、pass^3（3 次都成功的任務比例，← S8 Eval 方法論）、每任務的平均成本與時間。
- 拆解表 ≥ 10 列，每列都有程式碼位置（檔案與行號，或函式名稱）與對應的章。
- 3 個設計取捨，每個附一個你在 trajectory 中看到的具體例子；至少一個附上和 Agentless 的對照。

**提示**
- TypeScript：mini-SWE-agent 是 Python 專案，但你的任務 repo 可以是 TypeScript（例如一個有 Vitest 測試的小專案）；拆解表可以拿你自己寫的 harness（← S12 Agent loop 與 harness）對照。
- Python：直接 `pip install` mini-SWE-agent，任務 repo 用 pytest。
- 成本：15 次執行，用中等模型約數美元；也可以接本地模型，但成功率會明顯下降，記得在報告中註明。agent 的 prompt 加上指令輸出很容易超過 Ollama 的預設 context，用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。
- 卡住時：
  - 重讀：[怎麼拆解任何 agent？](#-怎麼拆解任何-agent)、[Coding agent 怎麼設計？](#-coding-agent-怎麼設計)
  - 延伸：SWE-agent 論文的 ACI 設計段、Claude Code 官方 best practices

<section class="deep-section">

### 進階：系統專案 A19（畢業專題）：把你的系統做成常駐 agent

**目標**：把你的系統延伸成常駐 agent，並交出五份可供審查的工程證據。

**這個專題是什麼**：把你從 S6 LLM API 與應用基本功一路做到 S18 部署與架構的系統，延伸成一個不用人打開也會工作的常駐 agent。它會按排程執行任務、主動發現需要處理的事、透過至少一個管道通知使用者，並在有限的權限與預算內追求目標。如果你的主題真的不適合常駐（例如本質上是一次性的分析工具），可以改做另一種「真實系統延伸」：讓它成為一個能維護自身 repo 的 coding agent、加上 deep research 模式，或接入一個真實的外部工作流程。五份交付物的要求不變。

**為什麼是這五份交付物**：常駐 agent 的特點是長時間沒有人盯著它。這時你唯一能依靠的，是事先建立的證據。

| 交付物 | 證明什麼 | 用到哪些章 |
|---|---|---|
| Regression suite | 改動不會讓已經能做的事壞掉（evaluable） | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Infra 變因報告 | 分數的變化是真的，不是環境雜訊（evaluable） | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Trifecta 稽核 | 新增的管道與排程沒有開出新的攻擊路徑（defensible） | [S16 安全與治理](/stages/s16-security/) |
| Harness ablation 筆記 | 每個 harness 元件都有存在的理由（defensible） | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| 架構文件 | 它能上線、能擴充、出事時知道怎麼辦（shippable） | [S17 產品與 AI UX](/stages/s17-ai-ux/)、[S18 部署與架構](/stages/s18-deployment/) |

**步驟**
1. **常駐元件**：至少一個 cron 排程任務、一個 heartbeat 或事件觸發的主動檢查、一個通知管道（email、聊天 app、webhook 或桌面通知擇一）、一個有停止條件與預算上限的 goal loop。狀態要能在行程重啟後恢復（← S12 Agent loop 與 harness、S18 部署與架構）。
2. **主動行為設計**（← S17 產品與 AI UX）：定義通知預算、什麼情況值得打擾使用者，以及使用者怎麼延後或關閉某一類通知。
3. **Regression suite**：至少 50 個案例，涵蓋原本的功能與新增的常駐行為（例如「沒有新事件時不應該發通知」），每個案例跑 3 次，接進 S18 部署與架構的 CI/CD pipeline。
4. **Infra 變因報告**：在同一個 commit 上把整套 suite 跑 5 次，報出每次的分數與變異；再改變一個基礎設施因素（例如工具 timeout、並行數、模型的 region 或版本），看分數變化是否超出這個變異範圍。
5. **Trifecta 稽核**：重做 S16 安全與治理的稽核，把新的管道、排程觸發、背景執行都納入，並修補新出現的三項全中組合。
6. **Harness ablation**：拿掉或替換一個 harness 元件（例如 compaction、某個 hook、planning 步驟、某個 skill），在 ≥ 20 個任務 × 5 次試跑上比較，附配對差值的 95% 信賴區間。
7. **連續運作**：讓它實際運作至少 7 天，記錄執行次數、失敗次數、恢復次數、發出的通知數、使用者對通知採取行動的比例，以及總成本。
8. **架構文件**：整合 A18 多使用者部署寫的架構文件，加上常駐元件、7 天的運作數字、已知限制、下一步。

**驗收**
- Regression suite ≥ 50 個案例，在 CI/CD pipeline 中執行，報出 pass^3 與 95% 信賴區間。配對比較只用兩版都能跑的案例：在原本功能的那部分案例上，最後一版不低於 A18 多使用者部署完成時的版本（跑之前先寫下容許的差距 δ，例如 5 個百分點；配對差值的 95% 信賴區間下界不低於 −δ）；那一版沒有排程與通知，新增的常駐行為案例無法配對，單獨報 pass^3。
- Infra 變因報告：同一 commit 5 次的分數分布，以及至少一個基礎設施因素的影響；結論說明多大的分數差異才算「真的變好或變差」。
- Trifecta 稽核涵蓋所有新管道與排程；每個三項全中的組合都有對策；至少 1 個針對新管道的 injection 測試，修補後 5 次試跑中成功 0 次。
- Ablation 筆記：至少 1 個元件，20 任務 × 5 次，結論附配對差值的 95% 信賴區間，並說明「保留 / 移除」的決定。
- 7 天運作紀錄：無人介入下的自動恢復次數、通知數與採取行動比例、每日成本；中途若有需要人工修復的事故，附一份簡短的 postmortem。
- 架構文件能讓一位沒看過程式碼的工程師，在 30 分鐘內說出系統的主要元件、資料流、信任邊界與回滾方式（找一個人實際試）。

以筆記助理為例：每天早上整理前一天的新筆記並寄出摘要（cron）；每 30 分鐘檢查一次有沒有筆記提到即將到期的事項，有才提醒（heartbeat）；使用者在聊天 app 說「幫我把這個月的讀書筆記整理成一份大綱」，agent 會跨多輪工作直到完成（goal loop）。新的管道代表任何人傳到這個聊天 app 的訊息都是不可信輸入，trifecta 稽核要重新評估。

**提示**
- TypeScript：排程可用 node-cron 或系統的 launchd / systemd timer；通知管道最簡單的是 Telegram Bot API、Slack incoming webhook 或 email；durable 狀態可以沿用 S18 部署與架構的資料庫或 checkpoint。
- Python：APScheduler 或系統排程；Temporal 的 Python SDK 適合長時間任務；通知同上。
- 成本（eval）：regression suite 跑一輪是 50 × 3 = 150 次 agent 執行；infra 變因報告在同一 commit 上共跑 5 輪，上面那一輪之外另跑 4 輪（4 × 150 = 600 次），再加改變因素後重跑 1–5 輪（150–750 次），共 750–1,350 次；ablation 2 × 20 × 5 = 200 次。合計約 150 + 750–1,350 + 200 = 1,100–1,700 次 agent 執行，還不含 CI 上每個 PR 的 suite。先用 S8 Eval 方法論的成本會計估出每次執行的平均成本再乘上去；流程先用小模型或本地模型跑一遍，最後才用正式模型跑；用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。
- 成本（常駐）：heartbeat 每次都是一次完整的模型呼叫。先算好「每天幾次 × 每次成本」，再決定間隔；可以讓第一層檢查用規則或本地小模型，需要時才呼叫雲端模型。
- 卡住時：
  - 重讀：[常駐 agent 多了什麼？](#-常駐-agent-多了什麼)、[怎麼證明它能上線？](#-怎麼證明它能上線)；你自己在 S16 安全與治理、S18 部署與架構寫的文件
  - 延伸：learn-claude-code 的 s11（背景任務）、s12（排程）、s17（goal loop）課；Anthropic〈Infrastructure noise in agentic coding evals〉

**提醒**：7 天的連續運作期間，每天只需要花少量時間檢查。

</section>

## 自我檢查

1. 用自己的話解釋：Agentless 用固定 workflow 就能有競爭力的成績，這是否代表 agent 沒有必要？什麼樣的任務會讓固定 workflow 不夠用？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：不代表；benchmark 的任務形狀固定，固定流程才涵蓋得了。下一步要看前一步結果才知道時（要先重現 bug、讀 log、issue 不清楚），workflow 就不夠。**常見錯法**：以為 benchmark 分數高就代表真實任務也適合固定流程。**回讀**：[Coding agent 怎麼設計？](#-coding-agent-怎麼設計)

   </details>

2. Deep research 系統用的 token 約是一般對話的 15 倍、單一 agent 的約 3.75 倍（← S15 Multi-agent）。給你一個新的研究型需求，你會用哪些問題判斷值不值得用 multi-agent 架構？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：答案價值是否高過成本、能否拆成互不依賴的平行面向、資料量是否超過一個 context、答錯或漏掉的代價；前兩題否定時單一 agent 通常就夠。**常見錯法**：覺得多 agent 一定比較強，不算成本。**回讀**：[研究型 agent 怎麼分工？](#-研究型-agent-怎麼分工)

   </details>

3. 情境題：你的常駐 agent 每 30 分鐘執行一次 heartbeat，一個月的帳單是預期的 4 倍。列出三個可能原因，以及各自的調查方法。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：每次帶的 context 隨時間變長、失敗重試層層疊加、heartbeat 觸發了 goal loop 或一連串工具呼叫；從 trace 比較每次的 token 數、重試次數與工具呼叫數。**常見錯法**：只怪模型單價變貴，沒看每次執行的 token 數。**回讀**：[常駐 agent 多了什麼？](#-常駐-agent-多了什麼)

   </details>

4. 你的 ablation 顯示拿掉 planning 步驟後，20 個任務 × 5 次的成功率從 88% 降到 84%（差 −4 個百分點），兩版各自的 95% 信賴區間互相重疊。你會保留還是移除這個元件？還需要什麼資訊？（提示：區間重疊能說明差值嗎？見「怎麼證明它能上線？」一節的配對比較）

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：兩版各自的區間重疊說明不了差值，要看配對差值的區間有沒有包含 0、下界有沒有低於 −δ。**常見錯法**：看到重疊就說「沒差，移除」。**回讀**：[怎麼證明它能上線？](#-怎麼證明它能上線)

   </details>

5. 情境題：有人說「我的 agent demo 跑得很好，可以上線了」。根據畢業專題的五份交付物，你會問他哪五個問題？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：五個問題各對應一份證據：改動會不會弄壞舊功能、分數變化是不是雜訊、有沒有三項全中、每個 harness 元件有沒有理由、出事時怎麼回滾。**常見錯法**：只交一次成功的 demo 當證據。**回讀**：[怎麼證明它能上線？](#-怎麼證明它能上線)

   </details>

6. 挑筆記助理（或你自己的系統）的一個功能，例如「每天早上寄摘要」，照六塊地圖說出它的 loop、工具、context、memory、eval、安全各是什麼，各對應哪一章。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：六塊都要填，「沒有」也算一種選擇；例如每天寄摘要的 loop 由 cron 觸發，安全要看寄信是否要人核准。**常見錯法**：把沒有的塊空著不寫。**回讀**：[怎麼拆解任何 agent？](#-怎麼拆解任何-agent)

   </details>

7. 不看講義，畫出一個研究問題在 deep research 系統裡從 lead agent 到 citation agent 的流程，標出哪些步驟平行執行、哪些 context 互相隔離。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：lead agent 拆題 → 多個 sub-agent 平行搜尋、各自的 context 隔離、只回傳摘要 → lead agent 彙整 → citation agent 對回來源。**常見錯法**：讓 sub-agent 把完整搜尋結果全塞回 lead agent。**回讀**：[研究型 agent 怎麼分工？](#-研究型-agent-怎麼分工)

   </details>


<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看原始設計、或想跟著別人實作的人，都不是必讀。

### 官方文件與工程文章

- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)（官方文件）— 一個成熟 coding agent 的實際使用方式，可以從中反推它的 harness 設計；做必做題時拿來對照拆解表。
- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)（2025-06-13）— deep research 的完整架構、prompt 設計原則與踩過的坑，比講義的摘要多很多細節。
- [Anthropic: Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise)（2026-02-05）— 畢業專題 infra 變因報告的方法來源，有完整的實驗設定（← S14 Agent eval、資料與最佳化）。
- [OpenClaw 文件](https://docs.openclaw.ai/) — 常駐個人 agent 的 gateway、channels、自動化設計；講義只用到元件名稱，實作細節在這裡。

### 原始論文

- [Yang et al. 2024, SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793) — ACI 的設計原則與 ablation，看每個介面設計各貢獻多少。
- [Xia et al. 2024, Agentless](https://arxiv.org/abs/2407.01489) — 三階段 workflow 的完整細節與成本數字；和 SWE-agent 對照讀。
- [Wang et al. 2024, OpenHands](https://arxiv.org/abs/2407.16741) — 開放平台的架構：事件串流、sandbox、用寫程式行動。
- [Wei et al. 2025, BrowseComp](https://arxiv.org/abs/2504.12516) — deep research 的評估：題目怎麼出、怎麼確保「難找但好驗證」。

### 工具

- [github/spec-kit](https://github.com/github/spec-kit) — spec-driven development 的工具與流程，從 spec 到任務清單的實際範本。

### 課程

- [Stanford CS146S The Modern Software Developer](https://themodernsoftware.dev/) — 和 coding agent 協作的完整課程。
- [Stanford CS 329Z](https://cs329z.stanford.edu/) Coding & Software Agents 與 Proactive Agents 講次（投影片公開後再讀）。

### 中文資源

- [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) — 英文，附簡中翻譯；s11（背景任務）、s12（cron）、s17（goal loop）正好對應常駐 agent 的元件，有逐步的程式碼。
- [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) — 簡中；ch13–15 的綜合案例章節與 ch16 的畢業設計。

### 走完之後

- Science agents、theorem proving、embodied agents：各領域的專門 benchmark 與環境。
- Agentic RL（← S14 Agent eval、資料與最佳化的選修）：用你在畢業專題累積的 trace 與 regression suite 當訓練環境，回到[模型專案](/projects/model-thread/)把小模型訓練成你系統的專用 agent。
- 回到 [S0 AI 系統概觀](/stages/s00-big-picture/)，挑一層你覺得最薄弱的往深處走。

</section>
