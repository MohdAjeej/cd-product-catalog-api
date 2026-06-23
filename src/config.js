import 'dotenv/config';

function requireEnv(key) {
  const val = process.env[key];
  if (!val) {
    console.error(`\n❌  Missing env var: ${key}`);
    console.error(`    Copy .env.example → .env and fill in your values.\n`);
    process.exit(1);
  }
  return val;
}

function validateDatabaseUrl(url) {
  // Catch un-replaced placeholders like [YOUR-PASSWORD] or [PROJECT-REF]
  if (url.includes('[') || url.includes(']')) {
    console.error('\n❌  DATABASE_URL still contains placeholder values.');
    console.error('    Replace [YOUR-PASSWORD] and [PROJECT-REF] with your actual Supabase credentials.');
    console.error('    Get your connection string from:');
    console.error('    Supabase Dashboard → Project Settings → Database → Connection string\n');
    process.exit(1);
  }

  try {
    new URL(url);
  } catch {
    console.error('\n❌  DATABASE_URL is not a valid URL.');
    console.error(`    Received: "${url.slice(0, 60)}"`);
    console.error('    Expected format: postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres\n');
    process.exit(1);
  }
}

const rawUrl = requireEnv('DATABASE_URL');
validateDatabaseUrl(rawUrl);

export const config = {
  NODE_ENV:           process.env.NODE_ENV || 'development',
  PORT:               parseInt(process.env.PORT || '8000', 10),
  DATABASE_URL:       rawUrl,
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  DB_MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),
  CORS_ORIGINS:       process.env.CORS_ORIGINS || '*',
};
