# ShainAI Ingest

Scripts for ingesting content into ShainAI's memory.

## Supported Sources

- GitHub repos (README, docs, commits, issues)
- Files (PDF, Markdown, plain text)
- Chat exports (Claude, ChatGPT JSON exports)

## Usage

### Ingest GitHub Repository

```bash
cd ingest
npm install
node src/github.js <owner> <repo> <project>

# Example
node src/github.js Surfrrosa pomodoroflow pomodoroflow
```

What gets ingested:
- README.md
- All files in `/docs` folder
- Last 20 commits
- Last 10 open issues

Requires `GITHUB_TOKEN` in `.env` for private repos or higher rate limits.

### Ingest Files

Single file:
```bash
node src/files.js <path> <project>

# Example
node src/files.js ~/Documents/notes.pdf pomodoroflow
```

Entire directory:
```bash
node src/files.js <path> <project> --dir

# Example
node src/files.js ~/Documents/project-notes pomodoroflow --dir
```

Supported formats:
- PDF (.pdf)
- Markdown (.md)
- Plain text (.txt)

Large files are automatically chunked into ~1000 character pieces.

### Ingest Chat Exports

```bash
node src/chats.js <path> <project>

# Example
node src/chats.js ~/Downloads/claude-chats.json pomodoroflow
```

Supports:
- Claude chat exports (JSON)
- ChatGPT exports (JSON)
- Plain text chat logs

## How It Works

1. **Read**: Fetch content from source (GitHub API, file system, etc.)
2. **Chunk**: Split large content into ~1000 char chunks
3. **Embed**: Generate OpenAI embeddings (text-embedding-3-small)
4. **Deduplicate**: Check if URI already exists in database
5. **Insert**: Write to `memory_chunks` table with embedding

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_... (optional, for private repos)
```

## Deduplication

Files are deduplicated by URI:
- GitHub: `https://github.com/owner/repo/blob/main/path`
- Files: `file:///full/path#chunk0`
- Chats: `chat://conversation-id`

Re-running the same ingestion will skip already-inserted chunks.

## Cost Tracking

Each chunk records approximate token count:
- Helps estimate embedding costs
- Can be summed via `SELECT SUM(tokens) FROM memory_chunks WHERE project = 'x'`

Example costs (text-embedding-3-small @ $0.02/1M tokens):
- 100k tokens ≈ $0.002
- 1M tokens ≈ $0.02

## Advanced: Batch Processing

To ingest multiple repos, create a bash script:

```bash
#!/bin/bash
node src/github.js Surfrrosa pomodoroflow pomodoroflow
node src/github.js Surfrrosa shainAI shainai
node src/github.js Surfrrosa prompt2story prompt2story
```

## Roadmap

- [ ] Notion integration
- [ ] Google Drive integration
- [ ] Slack export support
- [ ] Automatic refresh (cron job)
- [ ] Incremental updates (only new content)
