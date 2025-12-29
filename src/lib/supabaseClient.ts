import { createClient } from '@supabase/supabase-js';

// STRICT: Only use NEXT_PUBLIC_ keys here.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (typeof window !== 'undefined') {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error("CRITICAL: Supabase Public Keys missing. Check environment variables.");
    }
}

// Client-side safe instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});
