"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Imovel } from "@/types";

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const router = useRouter();
    // Updated: imoveis, atualizarImovel, deletarImovel
    const { imoveis, atualizarImovel, deletarImovel } = useApp();
    const [property, setProperty] = useState<Imovel | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        paymentDay: "",
    });

    useEffect(() => {
        if (imoveis.length > 0) {
            const found = imoveis.find((p) => p.id === id);
            if (found) {
                setProperty(found);
                setFormData({
                    name: found.nome,
                    rentAmount: found.valor_aluguel.toString().replace('.', ','),
                    // Check if paymentDay exists in schema. It was missing in new schema description.
                    // If DB has it but type doesn't, we can ignore or add it to type.
                    // Assuming basic schema: nome, valor_aluguel. 
                    // Legacy had paymentDay. If strict schema doesn't have it, we shouldn't try to edit it.
                    // Let's remove paymentDay from edit if it's not in Imovel type.
                    // Wait, Imovel type in types/index.ts is: id, nome, valor_aluguel, ativo. NO paymentDay.
                    // So we should remove it from UI to avoid confusion or errors.
                    paymentDay: "10", // Dummy
                });
            }
        }
    }, [id, imoveis]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!property) return;

        await atualizarImovel(property.id, {
            nome: formData.name,
            valor_aluguel: parseFloat(formData.rentAmount.replace(',', '.')),
            // paymentDay ignored
            // Ativo preserved
            ativo: property.ativo
        });

        router.push("/properties");
    };

    if (!property) return <div className="container">Carregando...</div>;

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/properties" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Editar Imóvel</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                    <p><strong>Atenção:</strong> Alterações de valor afetam apenas o futuro.</p>
                </div>

                <div className="form-group">
                    <label className="label">Nome / Identificação</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="label">Valor do Aluguel (R$)</label>
                    <input
                        type="number"
                        className="input"
                        value={formData.rentAmount}
                        onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                        required
                        step="0.01"
                    />
                </div>

                {/* Removed Payment Day as it's not in schema */}

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    <Save size={20} style={{ marginRight: '8px' }} /> Salvar Alterações
                </button>
            </form>

            <button
                type="button"
                onClick={async () => {
                    if (window.confirm("CONFIRMAÇÃO NECESSÁRIA:\n\nDeseja realmente apagar este imóvel?\n\nEle será removido da lista ativa, mas o histórico financeiro será preservado para relatórios.")) {
                        await deletarImovel(property.id);
                        router.push("/properties");
                    }
                }}
                className="btn"
                style={{
                    marginTop: 'var(--space-lg)',
                    width: '100%',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)',
                    background: 'transparent',
                    fontWeight: '600'
                }}
            >
                Apagar Imóvel
            </button>
        </div>
    );
}
