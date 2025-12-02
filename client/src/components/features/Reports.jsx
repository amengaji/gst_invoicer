// client/src/components/features/Reports.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, RefreshCw, Archive, BarChart2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Select from '../ui/Select';
import { formatNumber } from '../../lib/formatNumber';
import { formatDate, generateCSV, getQuarter } from '../../lib/utils';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getInvoiceBlob } from '../../lib/pdf-generator';
import { API_URL } from '../../config/api';


const Reports = ({ invoices = [], expenses = [], userSettings, addToast }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, gstr1, gstr2
  
  // --- Filtering State ---
  const [periodType, setPeriodType] = useState('Monthly'); // 'Monthly' or 'Quarterly'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 (Apr-Jun)'); // Default Quarter

  const [exchangeRates, setExchangeRates] = useState(null); // Live Rates
  const [isZipping, setIsZipping] = useState(false);

  // --- 1. Fetch Live Rates ---
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        setExchangeRates(data.rates);
      } catch (e) {
        console.warn("Failed to fetch live rates for reports");
      }
    };
    fetchRates();
  }, []);

  // --- 2. Smart Currency Converter ---
  const getInrValue = (amount, currency, storedRate) => {
    const safeAmount = parseFloat(amount) || 0;
    let rate = parseFloat(storedRate) || 1;

    // Use live rate if stored rate is 1 but currency is NOT INR
    if (currency !== 'INR' && rate === 1 && exchangeRates) {
        const rateToUSD = exchangeRates[currency];
        const rateINR = exchangeRates['INR'];
        if (rateToUSD && rateINR) {
            rate = rateINR / rateToUSD; 
        }
    }
    
    return { value: safeAmount * rate, usedRate: rate };
  };

  // --- 3. Filter Data (Monthly OR Quarterly) ---
  const { filteredInvoices, filteredExpenses } = useMemo(() => {
    const filterFn = (item) => {
        if (!item.date) return false;
        try {
            const dateStr = item.date.includes('T') ? item.date.split('T')[0] : item.date;
            
            if (periodType === 'Monthly') {
                return dateStr.startsWith(selectedMonth);
            } else {
                // Check Quarter
                return getQuarter(dateStr) === selectedQuarter;
            }
        } catch (e) { return false; }
    };

    return {
        filteredInvoices: invoices.filter(filterFn),
        filteredExpenses: expenses.filter(filterFn)
    };
  }, [invoices, expenses, periodType, selectedMonth, selectedQuarter]);

  // --- 4. Calculate Totals (Converted to INR) ---
  const totals = useMemo(() => {
    let totalSales = 0;
    let totalOutputTax = 0;
    
    filteredInvoices.forEach(inv => {
        const { value: totalInr, usedRate } = getInrValue(inv.amount, inv.currency, inv.exchange_rate);
        
        // Calculate Tax Component
        const safeTax = parseFloat(inv.tax) || 0;
        const taxInr = safeTax * usedRate;
        const taxableInr = totalInr - taxInr;

        totalSales += taxableInr;
        totalOutputTax += taxInr;
    });

    const totalPurchases = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);
    const totalInputTax = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.gst_paid) || 0), 0);
    const netPayable = Math.max(0, totalOutputTax - totalInputTax);

    return { totalSales, totalOutputTax, totalPurchases, totalInputTax, netPayable };
  }, [filteredInvoices, filteredExpenses, exchangeRates]);

  // --- Chart Data Calculation (Last 6 Months) ---
  const chartData = useMemo(() => {
      const months = [];
      const today = new Date();
      for(let i=5; i>=0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          months.push(d.toISOString().slice(0, 7)); // YYYY-MM
      }

      return months.map(month => {
          const monthlyInvoices = invoices.filter(i => (i.date || '').startsWith(month));
          const monthlyExpenses = expenses.filter(e => (e.date || '').startsWith(month));
          
          const sales = monthlyInvoices.reduce((acc, inv) => acc + getInrValue(inv.amount, inv.currency, inv.exchange_rate).value, 0);
          const cost = monthlyExpenses.reduce((acc, exp) => acc + parseFloat(exp.amount || 0), 0);
          
          return { month, sales, cost };
      });
  }, [invoices, expenses, exchangeRates]);

  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.sales, d.cost)), 1);

  // --- 5. Export Logic (Excel) ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = periodType === 'Monthly' ? selectedMonth : selectedQuarter;

    // Sheet 1: Sales
    const salesData = filteredInvoices.map(inv => {
        const { value: totalInr, usedRate } = getInrValue(inv.amount, inv.currency, inv.exchange_rate);
        const taxInr = (parseFloat(inv.tax) || 0) * usedRate;
        const taxableInr = totalInr - taxInr;

        const isExport = inv.type?.includes('Export');
        const isInterstate = inv.type === 'Interstate';
        
        return {
            "Date": formatDate(inv.date),
            "Invoice No": inv.id,
            "Client": inv.client?.name || 'Unknown',
            "GSTIN": inv.client?.gstin || 'Unregistered',
            "Currency": inv.currency,
            "Ex. Rate": usedRate.toFixed(4),
            "Taxable Value (INR)": taxableInr,
            "IGST": (isExport || isInterstate) ? taxInr : 0,
            "CGST": (!isExport && !isInterstate) ? taxInr/2 : 0,
            "SGST": (!isExport && !isInterstate) ? taxInr/2 : 0,
            "Grand Total (INR)": totalInr
        };
    });
    const ws1 = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, ws1, "GSTR-1 (Sales)");

    // Sheet 2: Expenses
    const purchaseData = filteredExpenses.map(exp => ({
        "Date": formatDate(exp.date),
        "Category": exp.category,
        "Amount": parseFloat(exp.amount),
        "ITC Claimed": parseFloat(exp.gst_paid)
    }));
    const ws2 = XLSX.utils.json_to_sheet(purchaseData);
    XLSX.utils.book_append_sheet(wb, ws2, "GSTR-2 (Expenses)");

    XLSX.writeFile(wb, `Tax_Report_${periodLabel}.xlsx`);
    addToast("Excel report downloaded", "success");
  };

  // --- 6. Export Logic (ZIP Bundle) ---
  const handleDownloadZip = async () => {
    if (filteredInvoices.length === 0 && filteredExpenses.length === 0) {
        addToast("No data to bundle.", "error");
        return;
    }
    setIsZipping(true);
    addToast("Generating bundle...", "info");

    try {
        const zip = new JSZip();
        const periodLabel = periodType === 'Monthly' ? selectedMonth : selectedQuarter;
        const folderName = `Filing_${periodLabel}`;
        const root = zip.folder(folderName);

        // A. Invoices (PDFs)
        const invFolder = root.folder("Invoices");
        await Promise.all(filteredInvoices.map(async (inv) => {
            try {
                const blob = await getInvoiceBlob(inv, userSettings);
                const safeName = inv.id.replace(/[\/\\]/g, '-');
                invFolder.file(`${safeName}.pdf`, blob);
            } catch (e) { console.error("PDF Fail", inv.id); }
        }));

        // B. Expenses (Receipts)
        const expFolder = root.folder("Receipts");
        filteredExpenses.forEach(exp => {
            if (exp.receipt_data) {
                const isPdf = exp.receipt_data.includes('application/pdf');
                const ext = isPdf ? 'pdf' : 'jpg';
                const base64 = exp.receipt_data.split(',')[1];
                if (base64) {
                    const name = `${exp.category}_${exp.date}`.replace(/[\/\\]/g, '-');
                    expFolder.file(`${name}.${ext}`, base64, {base64: true});
                }
            }
        });

        // C. Registers (CSV)
        const salesCsv = generateCSV(filteredInvoices.map(i => {
            const { value: val } = getInrValue(i.amount, i.currency, i.exchange_rate);
            return { Date: i.date, ID: i.id, Client: i.client?.name, Total_INR: val.toFixed(2) };
        }));
        root.file("Sales_Register.csv", salesCsv);

        // Zip & Download
        const content = await zip.generateAsync({type: "blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        addToast("Bundle downloaded!", "success");

    } catch (e) {
        console.error(e);
        addToast("Bundle generation failed", "error");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <div>
           <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
               <FileText className="text-[#3194A0]" /> Tax Reports & Filing
           </h2>
           <p className="text-slate-500 text-sm mt-1">Generate monthly/quarterly data for your CA</p>
         </div>
         
         <div className="flex gap-3 items-center">
            {/* Toggle Buttons */}
            <div className="flex rounded-md bg-slate-100 dark:bg-slate-700 p-1">
              <button onClick={() => setPeriodType('Monthly')} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${periodType === 'Monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Monthly</button>
              <button onClick={() => setPeriodType('Quarterly')} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${periodType === 'Quarterly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Quarterly</button>
            </div>

            {/* Conditional Input */}
            <div className="w-40">
                {periodType === 'Monthly' ? (
                   <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3194A0] dark:border-slate-600 dark:text-white dark:bg-slate-800" />
                ) : (
                   <Select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} options={[{ label: "Q1 (Apr-Jun)", value: "Q1 (Apr-Jun)" }, { label: "Q2 (Jul-Sep)", value: "Q2 (Jul-Sep)" }, { label: "Q3 (Oct-Dec)", value: "Q3 (Oct-Dec)" }, { label: "Q4 (Jan-Mar)", value: "Q4 (Jan-Mar)" }]} />
                )}
            </div>
            
            <Button onClick={handleExportExcel} variant="outline" icon={FileText}>Excel</Button>
         </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
        <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('overview')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-[#3194A0] text-[#3194A0]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Overview</button>
            <button onClick={() => setActiveTab('gstr1')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'gstr1' ? 'border-[#3194A0] text-[#3194A0]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>GSTR-1 (Sales)</button>
            <button onClick={() => setActiveTab('gstr2')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'gstr2' ? 'border-[#3194A0] text-[#3194A0]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>GSTR-2 (Expenses)</button>
        </nav>
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-6">
              {/* --- Summary Cards --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 border-l-4 border-l-[#3194A0]">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Current Period Sales</h3>
                      <div className="text-3xl font-bold text-[#3194A0]">₹{formatNumber(totals.totalSales, userSettings.number_format)}</div>
                      <p className="text-sm text-slate-500 mt-1">Tax Liability: ₹{formatNumber(totals.totalOutputTax, userSettings.number_format)}</p>
                  </Card>
                  <Card className="p-6 border-l-4 border-l-red-500">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Current Period Expenses</h3>
                      <div className="text-3xl font-bold text-red-500">₹{formatNumber(totals.totalPurchases, userSettings.number_format)}</div>
                      <p className="text-sm text-slate-500 mt-1">ITC Available: ₹{formatNumber(totals.totalInputTax, userSettings.number_format)}</p>
                  </Card>
              </div>

              {/* --- Visual Chart (Pure CSS) --- */}
              <Card className="p-6">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart2 size={20}/> 6-Month Performance</h3>
                  <div className="flex items-end gap-4 h-64 border-b border-slate-200 dark:border-slate-700 pb-2">
                      {chartData.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                              {/* Tooltip */}
                              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap z-10">
                                  Sales: {formatNumber(d.sales)}<br/>Costs: {formatNumber(d.cost)}
                              </div>
                              
                              <div className="w-full flex gap-1 items-end justify-center h-full">
                                  {/* Sales Bar */}
                                  <div style={{ height: `${(d.sales / maxChartValue) * 100}%` }} className="w-1/3 bg-[#3194A0] rounded-t min-h-[4px] transition-all duration-500"></div>
                                  {/* Cost Bar */}
                                  <div style={{ height: `${(d.cost / maxChartValue) * 100}%` }} className="w-1/3 bg-red-400 rounded-t min-h-[4px] transition-all duration-500"></div>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium rotate-0 whitespace-nowrap">{d.month}</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><div className="w-3 h-3 bg-[#3194A0] rounded-sm"></div> Sales</div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Expenses</div>
                  </div>
              </Card>
          </div>
      )}

      {/* Table Content */}
      {activeTab === 'gstr1' && (
          <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                          <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Invoice No</th><th className="px-6 py-3">Client</th><th className="px-6 py-3 text-right">Taxable (INR)</th><th className="px-6 py-3 text-right">Tax (INR)</th><th className="px-6 py-3 text-right">Total (INR)</th></tr>
                      </thead>
                      <tbody>
                          {filteredInvoices.map(inv => {
                              const { value: totalInr, usedRate } = getInrValue(inv.amount, inv.currency, inv.exchange_rate);
                              const taxInr = (parseFloat(inv.tax) || 0) * usedRate;
                              return (
                                  <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">{formatDate(inv.date)}</td>
                                      <td className="px-6 py-4 font-medium">{inv.id}</td>
                                      <td className="px-6 py-4"><div className="font-medium text-slate-900 dark:text-white">{inv.client?.name}</div>{inv.currency !== 'INR' && (<div className="text-xs text-orange-500">{inv.currency} @ {usedRate.toFixed(2)}</div>)}</td>
                                      <td className="px-6 py-4 text-right">₹{formatNumber(totalInr - taxInr, userSettings.number_format)}</td>
                                      <td className="px-6 py-4 text-right text-slate-500">₹{formatNumber(taxInr, userSettings.number_format)}</td>
                                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">₹{formatNumber(totalInr, userSettings.number_format)}</td>
                                  </tr>
                              );
                          })}
                          {filteredInvoices.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-500">No invoices found</td></tr>}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

      {activeTab === 'gstr2' && (
          <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                          <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Category</th><th className="px-6 py-3 text-right">Amount</th><th className="px-6 py-3 text-right">ITC</th></tr>
                      </thead>
                      <tbody>
                          {filteredExpenses.map(exp => (
                              <tr key={exp.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{formatDate(exp.date)}</td>
                                  <td className="px-6 py-4 font-medium">{exp.category}</td>
                                  <td className="px-6 py-4 text-right">₹{formatNumber(parseFloat(exp.amount), userSettings.number_format)}</td>
                                  <td className="px-6 py-4 text-right text-emerald-600 font-bold">₹{formatNumber(parseFloat(exp.gst_paid), userSettings.number_format)}</td>
                              </tr>
                          ))}
                          {filteredExpenses.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-500">No expenses found</td></tr>}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

      {/* CA Bundle Download Box */}
      <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
         <div>
           <h3 className="text-xl font-bold flex items-center gap-2"><Archive size={24} className="text-emerald-400"/> CA Filing Bundle</h3>
           <p className="text-slate-300 text-sm mt-2 max-w-md leading-relaxed">Includes: Invoice PDFs, Expense Receipts, and CSV Summaries.</p>
         </div>
         <Button onClick={handleDownloadZip} loading={isZipping} disabled={filteredInvoices.length === 0 && filteredExpenses.length === 0} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 h-12 shadow-xl shadow-emerald-900/20">{isZipping ? "Bundling..." : "Download .zip"}</Button>
       </Card>
    </div>
  );
};

export default Reports;