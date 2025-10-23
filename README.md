# ShainAI

**Your privacy-first, RAG-powered second brain that remembers everything.**

A retrieval-augmented generation (RAG) system that ingests, indexes, and semantically searches across all your personal data sources. Ask questions and get AI-powered answers with citations from your own knowledge base—ChatGPT conversations, code repos, notes, local files, and more.

> **Stack:** Next.js 14 • Node/Express • PostgreSQL + pgvector • OpenAI GPT-4 Turbo • React • TypeScript

## Why Local-First?

ShainAI runs entirely on your machine because:
- **Privacy:** Your data never leaves your computer
- **Speed:** No network latency for retrieval
- **Cost:** No API charges for storage/search
- **Control:** You own your data completely

## Features

**Core Capabilities:**
- Semantic search across all personal data with vector embeddings (1536-dim)
- GPT-4 powered answers with source citations
- Markdown rendering with code highlighting
- Collapsible references for clean UX

**Auto-Ingestion Pipeline:**
- Real-time file monitoring (Desktop, Downloads, Documents)
- Git post-commit hooks—auto-ingest on every commit
- Multi-format parsers: PDF, Word, Pages, images (OCR), .env files, ZIP archives
- ChatGPT conversation exports, Joplin notes (.jex), Mac Notes

**Meta-Memory:**
- ShainAI saves its own conversations every 5 Q&A exchanges
- Ask ShainAI about past conversations: "What did I ask you about yesterday?"
- Creates a recursive knowledge loop

**Data Persistence:**
- LocalStorage for session continuity
- Database ingestion with semantic deduplication
- Copy/export conversations anytime

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- OpenAI API key

### 1. Clone and Setup

```bash
git clone https://github.com/Surfrrosa/shainAI.git
cd shainAI
cp .env.example backend/.env
```

Edit `backend/.env` and add:
```
DATABASE_URL=postgresql://user:password@localhost:5432/shainai
OPENAI_API_KEY=sk-proj-your-key-here
PORT=3001
```

### 2. Database Setup

```bash
# Install PostgreSQL and create database
createdb shainai

# Enable pgvector extension
psql shainai -c "CREATE EXTENSION vector;"

# Run migrations
cd backend
npm install
./db/migrate.sh
```

### 3. Start Backend

```bash
cd backend
npm run dev  # Runs on port 3001
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev  # Runs on port 3002
```

### 5. Ingest Your Data

```bash
cd ingest
npm install

# Example: Ingest ChatGPT export
node src/chatgpt.js ~/Downloads/conversations.json

# Example: Ingest Joplin notes
node src/joplin.js ~/Downloads/export.jex

# Example: Ingest local files
node src/local.js ~/Desktop ~/Documents

# Example: Ingest GitHub repo
node src/github.js <owner> <repo> <project>
```

### 6. Optional: Set Up Auto-Ingestion

**File Watcher (real-time):**
```bash
cd ingest
node src/watcher.js ~/Desktop ~/Downloads ~/Documents
```

**Git Hooks (per repository):**
```bash
cd your-repo
/path/to/shainai/scripts/install-git-hook.sh
```

### 7. Start Chatting

Open `http://localhost:3002` and ask your second brain anything!

## Project Structure

```
shainai/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── server.js        # Main API (search, ask, ingest)
│   │   ├── tools/           # RAG tools (search_memory, get_facts, write_memory)
│   │   └── lib/
│   │       ├── db.js        # PostgreSQL + pgvector connection
│   │       ├── embeddings.js # OpenAI text-embedding-3-small
│   │       ├── orchestrator.js # GPT-4 answer generation
│   │       └── prompts.js   # System prompts
│   └── db/
│       └── migrations/      # SQL schema definitions
├── frontend/                # Next.js 14 chat interface
│   └── src/
│       ├── app/             # Next.js app router
│       └── components/
│           └── Chat.tsx     # Main chat component
├── ingest/                  # Data ingestion pipeline
│   └── src/
│       ├── chatgpt.js       # ChatGPT conversation exports
│       ├── joplin.js        # Joplin note archives (.jex)
│       ├── mac-notes.js     # Mac Notes database
│       ├── github.js        # GitHub repository cloning
│       ├── local.js         # Local file scanning
│       ├── watcher.js       # Real-time file monitoring
│       ├── parsers.js       # Multi-format parsers (PDF, Word, OCR, etc.)
│       └── utils.js         # Chunking, deduplication, batch insert
├── scripts/
│   ├── git-post-commit-hook.sh  # Auto-ingest on commit
│   └── install-git-hook.sh      # Hook installer
└── README.md
```

## Supported Ingestion Sources

| Source | Format | Parser | Auto-Ingest |
|--------|--------|--------|-------------|
| ChatGPT Exports | `.json` | Custom | Manual |
| Joplin Notes | `.jex` (tar) | tar-stream | Manual |
| Mac Notes | SQLite DB | better-sqlite3 | Manual |
| GitHub Repos | Git clone | simpleGit | Git hooks |
| Local Files | `.md`, `.txt`, `.js`, `.ts`, etc. | fs | File watcher |
| PDF Documents | `.pdf` | pdf-parse (disabled) | File watcher |
| Word Documents | `.docx`, `.doc` | mammoth | File watcher |
| Pages Documents | `.pages` | AdmZip + XML | File watcher |
| Images | `.png`, `.jpg`, `.gif` | Tesseract (OCR) | File watcher |
| Environment Files | `.env` | Custom parser (masked) | File watcher |
| ZIP Archives | `.zip` | AdmZip | File watcher |

## Architecture

### Database Schema

- **memory_chunks**: Text chunks with 1536-dim embeddings (pgvector)
  - Columns: `id`, `project`, `source`, `uri`, `title`, `content`, `tokens`, `embedding`, `created_at`
  - Index: IVFFlat on embedding (cosine distance)
- **facts**: Structured key-value facts
  - Columns: `id`, `project`, `kind`, `key`, `value`, `updated_at`
- **journal**: Daily logs and decision entries (optional, not currently used)

### API Endpoints

- `POST /tools/search_memory`: Semantic search with vector similarity
- `POST /tools/get_facts`: Retrieve structured facts
- `POST /tools/write_memory`: Write journal/facts/chunks
- `POST /api/ask`: Main chat endpoint (orchestrates retrieval + GPT-4)
- `POST /api/ingest-conversation`: Save ShainAI conversations to memory

### RAG Flow

1. User asks question in chat
2. Generate embedding for query (OpenAI text-embedding-3-small)
3. Semantic search using pgvector cosine similarity (top 5 results)
4. Retrieve relevant structured facts
5. Build context from retrieved chunks + facts
6. Generate answer with GPT-4 Turbo + prompt engineering
7. Return answer with citations and suggested memory writes

## Development Roadmap

**Completed:**
- [x] Core RAG pipeline with pgvector semantic search
- [x] GPT-4 orchestration with citations
- [x] Chat interface with markdown rendering
- [x] Multi-source ingestion (ChatGPT, Joplin, GitHub, local files)
- [x] Auto-ingestion via file watchers and git hooks
- [x] Multi-format parsers (PDF, Word, Pages, images, .env, ZIP)
- [x] Meta-memory: ShainAI saves its own conversations
- [x] Copy/export conversation functionality
- [x] Collapsible citations for clean UX
- [x] LocalStorage persistence

**In Progress:**
- [ ] Mac Notes ingestion (requires Full Disk Access)
- [ ] PDF parser fix (library bug workaround)

**Future Enhancements:**
- [ ] Conversation history browser/search
- [ ] Manual fact editing UI
- [ ] Custom ingestion schedules
- [ ] Export to markdown/PDF
- [ ] Multi-project switching UI
- [ ] Notion/Google Drive integrations
- [ ] Voice input/output

## License

MIT License - see [LICENSE](LICENSE)

Copyright © 2025 Shaina Pauley

---

Built with Claude Code
