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

function validateSupabaseUrl(url) {
  if (url.includes('your-project-ref') || url.includes('YOUR_PROJECT')) {
    console.error('\n❌  SUPABASE_URL still has placeholder values.');
    console.error('    Get the real URL from: Supabase Dashboard → Project Settings → API → Project URL\n');
    process.exit(1);
  }
  try { new URL(url); } catch {
    console.error(`\n❌  SUPABASE_URL is not a valid URL: "${url}"\n`);
    process.exit(1);
  }
}

const supabaseUrl = requireEnv('SUPABASE_URL');
validateSupabaseUrl(supabaseUrl);

export const config = {
  NODE_ENV:     process.env.NODE_ENV || 'development',
  PORT:         parseInt(process.env.PORT || '8000', 10),
  SUPABASE_URL: supabaseUrl,
  SUPABASE_KEY: requireEnv('SUPABASE_ANON_KEY'),
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
};
