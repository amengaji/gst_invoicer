// client/src/components/features/Expenses.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Paperclip,
  Trash2,
  Loader2,
  Edit,
  Copy,
  Plus,
  X
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Pagination from '../ui/Pagination';
import { API_URL } from '../../config/api';

const Expenses = ({ addToast }) => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Form State (S3 version: we now track receiptUrl instead of raw base64)
  const initialForm = {
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    gst_paid: '',
    receiptUrl: '',
    receiptName: ''
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);

  // --- Helper: Authenticated Fetch (JSON and others) ---
// --- Helper: Authenticated Fetch (JSON + FormData safe) ---
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const isFormData = options.body instanceof FormData;

  let headers = {
    Authorization: `Bearer ${token}`,
  };

  // ❌ DO NOT SET CONTENT-TYPE for FormData uploads
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    ...options,
    headers,
  });
};




  // --- API: Fetch Expenses ---
  const fetchExpenses = async () => {
    try {
      const res = await authFetch(`${API_URL}/expenses`);
      if (res && res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to fetch expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // --- Calculations ---
  const totalAmount = useMemo(
    () =>
      expenses.reduce(
        (acc, curr) => acc + (parseFloat(curr.amount) || 0),
        0
      ),
    [expenses]
  );

  const totalITC = useMemo(
    () =>
      expenses.reduce(
        (acc, curr) => acc + (parseFloat(curr.gst_paid) || 0),
        0
      ),
    [expenses]
  );

  // --- File Upload (to S3 via backend) ---
// --- File Upload (Corrected to use FormData) ---
// --- File Upload (Corrected & Fully Working) ---
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log("Selected file:", file);

  // Size validation
  if (file.size > 10 * 1024 * 1024) {
    addToast("File too large! Max 10MB.", "error");
    return;
  }

  // Type validation
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    addToast("Only PDF, JPG or PNG allowed.", "error");
    return;
  }

  try {
    addToast("Uploading...", "info");

    const formData = new FormData();
    formData.append("expense-receipt", file); // KEY MUST MATCH BACKEND

    const res = await authFetch(`${API_URL}/uploads/expense-receipt`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const t = await res.text();
      console.log("UPLOAD ERROR:", t);
      throw new Error("Upload failed");
    }

    const data = await res.json();

    setForm((prev) => ({
      ...prev,
      receiptUrl: data.url,
      receiptName: data.fileName || file.name,
    }));

    addToast("Receipt uploaded successfully!", "success");
  } catch (error) {
    console.error("UPLOAD FAILED:", error);
    addToast("Failed to upload receipt", "error");
  }
};



  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (value) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleEdit = (exp) => {
    setForm({
      category: exp.category || '',
      date: exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
      amount: exp.amount ?? '',
      gst_paid: exp.gst_paid ?? '',
      // if you're migrating from base64, new records will have receipt_url
      receiptUrl: exp.receipt_url || '',
      receiptName: exp.receipt_name || ''
    });

    setEditingId(exp.id);
    setIsModalOpen(true);
  };

  const handleDuplicate = (exp) => {
    setForm({
      category: exp.category || '',
      date: new Date().toISOString().split('T')[0],
      amount: exp.amount ?? '',
      gst_paid: exp.gst_paid ?? '',
      // duplicate with same receipt reference (URL)
      receiptUrl: exp.receipt_url || '',
      receiptName: exp.receipt_name || ''
    });
    setEditingId(null);
    addToast('Expense info copied. Ready to save.', 'info');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;

    try {
      const res = await authFetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE'
      });

      if (res && res.ok) {
        addToast('Expense deleted', 'success');
        fetchExpenses();
      } else {
        addToast('Delete failed', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Delete failed', 'error');
    }
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditingId(null);
    setErrors({});
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.category) newErrors.category = true;
    if (!form.amount) newErrors.amount = true;
    if (!form.receiptUrl) newErrors.receipt = true; // now checks URL (S3)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const payload = {
        id: editingId || `EXP-${Date.now()}`,
        category: form.category,
        date: form.date,
        amount: parseFloat(form.amount),
        gst_paid: parseFloat(form.gst_paid) || 0,
        receipt_url: form.receiptUrl,
        receipt_name: form.receiptName
      };

      const url = editingId
        ? `${API_URL}/expenses/${editingId}`
        : `${API_URL}/expenses`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        addToast(
          editingId ? 'Expense updated!' : 'Expense added!',
          'success'
        );
        handleCancel();
        fetchExpenses();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error(error);
      addToast('Error saving expense', 'error');
    }
  };

  const paginatedExpenses = expenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto" /> Loading Expenses...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Header + Stats + Add Button --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Expense Tracker</h2>
          <p className="text-slate-500 text-sm">
            Manage company spending and Input Tax Credits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex gap-4 flex-1 md:flex-none">
            <Card className="px-4 py-2 flex items-center gap-3 bg-white dark:bg-slate-800 border-l-4 border-l-red-500">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">
                  Total Spent
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{totalAmount.toLocaleString()}
                </p>
              </div>
            </Card>
            <Card className="px-4 py-2 flex items-center gap-3 bg-white dark:bg-slate-800 border-l-4 border-l-emerald-500">
              <div>
                <p className="text-[10px] text-emerald-600 uppercase font-bold">
                  Total ITC
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{totalITC.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          <Button
            onClick={() => {
              handleCancel();
              setIsModalOpen(true);
            }}
            icon={Plus}
          >
            New Expense
          </Button>
        </div>
      </div>

      {/* --- Expense List --- */}
      <div className="space-y-4">
        {paginatedExpenses.map((exp) => (
          <Card
            key={exp.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                <Receipt size={20} />
              </div>
              <div>
                <p className="font-medium dark:text-white">{exp.category}</p>
                <p className="text-xs text-slate-500">
                  {exp.date ? new Date(exp.date).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 justify-between sm:justify-end w-full sm:w-auto">
              <div className="text-right">
                <p className="font-bold dark:text-white text-lg">
                  -₹{parseFloat(exp.amount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  ITC: ₹{parseFloat(exp.gst_paid || 0).toLocaleString()}
                </p>
              </div>

              {exp.receipt_name && (
                <div className="hidden md:flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full max-w-[150px]">
                  <Paperclip size={12} />
                  <span className="truncate">{exp.receipt_name}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleDuplicate(exp)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Duplicate"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => handleEdit(exp)}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              No expenses recorded yet.
            </p>
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(true)}
              className="mt-2 text-emerald-600"
            >
              Create your first expense
            </Button>
          </div>
        )}
      </div>

      {expenses.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={expenses.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* --- CREATE / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold dark:text-white">
                {editingId ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <Input
                label="Category"
                value={form.category}
                onChange={(e) =>
                  handleInputChange('category', e.target.value)
                }
                placeholder="e.g. Travel, Office Supplies"
                error={errors.category}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    handleInputChange('date', e.target.value)
                  }
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    handleInputChange('amount', e.target.value)
                  }
                  error={errors.amount}
                />
              </div>

              <Input
                label="GST Paid (Input Credit)"
                type="number"
                value={form.gst_paid}
                onChange={(e) =>
                  handleInputChange('gst_paid', e.target.value)
                }
                placeholder="0.00"
              />

              {/* Receipt Attachment */}
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${
                    errors.receipt
                      ? 'text-red-600'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Receipt (Mandatory)
                </label>
                <div className="flex items-center gap-2">
                  <label
                    className={`cursor-pointer w-full flex items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
                      errors.receipt
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className="text-center">
                      {form.receiptName ? (
                        <div className="flex flex-col items-center text-emerald-600">
                          <Paperclip size={24} className="mb-2" />
                          <span className="font-semibold">
                            {form.receiptName}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            Click to replace
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="bg-white dark:bg-slate-700 p-2 rounded-full mb-2 shadow-sm">
                            <Paperclip size={20} />
                          </div>
                          <span>Click to attach receipt</span>
                          <span className="text-xs text-slate-400 mt-1">
                            PDF or Image
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      enctype="multipart/form-data"
                      onChange={(e) =>{
                        console.log("User selected file:", e.target.files[0]);
                        handleFileChange(e);
                      }}
                    />
                  </label>

                  {form.receiptUrl && (
                    <button
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          receiptUrl: '',
                          receiptName: ''
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          receipt: true
                        }));
                      }}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 h-full flex items-center justify-center"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
