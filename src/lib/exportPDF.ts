import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Category, Account } from './types';

export function exportToPDF(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  totalIncome: number,
  totalExpenses: number
) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Budget Tracker Report', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

  // Summary boxes
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(220, 252, 231);
  doc.rect(14, 60, 55, 20, 'F');
  doc.setTextColor(22, 101, 52);
  doc.text('Total Income', 16, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${totalIncome.toFixed(2)}`, 16, 76);

  doc.setFillColor(254, 226, 226);
  doc.rect(74, 60, 55, 20, 'F');
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Expenses', 76, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${totalExpenses.toFixed(2)}`, 76, 76);

  const balance = totalIncome - totalExpenses;
  doc.setFillColor(balance >= 0 ? 219 : 254, balance >= 0 ? 234 : 202, balance >= 0 ? 254 : 202);
  doc.rect(134, 60, 62, 20, 'F');
  doc.setTextColor(balance >= 0 ? 88 : 153, balance >= 0 ? 28 : 27, balance >= 0 ? 135 : 27);
  doc.setFont('helvetica', 'normal');
  doc.text('Net Balance', 136, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${balance.toFixed(2)}`, 136, 76);

  // Table
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Transactions', 14, 95);

  const rows = transactions.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const acc = accounts.find(a => a.id === t.accountId);
    return [
      new Date(t.date).toLocaleDateString(),
      t.description,
      cat?.name ?? '—',
      acc?.name ?? '—',
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      `$${t.amount.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: { 5: { halign: 'right' } },
  });

  doc.save(`budget-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
