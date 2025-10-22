# PRD — ShainAI (Personal Project Brain)
Owner: Shaina Pauley
Date: 2025-10-22
Status: v1.0

## Problem
Important context and decisions live across repos, docs, and chats; chat models forget.

## Goals
- Retrieval with citations
- Durable facts (goals, deadlines, decisions)
- Automatic decision journal
- Ship-able in a weekend

## Non-Goals
- Full task manager; multi-tenant auth; fine-tuning for facts

## User Stories
- “What’s left for PH launch?” → checklist + sources
- “Draft maker comment from landing copy” → text + sources
- “Summarize yesterday” → Daily Log
- “What did we decide about analytics?” → decision + date + source

## Architecture
Frontend: Next.js chat
Backend: Node/Express tools (search_memory, get_facts, write_memory)
Stores: Neon Postgres + pgvector (memory_chunks), facts, journal; S3 for raw files

## Schemas
- memory_chunks(project, source, uri, title, content, tokens, created_at, embedding)
- facts(project, kind, key, value, updated_at)
- journal(project, summary, details, tags, created_at)

## API
POST /tools/search_memory {query, project, top_k, since}
POST /tools/get_facts {project, kind, keys}
POST /tools/write_memory {project, type:'journal'|'fact', payload}
POST /api/ask orchestrates retrieval + answer + suggested writes

## Prompts
System: Identify project → retrieve hot + long-term → cite sources → propose journal/facts updates → suggest reminders. Tone: concise, builder-first, calm; use bullets (•).

## Ingest
GitHub (READMEs, docs, PRs, commits), Files (PDF/MD), Chats (exports). Dedup by hash, prefer newest, tag by project/source.

## Frontend
Project filter, chat, toggle “Save to memory”, Today panel, citation drawer.

## Acceptance
- Answers include ≥2 citations
- Journal write on decisions
- Facts contain at least one deadline
- Ingest shows chunk counts
- Daily cron writes a log

## KPIs
Latency: <3s cached / <12s cold; Top-3 precision ≥0.7; stale facts ↓

## Roadmap
v0.1 MVP → v0.2 Notion/Drive → v0.3 keyboard palette + edit facts → v1.0 auth/sharing

## Risks
Messy data; hallucinations; costs — mitigated via curation, strict cites, caching
