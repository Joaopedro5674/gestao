import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://qyqirvgcrdoeoxhyngbh.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    "placeholder";

if (!SUPABASE_URL || SUPABASE_SERVICE_ROLE_KEY === "placeholder") {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
        console.warn("WARNING: Supabase Admin Keys missing. Server-side operations will fail.");
    }
}

// Admin instance (Service Role)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
