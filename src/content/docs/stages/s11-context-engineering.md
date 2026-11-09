---
title: S11 Context engineering
head:
  - tag: title
    content: Context engineering 教學：預算與快取（S11）｜Token2Agent
description: Context engineering 教學：決定一次呼叫該放什麼進 context，怎麼排序、截斷與摘要、訂出 token 預算，認出 context 失效的類型，並用 prompt caching 省下成本與延遲。
sidebar:
  order: 11
  label: S11 Context engineering
---

:::note[這一章]
**前置**：[S9 檢索與 RAG](/stages/s09-rag/)、[S10 工具與 MCP](/stages/s10-tools-mcp/)；prompt caching 的原理見模型速成的〈[KV cache](/guide/app-first/#kv-cache以及為什麼輸出-token-比較貴)〉（深入：[S5 推論與 serving](/stages/s05-inference/)）

**銜接**：→ [S12 Agent loop 與 harness](/stages/s12-agent-harness/)（長時間運作的 context 管理）、[S13 Memory 與個人化](/stages/s13-memory/)
:::

:::tip[理解路線重點]
- 每次呼叫都要決定放什麼進去：各部分編預算，超出就截短或摘要。
- 放越多不一定越好：太長會漏看、被干擾，而且不會報錯。
- 不變的內容放前面、會變的放後面，重複的開頭就能用快取省錢。
:::

## 在做什麼

到這裡，系統提示詞、工具定義、檢索結果、工具輸出、對話歷史全都想往 context 裡塞。Context engineering 決定「這一次呼叫，放什麼進去、各放多少、用什麼順序」。這一章學怎麼分配 token 預算、為什麼放越多反而越差、超出預算時怎麼截斷與摘要，以及怎麼排序才能吃到 prompt caching 的折扣。

這一章只處理「單次呼叫」的 context 組裝。Agent 跑很多輪、context 越積越長時的做法（compaction、reset、sub-agent 隔離）在 S12 Agent loop 與 harness。

## 學完能

- 能列出一次呼叫的 context 有哪幾部分、依什麼順序排，並說出超出預算時先砍哪一塊、為什麼。（講義與自我檢查）
- 能從 trace 認出 context 失效的類型，並提出對應的修法。（講義與自我檢查；必做會親眼看到長度與位置的影響）
- 把 context 排成對 prompt caching 友善的順序，並量到快取命中率。（必做）
- 畫出「context token 數 vs 品質」的曲線。（必做；用它決定預算在進階）
- 量出各部分的 token 數並訂出預算。（進階）

## 講義

先看全貌。每次呼叫模型之前，程式裡都有一段 **context builder**：收集這次可用的材料，量出每一部分的 token 數，超過預算的部分截斷或摘要，依固定順序排好，再送出。這一章各節依序回答它的幾個決定：

1. 有哪些部分、各給多少預算。
2. 為什麼不能全部塞進去（長 context 的退化）。
3. 系統提示詞寫多細，資料要預先放還是讓模型自己取。
4. 超出預算時怎麼砍。
5. 怎麼排序，讓 prompt caching 生效。

整章用同一個例子：筆記助理收到一個請求。

### ★ Context 怎麼分配預算？

Context 不是「把能拿到的都放進去」，而是幾個部分分別編預算。每一部分都花錢、花延遲（← [S6 LLM API 與應用基本功](/stages/s06-llm-api/)），也分走模型的注意力。

一次呼叫的 context 通常包含：**工具定義**（每個工具的名稱、說明、參數 schema，← S10 工具與 MCP）、**系統提示詞**、**檢索結果**（← S9 檢索與 RAG）、**工具結果**（模型前一步呼叫工具拿回來的內容）、**對話歷史**、**記憶**（跨對話記住的使用者偏好，→ S13 Memory 與個人化），以及使用者這一次的輸入。上下文視窗的上限把輸出也算在內，所以還要替回答預留空間。

Anthropic 把這叫「attention budget」（注意力預算）：模型讀 context 時能分配的「注意力」有限，每多一個 token，都會稍微稀釋其他 token 的影響力。所以目標是**用最少的高訊號 token，讓想要的結果最可能發生**。

**例子。** 小林對筆記助理說：「上次和設計團隊開會，最後定的預算是多少？幫我建一則待辦，提醒我下週跟進。」這一輪的流程：

1. Context builder 先用問題檢索筆記（← S9 檢索與 RAG），拿到最相關的 8 段，每段約 700 token。
2. 第一次呼叫：模型讀完，覺得還需要報價單，於是呼叫 `notes_search("報價單")`。工具回傳 20 筆，每筆約 400 token。
3. 第二次呼叫：把工具結果放回 context，模型回答並呼叫 `notes_create` 建待辦。

下表是第二次呼叫的 context。總預算訂在 16K 輸入 token（各部分預算加起來 16,000，使用者這次的輸入不設上限），遠低於模型的上下文視窗，原因下一節會講。

| 部分 | 內容 | 預算 | 原始大小 | 實際放入 |
|---|---|---|---|---|
| 工具定義 | `notes_search`、`notes_create`、`web_clip`、`email_draft` | 2,000 | 1,600 | 1,600 |
| 系統提示詞 | 角色、回答規則、引用格式 | 1,500 | 1,400 | 1,400 |
| 使用者資料 | 名字、時區、今天日期 | 500 | 300 | 300 |
| 對話歷史 | 之前的 15 輪 | 4,000 | 9,000 | 2,900 |
| 檢索到的筆記 | 8 段 × 700 | 6,000 | 5,600 | 5,600 |
| 工具結果 | `notes_search` 的 20 筆 × 400 | 2,000 | 8,000 | 1,750 |
| 這次的輸入 | 使用者的問題 | — | 100 | 100 |
| 合計 | | | 26,000 | 13,650 |

兩個部分超出預算，各自砍到預算以內（怎麼砍見[超出預算時怎麼砍？](#-超出預算時怎麼砍)）：

- **歷史**：最近 4 輪原文保留（4 × 600 = 2,400），較早的 11 輪換成一段 500 token 的摘要，合計 2,900。
- **工具結果**：前 3 筆保留全文（3 × 400 = 1,200），其餘 17 筆只留標題（17 × 30 = 510），再加一行約 40 token 的截斷說明，合計 1,750。

結果：每次呼叫的輸入從 26,000 降到 13,650 token，少了約一半，而回答需要的資訊都還在。另外用 `max_tokens` 替回答預留約 1,000 token。

**容易誤會：只看總數就好。** 預算要分部分訂，否則最會膨脹的部分（通常是工具結果和歷史）會擠掉真正有用的檢索結果。實際做法是先量：在 trace 裡記錄每一部分的 token 數。很多系統第一次量就會發現，工具定義或過長的歷史佔了一半以上，真正有用的檢索結果只佔一小塊。

<details class="deep">
<summary>準備動手做：怎麼量每一部分的 token 數</summary>

- **以 usage 欄位為準**：API 回應裡的輸入 token 數是計費的真實數字，但它只給總數，不分部分。
- **分部分要自己算**：用 provider 的 token counting API 分別量各部分來校準，即時計算時再用近似值（例如依你的資料量出「每個字約幾個 token」）。中文的比例因 tokenizer 而異，不要沿用別人的數字。
- **Trace 欄位**：每次呼叫記錄各部分的 token 數、被截斷的筆數、丟掉的 token 數，以及快取讀寫的 token 數（見排序一節）。進階題 A11 context builder（[代號說明](/guide/how-to-use/#代號怎麼讀)）要求 100% 的呼叫都有這些欄位。
- **把 builder 寫成純函式**：輸入材料、輸出 messages，沒有副作用，才能用 snapshot 測試（← S6 LLM API 與應用基本功）確認排序和截斷沒有意外改變。

</details>

### ★ 為什麼放越多反而越差？

上下文視窗裝得下，不代表模型用得好。輸入越長，模型越容易漏看、被干擾、被錯誤資訊帶著走，而且通常不會報錯。

**長度本身就會傷害表現。** Chroma 測了 18 個模型，發現輸入越長，表現越不穩定，連簡單的檢索、複製任務也一樣；這種現象被稱為 **context rot**。他們還發現：和答案相關但錯誤的干擾段落會讓準確率更差；問題和答案段落的用詞越不相近，掉得越快。[S9 檢索與 RAG](/stages/s09-rag/) 讀過的兩個結果也指向同一件事：模型實際能用的長度往往比宣稱的短（RULER）；同一段資訊放在長 context 的中間，比放在開頭或結尾更容易被忽略（Lost in the Middle，Liu et al. 2023）。

**四種常見的失效模式。** 除了單純的長度問題，Drew Breunig 把 context 出錯的方式整理成四類。用筆記助理舉例：

| 類型 | 是什麼 | 筆記助理的例子 | 常見修法 |
|---|---|---|---|
| Distraction | 歷史太長，模型照著歷史裡的做法重複，不再自己判斷下一步該做什麼 | 歷史裡有 10 次 `notes_search`，模型繼續用幾乎相同的查詢再搜一次 | 摘要較早的歷史 |
| Poisoning | 錯的內容（模型編出來的答案、回錯的工具結果）留在歷史裡，之後一直被當成事實引用 | 第 3 輪模型誤答「預算 50 萬」，之後每次回答都沿用這個數字 | 清掉或更正錯的內容，不要讓它留在歷史裡 |
| Confusion | 放了和這次任務無關的東西，干擾模型的判斷 | 接了 40 個用不到的工具，模型選錯工具 | 只放這次可能用到的工具（tool search，← S10 工具與 MCP） |
| Clash | 歷史裡有前後不一致的說法，模型不知道該信哪一個 | 早期說「時區是台北」，後來說「我搬到東京了」，兩句都在歷史裡 | 以最新的資訊覆寫，而不是兩者並存 |

所以預算的作用不只是省錢：表中 13,650 token 的版本，很可能比 26,000 token 的版本答得更準，因為那 17 筆報價單全文和 11 輪舊對話，大多是干擾。

**容易誤會：「模型支援 200K，放 100K 沒問題」。** 上下文視窗是上限，不是建議用量。有效長度要在自己的資料上量（這就是必做題要做的事），而且在不同位置量，因為中間的資訊最容易被忽略。

<details class="deep">
<summary>深入一點：Chroma 的實驗設計與來源的限制</summary>

- Chroma 的實驗把輸入長度當成唯一變數，固定任務難度，再觀察表現怎麼隨長度改變。其中幾個操弄：加入和答案相似但錯誤的干擾段落；改變問題和答案段落的語意相似度。必做題的設計（needle、同領域干擾段落、問題用詞不同於短文）就是照這個思路縮小版。
- Chroma 是向量資料庫廠商，「長 context 不可靠」的結論對它的產品有利；它公開了實驗方法，必做題就是照這個方法自己重做一個縮小版。
- 「Context rot」這個名稱來自 Chroma；distraction、poisoning、confusion、clash 四類來自 Breunig 的整理。不同文章的分類會重疊，重點是在 trace 裡能認出它們。

</details>

### ★ 系統提示詞要寫多細？

系統提示詞要寫在對的「高度」（Anthropic 稱為 right altitude）：不要把每種情況寫成規則，也不要只給一句空泛的期望。它建議從最精簡的版本開始，看到失敗再補。

**太低**是把一堆 if-else（「如果…就…否則…」的分支規則）寫死在 prompt 裡，脆弱又難維護。例如：「如果使用者問預算，先搜尋含『預算』的筆記；如果沒找到，改搜『報價』；如果還是沒有……」。**太高**是「你是一個有幫助的筆記助理」這種指示，模型無從遵循。對的高度是講清楚原則和必要的格式：「回答前先看檢索到的筆記；答案附筆記標題與日期；找不到就說找不到，不要猜；建立或修改筆記前先確認內容。」

這正好接上 [S8 Eval 方法論](/stages/s08-evals/) 的錯誤分析：每一條新增的指示，都應該對應一個觀察到的失敗類別。

**容易誤會：規則越多越安全。** 規則一多，彼此容易衝突（上一節的 clash），也稀釋每一條的影響力。60 條規則的系統提示詞，通常可以整理成十幾條原則，再加幾個示範。

**自訂 context 格式。** 12-factor-agents（HumanLayer 整理的一份 agent 工程原則，共 12 條加附錄）第 3 條「Own your context window」更進一步：不一定要用標準的 messages 列表，可以把事件、工具結果、狀態序列化（把資料轉成一段可以存放或傳送的文字）成自己設計的精簡格式，放進一則訊息裡。好處是省 token、完全掌控模型看到什麼；代價是失去 provider 對標準格式的支援（例如原生的工具呼叫解析），而且要自己用 eval 證明它比較好。

<details class="deep">
<summary>準備動手做：自訂格式長什麼樣子</summary>

把筆記助理這一輪的經過寫成一則訊息，例如：

```xml
<history_summary>使用者在整理設計團隊的專案；偏好條列式回答。</history_summary>
<event type="search" query="報價單" results="20" shown="3" />
<note title="2026-10-14 設計團隊會議" date="2026-10-14">……</note>
<question>最後定的預算是多少？</question>
```

比起標準格式的多則訊息，這種寫法省掉每則訊息的角色標記與 JSON 外殼，也能把「搜尋了什麼、回傳幾筆、顯示幾筆」壓成一行。值不值得，用 eval（← S8 Eval 方法論）比較兩種格式的品質與 token 數再決定。

</details>

### ★ 資料先放還是需要再取？

資料可以在呼叫前就放進去，也可以只給模型線索和工具，讓它需要時再取。兩種各有代價，實務上常混用。

**預先載入**（pre-load）是在呼叫前就把可能需要的資料放進 context，S9 檢索與 RAG 的做法就是這樣。**Just-in-time** 是只給模型輕量的參照（檔名、查詢、連結）和工具，讓它需要時再去取，Claude Code 用 `grep`（在檔案內容裡找關鍵字）、`glob`（依檔名樣式找檔案）探索程式碼就是這個做法。前者快、可預測；後者省 context、能處理事先猜不到的需求，但較慢，也需要好的工具與指引。

用筆記助理算一下。每次都預先載入 8 段筆記，就是每次呼叫多 5,600 token，即使使用者只說「幫我建一則待辦」，根本用不到筆記。全部改成 just-in-time，問預算時就要多一輪：模型先呼叫 `notes_search`，等結果回來再呼叫一次，多了一次來回的延遲，而且第二次呼叫要把整個 context 再送一次。所以常見的折衷是：問題明顯需要筆記時預先檢索，其他情況只給工具。12-factor-agents 附錄第 13 條也提醒：如果**確定**模型一定會需要某份資料，就直接預先取好，不要多花一輪讓模型自己去拿。

**Progressive disclosure**（漸進揭露）是 just-in-time 的一種設計：先給摘要或索引，模型需要時再展開細節。例如筆記助理先給 200 則筆記的標題清單（每則約 30 token，共 6,000），模型挑中再讀全文；全部放全文則是 200 × 1,500 = 300,000 token。工具清單也一樣：先只給一行描述，選中了再載入完整 schema（tool search，← S10 工具與 MCP）。[S12 Agent loop 與 harness](/stages/s12-agent-harness/) 的 skills 就是建立在這個概念上。

**容易誤會：just-in-time 一定比較省。** 每多一輪工具呼叫，前面的 context 都要重送一次。資料幾乎每次都會用到時，預先載入反而比較省 token 也比較快。

### ★ 超出預算時怎麼砍？

工具結果和對話歷史是 context 膨脹最快的兩個來源。給每種工具結果設上限，較舊的內容換成摘要，而且一定要讓模型知道有東西被砍掉。

**工具結果。** 一次搜尋回傳 50 筆完整內容、一次讀檔回傳整個檔案，很快就佔滿 context。常見做法：

- 預設分頁與截斷：搜尋預設只回傳前幾筆，要更多再翻頁。
- 只回傳需要的欄位：筆記的標題、日期、摘要，而不是整份 metadata。
- 長內容只放摘要與參照：模型需要時再用工具讀全文。
- 舊的工具結果在後續呼叫中清掉，或換成一行「呼叫過什麼、拿到幾筆」。這是最輕量的壓縮。

**對話歷史。** 最近幾輪保留原文，較早的換成摘要。在上表的例子裡，9,000 token 的歷史變成「最近 4 輪原文 + 11 輪的摘要」，共 2,900 token。摘要要留下之後還用得到的事實（使用者的決定、偏好、待辦），丟掉寒暄和已經完成的步驟。

**例子：截斷說明。** 上表的工具結果只放前 3 筆全文。如果只放這 3 筆，模型會以為報價單就這 3 份。所以要附一行：「共 20 筆，以下顯示前 3 筆全文與其餘 17 筆的標題；要看某一筆的全文，用 `notes_search` 並指定標題。」

**容易誤會：截斷了也沒關係，模型自己會知道。** 模型只看得到 context 裡的東西。沒有明確說「已截斷、共幾筆、怎麼取得更多」，它就會以為看到的就是全部，並據此給出自信但不完整的答案。

<details class="deep">
<summary>準備動手做：截斷規則怎麼訂</summary>

- **丟棄順序要寫死**：例如先砍工具結果、再壓歷史、最後才動檢索結果；系統提示詞和使用者這次的輸入永遠不砍。順序固定，行為才可預測、可測試。
- **摘要不要每次重寫**：摘要放在歷史的最前面，如果每一輪都重寫，它後面的內容全部無法吃到快取（見下一節）。常見做法是累積到一定輪數（例如每 10 輪）才把最舊的一批併進摘要。
- **摘要由誰寫**：可以用便宜的小模型，但要用 S8 Eval 方法論的做法抽查它有沒有漏掉決定或數字；摘要漏掉的事實，對模型來說就不存在了。
- **截斷說明也算 token**：預算裡要留這一行的空間。

</details>

### ★ 怎麼排序才能吃到快取？

不變的內容放前面、會變的放後面，重複的開頭就能用快取，便宜很多也快一些。Claude 的快取要自己標記才會開啟。

**為什麼有折扣。** 模型處理輸入時，會把每個 token 的中間結果存成 KV cache（← 模型速成的〈[KV cache](/guide/app-first/#kv-cache以及為什麼輸出-token-比較貴)〉；深入：[S5 推論與 serving](/stages/s05-inference/)）。Prompt caching 是在伺服器端重用相同前綴的 KV cache：只要這次請求的開頭和最近某次請求**完全相同**，那一段就不用重新計算。

**價格。** 查證時（2026-11），快取讀取常見是一般輸入價格的一成（0.1 倍），部分模型更低。寫入快取可能要加價，例如 Anthropic 5 分鐘快取的寫入是 1.25 倍、1 小時快取是 2 倍。快取有存活時間，前綴也有最小長度，各家、各模型都不同，以官方文件為準（細節見下方展開）。

**算一個例子。** 假設筆記助理加了更多工具、系統提示詞附上筆記範本，固定前綴（工具定義 + 系統提示詞 + 共用文件）變成 20,000 token，在快取有效期間被用了 50 次：

- 不用快取：50 × 20,000 = 1,000,000 個輸入 token。
- 用快取：1 次寫入（20,000 × 1.25 = 25,000）加 49 次讀取（49 × 20,000 × 0.1 = 98,000），約 123,000 個 token 的價格。

前綴部分省了約 88%，延遲也會下降。

**怎麼排。** 快取只認「從頭開始完全相同」的部分，第一個不同的 token 之後全部要重算。所以筆記助理的 context 依變動頻率排列：

1. 工具定義（依固定順序）
2. 系統提示詞
3. 使用者資料（名字、時區、日期：每個使用者、每天不同）
4. 對話歷史（只在後面追加）
5. 這次的輸入，附上檢索到的筆記
6. 工具呼叫與工具結果（標準 messages 格式會接在模型的工具呼叫後面）

第 1、2 段所有使用者共用，第 4 段在同一段對話裡逐輪變長、前面不變。使用者資料放在系統提示詞**後面**的獨立區塊，而不是開頭，才不會每個使用者、每天都讓快取失效。

**Claude 要自己開啟快取。** Claude 的 prompt caching 是 opt-in：要在想快取的前綴最後一個區塊標上 `cache_control`，沒標就不會有任何快取讀取。上面的排序裡，標在第 2 段（系統提示詞）的最後一個區塊（另一種標法見下方展開）。OpenAI、Gemini 則會自動快取夠長的前綴，不必設定。不論哪一家，都用回應的 usage 欄位（例如 Claude 的 `cache_read_input_tokens`）確認是否命中。

**常見的破壞者。** 系統提示詞開頭的時間戳記；每次順序不同的工具列表（例如從多個 MCP server 載入時順序不固定）；改寫前面的歷史（例如每輪重寫摘要）。任何一個都會讓它後面的快取全部失效。

**容易誤會：OpenAI 會自動快取，所以 Claude 也會。** 同樣的程式換到 Claude，沒加 `cache_control` 時快取讀取永遠是 0，帳單上也看不到折扣。換 provider 時要重新確認快取怎麼開、usage 欄位叫什麼。

<details class="deep">
<summary>準備動手做：各家的快取細節</summary>

**價格（查證時 2026-11）。** 快取讀取：Anthropic 多數模型是 0.1 倍，最新的幾個模型更低（0.05 倍或 0.025 倍）；OpenAI 較新的模型多是 0.1 倍、少數 0.05 倍，較舊的模型則可能是 0.25 到 0.5 倍，要查各模型的價目。寫入：Anthropic 5 分鐘快取 1.25 倍、1 小時快取 2 倍。

**Claude。**

- 快取前綴依「工具定義 → 系統提示詞 → messages」的順序計算，所以前面的排序正好和它一致。
- 一次請求最多可以標 4 個 `cache_control` 快取點，例如系統提示詞後一個、歷史的最後一則一個。
- 請求頂層也可以放 `cache_control`：快取點會自動放在最後一個區塊，隨對話往後移，多輪對話用它最簡單。但如果最後一個區塊每次都不同（例如使用者的新問題）、又沒有之前的請求寫過同樣的前綴，這樣就不容易命中（必做題第 5 步就是這個情況），所以固定前綴要自己標在它的最後一個區塊。
- usage 欄位：`cache_creation_input_tokens` 是這次寫入快取的 token 數，`cache_read_input_tokens` 是從快取讀取的 token 數。
- 快取在存活時間內被讀取時會重新計時。

**OpenAI。** 自動快取，盡力而為；可以設 `prompt_cache_key`，讓共用前綴的請求更容易打到同一份快取。

**本地模型。** llama.cpp、Ollama 也會重用前綴，但沒有計費欄位，要看 server 回傳的計時資訊（prefill 時間是否明顯變短）。

最小長度、存活時間、價格都會變，動手前先查官方文件。

</details>

<section class="deep-section">

### ○ 壓縮 prompt 或改放權重？

LongLLMLingua（Jiang et al. 2023）用小模型刪掉 prompt 中較不重要的 token，在長 context 下壓縮輸入，並維持甚至提升表現；代價是壓縮後的文字人類難讀，每次壓縮結果不同也可能和快取衝突。另一個值得想的問題是：一份知識應該每次放進 context，還是透過微調放進權重（← S4 Post-training 與 reasoning、[S9 檢索與 RAG](/stages/s09-rag/) 的決策）？

</section>

## 實作

理解路線（不寫程式）：做完「先試一下」就可以跳到自我檢查。

### 先試一下（約 10 分鐘）

**1.** 筆記助理的總預算是 16K 輸入 token。這次的材料：工具定義 1,600、系統提示詞 1,400、使用者資料 300、對話歷史 2,800、檢索到的筆記 5,600、工具結果 9,000（30 筆全文）、使用者的問題 100，合計 20,800。要砍掉約 5,000 token，先砍哪一塊？為什麼？

<details class="hint">
<summary>對照答案</summary>

先砍工具結果：它最大，30 筆全文多數是干擾，砍了也能用工具再取。系統提示詞和使用者的問題不砍；檢索結果是回答的依據，最後才動。

</details>

**2.** 一個 10,000 token 的固定前綴，在快取有效期間被用了 30 次。用寫入 1.25 倍、讀取 0.1 倍計算，前綴部分的成本比不用快取省了多少？

<details class="hint">
<summary>對照答案</summary>

不用快取：30 × 10,000 = 300,000。用快取：1 次寫入 10,000 × 1.25 = 12,500，加 29 次讀取 29 × 10,000 × 0.1 = 29,000，共 41,500。省了 (300,000 − 41,500) ÷ 300,000 ≈ 86%。常見錯法是把 30 次都算成讀取，忘了第一次要寫入。

</details>

### 必做：長度、位置與快取實驗

**目標**：在自己的實驗裡親眼看到 context 長度和資訊位置對準確率的影響，並量到 prompt caching 省了多少。

**步驟**
1. 準備 20 個 needle：用 LLM 產生 20 段虛構公司的短報告（每段 80–150 字，各有一個獨一無二、可以問的事實，例如某個數字或人名），再讓它為每段寫一個問題，問題的用詞不要和短文相同。用虛構內容，是為了確保模型不可能事先知道答案。人工檢查 20 題都只有一個正確答案。
2. 準備干擾段落：用同一個 prompt 再產生 250 段虛構公司報告（和 needle 同領域、但不含那 20 個事實，公司名稱也不重複），合計約 30K token。也可以加入 S9 檢索與 RAG 文件集的切塊。
3. 組出 3 種長度（約 2K、8K、32K token）× 3 種位置（開頭、中間、結尾）的 context，共 9 種條件，每種跑 20 題。不要設 temperature（Claude 不接受，見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#sampling-參數的限制)），用模型的預設值，每種條件跑 3 輪，準確率取 3 輪平均。
4. 記錄每種條件的準確率（答案與 needle 的事實相符才算對）、平均輸入 token 數、平均延遲與成本。
5. 快取實驗：用一個約 10K token 的固定前綴，在快取有效期間依序（不要平行）送出 30 個不同的問題，讀 usage 欄位記錄每次的快取讀寫。用 Claude 時，把固定前綴放在系統提示詞（或獨立的第一個區塊），在它的最後一個區塊標上 `cache_control`，不要用請求頂層的 `cache_control`；原因見[怎麼排序才能吃到快取？](#-怎麼排序才能吃到快取)。OpenAI、Gemini 會自動快取。
6. 再跑一次，這次在前綴最前面加一行每次請求都不同的時間戳記（精確到毫秒，或改用每次請求的 UUID；只到分鐘的時間戳記仍可能命中快取），比較差異。

**驗收**
- 一張 3 × 3 的準確率表，每格附 95% 信賴區間（n = 20 的區間會很寬，這本身就是一個值得記下的觀察）。
- 一張「平均輸入 token 數 vs 準確率」的圖。
- 快取實驗中，第 2–30 次請求至少 28 次有快取讀取。這是依第 5 步加上 `cache_control`、依序送出時 Claude 的情況；OpenAI、Gemini 的自動快取是盡力而為，用 OpenAI 時可設 `prompt_cache_key`，命中率仍可能略低，寫下實際數字即可。
- 快取實驗中，用 usage 欄位算出的實際成本，和不用快取的成本並列。
- 加了時間戳記的版本，快取讀取次數降為 0（或接近 0），並寫下原因。

**提示**
- TypeScript：用 S6 LLM API 與應用基本功的呼叫層即可；token 數一律讀 usage 欄位；needle 與干擾段落用 structured output（← S7 Prompt、structured output 與 workflows）產生，存成 JSONL。
- Python：同上，用 S6 LLM API 與應用基本功的呼叫層，以及 structured output（← S7 Prompt、structured output 與 workflows）。
- 用便宜的小模型：540 次呼叫（9 種條件 × 20 題 × 3 輪）、平均約 14K 輸入 token，總計約 750 萬 token，便宜模型通常 10 美元以內。模型的上下文視窗要大於 32K（例如 64K 以上），因為 32K 的條件再加上問題與輸出會超過 32K。本地模型免費，但 32K context 在筆電上可能很慢，也可以只做 2K 與 8K。用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。
- 本地模型（llama.cpp、Ollama）也有前綴快取，但量法不同，看 server 回傳的計時資訊。
- 卡住時：
  - 重讀：[為什麼放越多反而越差？](#-為什麼放越多反而越差)、[怎麼排序才能吃到快取？](#-怎麼排序才能吃到快取)
  - 延伸：Chroma〈Context Rot〉的實驗設計段；prompt caching 官方文件的 usage 欄位說明

**提醒**：大約一半的工作量在準備 needle 與干擾段落。

<section class="deep-section">

### 進階：系統專案 A11：context builder

**目標**：把你系統裡零散的 context 組裝邏輯，收斂成一個有預算、有排序、對快取友善的 context builder，並用實驗結果決定預算。

**步驟**
1. 寫一個 context builder：輸入是這次請求可用的所有材料（系統提示詞、工具、檢索結果、工具結果、歷史），輸出是要送出的 messages。
2. 為每一部分設 token 預算；超過時依規則截斷、摘要或丟棄（例如較舊的工具結果只留一行摘要）。
3. 排序：固定內容在前、變動內容在後；工具定義依固定順序排列。
4. 在 trace 裡記錄每一部分的 token 數、被截斷的數量、快取讀寫 token 數。
5. 用 A8 錯誤分析與 golden set 的題組，加上 A9 附引用的 RAG 的查詢集，在至少 4 種總預算下跑 eval，畫出 token 數 vs 品質的曲線。
6. 在自己的文件上做 needle-in-a-haystack：在 10 份文件裡各藏一句事實，放在開頭、中間、結尾，用你系統的最大預算測試。
7. 用 50 輪的對話重播（record / replay 或腳本），量快取命中率。用 Claude 時要加上 `cache_control` 才會快取：多輪對話用請求頂層的 `cache_control` 最簡單，快取點會自動放在最後一個區塊、隨對話往後移；OpenAI 是自動快取。

**驗收**
- 100% 的呼叫在 trace 裡都有各部分的 token 數。
- 至少 4 個預算點的品質曲線，每點附 95% 信賴區間。
- 據此選定的預算，在 golden set 上不比 A9 附引用的 RAG 差：①跑之前先寫下容許的差距 δ（例如 5 個百分點）；②配對差值（新預算 − A9）的 95% 信賴區間下界不低於 −δ；③題數太少、區間太寬而達不到時，增加題數，而不是放寬門檻。
- 50 輪對話重播中，快取讀取的 token 佔總輸入 token ≥ 60%；達不到的話，指出是哪一部分破壞了前綴。
- Needle 測試：10 句 × 3 個位置的找回率表。
- 選定預算後，平均每次請求的成本和 A9 附引用的 RAG 並列比較。

以筆記助理為例：預算可以分成「工具定義、系統提示詞與使用者資料 4K、檢索到的筆記 6K、對話歷史 4K、工具結果 2K」；把使用者的名字和時區放在系統提示詞**後面**的一段動態區塊，而不是開頭，才不會每個使用者、每天都讓快取失效。

**提示**
- TypeScript：token 數可先用 provider 的 token counting API 校準，再用近似值即時計算；context builder 寫成純函式，方便用 snapshot 測試（← S6 LLM API 與應用基本功）。
- Python：同上；builder 的輸入輸出用 Pydantic 定義，方便記錄與重播。
- 成本：4 個預算點 × golden set 加查詢集約 100 題，再加 50 輪重播，用中等模型約數美元。用 Ollama 時先調大 context（見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#ollama-的-context-長度)）。
- 卡住時：
  - 重讀：[Context 怎麼分配預算？](#-context-怎麼分配預算)、[超出預算時怎麼砍？](#-超出預算時怎麼砍)、[怎麼排序才能吃到快取？](#-怎麼排序才能吃到快取)
  - 延伸：〈Effective context engineering〉的「The anatomy of effective context」段；prompt caching 文件中前綴順序與失效條件的段落

</section>

## 自我檢查

1. 為什麼 context 裡放越多資料，不一定越好？請舉出兩種不同的失效模式，各附一個例子。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：長度本身會讓表現不穩、中間的資訊容易被忽略；再從 distraction、poisoning、confusion、clash 裡挑兩種，各配一個具體例子。**常見錯法**：只說「會超過上下文視窗」，那是上限問題，不是品質問題。**回讀**：[為什麼放越多反而越差？](#-為什麼放越多反而越差)

   </details>

2. 一個系統的快取命中率幾乎是 0。列出三個你會先檢查的原因。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：先查前綴是否每次都變（時間戳記、工具順序、重寫的摘要），再查 Claude 有沒有標 `cache_control`。**常見錯法**：只看程式碼，不讀 usage 欄位確認。**回讀**：[怎麼排序才能吃到快取？](#-怎麼排序才能吃到快取)

   </details>

3. 什麼情況下應該預先載入，而不是讓模型 just-in-time 去取？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：確定或幾乎每次都會用到的資料就預先載入，省掉一輪來回和整段 context 的重送。**常見錯法**：以為 just-in-time 一定比較省。**回讀**：[資料先放還是需要再取？](#-資料先放還是需要再取)

   </details>

4. 你的系統提示詞已經寫了 60 條規則，模型反而更常犯錯。你會怎麼重寫？依據什麼刪減？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：從最精簡的原則版本重來，每條保留的指示都要對應一個在錯誤分析中觀察到的失敗類別；互相衝突的規則合併。**常見錯法**：再加一條「請遵守以上所有規則」。**回讀**：[系統提示詞要寫多細？](#-系統提示詞要寫多細)

   </details>

5. 情境題：一個搜尋工具每次回傳 30 筆、每筆約 800 token 的完整內容，三輪之後 context 就快滿了。請設計一個工具結果預算策略，並說明你會怎麼驗證它沒有傷害品質。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：設回傳上限並附截斷說明，再用固定題目比較改前改後的品質（附信賴區間）。**常見錯法**：砍了卻不告訴模型，或只看 token 數變少就宣告成功。**回讀**：[超出預算時怎麼砍？](#-超出預算時怎麼砍)

   </details>

6. 不看講義，替筆記助理的一次請求列出 context 的各部分、排列順序，並說明用 Claude 時 `cache_control` 要標在哪裡、為什麼使用者的時區不能放在系統提示詞的開頭。

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：依變動頻率由少到多排，`cache_control` 標在系統提示詞的最後一個區塊。**常見錯法**：把時區放在開頭，每個使用者、每天都讓後面的快取失效。**回讀**：[怎麼排序才能吃到快取？](#-怎麼排序才能吃到快取)

   </details>

<section class="deep-section">

## 延伸閱讀

講義已經涵蓋這一章需要的內容。下面的資料適合想看原始實驗、官方細節或其他整理方式的人，都不是必讀。

### 官方文件與廠商文章

- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)（2025-09-29）— attention budget、right altitude、just-in-time 的原始說法，附更多 Claude Code 的實例；後半的長時間任務技巧 S12 Agent loop 與 harness 會再讀一次。
- Prompt caching 官方文件：[Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)、[OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching) — 各模型的價格、最小長度、存活時間與 usage 欄位，以及哪些改動會讓快取失效的完整清單。

### 長 context 研究

- [Chroma: Context Rot](https://www.trychroma.com/research/context-rot)（2025-07-14）— 18 個模型的長度實驗，有更多操弄條件與完整的圖表。是向量資料庫廠商的研究。
- [Liu et al. 2023, Lost in the Middle](https://arxiv.org/abs/2307.03172) — 資訊位置影響的原始實驗。
- [Jiang et al. 2023, LongLLMLingua](https://arxiv.org/abs/2310.06839) — prompt 壓縮的方法與實驗。

### 實務整理

- [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) — Factor 3「Own your context window」有自訂格式的完整範例；附錄 Factor 13「Pre-fetch all the context you might need」。部分是 HumanLayer 的產品推廣。
- [Drew Breunig: How Long Contexts Fail](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html)（2025-06-22）與 [How to Fix Your Context](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)（2025-06-26）— 四種失效模式的原始整理，以及每種修法引用的研究。
- [roadmap.sh AI Agents](https://roadmap.sh/ai-agents) — context 相關節點，拿來檢查有沒有漏掉的主題。

### 課程

- [Stanford CS 329Z](https://cs329z.stanford.edu/) 第 2、6 講；[Stanford CS 224G](https://web.stanford.edu/class/cs224g/) 的 context engineering 講次。

### 中文資源

- [台大 李宏毅 Introduction to GenAI and ML 2025 秋](https://speech.ee.ntu.edu.tw/~hylee/GenAI-ML/2025-fall.php) — 繁中；〈上下文工程〉一講。
- [iThome 2026〈Day 4 甚麼是 Context Engineering〉](https://ithelp.ithome.com.tw/articles/10404121) — 繁中入門；內容未核對。
- [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) — 簡中；第 9 章 context engineering。

### 接下來

- 長時間運作的 context 管理：compaction、context reset、結構化筆記、sub-agent 隔離（→ [S12 Agent loop 與 harness](/stages/s12-agent-harness/)）。
- 記憶：跨對話保留什麼、怎麼取回（→ [S13 Memory 與個人化](/stages/s13-memory/)）。
- KV 層級的 context 重用（CacheBlend 等），把預先計算好的文件 KV cache 拼接使用（← S5 推論與 serving 的延伸）。

</section>
