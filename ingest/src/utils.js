import 'dotenv/config';
import pg from 'pg';
import pgvector from 'pgvector/pg';
import OpenAI from 'openai';
import crypto from 'crypto';

const { Pool } = pg;

// Database connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

await pgvector.registerType(pool);

// OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: generate embedding
export async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000),
  });
  return response.data[0].embedding;
}

// Helper: chunk text into smaller pieces
export function chunkText(text, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += paragraph + '\n\n';
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Helper: estimate tokens
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Helper: generate hash for deduplication
export function generateHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Helper: insert chunk into database
export async function insertChunk(project, source, uri, title, content) {
  try {
    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM memory_chunks WHERE uri = $1',
      [uri]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⏭ Skipped (already exists): ${uri}`);
      return { skipped: true };
    }

    // Generate embedding
    const embedding = await getEmbedding(content);
    const embeddingVector = pgvector.toSql(embedding);
    const tokens = estimateTokens(content);

    // Insert
    const result = await pool.query(
      `INSERT INTO memory_chunks (project, source, uri, title, content, tokens, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [project, source, uri, title, content, tokens, embeddingVector]
    );

    console.log(`  ✓ Inserted: ${title} (${tokens} tokens)`);
    return { id: result.rows[0].id, tokens };
  } catch (error) {
    console.error(`  ✗ Error inserting ${uri}:`, error.message);
    return { error: error.message };
  }
}

// Helper: batch insert chunks with progress
export async function batchInsertChunks(chunks, batchSize = 5) {
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalTokens = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(chunk => insertChunk(
        chunk.project,
        chunk.source,
        chunk.uri,
        chunk.title,
        chunk.content
      ))
    );

    for (const result of results) {
      if (result.skipped) {
        totalSkipped++;
      } else if (result.id) {
        totalInserted++;
        totalTokens += result.tokens || 0;
      }
    }

    console.log(`Progress: ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
  }

  return { inserted: totalInserted, skipped: totalSkipped, tokens: totalTokens };
}
