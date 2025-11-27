import React from 'react';
import { IndianRupee, Briefcase, FileText, PieChart, Plus } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const Dashboard = ({ invoices, expenses, onNewInvoice, onNewExpense }) => {
  // Calculations
  const totalRevenue = invoices.reduce((acc, curr) => {
    const rate = parseFloat(curr.exchange_rate) || 1;
    return acc + (parseFloat(curr.amount) * rate);
  }, 0);

  const totalExpenses = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  
  const gstCollected = invoices.reduce((acc, curr) => {
    const rate = parseFloat(curr.exchange_rate) || 1;
    return acc + (parseFloat(curr.tax) * rate);
  }, 0);

  const gstPaid = expenses.reduce((acc, curr) => acc + (parseFloat(curr.gst_paid) || 0), 0);
  
  // Current Month Data
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthInvoices = invoices.filter(i => i.date.startsWith(currentMonth)).length;
  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue (Est. INR)</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <IndianRupee size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Expenses</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{totalExpenses.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
              <Briefcase size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">GST Collected</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{gstCollected.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <FileText size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net GST Payable</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">₹{(gstCollected - gstPaid).toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <PieChart size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Output Tax - Input Tax Credit</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Invoices</h3>
          <div className="space-y-4">
            {invoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {(typeof inv.client === 'object' ? inv.client.name : 'Unknown').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-white">{typeof inv.client === 'object' ? inv.client.name : 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{inv.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold dark:text-white">
                    {inv.currency} {parseFloat(inv.amount).toLocaleString()}
                  </p>
                  <Badge type={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
          </div>
        </Card>

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
                  <p className="text-2xl font-bold text-[#3194A0]">{monthInvoices}</p>
                  <span className="text-xs text-slate-500">Invoices Generated</span>
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
                  <p className="text-2xl font-bold text-red-600">{monthExpenses}</p>
                  <span className="text-xs text-slate-500">Expenses Recorded</span>
                </div>
              </div>
          </div>
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">Tax Filing Reminder</h4>
            <p className="text-xs text-amber-700 dark:text-amber-500">Ensure all LUT exports are recorded before generating your GSTR-1 JSON.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;