import Papa from 'papaparse';
import { AppState } from './types';

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('url');
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportTaxPackage(state: AppState) {
  // Export 1: Business Transactions (Income/Expense Details)
  const businessTxns = state.transactions.filter(t => t.isBusiness).map(t => ({
    Date: new Date(t.date).toLocaleDateString(),
    Type: t.type.toUpperCase(),
    Category: state.categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized',
    Description: t.description,
    Payee: t.payee || '',
    Amount: t.amount,
    Tax_Amount: t.taxAmount || 0,
    Total_Gross: t.amount + (t.taxAmount || 0),
    Receipt_URL: t.receiptUrl || '',
    Notes: t.notes || ''
  }));

  const txnsCsv = Papa.unparse(businessTxns);

  // Export 2: General Ledger (Double Entry format)
  const ledgerEntries = state.ledger.map(l => ({
    Date: new Date(l.date).toLocaleDateString(),
    Account: l.accountId,
    Description: l.description,
    Debit: l.debit || '',
    Credit: l.credit || '',
    Transaction_ID: l.transactionId
  }));

  const ledgerCsv = Papa.unparse(ledgerEntries);

  // Download both
  downloadCsv('Business_Transactions_Export.csv', txnsCsv);
  setTimeout(() => downloadCsv('General_Ledger_Export.csv', ledgerCsv), 500);
}
