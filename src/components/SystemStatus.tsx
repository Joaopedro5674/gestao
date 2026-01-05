
import { AlertCircle, CheckCircle, RefreshCw, WifiOff, Activity } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SystemStatus() {
    const { syncStatus, lastSync } = useApp();
    const [lastCron, setLastCron] = useState<string | null>(null);
    const [cronHealthy, setCronHealthy] = useState<boolean>(true);

    useEffect(() => {
        // Fetch Anti-Hibernation Status from Cron Logs
        const fetchCronStatus = async () => {
            const { data } = await supabase
                .from('cron_logs')
                .select('executed_at')
                .order('executed_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data?.executed_at) {
                setLastCron(data.executed_at);

                // Check health (26 hours threshold)
                const lastRun = new Date(data.executed_at);
                const now = new Date();
                const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
                const isHealthy = diffHours <= 26;

                setCronHealthy(isHealthy);

                // FALLBACK AUTOMÁTICO
                if (!isHealthy) {
                    console.warn("⚠️ Cron atrasado (> 26h). Iniciando fallback...");
                    try {
                        const res = await fetch('/api/cron/keep-alive?type=fallback');
                        const json = await res.json();
                        if (json.status === 'ok') {
                            console.log("✅ Fallback executado com sucesso.");
                            // Re-fetch status to update UI immediately
                            // We call it again effectively resetting the cycle
                            const { data: newData } = await supabase
                                .from('cron_logs')
                                .select('executed_at')
                                .order('executed_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (newData?.executed_at) {
                                setLastCron(newData.executed_at);
                                setCronHealthy(true);
                            }
                        }
                    } catch (err) {
                        console.error("❌ Erro ao executar fallback:", err);
                    }
                }

            } else {
                setCronHealthy(false);
                // Trigger fallback if no logs exist yet (first run scenario or total loss)
                // fetch('/api/cron/keep-alive?type=fallback'); 
                // Commented out to avoid loop on fresh install, but arguably could be enabled.
                // For now, let's strictly follow "if > 26h".
            }
        };
        fetchCronStatus();

        // Refresh every minute
        const interval = setInterval(fetchCronStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (syncStatus === 'error') {
        return (
            <div title="Erro de Sincronização" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: '600' }}>
                <WifiOff size={16} />
                <span>Offline</span>
            </div>
        );
    }

    if (syncStatus === 'syncing') {
        return (
            <div title="Sincronizando..." style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: '600' }}>
                <RefreshCw size={16} className="spin" />
                <span>Sync</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <div title={`Sincronizado: ${lastSync?.toLocaleTimeString()}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: '600' }}>
                <CheckCircle size={14} />
                <span>Supabase Online</span>
            </div>
            {lastCron ? (
                <div
                    title={cronHealthy ? "Cron Ativo" : "Risco de Hibernação - Cron Atrasado"}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: cronHealthy ? 'var(--color-text-tertiary)' : 'var(--color-error)', fontSize: '0.7rem' }}
                >
                    <Activity size={10} />
                    <span>Cron: {formatDateTime(lastCron)}</span>
                    {!cronHealthy && <AlertCircle size={10} style={{ marginLeft: '2px' }} />}
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-tertiary)', fontSize: '0.7rem' }}>
                    <Activity size={10} />
                    <span>Cron: Aguardando...</span>
                </div>
            )}
        </div>
    );
}
