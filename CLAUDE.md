# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack AI SDK learning monorepo with a Next.js frontend and Express backend. Teaches AI SDK concepts through 8 progressive lessons and 2 agent demos (coach, analyst). Uses OpenAI-compatible providers (Qwen and DeepSeek) — no AI gateway.

## Commands

```bash
# Install dependencies (pnpm 10.33+ required)
pnpm install

# Run both frontend and backend in parallel
pnpm dev

# Run individually
pnpm dev:web    # Next.js on :3000
pnpm dev:server # Express on :8080

# Build
pnpm build

# Run all tests (vitest)
pnpm test

# Run tests for a single package
pnpm --filter server test
pnpm --filter web test

# Type check (used as lint)
pnpm lint
```

## Architecture

**Monorepo**: pnpm workspaces (`web/`, `server/`), shared `tsconfig.base.json`.

**Server** (`server/src/`):
- `config/env.ts` — Zod-validated env config, supports legacy `ALIBABA_*` vars
- `lib/provider.ts` — Factory that creates OpenAI-compatible providers for Qwen/DeepSeek
- `lib/lessons.ts` — 8 lesson handlers, each returns `{ type: 'json' | 'text-stream', run() }`
- `lib/agents.ts` — ToolLoopAgent definitions (coach: 5-step limit, analyst: 6-step limit)
- `lib/tools.ts` — 4 shared tools with Zod schemas (estimateStudyLoad, buildStageTemplate, draftApiSurface, prioritizeBacklog)
- `lib/schemas.ts` — Zod schemas for request/response validation
- `routes/` — Thin Express handlers: `POST /api/lessons/:lessonId`, `POST /api/agents/:agentId/chat`, `GET /api/health`

**Web** (`web/src/`):
- Next.js 15 App Router, language `zh-CN`
- `components/lesson-playground.tsx` — Runs lessons with provider selection UI
- `components/agent-chat.tsx` — Chat UI using `useChat` + `DefaultChatTransport`, auto-continues on tool calls
- `lib/catalog.ts` — Lesson/agent card definitions
- `app/coach/` and `app/analyst/` — Agent page routes

**Key patterns**:
- Provider factory in `provider.ts` abstracts Qwen/DeepSeek behind OpenAI-compatible protocol
- `generateText` for JSON outputs, `streamText` for streaming, `ToolLoopAgent` for multi-step agents
- Agent responses and docs are in Chinese

## Environment

Copy `.env.example` to `.env` at the root. Required vars: `QWEN_API_KEY` or `DEEPSEEK_API_KEY` (depending on `AI_PROVIDER`). Web can override backend URL with `NEXT_PUBLIC_SERVER_URL`.
