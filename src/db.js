import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let _client = null;

export function initDB() {
  _client = createClient(config.SUPABASE_URL, config.SUPABASE_KEY, {
    auth: { persistSession: false },  // server-side: no session storage needed
  });
  return _client;
}

export function getDB() {
  if (!_client) throw new Error('Supabase client not initialised');
  return _client;
}

// HTTP client — no persistent connections to close
export async function closeDB() {}
