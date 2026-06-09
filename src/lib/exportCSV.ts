import Papa from 'papaparse';
import { Transaction, Category, Account } from './types';

export function exportToCSV(transactions: Transaction[], categories: Category[], accounts: Account[]) {
  const rows = transactions.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const acc = accounts.find(a => a.id === t.accountId);
    return {
      ID: t.id,
      Type: t.type,
      Amount: t.amount,
      Category: cat?.name ?? 'Unknown',
      Account: acc?.name ?? 'Unknown',
      Description: t.description,
      Date: t.date,
      Notes: t.notes ?? '',
    };
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `budget-tracker-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
