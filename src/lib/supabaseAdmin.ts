import { createClient } from '@supabase/supabase-js';

// STRICT: Server-side ONLY. Never expose to client.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Only warn if we are actually running on the server and missing keys
    // This prevents build-time noise if envs aren't loaded yet
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
