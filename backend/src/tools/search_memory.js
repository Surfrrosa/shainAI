import { queryMany } from '../lib/db.js';
import { getEmbedding } from '../lib/embeddings.js';
import pgvector from 'pgvector';

/**
 * Search memory using semantic similarity
 * @param {Object} params
 * @param {string} params.query - Search query
 * @param {string} [params.project] - Filter by project
 * @param {number} [params.top_k=10] - Number of results to return
 * @param {string} [params.since] - ISO date to filter by created_at
 * @returns {Promise<Array>} Array of memory chunks with similarity scores
 */
export async function searchMemory({ query, project, top_k = 10, since }) {
  // Get embedding for query
  const queryEmbedding = await getEmbedding(query);
  const queryVector = pgvector.toSql(queryEmbedding);

  // Build SQL query
  let sql = `
    SELECT
      id,
      project,
      source,
      uri,
      title,
      content,
      tokens,
      created_at,
      1 - (embedding <=> $1) AS similarity
    FROM memory_chunks
    WHERE 1=1
  `;

  const params = [queryVector];
  let paramIndex = 2;

  // Add filters
  if (project) {
    sql += ` AND project = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }

  if (since) {
    sql += ` AND created_at >= $${paramIndex}`;
    params.push(since);
    paramIndex++;
  }

  // Order by similarity and limit
  sql += `
    ORDER BY similarity DESC
    LIMIT $${paramIndex}
  `;
  params.push(top_k);

  // Execute query
  const results = await queryMany(sql, params);

  return results.map(row => ({
    id: row.id,
    project: row.project,
    source: row.source,
    uri: row.uri,
    title: row.title,
    content: row.content,
    tokens: row.tokens,
    created_at: row.created_at,
    similarity: parseFloat(row.similarity).toFixed(3),
  }));
}
