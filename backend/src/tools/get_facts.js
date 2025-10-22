import { queryMany } from '../lib/db.js';

/**
 * Get facts from the facts table
 * @param {Object} params
 * @param {string} [params.project] - Filter by project
 * @param {string} [params.kind] - Filter by fact kind (deadline, goal, decision, etc.)
 * @param {string[]} [params.keys] - Filter by specific keys
 * @returns {Promise<Array>} Array of facts
 */
export async function getFacts({ project, kind, keys }) {
  let sql = `
    SELECT
      id,
      project,
      kind,
      key,
      value,
      updated_at
    FROM facts
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  // Add filters
  if (project) {
    sql += ` AND project = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }

  if (kind) {
    sql += ` AND kind = $${paramIndex}`;
    params.push(kind);
    paramIndex++;
  }

  if (keys && keys.length > 0) {
    sql += ` AND key = ANY($${paramIndex})`;
    params.push(keys);
    paramIndex++;
  }

  sql += ` ORDER BY updated_at DESC`;

  const results = await queryMany(sql, params);
  return results;
}
