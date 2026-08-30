'use client';

import { useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { format, addDays, addWeeks, addMonths, differenceInDays, startOfDay } from 'date-fns';
import { Bell, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';

function getNextDueDate(nextDueDate: string, frequency: string): Date {
  const base = new Date(nextDueDate);
  const today = startOfDay(new Date());
  let d = startOfDay(base);

  // Advance until d >= today
  while (d < today) {
    if (frequency === 'daily')     d = addDays(d, 1);
    else if (frequency === 'weekly')   d = addWeeks(d, 1);
    else if (frequency === 'biweekly') d = addWeeks(d, 2);
    else                               d = addMonths(d, 1);
  }
  return d;
}

export function UpcomingBills() {
  const { state, addTransaction, markRecurringPaid } = useApp();
  const { toast } = useToast();

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return state.recurringTransactions
      .map(r => {
        const due = getNextDueDate(r.nextDueDate, r.frequency);
        const daysUntil = differenceInDays(due, today);
        return { ...r, due, daysUntil };
      })
      .filter(r => r.daysUntil >= 0 && r.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [state.recurringTransactions]);

  if (upcoming.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="var(--text-muted)" />
            Upcoming Bills
          </span>
          <Link href="/recurring" className="btn btn-secondary btn-sm">Manage</Link>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nothing to show</div>
        </div>
      </div>
    );
  }

  function urgencyColor(days: number) {
    if (days === 0) return '#ef4444';
    if (days <= 3)  return '#f97316';
    if (days <= 7)  return '#f59e0b';
    return '#22c55e';
  }

  function urgencyLabel(days: number) {
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `In ${days} days`;
  }

  const cat = (id: string) => state.categories.find(c => c.id === id);
  const acc = (id: string) => state.accounts.find(a => a.id === id);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color="var(--warning)" />
          Upcoming Bills
          <span style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
            {upcoming.length}
          </span>
        </span>
        <Link href="/recurring" className="btn btn-secondary btn-sm">Manage</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {upcoming.map(item => {
          const color = urgencyColor(item.daysUntil);
          const category = cat(item.categoryId);
          const account = acc(item.accountId);
          
          const handleMarkPaid = () => {
            const txnId = `txn-${Date.now()}`;
            addTransaction({
              type: item.type,
              amount: item.amount,
              categoryId: item.categoryId,
              accountId: item.accountId,
              toAccountId: item.toAccountId,
              payee: item.payee,
              tags: item.tags,
              description: item.description,
              date: item.due.toISOString(),
              notes: 'Auto-posted from recurring bill',
              linkedRecurringId: item.id,
              linkedDebtId: item.linkedDebtId,
              linkedSavingsGoalId: item.linkedSavingsGoalId
            });
            // Calculate next due date for the recurring item
            const nextDue = getNextDueDate(addDays(item.due, 1).toISOString(), item.frequency).toISOString().slice(0, 10);
            markRecurringPaid(item.id, txnId, nextDue);
            toast(`Marked ${item.description} as paid`, 'success');
          };

          const emiText = item.isEmi && item.totalInstallments ? `(EMI ${Math.min((item.paidInstallments || 0) + 1, item.totalInstallments)} of ${item.totalInstallments})` : '';

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--bg-input)', border: `1px solid var(--border)`,
              borderLeft: `3px solid ${color}`,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {category?.icon ?? '💳'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description} {emiText && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{emiText}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {account?.name ?? 'Unknown'} · {format(item.due, 'MMM d')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: item.type === 'expense' ? 'var(--expense)' : 'var(--income)' }}>
                  {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount, state.currency)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color }}>{urgencyLabel(item.daysUntil)}</div>
                {item.daysUntil <= 3 && (
                  <button onClick={handleMarkPaid} className="btn btn-sm" style={{ padding: '2px 8px', fontSize: 11, height: 24, marginTop: 4, background: color, color: '#fff', border: 'none' }}>
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
