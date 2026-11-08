---
title: Sources
description: Every course, book, article and repo this AI/LLM roadmap cites, with what each is for, its slant and its date.
sidebar:
  order: 1
---

Every course, book, article and repo this roadmap cites is listed here, each with what it is for, its slant and its date.

- **Maintenance**: this field moves fast, so the list is checked once a quarter. If a link is broken or the content is out of date, please report it or open a PR
- **Chapters**: the Chapters column lists which chapters each resource goes with; for how to read the codes before the chapter titles, see [How to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)
- **Language**: entries marked *(in Chinese)* are in Chinese; everything else is in English

---

## University courses

| Course | What it's for | Chapters |
|---|---|---|
| [Stanford CS 329Z Engineering AI Agents](https://cs329z.stanford.edu/) (Fall 2026) | The most complete course on agent systems, with papers for every lecture. Slides are released as the course runs (up to lecture 13 when checked); recordings are Stanford-internal only | [S0 The Big Picture](/en/stages/s00-big-picture/), [S9 Retrieval and RAG](/en/stages/s09-rag/) to [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| [CMU 11-768 AI Agents](https://www.cmu-agents.com/) (Neubig, Fried, Fall 2026) | Assignments go harness → eval → training, the closest match to this roadmap | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) to [S16 Security and Governance](/en/stages/s16-security/) |
| [Stanford CS336 Language Modeling from Scratch](https://cs336.stanford.edu/) | Builds a language model from scratch; the deepest treatment of theory, training and inference | [S2 Transformers and Decoding](/en/stages/s02-transformer/) to [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Stanford CS224N](https://web.stanford.edu/class/cs224n/) (Winter 2026) | The classic introduction from NLP to LLMs; assignment 4 is LLM evaluation | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) to [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S8 Eval Methodology](/en/stages/s08-evals/) |
| [CMU 11-711 Advanced NLP](https://cmu-l3.github.io/anlp-spring2026/) (Welleck) | Assignment 1 is Build Your Own LLaMa; includes lectures on RL basics | [S2 Transformers and Decoding](/en/stages/s02-transformer/) to [S5 Inference and Serving](/en/stages/s05-inference/) |
| [CMU 11-766 LLM Applications](https://cmu-llms.org/schedule/) | Application side: prompt sensitivity, deep research, attacking LLM applications | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S16 Security and Governance](/en/stages/s16-security/) |
| [CMU 15-442 ML Systems](https://mlsyscourse.org/schedule) | GPUs, parallelism, serving | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| [CMU 11-868 LLM Systems](https://llmsystem.github.io/llmsystem2026spring/docs/Syllabus) | Serving systems such as FlashAttention, vLLM and DistServe | [S5 Inference and Serving](/en/stages/s05-inference/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [MIT 6.5940 TinyML and Efficient AI](https://hanlab.mit.edu/courses/2024-fall-65940) | Quantization, distillation; has a lab on deploying an LLM on a laptop | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Stanford CS329A Self-Improving AI Agents](https://cs329a.stanford.edu/) | Test-time compute, verifiers, self-improvement | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Stanford CS329H ML from Human Preferences](https://web.stanford.edu/class/cs329h/) | Theory of preference learning (Bradley–Terry and more); optional | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [Stanford CS 224G Building & Scaling LLM Applications](https://web.stanford.edu/class/cs224g/) | Startup-oriented; two lectures on context engineering, plus the product side | [S11 Context Engineering](/en/stages/s11-context-engineering/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Stanford CS146S The Modern Software Developer](https://themodernsoftware.dev/) | Working with coding agents: MCP, skills, spec-driven development | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| [Stanford CS25 Transformers United V6](https://web.stanford.edu/class/cs25/) | Seminar series; Frye (Modal) on production serving | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Berkeley LLM Agents MOOC F24](https://llmagents-learning.org/f24), [Advanced LLM Agents Sp25](https://rdi.berkeley.edu/adv-llm-agents/sp25), [Agentic AI F25](https://agenticai-learning.org/f25) | Strong lineup of speakers; recordings are public | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) to [S16 Security and Governance](/en/stages/s16-security/) |
| [Buffalo CSE 410/510 Agentic Engineering](https://cse.buffalo.edu/courses/cse410/2026_fall/cse410ae/) | Pairs a math thread with each week; useful lab designs | [S9 Retrieval and RAG](/en/stages/s09-rag/) to [S16 Security and Governance](/en/stages/s16-security/) |
| [Leiden Agentic LLMs](https://agenticllms.liacs.nl/syllabus) | Social behavior in multi-agent systems, Theory of Mind | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [Harvard CS 2881R AI Safety](https://boazbk.github.io/mltheoryseminar/) (Fall 2026) | Reward hacking, model specs, interpretability | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S16 Security and Governance](/en/stages/s16-security/) |
| [Princeton COS 597R](https://princeton-cos597r.github.io), [COS 598A AI Safety](https://princeton-polaris-lab.github.io/ai-safety-course) | Data curation; classic jailbreak papers, safety cases | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S16 Security and Governance](/en/stages/s16-security/) |
| [NTU Hung-yi Lee, Introduction to Generative AI 2024](https://speech.ee.ntu.edu.tw/~hylee/genai/2024-spring.php) *(in Chinese)* | Videos in Traditional Chinese; explains the principles top-down | [S0 The Big Picture](/en/stages/s00-big-picture/) to [S5 Inference and Serving](/en/stages/s05-inference/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S16 Security and Governance](/en/stages/s16-security/) |
| [NTU Hung-yi Lee, Machine Learning Spring 2025](https://speech.ee.ntu.edu.tw/~hylee/ml/2025-spring.php) *(in Chinese)* | AI agents, reasoning, fine-tuning and forgetting, model editing / merging | [S2 Transformers and Decoding](/en/stages/s02-transformer/) to [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [NTU Hung-yi Lee, Introduction to GenAI and ML Fall 2025](https://speech.ee.ntu.edu.tw/~hylee/GenAI-ML/2025-fall.php) *(in Chinese)* | Includes a lecture on context engineering | [S0 The Big Picture](/en/stages/s00-big-picture/), [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| [NTU Yun-Nung Chen, Applied Deep Learning 2026](https://www.csie.ntu.edu.tw/~miulab/f115-adl/) *(in Chinese)* | Taught in Chinese; RAG, agents, human-AI interaction | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) to [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [NTHU Hung-Yu Kao, NLP 2026](https://github.com/IKMLab/NTHU_Natural_Language_Processing) *(in Chinese)* | Bilingual Traditional Chinese / English slides and videos | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) to [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |

## Books and long-form material

| Source | What it's for | Chapters |
|---|---|---|
| Chip Huyen, *AI Engineering* (O'Reilly 2025), [companion repo](https://github.com/chiphuyen/aie-book) | The backbone of application engineering: evals, RAG, fine-tuning, data, inference, architecture, user feedback. A paid book; the repo has summaries only | [S5 Inference and Serving](/en/stages/s05-inference/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) to [S9 Retrieval and RAG](/en/stages/s09-rag/), [S17 Product and AI UX](/en/stages/s17-ai-ux/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | Implements GPT from scratch; bonus material covers KV cache, GQA, MLA, MoE, DPO | [S2 Transformers and Decoding](/en/stages/s02-transformer/) to [S5 Inference and Serving](/en/stages/s05-inference/) |
| [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) | Video series; the best intuition for backprop and training. Not updated since 2024 | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) to [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [mlabonne/llm-course](https://github.com/mlabonne/llm-course) | A roadmap-style map of links; unusually complete on data engineering, quantization and security. Content not updated since 2025-12 | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) to [S5 Inference and Serving](/en/stages/s05-inference/), [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Hugging Face Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) | The standard reading on parallel training | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| [Hugging Face LLM Course](https://huggingface.co/learn/llm-course), [MCP Course](https://huggingface.co/learn/mcp-course), [Agents Course](https://github.com/huggingface/agents-course) | Chapters 11–12 cover SFT and GRPO; the Agents Course leans on frameworks | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | 18 lessons; L03 is one of the few that covers agentic UX. Heavily tied to Azure | [S16 Security and Governance](/en/stages/s16-security/) to [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [anthropics/courses](https://github.com/anthropics/courses) | Prompting tutorials and a prompt evaluations lab. **Archived**, but the content is still usable | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S8 Eval Methodology](/en/stages/s08-evals/) |
| [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) | "Own your prompts, context and control flow." Partly promotes HumanLayer's product | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S11 Context Engineering](/en/stages/s11-context-engineering/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | A complete agent in about 100 lines | [S0 The Big Picture](/en/stages/s00-big-picture/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [WenyuChiou/awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) *(in Chinese)* | An agent learning map in Traditional Chinese; strong 8-component harness checklist and evals. Leans toward the Claude Code ecosystem; shallow on how models work | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [karpathy/makemore](https://github.com/karpathy/makemore) | Character-level language model; the S1 Neural Network Basics exercise uses its `names.txt` data. Not updated since 2024 | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) |
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | The leanest GPT training repo; S2 Transformers and Decoding borrows its config while you write the model yourself | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [karpathy/nanochat](https://github.com/karpathy/nanochat) | End-to-end training of a small ChatGPT; the full version needs 8×H100, with scaled-down CPU / MPS versions | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), model project |
| [GeeeekExplorer/nano-vllm](https://github.com/GeeeekExplorer/nano-vllm) | A minimal vLLM in about 1,200 lines, to compare against your own inference server | [S5 Inference and Serving](/en/stages/s05-inference/), model project |
| [SWE-agent/mini-swe-agent: `agents/default.py`](https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/agents/default.py) | Source of the agent's main loop; S0 The Big Picture walks through it method by method | [S0 The Big Picture](/en/stages/s00-big-picture/) |
| [Microsoft ai-agents-for-beginners L03: AI Agentic Design Principles](https://github.com/microsoft/ai-agents-for-beginners/tree/main/03-agentic-design-patterns) | Three principles: transparency, control, consistency. Examples are tied to Azure; the principles are general | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Microsoft: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/) (2019) | 18 human-AI interaction guidelines, usable as a UI audit checklist | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Nielsen Norman Group: Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) (Nielsen 1993, drawing on Miller 1968 and Card et al. 1991) | The three response-time thresholds: 0.1 s / 1 s / 10 s | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [roadmap.sh AI Engineer](https://roadmap.sh/ai-engineer), [AI Agents](https://roadmap.sh/ai-agents) | A coverage checklist; a thorough summary of context failure modes. Shallow, mostly lists of tools | All |

## Industry articles and guides

### Anthropic Engineering

| Article | Date | Chapters |
|---|---|---|
| [Building effective AI agents](https://www.anthropic.com/research/building-effective-agents) | 2024-12-19 | [S0 The Big Picture](/en/stages/s00-big-picture/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [Contextual retrieval](https://www.anthropic.com/research/contextual-retrieval) (the vendor's own experiments) | 2024-09-19 | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) | 2025-06-13 | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| [Writing effective tools for AI agents](https://www.anthropic.com/research/writing-tools-for-agents) | 2025-09-11 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [A postmortem of three recent issues](https://www.anthropic.com/research/a-postmortem-of-three-recent-issues) | 2025-09-17 | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | 2025-09-29 | [S11 Context Engineering](/en/stages/s11-context-engineering/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [Equipping agents with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) | 2025-10-16 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [Making Claude Code safer with sandboxing](https://www.anthropic.com/research/claude-code-sandboxing) | 2025-10-20 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [Code execution with MCP for efficient agents](https://www.anthropic.com/research/code-execution-with-mcp) | 2025-11-04 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [Introducing advanced tool use for Claude](https://www.anthropic.com/research/advanced-tool-use) | 2025-11-24 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [Mitigating prompt injections in browser use](https://www.anthropic.com/research/prompt-injection-defenses) | 2025-11-24 (covers browser agents only) | [S16 Security and Governance](/en/stages/s16-security/) |
| [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) | 2025-11-26 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) | 2026-01-09 | [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise) | 2026-02-05 | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/research/eval-awareness-browsecomp) | 2026-03-06 | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps) | 2026-03-24 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [How we built Claude Code auto mode](https://www.anthropic.com/research/claude-code-auto-mode) | 2026-03-25 | [S16 Security and Governance](/en/stages/s16-security/) |
| [Scaling Managed Agents with stable interfaces](https://www.anthropic.com/research/managed-agents) | 2026-04-08 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [An update on Claude Code quality reports](https://www.anthropic.com/research/april-23-postmortem) | 2026-04-23 | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [How we contain Claude across products](https://www.anthropic.com/research/how-we-contain-claude) | 2026-05-25 | [S16 Security and Governance](/en/stages/s16-security/) |
| [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory) | 2026-11-06 | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| [Claude's Constitution](https://www.anthropic.com/constitution) (model behavior spec) | 2026-11-06 (update date shown on the page) | [S16 Security and Governance](/en/stages/s16-security/) |
| [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) (official docs) | — | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |

### OpenAI, Google / Kaggle, Meta

| Source | Date | Chapters |
|---|---|---|
| [OpenAI: A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 2025 (updated since) | [S0 The Big Picture](/en/stages/s00-big-picture/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [OpenAI: Understanding prompt injections](https://openai.com/index/prompt-injections/) | 2025-11-07 | [S16 Security and Governance](/en/stages/s16-security/) |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) (guardrails, handoffs, tracing) | — | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/), [S16 Security and Governance](/en/stages/s16-security/) |
| [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/) | — | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [OpenAI: Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | 2026-02-23 | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [OpenAI Model Spec](https://model-spec.openai.com/) (model behavior spec) | Continuously updated (current version 2026-10-29) | [S16 Security and Governance](/en/stages/s16-security/) |
| [Kaggle: Foundational Large Language Models & Text Generation](https://www.kaggle.com/whitepaper-foundational-llm-and-text-generation) | 2025-02 | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Kaggle: Prompt Engineering](https://www.kaggle.com/whitepaper-prompt-engineering) | 2025-02 | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Kaggle: Embeddings & Vector Stores](https://www.kaggle.com/whitepaper-embeddings-and-vector-stores) | 2025-02 | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Kaggle: Agents Companion](https://www.kaggle.com/whitepaper-agent-companion) | 2025 | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [Kaggle: Operationalizing Generative AI on Vertex AI using MLOps](https://www.kaggle.com/whitepaper-operationalizing-generative-ai-on-vertex-ai-using-mlops) | 2025 (leans toward Google Cloud) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Kaggle: Introduction to Agents](https://www.kaggle.com/whitepaper-introduction-to-agents) | 2025-11 | [S0 The Big Picture](/en/stages/s00-big-picture/) |
| [Kaggle: Agent Tools & Interoperability with MCP](https://www.kaggle.com/whitepaper-agent-tools-and-interoperability-with-mcp) | 2025-11 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S16 Security and Governance](/en/stages/s16-security/) |
| [Kaggle: Context Engineering: Sessions & Memory](https://www.kaggle.com/whitepaper-context-engineering-sessions-and-memory) | 2025-11 | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| [Kaggle: Agent Quality](https://www.kaggle.com/whitepaper-agent-quality) | 2025-11 | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Kaggle: Prototype to Production](https://www.kaggle.com/whitepaper-prototype-to-production) | 2025-11 | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Meta: Agents Rule of Two: A Practical Approach to AI Agent Security](https://ai.meta.com/blog/practical-ai-agent-security/) | 2025-10-31 | [S16 Security and Governance](/en/stages/s16-security/) |

### Individual authors

| Source | Date | Chapters |
|---|---|---|
| [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | 2024-03-29 | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [Hamel Husain: A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) | 2025-03-24 | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [Hamel Husain: Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) | 2024-10-29 | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [Hamel Husain: AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/) (formerly the Evals FAQ) | 2026-09-18 | [S8 Eval Methodology](/en/stages/s08-evals/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [applied-llms.org: What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | 2024-06 | [S0 The Big Picture](/en/stages/s00-big-picture/), [S8 Eval Methodology](/en/stages/s08-evals/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S17 Product and AI UX](/en/stages/s17-ai-ux/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [Eugene Yan: Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) | 2023 | [S8 Eval Methodology](/en/stages/s08-evals/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) | 2023-06-23 | [S0 The Big Picture](/en/stages/s00-big-picture/) |
| [Lilian Weng: Prompt Engineering](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/) | 2023-03-15 | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Lilian Weng: Reward Hacking in Reinforcement Learning](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) | 2024-11-28 | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Lilian Weng: Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/) | 2025-05-01 | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [Simon Willison: The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | 2025-06-16 | [S16 Security and Governance](/en/stages/s16-security/) |
| [Graham Neubig: Don't Sleep on Single-Agent Systems](https://www.openhands.dev/blog/dont-sleep-on-single-agent-systems) (a blog post, not a paper) | 2024-09-26 | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [Jason Liu: Systematically Improving RAG Applications](https://jxnl.co/writing/2025/01/24/systematically-improving-rag-applications/) | 2025-01-24 | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Invariant Labs: MCP Security Notification: Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | 2025-04-01 | [S16 Security and Governance](/en/stages/s16-security/) |
| [Drew Breunig: How Long Contexts Fail](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html) | 2025-06-22 | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| [Drew Breunig: How to Fix Your Context](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html) | 2025-06-26 | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| [Chroma: Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot) (research by a vector database vendor) | 2025-07-14 | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| [BAIR: The Shift from Models to Compound AI Systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/) (Zaharia et al.) | 2024-02-18 | [S0 The Big Picture](/en/stages/s00-big-picture/) |
| [Chip Huyen: Building A Generative AI Platform](https://huyenchip.com/2024/07/25/genai-platform.html) | 2024-07-25 | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |

### Security standards

| Source | Chapters |
|---|---|
| [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) | [S16 Security and Governance](/en/stages/s16-security/) |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | [S16 Security and Governance](/en/stages/s16-security/) |
| [CVE-2025-32711 (EchoLeak)](https://www.cve.org/CVERecord?id=CVE-2025-32711) | [S16 Security and Governance](/en/stages/s16-security/) |
| [EU AI Act (Regulation (EU) 2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) (2024-06-13) | [S16 Security and Governance](/en/stages/s16-security/) |
| [Executive Yuan (Taiwan) press release: implementing the AI Basic Act and establishing the National AI Strategy Special Committee](https://www.ey.gov.tw/Page/9277F759E41CCD91/999df6da-6539-4941-913f-5125d684c58d) *(in Chinese)* (2026-05-21) | [S16 Security and Governance](/en/stages/s16-security/) |

## Official docs and tools

API docs, SDKs, libraries, model cards, datasets, and local inference and evaluation tools. Versions change fast; the current docs take precedence.

### Claude API

| Source | What it's for | Chapters |
|---|---|---|
| [Claude API: Messages](https://platform.claude.com/docs/en/api/messages) | Message structure | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | Order of SSE events | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Errors](https://platform.claude.com/docs/en/api/errors) | Which errors to retry | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Rate limits](https://platform.claude.com/docs/en/api/rate-limits) | Rate limits | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Pricing | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | Batch API | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | Reasoning model parameters and passing thinking back across turns | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Claude API: Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) | Official prompting advice | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Claude API: Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | Structured output | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Claude API: Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) | The official implementation of deferred loading | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [Claude API: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | Pricing, minimum length, lifetime, usage fields | [S11 Context Engineering](/en/stages/s11-context-engineering/) |

### OpenAI API

| Source | What it's for | Chapters |
|---|---|---|
| [OpenAI API: Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) | Streaming events | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [OpenAI API: Error codes](https://developers.openai.com/api/docs/guides/error-codes) | Error codes | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [OpenAI API: Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) | Reasoning model parameters, pricing | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [OpenAI API: Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Structured output | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [OpenAI API: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) | Prompt caching | [S11 Context Engineering](/en/stages/s11-context-engineering/) |

### MCP

| Source | What it's for | Chapters |
|---|---|---|
| [MCP specification 2026-07-28: Overview](https://modelcontextprotocol.io/specification/2026-07-28) | Host / client / server, feature list, security principles | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP specification: Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture) | Architecture | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP specification: Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) | Authorization | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP specification: Transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) | Transport layer | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP specification: Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) | Differences between versions | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP: Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) | Security practice; redirects to the 2026-07-28 version | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | Official TypeScript SDK | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | Official Python SDK | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [FastMCP](https://gofastmcp.com/) | Python MCP framework | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | Testing tool for MCP servers | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| [modelcontextprotocol/ext-apps (MCP Apps)](https://github.com/modelcontextprotocol/ext-apps) | Official extension for MCP servers to provide UI; stable spec 2026-01-26 | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [MCP-UI](https://mcpui.dev/) | The community project and SDK that preceded MCP Apps | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |

### SDKs, frameworks and protocols

| Source | What it's for | Chapters |
|---|---|---|
| [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) | An abstraction layer for LLM calls in TypeScript | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) | Chat UI | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) | Streaming text, tool calls and custom data together | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) | Hooking up OpenTelemetry | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing) | Writing tests with mock models | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Ollama community provider](https://ai-sdk.dev/providers/community-providers/ollama) | Connecting local models | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) | Tool calls → components | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [LiteLLM](https://docs.litellm.ai/docs/) | A unified multi-provider interface for Python | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [LiteLLM: Fallbacks](https://docs.litellm.ai/docs/proxy/reliability) | Provider fallbacks | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Instructor](https://python.useinstructor.com/) | Validation and retries for structured output | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [Outlines](https://github.com/dottxt-ai/outlines) | Constrained decoding for local models | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [BAML](https://docs.boundaryml.com/home) | Define LLM functions in a DSL and generate clients | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [XGrammar](https://github.com/mlc-ai/xgrammar) | Grammar-constrained decoding engine | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [DSPy](https://dspy.ai) | Write LLM programs as optimizable modules | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Gradio: ChatInterface](https://www.gradio.app/docs/gradio/chatinterface) | Python chat UI component: generator streaming, a stop button, thumbs up / down; the UI for A6 Streaming Chat and Traces if you don't write a frontend | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Chainlit](https://docs.chainlit.io/) | Python framework for conversational apps: streaming, stopping, feedback | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Streamlit: st.write_stream](https://docs.streamlit.io/develop/api-reference/write-magic/st.write_stream) | Stream output onto a Streamlit page | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Streamlit: st.feedback](https://docs.streamlit.io/develop/api-reference/widgets/st.feedback) | Feedback widgets such as thumbs up / down | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AG-UI Overview](https://docs.ag-ui.com/introduction) | Event protocol between an agent backend and the frontend | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [Temporal: Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal) | The concepts behind durable execution | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [github/spec-kit](https://github.com/github/spec-kit) | Tools and process for spec-driven development | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| [OpenClaw docs](https://docs.openclaw.ai/) | Gateway, channels and automation design for an always-on personal agent | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |

### Local models and inference

| Source | What it's for | Chapters |
|---|---|---|
| [vLLM](https://github.com/vllm-project/vllm) | Source code of a production-grade inference engine | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Ollama API: Usage](https://docs.ollama.com/api/usage) | Timing fields such as `prompt_eval_count` and `eval_duration`. Replaces `docs/api.md` on GitHub | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Ollama: OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) | OpenAI-compatible interface for local models | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | Local HTTP server | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [mlx-lm](https://github.com/ml-explore/mlx-lm) | Run LLMs on Apple Silicon | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [transformers.js](https://github.com/huggingface/transformers.js) | Run models in the browser | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [WebLLM](https://github.com/mlc-ai/web-llm) | In-browser LLM inference engine | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) | APIs for the browser's built-in models | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |

### Training tools

| Source | What it's for | Chapters |
|---|---|---|
| [Weights & Biases](https://docs.coreweave.com/products/wandb) | Experiment tracking; has a free personal plan. The docs are now part of CoreWeave | [S1 Neural Network Basics](/en/stages/s01-neural-networks/), model project |
| [Hugging Face TRL](https://huggingface.co/docs/trl) | SFT, DPO and GRPO trainers | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), model project |
| [Hugging Face PEFT](https://huggingface.co/docs/peft) | LoRA and other parameter-efficient fine-tuning | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), model project |
| [Hugging Face: Chat templates](https://huggingface.co/docs/transformers/main/en/chat_templating) | Read the section on tool use | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |

### Models and datasets

| Source | What it's for | Chapters |
|---|---|---|
| [Qwen/Qwen3-0.6B-Base](https://huggingface.co/Qwen/Qwen3-0.6B-Base) | Starting point for the post-training exercises | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [Ollama: qwen3](https://ollama.com/library/qwen3) | Run Qwen3 locally | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [openai/gsm8k](https://huggingface.co/datasets/openai/gsm8k) | Math word problem dataset; likely contaminated, so use it only for relative comparisons | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) | Small instruct model; S5 Inference and Serving writes its own generation loop for it | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Qwen/Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) | An embedding model that runs on your own machine | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3) | Multilingual embedding model | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Multilingual reranker | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) | Reference for choosing an embedding model | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [tiny Shakespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt) | About 1.1 MB of plain English text; training data for the S2 Transformers and Decoding core exercise and M2 Tiny GPT | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb) | About 15T tokens of cleaned English web data; the large-scale deduplication extension in S3 Pretraining and Scaling uses a sample of it | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| [Salesforce/wikitext](https://huggingface.co/datasets/Salesforce/wikitext) | Wikipedia articles; the document source for deduplication in the S3 Pretraining and Scaling core exercise | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| [Qwen3-0.6B config.json](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json) | What the inference calculator is checked against | [S5 Inference and Serving](/en/stages/s05-inference/) |
| [Spider](https://yale-lily.github.io/spider) | Text-to-SQL dataset (200 databases); the ○ Text2SQL variant in S9 Retrieval and RAG can use a subset | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Laws & Regulations Database of the Republic of China (Taiwan)](https://law.moj.gov.tw/) *(in Chinese)* | Full text of Taiwanese laws in Traditional Chinese; the document set for the S9 Retrieval and RAG core exercise | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [LongMemEval](https://github.com/xiaowu0162/LongMemEval) | Data and code for long-term memory evals; paper: [Wu et al. 2024](https://arxiv.org/abs/2410.10813) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| [MultiHop-RAG](https://huggingface.co/datasets/yixuantt/MultiHopRAG) | QA set whose questions need several news articles combined; paper: [Tang & Yang 2024](https://arxiv.org/abs/2401.15391); ODC-BY license | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [abisee/cnn_dailymail](https://huggingface.co/datasets/abisee/cnn_dailymail) | English news articles and summaries; the English alternative dataset for the S8 Eval Methodology core exercise (version 3.0.0) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [goodbooks-10k](https://github.com/zygmuntz/goodbooks-10k) | Metadata and ratings for ten thousand books; the data for the S10 Tools and MCP core exercise | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |

### RAG and retrieval

| Source | What it's for | Chapters |
|---|---|---|
| [Sentence Transformers](https://www.sbert.net/) | Embeddings and cross-encoders | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Sentence Transformers: Training Overview](https://www.sbert.net/docs/sentence_transformer/training_overview.html) | Official tutorial on fine-tuning embeddings | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [SQLite FTS5](https://www.sqlite.org/fts5.html) | BM25 full-text search; for Chinese text, use trigram or segment words first | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [jieba](https://github.com/fxsjy/jieba) | Chinese word segmentation for Python | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | Vector search extension for SQLite | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [LanceDB](https://docs.lancedb.com/) | Embedded vector database | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [unpdf](https://github.com/unjs/unpdf) | PDF text extraction for JavaScript | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Docling](https://github.com/docling-project/docling) | Parsing documents with complex layouts | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Ragas](https://docs.ragas.io/) | Definitions of RAG evaluation metrics | [S8 Eval Methodology](/en/stages/s08-evals/), [S9 Retrieval and RAG](/en/stages/s09-rag/) |

### Evaluation, testing and observability

| Source | What it's for | Chapters |
|---|---|---|
| [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) | Standard trace fields for LLM calls; still in Development status | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [OpenLLMetry](https://github.com/traceloop/openllmetry) | LLM observability built on OpenTelemetry | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Langfuse](https://github.com/langfuse/langfuse) | Open-source LLM tracing and eval platform | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Phoenix](https://github.com/arize-ai/phoenix) | Open-source LLM observability and evaluation | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Jaeger](https://www.jaegertracing.io/) | A plain tracing backend | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [MSW (Mock Service Worker)](https://mswjs.io/) | API mocking for TypeScript | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [httpx](https://github.com/encode/httpx) | Python HTTP client | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [respx](https://github.com/lundberg/respx) | Mocking for httpx | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [pytest-recording](https://github.com/kiwicom/pytest-recording) | Record / replay built on VCR.py | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [promptfoo](https://www.promptfoo.dev/docs/intro/) | Eval runner | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [`scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) | Bootstrap confidence intervals | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [AgentDojo](https://github.com/ethz-spylab/agentdojo) | An evaluation environment for prompt injection attacks and defenses; paper: [Debenedetti et al. 2024](https://arxiv.org/abs/2406.13352). The S16 Security and Governance core exercise borrows its injection templates | [S16 Security and Governance](/en/stages/s16-security/) |

### Web and API basics

| Source | What it's for | Chapters |
|---|---|---|
| [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | The SSE format itself | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [AWS Builder Center: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) | Engineering practice for retries and backoff | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) | Designing idempotency keys | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
| [IETF draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) | draft-08, not yet an RFC | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |

## Papers

Every paper cited in the chapters' Further reading is listed here.

| Paper | Chapters |
|---|---|
| Vaswani et al. 2017, [Attention Is All You Need](https://arxiv.org/abs/1706.03762) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| Lewis et al. 2020, [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Kwon et al. 2023, [Efficient Memory Management for LLM Serving with PagedAttention](https://arxiv.org/abs/2309.06180) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Yao et al. 2023, [ReAct](https://arxiv.org/abs/2210.03629) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Shao et al. 2024, [DeepSeekMath](https://arxiv.org/abs/2402.03300) (GRPO) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Rafailov et al. 2023, [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Sumers et al. 2023, [Cognitive Architectures for Language Agents (CoALA)](https://arxiv.org/abs/2309.02427) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Kapoor et al. 2024, [AI Agents That Matter](https://arxiv.org/abs/2407.01502) | [S0 The Big Picture](/en/stages/s00-big-picture/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Miller 2024, [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Liu et al. 2023, [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) | [S9 Retrieval and RAG](/en/stages/s09-rag/), [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| Sclar et al. 2023, [Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design](https://arxiv.org/abs/2310.11324) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| Yang et al. 2024, [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Yao et al. 2024, [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) | [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Welleck et al. 2024, [From Decoding to Meta-Generation](https://arxiv.org/abs/2406.16838) | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S5 Inference and Serving](/en/stages/s05-inference/) |
| Shankar et al. 2024, [Who Validates the Validators?](https://arxiv.org/abs/2404.12272) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Cemri et al. 2025, [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| Kwa et al. 2025, [Measuring AI Ability to Complete Long Tasks](https://arxiv.org/abs/2503.14499) (METR time horizon) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Opsahl-Ong et al. 2024, [MIPROv2](https://arxiv.org/abs/2406.11695) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Agrawal et al. 2025, [GEPA](https://arxiv.org/abs/2507.19457) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Beurer-Kellner et al. 2025, [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | [S16 Security and Governance](/en/stages/s16-security/) |
| Debenedetti et al. 2025, [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) | [S16 Security and Governance](/en/stages/s16-security/) |
| Nasr et al. 2025, [The Attacker Moves Second](https://arxiv.org/abs/2510.09023) | [S16 Security and Governance](/en/stages/s16-security/) |
| Kaplan et al. 2020, [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Hoffmann et al. 2022, [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Wei et al. 2022, [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Schaeffer et al. 2023, [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Rajbhandari et al. 2019, [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) | [S3 Pretraining and Scaling](/en/stages/s03-pretraining/) |
| Lambert et al. 2024, [Tulu 3: Pushing Frontiers in Open Language Model Post-Training](https://arxiv.org/abs/2411.15124) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Zhou et al. 2023, [LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Hu et al. 2021, [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Dettmers et al. 2023, [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Wang et al. 2022, [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Lightman et al. 2023, [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Yu et al. 2025, [DAPO: An Open-Source LLM Reinforcement Learning System at Scale](https://arxiv.org/abs/2503.14476) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Zheng et al. 2025, [Group Sequence Policy Optimization](https://arxiv.org/abs/2507.18071) | [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| Yu et al. 2022, [Orca: A Distributed Serving System for Transformer-Based Generative Models](https://www.usenix.org/conference/osdi22/presentation/yu) (Orca, OSDI '22) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Zheng et al. 2023, [SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Dao et al. 2022, [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Leviathan et al. 2022, [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) | [S5 Inference and Serving](/en/stages/s05-inference/) |
| Zhao et al. 2021, [Calibrate Before Use: Improving Few-Shot Performance of Language Models](https://arxiv.org/abs/2102.09690) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| Wei et al. 2022, [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| Tam et al. 2024, [Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models](https://arxiv.org/abs/2408.02442) | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| Zheng et al. 2023, [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Chen et al. 2021, [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Bean et al. 2025, [Measuring what Matters: Construct Validity in Large Language Model Benchmarks](https://arxiv.org/abs/2511.04703) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Kadavath et al. 2022, [Language Models (Mostly) Know What They Know](https://arxiv.org/abs/2207.05221) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| Karpukhin et al. 2020, [Dense Passage Retrieval for Open-Domain Question Answering](https://arxiv.org/abs/2004.04906) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Khattab & Zaharia 2020, [ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT](https://arxiv.org/abs/2004.12832) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Malkov & Yashunin 2016, [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Gao et al. 2022, [Precise Zero-Shot Dense Retrieval without Relevance Labels](https://arxiv.org/abs/2212.10496) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Asai et al. 2023, [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](https://arxiv.org/abs/2310.11511) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Gao et al. 2023, [Enabling Large Language Models to Generate Text with Citations](https://arxiv.org/abs/2305.14627) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Hsieh et al. 2024, [RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Greshake et al. 2023, [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| Schick et al. 2023, [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| Patil et al. 2023, [Gorilla: Large Language Model Connected with Massive APIs](https://arxiv.org/abs/2305.15334) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| Wang et al. 2024, [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030) | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) |
| Jiang et al. 2023, [LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression](https://arxiv.org/abs/2310.06839) | [S11 Context Engineering](/en/stages/s11-context-engineering/) |
| Shinn et al. 2023, [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| Packer et al. 2023, [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Park et al. 2023, [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Maharana et al. 2024, [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://arxiv.org/abs/2402.17753) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| Chen et al. 2024, [AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases](https://arxiv.org/abs/2407.12784) | [S13 Memory and Personalization](/en/stages/s13-memory/) |
| [Agent-as-a-Judge: Evaluate Agents with Agents](https://arxiv.org/abs/2410.10934) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [$τ^2$-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [SABER: Small Actions, Big Errors -- Safeguarding Mutating Steps in LLM Agents](https://arxiv.org/abs/2512.07850) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning](https://arxiv.org/abs/2503.09516) | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| Wu et al. 2023, [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](https://arxiv.org/abs/2308.08155) | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| Shao et al. 2024, [PrivacyLens: Evaluating Privacy Norm Awareness of Language Models in Action](https://arxiv.org/abs/2409.00138) | [S16 Security and Governance](/en/stages/s16-security/) |
| Greenblatt et al. 2023, [AI Control: Improving Safety Despite Intentional Subversion](https://arxiv.org/abs/2312.06942) | [S16 Security and Governance](/en/stages/s16-security/) |
| Korbak et al. 2025, [Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://arxiv.org/abs/2507.11473) | [S16 Security and Governance](/en/stages/s16-security/) |
| Ong et al. 2024, [RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Chen et al. 2023, [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| Xia et al. 2024, [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/abs/2407.01489) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Wang et al. 2024, [OpenHands: An Open Platform for AI Software Developers as Generalist Agents](https://arxiv.org/abs/2407.16741) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| Wei et al. 2025, [BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents](https://arxiv.org/abs/2504.12516) | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |

## Chinese-language resources

### Traditional Chinese

| Source | What it's for | Chapters |
|---|---|---|
| Courses by Hung-yi Lee, Yun-Nung Chen and Hung-Yu Kao *(in Chinese)* | See [University courses](#university-courses) above | — |
| [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM) | A Traditional Chinese model repo; TMLU, TMMLU+ and TCEval, mentioned in its README, are references for evaluating in Traditional Chinese (it's a model repo, not teaching material) | [S8 Eval Methodology](/en/stages/s08-evals/) |
| [iThome 2025: Team AI Operations Handbook: Designing, Deploying and Maintaining System Prompts](https://ithelp.ithome.com.tw/users/20178160/ironman/8461) *(in Chinese)* | Managing prompts as a team asset | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| [iThome 2025: A Journey Through AI Product and Architecture Design: From 0 to 1, Then Day 2](https://ithelp.ithome.com.tw/users/20178352/ironman/8789) *(in Chinese)* | Product and architecture in practice | [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [iThome 2025: Hands-on LLMOps in 30 Days: From RAG to Observability and Deployment](https://ithelp.ithome.com.tw/users/20120069/ironman/8557) *(in Chinese)* | LLMOps, observability, deployment | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [iThome 2025: AI App Development for Frontend Engineers: 30 Days from Prompt to Production](https://ithelp.ithome.com.tw/users/20129072/ironman/8834) *(in Chinese)* | AI apps from a frontend perspective | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/), [S17 Product and AI UX](/en/stages/s17-ai-ux/) |
| [iThome 2026: What to Think Through Before Shipping an AI Agent: 30 Days on Harness Design Tradeoffs](https://ithelp.ithome.com.tw/users/20150750/ironman/9868) *(in Chinese)* | Harness design tradeoffs; Day 1 published 2026-09-15 | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [iThome 2026: Day 4, What Is Context Engineering](https://ithelp.ithome.com.tw/articles/10404121) *(in Chinese)* | An introduction to context engineering; a single article, 2026-08-23 | [S11 Context Engineering](/en/stages/s11-context-engineering/) |

The iThome series are 30-day daily series written by practitioners, and their quality varies. The ones listed above won awards or are closely on topic; treat them as supplementary reading, not as primary material.

### Simplified Chinese

| Source | What it's for | Chapters |
|---|---|---|
| [RUC: Large Language Models](https://llmbook-zh.github.io/) *(in Chinese)* | A university textbook, free PDF; the agent and application parts are dated | [S0 The Big Picture](/en/stages/s00-big-picture/), [S3 Pretraining and Scaling](/en/stages/s03-pretraining/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/) |
| [datawhalechina/diy-llm](https://github.com/datawhalechina/diy-llm) *(in Chinese)* | A Chinese version of CS336; the best Chinese companion to Part II How Models Work (S1–S5) | [S2 Transformers and Decoding](/en/stages/s02-transformer/) to [S5 Inference and Serving](/en/stages/s05-inference/), [S8 Eval Methodology](/en/stages/s08-evals/) |
| [datawhalechina/happy-llm](https://github.com/datawhalechina/happy-llm) *(in Chinese)* | Builds an LLM from scratch; chapter 8 goes deep on agentic RL | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [ZJU-LLMs/Foundations-of-LLMs](https://github.com/ZJU-LLMs/Foundations-of-LLMs) *(in Chinese)* | Zhejiang University's *Foundations of LLMs*; has a chapter on model editing | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/), [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [Lordog/dive-into-llms](https://github.com/Lordog/dive-into-llms) *(in Chinese)* | Shanghai Jiao Tong University's *Dive into LLMs*; many security labs | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S16 Security and Governance](/en/stages/s16-security/) |
| [datawhalechina/tiny-universe](https://github.com/datawhalechina/tiny-universe) *(in Chinese)* | Minimal implementations: TinyTransformer / TinyEval / TinyRAG / TinyAgent | [S2 Transformers and Decoding](/en/stages/s02-transformer/), [S8 Eval Methodology](/en/stages/s08-evals/), [S9 Retrieval and RAG](/en/stages/s09-rag/), [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) |
| [datawhalechina/zero-to-sglang](https://github.com/datawhalechina/zero-to-sglang) *(in Chinese)* | A course made with the SGLang team: write your own inference server. Part three of the course is not finished yet | [S5 Inference and Serving](/en/stages/s05-inference/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [datawhalechina/all-in-rag](https://github.com/datawhalechina/all-in-rag) *(in Chinese)* | The best Chinese material for S9 Retrieval and RAG; leans on Milvus | [S9 Retrieval and RAG](/en/stages/s09-rag/) |
| [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents) *(in Chinese)* | Complete material for building agents from scratch; deep on context engineering, memory and agentic RL. Leans toward the Chinese tech stack | [S11 Context Engineering](/en/stages/s11-context-engineering/) to [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [datawhalechina/agentic-rl-lab](https://github.com/datawhalechina/agentic-rl-lab) *(in Chinese)* | Runnable reproductions of GRPO variants, Search-R1 and ReTool | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) |
| [datawhalechina/base-llm](https://github.com/datawhalechina/base-llm) *(in Chinese)* | Covers security, threat modeling and deployment; one chapter is a tutorial for a vendor's API | [S16 Security and Governance](/en/stages/s16-security/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [datawhalechina/deepagents-in-action](https://github.com/datawhalechina/deepagents-in-action) *(in Chinese)* | A complete topic map of harnesses; tied to LangChain | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/), [S13 Memory and Personalization](/en/stages/s13-memory/), [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) |
| [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) *(in Chinese)* | 17 lessons that hand-write a Claude Code-style harness from scratch; the main material for S12 The Agent Loop and Harness. Follow s01–s17 in the repo root; the old `docs/` folder is numbered differently | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) to [S15 Multi-agent Systems](/en/stages/s15-multi-agent/), [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |
| [d2l-zh: Dive into Deep Learning](https://github.com/d2l-ai/d2l-zh) *(in Chinese)* | Deep learning basics; not updated since 2024 | [S1 Neural Network Basics](/en/stages/s01-neural-networks/) to [S2 Transformers and Decoding](/en/stages/s02-transformer/) |
| [youngyangyang04/llm-master](https://github.com/youngyangyang04/llm-master) *(in Chinese)* | A full-stack LLM learning path; its engineering acceptance criteria are a useful reference. Includes links to a paid bootcamp and top-up services; heavily job-hunting oriented | [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [datawhalechina/self-llm](https://github.com/datawhalechina/self-llm) *(in Chinese)* | Fine-tuning and deployment recipes for many models | [S4 Post-training and Reasoning](/en/stages/s04-post-training/), [S18 Deployment and Architecture](/en/stages/s18-deployment/) |
| [datawhalechina/llm-cookbook](https://github.com/datawhalechina/llm-cookbook) *(in Chinese)* | Chinese version of Andrew Ng's short courses; "Building Systems with the ChatGPT API" works as an API warm-up. Not updated since 2025-06 | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) |
