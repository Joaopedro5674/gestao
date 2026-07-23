"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { useApp } from "@/context/AppContext";
import styles from "./calendar.module.css";
import { calcularVencimentoParcela } from "@/utils/loanHelpers";

interface CalendarEvent {
    id: string;
    type: 'loan' | 'rental';
    title: string;
    subtitle: string;
    value: number;
    date: string; // YYYY-MM-DD
    status: 'paid' | 'pending' | 'overdue';
}

export default function CalendarPage() {
    const { imoveis, imoveisPagamentos, emprestimos, emprestimosMeses, loading, nisCalendar } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Normalize today for comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date formatting helpers
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const getLocalYYYYMMDD = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    // Aggregate all events
    const allEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        // EMPRÉSTIMOS
        emprestimos.forEach(emp => {
            // Se já foi pago e não quisermos mostrar, podemos pular, mas vamos manter tudo no calendário para histórico,
            // ou podemos focar nos ativos (Em Andamento). Vamos manter todos e o status diz se está pago.
            
            // Principal / Vencimento Final (Juros Garantidos)
            if (emp.data_fim) {
                const parts = emp.data_fim.split('-');
                if (parts.length === 3) {
                    const dueDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    dueDate.setHours(0, 0, 0, 0);
                    let status: CalendarEvent['status'] = emp.status === 'pago' ? 'paid' : 'pending';
                    if (status === 'pending' && dueDate < today) status = 'overdue';

                    events.push({
                        id: `emp-princ-${emp.id}`,
                        type: 'loan',
                        title: emp.cliente_nome,
                        subtitle: emp.cobranca_mensal ? 'Principal do Empréstimo' : 'Empréstimo (Juros Garantidos)',
                        value: emp.cobranca_mensal ? emp.valor_emprestado : (emp.valor_emprestado + emp.juros_total_contratado),
                        date: getLocalYYYYMMDD(dueDate),
                        status
                    });
                }
            }

            // Juros / Retiradas mensais
            if (emp.cobranca_mensal && emp.data_inicio) {
                const meses = emprestimosMeses.filter(m => m.emprestimo_id === emp.id);
                meses.forEach(m => {
                    if (!m.mes_referencia) return;
                    
                    const dueDate = calcularVencimentoParcela(
                        emp.data_inicio,
                        m.mes_referencia,
                        emp.tipo === 'cartao',
                        emp.cartao_final_nis,
                        nisCalendar
                    );
                    dueDate.setHours(0, 0, 0, 0);

                    let status: CalendarEvent['status'] = m.pago ? 'paid' : 'pending';
                    if (status === 'pending' && dueDate < today) status = 'overdue';

                    events.push({
                        id: `emp-int-${m.id}`,
                        type: 'loan',
                        title: emp.cliente_nome,
                        subtitle: emp.tipo === 'cartao' 
                            ? `Retirada Cartão (${m.mes_referencia})` 
                            : `Juros Mensais (${m.mes_referencia})`,
                        value: m.valor_juros,
                        date: getLocalYYYYMMDD(dueDate),
                        status
                    });
                });
            }
        });

        // ALUGUÉIS / IMÓVEIS
        imoveis.forEach(imovel => {
            if (!imovel.ativo) return;

            const pagamentos = imoveisPagamentos.filter(p => p.imovel_id === imovel.id);
            pagamentos.forEach(p => {
                if (!p.mes_referencia) return;
                const [yearStr, monthStr] = p.mes_referencia.split('-');
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10) - 1;

                const dueDate = new Date(year, month, imovel.dia_pagamento);
                if (dueDate.getMonth() !== month) {
                    dueDate.setDate(0);
                }
                dueDate.setHours(0, 0, 0, 0);

                let status: CalendarEvent['status'] = p.status === 'pago' ? 'paid' : 'pending';
                // Some legacy logic sets "atrasado" in string, but let's re-verify strictly:
                if (status === 'pending' && dueDate < today) status = 'overdue';

                events.push({
                    id: `rent-${p.id}`,
                    type: 'rental',
                    title: imovel.cliente_nome || "Inquilino",
                    subtitle: `Aluguel (${imovel.nome})`,
                    value: imovel.valor_aluguel,
                    date: getLocalYYYYMMDD(dueDate),
                    status
                });
            });
        });

        return events;
    }, [imoveis, imoveisPagamentos, emprestimos, emprestimosMeses, today]);

    // Derived logic for current view month
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const viewMonthEvents = useMemo(() => {
        return allEvents.filter(e => {
            const [y, m] = e.date.split('-');
            return parseInt(y) === currentYear && parseInt(m) - 1 === currentMonth;
        });
    }, [allEvents, currentYear, currentMonth]);

    const stats = useMemo(() => {
        const aVencer = viewMonthEvents.filter(e => e.status === 'pending' && new Date(e.date + 'T12:00:00') >= today).length;
        const vencidos = viewMonthEvents.filter(e => e.status === 'overdue').length;
        const totalMes = viewMonthEvents.reduce((acc, e) => acc + e.value, 0);
        return { aVencer, vencidos, totalMes };
    }, [viewMonthEvents, today]);

    // Calendar generation
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/ De /i, ' de ').replace(/ Do /i, ' do ');

    const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    const handleToday = () => {
        const t = new Date();
        setCurrentDate(t);
        setSelectedDate(t);
    };

    const selectedDateStr = getLocalYYYYMMDD(selectedDate);
    const selectedEvents = allEvents.filter(e => e.date === selectedDateStr);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando calendário...</div>;
    }

    return (
        <div className={`${styles.container} animate-fade-in`}>
            <h1 className={styles.headerTitle}>Calendário de Vencimentos</h1>

            {/* Cards Superiores */}
            <div className={styles.headerCards}>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>A Vencer</div>
                    <div className={`${styles.cardValue} ${styles.cardValueYellow}`}>{stats.aVencer}</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Vencidos</div>
                    <div className={`${styles.cardValue} ${styles.cardValueRed}`}>{stats.vencidos}</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Total no Mês</div>
                    <div className={`${styles.cardValue} ${styles.cardValueBlue}`}>{formatCurrency(stats.totalMes)}</div>
                </div>
            </div>

            {/* Legenda */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={`${styles.eventDot} ${styles.dotYellow}`}></div> Empréstimos
                </div>
                <div className={styles.legendItem}>
                    <div className={`${styles.eventDot} ${styles.dotGreen}`}></div> Aluguéis/Imóveis
                </div>
                <div className={styles.legendItem}>
                    <div className={`${styles.eventDot} ${styles.dotRed}`}></div> Vencidos
                </div>
            </div>

            {/* Calendário */}
            <div className={styles.calendarContainer}>
                <div className={styles.calendarControls}>
                    <button className={styles.btnToday} onClick={handleToday}>Hoje</button>
                    <div className={`${styles.monthTitle} ${styles.capitalize}`}>{monthName}</div>
                    <div className={styles.navButtons}>
                        <button className={styles.btnIcon} onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                        <button className={styles.btnIcon} onClick={handleNextMonth}><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className={styles.weekdaysGrid}>
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className={styles.weekday}>{day}</div>
                    ))}
                </div>

                <div className={styles.daysGrid}>
                    {/* Padding cells */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className={styles.dayCellEmpty} />
                    ))}

                    {/* Actual days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const cellDateStr = getLocalYYYYMMDD(new Date(currentYear, currentMonth, day));
                        const isToday = cellDateStr === getLocalYYYYMMDD(today);
                        const isSelected = cellDateStr === selectedDateStr;

                        const dayEvents = allEvents.filter(e => e.date === cellDateStr);

                        return (
                            <div
                                key={day}
                                className={`${styles.dayCell} ${isSelected ? styles.dayCellActive : ''}`}
                                onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                            >
                                <div className={`${styles.dayNumber} ${isToday ? styles.todayNumber : ''}`}>
                                    {day}
                                </div>
                                <div className={styles.eventsContainer}>
                                    {dayEvents.map(ev => {
                                        let dotClass = '';
                                        if (ev.status === 'overdue') dotClass = styles.dotRed;
                                        else if (ev.type === 'loan') dotClass = styles.dotYellow;
                                        else dotClass = styles.dotGreen;

                                        return <div key={ev.id} className={`${styles.eventDot} ${dotClass}`} />;
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className={styles.listTitle} style={{ marginBottom: 0 }}>
                    {viewMode === 'calendar' ? `Vencimentos do dia ${selectedDate.toLocaleDateString('pt-BR')}` : 'Todos os Vencimentos do Mês'}
                </h2>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.viewToggleBtn} ${viewMode === 'calendar' ? styles.viewToggleBtnActive : ''}`}
                        onClick={() => setViewMode('calendar')}
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button
                        className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                /* LIST VIEW */
                <div className={styles.eventsListSection}>
                    {viewMonthEvents.length === 0 ? (
                        <div className={styles.emptyState}>Nenhum vencimento neste mês.</div>
                    ) : (
                        <div className={styles.listViewContainer}>
                            {[...viewMonthEvents]
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .map(ev => {
                                    const [, , dayStr] = ev.date.split('-');
                                    const evDate = new Date(ev.date + 'T12:00:00');
                                    const monthShort = evDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
                                    let dividerClass = '';
                                    if (ev.status === 'overdue') dividerClass = styles.dividerRed;
                                    else if (ev.type === 'loan') dividerClass = styles.dividerYellow;
                                    else dividerClass = styles.dividerGreen;

                                    let statusLabel = '';
                                    let statusClass = '';
                                    if (ev.status === 'paid') { statusLabel = 'Pago'; statusClass = styles.statusPaid; }
                                    if (ev.status === 'pending') { statusLabel = 'A Vencer'; statusClass = styles.statusPending; }
                                    if (ev.status === 'overdue') { statusLabel = 'Atrasado'; statusClass = styles.statusOverdue; }

                                    return (
                                        <div key={ev.id} className={styles.listViewItem}>
                                            <div className={styles.listViewDate}>
                                                <div className={styles.listViewDay}>{parseInt(dayStr)}</div>
                                                <div className={styles.listViewMonth}>{monthShort}</div>
                                            </div>
                                            <div className={`${styles.listViewDivider} ${dividerClass}`} />
                                            <div style={{ flex: 1 }}>
                                                <div className={styles.eventName}>{ev.title}</div>
                                                <div className={styles.eventSub}>{ev.subtitle}</div>
                                            </div>
                                            <div className={styles.eventValueStatus}>
                                                <div className={styles.eventValue}>{formatCurrency(ev.value)}</div>
                                                <div className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            ) : (
                /* CALENDAR DAY DETAIL VIEW */
                <div className={styles.eventsListSection}>

                {selectedEvents.length === 0 ? (
                    <div className={styles.emptyState}>
                        {(() => {
                            // Find next upcoming event
                            const upcoming = allEvents
                                .filter(e => e.date > selectedDateStr && e.status !== 'paid')
                                .sort((a, b) => a.date.localeCompare(b.date))[0];
                            if (upcoming) {
                                const upDate = new Date(upcoming.date + 'T12:00:00');
                                return `Nenhum vencimento nesta data. Próximo: ${upDate.toLocaleDateString('pt-BR')} (${upcoming.title} — ${formatCurrency(upcoming.value)})`;
                            }
                            return 'Nenhum vencimento para esta data.';
                        })()}
                    </div>
                ) : (
                    <div className={styles.eventCardList}>
                        {selectedEvents.map(ev => {
                            let cardBorderClass = '';
                            if (ev.status === 'overdue') cardBorderClass = styles.eventCardRed;
                            else if (ev.type === 'loan') cardBorderClass = styles.eventCardYellow;
                            else cardBorderClass = styles.eventCardGreen;

                            let statusLabel = '';
                            let statusClass = '';
                            if (ev.status === 'paid') { statusLabel = 'Pago'; statusClass = styles.statusPaid; }
                            if (ev.status === 'pending') { statusLabel = 'A Vencer'; statusClass = styles.statusPending; }
                            if (ev.status === 'overdue') { statusLabel = 'Atrasado'; statusClass = styles.statusOverdue; }

                            return (
                                <div key={ev.id} className={`${styles.eventCard} ${cardBorderClass}`}>
                                    <div className={styles.eventInfo}>
                                        <div className={styles.eventName}>{ev.title}</div>
                                        <div className={styles.eventSub}>{ev.subtitle}</div>
                                    </div>
                                    <div className={styles.eventValueStatus}>
                                        <div className={styles.eventValue}>{formatCurrency(ev.value)}</div>
                                        <div className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                </div>
            )}
        </div>
    );
}
