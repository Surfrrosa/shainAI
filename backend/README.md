# ShainAI Backend

Node.js/Express API with tool endpoints for RAG operations.

## Stack

- Express for HTTP server
- Postgres with pgvector for semantic search
- OpenAI for embeddings and LLM
- Anthropic Claude for advanced reasoning

## Structure

```
backend/
├── src/
│   ├── server.js           # Express app
│   ├── lib/
│   │   ├── db.js           # Postgres connection
│   │   └── embeddings.js   # OpenAI embeddings
│   └── tools/
│       ├── search_memory.js   # Semantic search
│       ├── get_facts.js       # Fact retrieval
│       └── write_memory.js    # Write journal/facts/chunks
├── db/
│   ├── migrations/         # SQL migrations
│   └── README.md           # Schema docs
└── package.json
```

## API Endpoints

### Tool Endpoints

#### POST /tools/search_memory
Semantic search across memory chunks.

Request:
```json
{
  "query": "What's left for PH launch?",
  "project": "pomodoroflow",
  "top_k": 10,
  "since": "2025-10-01T00:00:00Z"
}
```

Response:
```json
[
  {
    "id": 123,
    "project": "pomodoroflow",
    "source": "github",
    "uri": "https://github.com/...",
    "title": "README.md",
    "content": "...",
    "tokens": 450,
    "created_at": "2025-10-21T...",
    "similarity": "0.892"
  }
]
```

#### POST /tools/get_facts
Retrieve facts by project/kind/keys.

Request:
```json
{
  "project": "pomodoroflow",
  "kind": "deadline"
}
```

Response:
```json
[
  {
    "id": 1,
    "project": "pomodoroflow",
    "kind": "deadline",
    "key": "product_hunt_launch",
    "value": "2025-10-22",
    "updated_at": "2025-10-21T..."
  }
]
```

#### POST /tools/write_memory
Write journal entries, facts, or chunks.

Request (journal):
```json
{
  "project": "pomodoroflow",
  "type": "journal",
  "payload": {
    "summary": "Finalized PH gallery images",
    "details": "Created 4 HTML templates...",
    "tags": ["launch", "design"]
  }
}
```

Request (fact):
```json
{
  "project": "pomodoroflow",
  "type": "fact",
  "payload": {
    "kind": "decision",
    "key": "video_length",
    "value": "30 seconds max"
  }
}
```

Request (chunk):
```json
{
  "project": "shainai",
  "type": "chunk",
  "payload": {
    "source": "github",
    "uri": "https://github.com/Surfrrosa/shainai/README.md",
    "title": "ShainAI README",
    "content": "...",
    "tokens": 500
  }
}
```

### Orchestration Endpoints

#### POST /api/ask
Main chat endpoint (TODO: implement).

Request:
```json
{
  "message": "What did we decide about analytics?",
  "project": "pomodoroflow",
  "context": []
}
```

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment:
```bash
cp ../.env.example ../.env
# Fill in DATABASE_URL, OPENAI_API_KEY, etc.
```

3. Run migrations:
```bash
npm run migrate
```

4. Start server:
```bash
npm run dev  # development with auto-reload
npm start    # production
```

## Development

- Server runs on port 3001 (configurable via PORT env var)
- Use `node --watch` for auto-reload during development
- Check `/health` endpoint for status

## Database

See [db/README.md](db/README.md) for schema documentation.
