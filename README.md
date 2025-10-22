# shainAI

Secret agent man trained with all my bullshit to help keep me on track.

A retrieval-augmented personal project brain that remembers everything across repos, docs, and chats — and answers with sources.

> Stack: Next.js (frontend) • Node/Express (API) • Postgres + pgvector (Neon) • S3/Supabase storage • OpenAI/Anthropic for LLM + embeddings

## Features

- Semantic search across GitHub repos, files, and chat exports
- Structured facts storage (deadlines, goals, decisions)
- Automatic decision journal
- Chat interface with citations
- Privacy-first (runs on your own infrastructure)
- Production-grade RAG architecture

## Quick start (local)

1. Clone and setup:
```bash
git clone https://github.com/Surfrrosa/shainAI.git ~/projects/shainai
cd ~/projects/shainai
cp .env.example .env
# Fill in DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY
```

2. Set up database:
```bash
# Create Neon/Postgres database with pgvector enabled
# Copy DATABASE_URL to .env

# Run migrations
DATABASE_URL=<your-url> ./scripts/migrate.sh
```

3. Ingest your content:
```bash
cd ingest
npm install

# Ingest GitHub repos
node src/github.js Surfrrosa pomodoroflow pomodoroflow
node src/github.js Surfrrosa shainAI shainai

# Ingest files
node src/files.js ~/Documents/notes.pdf pomodoroflow

# See ingest/README.md for more options
```

4. Start backend:
```bash
cd backend
npm install
npm run dev  # runs on port 3001
```

5. Start frontend:
```bash
cd frontend
npm install
npm run dev  # runs on port 3000
```

6. Open http://localhost:3000 and start chatting

## Project Structure

```
shainai/
├── backend/           # Express API + tools
│   ├── src/
│   │   ├── server.js       # Main API server
│   │   ├── tools/          # RAG tools (search, facts, write)
│   │   └── lib/            # DB, embeddings, orchestrator
│   └── db/
│       └── migrations/     # SQL schema
├── frontend/          # Next.js chat UI
│   └── src/
│       ├── app/            # Pages
│       └── components/     # Chat, ProjectFilter
├── ingest/            # Data ingestion scripts
│   └── src/
│       ├── github.js       # Ingest GitHub repos
│       ├── files.js        # Ingest PDF/MD/TXT
│       └── chats.js        # Ingest chat exports
├── scripts/
│   ├── migrate.sh          # Run DB migrations
│   └── eval.js             # Eval harness
└── docs/              # Documentation
```

## Architecture

### Database Schema

- `memory_chunks`: Embedded text chunks with pgvector for semantic search
- `facts`: Structured key-value facts (deadlines, goals, decisions)
- `journal`: Daily logs and decision entries

### API Endpoints

- `POST /tools/search_memory`: Semantic search
- `POST /tools/get_facts`: Retrieve facts
- `POST /tools/write_memory`: Write journal/facts/chunks
- `POST /api/ask`: Main chat endpoint (orchestrates retrieval + LLM)

### RAG Flow

1. User asks question
2. Generate embedding for query
3. Semantic search (pgvector cosine similarity)
4. Retrieve structured facts
5. Generate answer with Claude + citations
6. Suggest memory writes (journal/facts)

## Testing

Run eval harness to test retrieval quality:

```bash
node scripts/eval.js
```

This runs test queries and evaluates:
- Answer quality
- Citation count and validity
- Response latency

## Deployment

### Backend (Railway/Render)
1. Deploy Express app from `backend/`
2. Set environment variables
3. Run migrations on production DB

### Frontend (Vercel)
1. Deploy Next.js app from `frontend/`
2. Set `NEXT_PUBLIC_API_URL` to backend URL

### Database (Neon)
1. Create Postgres database with pgvector
2. Run migrations via Neon SQL Editor or psql

## Costs

Estimated monthly costs (light usage):
- Neon Postgres: $19/mo (Pro plan with pgvector)
- OpenAI embeddings: ~$0.02 per 1M tokens
- Claude API: ~$3-15 per 1M tokens (Sonnet)
- Vercel/Railway: Free tier available

## Roadmap

- [x] Core RAG pipeline
- [x] GitHub/file/chat ingestion
- [x] Eval harness
- [ ] Frontend integration with /api/ask
- [ ] "Save to memory" toggle in chat
- [ ] Daily cron for automatic journal
- [ ] Notion/Drive integrations
- [ ] Multi-user auth
- [ ] Sharing/collaboration

## License

MIT License - see [LICENSE](LICENSE)

Copyright © 2025 Shaina Pauley

---

Made with ❤️ and Claude Code
