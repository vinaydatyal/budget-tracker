'use client';

import { useState, useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Repeat, TrendingDown, TrendingUp, X } from 'lucide-react';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';

export default function CalendarPage() {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Map data to days
  const dayData = useMemo(() => {
    const data: Record<string, { income: number; expense: number; txns: number; recurring: any[] }> = {};
    
    // Initialize
    days.forEach(d => {
      data[format(d, 'yyyy-MM-dd')] = { income: 0, expense: 0, txns: 0, recurring: [] };
    });

    // Add historical transactions
    state.transactions.forEach(t => {
      const d = t.date.slice(0, 10);
      if (data[d]) {
        data[d].txns++;
        if (t.type === 'income') data[d].income += t.amount;
        else data[d].expense += t.amount;
      }
    });

    // Add upcoming recurring/EMIs for the current visible grid
    state.recurringTransactions.forEach(r => {
      if (!r.active) return;
      const rDate = r.nextDueDate.slice(0, 10);
      if (data[rDate]) {
        data[rDate].recurring.push(r);
      }
    });

    return data;
  }, [state.transactions, state.recurringTransactions, days]);

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return state.transactions.filter(t => t.date.startsWith(selectedDate));
  }, [state.transactions, selectedDate]);

  function nextMonth() { setCurrentDate(addMonths(currentDate, 1)); }
  function prevMonth() { setCurrentDate(subMonths(currentDate, 1)); }

  return (
    <PageWrapper className="page-body">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--income)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">Visualize your cash flow across the month</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button className="btn btn-icon btn-sm" onClick={prevMonth}><ChevronLeft size={18} /></button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button className="btn btn-icon btn-sm" onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const data = dayData[dateKey];
            const isCurrMonth = isSameMonth(day, monthStart);
            const today = isToday(day);

            return (
              <div key={dateKey} style={{ 
                minHeight: 120, 
                padding: 12, 
                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                borderBottom: i < days.length - 7 ? '1px solid var(--border)' : 'none',
                background: today ? 'var(--bg-input)' : (isCurrMonth ? 'transparent' : 'rgba(0,0,0,0.02)'),
                opacity: isCurrMonth ? 1 : 0.4,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }} 
              onClick={() => setSelectedDate(dateKey)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = today ? 'var(--bg-input)' : (isCurrMonth ? 'transparent' : 'rgba(0,0,0,0.02)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ 
                    fontSize: 14, fontWeight: today ? 700 : 500, 
                    color: today ? '#fff' : 'var(--text)',
                    background: today ? 'var(--income)' : 'transparent',
                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12
                  }}>
                    {format(day, 'd')}
                  </span>
                  {data?.txns > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.txns} txns</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {data?.income > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--income)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingUp size={12} /> {formatCurrency(data.income, state.currency)}
                    </div>
                  )}
                  {data?.expense > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--expense)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingDown size={12} /> {formatCurrency(data.expense, state.currency)}
                    </div>
                  )}
                  
                  {data?.recurring?.map(r => (
                    <div key={r.id} style={{ 
                      fontSize: 11, padding: '2px 6px', borderRadius: 4, 
                      background: 'var(--warning-subtle)', color: 'var(--warning)', 
                      display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }} title={r.description}>
                      <Repeat size={10} /> {r.description}
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)} style={{ zIndex: 100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '90%', padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Transactions for {format(new Date(selectedDate), 'MMMM d, yyyy')}</h2>
              <button className="btn btn-icon" onClick={() => setSelectedDate(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {selectedTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                  No transactions on this day.
                </div>
              ) : (
                <TransactionList 
                  transactions={selectedTransactions} 
                  onEdit={setEditingTxn} 
                  selectedIds={[]} 
                  onToggleSelect={() => {}} 
                  onSelectAll={() => {}} 
                />
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedDate(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsAddingNew(true)}>Add Transaction</button>
            </div>
          </div>
        </div>
      )}

      {editingTxn && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setEditingTxn(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 0, overflow: 'visible' }}>
            <TransactionForm onClose={() => setEditingTxn(null)} editing={editingTxn} />
          </div>
        </div>
      )}

      {isAddingNew && selectedDate && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setIsAddingNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 0, overflow: 'visible' }}>
            <TransactionForm onClose={() => setIsAddingNew(false)} defaultDate={selectedDate} />
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
