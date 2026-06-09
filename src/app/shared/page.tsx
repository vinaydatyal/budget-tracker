'use client';

import { useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Users, CheckCircle2, Circle } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { toast } from 'react-hot-toast';

export default function SharedPage() {
  const { state, updateTransaction } = useApp();

  const sharedTxns = useMemo(() => {
    return state.transactions.filter(t => t.splitWith && t.splitWith.length > 0);
  }, [state.transactions]);

  // Group by person
  const balances = useMemo(() => {
    const map: Record<string, { totalOwed: number; settled: number; active: number; txns: Transaction[] }> = {};
    sharedTxns.forEach(t => {
      t.splitWith?.forEach(sw => {
        const name = sw.name.trim();
        if (!map[name]) map[name] = { totalOwed: 0, settled: 0, active: 0, txns: [] };
        map[name].totalOwed += sw.amount;
        if (sw.settled) map[name].settled += sw.amount;
        else map[name].active += sw.amount;
        map[name].txns.push(t);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].active - a[1].active);
  }, [sharedTxns]);

  function toggleSettle(txn: Transaction, splitIndex: number) {
    if (!txn.splitWith) return;
    const newSplitWith = [...txn.splitWith];
    const isNowSettled = !newSplitWith[splitIndex].settled;
    newSplitWith[splitIndex] = { ...newSplitWith[splitIndex], settled: isNowSettled };
    updateTransaction({ ...txn, splitWith: newSplitWith });
    if (isNowSettled) toast.success('Marked as settled');
  }

  function markAllSettled(person: string, txns: Transaction[]) {
    txns.forEach(t => {
      if (!t.splitWith) return;
      const newSplitWith = t.splitWith.map(sw => sw.name.trim() === person ? { ...sw, settled: true } : sw);
      updateTransaction({ ...t, splitWith: newSplitWith });
    });
    toast.success(`All IOUs with ${person} settled!`, { icon: '🎉' });
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--income)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <h1 className="page-title">Shared Expenses</h1>
            <p className="page-subtitle">Track who owes you money (IOUs)</p>
          </div>
        </div>
      </div>

      {balances.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-title">No shared expenses</div>
          <div className="empty-state-text">When adding a transaction, use the "Split with someone" button to track IOUs.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {balances.map(([person, data]) => (
            <div key={person} className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{person}</h2>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Owes you <span style={{ color: 'var(--income)', fontWeight: 600 }}>{formatCurrency(data.active, state.currency)}</span> (Settled: {formatCurrency(data.settled, state.currency)})
                  </div>
                </div>
                {data.active > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={() => markAllSettled(person, data.txns)}>
                    Settle All
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense</th>
                      <th>Total Amount</th>
                      <th>They Owe</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.txns.map(t => {
                      const splitIdx = t.splitWith!.findIndex(s => s.name.trim() === person);
                      const sw = t.splitWith![splitIdx];
                      return (
                        <tr key={`${t.id}-${person}`} style={{ opacity: sw.settled ? 0.5 : 1 }}>
                          <td>{new Date(t.date).toLocaleDateString()}</td>
                          <td>{t.description}</td>
                          <td>{formatCurrency(t.amount, state.currency)}</td>
                          <td style={{ color: sw.settled ? 'var(--text-muted)' : 'var(--income)', fontWeight: sw.settled ? 400 : 600 }}>
                            {formatCurrency(sw.amount, state.currency)}
                          </td>
                          <td>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => toggleSettle(t, splitIdx)}
                              title={sw.settled ? 'Mark Unsettled' : 'Mark Settled'}
                            >
                              {sw.settled ? <CheckCircle2 size={18} color="var(--income)" /> : <Circle size={18} color="var(--text-muted)" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
