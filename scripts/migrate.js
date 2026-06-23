/**
 * Creates the products table and all required indexes.
 * Safe to re-run (uses IF NOT EXISTS throughout).
 *
 * Usage:  npm run migrate
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const SCHEMA = /* sql */ `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    price       NUMERIC(10, 2)  NOT NULL CHECK (price > 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Primary pagination index: newest first, id as stable tie-breaker
CREATE INDEX IF NOT EXISTS idx_products_updated_at_id
    ON products (updated_at DESC, id DESC);

-- Category equality filter
CREATE INDEX IF NOT EXISTS idx_products_category
    ON products (category);

-- Composite: covers both category filter AND pagination in one index scan
CREATE INDEX IF NOT EXISTS idx_products_category_updated_at_id
    ON products (category, updated_at DESC, id DESC);
`;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set');
    process.exit(1);
  }

  const needsSsl =
    url.includes('.supabase.co') ||
    url.includes('.supabase.com') ||
    url.includes('.neon.tech') ||
    url.includes('sslmode=require');
  const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;

  const client = new Client({ connectionString: url, ssl });
  await client.connect();

  try {
    await client.query(SCHEMA);
    console.log('Migration complete.');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
