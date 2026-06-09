'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, CreditCard, Landmark, Wallet, Banknote, Coins, Bitcoin, Home, Briefcase, HelpCircle } from 'lucide-react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Account, AssetType, IncomeSource } from '@/lib/types';
import { PageWrapper } from '@/components/layout/PageWrapper';

const PRESET_COLORS = [
  '#3b82f6','#22c55e','#a855f7','#f97316','#ef4444',
  '#06b6d4','#14b8a6','#84cc16','#ec4899','#6366f1',
];

const ASSET_ICONS: Record<AssetType, React.ReactNode> = {
  checking: <Landmark size={20} />,
  savings: <Banknote size={20} />,
  credit: <CreditCard size={20} />,
  cash: <Wallet size={20} />,
  gold: <Coins size={20} />,
  crypto: <Bitcoin size={20} />,
  real_estate: <Home size={20} />,
  stocks: <Briefcase size={20} />,
  other: <HelpCircle size={20} />
};

export default function AccountsPage() {
  const { state, addAccount, updateAccount, deleteAccount } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('checking');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('salary');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  function openNew() {
    setEditing(null);
    setName('');
    setAssetType('checking');
    setIncomeSource('salary');
    setColor(PRESET_COLORS[0]);
    setError('');
    setShowForm(true);
  }

  function openEdit(acc: Account) {
    setEditing(acc);
    setName(acc.name);
    setAssetType(acc.assetType || 'checking');
    setIncomeSource(acc.incomeSource || 'salary');
    setColor(acc.color);
    setError('');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Bank/Asset name is required');
    const payload = { name: name.trim(), assetType, incomeSource, color };
    if (editing) updateAccount({ ...payload, id: editing.id } as Account);
    else addAccount(payload as Account);
    setShowForm(false);
  }

  // Calculate balances per account
  const accountBalances = state.accounts.map(acc => {
    let income = 0;
    let expense = 0;
    state.transactions.forEach(t => {
      if (t.accountId === acc.id) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
      if (t.type === 'transfer' && t.toAccountId === acc.id) {
        income += t.amount;
      }
    });
    return { ...acc, income, expense, balance: income - expense };
  });

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets & Accounts</h1>
          <p className="page-subtitle">Manage your bank accounts, credit cards, investments, and physical assets</p>
        </div>
        <button id="add-account-btn" className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      <div className="budget-grid">
        {accountBalances.map(acc => (
          <div key={acc.id} className="budget-card animate-in">
            <div className="budget-card-header" style={{ marginBottom: 12 }}>
              <div className="budget-cat-icon" style={{ background: `${acc.color}22`, color: acc.color }}>
                {ASSET_ICONS[acc.assetType || 'checking']}
              </div>
              <div className="budget-info">
                <div className="budget-cat-name">{acc.name}</div>
                <div className="budget-amounts" style={{ textTransform: 'capitalize' }}>
                  {acc.assetType.replace('_', ' ')} • Source: {acc.incomeSource.replace('_', ' ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-icon btn-sm" onClick={() => openEdit(acc)}>
                  <Pencil size={13} />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (state.transactions.some(t => t.accountId === acc.id)) {
                      alert('Cannot delete an account that has transactions attached to it.');
                    } else if (confirm(`Delete "${acc.name}"?`)) {
                      deleteAccount(acc.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 800, color: acc.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
              {acc.balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(acc.balance), state.currency)}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Income</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--income)' }}>+{formatCurrency(acc.income, state.currency)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expenses</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--expense)' }}>-{formatCurrency(acc.expense, state.currency)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Account' : 'New Account'}</h2>
              <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Chase Sapphire, Cash Envelope"
                />
              </div>

              <div className="form-group" style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Asset Type</label>
                  <select
                    className="form-select"
                    value={assetType}
                    onChange={e => setAssetType(e.target.value as AssetType)}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="gold">Gold</option>
                    <option value="crypto">Crypto</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="stocks">Stocks</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="form-label">Income Source</label>
                  <select
                    className="form-select"
                    value={incomeSource}
                    onChange={e => setIncomeSource(e.target.value as IncomeSource)}
                  >
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance</option>
                    <option value="business">Business</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="stocks">Stocks / Investments</option>
                    <option value="miscellaneous">Miscellaneous</option>
                    <option value="none">None (Credit/Other)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-grid">
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-swatch ${color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Check size={15} /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
