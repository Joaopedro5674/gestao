import { createClient } from '@supabase/supabase-js';

// STRICT: Only use NEXT_PUBLIC_ keys here.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Client-side safe instance
if (typeof window !== 'undefined') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("CRITICAL: Supabase environment variables are missing! Check Vercel project settings.");
    } else {
        console.log("Supabase initialized successfully.");
    }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});
