---
title: 來源清單
description: 這份路線引用的所有課程、書、文章、repo，附定位、偏向與日期。
sidebar:
  order: 1
---

這份路線引用的所有課程、書、文章、repo 都列在這裡。每筆都附上定位、偏向、日期。

- **維護**：這個領域變化很快，每季檢查一次。連結失效或內容過時，歡迎回報或發 PR
- **簡中資源**：內容品質好但用簡體字的，可以用 [OpenCC](https://github.com/BYVoid/OpenCC) 的 `s2twp` 設定轉成台灣用語
- **對應章節**：表格的「對應章節」欄列出這份資源搭配哪幾章；章名前的代號怎麼讀，見[代號怎麼讀](/guide/how-to-use/#代號怎麼讀)

---

## 大學課程

| 課程 | 定位 | 對應章節 |
|---|---|---|
| [Stanford CS 329Z Engineering AI Agents](https://cs329z.stanford.edu/)（2026 秋） | 最完整的 agent 系統課，每講都有論文。投影片隨課程陸續公開（查證時到第 13 講），錄影只在 Stanford 內部 | [S0 全局地圖](/stages/s00-big-picture/)、[S9 檢索與 RAG](/stages/s09-rag/) 到 [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| [CMU 11-768 AI Agents](https://www.cmu-agents.com/)（Neubig、Fried，2026 秋） | 作業是 harness → eval → 訓練，跟本路線最接近 | [S10 工具與 MCP](/stages/s10-tools-mcp/) 到 [S16 安全與治理](/stages/s16-security/) |
| [Stanford CS336 Language Modeling from Scratch](https://cs336.stanford.edu/) | 從零做語言模型，原理、訓練、推論都講得最深 | [S2 Transformer 與 decoding](/stages/s02-transformer/) 到 [S5 推論與 serving](/stages/s05-inference/) |
| [Stanford CS224N](https://web.stanford.edu/class/cs224n/)（2026 冬） | NLP 到 LLM 的經典入門；第 4 份作業是 LLM 評估 | [S1 神經網路基礎](/stages/s01-neural-networks/) 到 [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S8 Eval 方法論](/stages/s08-evals/) |
| [CMU 11-711 Advanced NLP](https://cmu-l3.github.io/anlp-spring2026/)（Welleck） | 第 1 份作業是 Build Your Own LLaMa；有 RL 基礎講次 | [S2 Transformer 與 decoding](/stages/s02-transformer/) 到 [S5 推論與 serving](/stages/s05-inference/) |
| [CMU 11-766 LLM Applications](https://cmu-llms.org/schedule/) | 應用面：prompt 敏感度、deep research、攻擊 LLM 應用 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S16 安全與治理](/stages/s16-security/) |
| [CMU 15-442 ML Systems](https://mlsyscourse.org/schedule) | GPU、平行化、serving | [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S5 推論與 serving](/stages/s05-inference/) |
| [CMU 11-868 LLM Systems](https://llmsystem.github.io/llmsystem2026spring/docs/Syllabus) | FlashAttention、vLLM、DistServe 等 serving 系統 | [S5 推論與 serving](/stages/s05-inference/)、[S18 部署與架構](/stages/s18-deployment/) |
| [MIT 6.5940 TinyML and Efficient AI](https://hanlab.mit.edu/courses/2024-fall-65940) | 量化、蒸餾；有「筆電上部署 LLM」的 lab | [S5 推論與 serving](/stages/s05-inference/) |
| [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) | test-time compute、verifier、self-improvement | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Stanford CS329H ML from Human Preferences](https://web.stanford.edu/class/cs329h/) | 偏好學習的理論（Bradley–Terry 等），選修 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [Stanford CS 224G Building & Scaling LLM Applications](https://web.stanford.edu/class/cs224g/) | 創業導向；context engineering 兩講、產品面 | [S11 Context engineering](/stages/s11-context-engineering/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Stanford CS146S The Modern Software Developer](https://themodernsoftware.dev/) | 跟 coding agent 協作：MCP、skills、spec-driven | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| [Stanford CS25 Transformers United V6](https://web.stanford.edu/class/cs25/) | 講座系列；Frye（Modal）談 production serving | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/)、[S18 部署與架構](/stages/s18-deployment/) |
| [Berkeley LLM Agents MOOC F24](https://llmagents-learning.org/f24)、[Advanced LLM Agents Sp25](https://rdi.berkeley.edu/adv-llm-agents/sp25)、[Agentic AI F25](https://agenticai-learning.org/f25) | 講者陣容強；錄影公開 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) 到 [S16 安全與治理](/stages/s16-security/) |
| [Buffalo CSE 410/510 Agentic Engineering](https://cse.buffalo.edu/courses/cse410/2026_fall/cse410ae/) | 每週搭一條數學線；lab 設計可參考 | [S9 檢索與 RAG](/stages/s09-rag/) 到 [S16 安全與治理](/stages/s16-security/) |
| [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) | multi-agent 社會行為、Theory of Mind | [S15 Multi-agent](/stages/s15-multi-agent/) |
| [Harvard CS 2881R AI Safety](https://boazbk.github.io/mltheoryseminar/)（2026 秋） | reward hacking、model spec、interpretability | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S16 安全與治理](/stages/s16-security/) |
| [Princeton COS 597R](https://princeton-cos597r.github.io)、[COS 598A AI Safety](https://princeton-polaris-lab.github.io/ai-safety-course) | 資料策展；jailbreak 經典、safety cases | [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S16 安全與治理](/stages/s16-security/) |
| [台大 李宏毅 生成式 AI 導論 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php) | 繁中影片、由上而下講原理 | [S0 全局地圖](/stages/s00-big-picture/) 到 [S5 推論與 serving](/stages/s05-inference/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S16 安全與治理](/stages/s16-security/) |
| [台大 李宏毅 機器學習 2025 春](https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php) | AI Agent、推理、微調與遺忘、model editing / merging | [S2 Transformer 與 decoding](/stages/s02-transformer/) 到 [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [台大 李宏毅 Introduction to GenAI and ML 2025 秋](https://speech.ee.ntu.edu.tw/~hylee/GenAI-ML/2025-fall.php) | 含「上下文工程」一講 | [S0 全局地圖](/stages/s00-big-picture/)、[S11 Context engineering](/stages/s11-context-engineering/) |
| [台大 陳縕儂 ADL 2026](https://www.csie.ntu.edu.tw/~miulab/f115-adl/) | 繁中講課；RAG、agents、Human-AI Interaction | [S1 神經網路基礎](/stages/s01-neural-networks/) 到 [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [清大 高宏宇 NLP 2026](https://github.com/IKMLab/NTHU_Natural_Language_Processing) | 繁中 / 英文雙語投影片與影片 | [S1 神經網路基礎](/stages/s01-neural-networks/) 到 [S4 Post-training 與 reasoning](/stages/s04-post-training/) |

## 書與長篇教材

| 來源 | 定位 | 對應章節 |
|---|---|---|
| Chip Huyen《AI Engineering》（O'Reilly 2025），[配套 repo](https://github.com/chiphuyen/aie-book) | 應用工程的主幹：eval、RAG、微調、資料、推論、架構、使用者回饋。付費書，repo 只有摘要 | [S5 推論與 serving](/stages/s05-inference/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) 到 [S9 檢索與 RAG](/stages/s09-rag/)、[S17 產品與 AI UX](/stages/s17-ai-ux/)、[S18 部署與架構](/stages/s18-deployment/) |
| [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | 從零實作 GPT；bonus 有 KV cache、GQA、MLA、MoE、DPO | [S2 Transformer 與 decoding](/stages/s02-transformer/) 到 [S5 推論與 serving](/stages/s05-inference/) |
| [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) | 影片系列；backprop 與訓練直覺最好。2024 後未更新 | [S1 神經網路基礎](/stages/s01-neural-networks/) 到 [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| [mlabonne/llm-course](https://github.com/mlabonne/llm-course) | roadmap 式連結地圖；資料工程、量化、安全少見地完整。2025-12 後未更新內容 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) 到 [S5 推論與 serving](/stages/s05-inference/)、[S9 檢索與 RAG](/stages/s09-rag/) |
| [Hugging Face Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) | 平行化訓練的標準讀物 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| [Hugging Face LLM Course](https://huggingface.co/learn/llm-course)、[MCP Course](https://huggingface.co/learn/mcp-course)、[Agents Course](https://github.com/huggingface/agents-course) | ch11–12 有 SFT 與 GRPO；Agents Course 偏框架 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S10 工具與 MCP](/stages/s10-tools-mcp/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | 18 課；L03 是少數講 agentic UX 的。強烈綁定 Azure | [S16 安全與治理](/stages/s16-security/) 到 [S18 部署與架構](/stages/s18-deployment/) |
| [anthropics/courses](https://github.com/anthropics/courses) | prompt 教學與 prompt evaluations lab。**已封存**，內容仍可用 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S8 Eval 方法論](/stages/s08-evals/) |
| [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) | 「自己掌握 prompt、context、control flow」。部分是 HumanLayer 的產品推廣 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S11 Context engineering](/stages/s11-context-engineering/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | 約 100 行的完整 agent | [S0 全局地圖](/stages/s00-big-picture/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [WenyuChiou/awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) | 繁中 agent 學習地圖；harness 8 元件檢查表、eval 很好。偏 Claude Code 生態，模型原理很淺 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [karpathy/makemore](https://github.com/karpathy/makemore) | 字元級語言模型；S1 神經網路基礎的練習取 `names.txt` 資料。2024 後未更新 | [S1 神經網路基礎](/stages/s01-neural-networks/) |
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最精簡的 GPT 訓練 repo；S2 Transformer 與 decoding 借設定、自己寫模型本體 | [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| [karpathy/nanochat](https://github.com/karpathy/nanochat) | 端對端小型 ChatGPT 訓練；完整版需 8×H100，有 CPU / MPS 縮小版 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/)、模型線 |
| [GeeeekExplorer/nano-vllm](https://github.com/GeeeekExplorer/nano-vllm) | 約 1,200 行的 vLLM 精簡實作，對照自己的推論伺服器 | [S5 推論與 serving](/stages/s05-inference/)、模型線 |
| [SWE-agent/mini-swe-agent：`agents/default.py`](https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/agents/default.py) | agent 主迴圈原始碼；S0 全局地圖逐方法對照 | [S0 全局地圖](/stages/s00-big-picture/) |
| [Microsoft ai-agents-for-beginners L03: AI Agentic Design Principles](https://github.com/microsoft/ai-agents-for-beginners/tree/main/03-agentic-design-patterns) | 透明度、控制權、一致性三原則；範例綁 Azure，原則通用 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Microsoft: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/)（2019） | 18 條人機互動原則，可當 UI 稽核清單 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Nielsen Norman Group: Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)（Nielsen 1993，整理自 Miller 1968 與 Card et al. 1991） | 0.1 秒 / 1 秒 / 10 秒三個回應時間門檻 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [roadmap.sh AI Engineer](https://roadmap.sh/ai-engineer)、[AI Agents](https://roadmap.sh/ai-agents) | 覆蓋率檢查表；context 失效模式整理完整。內容淺，以工具清單為主 | 全部 |

## 業界文章與指南

### Anthropic Engineering

| 文章 | 日期 | 對應章節 |
|---|---|---|
| [Building effective AI agents](https://www.anthropic.com/research/building-effective-agents) | 2024-12-19 | [S0 全局地圖](/stages/s00-big-picture/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [Contextual retrieval](https://www.anthropic.com/research/contextual-retrieval)（廠商自己的實驗） | 2024-09-19 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) | 2025-06-13 | [S15 Multi-agent](/stages/s15-multi-agent/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| [Writing effective tools for AI agents](https://www.anthropic.com/research/writing-tools-for-agents) | 2025-09-11 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [A postmortem of three recent issues](https://www.anthropic.com/research/a-postmortem-of-three-recent-issues) | 2025-09-17 | [S18 部署與架構](/stages/s18-deployment/) |
| [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | 2025-09-29 | [S11 Context engineering](/stages/s11-context-engineering/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [Equipping agents with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) | 2025-10-16 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [Making Claude Code safer with sandboxing](https://www.anthropic.com/research/claude-code-sandboxing) | 2025-10-20 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [Code execution with MCP for efficient agents](https://www.anthropic.com/research/code-execution-with-mcp) | 2025-11-04 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [Introducing advanced tool use for Claude](https://www.anthropic.com/research/advanced-tool-use) | 2025-11-24 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [Mitigating prompt injections in browser use](https://www.anthropic.com/research/prompt-injection-defenses) | 2025-11-24（只談 browser agent） | [S16 安全與治理](/stages/s16-security/) |
| [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) | 2025-11-26 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) | 2026-01-09 | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise) | 2026-02-05 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp) | 2026-03-06 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| [Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps) | 2026-03-24 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [How we built Claude Code auto mode](https://www.anthropic.com/research/claude-code-auto-mode) | 2026-03-25 | [S16 安全與治理](/stages/s16-security/) |
| [Scaling Managed Agents with stable interfaces](https://www.anthropic.com/research/managed-agents) | 2026-04-08 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S18 部署與架構](/stages/s18-deployment/) |
| [An update on Claude Code quality reports](https://www.anthropic.com/research/april-23-postmortem) | 2026-04-23 | [S18 部署與架構](/stages/s18-deployment/) |
| [How we contain Claude across products](https://www.anthropic.com/research/how-we-contain-claude) | 2026-05-25 | [S16 安全與治理](/stages/s16-security/) |
| [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory) | 2026-11-06 | [S13 Memory 與個人化](/stages/s13-memory/) |
| [Claude's Constitution](https://www.anthropic.com/constitution)（模型行為規範） | 2026-11-06（頁面顯示的更新日） | [S16 安全與治理](/stages/s16-security/) |
| [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)（官方文件） | — | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |

### OpenAI、Google / Kaggle、Meta

| 來源 | 日期 | 對應章節 |
|---|---|---|
| [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 2025（後續更新） | [S0 全局地圖](/stages/s00-big-picture/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| [OpenAI: Understanding prompt injections](https://openai.com/index/prompt-injections/) | 2025-11-07 | [S16 安全與治理](/stages/s16-security/) |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)（guardrails、handoffs、tracing） | — | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S15 Multi-agent](/stages/s15-multi-agent/)、[S16 安全與治理](/stages/s16-security/) |
| [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/) | — | [S15 Multi-agent](/stages/s15-multi-agent/) |
| [OpenAI: Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | 2026-02-23 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [OpenAI Model Spec](https://model-spec.openai.com/)（模型行為規範） | 持續更新（目前版本 2026-10-29） | [S16 安全與治理](/stages/s16-security/) |
| [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation) | 2025-02 | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/) |
| [Kaggle: Prompt Engineering](https://www.kaggle.com/whitepaper-prompt-engineering) | 2025-02 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Kaggle: Embeddings & Vector Stores](https://www.kaggle.com/whitepaper-embeddings-and-vector-stores) | 2025-02 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) | 2025 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| [Kaggle: Operationalizing Generative AI on Vertex AI using MLOps](https://www.kaggle.com/whitepaper-operationalizing-generative-ai-on-vertex-ai-using-mlops) | 2025（偏 Google Cloud） | [S18 部署與架構](/stages/s18-deployment/) |
| [Kaggle: Introduction to Agents](https://www.kaggle.com/whitepaper-introduction-to-agents) | 2025-11 | [S0 全局地圖](/stages/s00-big-picture/) |
| [Kaggle: Agent Tools & Interoperability with MCP](https://www.kaggle.com/whitepaper-agent-tools-and-interoperability-with-mcp) | 2025-11 | [S10 工具與 MCP](/stages/s10-tools-mcp/)、[S16 安全與治理](/stages/s16-security/) |
| [Kaggle: Context Engineering: Sessions & Memory](https://www.kaggle.com/whitepaper-context-engineering-sessions-and-memory) | 2025-11 | [S13 Memory 與個人化](/stages/s13-memory/) |
| [Kaggle: Agent Quality](https://www.kaggle.com/whitepaper-agent-quality) | 2025-11 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Kaggle: Prototype to Production](https://www.kaggle.com/whitepaper-prototype-to-production) | 2025-11 | [S18 部署與架構](/stages/s18-deployment/) |
| [Meta: Agents Rule of Two: A Practical Approach to AI Agent Security](https://ai.meta.com/blog/practical-ai-agent-security/) | 2025-10-31 | [S16 安全與治理](/stages/s16-security/) |

### 個人作者

| 來源 | 日期 | 對應章節 |
|---|---|---|
| [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | 2024-03-29 | [S8 Eval 方法論](/stages/s08-evals/) |
| [Hamel Husain: A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) | 2025-03-24 | [S8 Eval 方法論](/stages/s08-evals/) |
| [Hamel Husain: Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) | 2024-10-29 | [S8 Eval 方法論](/stages/s08-evals/) |
| [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/)（原 Evals FAQ） | 2026-09-18 | [S8 Eval 方法論](/stages/s08-evals/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | 2024-06 | [S0 全局地圖](/stages/s00-big-picture/)、[S8 Eval 方法論](/stages/s08-evals/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S17 產品與 AI UX](/stages/s17-ai-ux/)、[S18 部署與架構](/stages/s18-deployment/) |
| [Eugene Yan: Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) | 2023 | [S8 Eval 方法論](/stages/s08-evals/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) | 2023-06-23 | [S0 全局地圖](/stages/s00-big-picture/) |
| [Lilian Weng: Prompt Engineering](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/) | 2023-03-15 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) | 2024-11-28 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Lilian Weng: Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/) | 2025-05-01 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [Simon Willison: The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | 2025-06-16 | [S16 安全與治理](/stages/s16-security/) |
| [Graham Neubig: Don't Sleep on Single-Agent Systems](https://www.openhands.dev/blog/dont-sleep-on-single-agent-systems)（部落格，不是論文） | 2024-09-26 | [S15 Multi-agent](/stages/s15-multi-agent/) |
| [Jason Liu: Systematically Improving RAG Applications](https://jxnl.co/writing/2025/01/24/systematically-improving-rag-applications/) | 2025-01-24 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [Invariant Labs: MCP Security Notification: Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | 2025-04-01 | [S16 安全與治理](/stages/s16-security/) |
| [Drew Breunig: How Long Contexts Fail](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html) | 2025-06-22 | [S11 Context engineering](/stages/s11-context-engineering/) |
| [Drew Breunig: How to Fix Your Context](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html) | 2025-06-26 | [S11 Context engineering](/stages/s11-context-engineering/) |
| [Chroma: Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot)（向量資料庫廠商的研究） | 2025-07-14 | [S11 Context engineering](/stages/s11-context-engineering/) |
| [BAIR: The Shift from Models to Compound AI Systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/)（Zaharia et al.） | 2024-02-18 | [S0 全局地圖](/stages/s00-big-picture/) |
| [Chip Huyen: Building A Generative AI Platform](https://huyenchip.com/2024/07/25/genai-platform.html) | 2024-07-25 | [S18 部署與架構](/stages/s18-deployment/) |

### 安全標準

| 來源 | 對應章節 |
|---|---|
| [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) | [S16 安全與治理](/stages/s16-security/) |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | [S16 安全與治理](/stages/s16-security/) |
| [CVE-2025-32711 (EchoLeak)](https://www.cve.org/CVERecord?id=CVE-2025-32711) | [S16 安全與治理](/stages/s16-security/) |
| [EU AI Act（Regulation (EU) 2024/1689）](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)（2024-06-13） | [S16 安全與治理](/stages/s16-security/) |
| [行政院新聞稿：落實「人工智慧基本法」，成立「國家人工智慧戰略特別委員會」](https://www.ey.gov.tw/Page/9277F759E41CCD91/999df6da-6539-4941-913f-5125d684c58d)（2026-05-21） | [S16 安全與治理](/stages/s16-security/) |

## 官方文件與工具

API 文件、SDK、函式庫、模型卡、資料集、本地推論與評估工具。版本變動快，以當下文件為準。

### Claude API

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [Claude API: Messages](https://platform.claude.com/docs/en/api/messages) | 訊息結構 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | SSE 事件順序 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Errors](https://platform.claude.com/docs/en/api/errors) | 哪些錯誤該重試 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Rate limits](https://platform.claude.com/docs/en/api/rate-limits) | 速率限制 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | 計價 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | 批次 API | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | 推理模型參數與多輪傳回思考內容 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Claude API: Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) | 官方 prompt 寫法建議 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Claude API: Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | 結構化輸出 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Claude API: Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) | deferred loading 的官方實作 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [Claude API: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | 價格、最小長度、存活時間、usage 欄位 | [S11 Context engineering](/stages/s11-context-engineering/) |

### OpenAI API

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [OpenAI API: Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) | 串流事件 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [OpenAI API: Error codes](https://developers.openai.com/api/docs/guides/error-codes) | 錯誤碼 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [OpenAI API: Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) | 推理模型參數、計價 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [OpenAI API: Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | 結構化輸出 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [OpenAI API: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) | prompt caching | [S11 Context engineering](/stages/s11-context-engineering/) |

### MCP

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [MCP 規範 2026-07-28：Overview](https://modelcontextprotocol.io/specification/2026-07-28) | host / client / server、功能清單、安全原則 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP 規範：Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture) | 架構 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP 規範：Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) | 授權 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP 規範：Transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) | 傳輸層 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP 規範：Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) | 版本差異 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP: Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) | 安全實務；會轉到 2026-07-28 版 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | 官方 TS SDK | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | 官方 Python SDK | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [FastMCP](https://gofastmcp.com/) | Python MCP 框架 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | MCP server 測試工具 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| [modelcontextprotocol/ext-apps（MCP Apps）](https://github.com/modelcontextprotocol/ext-apps) | MCP server 提供 UI 的官方擴充；穩定版規範 2026-01-26 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [MCP-UI](https://mcpui.dev/) | MCP Apps 的前身社群專案與 SDK | [S17 產品與 AI UX](/stages/s17-ai-ux/) |

### SDK、框架與協定

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) | TS 的 LLM 呼叫抽象層 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) | 聊天介面 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) | 文字、工具呼叫、自訂資料一起串流 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) | 接 OpenTelemetry | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing) | mock 模型寫測試 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Ollama community provider](https://ai-sdk.dev/providers/community-providers/ollama) | 接本地模型 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) | 工具呼叫 → 元件 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [LiteLLM](https://docs.litellm.ai/docs/) | Python 多供應商統一介面 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [LiteLLM: Fallbacks](https://docs.litellm.ai/docs/proxy/reliability) | 供應商備援 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Instructor](https://python.useinstructor.com/) | 結構化輸出的驗證與重試 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [Outlines](https://github.com/dottxt-ai/outlines) | 本地模型的約束解碼 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [BAML](https://docs.boundaryml.com/home) | 用 DSL 定義 LLM 函式並產生 client | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [XGrammar](https://github.com/mlc-ai/xgrammar) | grammar 約束解碼引擎 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [DSPy](https://dspy.ai) | 把 LLM 程式寫成可最佳化的模組 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Gradio: ChatInterface](https://www.gradio.app/docs/gradio/chatinterface) | Python 的聊天介面元件：generator 串流、停止鍵、讚 / 倒讚；不寫前端時 A6 串流聊天與 trace 的介面 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Chainlit](https://docs.chainlit.io/) | Python 的對話式應用框架：串流、停止、回饋 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Streamlit: st.write_stream](https://docs.streamlit.io/develop/api-reference/write-magic/st.write_stream) | 在 Streamlit 頁面上串流顯示輸出 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Streamlit: st.feedback](https://docs.streamlit.io/develop/api-reference/widgets/st.feedback) | 讚 / 倒讚等回饋元件 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AG-UI Overview](https://docs.ag-ui.com/introduction) | agent 後端與前端之間的事件協定 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [Temporal: Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal) | durable execution 的概念 | [S18 部署與架構](/stages/s18-deployment/) |
| [github/spec-kit](https://github.com/github/spec-kit) | spec-driven development 的工具與流程 | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| [OpenClaw 文件](https://docs.openclaw.ai/) | 常駐個人 agent 的 gateway、channels、自動化設計 | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |

### 本地模型與推論

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [vLLM](https://github.com/vllm-project/vllm) | 生產級推論引擎原始碼 | [S5 推論與 serving](/stages/s05-inference/) |
| [Ollama API: Usage](https://docs.ollama.com/api/usage) | `prompt_eval_count`、`eval_duration` 等計時欄位。取代 GitHub 上的 `docs/api.md` | [S5 推論與 serving](/stages/s05-inference/) |
| [Ollama: OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) | 本地模型的 OpenAI 相容介面 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | 本地 HTTP 伺服器 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [mlx-lm](https://github.com/ml-explore/mlx-lm) | Apple Silicon 上跑 LLM | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [transformers.js](https://github.com/huggingface/transformers.js) | 瀏覽器內跑模型 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S9 檢索與 RAG](/stages/s09-rag/) |
| [WebLLM](https://github.com/mlc-ai/web-llm) | 瀏覽器內 LLM 推論引擎 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) | 瀏覽器內建模型 API | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |

### 訓練工具

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [Weights & Biases](https://docs.coreweave.com/products/wandb) | 實驗追蹤；有免費個人方案。文件已併入 CoreWeave | [S1 神經網路基礎](/stages/s01-neural-networks/)、模型線 |
| [Hugging Face TRL](https://huggingface.co/docs/trl) | SFT、DPO、GRPO trainer | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、模型線 |
| [Hugging Face PEFT](https://huggingface.co/docs/peft) | LoRA 等參數高效微調 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、模型線 |
| [Hugging Face: Chat templates](https://huggingface.co/docs/transformers/main/en/chat_templating) | 讀工具使用的段落 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |

### 模型與資料集

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [Qwen/Qwen3-0.6B-Base](https://huggingface.co/Qwen/Qwen3-0.6B-Base) | post-training 練習的起點 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [Ollama: qwen3](https://ollama.com/library/qwen3) | 本地跑 Qwen3 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [openai/gsm8k](https://huggingface.co/datasets/openai/gsm8k) | 數學題資料集；很可能已污染，只做相對比較 | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) | 小型指令模型；S5 推論與 serving 自己寫生成迴圈 | [S5 推論與 serving](/stages/s05-inference/) |
| [Qwen/Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) | 本機可跑的 embedding 模型 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3) | 多語 embedding 模型 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3) | 多語 reranker | [S9 檢索與 RAG](/stages/s09-rag/) |
| [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) | 選 embedding 模型的參考 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [tiny Shakespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt) | 約 1.1 MB 的英文純文字；S2 Transformer 與 decoding 必做題與 M2 tiny GPT 的訓練資料 | [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb) | 約 15T token 的清理過英文網頁資料；S3 Pretraining 與 scaling 延伸的大規模去重練習取它的樣本 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| [Salesforce/wikitext](https://huggingface.co/datasets/Salesforce/wikitext) | 維基百科文章；S3 Pretraining 與 scaling 必做題的去重文件來源 | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| [Qwen3-0.6B config.json](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json) | 推論計算器的驗算對象 | [S5 推論與 serving](/stages/s05-inference/) |
| [Spider](https://yale-lily.github.io/spider) | Text-to-SQL 資料集（200 個資料庫）；S9 檢索與 RAG 的 ○ Text2SQL 變體可以取它的子集 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [全國法規資料庫](https://law.moj.gov.tw/) | 繁中法規全文；S9 檢索與 RAG 必做題的文件集 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [LongMemEval](https://github.com/xiaowu0162/LongMemEval) | 長期記憶 eval 的資料與程式；論文 [Wu et al. 2024](https://arxiv.org/abs/2410.10813) | [S13 Memory 與個人化](/stages/s13-memory/) |
| [MultiHop-RAG](https://huggingface.co/datasets/yixuantt/MultiHopRAG) | 需要綜合多篇新聞才能回答的問答集；論文 [Tang & Yang 2024](https://arxiv.org/abs/2401.15391)；ODC-BY 授權 | [S15 Multi-agent](/stages/s15-multi-agent/) |
| [abisee/cnn_dailymail](https://huggingface.co/datasets/abisee/cnn_dailymail) | 英文新聞與摘要；S8 Eval 方法論必做題的英文替代資料（版本 3.0.0） | [S8 Eval 方法論](/stages/s08-evals/) |
| [goodbooks-10k](https://github.com/zygmuntz/goodbooks-10k) | 一萬本書的書目與評分；S10 工具與 MCP 必做題的資料 | [S10 工具與 MCP](/stages/s10-tools-mcp/) |

### RAG 與檢索

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [Sentence Transformers](https://www.sbert.net/) | embedding 與 cross-encoder | [S9 檢索與 RAG](/stages/s09-rag/) |
| [Sentence Transformers: Training Overview](https://www.sbert.net/docs/sentence_transformer/training_overview.html) | embedding 微調的官方教學 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [SQLite FTS5](https://www.sqlite.org/fts5.html) | BM25 全文檢索；中文用 trigram 或先斷詞 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [jieba](https://github.com/fxsjy/jieba) | Python 的中文斷詞套件 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | SQLite 向量搜尋擴充 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [LanceDB](https://docs.lancedb.com/) | 嵌入式向量資料庫 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [unpdf](https://github.com/unjs/unpdf) | JS 的 PDF 文字擷取 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [Docling](https://github.com/docling-project/docling) | 複雜版面文件解析 | [S9 檢索與 RAG](/stages/s09-rag/) |
| [Ragas](https://docs.ragas.io/) | RAG 評估指標定義 | [S8 Eval 方法論](/stages/s08-evals/)、[S9 檢索與 RAG](/stages/s09-rag/) |

### 評估、測試與觀測

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) | LLM 呼叫的 trace 欄位標準；仍在 Development 狀態 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [OpenLLMetry](https://github.com/traceloop/openllmetry) | 基於 OpenTelemetry 的 LLM 觀測 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Langfuse](https://github.com/langfuse/langfuse) | 開源 LLM trace 與 eval 平台 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Phoenix](https://github.com/arize-ai/phoenix) | 開源 LLM 觀測與評估 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Jaeger](https://www.jaegertracing.io/) | 純 tracing 後端 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [MSW (Mock Service Worker)](https://mswjs.io/) | TS 的 API mock | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [httpx](https://github.com/encode/httpx) | Python HTTP client | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [respx](https://github.com/lundberg/respx) | mock httpx | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [pytest-recording](https://github.com/kiwicom/pytest-recording) | 基於 VCR.py 的 record / replay | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [promptfoo](https://www.promptfoo.dev/docs/intro/) | eval runner | [S8 Eval 方法論](/stages/s08-evals/) |
| [`scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) | bootstrap 信賴區間 | [S8 Eval 方法論](/stages/s08-evals/) |
| [AgentDojo](https://github.com/ethz-spylab/agentdojo) | prompt injection 攻防的評估環境；論文 [Debenedetti et al. 2024](https://arxiv.org/abs/2406.13352)。S16 安全與治理的必做題借用它的注入模板 | [S16 安全與治理](/stages/s16-security/) |

### Web 與 API 基礎

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | SSE 格式本身 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [AWS Builder Center: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) | 重試與退避的工程實務 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) | idempotency key 的設計 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
| [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) | draft-08，尚未成為 RFC | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |

## 論文

各章延伸閱讀引用的論文都列在這裡。

| 論文 | 對應章節 |
|---|---|
| Vaswani et al. 2017, [Attention Is All You Need](https://arxiv.org/abs/1706.03762) | [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| Lewis et al. 2020, [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Kwon et al. 2023, [Efficient Memory Management for LLM Serving with PagedAttention](https://arxiv.org/abs/2309.06180) | [S5 推論與 serving](/stages/s05-inference/) |
| Yao et al. 2023, [ReAct](https://arxiv.org/abs/2210.03629) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| Shao et al. 2024, [DeepSeekMath](https://arxiv.org/abs/2402.03300)（GRPO） | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Rafailov et al. 2023, [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Sumers et al. 2023, [Cognitive Architectures for Language Agents (CoALA)](https://arxiv.org/abs/2309.02427) | [S13 Memory 與個人化](/stages/s13-memory/) |
| Kapoor et al. 2024, [AI Agents That Matter](https://arxiv.org/abs/2407.01502) | [S0 全局地圖](/stages/s00-big-picture/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Miller 2024, [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) | [S8 Eval 方法論](/stages/s08-evals/) |
| Liu et al. 2023, [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) | [S9 檢索與 RAG](/stages/s09-rag/)、[S11 Context engineering](/stages/s11-context-engineering/) |
| Sclar et al. 2023, [Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design](https://arxiv.org/abs/2310.11324) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| Yang et al. 2024, [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793) | [S10 工具與 MCP](/stages/s10-tools-mcp/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Yao et al. 2024, [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) | [S8 Eval 方法論](/stages/s08-evals/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Welleck et al. 2024, [From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S5 推論與 serving](/stages/s05-inference/) |
| Shankar et al. 2024, [Who Validates the Validators?](https://arxiv.org/abs/2404.12272) | [S8 Eval 方法論](/stages/s08-evals/) |
| Cemri et al. 2025, [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) | [S15 Multi-agent](/stages/s15-multi-agent/) |
| Kwa et al. 2025, [Measuring AI Ability to Complete Long Tasks](https://arxiv.org/abs/2503.14499)（METR time horizon） | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Opsahl-Ong et al. 2024, [MIPROv2](https://arxiv.org/abs/2406.11695) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Agrawal et al. 2025, [GEPA](https://arxiv.org/abs/2507.19457) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Beurer-Kellner et al. 2025, [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | [S16 安全與治理](/stages/s16-security/) |
| Debenedetti et al. 2025, [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) | [S16 安全與治理](/stages/s16-security/) |
| Nasr et al. 2025, [The Attacker Moves Second](https://arxiv.org/abs/2510.09023) | [S16 安全與治理](/stages/s16-security/) |
| Kaplan et al. 2020, [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| Hoffmann et al. 2022, [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| Wei et al. 2022, [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| Schaeffer et al. 2023, [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| Rajbhandari et al. 2019, [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) | [S3 Pretraining 與 scaling](/stages/s03-pretraining/) |
| Lambert et al. 2024, [Tulu 3: Pushing Frontiers in Open Language Model Post-Training](https://arxiv.org/abs/2411.15124) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Zhou et al. 2023, [LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Hu et al. 2021, [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Dettmers et al. 2023, [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Wang et al. 2022, [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Lightman et al. 2023, [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Yu et al. 2025, [DAPO: An Open-Source LLM Reinforcement Learning System at Scale](https://arxiv.org/abs/2503.14476) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Zheng et al. 2025, [Group Sequence Policy Optimization](https://arxiv.org/abs/2507.18071) | [S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| Yu et al. 2022, [Orca: A Distributed Serving System for Transformer-Based Generative Models](https://www.usenix.org/conference/osdi22/presentation/yu)（Orca，OSDI '22） | [S5 推論與 serving](/stages/s05-inference/) |
| Zheng et al. 2023, [SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104) | [S5 推論與 serving](/stages/s05-inference/) |
| Dao et al. 2022, [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135) | [S5 推論與 serving](/stages/s05-inference/) |
| Leviathan et al. 2022, [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) | [S5 推論與 serving](/stages/s05-inference/) |
| Zhao et al. 2021, [Calibrate Before Use: Improving Few-Shot Performance of Language Models](https://arxiv.org/abs/2102.09690) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| Wei et al. 2022, [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| Tam et al. 2024, [Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models](https://arxiv.org/abs/2408.02442) | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| Zheng et al. 2023, [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) | [S8 Eval 方法論](/stages/s08-evals/) |
| Chen et al. 2021, [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) | [S8 Eval 方法論](/stages/s08-evals/) |
| Bean et al. 2025, [Measuring what Matters: Construct Validity in Large Language Model Benchmarks](https://arxiv.org/abs/2511.04703) | [S8 Eval 方法論](/stages/s08-evals/) |
| Kadavath et al. 2022, [Language Models (Mostly) Know What They Know](https://arxiv.org/abs/2207.05221) | [S8 Eval 方法論](/stages/s08-evals/) |
| Karpukhin et al. 2020, [Dense Passage Retrieval for Open-Domain Question Answering](https://arxiv.org/abs/2004.04906) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Khattab & Zaharia 2020, [ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT](https://arxiv.org/abs/2004.12832) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Malkov & Yashunin 2016, [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Gao et al. 2022, [Precise Zero-Shot Dense Retrieval without Relevance Labels](https://arxiv.org/abs/2212.10496) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Asai et al. 2023, [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](https://arxiv.org/abs/2310.11511) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Gao et al. 2023, [Enabling Large Language Models to Generate Text with Citations](https://arxiv.org/abs/2305.14627) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Hsieh et al. 2024, [RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Greshake et al. 2023, [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) | [S9 檢索與 RAG](/stages/s09-rag/) |
| Schick et al. 2023, [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761) | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| Patil et al. 2023, [Gorilla: Large Language Model Connected with Massive APIs](https://arxiv.org/abs/2305.15334) | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| Wang et al. 2024, [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030) | [S10 工具與 MCP](/stages/s10-tools-mcp/) |
| Jiang et al. 2023, [LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression](https://arxiv.org/abs/2310.06839) | [S11 Context engineering](/stages/s11-context-engineering/) |
| Shinn et al. 2023, [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| Packer et al. 2023, [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) | [S13 Memory 與個人化](/stages/s13-memory/) |
| Park et al. 2023, [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) | [S13 Memory 與個人化](/stages/s13-memory/) |
| Maharana et al. 2024, [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://arxiv.org/abs/2402.17753) | [S13 Memory 與個人化](/stages/s13-memory/) |
| Chen et al. 2024, [AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases](https://arxiv.org/abs/2407.12784) | [S13 Memory 與個人化](/stages/s13-memory/) |
| [Agent-as-a-Judge: Evaluate Agents with Agents](https://arxiv.org/abs/2410.10934) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [$τ^2$-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [SABER: Small Actions, Big Errors -- Safeguarding Mutating Steps in LLM Agents](https://arxiv.org/abs/2512.07850) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning](https://arxiv.org/abs/2503.09516) | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| Wu et al. 2023, [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](https://arxiv.org/abs/2308.08155) | [S15 Multi-agent](/stages/s15-multi-agent/) |
| Shao et al. 2024, [PrivacyLens: Evaluating Privacy Norm Awareness of Language Models in Action](https://arxiv.org/abs/2409.00138) | [S16 安全與治理](/stages/s16-security/) |
| Greenblatt et al. 2023, [AI Control: Improving Safety Despite Intentional Subversion](https://arxiv.org/abs/2312.06942) | [S16 安全與治理](/stages/s16-security/) |
| Korbak et al. 2025, [Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://arxiv.org/abs/2507.11473) | [S16 安全與治理](/stages/s16-security/) |
| Ong et al. 2024, [RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) | [S18 部署與架構](/stages/s18-deployment/) |
| Chen et al. 2023, [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) | [S18 部署與架構](/stages/s18-deployment/) |
| Xia et al. 2024, [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/abs/2407.01489) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Wang et al. 2024, [OpenHands: An Open Platform for AI Software Developers as Generalist Agents](https://arxiv.org/abs/2407.16741) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| Wei et al. 2025, [BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents](https://arxiv.org/abs/2504.12516) | [S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |

## 中文資源

### 繁體中文

| 來源 | 定位 | 對應章節 |
|---|---|---|
| 李宏毅、陳縕儂、高宏宇課程 | 見上方「大學課程」 | — |
| [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM) | 繁中模型 repo；README 提到的 TMLU、TMMLU+、TCEval 可作繁中評測參考（是模型 repo，不是教材） | [S8 Eval 方法論](/stages/s08-evals/) |
| [iThome 2025〈團隊 AI 運維手冊：System Prompt 的設計、部署與維護〉](https://ithelp.ithome.com.tw/users/20178160/ironman/8461) | prompt 當作團隊資產管理 | [S7 Prompt、structured output 與 workflows](/stages/s07-prompting/) |
| [iThome 2025〈AI 產品與架構設計之旅：從 0 到 1，再到 Day 2〉](https://ithelp.ithome.com.tw/users/20178352/ironman/8789) | 產品與架構實戰 | [S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [iThome 2025〈30 天帶你實戰 LLMOps：從 RAG 到觀測與部署〉](https://ithelp.ithome.com.tw/users/20120069/ironman/8557) | LLMOps、觀測、部署 | [S18 部署與架構](/stages/s18-deployment/) |
| [iThome 2025〈前端工程師的AI應用開發實戰：30天從Prompt到Production〉](https://ithelp.ithome.com.tw/users/20129072/ironman/8834) | 前端視角的 AI 應用 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/)、[S17 產品與 AI UX](/stages/s17-ai-ux/) |
| [iThome 2026〈AI Agent 上線要想清楚的事：30 天拆解 Harness 的設計取捨〉](https://ithelp.ithome.com.tw/users/20150750/ironman/9868) | harness 設計取捨；Day 1 發表於 2026-09-15 | [S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [iThome 2026〈Day 4 甚麼是 Context Engineering〉](https://ithelp.ithome.com.tw/articles/10404121) | context engineering 入門；單篇文章，2026-08-23 | [S11 Context engineering](/stages/s11-context-engineering/) |

iThome 系列是實作者的 30 天連載，品質不一。上表列的是得獎或主題高度相關的系列，建議當成輔助讀物，不要當主教材。

### 簡體中文

| 來源 | 定位 | 對應章節 |
|---|---|---|
| [RUC《大语言模型》](https://llmbook-zh.github.io/) | 大學教科書，免費 PDF；agent 與應用部分較舊 | [S0 全局地圖](/stages/s00-big-picture/)、[S3 Pretraining 與 scaling](/stages/s03-pretraining/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/) |
| [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) | CS336 中文版；Part II 模型原理（S1–S5）最好的中文搭配 | [S2 Transformer 與 decoding](/stages/s02-transformer/) 到 [S5 推論與 serving](/stages/s05-inference/)、[S8 Eval 方法論](/stages/s08-evals/) |
| [datawhalechina/happy-llm](https://github.com/datawhalechina/happy-llm) | 從零建 LLM；第 8 章 agentic RL 很深 | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [ZJU-LLMs/Foundations-of-LLMs](https://github.com/ZJU-LLMs/Foundations-of-LLMs) | 浙大《大模型基础》；有 model editing 專章 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S7 Prompt、structured output 與 workflows](/stages/s07-prompting/)、[S9 檢索與 RAG](/stages/s09-rag/) |
| [Lordog/dive-into-llms](https://github.com/Lordog/dive-into-llms) | 上海交大《动手学大模型》；安全相關 lab 多 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S16 安全與治理](/stages/s16-security/) |
| [datawhalechina/tiny-universe](https://github.com/datawhalechina/tiny-universe) | TinyTransformer / TinyEval / TinyRAG / TinyAgent 最小實作 | [S2 Transformer 與 decoding](/stages/s02-transformer/)、[S8 Eval 方法論](/stages/s08-evals/)、[S9 檢索與 RAG](/stages/s09-rag/)、[S12 Agent loop 與 harness](/stages/s12-agent-harness/) |
| [datawhalechina/zero-to-sglang](https://github.com/datawhalechina/zero-to-sglang) | SGLang 官方合作課程，自己寫推論伺服器。該課程的第三部分尚未完成 | [S5 推論與 serving](/stages/s05-inference/)、[S18 部署與架構](/stages/s18-deployment/) |
| [datawhalechina/all-in-rag](https://github.com/datawhalechina/all-in-rag) | S9 檢索與 RAG 最好的中文教材；偏 Milvus | [S9 檢索與 RAG](/stages/s09-rag/) |
| [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) | 從零建 agent 的完整教材；context engineering、memory、agentic RL 深。偏中國技術棧 | [S11 Context engineering](/stages/s11-context-engineering/) 到 [S15 Multi-agent](/stages/s15-multi-agent/) |
| [datawhalechina/agentic-rl-lab](https://github.com/datawhalechina/agentic-rl-lab) | GRPO 變體、Search-R1、ReTool 可執行重現 | [S14 Agent eval、資料與最佳化](/stages/s14-agent-evals/) |
| [datawhalechina/base-llm](https://github.com/datawhalechina/base-llm) | 含安全與威脅建模、部署；有一章是廠商 API 教學 | [S16 安全與治理](/stages/s16-security/)、[S18 部署與架構](/stages/s18-deployment/) |
| [datawhalechina/deepagents-in-action](https://github.com/datawhalechina/deepagents-in-action) | harness 主題地圖完整；綁 LangChain | [S12 Agent loop 與 harness](/stages/s12-agent-harness/)、[S13 Memory 與個人化](/stages/s13-memory/)、[S15 Multi-agent](/stages/s15-multi-agent/) |
| [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) | 17 課從零手寫 Claude Code 式 harness；S12 Agent loop 與 harness 的主教材。以根目錄的 s01–s17 為準，舊的 `docs/` 資料夾編號不同 | [S10 工具與 MCP](/stages/s10-tools-mcp/) 到 [S15 Multi-agent](/stages/s15-multi-agent/)、[S19 真實 agent 系統與畢業專題](/stages/s19-capstone/) |
| [d2l-zh 動手學深度學習](https://github.com/d2l-ai/d2l-zh) | 深度學習基礎；2024 後未更新 | [S1 神經網路基礎](/stages/s01-neural-networks/) 到 [S2 Transformer 與 decoding](/stages/s02-transformer/) |
| [youngyangyang04/llm-master](https://github.com/youngyangyang04/llm-master) | LLM 全端學習路線；工程驗收標準可參考。含付費訓練營與代儲值連結，求職導向重 | [S18 部署與架構](/stages/s18-deployment/) |
| [datawhalechina/self-llm](https://github.com/datawhalechina/self-llm) | 各模型的微調與部署食譜 | [S4 Post-training 與 reasoning](/stages/s04-post-training/)、[S18 部署與架構](/stages/s18-deployment/) |
| [datawhalechina/llm-cookbook](https://github.com/datawhalechina/llm-cookbook) | 吳恩達系列短課的中文版；〈Building Systems with the ChatGPT API〉可當 API 入門暖身。2025-06 後未更新 | [S6 LLM API 與應用基本功](/stages/s06-llm-api/) |
