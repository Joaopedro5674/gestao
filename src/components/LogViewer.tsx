
import { useEffect, useState } from "react";
import { X, RefreshCw, Archive } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface EventLog {
    id: string;
    tipo_evento: string;
    entidade: string;
    descricao: string;
    created_at: string;
}

export default function LogViewer({ onClose }: { onClose: () => void }) {
    const [logs, setLogs] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('event_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, background: 'var(--color-surface-1)' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Archive size={20} />
                        <h3 style={{ margin: 0 }}>Logs de Auditoria</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={fetchLogs} className="btn" style={{ padding: '4px 8px' }}>
                            <RefreshCw size={16} />
                        </button>
                        <button onClick={onClose} className="btn" style={{ padding: '4px 8px' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando logs...</p>
                    ) : logs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum log encontrado.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {logs.map(log => (
                                <div key={log.id} style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--color-surface-2)',
                                    borderLeft: `4px solid ${log.tipo_evento === 'error' ? 'var(--color-error)' : 'var(--color-primary)'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                        <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{log.tipo_evento} • {log.entidade}</span>
                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem' }}>
                                        {log.descricao}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
