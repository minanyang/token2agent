---
title: How to Use This Roadmap
head:
  - tag: title
    content: How to Use This AI/LLM Roadmap | Token2Agent
description: 'How to use this AI/LLM roadmap: choosing the application or the model route, the Simple and Deep reading modes, how each chapter is structured, how the exercises work, and a sample study plan.'
sidebar:
  order: 1
---

Each chapter has a lecture you can read without opening external resources. Further reading offers optional material from 30+ university courses, textbooks and industry guides. The complete list is in [Sources](/en/reference/sources/).

## Choose a route

| Your goal | Route |
|---|---|
| Put LLMs into a product and build AI apps or agents (**most people**) | [Application route](/en/guide/app-first/): S0 AI Systems Overview → Model Crash Course → Part II to Part VI (S6–S19) |
| Also understand how models work inside, or train models or build inference infrastructure | Full route: from S0 AI Systems Overview through S19 Real Agent Systems and the Capstone, in order |
| Understand what AI systems do before writing any code | **Concepts route**: [S0 AI Systems Overview](/en/stages/s00-big-picture/) → [Model Crash Course: Four things to know now](/en/guide/app-first/#four-things-to-know-now) → Part II to Part VI (S6–S19), reading the lectures in Simple mode and doing Try it first and the self-checks |

The application route prepares you to build products with existing models, often called AI engineering. The full route adds model training and modification for ML engineering and research.

The two **hands-on routes** require basic programming: variables, functions and loops, plus HTTP API calls and JSON. The **concepts route** requires no programming. Read the lectures, Try it first and self-check sections, then pick up the core exercises when you want to build. Look up unfamiliar terms in the [glossary's quick reference](/en/reference/glossary/#quick-reference).

Part I Models (S1–S5) is optional and uses more math. You can complete Part II to Part VI (S6–S19) without it. Later chapters first link to the [Model Crash Course](/en/guide/app-first/#model-crash-course) for required background, then offer Part I references such as "Deeper: S2 Transformers and Decoding". If unsure, start with the application route and return to model internals as needed.

## How to read the codes

Chapters and advanced exercises are labeled with a letter and a number:

| Code | Meaning |
|---|---|
| S | A chapter (S0–S19, 20 chapters) |
| A | A step of the system project. The number is the chapter number: A6 is the advanced exercise of S6. The system project starts at S6, so there is no A1–A5 |
| M | A step of the model project: M1 is the advanced exercise of S1, and so on (M1–M5) |
| Part | A group of chapters; Part I Models, for example, is S1–S5 and is optional |

S6–S19 means a range.

**Core exercises** check each chapter's central concept and form the main route. **Advanced exercises** build optional system or model projects across chapters. See [Chapter structure](#chapter-structure).

The text names a single chapter or step by code and title, like "S6 LLM APIs and Application Basics" or "A10 Toolset and MCP Server". A range names its part or project, like "Part I Models (S1–S5)" or "system project A6–A18".

## Two ways to read

The switch at the top of the page sets the reading mode. Your choice is remembered and applies on every page:

- **Simple** (default): the main line only. Every chapter starts from why you need the idea, then walks one example through step by step (from S6 LLM APIs and Application Basics on, it is always the same notes assistant), with small worked examples and common misconceptions. If this is your first time and you have no background, the main line is enough.
- **Deep**: also opens Before you build (implementation details), Going deeper (derivations and more on the underlying mechanisms), optional topics (○), advanced exercises and Further reading. Use it when you know the basics and want more.

In Simple mode, click a Before you build or Going deeper title to open that block. For optional topics or advanced exercises, press Show this section. These controls expand one block without changing the site's reading mode.

## Chapter structure

| Block | Contents |
|---|---|
| Concepts route: key points | Three sentences at the top: what a reader who doesn't code should take away. The other engineering details can wait |
| What this chapter covers / After this chapter you can | The questions the chapter answers and the skills you can check afterwards, starting with what the main line alone gets you. Each skill says where you practice it: "(core)" is the core exercise, "(advanced)" the advanced exercise, "(lecture and self-check)" means the lecture and self-check questions confirm it. A skill practiced in two parts is marked "(core: …; advanced: …)" |
| Lecture | The big picture first, then one example walked end to end. ★ marks a core topic, ○ an optional one (opened only in Deep mode), 🔒 a security checkpoint |
| Exercises | **Try it first** (a pen-and-paper warm-up of about 10 minutes, with a collapsible answer), the **core exercise** (checks the chapter's central idea; no advanced project is required, but some reuse data or code from earlier core exercises) and the **advanced exercise** (a step of a hands-on project, opened in Deep mode) |
| Self-check | 5–9 questions, all answerable from the main line, at least one about judging a situation. Each has a collapsible hint: the key point, the common mistake, and which section to reread |
| Further reading | Optional: original papers, official docs, code-along material and courses, each noting what it adds beyond the lecture |

## Design principles

1. **See the whole picture, then branch.** Get the overall shape in S0 AI Systems Overview, then pick a route by goal: the application route builds apps, agents, security and deployment straight up from S6 LLM APIs and Application Basics; the full route takes Part I Models (S1–S5) first.
2. **Every concept is taught once.** Later chapters only deepen it, and point back to where it was taught with "(← S2 Transformers and Decoding)". The full map is the [Concept Index](/en/reference/concepts/).
3. **Build the system before the evals.** Get the app running and leaving traces, then build the test set from real failures. Don't invent test questions up front.
4. **Write it by hand first, frameworks last.** Write the agent loop and harness yourself so you know what a framework does for you, then compare frameworks.
5. **Start simple and upgrade on evidence.** Prompt → RAG → fine-tuning; workflow → agent; single agent → multi-agent. Every upgrade needs eval results to back it.
6. **Security starts early.** S9 Retrieval and RAG, S10 Tools and MCP, S12 The Agent Loop and Harness and S13 Memory and Personalization each have a 🔒 security checkpoint; S16 Security and Governance goes deep.
7. **Sources are dated, and benchmarks have flaws.** This field moves fast. Every source carries a date and every benchmark comes with its known problems.

## How the exercises work

- An exercise states only the **goal, steps, acceptance criteria and hints**, with no solution. Acceptance criteria are numeric, so you can check for yourself whether you passed.
- Use any language. Hints list reference tools for both TypeScript and Python. You need basic programming; if you don't have it yet, learn the basics of one language (variables, functions, loops, calling an HTTP API) and come back.
- When you get stuck, go back to the lecture section the hint points to, then to Further reading if needed.
- AI coding tools (Claude Code, Cursor, GitHub Copilot and the like) are fine for boilerplate and setup, but write the part each exercise is meant to teach yourself. Paste the whole exercise into a tool and you can meet the acceptance criteria without learning anything. Think before you open hints and self-check answers.
- Exercises that need a paid API or a GPU state the rough cost and offer a local-model alternative where possible.
- Your code lives in your own repo; this site only hosts the exercises.
- If your math or statistics is rusty (chain rule, softmax, log plots, standard error, bootstrap, cosine similarity), see the [Math Refresher](/en/guide/math-refresher/) first. Every section has a small example you can work by hand.

### Two hands-on projects

- **[System project A6–A19](/en/projects/system-thread/)**: pick an application you care about; each chapter grows one capability, and you finish it in S19 Real Agent Systems and the Capstone. This is the one for the application route.
- **[Model project M1–M5](/en/projects/model-thread/)**: Python, from autograd to post-training a small model and an inference server. It goes with Part I Models (S1–S5), for those on the full route.

Core exercises do not depend on advanced-project artifacts, but chapter prerequisites still apply. For example, S14 reuses the agent, tasks and graders from S12's core exercise. You can finish the roadmap through the core exercise in S19 Real Agent Systems and the Capstone. Its advanced A19 capstone requires the system built in A6–A18.

## Sample study plan: the application route plus key system project steps

To build and evaluate AI apps and agents, combine the application route's lectures and core exercises with selected system project steps. For familiar chapters, answer the self-check first and move on if you can.

| Stage | Contents |
|---|---|
| 1 | [S0 AI Systems Overview](/en/stages/s00-big-picture/); Model Crash Course; [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) + A6 Streaming Chat and Traces; [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| 2 | [S8 Evals Methodology](/en/stages/s08-evals/) + A8 Error Analysis and Golden Set; [S9 Retrieval and RAG](/en/stages/s09-rag/) + A9 RAG with Citations |
| 3 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) + A10 Toolset and MCP Server; [S11 Context Engineering](/en/stages/s11-context-engineering/) + A11 Context Builder; [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) + A12 Hand-written Harness |
| 4 | [S13 Memory and Personalization](/en/stages/s13-memory/); [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/); [S15 Multi-agent Systems](/en/stages/s15-multi-agent/); [S16 Security and Governance](/en/stages/s16-security/) |
| 5 | [S17 Product and AI UX](/en/stages/s17-ai-ux/); [S18 Deployment and Architecture](/en/stages/s18-deployment/); [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |

- Pick four system project steps: A6 Streaming Chat and Traces (the first thing you can see working), A8 Error Analysis and Golden Set (evals grown from real traces), A9 RAG with Citations, and A12 Hand-written Harness. The harness uses the tools from A10 Toolset and MCP Server and the A11 Context Builder, so A10 and A11 are in the plan too. The embedding fine-tuning inside A9 RAG with Citations relies on fine-tuning (Model Crash Course; Deeper: S4 Post-training and Reasoning) and can be skipped at first.
- If you have time left, the next most valuable step is A14 Agent Evals and Optimization. Start with trajectory evals, simulated users, prompt optimization and harness ablation. Router distillation is an optional bridge; only that option needs the routing records from step 0 (← A7 Structured Output and Workflows).
- At the end of this plan you have a system whose RAG, tools and harness are each backed by eval numbers.

## Who this is for

- Engineers who want to go from calling an API to designing, evaluating and shipping agent systems.
- People without a machine learning background who want to understand how AI systems work: start at S0 AI Systems Overview and read in Simple mode.
- People who want a systematic understanding of how LLMs work rather than chasing new tools: take the full route and read Part I in Deep mode.
- Frontend engineers can start at [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) or [S17 Product and AI UX](/en/stages/s17-ai-ux/), the two chapters closest to frontend work. You can attempt the S17 core exercise early after S6, but first read S17's tool-state, approval and cancellation mechanisms. It uses a mock backend and does not require the A6–A16 system project.
- Backend and data engineers: S6 LLM APIs and Application Basics, S8 Evals Methodology, S9 Retrieval and RAG and S18 Deployment and Architecture are closest to your experience, so you can move through them faster. System project A6–A16 never requires a frontend; Gradio, Chainlit, Streamlit or a CLI will do, with the same acceptance criteria for streaming, stopping and feedback (see [the hints for A6 Streaming Chat and Traces](/en/stages/s06-llm-api/#advanced-system-project-a6-start-your-system)). The core exercise of S17 Product and AI UX has a version without a frontend, see [the S17 core exercise](/en/stages/s17-ai-ux/#core-the-four-state-problems-of-an-agent-interface); only A17 Complete Frontend actually needs one. If you're comfortable with math and statistics, skip the [Math Refresher](/en/guide/math-refresher/); the [advanced statistics section](/en/stages/s08-evals/#-advanced-statistics-sample-size-planning-multiple-comparisons-annotator-agreement-calibration-metrics) of S8 Evals Methodology is written for you.
