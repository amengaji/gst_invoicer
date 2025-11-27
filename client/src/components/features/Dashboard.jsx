import React, { useState, useEffect } from 'react';
import { IndianRupee, Briefcase, FileText, PieChart, Plus, Clock, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const Dashboard = ({ invoices, expenses, onNewInvoice, onNewExpense }) => {
  const [exchangeRates, setExchangeRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // --- 1. Fetch Live Currency Rates ---
  useEffect(() => {
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        // Free API, updates daily. Base is USD.
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        setExchangeRates(data.rates);
      } catch (e) {
        console.error("Failed to fetch rates", e);
      } finally {
        setLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  // --- 2. Safety Checks ---
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  // --- 3. Standard Calculations ---
  const paidInvoices = safeInvoices.filter(i => i.status === 'Paid');
  
  const totalRevenueINR = paidInvoices.reduce((acc, curr) => {
    const rate = parseFloat(curr?.exchange_rate) || 1;
    const amount = parseFloat(curr?.amount) || 0;
    return acc + (amount * rate);
  }, 0);

  const totalExpenses = safeExpenses.reduce((acc, curr) => {
      return acc + (parseFloat(curr?.amount) || 0);
  }, 0);
  
  const gstCollected = safeInvoices.reduce((acc, curr) => {
    const rate = parseFloat(curr?.exchange_rate) || 1;
    const tax = parseFloat(curr?.tax) || 0;
    return acc + (tax * rate);
  }, 0);

  const gstPaid = safeExpenses.reduce((acc, curr) => {
      return acc + (parseFloat(curr?.gst_paid) || 0);
  }, 0);
  
  // --- 4. Pending Calculations (Multi-Currency + Approx INR) ---
  const pendingInvoices = safeInvoices.filter(i => i?.status === 'Pending');
  
  // A. Group by original currency
  const pendingByCurrency = pendingInvoices.reduce((acc, inv) => {
      const curr = inv.currency || 'INR';
      const amount = parseFloat(inv.amount) || 0;
      acc[curr] = (acc[curr] || 0) + amount;
      return acc;
  }, {});

  // B. Calculate Approx Total in INR
  let pendingTotalApproxINR = 0;
  if (exchangeRates) {
      pendingTotalApproxINR = pendingInvoices.reduce((acc, inv) => {
          const curr = inv.currency || 'INR';
          const amount = parseFloat(inv.amount) || 0;
          
          if (curr === 'INR') {
              return acc + amount;
          } else {
              // Convert to USD first, then to INR (Base is USD)
              // Formula: Amount / Rate(Curr) * Rate(INR)
              const rateToUSD = exchangeRates[curr];
              const rateINR = exchangeRates['INR'];
              if (rateToUSD && rateINR) {
                  return acc + (amount / rateToUSD * rateINR);
              }
              return acc; // Skip if rate missing
          }
      }, 0);
  }

  // --- 5. Current Month Counts ---
  const today = new Date();
  const currentMonthKey = today.toISOString().slice(0, 7); 
  const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const countCurrentMonth = (items) => {
      return items.filter(item => {
          if (!item?.date) return false;
          try {
              const dateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString();
              return dateStr.slice(0, 7) === currentMonthKey;
          } catch (e) { return false; }
      }).length;
  };

  const monthInvoices = countCurrentMonth(safeInvoices);
  const monthExpenses = countCurrentMonth(safeExpenses);

  const getSymbol = (curr) => {
      if (curr === 'USD') return '$';
      if (curr === 'EUR') return '€';
      if (curr === 'GBP') return '£';
      if (curr === 'INR') return '₹';
      return curr + ' ';
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Revenue Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue (Paid)</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{totalRevenueINR.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
              <p className="text-xs text-emerald-600 mt-1">Realized in INR</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <IndianRupee size={20} />
            </div>
          </div>
        </Card>

        {/* Pending Payments Card (Enhanced) */}
        <Card className="p-6 border-l-4 border-l-orange-400">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Payments</p>
                  {loadingRates && <RefreshCw size={12} className="animate-spin text-slate-400"/>}
              </div>
              
              {/* Individual Currencies */}
              <div className="space-y-1 mb-3">
                  {Object.keys(pendingByCurrency).length > 0 ? (
                      Object.entries(pendingByCurrency).map(([curr, amount]) => (
                        <div key={curr} className="flex justify-between items-baseline">
                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {getSymbol(curr)}{amount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{curr}</span>
                        </div>
                      ))
                  ) : (
                      <h3 className="text-2xl font-bold text-slate-400">--</h3>
                  )}
              </div>
              
              {/* Approx Total */}
              {exchangeRates && pendingTotalApproxINR > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 flex justify-between">
                          <span>Approx Total:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                              ₹{pendingTotalApproxINR.toLocaleString(undefined, {maximumFractionDigits: 0})}
                          </span>
                      </p>
                  </div>
              )}
            </div>
          </div>
        </Card>

        {/* Expenses Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Expenses</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{totalExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
              <Briefcase size={20} />
            </div>
          </div>
        </Card>

        {/* GST Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net GST Payable</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{(gstCollected - gstPaid).toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <PieChart size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Collected: ₹{gstCollected.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Invoices</h3>
          <div className="space-y-4">
            {safeInvoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {(inv.client?.name || 'Unknown').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-white">{inv.client?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{inv.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold dark:text-white">
                    {getSymbol(inv.currency)} {parseFloat(inv.amount || 0).toLocaleString()}
                  </p>
                  <Badge type={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                </div>
              </div>
            ))}
            {safeInvoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
              <button onClick={onNewInvoice} className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">New Invoice</span>
              </button>
              
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <div className="text-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Current Month</h4>
                  <p className="text-xs text-slate-400 mb-1">({monthLabel})</p>
                  <p className="text-2xl font-bold text-[#3194A0]">{monthInvoices}</p>
                  <span className="text-xs text-slate-500">Invoices</span>
                </div>
              </div>

              <button onClick={onNewExpense} className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">New Expense</span>
              </button>

              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <div className="text-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Current Month</h4>
                  <p className="text-xs text-slate-400 mb-1">({monthLabel})</p>
                  <p className="text-2xl font-bold text-red-600">{monthExpenses}</p>
                  <span className="text-xs text-slate-500">Expenses</span>
                </div>
              </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;