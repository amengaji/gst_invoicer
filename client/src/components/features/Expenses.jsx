import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Paperclip, Trash2, Loader2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const Expenses = ({ addToast }) => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ category: '', date: new Date().toISOString().split('T')[0], amount: '', gst_paid: '', receipt: null, receiptName: '' });
  const [errors, setErrors] = useState({});

  // --- API: Fetch Expenses ---
  const fetchExpenses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (error) {
      addToast("Failed to fetch expenses", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, receipt: reader.result, receiptName: file.name });
        setErrors(prev => ({ ...prev, receipt: false }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (value) setErrors(prev => ({ ...prev, [field]: false }));
  }

  // --- API: Save Expense ---
  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.category) newErrors.category = true;
    if (!form.amount) newErrors.amount = true;
    if (!form.receipt) newErrors.receipt = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast("Please fill all required fields.", "error");
        return;
    }

    try {
      const payload = {
        ...form,
        id: `EXP-${Date.now()}`,
        amount: parseFloat(form.amount),
        gst_paid: parseFloat(form.gst_paid) || 0
      };

      const res = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");

      addToast("Expense added successfully!", "success");
      setForm({ category: '', date: new Date().toISOString().split('T')[0], amount: '', gst_paid: '', receipt: null, receiptName: '' });
      setErrors({});
      fetchExpenses(); // Refresh
    } catch (error) {
      addToast("Error saving expense", "error");
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/> Loading Expenses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold dark:text-white">Expense Tracker</h2>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700">
                Total: {expenses.length}
            </span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <Card className="p-6 h-fit">
          <h3 className="font-bold mb-4 dark:text-white">Quick Add Expense</h3>
          <div className="space-y-4">
            <Input label="Category" value={form.category} onChange={e => handleInputChange('category', e.target.value)} placeholder="e.g. Travel" error={errors.category} />
            <Input label="Date" type="date" value={form.date} onChange={e => handleInputChange('date', e.target.value)} />
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={e => handleInputChange('amount', e.target.value)} error={errors.amount} />
            <Input label="GST Paid (Input Credit)" type="number" value={form.gst_paid} onChange={e => handleInputChange('gst_paid', e.target.value)} />
            
            {/* Receipt Attachment */}
            <div>
               <label className={`block text-sm font-medium mb-1 ${errors.receipt ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>Receipt (Mandatory)</label>
               <div className="flex items-center gap-2">
                 <label className={`cursor-pointer w-full flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-dashed rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all ${errors.receipt ? 'border-red-500 text-red-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    <Paperclip size={16} className={`mr-2 ${errors.receipt ? 'text-red-500' : 'text-slate-500'}`}/> 
                    <span className="truncate max-w-[150px]">{form.receiptName || "Attach File"}</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                 </label>
                 {form.receipt && (
                   <button onClick={() => { setForm({...form, receipt: null, receiptName: ''}); setErrors(prev => ({...prev, receipt: true})); }} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                 )}
               </div>
            </div>

            <Button className="w-full" onClick={handleSubmit}>Save Expense</Button>
          </div>
        </Card>

        {/* List */}
        <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto">
          {expenses.map((exp) => (
            <Card key={exp.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Receipt size={20} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">{exp.category}</p>
                  <p className="text-xs text-slate-500">{new Date(exp.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold dark:text-white">-₹{parseFloat(exp.amount).toLocaleString()}</p>
                <p className="text-xs text-emerald-600">ITC: ₹{exp.gst_paid}</p>
                {exp.receipt_name && <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1"><Paperclip size={10}/> {exp.receipt_name}</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Expenses;