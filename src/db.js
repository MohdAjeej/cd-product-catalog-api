import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/** @type {pg.Pool | null} */
let pool = null;

// Supabase / Neon and any URL with sslmode=require need SSL
function sslConfig(url) {
  const needsSsl =
    url.includes('.supabase.co') ||
    url.includes('.supabase.com') ||
    url.includes('.neon.tech') ||
    url.includes('sslmode=require');
  return needsSsl ? { rejectUnauthorized: false } : undefined;
}

export async function initPool() {
  pool = new Pool({
    connectionString:    config.DATABASE_URL,
    max:                 config.DB_MAX_CONNECTIONS,
    min:                 config.DB_MIN_CONNECTIONS,
    idleTimeoutMillis:   30_000,
    connectionTimeoutMillis: 5_000,
    ssl:                 sslConfig(config.DATABASE_URL),
  });

  // Validate connection at startup
  const client = await pool.connect();
  client.release();
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database pool not initialised');
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
