---
title: How to Use This Roadmap
head:
  - tag: title
    content: How to Use This AI/LLM Roadmap | Token2Agent
description: 'How to use this AI/LLM roadmap: choosing the application or the model route, the Simple and Deep reading modes, how each chapter is structured, how the exercises work, and a sample study plan.'
sidebar:
  order: 1
---

Every chapter of this roadmap has its own lecture: you can learn the chapter from the page without opening an outside link. Each chapter ends with Further reading, drawn from 30+ sources (university courses, textbooks, industry guides) for when you want to go deeper; the full list is in [Sources](/en/reference/sources/).

## Choose a route

| Your goal | Route |
|---|---|
| Put LLMs into a product and build AI apps or agents (**most people**) | [Application route](/en/guide/app-first/): S0 The Big Picture → Model Crash Course → Part III to Part VII (S6–S19) |
| Also understand how models work inside, or train models or build inference infrastructure | Full route: from S0 The Big Picture through S19 Real Agent Systems and the Capstone, in order |
| Understand what AI systems do before writing any code | **Concepts route**: [S0 The Big Picture](/en/stages/s00-big-picture/) → [Model Crash Course: Four things to know now](/en/guide/app-first/#four-things-to-know-now) → Part III to Part VII (S6–S19), reading the lectures in Simple mode and doing Try it first and the self-checks |

The application route matches what the industry calls an AI engineer: building products on existing models rather than training them from scratch. The full route extends toward ML engineering and research, where you train and modify models yourself.

The first two are **hands-on routes** and involve code: you need the basics of one programming language (variables, functions, loops), and should be able to call an HTTP API and read JSON. The third, the **concepts route**, needs no programming: read the lectures and do Try it first and the self-checks, and you will understand how AI systems work. When you want to build, pick up the core exercises. Look up unfamiliar words in the [glossary](/en/reference/glossary/#quick-reference).

Part II How Models Work (S1–S5) is lower-level, uses more math, and is the optional deep route. You can finish Part III to Part VII (S6–S19) without it. From S6 LLM APIs and Application Basics on, when a page needs model knowledge it first points back to the [Model Crash Course](/en/guide/app-first/#model-crash-course), then marks the matching Part II chapter with "Deeper:", as in "Deeper: S2 Transformers and Decoding". If you're unsure, start with the application route and come back to Part II when you find yourself asking why.

## How to read the codes

Chapters and advanced exercises are labeled with a letter and a number:

| Code | Meaning |
|---|---|
| S | A chapter (S0–S19, 20 chapters) |
| A | A step of the system project. The number is the chapter number: A6 is the advanced exercise of S6. The system project starts at S6, so there is no A1–A5 |
| M | A step of the model project: M1 is the advanced exercise of S1, and so on (M1–M5) |
| Part | A group of chapters; Part II, for example, is S1–S5 (the optional How Models Work) |

S6–S19 means a range.

Exercises come in two kinds: **core exercises** are the main line and check only the chapter's central idea; **advanced exercises** are an optional long-running project, one step of the system project or the model project. See [Chapter structure](#chapter-structure).

The text names a single chapter or step by code and title, like "S6 LLM APIs and Application Basics" or "A10 Toolset and MCP Server". A range names its part or project, like "Part II How Models Work (S1–S5)" or "system project A6–A18".

## Two ways to read

The switch at the top of the page sets the reading mode. Your choice is remembered and applies on every page:

- **Simple** (default): the main line only. Every chapter starts from why you need the idea, then walks one example through step by step (from S6 LLM APIs and Application Basics on, it is always the same notes assistant), with small worked numbers and the usual misunderstandings. If this is your first time and you have no background, the main line is enough.
- **Deep**: also opens Before you build (implementation details), Going deeper (derivations and more mechanism), optional topics (○), advanced exercises and Further reading. Use it when you know the basics and want more.

In Simple mode you can still open any collapsed block on its own: click the title of a Before you build or Going deeper block, or press Show this section on an optional topic or advanced exercise. Only that block opens; the site's mode stays as it is.

## Chapter structure

| Block | Contents |
|---|---|
| Concepts route: key points | Three sentences at the top: what a reader who doesn't code should take away. The other engineering details can wait |
| What this chapter covers / After this chapter you can | The questions the chapter answers and the skills you can check afterwards, starting with what the main line alone gets you. Each skill says where you practice it: "(core)" is the core exercise, "(advanced)" the advanced exercise, "(lecture and self-check)" means the lecture and self-check questions confirm it. A skill practiced in two parts is marked "(core: …; advanced: …)" |
| Lecture | The big picture first, then one example walked end to end. ★ marks a core topic, ○ an optional one (opened only in Deep mode), 🔒 a security checkpoint |
| Exercises | **Try it first** (a pen-and-paper warm-up of about 10 minutes, with a collapsible answer), the **core exercise** (checks only the chapter's central idea; most can be done on their own) and the **advanced exercise** (a step of a hands-on project, opened in Deep mode) |
| Self-check | 5–9 questions, all answerable from the main line, at least one about judging a situation. Each has a collapsible hint: what to weigh, the common mistake, and which section to reread |
| Further reading | Optional: original papers, official docs, code-along material and courses, each noting what it adds beyond the lecture |

## Design principles

1. **See the whole picture, then branch.** Get the overall shape in S0 The Big Picture, then pick a route by goal: the application route builds apps, agents, security and deployment straight up from S6 LLM APIs and Application Basics; the full route takes Part II How Models Work (S1–S5) first.
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
- AI coding tools (Claude Code, Cursor, GitHub Copilot and the like) are fine for boilerplate and setup, but write the part each exercise is meant to teach yourself. Paste the whole exercise into a tool and you can pass the numbers without learning anything. Think before you open hints and self-check answers.
- Exercises that need a paid API or a GPU state the rough cost and offer a local-model alternative where possible.
- Your code lives in your own repo; this site only hosts the exercises.
- If your math or statistics is rusty (chain rule, softmax, log plots, standard error, bootstrap, cosine similarity), see the [Math Refresher](/en/guide/math-refresher/) first. Every section has a small example you can work by hand.

### Two hands-on projects

- **[System project A6–A19](/en/projects/system-thread/)**: pick an application you care about; each chapter grows one capability, and you finish it in S19 Real Agent Systems and the Capstone. This is the one for the application route.
- **[Model project M1–M5](/en/projects/model-thread/)**: Python, from autograd to post-training a small model and an inference server. It goes with Part II How Models Work (S1–S5), for those on the full route.

Core and advanced exercises are independent: doing only the core exercises still takes you through the whole roadmap, and the last one is the core exercise of S19 Real Agent Systems and the Capstone. That chapter's advanced exercise is the A19 capstone, which needs the system built up through system project A6–A18.

## Sample study plan: the application route plus key system project steps

For people whose goal is to build and evaluate AI apps and agents. On top of the application route's lectures and core exercises, pick the most important system project steps. For chapters you already know, just do the self-check; if you can answer it, move on.

| Stage | Contents |
|---|---|
| 1 | [S0 The Big Picture](/en/stages/s00-big-picture/); Model Crash Course; [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) + A6 Streaming Chat and Traces; [S7 Prompts, Structured Output and Workflows](/en/stages/s07-prompting/) |
| 2 | [S8 Eval Methodology](/en/stages/s08-evals/) + A8 Error Analysis and Golden Set; [S9 Retrieval and RAG](/en/stages/s09-rag/) + A9 RAG with Citations |
| 3 | [S10 Tools and MCP](/en/stages/s10-tools-mcp/) + A10 Toolset and MCP Server; [S11 Context Engineering](/en/stages/s11-context-engineering/) + A11 Context Builder; [S12 The Agent Loop and Harness](/en/stages/s12-agent-harness/) + A12 Hand-written Harness |
| 4 | [S13 Memory and Personalization](/en/stages/s13-memory/); [S14 Agent Evals, Data and Optimization](/en/stages/s14-agent-evals/); [S15 Multi-agent Systems](/en/stages/s15-multi-agent/); [S16 Security and Governance](/en/stages/s16-security/) |
| 5 | [S17 Product and AI UX](/en/stages/s17-ai-ux/); [S18 Deployment and Architecture](/en/stages/s18-deployment/); [S19 Real Agent Systems and the Capstone](/en/stages/s19-capstone/) |

- Pick four system project steps: A6 Streaming Chat and Traces (the first thing you can see working), A8 Error Analysis and Golden Set (evals grown from real traces), A9 RAG with Citations, and A12 Hand-written Harness. The harness uses the tools from A10 Toolset and MCP Server and the A11 Context Builder, so A10 and A11 are in the plan too. The embedding fine-tuning inside A9 RAG with Citations relies on fine-tuning (Model Crash Course; Deeper: S4 Post-training and Reasoning) and can be skipped at first.
- If you have time left, the next most valuable step is A14 Agent Evals and Optimization. Its step 0 uses a router (← A7 Structured Output and Workflows); if you skipped A7, follow step 0's fallback and have a strong model label routing decisions for past requests.
- At the end of this plan you have a system whose RAG, tools and harness are each backed by eval numbers.

## Who this is for

- Engineers who want to go from calling an API to designing, evaluating and shipping agent systems.
- People without a machine learning background who want to understand how AI systems work: start at S0 The Big Picture and read in Simple mode.
- People who want a systematic understanding of how LLMs work rather than chasing new tools: take the full route and read Part II in Deep mode.
- Frontend engineers can start at [S6 LLM APIs and Application Basics](/en/stages/s06-llm-api/) or [S17 Product and AI UX](/en/stages/s17-ai-ux/), the two chapters closest to frontend work. The core exercise of S17 Product and AI UX only needs the streaming ideas from S6 LLM APIs and Application Basics, so you can do it right after S6.
- Backend and data engineers: S6 LLM APIs and Application Basics, S8 Eval Methodology, S9 Retrieval and RAG and S18 Deployment and Architecture are closest to your experience and can go faster. System project A6–A16 never requires a frontend; Gradio, Chainlit, Streamlit or a CLI will do, with the same acceptance criteria for streaming, stopping and feedback (see [the hints for A6 Streaming Chat and Traces](/en/stages/s06-llm-api/#advanced-system-project-a6-start-your-system)). The core exercise of S17 Product and AI UX has a version without a frontend, see [the S17 core exercise](/en/stages/s17-ai-ux/#core-the-four-state-problems-of-an-agent-interface); only A17 Complete Frontend actually needs one. If you're comfortable with math and statistics, skip the [Math Refresher](/en/guide/math-refresher/); the [advanced statistics section](/en/stages/s08-evals/#-advanced-statistics-sample-size-planning-multiple-comparisons-annotator-agreement-calibration-metrics) of S8 Eval Methodology is written for you.
