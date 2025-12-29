
import { createClient } from '@supabase/supabase-js';

// NOTE: In a production environment, these should be in .env.local
// For this setup, we are defining them here to ensure it works immediately.
const SUPABASE_URL = "https://qyqirvgcrdoeoxhyngbh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cWlydmdjcmRvZW94aHluZ2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTU2MTUsImV4cCI6MjA4MjU5MTYxNX0.0TSXMtdiHUiMznQeoRKGyaPjAa4Xa5TC1xVchvnSFyI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
