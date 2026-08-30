'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, ArrowRight, Check, AlertCircle, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useRouter } from 'next/navigation';
import { Transaction } from '@/lib/types';
import { TransactionForm } from '@/components/transactions/TransactionForm';

export default function ImportPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Mapping state
  const [dateCol, setDateCol] = useState('');
  const [descCol, setDescCol] = useState('');
  const [amountFormat, setAmountFormat] = useState<'single' | 'split'>('single');
  const [amountCol, setAmountCol] = useState('');
  const [debitCol, setDebitCol] = useState('');
  const [creditCol, setCreditCol] = useState('');
  const [balanceCol, setBalanceCol] = useState('');
  const [targetAccountId, setTargetAccountId] = useState(state.accounts[0]?.id || '');

  // Review state
  const [parsedTxns, setParsedTxns] = useState<Partial<Transaction>[]>([]);
  const [editingTxnIndex, setEditingTxnIndex] = useState<number | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          return setError('No columns found in CSV.');
        }
        setHeaders(results.meta.fields);
        setCsvData(results.data);
        setError('');
        
        // Auto-guess columns
        const fields = results.meta.fields.map(f => f.toLowerCase());
        const dateMatch = fields.find(f => f.includes('date'));
        const descMatch = fields.find(f => f.includes('description') || f.includes('name') || f.includes('payee') || f.includes('memo'));
        const amtMatch = fields.find(f => f === 'amount' || f === 'value');
        
        if (dateMatch) setDateCol(results.meta.fields[fields.indexOf(dateMatch)]);
        if (descMatch) setDescCol(results.meta.fields[fields.indexOf(descMatch)]);
        if (amtMatch) {
          setAmountFormat('single');
          setAmountCol(results.meta.fields[fields.indexOf(amtMatch)]);
        }
        
        const balMatch = fields.find(f => f.includes('balance'));
        if (balMatch) setBalanceCol(results.meta.fields[fields.indexOf(balMatch)]);
        
        setStep(2);
      },
      error: (err: any) => setError(err.message)
    });
  }

  function handleMap() {
    if (!dateCol || !descCol) return setError('Date and Description columns are required.');
    if (amountFormat === 'single' && !amountCol) return setError('Amount column is required.');
    if (amountFormat === 'split' && (!debitCol || !creditCol)) return setError('Debit and Credit columns are required.');

    try {
      const txns: Partial<Transaction>[] = csvData.map((row, i) => {
        let amt = 0;
        let type: 'income' | 'expense' = 'expense';

        if (amountFormat === 'single') {
          const rawAmt = parseFloat(row[amountCol]?.toString().replace(/[^0-9.-]+/g, '') || '0');
          if (rawAmt < 0) {
            type = 'expense';
            amt = Math.abs(rawAmt);
          } else {
            type = 'income';
            amt = rawAmt;
          }
        } else {
          const debitAmt = parseFloat(row[debitCol]?.toString().replace(/[^0-9.-]+/g, '') || '0');
          const creditAmt = parseFloat(row[creditCol]?.toString().replace(/[^0-9.-]+/g, '') || '0');
          if (debitAmt > 0) {
            type = 'expense';
            amt = debitAmt;
          } else if (creditAmt > 0) {
            type = 'income';
            amt = creditAmt;
          }
        }

        const dateStr = row[dateCol];
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) d = new Date();

        let notes = '';
        if (balanceCol && row[balanceCol]) {
          notes = `Balance: ${row[balanceCol]}`;
        }

        return {
          id: `imp-${Date.now()}-${i}`,
          date: d.toISOString(),
          description: row[descCol] || 'Unknown',
          amount: amt,
          type,
          categoryId: state.categories.find(c => c.type === type)?.id || '',
          accountId: targetAccountId || state.accounts[0]?.id || '',
          notes,
        };
      }).filter(t => t.amount > 0); // Ignore 0 amount rows

      setParsedTxns(txns);
      setError('');
      setStep(3);
    } catch (err) {
      setError('Error parsing data according to your mapping.');
    }
  }

  function handleSave() {
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: parsedTxns as Transaction[] });
    router.push('/transactions');
  }

  function updateCategory(index: number, catId: string) {
    const updated = [...parsedTxns];
    updated[index].categoryId = catId;
    setParsedTxns(updated);
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-icon" onClick={() => router.back()} style={{ background: 'var(--bg-input)' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Bank Importer</h1>
            <p className="page-subtitle">Upload your bank CSV and map your columns</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--expense-subtle)', color: 'var(--expense)', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? 'var(--income)' : 'var(--bg-input)' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Upload size={28} color="var(--text-muted)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Upload CSV File</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Download a CSV statement from your bank and upload it here. We'll help you map the columns in the next step.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            Select CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Map Your Columns</h2>
          
          <div style={{ display: 'grid', gap: 24, maxWidth: 500 }}>
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 8 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Target Account 
              </label>
              <select className="form-select" value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)}>
                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>All transactions in this CSV will be imported into this account.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Date Column</label>
              <select className="form-select" value={dateCol} onChange={e => setDateCol(e.target.value)}>
                <option value="">Select...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Payee Column</label>
              <select className="form-select" value={descCol} onChange={e => setDescCol(e.target.value)}>
                <option value="">Select...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">How are amounts formatted?</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={amountFormat === 'single'} onChange={() => setAmountFormat('single')} />
                  Single Column (+/-)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={amountFormat === 'split'} onChange={() => setAmountFormat('split')} />
                  Two Columns (Debit/Credit)
                </label>
              </div>
            </div>

            {amountFormat === 'single' ? (
              <div className="form-group">
                <label className="form-label">Amount Column</label>
                <select className="form-select" value={amountCol} onChange={e => setAmountCol(e.target.value)}>
                  <option value="">Select...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Debit (Expense) Column</label>
                  <select className="form-select" value={debitCol} onChange={e => setDebitCol(e.target.value)}>
                    <option value="">Select...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit (Income) Column</label>
                  <select className="form-select" value={creditCol} onChange={e => setCreditCol(e.target.value)}>
                    <option value="">Select...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Balance Column (Optional)</label>
              <select className="form-select" value={balanceCol} onChange={e => setBalanceCol(e.target.value)}>
                <option value="">None / Skip</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" onClick={handleMap}>Continue to Review <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Review Data ({parsedTxns.length} items)</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={handleSave}><Check size={16} /> Save to Ledger</button>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parsedTxns.map((txn, i) => (
                  <tr key={txn.id}>
                    <td>{new Date(txn.date!).toLocaleDateString()}</td>
                    <td>{txn.description}</td>
                    <td style={{ color: txn.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                      {txn.type === 'income' ? '+' : '-'}${txn.amount?.toFixed(2)}
                    </td>
                    <td>
                      <select className="form-select" style={{ padding: '4px 8px', fontSize: 13, height: 32 }} value={txn.categoryId} onChange={e => updateCategory(i, e.target.value)}>
                        {state.categories.filter(c => c.type === txn.type || c.type === 'both').map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => setEditingTxnIndex(i)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-icon btn-sm" onClick={() => {
                          const next = [...parsedTxns];
                          next.splice(i, 1);
                          setParsedTxns(next);
                        }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTxnIndex !== null && (
        <TransactionForm
          editing={parsedTxns[editingTxnIndex] as Transaction}
          onClose={() => setEditingTxnIndex(null)}
          onSubmitOverride={(updated) => {
            const next = [...parsedTxns];
            next[editingTxnIndex] = updated as Partial<Transaction>;
            setParsedTxns(next);
            setEditingTxnIndex(null);
          }}
        />
      )}
    </PageWrapper>
  );
}
