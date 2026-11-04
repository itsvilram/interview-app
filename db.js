import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

// Fail fast at startup instead of failing on the first request.
if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env and fill them in.');
}

// The secret key stays on the server only. The browser never talks to
// Supabase directly; it calls our API, and the API talks to the database.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
