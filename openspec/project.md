# Project Overview

## Tech Stack
Tech stack: Next.js 16 (App Router), TypeScript, Ant Design 6, ECharts, SWR.
Backend: Next.js API routes as server-side proxies (Eastmoney, Tiantianfund), Mastra AI via @ai-sdk (OpenAI compatible).
Data: Prisma + PostgreSQL (Accelerate), zod for validation.
UX: Chinese-first, accessibility focused (larger fonts, high contrast, mobile).
Conventions: Red-up/green-down colors; SWR refresh 15–60s; localStorage-backed watchlist; App Router pages under src/app.

## Architecture & Conventions
- Call external data sources via server API routes only (no direct browser calls).
- Include risk disclosures for investment advice and avoid deterministic recommendations.
- Keep accessibility (font sizes, contrast, touch targets) unchanged or improved.
- Specify affected tabs/pages and SWR refresh intervals in proposals.
- Charts must remain performant; avoid heavy blocking work in render; prefer memoization.

## Reference Docs
- README.md
- CLAUDE.md (code map, modules, data flow)
