import { query, queryOne } from '../lib/db.js';
import { getEmbedding } from '../lib/embeddings.js';
import pgvector from 'pgvector';

/**
 * Write to memory (journal or facts)
 * @param {Object} params
 * @param {string} params.project - Project namespace
 * @param {string} params.type - 'journal' or 'fact' or 'chunk'
 * @param {Object} params.payload - Data to write
 * @returns {Promise<Object>} Written record
 */
export async function writeMemory({ project, type, payload }) {
  if (type === 'journal') {
    return await writeJournal(project, payload);
  } else if (type === 'fact') {
    return await writeFact(project, payload);
  } else if (type === 'chunk') {
    return await writeChunk(project, payload);
  } else {
    throw new Error(`Unknown write type: ${type}`);
  }
}

async function writeJournal(project, payload) {
  const { summary, details, tags = [] } = payload;

  if (!summary) {
    throw new Error('summary is required for journal entries');
  }

  const result = await queryOne(
    `INSERT INTO journal (project, summary, details, tags)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [project, summary, details, tags]
  );

  return { type: 'journal', record: result };
}

async function writeFact(project, payload) {
  const { kind, key, value } = payload;

  if (!kind || !key || !value) {
    throw new Error('kind, key, and value are required for facts');
  }

  // Upsert: insert or update if exists
  const result = await queryOne(
    `INSERT INTO facts (project, kind, key, value)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project, kind, key)
     DO UPDATE SET value = $4, updated_at = NOW()
     RETURNING *`,
    [project, kind, key, value]
  );

  return { type: 'fact', record: result };
}

async function writeChunk(project, payload) {
  const { source, uri, title, content, tokens } = payload;

  if (!source || !uri || !content) {
    throw new Error('source, uri, and content are required for memory chunks');
  }

  // Check if chunk already exists (deduplication)
  const existing = await queryOne(
    `SELECT id FROM memory_chunks WHERE uri = $1`,
    [uri]
  );

  if (existing) {
    console.log(`Chunk already exists: ${uri}`);
    return { type: 'chunk', record: existing, skipped: true };
  }

  // Generate embedding
  const embedding = await getEmbedding(content);
  const embeddingVector = pgvector.toSql(embedding);

  // Insert chunk
  const result = await queryOne(
    `INSERT INTO memory_chunks (project, source, uri, title, content, tokens, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, project, source, uri, title, tokens, created_at`,
    [project, source, uri, title, content, tokens || 0, embeddingVector]
  );

  return { type: 'chunk', record: result };
}
