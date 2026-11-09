---
title: Concept Index
description: Where each concept in the AI/LLM roadmap is first taught, and which later chapters take it further.
sidebar:
  order: 3
---

Each concept has one introductory chapter; later chapters build on it. The application route previews model concepts in the [Model Crash Course](/en/guide/app-first/#model-crash-course), so you can skip Part I. The table marks these previews. Chapter references use "(← S2 Transformers and Decoding)" for prior explanations and "(→ S16 Security and Governance)" for later detail.

Use this index to find a concept's chapter. The chain rule, softmax, log plots, standard error, bootstrap and cosine similarity are collected separately in the [Math Refresher](/en/guide/math-refresher/), with section links in the relevant rows. See [How to read the codes](/en/guide/how-to-use/#how-to-read-the-codes) for the labels before chapter titles.

## Models

| Concept | First taught | Deepened in |
|---|---|---|
| Backprop, optimizers, initialization and regularization ([Math Refresher: chain rule](/en/guide/math-refresher/#the-chain-rule-and-backprop)) | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Experiment tracking (W&B) | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) | — |
| Perplexity ([Math Refresher: log scales](/en/guide/math-refresher/#log-scales-and-loglog-plots)) | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| Word embedding (word2vec) | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) (○) | — |
| Tokenization / BPE | [S2 Transformers and Decoding](/en/stages/s02-transformer/) (application route: previewed in the Model Crash Course) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (token pricing) |
| Attention, the Transformer block | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Causal mask (what happens to training and generation without it) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | — |
| Decoding / sampling (temperature, top-p; [Math Refresher: softmax](/en/guide/math-refresher/#logits-softmax-and-temperature)) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S5 Inference and Serving](/en/stages/s05-inference/), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Limits on sampling parameters](/en/stages/s06-llm-api/#limits-on-sampling-parameters) (some APIs reject temperature, top_p, top_k) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) ([S2 Transformers and Decoding](/en/stages/s02-transformer/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/) and the Model Crash Course mention it first and link here) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| RoPE, GQA / MLA, MoE | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| MoE compute and memory (compute follows active parameters, memory follows total parameters) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | — |
| Resource accounting (parameters, FLOPs, memory) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| Quantization concepts | [S2 Transformers and Decoding](/en/stages/s02-transformer/) | [S5 Inference and Serving](/en/stages/s05-inference/) (implementation), [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (GGUF / local models), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Multimodal architectures | [S2 Transformers and Decoding](/en/stages/s02-transformer/) (○) | [S9 Retrieval and RAG](/en/stages/s09-rag/) (document parsing), [S10 Tools and MCP](/en/stages/s10-tools-mcp/) (computer use) |
| Data engineering (filtering, deduplication, PII) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (synthetic data) |
| Scaling laws, emergence ([Math Refresher: log–log plots](/en/guide/math-refresher/#log-scales-and-loglog-plots)) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) | — |
| Parallel training | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) | — |
| SFT, LoRA | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S9 Retrieval and RAG](/en/stages/s09-rag/) (embedding fine-tuning) |
| Chat template | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) (application route: previewed in the Model Crash Course) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) (what tool calls look like underneath) |
| RL basics, RLHF, DPO (including DPO's limits: offline learning, no exploration) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (agentic RL) |
| GRPO / RLVR, reasoning models | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (using them in applications) |
| Test-time compute, verifiers | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Reward hacking, sycophancy | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S13 Memory and Personalization](/en/stages/s13-memory/) (personalization that panders), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (optimization that games the metric) |
| Synthetic data and distillation | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) | [S8 Evals Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (router distillation) |
| A mental model of the GPU | [S5 Inference and Serving](/en/stages/s05-inference/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Prefill / decode, KV cache | [S5 Inference and Serving](/en/stages/s05-inference/) ([S0 AI Systems Overview](/en/stages/s00-big-picture/) and the Model Crash Course preview it) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S11 Context Engineering](/en/stages/s11-context-engineering/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Continuous batching, PagedAttention | [S5 Inference and Serving](/en/stages/s05-inference/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| TTFT / TPOT / goodput | [S5 Inference and Serving](/en/stages/s05-inference/) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) (measuring TTFT), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Prompt caching (KV prefix reuse) | [S5 Inference and Serving](/en/stages/s05-inference/) (application route: previewed in the Model Crash Course, taught mainly in [S11 Context Engineering](/en/stages/s11-context-engineering/)) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| How constrained decoding works | [S5 Inference and Serving](/en/stages/s05-inference/) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| A map of speedups (FlashAttention, speculative decoding) | [S5 Inference and Serving](/en/stages/s05-inference/) | — |

## Applications

| Concept | First taught | Deepened in |
|---|---|---|
| Messages / roles, token pricing | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S8 Evals Methodology](/en/stages/s08-evals/) (cost accounting) |
| Streaming (SSE, partial JSON) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Retries, rate limits, idempotency | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Cancellation and interruption | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Using reasoning models in applications (thinking budget, interleaved thinking) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Collecting feedback (minimal version: thumbs up / down) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Local and small models | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Ollama's context length](/en/stages/s06-llm-api/#context-length-in-ollama) (the default may be only 4K; beyond it, earlier content is dropped) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) ([S5 Inference and Serving](/en/stages/s05-inference/) mentions it first and links here) | Later chapters link here whenever they give tips on local models |
| Tracing (OpenTelemetry GenAI) | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S8 Evals Methodology](/en/stages/s08-evals/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Testing nondeterministic code | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | [S8 Evals Methodology](/en/stages/s08-evals/) |
| Prompt structure, few-shot, CoT | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | — |
| Prompt sensitivity | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | — |
| Structured output, function calling | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S13 Memory and Personalization](/en/stages/s13-memory/) (memory extraction) |
| Prompts as code, migrating across models | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| The five workflow patterns | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) (orchestrator-worker), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Multimodal input (feeding images and PDFs to the model directly) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) (○) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Error analysis (open / axial coding) | [S8 Evals Methodology](/en/stages/s08-evals/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) (the MAST failure taxonomy) |
| LLM-as-judge and calibration | [S8 Evals Methodology](/en/stages/s08-evals/) | [S13 Memory and Personalization](/en/stages/s13-memory/) (the pairwise judge in step 0 of A13 Layered Memory, for evaluating personalization), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (agent-as-judge) |
| Capability vs regression evals, pass@k / pass^k | [S8 Evals Methodology](/en/stages/s08-evals/) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Benchmark contamination and construct validity | [S8 Evals Methodology](/en/stages/s08-evals/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Error bars, bootstrap confidence intervals ([Math Refresher: standard error](/en/guide/math-refresher/#mean-variance-and-standard-error), [bootstrap](/en/guide/math-refresher/#bootstrap-confidence-intervals); used once earlier in S4 Post-training and Reasoning) | [S8 Evals Methodology](/en/stages/s08-evals/) | [S9 Retrieval and RAG](/en/stages/s09-rag/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Sample size planning (statistical power) | [S8 Evals Methodology](/en/stages/s08-evals/) (○) | — |
| Multiple comparisons (Bonferroni) | [S8 Evals Methodology](/en/stages/s08-evals/) (○) | — |
| Inter-annotator agreement (Cohen's κ) | [S8 Evals Methodology](/en/stages/s08-evals/) (○) | — |
| Cost accounting (cost per task, budgets) | [S8 Evals Methodology](/en/stages/s08-evals/) | [S13 Memory and Personalization](/en/stages/s13-memory/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| Uncertainty (logprobs, calibration) | [S8 Evals Methodology](/en/stages/s08-evals/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) (per-item uncertainty signals and how to show them, step 0 of A17 Complete Frontend), [S18 Deployment and Architecture](/en/stages/s18-deployment/) (cascades) |
| Calibration metrics (ECE, Brier score) | [S8 Evals Methodology](/en/stages/s08-evals/) (○) | — |
| Document parsing, OCR | [S9 Retrieval and RAG](/en/stages/s09-rag/) | — |
| Embeddings, vector search, hybrid search, reranking ([Math Refresher: cosine similarity](/en/guide/math-refresher/#dot-product-and-cosine-similarity)) | [S9 Retrieval and RAG](/en/stages/s09-rag/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) (compared with agentic search) |
| Retrieval eval vs generation eval | [S9 Retrieval and RAG](/en/stages/s09-rag/) | — |
| Long context vs RAG | [S9 Retrieval and RAG](/en/stages/s09-rag/) | [S11 Context Engineering](/en/stages/s11-context-engineering/), [S13 Memory and Personalization](/en/stages/s13-memory/) (the memory baseline) |
| Choosing between prompting, RAG and fine-tuning | [S9 Retrieval and RAG](/en/stages/s09-rag/) (the Model Crash Course first previews what fine-tuning can do) | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| Text2SQL | [S9 Retrieval and RAG](/en/stages/s09-rag/) (○) | — |
| Indirect prompt injection 🔒 | [S9 Retrieval and RAG](/en/stages/s09-rag/) | [S13 Memory and Personalization](/en/stages/s13-memory/), [S16 Security and Governance](/en/stages/s16-security/) |
| Tool design and risk tiers | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S16 Security and Governance](/en/stages/s16-security/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) (confirmation UI) |
| MCP (transports, auth) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | [S16 Security and Governance](/en/stages/s16-security/) (supply chain), [S17 Product and AI UX](/en/stages/s17-ai-ux/) (MCP Apps) |
| stdio MCP server (core; the HTTP version with OAuth is in the advanced exercise) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | — |
| Tool search / deferred loading | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| Code execution as a tool interface | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | — |
| Agent-computer interface (ACI) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Sandbox, egress 🔒 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S16 Security and Governance](/en/stages/s16-security/) |
| Context budgets and failure modes | [S11 Context Engineering](/en/stages/s11-context-engineering/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| Progressive disclosure | [S11 Context Engineering](/en/stages/s11-context-engineering/) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) (skills) |

## Agent systems

| Concept | First taught | Deepened in |
|---|---|---|
| Compound AI, the augmented LLM, workflow vs agent | [S0 AI Systems Overview](/en/stages/s00-big-picture/) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Agent levels 0–4 | [S0 AI Systems Overview](/en/stages/s00-big-picture/) | — |
| The agent loop, ReAct (S0 AI Systems Overview previews it with mini-SWE-agent) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Harness components | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) (ablation), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Permission modes, hooks 🔒 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S16 Security and Governance](/en/stages/s16-security/) |
| Stop conditions, escalating to a human, HITL | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Checkpoint / resume | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) (durable execution), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Compaction, context reset, sub-agent isolation | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S13 Memory and Personalization](/en/stages/s13-memory/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) (sub-agent isolation), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Skills | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S13 Memory and Personalization](/en/stages/s13-memory/) (procedural memory), [S16 Security and Governance](/en/stages/s16-security/) (supply chain) |
| Agentic search | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| Long-running patterns (initializer / worker, generator–evaluator) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | — |
| Memory types and hierarchy | [S13 Memory and Personalization](/en/stages/s13-memory/) | — |
| Personalization | [S13 Memory and Personalization](/en/stages/s13-memory/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) (interface) |
| Memory poisoning 🔒 | [S13 Memory and Personalization](/en/stages/s13-memory/) | [S16 Security and Governance](/en/stages/s16-security/) |
| Trajectory evals, simulated users | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Infra noise, benchmark hygiene | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Prompt optimization (DSPy, GEPA) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | — |
| Logging routing decisions and router distillation (← the routing workflow in [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/)) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) (model routing) |
| Data flywheel | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) (feedback UI) |
| Multi-agent architectures and token economics | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Deep research architecture | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Workspace / worktree isolation | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) | — |

## Trust, product, shipping

| Concept | First taught | Deepened in |
|---|---|---|
| Lethal trifecta, threat modeling | [S16 Security and Governance](/en/stages/s16-security/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) (audit) |
| Structural defense design patterns | [S16 Security and Governance](/en/stages/s16-security/) | — |
| Guardrails, approval fatigue | [S16 Security and Governance](/en/stages/s16-security/) | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| Data governance and regulation | [S16 Security and Governance](/en/stages/s16-security/) | — |
| Agentic UX, generative UI | [S17 Product and AI UX](/en/stages/s17-ai-ux/) | — |
| Feedback design | [S17 Product and AI UX](/en/stages/s17-ai-ux/) | — |
| Proactive agents | [S17 Product and AI UX](/en/stages/s17-ai-ux/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Model routing and cascades (← the routing workflow in [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/); router distillation in [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/)) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | — |
| Eval-gated CI/CD, canaries | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | — |
| Multi-tenant isolation | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | — |
| Gateways, caches (exact / semantic; prompt caching ← S5 Inference and Serving) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | — |
| Durable execution | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
