/**
 * Seeds the products table with synthetic data using PostgreSQL's unnest()
 * for bulk inserts — no extra packages required.
 *
 * Benchmark: ~40 000–80 000 rows/s depending on DB latency.
 * Default: 200 000 rows in batches of 10 000.
 *
 * Usage:
 *   npm run seed
 *   npm run seed -- --count 500000 --batch 20000
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import pg from 'pg';

const { Client } = pg;

// ── Word lists for fast synthetic name generation ────────────────────────────
const ADJECTIVES = [
  'Advanced', 'Premium', 'Smart', 'Pro', 'Elite', 'Classic', 'Modern',
  'Digital', 'Wireless', 'Portable', 'Compact', 'Deluxe', 'Enhanced',
  'Superior', 'Ultra', 'Nano', 'Turbo', 'Eco', 'Flex', 'Max',
];
const BRANDS = [
  'TechPro', 'SmartBase', 'EliteWear', 'ComfortPlus', 'SpeedMax',
  'NatureBest', 'ClearVision', 'PowerCore', 'FlexFit', 'BrightLine',
  'AquaEdge', 'SkyForge', 'IronCraft', 'SilkWave', 'NovaBrand',
];
const NOUNS = [
  'Widget', 'Gadget', 'Device', 'Tool', 'Kit', 'Set', 'Bundle', 'Pack',
  'Collection', 'Series', 'Edition', 'Model', 'Unit', 'System', 'Module',
  'Station', 'Hub', 'Drive', 'Pad', 'Guard',
];
const CATEGORIES = [
  'Electronics', 'Clothing', 'Books', 'Sports', 'Home',
  'Beauty', 'Toys', 'Food', 'Automotive', 'Health',
];

const WINDOW_MS  = 730 * 24 * 60 * 60 * 1000; // 2 years in ms
const MONTH_MS   =  30 * 24 * 60 * 60 * 1000;
const NOW        = Date.now();

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateBatch(size) {
  const ids        = [];
  const names      = [];
  const categories = [];
  const prices     = [];
  const createdAts = [];
  const updatedAts = [];

  for (let i = 0; i < size; i++) {
    const createdMs = NOW - Math.floor(Math.random() * WINDOW_MS);
    const updatedMs = Math.min(NOW, createdMs + Math.floor(Math.random() * MONTH_MS));

    ids.push(randomUUID());
    names.push(`${pick(ADJECTIVES)} ${pick(BRANDS)} ${pick(NOUNS)} ${randInt(1, 999)}`);
    categories.push(pick(CATEGORIES));
    prices.push((Math.random() * 9998 + 1).toFixed(2));
    createdAts.push(new Date(createdMs).toISOString());
    updatedAts.push(new Date(updatedMs).toISOString());
  }

  return { ids, names, categories, prices, createdAts, updatedAts };
}

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? parseInt(args[i + 1], 10) : def;
};
const TOTAL      = getArg('--count', 200_000);
const BATCH_SIZE = getArg('--batch', 10_000);

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }

  const needsSsl =
    url.includes('.supabase.co') ||
    url.includes('.supabase.com') ||
    url.includes('.neon.tech') ||
    url.includes('sslmode=require');
  const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;

  const client = new Client({ connectionString: url, ssl });
  await client.connect();

  const numBatches = Math.ceil(TOTAL / BATCH_SIZE);
  let inserted     = 0;
  const t0         = performance.now();

  console.log(`Seeding ${TOTAL.toLocaleString()} products in ${numBatches} batch(es) of ${BATCH_SIZE.toLocaleString()}…\n`);

  for (let b = 0; b < numBatches; b++) {
    const thisSize = Math.min(BATCH_SIZE, TOTAL - inserted);
    const { ids, names, categories, prices, createdAts, updatedAts } = generateBatch(thisSize);

    // unnest() expands parallel arrays into rows — single round-trip per batch
    await client.query(
      `INSERT INTO products (id, name, category, price, created_at, updated_at)
       SELECT * FROM unnest(
         $1::uuid[], $2::text[], $3::text[],
         $4::numeric[], $5::timestamptz[], $6::timestamptz[]
       )`,
      [ids, names, categories, prices, createdAts, updatedAts],
    );

    inserted += thisSize;
    const elapsed = (performance.now() - t0) / 1000;
    const rate    = Math.round(inserted / elapsed);
    console.log(`  [${b + 1}/${numBatches}]  ${inserted.toLocaleString()} rows  |  ${rate.toLocaleString()} rows/s  |  ${elapsed.toFixed(1)}s`);
  }

  const total = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`\nDone. ${inserted.toLocaleString()} products inserted in ${total}s.`);
  await client.end();
}

seed().catch((err) => { console.error(err.message); process.exit(1); });
