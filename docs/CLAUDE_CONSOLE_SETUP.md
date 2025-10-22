# Claude Console / Local Dev

**Local path:** `/Users/surfrrosa/projects/shainai`

## Recommendation on visibility
Keep the repo **private** while ingesting proprietary docs/chats. Later publish a `shainai-template` without private data.

## Bootstrap commands (Claude can run these)

```bash
mkdir -p /Users/surfrrosa/projects && cd /Users/surfrrosa/projects
git clone <YOUR_GITHUB_REPO_URL> shainai
cd shainai

# baseline files
cat > .env.example <<'EOF'
DATABASE_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=shainai
EOF

# .gitignore
cat > .gitignore <<'EOF'
# Node / Next.js
node_modules/
.next/
out/
dist/
build/
.env
.env.*
.vercel/
coverage/
# Python
__pycache__/
*.py[cod]
.venv/
venv/
.envrc
# macOS
.DS_Store
.AppleDouble
.LSOverride
# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
# Editor
.vscode/
.idea/
*.swp
# Data
data/*
!data/.gitkeep
# Notebooks
*.ipynb_checkpoints

EOF

# LICENSE
cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2025 Shaina Pauley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

EOF

# README
cat > README.md <<'EOF'
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

EOF

mkdir -p backend frontend ingest docs scripts data && touch data/.gitkeep
git add . && git commit -m "chore: baseline scaffolding"
```
