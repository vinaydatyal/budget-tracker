import Papa from 'papaparse';
import { Transaction, Category, Account } from './types';

interface CSVRow {
  Type?: string;
  Amount?: string;
  Category?: string;
  Account?: string;
  Description?: string;
  Date?: string;
  Notes?: string;
}

export function importFromCSV(
  file: File,
  categories: Category[],
  accounts: Account[],
  onSuccess: (transactions: Transaction[]) => void,
  onError: (msg: string) => void
) {
  Papa.parse<CSVRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      try {
        const transactions: Transaction[] = results.data.map((row, i) => {
          const type = row.Type?.toLowerCase();
          if (type !== 'income' && type !== 'expense') {
            throw new Error(`Row ${i + 2}: Type must be "income" or "expense"`);
          }
          const amount = parseFloat(row.Amount ?? '');
          if (isNaN(amount) || amount <= 0) {
            throw new Error(`Row ${i + 2}: Invalid amount "${row.Amount}"`);
          }
          const catName = row.Category?.trim().toLowerCase();
          const cat = categories.find(c => c.name.toLowerCase() === catName);

          const accName = row.Account?.trim().toLowerCase();
          const acc = accounts.find(a => a.name.toLowerCase() === accName);

          return {
            id: `import-${Date.now()}-${i}`,
            type,
            amount,
            categoryId: cat?.id ?? 'cat-12',
            accountId: acc?.id ?? accounts[0]?.id ?? 'acc-1',
            description: row.Description?.trim() ?? 'Imported',
            date: row.Date ? new Date(row.Date).toISOString() : new Date().toISOString(),
            notes: row.Notes?.trim() ?? '',
          };
        });
        onSuccess(transactions);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Import failed');
      }
    },
    error(err) {
      onError(err.message);
    },
  });
}
