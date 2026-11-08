---
title: 概念索引
description: 每個概念在哪一章首次教，在哪些章深化。
sidebar:
  order: 3
---

這份路線的規則是：**每個概念只在一章「首次教」，其他章只「深化」**。走應用路線的人不讀 Part II，相關概念會先在[模型速成](/guide/app-first/#模型速成)概覽，下表也會註明。各章頁面用「（← S2 Transformer 與 decoding）」標出概念來源，用「（→ S16 安全與治理）」標出之後會深入的地方。

找不到某個概念時，先查這裡。數學與統計工具（連鎖律、softmax、對數圖、標準誤、bootstrap、cosine 相似度）不屬於任何一章，忘了時翻[數學補給](/guide/math-refresher/)；下表在相關的列附上對應小節。表中章名前的代號怎麼讀，見[代號怎麼讀](/guide/how-to-use/#代號怎麼讀)。

## 模型

| 概念 | 首次教 | 深化 |
|---|---|---|
| Backprop、optimizer、初始化與正規化（[數學補給：連鎖律](/guide/math-refresher/#連鎖律與-backprop)） | [S1 神經網路基礎](/stages/s01-neural-networks/) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| 實驗追蹤（W&B） | [S1 神經網路基礎](/stages/s01-neural-networks/) | — |
| Perplexity（[數學補給：對數尺度](/guide/math-refresher/#對數尺度與-loglog-圖)） | [S1 神經網路基礎](/stages/s01-neural-networks/) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S5 推論與 serving](/stages/s05-inference/) |
| Word embedding（word2vec） | [S1 神經網路基礎](/stages/s01-neural-networks/)（○） | — |
| Tokenization / BPE | [S2 Transformer 與 decoding](/stages/s02-transformer/)（應用路線：模型速成先概覽） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（token 計價） |
| Attention、Transformer block | [S2 Transformer 與 decoding](/stages/s02-transformer/) | [S5 推論與 serving](/stages/s05-inference/) |
| Causal mask（拿掉它時訓練與生成會怎樣） | [S2 Transformer 與 decoding](/stages/s02-transformer/) | — |
| Decoding / sampling（temperature、top-p；[數學補給：softmax](/guide/math-refresher/#logitssoftmax-與-temperature)） | [S2 Transformer 與 decoding](/stages/s02-transformer/) | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S5 推論與 serving](/stages/s05-inference/)、[S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Sampling 參數的限制](/stages/s06-llm-api/#sampling-參數的限制)（部分 API 不接受 temperature、top_p、top_k） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（[S2 Transformer 與 decoding](/stages/s02-transformer/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/) 與模型速成先提及並連到這裡） | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S11 Context engineering](/stages/s11-context-engineering/) |
| RoPE、GQA / MLA、MoE | [S2 Transformer 與 decoding](/stages/s02-transformer/) | [S5 推論與 serving](/stages/s05-inference/) |
| MoE 的計算量與記憶體（計算看啟用參數、記憶體看總參數） | [S2 Transformer 與 decoding](/stages/s02-transformer/) | — |
| Resource accounting（參數、FLOPs、記憶體） | [S2 Transformer 與 decoding](/stages/s02-transformer/) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S5 推論與 serving](/stages/s05-inference/) |
| 量化概念 | [S2 Transformer 與 decoding](/stages/s02-transformer/) | [S5 推論與 serving](/stages/s05-inference/)（實作）、[S6 LLM API 與應用基本功](/stages/s06-llm-api/)（GGUF / 本地模型）、[S18 部署與架構](/stages/s18-deployment/) |
| 多模態架構 | [S2 Transformer 與 decoding](/stages/s02-transformer/)（○） | [S9 檢索與 RAG](/stages/s09-rag/)（文件解析）、[S10 工具與 MCP](/stages/s10-tools-mcp/)（computer use） |
| 資料工程（過濾、去重、PII） | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) | [S4 Post-training 與 reasoning](/stages/s04-post-training/)（合成資料） |
| Scaling laws、emergence（[數學補給：log–log 圖](/guide/math-refresher/#對數尺度與-loglog-圖)） | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) | — |
| 平行化訓練 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) | — |
| SFT、LoRA | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S9 檢索與 RAG](/stages/s09-rag/)（embedding 微調） |
| Chat template | [S4 Post-training 與 reasoning](/stages/s04-post-training/)（應用路線：模型速成先概覽） | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)（工具呼叫的原始樣子） |
| RL 基礎、RLHF、DPO（含 DPO 的限制：離線學習、缺少探索） | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)（agentic RL） |
| GRPO / RLVR、reasoning model | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（應用端使用） |
| Test-time compute、verifier | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Reward hacking、sycophancy | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S13 Memory 與個人化](/stages/s13-memory/)（個人化迎合）、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)（最佳化鑽漏洞） |
| 合成資料與蒸餾 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)（router 蒸餾） |
| GPU 心智模型 | [S5 推論與 serving](/stages/s05-inference/) | [S18 部署與架構](/stages/s18-deployment/) |
| Prefill / decode、KV cache | [S5 推論與 serving](/stages/s05-inference/)（[S0 全局地圖](/stages/s00-big-picture/)、模型速成先概覽） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S11 Context engineering](/stages/s11-context-engineering/)、[S18 部署與架構](/stages/s18-deployment/) |
| Continuous batching、PagedAttention | [S5 推論與 serving](/stages/s05-inference/) | [S18 部署與架構](/stages/s18-deployment/) |
| TTFT / TPOT / goodput | [S5 推論與 serving](/stages/s05-inference/) | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（量 TTFT）、[S18 部署與架構](/stages/s18-deployment/) |
| Prompt caching（KV prefix 重用） | [S5 推論與 serving](/stages/s05-inference/)（應用路線：模型速成概覽，[S11 Context engineering](/stages/s11-context-engineering/) 主教） | [S18 部署與架構](/stages/s18-deployment/) |
| Constrained decoding 機制 | [S5 推論與 serving](/stages/s05-inference/) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| 加速分類（FlashAttention、speculative decoding） | [S5 推論與 serving](/stages/s05-inference/) | — |

## 應用

| 概念 | 首次教 | 深化 |
|---|---|---|
| Messages / roles、token 計價 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S8 Eval 方法論](/stages/s08-evals/)（成本會計） |
| Streaming（SSE、partial JSON） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| Retry、rate limit、idempotency | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| 取消與中斷 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| Reasoning model 的應用端使用（thinking budget、interleaved thinking） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| 回饋收集（最小版：讚 / 倒讚） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| 本地與小模型 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S18 部署與架構](/stages/s18-deployment/) |
| [Ollama 的 context 長度](/stages/s06-llm-api/#ollama-的-context-長度)（預設可能只有 4K，超過時丟掉較早的內容） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)（[S5 推論與 serving](/stages/s05-inference/) 先提及並連到這裡） | 之後各章用本地模型的提示都連到這裡 |
| Tracing（OpenTelemetry GenAI） | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S8 Eval 方法論](/stages/s08-evals/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| 測試非確定性程式 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) | [S8 Eval 方法論](/stages/s08-evals/) |
| Prompt 結構、few-shot、CoT | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | — |
| Prompt sensitivity | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | — |
| Structured output、function calling | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | [S10 工具與 MCP](/stages/s10-tools-mcp/)、[S13 Memory 與個人化](/stages/s13-memory/)（記憶擷取） |
| Prompt as code、跨模型遷移 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | [S18 部署與架構](/stages/s18-deployment/) |
| 五種 workflow 模式 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S15 Multi-agent](/stages/s15-multi-agent/)（orchestrator-worker）、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| 多模態輸入（圖片、PDF 直接餵模型） | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)（○） | [S9 檢索與 RAG](/stages/s09-rag/) |
| 錯誤分析（open / axial coding） | [S8 Eval 方法論](/stages/s08-evals/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S15 Multi-agent](/stages/s15-multi-agent/)（MAST 失敗分類） |
| LLM-as-judge 與校準 | [S8 Eval 方法論](/stages/s08-evals/) | [S13 Memory 與個人化](/stages/s13-memory/)（A13 分層記憶第 0 步的 pairwise judge，用於個人化評估）、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)（agent-as-judge） |
| Capability vs regression eval、pass@k / pass^k | [S8 Eval 方法論](/stages/s08-evals/) | [S10 工具與 MCP](/stages/s10-tools-mcp/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S18 部署與架構](/stages/s18-deployment/) |
| Benchmark 污染與 construct validity | [S8 Eval 方法論](/stages/s08-evals/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Error bars、bootstrap 信賴區間（[數學補給：標準誤](/guide/math-refresher/#平均變異數與標準誤)、[bootstrap](/guide/math-refresher/#bootstrap-信賴區間)；S4 Post-training 與 reasoning 先用一次） | [S8 Eval 方法論](/stages/s08-evals/) | [S9 檢索與 RAG](/stages/s09-rag/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S18 部署與架構](/stages/s18-deployment/) |
| 樣本數規劃（檢定力） | [S8 Eval 方法論](/stages/s08-evals/)（○） | — |
| 多重比較（Bonferroni） | [S8 Eval 方法論](/stages/s08-evals/)（○） | — |
| 標註者一致性（Cohen's κ） | [S8 Eval 方法論](/stages/s08-evals/)（○） | — |
| 成本會計（每任務成本、預算） | [S8 Eval 方法論](/stages/s08-evals/) | [S13 Memory 與個人化](/stages/s13-memory/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| 不確定性（logprobs、calibration） | [S8 Eval 方法論](/stages/s08-evals/) | [S17 產品與 AI UX](/stages/s17-ai-ux/)（A17 完整前端第 0 步的逐筆不確定性訊號與呈現）、[S18 部署與架構](/stages/s18-deployment/)（cascade） |
| 校準指標（ECE、Brier score） | [S8 Eval 方法論](/stages/s08-evals/)（○） | — |
| 文件解析、OCR | [S9 檢索與 RAG](/stages/s09-rag/) | — |
| Embedding、vector search、hybrid、rerank（[數學補給：cosine 相似度](/guide/math-refresher/#內積與-cosine-相似度)） | [S9 檢索與 RAG](/stages/s09-rag/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)（與 agentic search 比較） |
| Retrieval eval vs generation eval | [S9 檢索與 RAG](/stages/s09-rag/) | — |
| Long context vs RAG | [S9 檢索與 RAG](/stages/s09-rag/) | [S11 Context engineering](/stages/s11-context-engineering/)、[S13 Memory 與個人化](/stages/s13-memory/)（記憶基準線） |
| Prompt vs RAG vs 微調的決策 | [S9 檢索與 RAG](/stages/s09-rag/)（模型速成先概覽微調能做什麼） | [S11 Context engineering](/stages/s11-context-engineering/) |
| Text2SQL | [S9 檢索與 RAG](/stages/s09-rag/)（○） | — |
| 間接 prompt injection 🔒 | [S9 檢索與 RAG](/stages/s09-rag/) | [S13 Memory 與個人化](/stages/s13-memory/)、[S16 安全與治理](/stages/s16-security/) |
| 工具設計與風險分級 | [S10 工具與 MCP](/stages/s10-tools-mcp/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S16 安全與治理](/stages/s16-security/)、[S17 產品與 AI UX](/stages/s17-ai-ux/)（確認介面） |
| MCP（transports、auth） | [S10 工具與 MCP](/stages/s10-tools-mcp/) | [S16 安全與治理](/stages/s16-security/)（供應鏈）、[S17 產品與 AI UX](/stages/s17-ai-ux/)（MCP Apps） |
| stdio MCP server（必做；帶 OAuth 的 HTTP 版在進階） | [S10 工具與 MCP](/stages/s10-tools-mcp/) | — |
| Tool search / deferred loading | [S10 工具與 MCP](/stages/s10-tools-mcp/) | [S11 Context engineering](/stages/s11-context-engineering/) |
| Code execution 作為工具介面 | [S10 工具與 MCP](/stages/s10-tools-mcp/) | — |
| Agent-computer interface（ACI） | [S10 工具與 MCP](/stages/s10-tools-mcp/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Sandbox、egress 🔒 | [S10 工具與 MCP](/stages/s10-tools-mcp/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S16 安全與治理](/stages/s16-security/) |
| Context 預算與失效模式 | [S11 Context engineering](/stages/s11-context-engineering/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| Progressive disclosure | [S11 Context engineering](/stages/s11-context-engineering/) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)（skills） |

## Agent 系統

| 概念 | 首次教 | 深化 |
|---|---|---|
| Compound AI、augmented LLM、workflow vs agent | [S0 全局地圖](/stages/s00-big-picture/) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Agent 分級 Level 0–4 | [S0 全局地圖](/stages/s00-big-picture/) | — |
| Agent loop、ReAct（S0 全局地圖先以 mini-SWE-agent 概覽） | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Harness 元件 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)（ablation）、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| 權限模式、hooks 🔒 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S16 安全與治理](/stages/s16-security/) |
| 停止條件、升級給人、HITL | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Checkpoint / resume | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S18 部署與架構](/stages/s18-deployment/)（durable execution）、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Compaction、context reset、sub-agent 隔離 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S13 Memory 與個人化](/stages/s13-memory/)、[S15 Multi-agent](/stages/s15-multi-agent/)（sub-agent 隔離）、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Skills | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S13 Memory 與個人化](/stages/s13-memory/)（程序性記憶）、[S16 安全與治理](/stages/s16-security/)（供應鏈） |
| Agentic search | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | [S15 Multi-agent](/stages/s15-multi-agent/) |
| Long-running patterns（initializer / worker、generator–evaluator） | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) | — |
| Memory 類型與階層 | [S13 Memory 與個人化](/stages/s13-memory/) | — |
| 個人化 | [S13 Memory 與個人化](/stages/s13-memory/) | [S17 產品與 AI UX](/stages/s17-ai-ux/)（介面） |
| Memory poisoning 🔒 | [S13 Memory 與個人化](/stages/s13-memory/) | [S16 安全與治理](/stages/s16-security/) |
| Trajectory eval、模擬使用者 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | [S15 Multi-agent](/stages/s15-multi-agent/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Infra noise、benchmark hygiene | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Prompt 最佳化（DSPy、GEPA） | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | — |
| 路由決定紀錄與 router 蒸餾（← [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 的 routing workflow） | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | [S18 部署與架構](/stages/s18-deployment/)（模型路由） |
| Data flywheel | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) | [S17 產品與 AI UX](/stages/s17-ai-ux/)（回饋介面） |
| Multi-agent 架構與 token 經濟 | [S15 Multi-agent](/stages/s15-multi-agent/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Deep research 架構 | [S15 Multi-agent](/stages/s15-multi-agent/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Workspace / worktree 隔離 | [S15 Multi-agent](/stages/s15-multi-agent/) | — |

## 可信、產品、上線

| 概念 | 首次教 | 深化 |
|---|---|---|
| Lethal trifecta、威脅建模 | [S16 安全與治理](/stages/s16-security/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/)（稽核） |
| 結構性防禦設計模式 | [S16 安全與治理](/stages/s16-security/) | — |
| Guardrails、approval fatigue | [S16 安全與治理](/stages/s16-security/) | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| 資料治理與法規 | [S16 安全與治理](/stages/s16-security/) | — |
| Agentic UX、generative UI | [S17 產品與 AI UX](/stages/s17-ai-ux/) | — |
| 回饋設計 | [S17 產品與 AI UX](/stages/s17-ai-ux/) | — |
| Proactive agents | [S17 產品與 AI UX](/stages/s17-ai-ux/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| 模型路由與 cascade（← [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 的 routing workflow；[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) 的 router 蒸餾） | [S18 部署與架構](/stages/s18-deployment/) | — |
| Eval 把關的 CI/CD、canary | [S18 部署與架構](/stages/s18-deployment/) | — |
| 多租戶隔離 | [S18 部署與架構](/stages/s18-deployment/) | — |
| Gateway、cache（exact / semantic；prompt caching ← S5 推論與 serving） | [S18 部署與架構](/stages/s18-deployment/) | — |
| Durable execution | [S18 部署與架構](/stages/s18-deployment/) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
