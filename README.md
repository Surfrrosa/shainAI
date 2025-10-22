# ShainAI — Personal Project Brain

ShainAI is a retrieval-augmented “project brain” that remembers everything you’re doing across repos, docs, and chats — and answers with sources.

> Stack: Next.js (frontend) • Node/Express (API) • Postgres + pgvector (Neon) • S3/Supabase storage • OpenAI/Anthropic for LLM + embeddings

## Quick start (local)

```bash
git clone <your-repo-url> ~/projects/shainai
cd ~/projects/shainai
cp .env.example .env
# Fill in DATABASE_URL, OPENAI/ANTHROPIC keys, S3 vars
```
