
import { createClient } from '@supabase/supabase-js';

// Ensure we don't crash on client-side if envs are missing (common Vercel issue)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase credentials are missing. Check .env.local or Vercel Settings.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
