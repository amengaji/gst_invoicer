import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Plus, Paperclip, Trash2, Loader2, Edit, Copy, IndianRupee, PieChart } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const Expenses = ({ addToast }) => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const initialForm = { category: '', date: new Date().toISOString().split('T')[0], amount: '', gst_paid: '', receipt: null, receiptName: '' };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);

  // --- API: Fetch Expenses ---
  const fetchExpenses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/expenses');
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast("Failed to fetch expenses", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // --- Calculations ---
  const totalAmount = useMemo(() => expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0), [expenses]);
  const totalITC = useMemo(() => expenses.reduce((acc, curr) => acc + (parseFloat(curr.gst_paid) || 0), 0), [expenses]);

  // --- Handlers ---
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

  const handleEdit = (exp) => {
      setForm({
          category: exp.category,
          date: exp.date ? exp.date.split('T')[0] : '',
          amount: exp.amount,
          gst_paid: exp.gst_paid,
          receipt: exp.receipt_data, // Mapped from DB column usually
          receiptName: exp.receipt_name
      });
      setEditingId(exp.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (exp) => {
      setForm({
          category: exp.category,
          date: new Date().toISOString().split('T')[0], // Reset date to today
          amount: exp.amount,
          gst_paid: exp.gst_paid,
          receipt: exp.receipt_data,
          receiptName: exp.receipt_name
      });
      setEditingId(null); // Treat as new
      addToast("Expense duplicated. Ready to save.", "info");
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Delete this expense?")) return;
      try {
          await fetch(`http://localhost:5000/api/expenses/${id}`, { method: 'DELETE' });
          addToast("Expense deleted", "success");
          fetchExpenses();
      } catch (e) {
          addToast("Delete failed", "error");
      }
  };

  const handleCancel = () => {
      setForm(initialForm);
      setEditingId(null);
      setErrors({});
  };

  // --- API: Save/Update Expense ---
  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.category) newErrors.category = true;
    if (!form.amount) newErrors.amount = true;
    // Receipt is mandatory only for new expenses, optional for updates if already there? 
    // For now, let's keep it mandatory but check if form has it.
    if (!form.receipt) newErrors.receipt = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast("Please fill all required fields.", "error");
        return;
    }

    try {
      const payload = {
        ...form,
        id: editingId || `EXP-${Date.now()}`,
        amount: parseFloat(form.amount),
        gst_paid: parseFloat(form.gst_paid) || 0
      };

      const url = editingId 
        ? `http://localhost:5000/api/expenses/${editingId}`
        : 'http://localhost:5000/api/expenses';
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");

      addToast(editingId ? "Expense updated!" : "Expense added!", "success");
      handleCancel();
      fetchExpenses(); 
    } catch (error) {
      addToast("Error saving expense", "error");
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/> Loading Expenses...</div>;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold dark:text-white">Expense Tracker</h2>
            <p className="text-slate-500 text-sm">Manage company spending and Input Tax Credits</p>
        </div>
        
        {/* Summary Cards */}
        <div className="flex gap-4 w-full md:w-auto">
            <Card className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-slate-800 flex-1 md:flex-none">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                    <IndianRupee size={16} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Spent</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">₹{totalAmount.toLocaleString()}</p>
                </div>
            </Card>
            
            <Card className="px-4 py-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 flex-1 md:flex-none">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <PieChart size={16} />
                </div>
                <div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold">Total ITC</p>
                    <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">₹{totalITC.toLocaleString()}</p>
                </div>
            </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <Card className={`p-6 h-fit ${editingId ? 'border-blue-300 shadow-md' : ''}`}>
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white">{editingId ? 'Edit Expense' : 'Quick Add Expense'}</h3>
              {editingId && <Button variant="ghost" onClick={handleCancel} className="text-xs h-6 px-2">Cancel</Button>}
          </div>
          
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
                   <button onClick={() => { setForm({...form, receipt: null, receiptName: ''}); setErrors(prev => ({...prev, receipt: true})); }} className="text-red-500 hover:text-red-600"><Trash2 size={18}/></button>
                 )}
               </div>
            </div>

            <Button className="w-full" onClick={handleSubmit}>
                {editingId ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </Card>

        {/* List */}
        <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto">
          {expenses.map((exp) => (
            <Card key={exp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">{exp.category}</p>
                  <p className="text-xs text-slate-500">{new Date(exp.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto">
                  <div className="text-right">
                    <p className="font-bold dark:text-white">-₹{parseFloat(exp.amount).toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 font-medium">ITC: ₹{parseFloat(exp.gst_paid).toLocaleString()}</p>
                    {exp.receipt_name && <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1 truncate max-w-[100px]"><Paperclip size={10}/> {exp.receipt_name}</p>}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDuplicate(exp)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="Duplicate">
                          <Copy size={16}/>
                      </button>
                      <button onClick={() => handleEdit(exp)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded" title="Edit">
                          <Edit size={16}/>
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 size={16}/>
                      </button>
                  </div>
              </div>
            </Card>
          ))}
          {expenses.length === 0 && <p className="text-center text-slate-500 py-10">No expenses recorded yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default Expenses;