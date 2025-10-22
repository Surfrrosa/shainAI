-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- memory_chunks: stores embedded text chunks from various sources
CREATE TABLE memory_chunks (
  id SERIAL PRIMARY KEY,
  project VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'github', 'file', 'chat', etc.
  uri TEXT NOT NULL, -- unique identifier (repo URL, file path, chat ID)
  title TEXT,
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  embedding vector(1536) -- OpenAI ada-002 or text-embedding-3-small
);

-- facts: structured key-value facts about projects
CREATE TABLE facts (
  id SERIAL PRIMARY KEY,
  project VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL, -- 'deadline', 'goal', 'decision', 'setting', etc.
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- journal: daily logs and decision entries
CREATE TABLE journal (
  id SERIAL PRIMARY KEY,
  project VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  tags TEXT[], -- array of tags for filtering
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_memory_chunks_project ON memory_chunks(project);
CREATE INDEX idx_memory_chunks_source ON memory_chunks(source);
CREATE INDEX idx_memory_chunks_created_at ON memory_chunks(created_at DESC);
CREATE INDEX idx_memory_chunks_embedding ON memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_facts_project ON facts(project);
CREATE INDEX idx_facts_kind ON facts(kind);
CREATE INDEX idx_facts_project_kind ON facts(project, kind);
CREATE INDEX idx_facts_updated_at ON facts(updated_at DESC);

CREATE INDEX idx_journal_project ON journal(project);
CREATE INDEX idx_journal_created_at ON journal(created_at DESC);
CREATE INDEX idx_journal_tags ON journal USING GIN(tags);

-- Unique constraint for facts (one value per project+kind+key)
CREATE UNIQUE INDEX idx_facts_unique ON facts(project, kind, key);

-- Hash index for URI deduplication
CREATE INDEX idx_memory_chunks_uri_hash ON memory_chunks USING hash(uri);
