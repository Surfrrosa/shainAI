# ShainAI Frontend

Next.js chat interface for interacting with your project brain.

## Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React hooks for state management

## Features

- Chat interface with message history
- Project filtering (all projects or specific project)
- Citation display for RAG responses
- Clean, dark UI matching PomodoroFlow aesthetic

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main chat page
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── Chat.tsx           # Chat interface
│   │   └── ProjectFilter.tsx  # Project sidebar
│   └── lib/
│       └── api.ts             # API client (TODO)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Start dev server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Development

- Frontend runs on port 3000
- Connects to backend API at port 3001
- Hot reload enabled for fast iteration

## TODO

- [ ] Implement /api/ask endpoint integration
- [ ] Add "Save to memory" toggle
- [ ] Add "Today" panel showing recent journal entries
- [ ] Add citation drawer for expanding sources
- [ ] Add keyboard shortcuts (CMD+K for quick search)
- [ ] Add fact editing UI
- [ ] Add ingest UI for uploading files
