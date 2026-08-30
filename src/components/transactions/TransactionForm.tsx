'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { X, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { fetchExchangeRates, COMMON_CURRENCIES } from '@/lib/currency';
import { parseSmartTransaction, parseReceiptImage } from '@/lib/nlp';
import { Wand2, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  onClose: () => void;
  editing?: Transaction | null;
  defaultDate?: string;
  defaultValues?: Partial<Transaction>;
  onSave?: () => void;
  onSubmitOverride?: (txn: Omit<Transaction, 'id'> & { id?: string }) => void;
}

export function TransactionForm({ onClose, editing, defaultDate, defaultValues, onSave, onSubmitOverride }: Props) {
  const { state, addTransaction, updateTransaction, addDebt, addRecurring, addSavingsGoal, addTransactionsBulk } = useApp();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(editing?.type ?? defaultValues?.type ?? 'expense');
  const [amount, setAmount] = useState(editing?.amount?.toString() ?? defaultValues?.amount?.toString() ?? '');
  const [description, setDescription] = useState(editing?.description ?? defaultValues?.description ?? '');
  const [payee, setPayee] = useState(editing?.payee ?? defaultValues?.payee ?? '');
  const [tags, setTags] = useState(editing?.tags?.join(', ') ?? defaultValues?.tags?.join(', ') ?? '');
  const [clientName, setClientName] = useState(editing?.businessData?.clientName ?? defaultValues?.businessData?.clientName ?? '');
  const [projectName, setProjectName] = useState(editing?.businessData?.projectName ?? defaultValues?.businessData?.projectName ?? '');
  const [monthName, setMonthName] = useState(editing?.businessData?.monthName ?? defaultValues?.businessData?.monthName ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? defaultValues?.categoryId ?? '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? defaultValues?.accountId ?? state.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? defaultValues?.toAccountId ?? state.accounts[1]?.id ?? '');
  const [date, setDate] = useState(
    editing?.date ? format(new Date(editing.date), 'yyyy-MM-dd') : (defaultDate ? format(new Date(defaultDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [receiptUrl, setReceiptUrl] = useState(editing?.receiptUrl ?? '');
  const [receiptNotes, setReceiptNotes] = useState(editing?.receiptNotes ?? '');
  const [isSplit, setIsSplit] = useState(!!editing?.splitCategoryIds?.length);
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(
    editing?.splitCategoryIds && editing?.splitAmounts
      ? editing.splitCategoryIds.map((id, i) => ({ categoryId: id, amount: editing.splitAmounts![i].toString() }))
      : [{ categoryId: '', amount: '' }, { categoryId: '', amount: '' }]
  );
  const [splitWith, setSplitWith] = useState<{ name: string; amount: string; settled: boolean }[]>(
    editing?.splitWith ? editing.splitWith.map(s => ({ ...s, amount: s.amount.toString() })) : []
  );
  const [error, setError] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Auto-labelling state
  const [autoLabelled, setAutoLabelled] = useState(false);
  const [manualOverride, setManualOverride] = useState(!!editing?.categoryId);

  // Smart Add & OCR state
  const [smartInput, setSmartInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  // Debt Integration State
  const [isDebtPayment, setIsDebtPayment] = useState(!!editing?.linkedDebtId || !!defaultValues?.linkedDebtId);
  const [linkedDebtId, setLinkedDebtId] = useState(editing?.linkedDebtId ?? defaultValues?.linkedDebtId ?? '');
  
  const [isNewDebt, setIsNewDebt] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtInterest, setNewDebtInterest] = useState('0');
  const [newDebtInstallments, setNewDebtInstallments] = useState('12');
  const [newDebtStartDate, setNewDebtStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Savings Integration State
  const [isSavingsContribution, setIsSavingsContribution] = useState(!!editing?.linkedSavingsGoalId || !!defaultValues?.linkedSavingsGoalId);
  const [linkedSavingsGoalId, setLinkedSavingsGoalId] = useState(editing?.linkedSavingsGoalId ?? defaultValues?.linkedSavingsGoalId ?? '');
  
  const [isNewSavingsGoal, setIsNewSavingsGoal] = useState(false);
  const [newSavingsGoalName, setNewSavingsGoalName] = useState('');
  const [newSavingsGoalTarget, setNewSavingsGoalTarget] = useState('');
  const [newSavingsGoalDeadline, setNewSavingsGoalDeadline] = useState('');
  const [newSavingsGoalSIP, setNewSavingsGoalSIP] = useState(false);
  const [newSavingsGoalSIPAmount, setNewSavingsGoalSIPAmount] = useState('');
  const [newSavingsGoalSIPDate, setNewSavingsGoalSIPDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Business Mode State
  const [revenueSourceId, setRevenueSourceId] = useState(editing?.revenueSourceId ?? defaultValues?.revenueSourceId ?? '');
  const [appliedSplitRuleId, setAppliedSplitRuleId] = useState(editing?.appliedSplitRuleId ?? defaultValues?.appliedSplitRuleId ?? '');
  const [isBusinessTransaction, setIsBusinessTransaction] = useState(editing?.isBusiness ?? defaultValues?.isBusiness ?? false);

  // Multi-Currency & Tax State
  const [currency, setCurrency] = useState(editing?.originalCurrency ?? state.currency);
  const [foreignAmount, setForeignAmount] = useState(editing?.originalAmount?.toString() ?? '');
  const [exchangeRate, setExchangeRate] = useState(editing?.exchangeRate?.toString() ?? '1');
  const [taxAmount, setTaxAmount] = useState(editing?.taxAmount?.toString() ?? '');
  const [taxRate, setTaxRate] = useState(editing?.taxRate?.toString() ?? '');
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  useEffect(() => {
    if (currency !== state.currency) {
      setIsFetchingRate(true);
      fetchExchangeRates(state.currency).then(rates => {
        if (rates[currency]) {
          setExchangeRate(rates[currency].toString());
          if (foreignAmount) {
             setAmount((parseFloat(foreignAmount) / rates[currency]).toFixed(2));
          }
        }
        setIsFetchingRate(false);
      });
    } else {
      setExchangeRate('1');
      if (foreignAmount) setAmount(foreignAmount);
    }
  }, [currency, state.currency]);

  // Handle foreign amount change
  const handleForeignAmountChange = (val: string) => {
    setForeignAmount(val);
    if (currency === state.currency) {
      setAmount(val);
    } else if (exchangeRate && !isNaN(parseFloat(exchangeRate))) {
      const amt = parseFloat(val) / parseFloat(exchangeRate);
      if (!isNaN(amt)) setAmount(amt.toFixed(2));
    }
  };

  const handleSmartParse = async () => {
    if (!smartInput.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseSmartTransaction(smartInput, { accounts: state.accounts, categories: state.categories });
      if (result.amount) setAmount(result.amount.toString());
      if (result.description) setDescription(result.description);
      if (result.type) setType(result.type);
      if (result.categoryId) setCategoryId(result.categoryId);
      if (result.accountId) setAccountId(result.accountId);
      if (result.toAccountId) setToAccountId(result.toAccountId);
      
      toast.success('Parsed smart input!');
      setSmartInput('');
    } catch (e) {
      toast.error('Failed to parse input.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningReceipt(true);
    let downloadUrl = '';

    try {
      if (storage) {
        toast.loading('Uploading receipt to CDN...', { id: 'receipt-toast' });
        const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(storageRef);
        setReceiptUrl(downloadUrl);
        toast.loading('Receipt uploaded. Extracting data via AI...', { id: 'receipt-toast' });
      } else {
        toast.loading('Local mode: Extracting data via AI...', { id: 'receipt-toast' });
      }

      // Convert image to base64 data URL for OpenRouter Vision API
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
        try {
          const result = await parseReceiptImage(base64DataUrl, { categories: state.categories });
          
          if (result.amount) setAmount(result.amount.toString());
          if (result.description) setDescription(result.description);
          if (result.type) setType(result.type);
          if (result.categoryId) setCategoryId(result.categoryId);
          
          toast.success('Receipt parsed successfully!', { id: 'receipt-toast' });
        } catch (err) {
          toast.error('Failed to parse receipt data.', { id: 'receipt-toast' });
        } finally {
          setIsScanningReceipt(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err) {
      console.error(err);
      toast.error('Failed to upload/scan receipt', { id: 'receipt-toast' });
      setIsScanningReceipt(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!editing) {
      return amount !== '' || description !== '' || notes !== '' || payee !== '' || tags !== '';
    }
    return amount !== (editing.amount?.toString() ?? '') ||
           description !== (editing.description ?? '') ||
           type !== (editing.type ?? 'expense') ||
           categoryId !== (editing.categoryId ?? '') ||
           notes !== (editing.notes ?? '');
  }, [amount, description, notes, payee, tags, type, categoryId, editing]);

  function handleCloseAttempt() {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }

  const filteredCats = state.categories.filter(
    c => (c.type === type || c.type === 'both') && (isBusinessTransaction ? !!c.isBusiness : !c.isBusiness)
  ).sort((a, b) => {
    const aParent = a.parentId ? state.categories.find(c => c.id === a.parentId)?.name : a.name;
    const bParent = b.parentId ? state.categories.find(c => c.id === b.parentId)?.name : b.name;
    
    if (aParent === bParent) {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return a.name.localeCompare(b.name);
    }
    return (aParent || '').localeCompare(bParent || '');
  });

  const merchantKeywords: Record<string, { type: 'income'|'expense', categoryName: string }> = {
    'uber': { type: 'expense', categoryName: 'Transportation' },
    'lyft': { type: 'expense', categoryName: 'Transportation' },
    'shell': { type: 'expense', categoryName: 'Transportation' },
    'gas': { type: 'expense', categoryName: 'Transportation' },
    'starbucks': { type: 'expense', categoryName: 'Food & Dining' },
    'mcdonalds': { type: 'expense', categoryName: 'Food & Dining' },
    'doordash': { type: 'expense', categoryName: 'Food & Dining' },
    'uber eats': { type: 'expense', categoryName: 'Food & Dining' },
    'amazon': { type: 'expense', categoryName: 'Shopping' },
    'target': { type: 'expense', categoryName: 'Shopping' },
    'walmart': { type: 'expense', categoryName: 'Shopping' },
    'rent': { type: 'expense', categoryName: 'Housing' },
    'mortgage': { type: 'expense', categoryName: 'Housing' },
    'salary': { type: 'income', categoryName: 'Salary' },
    'paycheck': { type: 'income', categoryName: 'Salary' },
    'upwork': { type: 'income', categoryName: 'Business Revenue' },
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    if (manualOverride || !val || editing) return;

    const lowerVal = val.toLowerCase();

    // 1. Check historical transactions first (exact match)
    const historicalMatch = state.transactions.find(t => t.description.toLowerCase() === lowerVal);
    if (historicalMatch && historicalMatch.type !== 'transfer') {
      setType(historicalMatch.type);
      setCategoryId(historicalMatch.categoryId);
      setAutoLabelled(true);
      return;
    }

    // 2. Check keyword dictionary
    for (const [keyword, data] of Object.entries(merchantKeywords)) {
      if (lowerVal.includes(keyword)) {
        const cat = state.categories.find(c => c.name.toLowerCase() === data.categoryName.toLowerCase());
        if (cat) {
          setType(data.type);
          setCategoryId(cat.id);
          setAutoLabelled(true);
          return;
        }
      }
    }
    
    setAutoLabelled(false);
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (!description.trim()) return setError('Description is required.');
    if (isNaN(amt) || amt <= 0) return setError('Enter a valid positive amount.');
    
    if (type !== 'transfer' && !isSplit && !categoryId) return setError('Select a category.');
    if (type !== 'transfer' && isSplit) {
      if (splits.some(s => !s.categoryId || !s.amount)) return setError('All splits must have a category and amount.');
      const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(totalSplit - amt) > 0.01) return setError(`Splits total (${totalSplit.toFixed(2)}) must equal the transaction amount (${amt.toFixed(2)}).`);
    }
    if (!accountId) return setError('Select an account.');
    if (type === 'transfer' && accountId === toAccountId) return setError('Cannot transfer to the same account.');
    if (!date) return setError('Select a date.');

    let finalLinkedDebtId = isDebtPayment && linkedDebtId ? linkedDebtId : undefined;
    let finalLinkedSavingsGoalId = isSavingsContribution && linkedSavingsGoalId ? linkedSavingsGoalId : undefined;

    if (!editing && (type === 'expense' || type === 'income') && isNewDebt && newDebtName) {
      finalLinkedDebtId = `debt-${Date.now()}`;
      addDebt({
        id: finalLinkedDebtId,
        name: newDebtName,
        type: 'loan',
        balance: 0, // Reducer will add amt during addTransaction
        interestRate: parseFloat(newDebtInterest) || 0,
        dueDate: newDebtStartDate,
        minimumPayment: amt / (parseInt(newDebtInstallments) || 12)
      });
      
      const emiAmt = amt / (parseInt(newDebtInstallments) || 12);
      addRecurring({
        type: 'expense',
        amount: emiAmt,
        categoryId: categoryId || 'emi',
        accountId: accountId,
        description: `EMI: ${newDebtName}`,
        frequency: 'monthly',
        nextDueDate: newDebtStartDate,
        active: true,
        isEmi: true,
        totalInstallments: parseInt(newDebtInstallments) || 12,
        paidInstallments: 0
      });
    }

    if (!editing && (type === 'transfer' || type === 'expense') && isNewSavingsGoal && newSavingsGoalName && newSavingsGoalTarget) {
      finalLinkedSavingsGoalId = `sg-${Date.now()}`;
      addSavingsGoal({
        id: finalLinkedSavingsGoalId,
        name: newSavingsGoalName,
        targetAmount: parseFloat(newSavingsGoalTarget) || 0,
        currentAmount: 0, // Reducer will add amt
        deadline: newSavingsGoalDeadline || undefined,
        color: '#10b981'
      });
      
      if (newSavingsGoalSIP && newSavingsGoalSIPAmount) {
        addRecurring({
          type: 'transfer',
          amount: parseFloat(newSavingsGoalSIPAmount),
          categoryId: 'transfer',
          accountId: accountId,
          toAccountId: toAccountId,
          description: `SIP: ${newSavingsGoalName}`,
          frequency: 'monthly',
          nextDueDate: newSavingsGoalSIPDate,
          active: true
        });
      }
    }

    const payload = {
      type,
      amount: amt,
      description: description.trim(),
      payee: payee.trim() || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      receiptUrl: receiptUrl.trim() || undefined,
      receiptNotes: receiptNotes.trim() || undefined,
      businessData: clientName || projectName || monthName ? {
        clientName: clientName.trim(),
        projectName: projectName.trim(),
        monthName: monthName.trim(),
      } : undefined,
      categoryId: type === 'transfer' ? 'transfer' : isSplit ? splits[0].categoryId : categoryId,
      splitCategoryIds: type === 'expense' && isSplit ? splits.map(s => s.categoryId) : undefined,
      splitAmounts: type === 'expense' && isSplit ? splits.map(s => parseFloat(s.amount)) : undefined,
      splitWith: splitWith.length > 0 ? splitWith.map(s => ({ name: s.name.trim(), amount: parseFloat(s.amount) || 0, settled: s.settled })) : undefined,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      linkedDebtId: finalLinkedDebtId,
      linkedSavingsGoalId: finalLinkedSavingsGoalId,
      revenueSourceId: state.preferences.enableBusinessMode && type === 'income' ? revenueSourceId || undefined : undefined,
      appliedSplitRuleId: state.preferences.enableBusinessMode && type === 'income' ? appliedSplitRuleId || undefined : undefined,
      isBusiness: isBusinessTransaction,
      
      // Multi-Currency & Tax
      originalCurrency: currency !== state.currency ? currency : undefined,
      originalAmount: currency !== state.currency ? parseFloat(foreignAmount) : undefined,
      exchangeRate: currency !== state.currency ? parseFloat(exchangeRate) : undefined,
      taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
      taxRate: taxRate ? parseFloat(taxRate) : undefined,
    };

    if (onSubmitOverride) {
      onSubmitOverride({ ...payload, id: editing?.id || `temp-${Date.now()}` });
      toast.success('Transaction saved to review');
    } else if (editing) {
      updateTransaction({ ...payload, id: editing.id });
      toast.success('Transaction updated');
    } else {
      if (state.preferences.enableBusinessMode && type === 'income' && appliedSplitRuleId) {
        // Handle automated split logic!
        const rule = state.splitRules.find(r => r.id === appliedSplitRuleId);
        if (rule && rule.splits.length > 0) {
          const splitTxns: Omit<Transaction, 'id'>[] = [];
          let remainingAmount = amt;
          
          rule.splits.forEach((split, index) => {
            const splitAmt = parseFloat((amt * (split.percentage / 100)).toFixed(2));
            if (index === rule.splits.length - 1) {
              // Last split gets the exact remainder to avoid rounding issues
              const finalAmt = remainingAmount;
              if (finalAmt > 0) {
                splitTxns.push({
                  ...payload,
                  type: (split.isExpense && split.targetType === 'category') ? 'expense' : payload.type,
                  amount: finalAmt,
                  accountId: (split.isExpense && split.targetType === 'category') ? accountId : (split.targetType === 'account' ? split.targetId : accountId),
                  categoryId: split.targetType === 'category' ? split.targetId : categoryId || 'split',
                  description: `${description.trim()} (Split: ${rule.name} - ${split.percentage}%)`,
                  revenueSourceId: (split.isExpense && split.targetType === 'category') ? undefined : payload.revenueSourceId
                });
              }
            } else {
              remainingAmount -= splitAmt;
              splitTxns.push({
                ...payload,
                type: (split.isExpense && split.targetType === 'category') ? 'expense' : payload.type,
                amount: splitAmt,
                accountId: (split.isExpense && split.targetType === 'category') ? accountId : (split.targetType === 'account' ? split.targetId : accountId),
                categoryId: split.targetType === 'category' ? split.targetId : categoryId || 'split',
                description: `${description.trim()} (Split: ${rule.name} - ${split.percentage}%)`,
                revenueSourceId: (split.isExpense && split.targetType === 'category') ? undefined : payload.revenueSourceId
              });
            }
          });
          
          addTransactionsBulk(splitTxns);
          toast.success(`Transaction split into ${splitTxns.length} parts based on rule`);
          onSave?.();
          onClose();
          return; // Exit early since we handled bulk adding
        }
      }

      addTransaction(payload);
      toast.success('Transaction added');
      if (type === 'expense' && isNewDebt && newDebtName) {
        toast.success(`Created Debt: ${newDebtName} with EMIs`);
      }
      if (type === 'transfer' && isNewSavingsGoal && newSavingsGoalName) {
        toast.success(newSavingsGoalSIP ? `Created Goal: ${newSavingsGoalName} with SIP` : `Created Goal: ${newSavingsGoalName}`);
      }
    }
    onSave?.();
    onClose();
  }

  return (
    <>
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleCloseAttempt()}>
      <motion.div 
        className="modal"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="btn btn-icon" onClick={handleCloseAttempt} aria-label="Close" id="close-transaction-form">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!editing && (
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
                <Wand2 size={16} /> Smart Add (AI) & Receipt Scan
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Spent $15 at Starbucks on Credit Card"
                  value={smartInput}
                  onChange={e => setSmartInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSmartParse();
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleSmartParse}
                  disabled={isParsing || !smartInput.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isParsing ? <Loader2 size={16} className="animate-spin" /> : 'Parse Text'}
                </button>
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    disabled={isScanningReceipt}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isScanningReceipt ? <Loader2 size={16} className="animate-spin" /> : 'Scan Receipt'}
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleReceiptScan}
                    style={{ position: 'absolute', left: 0, top: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    disabled={isScanningReceipt}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Describe your transaction naturally, or upload a receipt to auto-fill.
              </p>
            </div>
          )}

          {/* Business Toggle */}
          {state.preferences.enableBusinessMode && (
            <div className="form-group" style={{ background: 'var(--bg-card-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={isBusinessTransaction} 
                  onChange={e => {
                    setIsBusinessTransaction(e.target.checked);
                    setCategoryId(''); // Reset category when switching between business/personal
                  }} 
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Mark as Business Transaction</span>
              </label>
            </div>
          )}

          {/* Type Toggle */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="form-group" style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, backgroundColor: type === 'expense' ? 'var(--expense)' : '' }}
                onClick={() => { setType('expense'); setCategoryId(''); setManualOverride(true); setAutoLabelled(false); }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, backgroundColor: type === 'income' ? 'var(--income)' : '' }}
                onClick={() => { setType('income'); setCategoryId(''); setManualOverride(true); setAutoLabelled(false); }}
              >
                Income
              </button>
              <button
                type="button"
                className={`btn ${type === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setType('transfer'); setManualOverride(true); setAutoLabelled(false); }}
              >
                Transfer
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="txn-amount">Amount</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  className="form-input" 
                  style={{ width: 90, padding: '8px 4px' }} 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)}
                >
                  {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <input
                  id="txn-amount"
                  className="form-input"
                  style={{ flex: 1 }}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={currency === state.currency ? amount : foreignAmount}
                  onChange={e => currency === state.currency ? setAmount(e.target.value) : handleForeignAmountChange(e.target.value)}
                  disabled={isFetchingRate}
                  required
                />
              </div>
              {currency !== state.currency && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isFetchingRate ? 'Fetching rate...' : (
                    <>
                      <span>≈ {state.currency}</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        style={{ width: 70, padding: '2px 4px', fontSize: 11, background: 'var(--bg-modifier-hover)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}
                      />
                      <span style={{ marginLeft: 4 }}>(Rate:</span>
                      <input 
                        type="number" 
                        step="0.000001" 
                        value={exchangeRate} 
                        onChange={e => {
                          setExchangeRate(e.target.value);
                          if (e.target.value && foreignAmount && parseFloat(e.target.value) > 0) {
                            setAmount((parseFloat(foreignAmount) / parseFloat(e.target.value)).toFixed(2));
                          }
                        }} 
                        style={{ width: 70, padding: '2px 4px', fontSize: 11, background: 'var(--bg-modifier-hover)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}
                      />
                      <span>)</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="txn-date">Date</label>
              <input
                id="txn-date"
                className="form-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-desc">Description</label>
            <input
              id="txn-desc"
              className="form-input"
              type="text"
              placeholder="e.g. Monthly salary, Grocery shopping..."
              value={description}
              onChange={handleDescriptionChange}
              required
            />
          </div>

          {type !== 'transfer' && !isSplit && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} required={!isSplit}>
                <option value="">Select category...</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          )}

          {isBusinessTransaction && type !== 'transfer' && (
            <div className="form-row" style={{ marginTop: -8 }}>
              <div className="form-group">
                <label className="form-label">Tax Amount</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={taxAmount}
                  onChange={e => setTaxAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 20"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                />
              </div>
            </div>
          )}


          {type === 'transfer' ? (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Account</label>
                <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                  <option value="">Select account...</option>
                  {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Account</label>
                <select className="form-select" value={toAccountId} onChange={e => setToAccountId(e.target.value)} required>
                  <option value="">Select account...</option>
                  {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Account</label>
              <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                <option value="">Select account...</option>
                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {state.preferences.enableBusinessMode && type === 'income' && (
            <div className="form-row" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Revenue Source</label>
                <select 
                  className="form-select" 
                  value={revenueSourceId} 
                  onChange={e => setRevenueSourceId(e.target.value)}
                >
                  <option value="">None / General Income</option>
                  {state.revenueSources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Apply Split Rule</label>
                <select 
                  className="form-select" 
                  value={appliedSplitRuleId} 
                  onChange={e => setAppliedSplitRuleId(e.target.value)}
                  disabled={state.splitRules.length === 0}
                >
                  <option value="">No Split</option>
                  {state.splitRules.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={{ margin: '16px 0', borderTop: '1px solid var(--border)' }}></div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: '100%', marginBottom: 16 }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Splits, Debts, Receipts)'}
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="txn-payee">Payee (Optional)</label>
                <input
                  id="txn-payee"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Amazon, Starbucks, Employer"
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="txn-tags">Tags (Comma separated)</label>
                <input
                  id="txn-tags"
                  className="form-input"
                  type="text"
                  placeholder="e.g. vacation, tax-deductible, business"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                />
              </div>

              {state.accounts.find(a => a.id === accountId)?.isBusiness && (
                <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Business & Invoice Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="txn-client">Client Name</label>
                      <input
                        id="txn-client"
                        className="form-input"
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="txn-project">Project</label>
                      <input
                        id="txn-project"
                        className="form-input"
                        type="text"
                        placeholder="e.g. Website Redesign"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label" htmlFor="txn-month">Service Month</label>
                    <input
                      id="txn-month"
                      className="form-input"
                      type="text"
                      placeholder="e.g. June 2026"
                      value={monthName}
                      onChange={e => setMonthName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Shared Expenses / IOU Section */}
              {type === 'expense' && (
                <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Shared Expense (IOU)</h4>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSplitWith(prev => [...prev, { name: '', amount: '', settled: false }])}
                    >
                      <Plus size={14} /> Split with someone
                    </button>
                  </div>
                  
                  {splitWith.map((sw, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Friend's Name"
                        value={sw.name}
                        onChange={e => setSplitWith(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Owes you"
                        style={{ width: 120 }}
                        value={sw.amount}
                        onChange={e => setSplitWith(prev => prev.map((item, i) => i === idx ? { ...item, amount: e.target.value } : item))}
                      />
                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        onClick={() => setSplitWith(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {splitWith.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      This will track how much they owe you on the Shared Expenses page.
                    </div>
                  )}
                </div>
              )}

          {type === 'expense' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} />
                Split this transaction across multiple categories
              </label>
            </div>
          )}

          {type === 'expense' && isSplit && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Split Categories</h4>
              {splits.map((split, i) => (
                <div key={i} className="form-row" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <select
                      className="form-select"
                      value={split.categoryId}
                      onChange={e => {
                        const newSplits = [...splits];
                        newSplits[i].categoryId = e.target.value;
                        setSplits(newSplits);
                      }}
                      required={isSplit}
                    >
                      <option value="">Select category...</option>
                      {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={split.amount}
                      onChange={e => {
                        const newSplits = [...splits];
                        newSplits[i].amount = e.target.value;
                        setSplits(newSplits);
                      }}
                      required={isSplit}
                    />
                  </div>
                  {splits.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-icon"
                      style={{ marginTop: 2 }}
                      onClick={() => setSplits(splits.filter((_, idx) => idx !== i))}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSplits([...splits, { categoryId: '', amount: '' }])}
                >
                  + Add Split
                </button>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Total: {formatCurrency(splits.reduce((s, split) => s + (parseFloat(split.amount) || 0), 0), state.currency)} / {formatCurrency(parseFloat(amount) || 0, state.currency)}
                </div>
              </div>
            </div>
          )}

          {/* DEBT INTEGRATION UI */}
          {(type === 'expense' || type === 'income') && !isSplit && (
            <div className="card" style={{ padding: 16, marginBottom: 24, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Debt Options</h4>
              
              {!isNewDebt && (
                <div style={{ marginBottom: isDebtPayment ? 16 : 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={isDebtPayment} onChange={e => setIsDebtPayment(e.target.checked)} />
                    {type === 'expense' ? 'This payment is made to pay off an existing debt' : 'This income is an additional disbursement from an existing loan'}
                  </label>
                  {isDebtPayment && (
                    <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                      <select className="form-select" value={linkedDebtId} onChange={e => setLinkedDebtId(e.target.value)} required={isDebtPayment}>
                        <option value="">Select Debt...</option>
                        {state.debts.map(d => (
                          <option key={d.id} value={d.id}>{d.name} (Balance: {formatCurrency(d.balance, state.currency)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {!editing && !isDebtPayment && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={isNewDebt} onChange={e => setIsNewDebt(e.target.checked)} />
                    {type === 'expense' ? 'Mark this expense as a new Debt/Loan & add EMIs' : 'This income is from taking out a new loan/debt'}
                  </label>
                  {isNewDebt && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Debt Name</label>
                          <input type="text" className="form-input" value={newDebtName} onChange={e => setNewDebtName(e.target.value)} required={isNewDebt} placeholder="e.g. iPhone Loan" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Interest Rate (%)</label>
                          <input type="number" step="0.1" className="form-input" value={newDebtInterest} onChange={e => setNewDebtInterest(e.target.value)} required={isNewDebt} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Total Installments (Months)</label>
                          <input type="number" className="form-input" value={newDebtInstallments} onChange={e => setNewDebtInstallments(e.target.value)} required={isNewDebt} min="1" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">First EMI Date</label>
                          <input type="date" className="form-input" value={newDebtStartDate} onChange={e => setNewDebtStartDate(e.target.value)} required={isNewDebt} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SAVINGS INTEGRATION UI */}
          {(type === 'transfer' || type === 'expense' || type === 'income') && !isSplit && (
            <div className="card" style={{ padding: 16, marginBottom: 24, background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Savings & Investment Options</h4>
              
              {!isNewSavingsGoal && (
                <div style={{ marginBottom: isSavingsContribution ? 16 : 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={isSavingsContribution} onChange={e => setIsSavingsContribution(e.target.checked)} />
                    {type === 'income' ? 'This is a withdrawal/liquidation from a Savings Goal / FD' : 'This is a contribution to an existing Savings Goal / FD / SIP'}
                  </label>
                  {isSavingsContribution && (
                    <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                      <select className="form-select" value={linkedSavingsGoalId} onChange={e => setLinkedSavingsGoalId(e.target.value)} required={isSavingsContribution}>
                        <option value="">Select Goal...</option>
                        {state.savingsGoals.map(sg => (
                          <option key={sg.id} value={sg.id}>{sg.name} (Saved: {formatCurrency(sg.currentAmount, state.currency)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {!editing && !isSavingsContribution && type !== 'income' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={isNewSavingsGoal} onChange={e => setIsNewSavingsGoal(e.target.checked)} />
                    Create a new Savings Goal / FD
                  </label>
                  {isNewSavingsGoal && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Goal Name (e.g. Vacation, SIP)</label>
                          <input type="text" className="form-input" value={newSavingsGoalName} onChange={e => setNewSavingsGoalName(e.target.value)} required={isNewSavingsGoal} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Target Amount</label>
                          <input type="number" className="form-input" value={newSavingsGoalTarget} onChange={e => setNewSavingsGoalTarget(e.target.value)} required={isNewSavingsGoal} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Deadline (Optional)</label>
                          <input type="date" className="form-input" value={newSavingsGoalDeadline} onChange={e => setNewSavingsGoalDeadline(e.target.value)} />
                        </div>
                      </div>
                      {type === 'transfer' && (
                        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginBottom: newSavingsGoalSIP ? 12 : 0 }}>
                            <input type="checkbox" checked={newSavingsGoalSIP} onChange={e => setNewSavingsGoalSIP(e.target.checked)} />
                            Set up a monthly auto-transfer (SIP)
                          </label>
                          {newSavingsGoalSIP && (
                            <div className="form-row">
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Monthly SIP Amount</label>
                                <input type="number" className="form-input" value={newSavingsGoalSIPAmount} onChange={e => setNewSavingsGoalSIPAmount(e.target.value)} required={newSavingsGoalSIP} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">SIP Start Date</label>
                                <input type="date" className="form-input" value={newSavingsGoalSIPDate} onChange={e => setNewSavingsGoalSIPDate(e.target.value)} required={newSavingsGoalSIP} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="txn-notes">Notes (optional)</label>
            <textarea
              id="txn-notes"
              className="form-textarea"
              placeholder="Any additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--bg-card-hover)', border: '1px dashed var(--border)' }}>
             <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px' }}>Receipt / Proof of Payment</h4>
             <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-receipt-url">Receipt URL / Link</label>
                  <input
                    id="txn-receipt-url"
                    className="form-input"
                    type="url"
                    placeholder="https://..."
                    value={receiptUrl}
                    onChange={e => setReceiptUrl(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="txn-receipt-notes">Reference No / Extra Info</label>
                  <input
                    id="txn-receipt-notes"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Transaction ID"
                    value={receiptNotes}
                    onChange={e => setReceiptNotes(e.target.value)}
                  />
                </div>
             </div>
          </div>

            </motion.div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--expense-subtle)',
              color: 'var(--expense)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              id="submit-transaction"
              className="btn btn-primary"
              style={type === 'income'
                ? { background: 'var(--income)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }
                : undefined}
            >
              {editing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>

    {showConfirmClose && (
      <div className="modal-overlay" style={{ zIndex: 99999 }}>
        <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Save changes?</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
            You have unsaved changes. Do you want to save them before closing?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>No, Discard</button>
            <button className="btn btn-primary" onClick={(e) => { setShowConfirmClose(false); handleSubmit(e as any); }}>Yes, Save</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
