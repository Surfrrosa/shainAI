import pg from 'pg';
import pgvector from 'pgvector/pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

// Helper: execute query with error handling
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
}

// Helper: get a single row
export async function queryOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

// Helper: get multiple rows
export async function queryMany(text, params) {
  const res = await query(text, params);
  return res.rows;
}
