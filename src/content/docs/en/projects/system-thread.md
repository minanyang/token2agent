---
title: System Project (A6–A19)
head:
  - tag: title
    content: 'AI Agent Project: From API to Production (A6–A19) | Token2Agent'
description: 'Pick an application you care about and build it from a first LLM API call in S6 to an always-on agent in S19. Each chapter adds one capability, ending in a deployable AI agent project backed by evals.'
sidebar:
  order: 2
---

The system project is **cumulative hands-on work spanning Part III to Part VII (S6–S19)**: every chapter adds a new capability to **the same application**, instead of each chapter being an unrelated exercise (for the codes, see [How to read the codes](/en/guide/how-to-use/#how-to-read-the-codes)). This way you see how the layers stack up. For example, when the retrieval you build in S9 Retrieval and RAG gives a wrong answer, the eval set you built in S8 Eval Methodology catches it; the tools you add in S10 Tools and MCP get attacked in S16 Security and Governance.

The system project is the **advanced exercise**. Doing only each chapter's core exercise still takes you through the whole roadmap, ending with the core exercise of S19 Real Agent Systems and the Capstone; that chapter's A19 Capstone is also an advanced exercise and needs the system built up through A6–A18.

## Pick a topic

You choose the topic, and you settle it in A6 Streaming Chat and Traces in [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/). A good topic should meet these conditions, so that every later chapter has something to practice on:

- **It has its own documents or data**, not something freely available on the public web (→ S9 Retrieval and RAG, 🔒 indirect injection)
- **It has some actions that "do things,"** such as creating, editing or sending (→ S10 Tools and MCP, S12 The Agent Loop and Harness, S16 Security and Governance)
- **It can have at least 2–3 users** (→ S13 Memory and Personalization, the multi-tenant deployment in S18 Deployment and Architecture)
- **You'll actually use it yourself**, so it accumulates real traces and feedback (→ [S8 Eval Methodology](/en/stages/s08-evals/), [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/))

| Example topic | Data | Actions | Users |
|---|---|---|---|
| **Notes assistant** (this roadmap's default example) | Your notes, PDFs, clipped web pages | Create notes, organize tags, clip web pages, draft emails | You and your family or coworkers |
| Team knowledge base Q&A | Internal docs, meeting notes | Create tickets, update docs | Team members |
| Personal finance assistant | Statements, receipts | Categorize, create budgets, send reminders | You and your family |
| Developer assistant | Your repo, issues, docs | Open issues, draft PR descriptions | You and your collaborators |

Every exercise is written in terms of "your system," with one line of "For the notes assistant: …". If you can't decide, use the notes assistant.

## Tech stack

Any language works. Frontend engineers can write the application itself in TypeScript (for example with the Vercel AI SDK) and do eval and RAG experiments in Python (which has more tools); using just one of them throughout is fine too. Each exercise's hints list reference tools for both languages.

You can get as far as A16 Security Attack, Defense and Governance without writing a frontend: the interface from A6 Streaming Chat and Traces through A16 can be Gradio, Chainlit, Streamlit or a CLI, with the same acceptance criteria for streaming, stopping and feedback (see [the hints for A6 Streaming Chat and Traces](/en/stages/s06-llm-api/#advanced-system-project-a6-start-your-system)). The core exercise of S17 Product and AI UX also has a version without a frontend; only A17 Complete Frontend needs a real one, and its hints include getting-started advice. Backend and data engineers can start with the suggestions in [How to Use This Roadmap](/en/guide/how-to-use/#who-this-is-for).

## What each chapter adds

| Step | Chapter | What your system gains |
|---|---|---|
| A6 Streaming Chat and Traces | [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) | A streaming chat interface (web, Gradio, Chainlit, Streamlit or CLI), a trace and cost record for every call, feedback buttons, switchable cloud and local models; every request carries a user ID (from a config file or header, no login) |
| A7 Structured Output and Workflows | [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) | Reliable structured output and one fixed workflow; versioned prompts |
| A8 Error Analysis and Golden Set | [S8 Eval Methodology](/en/stages/s08-evals/) | Error analysis on real traces, growing into a golden set and a human-calibrated judge |
| A9 RAG with Citations | [S9 Retrieval and RAG](/en/stages/s09-rag/) | RAG with citations; retrieval and generation evaluated separately; retrieval filtered by user ID with a cross-user isolation test; 🔒 test for injection embedded in documents |
| A10 Toolset and MCP Server | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) | A toolset and an authenticated MCP server; every tool has a risk level (for example, email split into "create draft" = medium and "send" = high); 🔒 egress allowlist |
| A11 Context Builder | [S11 Context Engineering](/en/stages/s11-context-engineering/) | A context builder: budget, ordering, caching |
| A12 Hand-written Harness | [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) | A hand-written harness: permissions, hooks, pause and resume, human intervention, compaction, skills |
| A13 Layered Memory | [S13 Memory and Personalization](/en/stages/s13-memory/) | First, a pairwise judge (← S8 Eval Methodology); layered memory and personalization; users can view and delete memories; cross-user isolation tested with the user ID carried since A6 Streaming Chat and Traces; 🔒 memory poisoning |
| A14 Agent Evals and Optimization | [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/) | First, fill in routing logs; trajectory evals, simulated users, prompt optimization, router distillation, harness ablation |
| A15 Multi-agent Experiment | [S15 Multi-agent Systems](/en/stages/s15-multi-agent/) | Try a multi-agent setup, and keep it only if it beats a single agent on evals |
| A16 Security Attack, Defense and Governance | [S16 Security and Governance](/en/stages/s16-security/) | Trifecta audit, threat model, reproduce and patch one injection, guardrail false positives / false negatives, a data governance statement |
| A17 Complete Frontend | [S17 Product and AI UX](/en/stages/s17-ai-ux/) | A complete frontend: showing tool calls, interruptible, citations, uncertainty (first, a per-answer uncertainty signal, ← S8 Eval Methodology), feedback |
| A18 Multi-user Deployment | [S18 Deployment and Architecture](/en/stages/s18-deployment/) | Multi-user deployment: replace the user ID carried since A6 Streaming Chat and Traces with real authentication; model routing, load testing, an eval-gated release process, canary and rollback drills, a cost dashboard |
| A19 Capstone | [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) | The capstone (advanced exercise): extend it into an always-on agent and deliver complete engineering evidence |

## Bridges to the model project

- **A9 RAG with Citations**: fine-tune an embedding model (using the fine-tuning techniques from [S4 Post-training and Reasoning](/en/stages/s04-post-training/))
- **A14 Agent Evals and Optimization**: distill a small router or classifier from your own traces
- **A18 Multi-user Deployment**: compare a self-hosted model with APIs, using the measurements from [M5 KV Cache, Quantization and a Mini Inference Server](/en/projects/model-thread/)

## Cost

- Most steps don't cost much per chapter even with a paid API; each exercise gives an estimate and offers local-model alternatives (Ollama, llama.cpp, MLX) where possible.
- Starting with A6 Streaming Chat and Traces you log the cost of every call, so you always know how much you've spent.
