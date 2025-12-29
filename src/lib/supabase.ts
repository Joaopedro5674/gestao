
import { createClient } from '@supabase/supabase-js';

// Ensure we don't crash on client-side if envs are missing (common Vercel issue)
// Fallback allows build to proceed (createClient throws if URL is empty)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Supabase credentials are missing. Check .env.local or Vercel Settings.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
