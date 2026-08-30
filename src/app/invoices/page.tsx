'use client';

import { useState, useMemo } from 'react';
import { useApp, formatCurrency } from '@/context/AppContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Download, FileText } from 'lucide-react';
import { Transaction } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function InvoicesPage() {
  const { state } = useApp();
  const [selectedClientStr, setSelectedClientStr] = useState<string>('');
  const [enableLineItems, setEnableLineItems] = useState(true);
  const [enableTax, setEnableTax] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(10);

  // Extract unique business projects
  const businessProjects = useMemo(() => {
    const projects: Record<string, { clientName: string; projectName: string; monthName: string; txns: Transaction[] }> = {};
    
    for (const t of state.transactions) {
      if (t.type === 'income' && t.businessData) {
        const { clientName, projectName, monthName } = t.businessData;
        const key = `${clientName}|${projectName}|${monthName}`;
        if (!projects[key]) {
          projects[key] = { clientName, projectName, monthName, txns: [] };
        }
        projects[key].txns.push(t);
      }
    }
    
    return Object.values(projects);
  }, [state.transactions]);

  const selectedProject = businessProjects.find(p => `${p.clientName}|${p.projectName}|${p.monthName}` === selectedClientStr);
  const baseAmount = selectedProject?.txns.reduce((s, t) => s + t.amount, 0) || 0;
  const totalTax = enableTax ? (baseAmount * (taxRate / 100)) : 0;
  const totalAmount = baseAmount + totalTax;

  function generatePDF() {
    if (!selectedProject) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('INVOICE', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 30);
    doc.text(`Invoice #: INV-${Date.now().toString().slice(-6)}`, 14, 35);
    
    // Billed To
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('BILLED TO:', 14, 50);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(selectedProject.clientName, 14, 57);
    
    // Project Details
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Project: ${selectedProject.projectName}`, 14, 64);
    doc.text(`Service Period: ${selectedProject.monthName}`, 14, 69);
    
    // Table
    if (enableLineItems) {
      const tableData = selectedProject.txns.map(t => [
        format(new Date(t.date), 'MMM dd, yyyy'),
        t.description || 'Consulting / Business Services',
        formatCurrency(t.amount, state.currency)
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['Date', 'Description', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        startY: 80,
        head: [['Description', 'Amount']],
        body: [['Consulting / Business Services', formatCurrency(baseAmount, state.currency)]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    
    if (enableTax) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Subtotal: ${formatCurrency(baseAmount, state.currency)}`, 14, finalY + 10);
      doc.text(`Tax (${taxRate}%): ${formatCurrency(totalTax, state.currency)}`, 14, finalY + 17);
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Total Due: ${formatCurrency(totalAmount, state.currency)}`, 14, finalY + 27);
    } else {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Total Due: ${formatCurrency(totalAmount, state.currency)}`, 14, finalY + 15);
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for your business!', 14, finalY + (enableTax ? 45 : 30));

    doc.save(`Invoice_${selectedProject.clientName.replace(/\s+/g, '_')}_${selectedProject.monthName}.pdf`);
  }

  return (
    <PageWrapper className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Generator</h1>
          <p className="page-subtitle">Instantly create PDF invoices from your logged business revenue</p>
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div className="form-group">
          <label className="form-label">Select Client / Project</label>
          <select 
            className="form-select" 
            value={selectedClientStr} 
            onChange={e => setSelectedClientStr(e.target.value)}
          >
            <option value="">-- Choose a tracked business project --</option>
            {businessProjects.map(p => (
              <option key={`${p.clientName}|${p.projectName}|${p.monthName}`} value={`${p.clientName}|${p.projectName}|${p.monthName}`}>
                {p.clientName} - {p.projectName} ({p.monthName})
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={enableLineItems} onChange={e => setEnableLineItems(e.target.checked)} />
              <span style={{ fontSize: 14 }}>Enable Line Items</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={enableTax} onChange={e => setEnableTax(e.target.checked)} />
              <span style={{ fontSize: 14 }}>Add Tax</span>
            </label>
            {enableTax && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>Rate (%):</span>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ width: 80, padding: '4px 8px' }} 
                  value={taxRate} 
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} 
                />
              </div>
            )}
          </div>
        )}

        {selectedProject ? (
          <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>{selectedProject.clientName}</h2>
                <div style={{ color: 'var(--text-muted)' }}>Project: {selectedProject.projectName}</div>
                <div style={{ color: 'var(--text-muted)' }}>Month: {selectedProject.monthName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Amount Due</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--income)' }}>{formatCurrency(totalAmount, state.currency)}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedProject.txns.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 8px' }}>{format(new Date(t.date), 'MMM dd, yyyy')}</td>
                    <td style={{ padding: '16px 8px' }}>{t.description}</td>
                    <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(t.amount, state.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button className="btn btn-primary" onClick={generatePDF} style={{ padding: '12px 24px', fontSize: 16 }}>
                <Download size={18} style={{ marginRight: 8 }} />
                Download PDF Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <div className="empty-state-icon"><FileText size={40} style={{ opacity: 0.5 }} /></div>
            <div className="empty-state-title">No Project Selected</div>
            <div className="empty-state-text">
              Select a business project from the dropdown above to generate a professional invoice.
              (Note: You must log income transactions with "Business & Invoice Details" first!)
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
