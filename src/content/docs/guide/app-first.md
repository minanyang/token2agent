---
title: 應用路線與模型速成
head:
  - tag: title
    content: LLM 應用開發入門路線與模型速成｜Token2Agent
description: 想做 LLM 應用的推薦路線：讀完 S0 AI 系統概觀後，用模型速成補齊 token、sampling、context window 與成本等必要概念，接著直接進入 S6–S19 的應用與 agent 實作。
sidebar:
  order: 3
  label: 應用路線與模型速成
prev:
  link: /stages/s00-big-picture/
  label: S0 AI 系統概觀
next:
  link: /stages/s06-llm-api/
  label: S6 LLM API 與應用基本功
---

想做出 AI 應用或 agent 的人，走這條路線就夠了：

1. **[S0 AI 系統概觀](/stages/s00-big-picture/)**：先看懂一個 AI 系統由哪些部分組成。
2. **模型速成**（本頁下半部）：做應用最少要知道的模型知識，十個主題，每個幾段話。
3. **Part II 到 Part VI**（S6–S19）：從 [S6 LLM API 與應用基本功](/stages/s06-llm-api/)開始，按順序走到 S19 真實 agent 系統與畢業專題。

Part I 模型原理（S1–S5）介紹神經網路、Transformer、預訓練、後訓練與推論，用到較多數學，屬於**選修的深入路線**。應用路線可以直接完成 Part II 到 Part VI（S6–S19）。後面的章節用到模型知識時，會先連回本頁的速成段落，再以「深入：S2 Transformer 與 decoding」這類標記，指出 Part I 的對應章節。

## 適合誰

- 想把 LLM 接進產品、做出能用的系統的工程師，也就是業界說的 AI 工程師（用現成模型做產品，不從頭訓練模型）。
- 沒有機器學習背景，想先知道「這些東西怎麼用、為什麼這樣設計」的人。
- 不寫程式、只想看懂的人（理解路線）：讀完下面「現在要懂的四件事」就直接進 S6 LLM API 與應用基本功，各章只讀主線、做「先試一下」與自我檢查。
- 時間有限，希望早點交出看得到的成果（實作路線）。第一個成果是 S6 LLM API 與應用基本功的系統專案進階題 A6 串流聊天與 trace：一個能串流的聊天介面，介面可以用 Gradio、Chainlit 或 CLI，不必寫前端。

想研究或訓練模型、做推論基礎設施的人，請把 Part I 也走完（從 S0 AI 系統概觀依序走到 S19 真實 agent 系統與畢業專題）。

每章的**必做題**構成主線。**進階題**則是選做的長期專案，在淺顯模式下收合，分為系統專案（A6–A19，每章在自己的 AI 應用上增加能力）與模型專案（M1–M5，在 Part I 訓練小模型）。

## 什麼時候值得讀 Part I

走應用路線時，可以先學做法，需要理解原理時再讀對應章節。各主題的對照如下，代號讀法見[代號怎麼讀](/guide/how-to-use/#代號怎麼讀)：

| 你在哪一章 | 會用到的模型知識 | 深入閱讀 |
|---|---|---|
| [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S18 部署與架構](/stages/s18-deployment/) | 輸入與輸出 token 的計價差異、延遲的組成 | [S5 推論與 serving](/stages/s05-inference/) |
| [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | constrained decoding 怎麼保證格式 | [S5 推論與 serving](/stages/s05-inference/) |
| [S8 Evals 方法論](/stages/s08-evals/) | logprobs 與信心、sampling 造成的隨機性 | [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| [S9 檢索與 RAG](/stages/s09-rag/) | 微調 embedding 模型（A9 附引用的 RAG） | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[模型專案](/projects/model-thread/) |
| [S11 Context engineering](/stages/s11-context-engineering/) | prompt caching 為什麼省錢 | [S5 推論與 serving](/stages/s05-inference/) |
| [S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/) | reward hacking、蒸餾 router（A14 agent evals 與最佳化） | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [S18 部署與架構](/stages/s18-deployment/) | 自架與 API 的成本比較（A18 多使用者部署用 M5 迷你推論伺服器的實測數字） | [S5 推論與 serving](/stages/s05-inference/)、[模型專案](/projects/model-thread/) |

想補應用相關的原理，可以先挑小節，不必一次讀完整個模型章節：走完 S8 Evals 方法論後，讀 [S2 Transformer 與 decoding](/stages/s02-transformer/) 的斷詞與 decoding 兩節，或 S5 推論與 serving 開頭的例子與 prefill／decode 一節。走完 [S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)後，可以對照 S4 Post-training 與 reasoning 的[獎勵漏洞](/stages/s04-post-training/#-為什麼會鑽獎勵漏洞)與[蒸餾](/stages/s04-post-training/#-小模型怎麼向大模型學)兩節；想讀懂完整的訓練機制與推導，再依 S1–S4 的前置順序讀。數學工具（softmax、標準誤、bootstrap 等）見[數學補給](/guide/math-refresher/)。

## 模型速成

先讀「現在要懂的四件事」，再進入 S6 LLM API 與應用基本功。「之後用到再查」可以先記住名稱，用到時回來讀。每段都附上 Part I 的深入章節，作為選讀。

:::tip[怎麼讀這一節]
先讀「現在要懂的四件事」；「之後用到再查」可以先略讀，用到時再回來。不需要先完成模型原理章節或實作題，就能繼續 S6 LLM API 與應用基本功。
:::

### 現在要懂的四件事

開始 S6 LLM API 與應用基本功前，要先懂 token、文字生成、context，以及成本與延遲。文字生成會分成 Next-token 與 Sampling 兩段說明。

#### Token 與斷詞

Tokenizer 會用 BPE 等演算法，把常一起出現的字元合併成 token，再轉成整數供模型處理。一個英文單字通常是一到兩個 token，中文常是一到兩個字一個 token。

同樣意思的中文會不會比英文花更多 token，要看 tokenizer。詞彙表小或以英文為主時，差距較大；新一代多語 tokenizer 的差距小得多。API 計價、context 上限與速度都以 token 計算，所以 token 較多也會更貴、更佔 context。數不清單字字母、算術不穩等問題，也和這種切法有關。→ [S2 Transformer 與 decoding](/stages/s02-transformer/)

#### Next-token prediction

LLM 根據前面的所有 token，預測下一個 token 的機率。生成回答時，會反覆預測、挑選一個 token、接到後面，再繼續預測，直到結束。對話、工具呼叫和 JSON 輸出，都由這個機制產生，只是格式不同。

模型由數十億個稱為參數或權重的數字組成，訓練會調整這些數字，讓預測更準。生成時沒有查資料庫的動作，事實來自訓練學到的統計規律，因此可能產生看似合理卻錯誤的內容，也就是幻覺。→ [S1 神經網路基礎](/stages/s01-neural-networks/)、[S2 Transformer 與 decoding](/stages/s02-transformer/)

#### Sampling 與 temperature

模型每一步給出機率後，由 sampling 決定挑哪個 token。Temperature 調整機率分布的集中程度。低溫，例如 0–0.3，幾乎都挑最可能的 token，輸出較穩定；高溫則讓較不可能的 token 也有機會被選中，輸出更多樣，也更容易出錯。即使 temperature 設為 0，也不保證每次輸出完全相同。測試時要用 S6 LLM API 與應用基本功的方法，處理這種變動。→ [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S6 LLM API 與應用基本功](/stages/s06-llm-api/)

<details class="deep">
<summary>深入一點：top-p，以及不接受這些參數的 API</summary>

- **Top-p** 只在累積機率達到 p 的候選裡抽樣。
- 溫度設 0 仍會變，是因為伺服器端的批次處理與浮點運算順序都可能造成差異。
- 部分 API 已不接受這些參數（例如 Claude 帶 `temperature` 會回 400，見 [S6 LLM API 與應用基本功](/stages/s06-llm-api/#sampling-參數的限制)），穩定性要靠 prompt、structured output 與測試方法；需要調 temperature 的練習請用本地模型（Ollama、llama.cpp）。

</details>

#### Context window

Context window 是模型單次處理的 token 上限，系統提示詞、對話歷史、檢索結果、工具輸出，加上模型的輸出，都算在內。內容越多，成本與延遲越高，模型在長 context 裡找出關鍵資訊的能力也會下降。因此要選擇放哪些內容，這會在 S11 Context engineering 說明。S9 檢索與 RAG 則介紹只放相關段落的方法。→ [S9 檢索與 RAG](/stages/s09-rag/)、[S11 Context engineering](/stages/s11-context-engineering/)

#### 成本與延遲的基本功

API 費用約為「輸入 token 數 × 輸入單價 + 輸出 token 數 × 輸出單價」。輸出單價通常是輸入的好幾倍，命中快取的輸入則通常更便宜，原理見下方〈KV cache〉。推理模型（reasoning model）在回答前產生的思考 token，一般也按輸出計價，而且常比最後的回答還多。

延遲大致是 TTFT，也就是第一個 token 出現前的時間，再加上「輸出 token 數 × 每個 token 的時間」。TTFT 隨輸入長度增加，但縮短輸出通常更能降低總延遲。常見做法包括換小模型、限制輸出長度，以及固定 prompt 開頭來提高快取命中率；串流則讓使用者更早看到內容。從 S6 LLM API 與應用基本功起，每次呼叫都要記錄 token 數、成本與延遲，才能據此最佳化。→ [S5 推論與 serving](/stages/s05-inference/)、[S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S18 部署與架構](/stages/s18-deployment/)

### 之後用到再查

下面五個主題，S6 LLM API 與應用基本功之後的頁面用到時會連回來。現在先知道名字和用途就好，每段最後寫了什麼時候值得回來讀。

#### Logits 與 softmax

模型最後一層會替詞彙表裡的每個 token 打分，這個分數叫 logit。Softmax 把分數轉成加總為 1 的機率，分數越高，機率越大。Temperature 則是在 softmax 前，把 logits 除以 T。有些 API 會回傳機率的對數，也就是 logprobs，S8 Evals 方法論會用它衡量模型的把握程度。手算例子見[數學補給](/guide/math-refresher/#logitssoftmax-與-temperature)。→ [S2 Transformer 與 decoding](/stages/s02-transformer/)

**什麼時候回來讀**：S8 Evals 方法論用 logprobs 判斷模型有多確定時。

#### KV cache，以及為什麼輸出 token 比較貴

模型處理請求分兩個階段。Prefill 一次平行處理整段輸入，並把每個 token 的中間結果存成 KV cache；decode 每次只產生一個 token，而每產生一個，都要把整個模型的權重從記憶體讀一遍。所以輸入 token 可以大量平行處理、比較便宜，輸出 token 只能一個一個來、比較貴也比較慢，API 價目表上輸出單價通常是輸入的好幾倍。Prompt caching 就是重用相同開頭的 KV cache：如果每次請求的開頭（例如系統提示詞）都一樣，那段的計費比較便宜，處理也更快。→ [S5 推論與 serving](/stages/s05-inference/)

**什麼時候回來讀**：S11 Context engineering 講 prompt caching 為什麼省錢之前。

#### 訓練階段：pretrain → SFT → 偏好 / RL → reasoning

LLM 的訓練大致分成幾個階段。Pretraining 用大量網路文字訓練 next-token prediction，得到只會「接著寫」的 base model，知識大多在這個階段學到。SFT 用「指令 → 好回答」的資料教它聽指令、用對話格式回答。偏好學習（RLHF、DPO）用人類對回答的比較，讓它更有用、更安全。最近的 reasoning model 再用可自動驗證答案的任務（數學、程式）做強化學習（也常搭配蒸餾），讓模型學會先寫出很長的思考過程再回答，所以它們更擅長難題，但也更慢、花更多 token。→ [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/)

**什麼時候回來讀**：[S14 Agent evals、資料與最佳化](/stages/s14-agent-evals/)和 [S16 安全與治理](/stages/s16-security/)提到 reward hacking、model spec 時。

#### Chat template

你送給 API 的 messages（system、user、assistant、工具呼叫與工具結果）不會原封不動進入模型。伺服器會用 chat template 把它們串成一整段文字，用特殊 token 標出每則訊息的角色與邊界，例如 Qwen 系列的 `<|im_start|>user` … `<|im_end|>`；模型看到的就是這段文字，接著預測 assistant 的下一個 token。工具呼叫也是模型依 template 規定的格式輸出的一段文字，再由伺服器解析成結構化的 tool call。訓練與推論用的 template 必須一致；用 API 時廠商會處理，自己跑開源模型時要用 tokenizer 提供的 template。→ [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)

**什麼時候回來讀**：[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 看工具呼叫的原始樣子時。

#### 微調能做什麼、不能做什麼

微調（fine-tuning）適合調整模型的**行為**，例如輸出格式、語氣、風格、窄任務的表現，或把大模型的能力蒸餾到更小、更便宜的模型。會變動的**知識**則通常用 RAG 更可靠，因為資料更新後不必重新訓練，也能提供引用來源。

少量資料的 SFT 微調，通常也無法教會模型原本做不到的推理能力。這類能力主要來自大規模 RL，或大量強模型解題範例的 SFT，也就是蒸餾，詳見 S4 Post-training 與 reasoning。微調還可能讓其他能力退步。因此先改善 prompt，知識問題先用 RAG，最後才考慮微調，並先準備評估資料來檢查效果。→ [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S9 檢索與 RAG](/stages/s09-rag/)

**什麼時候回來讀**：S9 檢索與 RAG 決定該用 prompt、RAG 還是微調時。


## 速成檢查

走進 S6 LLM API 與應用基本功之前，試著回答這幾題。答不出來的，回到對應的段落或章節。

1. 為什麼同一段話翻成中文後，API 費用可能變高？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：計價以 token 計，不是字數；中文在某些 tokenizer 上 token 數較多。**常見錯法**：以為中文字少所以比較便宜。**回讀**：[Token 與斷詞](#token-與斷詞)

   </details>

2. 把 temperature 設成 0，可以當作「測試永遠會得到相同輸出」的保證嗎？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：不行，伺服器端的處理仍可能讓輸出不同。**常見錯法**：用「輸出完全相同」當測試的通過條件。**回讀**：[Sampling 與 temperature](#sampling-與-temperature)

   </details>

3. 一個請求的輸入是 10,000 token、輸出是 500 token；另一個輸入 500、輸出 10,000。哪一個比較慢？哪一個比較貴？為什麼？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：輸出一個一個產生，所以輸出多的那個比較慢；輸出單價通常是輸入的好幾倍，所以它通常也比較貴。**常見錯法**：只看總 token 數，以為兩個差不多。**回讀**：[成本與延遲的基本功](#成本與延遲的基本功)

   </details>

4. （之後用到再查）公司想讓模型回答最新的產品規格，同事提議用規格書微調模型。你會怎麼建議？

   <details class="hint">
   <summary>提示</summary>

   **判斷重點**：會變動的知識用 RAG，微調適合改變行為。**常見錯法**：以為微調後模型就能可靠地背出新規格。**回讀**：[微調能做什麼、不能做什麼](#微調能做什麼不能做什麼)

   </details>

<section class="deep-section">

## 選讀：實作與影片

這些是想深入模型原理時的選項，都不是進入 S6 LLM API 與應用基本功的前置。

- **想實作 tokenization 與 sampling**：先讀 [S2 Transformer 與 decoding](/stages/s02-transformer/) 的斷詞與 decoding 小節，再做該章的[「從零寫 BPE 與 sampling」](/stages/s02-transformer/#必做從零寫-bpe-與-sampling)。需要基本程式能力、UTF-8 byte 的概念，以及 logits、softmax、temperature、top-k 與 top-p；數學背景見[數學補給](/guide/math-refresher/#logitssoftmax-與-temperature)。不需要先完成 M1 模型專案，但不能只靠本頁速成內容直接做。這是 S2 的必做題，對只走應用路線的人是額外選讀。
- **想用影片補模型原理**：[台大 李宏毅 生成式 AI 導論 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php)（繁中）第 6–8 講分別介紹預訓練、指令微調與 RLHF；第 10 講介紹 Transformer 與文字接龍。依想補的主題挑一講即可，不需要先看完這四講。

</section>
