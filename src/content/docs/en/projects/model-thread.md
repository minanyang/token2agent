---
title: Model Project (M1–M5)
head:
  - tag: title
    content: 'Build an LLM from Scratch: Five Python Projects (M1–M5) | Token2Agent'
description: 'Five Python projects that build an LLM from scratch: hand-written autograd, a GPT from zero, small-model pretraining, post-training from SFT to GRPO, and finally your own inference server, following the model chapters S1–S5.'
sidebar:
  order: 1
---

The model project is the advanced hands-on work for Part I Models (S1–S5). Its five steps go all the way from "hand-written gradients" to "your own inference server." The goal isn't to train a useful model; it's to have built every part of an LLM yourself, so that later, when you see API prices, latency, fine-tuning results or quantization quality on the application side, you can judge whether the numbers make sense.

Each of the five chapters in Part I has a **core exercise** you can complete without anything from the model project. The model project is the **advanced exercise**, and its steps reuse code from one another. The cloud GPU cost of the five model project steps (M1–M5) is concentrated in M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 and M5 KV Cache, Quantization and a Mini Inference Server, together on the order of tens of dollars. It varies a lot with your setup, so measure first.

## Environment

The model project is Python throughout, because the training and inference toolchains (PyTorch, Hugging Face) are Python-first. The system project (starting with S6 LLM APIs and Application Basics) lets you choose TypeScript or Python freely.

- **Python** 3.11 or later; create a separate environment for the model project with `uv` or `venv`.
- **Core packages**: PyTorch; for M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 and M5 KV Cache, Quantization and a Mini Inference Server, add `transformers`, [TRL](https://huggingface.co/docs/trl) and [PEFT](https://huggingface.co/docs/peft).
- **Experiment tracking**: [Weights & Biases](https://docs.coreweave.com/products/wandb) has a free personal plan; if you'd rather not sign up, use TensorBoard or write your own CSV. Starting with the makemore MLP in M1, get in the habit of logging every run.
- **Version control**: every experiment's settings (data, hyperparameters, seed) must be rerunnable, and every number in a results table must trace back to the run that produced it.

## Compute

| Step | Recommended hardware | Notes |
|---|---|---|
| M1–M3 (micrograd and the MLP, tiny GPT, small-model pretraining) | Laptop CPU or Apple Silicon (MPS) | Start with million-parameter smoke tests. M3 trains multiple sizes and deduplication comparisons; estimate the full duration from measured step time, hardware, token count and training steps |
| M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 | Rented NVIDIA GPU | Colab, Modal, Lambda and the like. Estimated **in the tens of dollars; measure first** |
| M5 KV Cache, Quantization and a Mini Inference Server | CPU is fine for correctness; performance numbers need an NVIDIA GPU | Usually cheaper than M4, but still measure first |

A few things to note:

- **Mac MPS limits**: PyTorch's MPS backend can run the first three steps, M1–M3, but some operators are unsupported or slower, and support for mixed precision and quantization lags behind CUDA. Don't do the TRL training in M4 or the performance measurements in M5 on a Mac.
- **Estimating cost**: run once with the smallest setup (a little data, a few steps), measure the time per step, then multiply by the number of steps in the full setup. When renting, set up auto-shutdown or a budget cap.
- **Free options**: the GPU in Colab's free tier may be able to run LoRA on a 0.6B model, but neither usage hours nor memory are guaranteed. It's fine for trying things out, not as your main environment.

## The five steps

### M1: micrograd and the makemore MLP ([S1](/en/stages/s01-neural-networks/))

Start from the scalar autograd in the core exercise, switch to PyTorch tensors, and take a character-level language model on the names dataset from a bigram to an MLP. The focus is training diagnostics: is the initial loss reasonable, are the activations saturating, how do you compare several hyperparameter settings. Acceptance: the MLP's val loss is at least 0.15 lower than the bigram's, with numbers from before and after fixing the initialization.

### M2: Tiny GPT, Upgraded to Llama Components ([S2](/en/stages/s02-transformer/))

Write a GPT from scratch, train it on tiny Shakespeare, swap in a BPE tokenizer you trained yourself, then replace components one by one with RMSNorm, RoPE, SwiGLU and GQA. Along the way, count parameters by hand and check them against the code's count, and generate text with different sampling settings. Afterwards you can read the `config.json` of most Llama/Qwen-style dense models (for MoE, MLA and similar fields, refer back to S2 Transformers and Decoding).

### M3: Small-model Pretraining and a Mini Scaling Experiment ([S3](/en/stages/s03-pretraining/))

Pretrain models of three sizes on the same data, plot loss against compute, and compare with the Chinchilla estimate; then deduplicate with the MinHash code from the core exercise and see how data quality affects loss. If you want the full modern pipeline, you can use [nanochat](https://github.com/karpathy/nanochat) instead, but the full version needs a rented 8×H100 node.

### M4: SFT → LoRA → DPO → GRPO on a Small Qwen3 ([S4](/en/stages/s04-post-training/))

Starting from Qwen3-0.6B-Base (or 1.7B-Base), do full-parameter SFT, then LoRA, then DPO, and finally GRPO on math problems. Compare every step against the base with the same held-out evals, attach confidence intervals to the numbers, and record at least one instance of reward hacking or sycophancy. This is the most expensive step of the model project.

### M5: KV Cache, Quantization and a Mini Inference Server ([S5](/en/stages/s05-inference/))

On Qwen3-0.6B, write your own generation loop, add a KV cache, quantize the weights, and finally write an HTTP server with continuous batching, measuring throughput and TTFT at different concurrency levels. When you're done, compare with the [nano-vllm](https://github.com/GeeeekExplorer/nano-vllm) implementation to find the optimizations you're still missing.

## Bridges to the system project

The model project's techniques come back in three places in the system project ([System Project (A6–A19)](/en/projects/system-thread/)):

- **Fine-tuning an embedding model** ([A9 RAG with Citations](/en/stages/s09-rag/)): use the fine-tuning workflow and eval habits from M4 SFT → LoRA → DPO → GRPO on a Small Qwen3 to fine-tune the embedding model used for retrieval on your own data, and compare Recall@k before and after.
- **Distilling a router from traces** ([A14 Agent Evals and Optimization](/en/stages/s14-agent-evals/)): use the traces your system has accumulated as training data to train a small classifier or router that decides which model or flow a request should go to. The data preparation and the "before/after comparison with confidence intervals" both carry over from M4.
- **Self-hosting vs APIs** ([A18 Multi-user Deployment](/en/stages/s18-deployment/)): use the TTFT, TPOT, throughput and GPU hourly rate measured in M5 KV Cache, Quantization and a Mini Inference Server to estimate your self-hosted cost per million tokens, and compare it side by side with API prices.

If you're only on the [application route](/en/guide/app-first/), you can skip these three bridges for now and come back to them when you read Part I Models (S1–S5).
