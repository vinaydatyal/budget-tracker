'use client';

import { useMemo, useState } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Users, CheckCircle2, Circle, X } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { toast } from 'react-hot-toast';

export default function SharedPage() {
  const { state, updateTransaction, addTransaction } = useApp();

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<{ type: 'single', txn: Transaction, splitIndex: number } | { type: 'all', person: string, txns: Transaction[] } | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleAccountId, setSettleAccountId] = useState<string>('');
  const [settleCategoryId, setSettleCategoryId] = useState<string>('');

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
        
        const settledAmount = sw.settledAmount || (sw.settled ? sw.amount : 0);
        map[name].totalOwed += sw.amount;
        map[name].settled += settledAmount;
        map[name].active += (sw.amount - settledAmount);
        map[name].txns.push(t);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].active - a[1].active);
  }, [sharedTxns]);

  function handleOpenSettleSingle(txn: Transaction, splitIndex: number) {
    const sw = txn.splitWith![splitIndex];
    if (sw.settled) {
      // Allow un-settling without a modal, just revert the flag
      const newSplitWith = [...txn.splitWith!];
      newSplitWith[splitIndex] = { ...sw, settled: false, settledAmount: 0 };
      updateTransaction({ ...txn, splitWith: newSplitWith });
      toast.success('Marked as unsettled. Note: You must manually delete any generated income transactions.');
      return;
    }
    
    const remaining = sw.amount - (sw.settledAmount || 0);
    setSettleTarget({ type: 'single', txn, splitIndex });
    setSettleAmount(remaining.toString());
    setSettleAccountId(state.accounts[0]?.id || '');
    setSettleCategoryId(txn.categoryId || 'cat-income-other');
    setSettleModalOpen(true);
  }

  function handleOpenSettleAll(person: string, txns: Transaction[]) {
    const activeTxns = txns.filter(t => {
      const sw = t.splitWith!.find(s => s.name.trim() === person);
      return sw && !sw.settled;
    });
    
    let totalRemaining = 0;
    activeTxns.forEach(t => {
      const sw = t.splitWith!.find(s => s.name.trim() === person)!;
      totalRemaining += (sw.amount - (sw.settledAmount || 0));
    });

    setSettleTarget({ type: 'all', person, txns: activeTxns });
    setSettleAmount(totalRemaining.toString());
    setSettleAccountId(state.accounts[0]?.id || '');
    setSettleCategoryId(activeTxns[0]?.categoryId || 'cat-income-other');
    setSettleModalOpen(true);
  }

  function handleConfirmSettle() {
    if (!settleAccountId) {
      toast.error('Please select an account to receive the funds.');
      return;
    }
    
    const amountNum = parseFloat(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (settleTarget?.type === 'single') {
      const { txn, splitIndex } = settleTarget;
      const sw = txn.splitWith![splitIndex];
      const remaining = sw.amount - (sw.settledAmount || 0);
      
      const newSettledAmount = (sw.settledAmount || 0) + amountNum;
      const isNowSettled = newSettledAmount >= sw.amount;

      const newSplitWith = [...txn.splitWith!];
      newSplitWith[splitIndex] = { ...sw, settledAmount: newSettledAmount, settled: isNowSettled };
      updateTransaction({ ...txn, splitWith: newSplitWith });

      // Generate Income Transaction
      addTransaction({
        amount: amountNum,
        type: 'income',
        description: `Repayment from ${sw.name}`,
        date: new Date().toISOString(),
        accountId: settleAccountId,
        categoryId: settleCategoryId,
        notes: `Partial/Full settlement for: ${txn.description}`
      });

      toast.success(`Settled ${formatCurrency(amountNum, state.currency)}! Income transaction generated.`);
    } 
    else if (settleTarget?.type === 'all') {
      const { person, txns } = settleTarget;
      
      // We will distribute the payment across the active txns until it runs out
      let remainingPayment = amountNum;
      
      txns.forEach(t => {
        if (remainingPayment <= 0) return;
        const splitIndex = t.splitWith!.findIndex(s => s.name.trim() === person);
        if (splitIndex === -1) return;
        
        const sw = t.splitWith![splitIndex];
        const owed = sw.amount - (sw.settledAmount || 0);
        
        const applyAmt = Math.min(owed, remainingPayment);
        remainingPayment -= applyAmt;
        
        const newSettledAmount = (sw.settledAmount || 0) + applyAmt;
        const isNowSettled = newSettledAmount >= sw.amount;

        const newSplitWith = [...t.splitWith!];
        newSplitWith[splitIndex] = { ...sw, settledAmount: newSettledAmount, settled: isNowSettled };
        updateTransaction({ ...t, splitWith: newSplitWith });
      });

      addTransaction({
        amount: amountNum,
        type: 'income',
        description: `Bulk Repayment from ${person}`,
        date: new Date().toISOString(),
        accountId: settleAccountId,
        categoryId: settleCategoryId,
      });

      toast.success(`Settled ${formatCurrency(amountNum, state.currency)}! Income transaction generated.`);
    }

    setSettleModalOpen(false);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', 
                    background: `hsl(${person.charCodeAt(0) * 15 % 360}, 70%, 55%)`, 
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {person.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2, color: 'var(--text-main)' }}>{person}</h2>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      Owes you <span style={{ color: 'var(--income)', fontWeight: 600 }}>{formatCurrency(data.active, state.currency)}</span> 
                      {data.settled > 0 && <span style={{ opacity: 0.7 }}> • Settled: {formatCurrency(data.settled, state.currency)}</span>}
                    </div>
                  </div>
                </div>
                {data.active > 0 && (
                  <button className="btn btn-primary" style={{ background: 'var(--text-main)', color: 'var(--bg-main)' }} onClick={() => handleOpenSettleAll(person, data.txns)}>
                    Settle All
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.txns.map(t => {
                  const splitIdx = t.splitWith!.findIndex(s => s.name.trim() === person);
                  const sw = t.splitWith![splitIdx];
                  const settledAmt = sw.settledAmount || (sw.settled ? sw.amount : 0);
                  const percent = Math.min(100, Math.max(0, (settledAmt / sw.amount) * 100));
                  
                  return (
                    <div key={`${t.id}-${person}`} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: sw.settled ? 0.6 : 1, padding: '16px 20px', 
                      background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s', border: '1px solid transparent'
                    }} className="hover-border">
                      <div style={{ flex: '1 1 30%' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>{t.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                          <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                          <span>Total: {formatCurrency(t.amount, state.currency)}</span>
                        </div>
                      </div>

                      <div style={{ flex: '1 1 40%', padding: '0 32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>IOU Progress</span>
                          <span style={{ fontWeight: 600, color: sw.settled ? 'var(--income)' : 'var(--text-main)' }}>
                            {formatCurrency(settledAmt, state.currency)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {formatCurrency(sw.amount, state.currency)}</span>
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: sw.settled ? 'var(--income)' : 'var(--accent)', width: `${percent}%`, transition: 'width 0.4s ease-out' }} />
                        </div>
                      </div>

                      <div style={{ flex: '0 0 auto', minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                        {sw.settled ? (
                          <>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--income)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle2 size={16} /> Settled
                            </span>
                            <button 
                              className="btn-icon" 
                              onClick={() => handleOpenSettleSingle(t, splitIdx)}
                              title="Mark Unsettled"
                              style={{ opacity: 0.5 }}
                            >
                              <Circle size={16} />
                            </button>
                          </>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px 16px' }}
                            onClick={() => handleOpenSettleSingle(t, splitIdx)}
                          >
                            Receive Payment
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settle Modal */}
      {settleModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card" style={{ width: 400, maxWidth: '90%', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Receive Repayment</h3>
              <button className="btn-icon" onClick={() => setSettleModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Amount Received</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>{state.currency === 'USD' ? '$' : state.currency}</span>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ paddingLeft: 30 }}
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                You can enter a partial amount to mark it as partially paid.
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Deposited Into</label>
              <select 
                className="form-select" 
                value={settleAccountId}
                onChange={e => setSettleAccountId(e.target.value)}
              >
                <option value="" disabled>Select an account...</option>
                {state.accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Offset Category</label>
              <select 
                className="form-select" 
                value={settleCategoryId}
                onChange={e => setSettleCategoryId(e.target.value)}
              >
                <option value="" disabled>Select a category...</option>
                {state.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name} ({cat.type})</option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                This creates an Income transaction linked to this category to automatically offset the original expense.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setSettleModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmSettle}>Confirm Repayment</button>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
