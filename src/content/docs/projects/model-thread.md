---
title: 模型專案（M1–M5）
head:
  - tag: title
    content: 從零實作 LLM：五個 Python 專案（M1–M5）｜Token2Agent
description: 從零用 Python 實作 LLM 的五個專案：手寫 autograd、從零寫 GPT、小模型 pretraining、SFT 到 GRPO 的後訓練，最後寫出自己的推論伺服器，貫穿 S1–S5 模型原理。
sidebar:
  order: 1
---

模型專案是 Part I 模型原理（S1–S5）的進階實作，分五步，從手寫梯度做到自己的推論伺服器。重點是親手做過 LLM 的各個環節，不要求訓練出實用模型。之後遇到 API 價格、延遲、微調效果與量化品質的數字，就有依據判斷是否合理。

Part I 五章各有一題**必做題**，可以獨立於模型專案完成。模型專案屬於**進階題**，各步會沿用前面的程式碼。M1–M5 的雲端 GPU 費用主要在 M4 小模型後訓練與 M5 迷你推論伺服器，合計約數十美元，仍會隨設定大幅變動，要先實測。

## 環境

模型專案使用 Python，配合以 Python 為主的 PyTorch、Hugging Face 訓練與推論工具鏈。從 S6 LLM API 與應用基本功開始的系統專案，則可選 TypeScript 或 Python。

- **Python** 3.11 以上，用 `uv` 或 `venv` 為模型專案建一個獨立環境。
- **核心套件**：PyTorch；M4 小模型後訓練與 M5 迷你推論伺服器再加上 `transformers`、[TRL](https://huggingface.co/docs/trl)、[PEFT](https://huggingface.co/docs/peft)。
- **實驗追蹤**：[Weights & Biases](https://docs.coreweave.com/products/wandb) 有免費個人方案；不想註冊可以用 TensorBoard 或自己寫 CSV。從 M1 makemore MLP 開始就養成記錄每次執行的習慣。
- **版本控管**：每個實驗的設定（資料、超參數、seed）都要能重跑；結果表格裡的每個數字都要能追到是哪一次執行。

## 算力

| 步驟 | 建議硬體 | 說明 |
|---|---|---|
| M1–M3（micrograd 與 MLP、tiny GPT、小模型 pretraining） | 筆電 CPU 或 Apple Silicon（MPS） | 模型可從百萬參數等級試跑；M3 要訓練多種大小並做去重對照，完整時間取決於硬體、資料量與步數，先量每步時間再估算 |
| M4 小模型後訓練 | 租用 NVIDIA GPU | Colab、Modal、Lambda 等。預估**數十美元等級，需實測** |
| M5 迷你推論伺服器 | 正確性可用 CPU；效能數字需 NVIDIA GPU | 費用通常比 M4 小模型後訓練低，仍需實測 |

幾個注意事項：

- **Mac MPS 的限制**：PyTorch 的 MPS 後端能跑前三步 M1–M3，但部分運算子不支援或較慢，混合精度與量化的支援也不如 CUDA。M4 小模型後訓練的 TRL 訓練與 M5 迷你推論伺服器的效能量測不建議在 Mac 上做。
- **費用怎麼估**：先用最小設定（少量資料、少量步數）跑一次，量出每步時間，再乘上完整設定的步數。租用時記得設定自動關機或預算上限。
- **免費選項**：Colab 免費版的 GPU 也許能跑 0.6B 模型的 LoRA，但可用時數與記憶體都不保證，適合試做，不適合當成主要環境。

## 五個步驟

### M1：micrograd 與 makemore MLP（[S1](/stages/s01-neural-networks/)）

從必做題的 scalar autograd 出發，改用 PyTorch tensor，在 names 資料集上把字元級語言模型從 bigram 做到 MLP。重點是訓練診斷：初始 loss 是否合理、activation 是否飽和、多組超參數怎麼比較。驗收是 MLP 的 val loss 比 bigram 低至少 0.15，並附上修正初始化前後的數字。

### M2：tiny GPT，升級成 Llama 元件（[S2](/stages/s02-transformer/)）

從零寫 GPT，在 tiny Shakespeare 上訓練，換上自己訓練的 BPE tokenizer，再逐一換成 RMSNorm、RoPE、SwiGLU、GQA。過程中手算參數量，與程式統計對照，並用不同 sampling 設定生成文字。這些練習能幫助你讀懂大部分 Llama / Qwen 類 dense 模型的 `config.json`；MoE、MLA 等欄位則要再對照 S2 Transformer 與 decoding。

### M3：小模型 pretraining 與迷你 scaling 實驗（[S3](/stages/s03-pretraining/)）

用三種大小的模型在同一份資料上 pretraining，畫出 loss 對 compute 的曲線，並和 Chinchilla 的估計比較；再用必做題的 MinHash 程式去重，看資料品質對 loss 的影響。想走完整的現代流程，可以改用 [nanochat](https://github.com/karpathy/nanochat)，但完整版需要租用 8×H100 節點。

### M4：Qwen3 小模型的 SFT → LoRA → DPO → GRPO（[S4](/stages/s04-post-training/)）

以 Qwen3-0.6B-Base（或 1.7B-Base）為起點，依序做全參數 SFT、LoRA、DPO，最後在數學題上做 GRPO。每一步都用同一套 held-out 評估和 base 比較，數字附信賴區間，並記錄至少一個 reward hacking 或 sycophancy 的實例。這是模型專案最花錢的一步。

### M5：KV cache、量化與 mini 推論伺服器（[S5](/stages/s05-inference/)）

在 Qwen3-0.6B 上自己寫生成迴圈、加上 KV cache、做權重量化，最後寫一個支援 continuous batching 的 HTTP 伺服器，並在不同並行數下量測吞吐量與 TTFT。完成後對照 [nano-vllm](https://github.com/GeeeekExplorer/nano-vllm) 的實作，找出自己還缺哪些最佳化。

## 和系統專案的橋接

模型專案的技術會在系統專案（[系統專案總覽](/projects/system-thread/)）的三個地方再用到：

- **微調 embedding 模型**（[A9 附引用的 RAG](/stages/s09-rag/)）：用 M4 小模型後訓練學到的微調流程與評估習慣，在自己的資料上微調檢索用的 embedding 模型，並比較微調前後的 Recall@k。
- **從 trace 蒸餾 router**（[A14 agent evals 與最佳化](/stages/s14-agent-evals/)）：把系統累積的 trace 當成訓練資料，訓練一個小型分類器或 router，決定請求該交給哪個模型或哪條流程。資料準備與「附信賴區間的前後比較」都是 M4 小模型後訓練的延續。
- **自架與 API 的比較**（[A18 多使用者部署](/stages/s18-deployment/)）：用 M5 迷你推論伺服器量到的 TTFT、TPOT、吞吐量與 GPU 時薪，估算自架的每百萬 token 成本，和 API 價格並列比較。

只走[應用路線](/guide/app-first/)的人，可以先略過這三個橋接，等讀 Part I 模型原理（S1–S5）時再回來做。
