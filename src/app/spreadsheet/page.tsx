"use client";

import { useFinancialData } from "@/hooks/useFinancialData";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { exportToExcel } from "@/utils/exportUtils";


export default function SpreadsheetPage() {
    const { spreadsheet, loading } = useFinancialData();
    const [activeTab, setActiveTab] = useState<'rentals' | 'loans'>('rentals');
    const [filterActive, setFilterActive] = useState(true); // Default to Active Only
    const [now, setNow] = useState(new Date());

    if (loading) return <div className="p-8 text-center">Carregando dados...</div>;

    // --- FILTER LOGIC ---
    const filteredRentals = spreadsheet.rentals;

    const filteredLoans = spreadsheet.loans.filter(l => {
        if (!filterActive) return true; // Show all
        return l.status === 'Ativo' || l.status === 'Atrasado';
    });

    const currentData = activeTab === 'rentals' ? filteredRentals : filteredLoans;

    // --- SNAPSHOT EXPORT ---
    const handleExport = () => {
        const formattedDate = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const timestamp = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
        const filename = `Relatorio_Financeiro_${formattedDate}_${timestamp}.xlsx`;

        // Calculate period (from data if available, or just use current month as label)
        const periodLabel = activeTab === 'rentals' && filteredRentals.length > 0
            ? `Janeiro-${now.getFullYear()}` // Simplified period for internal branding
            : 'Geral';

        const metadata = [
            { label: 'Data da Exportação', value: now.toLocaleString('pt-BR') },
            { label: 'Sistema', value: 'Gestão Patrimonial' },
        ];

        exportToExcel([
            {
                name: 'Imóveis',
                data: filteredRentals.map(r => ({
                    'Imóvel': r.property,
                    'Mês/Ano': r.month,
                    'Valor Aluguel': r.rentValue,
                    'Status': r.status,
                    'Data Pagamento': r.paymentDate,
                    'Receita': r.revenue,
                    'Gastos': r.expenses,
                    'Lucro Líquido': r.netProfit
                })),
                metadata: [...metadata, { label: 'Tipo', value: 'Relatório de Aluguéis' }]
            },
            {
                name: 'Empréstimos',
                data: filteredLoans.map(l => ({
                    'Cliente': l.client,
                    'Vlr Emprestado': l.principal,
                    'Taxa': l.rate,
                    'Dias': l.days,
                    'Juros': l.interest,
                    'Total Receber': l.total,
                    'Status': l.status,
                    'Início': l.startDate,
                    'Vencimento': l.dueDate,
                    'Pago Em': l.paidDate
                })),
                metadata: [...metadata, { label: 'Tipo', value: 'Relatório de Empréstimos' }]
            }
        ], filename);
    };

    // --- TOTALS ---
    const totalValue = currentData.reduce((acc: number, item: any) => {
        if (activeTab === 'rentals') return acc + (item.netProfit || 0);
        return acc + (item.total || 0);
    }, 0);

    return (
        <div className="container mx-auto p-4 max-w-6xl pb-24">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Planilha Geral</h1>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <RefreshCw size={10} />
                            {now.toLocaleString('pt-BR')}
                            <span className="mx-1">•</span>
                            {currentData.length} registros
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm shadow-sm"
                    >
                        <Download size={16} />
                        Exportar Excel (.xlsx)
                    </button>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-6">
                {/* TABS */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('rentals')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'rentals' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Aluguéis
                    </button>
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'loans' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Empréstimos
                    </button>
                </div>

                {/* FILTERS */}
                {activeTab === 'loans' && (
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2">
                        <input
                            type="checkbox"
                            checked={filterActive}
                            onChange={e => setFilterActive(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Apenas Empréstimos Ativos</span>
                    </label>
                )}
            </div>

            {/* TOTALS SUMMARY */}
            <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Listado (Estimativa)</span>
                <span className="text-xl font-bold text-gray-800">
                    {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>

            {/* CONTENT */}
            <div className="bg-white border md:rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {activeTab === 'rentals' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-4 py-3">Imóvel</th>
                                    <th className="px-4 py-3">Mês/Ano</th>
                                    <th className="px-4 py-3 text-right">Valor Aluguel</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3">Data Pagto</th>
                                    <th className="px-4 py-3 text-right">Gastos</th>
                                    <th className="px-4 py-3 text-right font-bold text-gray-800">Lucro Líq.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((r: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{r.property}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.month}</td>
                                            <td className="px-4 py-3 text-right text-gray-800">
                                                {r.rentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">{r.paymentDate}</td>
                                            <td className="px-4 py-3 text-right text-red-600">
                                                - {r.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                                                {r.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3 text-right">Emprestado</th>
                                    <th className="px-4 py-3 text-center">Taxa</th>
                                    <th className="px-4 py-3 text-center">Dias</th>
                                    <th className="px-4 py-3 text-right">Juros Calc.</th>
                                    <th className="px-4 py-3 text-right font-bold">Total Receber</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Recebido Em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                            Nenhum empréstimo encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((l: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{l.client}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">
                                                {l.principal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500">{l.rate}</td>
                                            <td className="px-4 py-3 text-center text-gray-500">{l.days}</td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                + {l.interest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                {l.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'Recebido' ? 'bg-green-100 text-green-700' :
                                                    l.status === 'Ativo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-gray-500">{l.dateReceived}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="mt-4 text-center text-xs text-gray-400">
                * Valores baseados apenas em registros existentes. Itens apagados não aparecem.
            </div>
        </div>
    );
}
