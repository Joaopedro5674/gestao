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
                // 1. Consultar executed_at (Unified Cron Logs)
                const { data, error } = await supabase
                    .from('cron_logs')
                    .select('executed_at')
                    .eq('type', 'anti_hibernation') // Optional: specific type check
                    .order('executed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error || !data) return; // Silent fail

                // 2. Calcular diferença
                const lastPing = new Date(data.executed_at).getTime();
                const now = new Date().getTime();
                const diff = now - lastPing;

                // 3. Se > 26h (Threshold seguro), chamar Keep-Alive
                // Using 26h to align with dashboard alert logic, avoiding false triggers
                const SAFE_THRESHOLD = 26 * 60 * 60 * 1000;

                if (diff > SAFE_THRESHOLD) {
                    // Fire and forget, silent
                    fetch('/api/cron/keep-alive', { method: 'GET', keepalive: true }).catch(() => { });
                    console.log("System Health: Fallback ping triggered (Cron overdue).");
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
