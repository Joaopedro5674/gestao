
import { AlertCircle, CheckCircle, RefreshCw, WifiOff, Activity } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SystemStatus() {
    const { syncStatus, lastSync } = useApp();
    const [lastCron, setLastCron] = useState<string | null>(null);

    useEffect(() => {
        // Fetch Anti-Hibernation Status
        const fetchCronStatus = async () => {
            const { data } = await supabase
                .from('system_health')
                .select('value, updated_at')
                .eq('key', 'anti_hibernation_last_run')
                .single();

            if (data?.value) {
                setLastCron(data.value);
            }
        };
        fetchCronStatus();

        // Refresh every minute
        const interval = setInterval(fetchCronStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
            {lastCron && (
                <div title={`Anti-Hibernação executado em: ${new Date(lastCron).toLocaleString()}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-tertiary)', fontSize: '0.7rem' }}>
                    <Activity size={10} />
                    <span>Cron: {formatTime(lastCron)}</span>
                </div>
            )}
        </div>
    );
}
