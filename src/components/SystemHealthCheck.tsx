"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const SYSTEM_ID = '00000000-0000-0000-0000-000000000001';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function SystemHealthCheck() {
    useEffect(() => {
        // Run once on mount (App Load)
        const checkHealth = async () => {
            try {
                // 1. Consultar last_ping_at
                const { data, error } = await supabase
                    .from('system_health')
                    .select('last_ping_at')
                    .eq('id', SYSTEM_ID)
                    .single();

                if (error || !data) return; // Silent fail

                // 2. Calcular diferença
                const lastPing = new Date(data.last_ping_at).getTime();
                const now = new Date().getTime();
                const diff = now - lastPing;

                // 3. Se > 24h, chamar Keep-Alive
                if (diff > CHECK_INTERVAL_MS) {
                    // Fire and forget, silent
                    fetch('/api/keep-alive', { method: 'GET', keepalive: true }).catch(() => { });
                    console.log("System Health: Fallback ping triggered.");
                }
            } catch {
                // Silent ignore
            }
        };

        // Delay slightly to not impact TTI
        const timer = setTimeout(checkHealth, 5000);
        return () => clearTimeout(timer);
    }, []);

    return null; // Invisible
}
