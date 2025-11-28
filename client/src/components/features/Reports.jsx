import React, { useState, useMemo } from 'react';
import { Archive, Calendar, Download, FileText, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Select from '../ui/Select'; 
import { generateCSV, getQuarter } from '../../lib/utils';
import { getInvoiceBlob } from '../../lib/pdf-generator'; // New Import

const Reports = ({ invoices = [], expenses = [], userSettings, addToast }) => {
  const [periodType, setPeriodType] = useState(userSettings.filingFrequency || 'Monthly'); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 (Apr-Jun)'); 
  const [isZipping, setIsZipping] = useState(false);

  // --- Data Filtering ---
  const { filteredInvoices, filteredExpenses } = useMemo(() => {
      const safeInvoices = Array.isArray(invoices) ? invoices : [];
      const safeExpenses = Array.isArray(expenses) ? expenses : [];

      const filterByDate = (item) => {
          if (!item.date) return false;
          try {
              const dateStr = item.date.includes('T') ? item.date.split('T')[0] : item.date;
              if (periodType === 'Monthly') {
                  return dateStr.startsWith(selectedMonth);
              } else {
                  return getQuarter(dateStr) === selectedQuarter;
              }
          } catch (e) { return false; }
      };

      return {
          filteredInvoices: safeInvoices.filter(filterByDate),
          filteredExpenses: safeExpenses.filter(filterByDate)
      };
  }, [invoices, expenses, periodType, selectedMonth, selectedQuarter]);

  // --- Calculations ---
  const totalLiability = filteredInvoices.reduce((acc, i) => acc + (parseFloat(i.tax) || 0), 0);
  const eligibleItc = filteredExpenses.reduce((acc, i) => acc + (parseFloat(i.gst_paid) || 0), 0);
  const netPayable = Math.max(0, totalLiability - eligibleItc);
  
  // NEW: Total Sales Calculation (Total of all Invoice amounts)
  const totalSalesValue = filteredInvoices.reduce((acc, i) => {
      const roe = parseFloat(i.exchange_rate) || 1;
      return acc + (parseFloat(i.amount) * roe);
  }, 0);

  // --- Download Logic ---
  const handleDownloadZip = async () => {
    if (filteredInvoices.length === 0 && filteredExpenses.length === 0) {
        addToast("No data found for this period.", "error");
        return;
    }

    setIsZipping(true);
    addToast("Preparing Bundle... This may take a moment.", "info");
    
    try {
      const zip = new JSZip();
      const periodLabel = periodType === 'Monthly' ? selectedMonth : selectedQuarter;

      // 1. Invoices Folder (PDFs)
      const invoiceFolder = zip.folder("Invoices");
      for (const inv of filteredInvoices) {
          try {
              // Generate PDF in memory
              const pdfBlob = getInvoiceBlob(inv, userSettings);
              // Add to zip (filename sanitized)
              const safeName = (inv.id || 'invoice').replace(/[\/\\]/g, '_');
              invoiceFolder.file(`${safeName}.pdf`, pdfBlob);
          } catch (err) {
              console.error(`Failed to zip invoice ${inv.id}`, err);
          }
      }

      // 2. Expense Receipts Folder
      const receiptsFolder = zip.folder("Expense_Receipts");
      filteredExpenses.forEach(exp => {
        if (exp.receipt_data) {
            try {
                const parts = exp.receipt_data.split(',');
                const base64Data = parts.length > 1 ? parts[1] : parts[0];
                if (base64Data) {
                    const ext = exp.receipt_data.includes('pdf') ? 'pdf' : 'jpg';
                    const fileName = `${exp.id}_${(exp.receipt_name || 'receipt').replace(/[\/\\]/g, '_').replace(/\s+/g, '_')}.${ext}`;
                    receiptsFolder.file(fileName, base64Data, {base64: true});
                }
            } catch (err) { console.warn("Failed to zip receipt", exp.id); }
        }
      });

      // 3. Registers (CSV)
      const salesData = filteredInvoices.map(i => ({
        ID: i.id, Date: i.date, Client: i.client?.name || '', 
        Taxable: (parseFloat(i.amount) - parseFloat(i.tax)).toFixed(2),
        Tax: (parseFloat(i.tax) || 0).toFixed(2), 
        Total: (parseFloat(i.amount) || 0).toFixed(2)
      }));
      zip.file("Sales_Register.csv", generateCSV(salesData));
      
      const expenseData = filteredExpenses.map(e => ({
          ID: e.id, Date: e.date, Category: e.category, Amount: e.amount, ITC: e.gst_paid
      }));
      zip.file("Expense_Register.csv", generateCSV(expenseData));

      // 4. Generate & Download
      const content = await zip.generateAsync({type:"blob"});
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GST_Filing_${periodLabel}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("Filing bundle downloaded successfully!", "success");

    } catch (e) {
      console.error("ZIP Generation failed", e);
      addToast("Failed to generate ZIP.", "error");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <div>
           <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
               <FileText className="text-[#3194A0]" /> Tax Reports & Filing
           </h2>
           <p className="text-slate-500 text-sm mt-1">Generate monthly/quarterly data for your CA</p>
         </div>
         
         <div className="flex gap-3 items-center">
            <div className="flex rounded-md bg-slate-100 dark:bg-slate-700 p-1">
              <button onClick={() => setPeriodType('Monthly')} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${periodType === 'Monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
              <button onClick={() => setPeriodType('Quarterly')} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${periodType === 'Quarterly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Quarterly</button>
            </div>
            <div className="w-40">
                {periodType === 'Monthly' ? (
                   <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3194A0] dark:border-slate-600 dark:text-white" />
                ) : (
                   <Select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} options={[{ label: "Q1 (Apr-Jun)", value: "Q1 (Apr-Jun)" }, { label: "Q2 (Jul-Sep)", value: "Q2 (Jul-Sep)" }, { label: "Q3 (Oct-Dec)", value: "Q3 (Oct-Dec)" }, { label: "Q4 (Jan-Mar)", value: "Q4 (Jan-Mar)" }]} />
                )}
            </div>
         </div>
       </div>

       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-l-4 border-l-[#3194A0]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white">Output Tax Liability</h3>
              <Badge type="primary">{filteredInvoices.length} Invoices</Badge>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Invoice Value (INR)</span>
                <span className="font-semibold dark:text-white">₹{totalSalesValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Tax Collected</span>
                <span className="font-semibold dark:text-white">₹{totalLiability.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="pt-2 flex justify-between text-lg border-t dark:border-slate-700">
                 <span className="font-bold text-slate-800 dark:text-white">Total Liability</span>
                 <span className="font-bold text-[#3194A0]">₹{totalLiability.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white">Input Tax Credit (ITC)</h3>
              <Badge type="warning">{filteredExpenses.length} Expenses</Badge>
            </div>
             <div className="space-y-4">
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</span>
                <span className="font-semibold dark:text-white">₹{filteredExpenses.reduce((a,e) => a + parseFloat(e.amount), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Eligible ITC</span>
                <span className="font-semibold dark:text-white">₹{eligibleItc.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="pt-2 flex justify-between text-lg border-t dark:border-slate-700">
                 <span className="font-bold text-slate-800 dark:text-white">Net Payable</span>
                 <span className={`font-bold ${netPayable > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                   ₹{netPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}
                 </span>
              </div>
            </div>
          </Card>
       </div>
       
       <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
         <div>
           <h3 className="text-xl font-bold flex items-center gap-2"><Archive size={24} className="text-emerald-400"/> CA Filing Bundle</h3>
           <p className="text-slate-300 text-sm mt-2 max-w-md leading-relaxed">
             Includes: Invoice PDFs, Expense Receipts, and CSV Summaries.
           </p>
         </div>
         <Button 
            onClick={handleDownloadZip} 
            loading={isZipping} 
            disabled={filteredInvoices.length === 0 && filteredExpenses.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 h-12 shadow-xl shadow-emerald-900/20"
         >
           {isZipping ? "Generating Bundle..." : "Download CA Bundle (.zip)"}
         </Button>
       </Card>
    </div>
  )
}

export default Reports;