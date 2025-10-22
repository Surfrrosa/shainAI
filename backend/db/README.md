# Database Schema

ShainAI uses Postgres with pgvector for semantic search.

## Tables

### memory_chunks
Stores embedded text chunks from various sources (GitHub, files, chats).

- `project`: namespace for filtering (e.g., 'pomodoroflow', 'shainai')
- `source`: origin type ('github', 'file', 'chat')
- `uri`: unique identifier (repo URL, file path, chat export ID)
- `title`: human-readable title for citations
- `content`: the actual text chunk
- `tokens`: approximate token count for cost tracking
- `embedding`: 1536-dim vector (OpenAI text-embedding-3-small)

### facts
Structured key-value facts about projects.

- `project`: namespace
- `kind`: fact type ('deadline', 'goal', 'decision', 'setting')
- `key`: fact identifier
- `value`: fact content (can be JSON)
- Unique constraint on (project, kind, key)

### journal
Daily logs and decision entries.

- `project`: namespace
- `summary`: short description
- `details`: full entry (markdown)
- `tags`: array of tags for filtering

## Migrations

Run migrations in order:
```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

## Indexes

- Semantic search: IVFFlat index on memory_chunks.embedding
- Fast lookups: B-tree indexes on project, source, kind
- Text search: GIN index on journal.tags
- Deduplication: Hash index on memory_chunks.uri

## Local Setup

1. Install Postgres 15+ with pgvector
2. Create database: `createdb shainai_dev`
3. Run migrations: `psql shainai_dev -f migrations/001_init.sql`

## Production (Neon)

1. Create Neon project with pgvector enabled
2. Copy DATABASE_URL to .env
3. Run migrations via Neon SQL Editor or `psql`
