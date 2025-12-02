// client/src/components/features/SettingsPage.jsx
import React, { useState } from 'react';
import { 
  Briefcase, Upload, Save, FileText, Landmark, Plus, Trash2, Copy,
  AlertTriangle, CheckCircle, Info, Database, DownloadCloud, UploadCloud
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { STATES, CURRENCIES } from '../../lib/constants';
import * as XLSX from 'xlsx';
import { API_URL } from '../../config/api';


// Define API URL
const API_URL = '';

const KNOWN_IFSC_PREFIXES = {
  HDFC: 'HDFC',
  ICICI: 'ICIC',
  SBI: 'SBIN',
  AXIS: 'UTIB',
  KOTAK: 'KKBK',
  YES: 'YESB',
  PNB: 'PUNB',
  BOB: 'BARB',
};

const isIndianCurrency = (currency) =>
  !currency || currency === 'INR';

const inferFormat = (row) => {
  if (isIndianCurrency(row.currency) || row.ifsc) return 'indian';
  if (row.swift && !isIndianCurrency(row.currency)) return 'international';
  return isIndianCurrency(row.currency) ? 'indian' : 'international';
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

// Small reusable input for preview table
const PreviewCellInput = ({
  value,
  onChange,
  error,
  warning,
  className = '',
  type = 'text',
}) => {
  const base =
    'w-full px-2 py-1 rounded text-xs bg-white dark:bg-slate-900 ' +
    'border outline-none focus:ring-1 focus:ring-[#3194A0] ' +
    'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';

  const stateClass = error
    ? 'border-red-400 bg-red-50 dark:bg-red-900/40'
    : warning
    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
    : 'border-slate-200 dark:border-slate-600';

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`${base} ${stateClass} ${className}`}
      />
      {error && (
        <p className="text-[10px] text-red-500 dark:text-red-400">
          {typeof error === 'string' ? error : 'Required'}
        </p>
      )}
      {!error && warning && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          {typeof warning === 'string' ? warning : 'Recommended'}
        </p>
      )}
    </div>
  );
};


const buildIfscSuggestion = (bankName, branchCode = '0001') => {
  if (!bankName) return null;
  const upper = bankName.toUpperCase().trim();

  let prefix = null;
  for (const key of Object.keys(KNOWN_IFSC_PREFIXES)) {
    if (upper.startsWith(key)) {
      prefix = KNOWN_IFSC_PREFIXES[key];
      break;
    }
  }

  if (!prefix) {
    // fallback: first 4 letters + '0'
    prefix = upper.replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
  }

  return `${prefix}0${branchCode.padStart(6, '0')}`;
};

const validateBankRow = (row) => {
  const errors = [];
  const warnings = [];
  const fieldErrors = {};

  const format = inferFormat(row);

  // Required fields
  if (!row.bankName?.trim()) {
    errors.push('Bank Name is required');
    fieldErrors.bankName = 'required';
  }
  if (!row.accountNo?.trim()) {
    errors.push('Account Number is required');
    fieldErrors.accountNo = 'required';
  }
  if (!row.currency?.trim()) {
    warnings.push('Currency missing, defaulting to INR');
    fieldErrors.currency = 'warning';
  }

  if (format === 'indian') {
    if (!row.ifsc?.trim()) {
      errors.push('IFSC is required for Indian accounts');
      fieldErrors.ifsc = 'required';
    } else if (!IFSC_REGEX.test(row.ifsc.trim().toUpperCase())) {
      errors.push('Invalid IFSC format');
      fieldErrors.ifsc = 'invalid';
    }
  } else {
    // international
    if (!row.swift?.trim()) {
      errors.push('SWIFT is recommended for international accounts');
      fieldErrors.swift = 'warning';
      warnings.push('Missing SWIFT for international account');
    } else if (!SWIFT_REGEX.test(row.swift.trim().toUpperCase())) {
      errors.push('Invalid SWIFT format');
      fieldErrors.swift = 'invalid';
    }
  }

  if (!row.branch?.trim()) {
    warnings.push('Branch address is recommended');
    fieldErrors.branch = fieldErrors.branch || 'warning';
  }

  const hasError = errors.length > 0;
  const hasWarning = warnings.length > 0;

  return {
    ...row,
    format,
    errors,
    warnings,
    fieldErrors,
    hasError,
    hasWarning,
    selected: hasError ? false : row.selected ?? true,
  };
};

const summarizeImport = (rows) => {
  let total = rows.length;
  let valid = 0;
  let withWarnings = 0;
  let withErrors = 0;

  rows.forEach((r) => {
    if (r.hasError) withErrors++;
    else if (r.hasWarning) {
      withWarnings++;
      valid++;
    } else {
      valid++;
    }
  });

  return { total, valid, withWarnings, withErrors };
};

const SettingsPage = ({ settings, onSave, addToast }) => {
  const [formData, setFormData] = useState({
    ...settings,
    bank_accounts: settings.bank_accounts || [],
    number_format: settings.number_format || 'IN',
  });
  const [saved, setSaved] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Import / preview state
  const [importPreview, setImportPreview] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [showImportPreview, setShowImportPreview] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logo', reader.result);
        addToast('Logo uploaded successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // --- Bank Account Helpers ---
  const addBankAccount = () => {
    setFormData((prev) => ({
      ...prev,
      bank_accounts: [
        ...(prev.bank_accounts || []),
        {
          currency: 'INR',
          bankName: '',
          accountNo: '',
          ifsc: '',
          swift: '',
          branch: '',
        },
      ],
    }));
  };

  const updateBank = (index, field, value) => {
    const newBanks = [...formData.bank_accounts];
    newBanks[index][field] = value;
    setFormData((prev) => ({ ...prev, bank_accounts: newBanks }));
  };

  const removeBank = (index) => {
    if (!window.confirm('Remove this bank account?')) return;
    const newBanks = formData.bank_accounts.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, bank_accounts: newBanks }));
  };

  const duplicateBank = (index) => {
    const bankToCopy = { ...formData.bank_accounts[index] };
    setFormData((prev) => ({
      ...prev,
      bank_accounts: [...prev.bank_accounts, bankToCopy],
    }));
    addToast('Bank account duplicated.', 'info');
  };

  const handleDownloadBankTemplate = () => {
    const header = [
      'Currency',
      'BankName',
      'AccountNo',
      'IFSC',
      'SWIFT',
      'Branch',
    ];
    const sampleRows = [
      ['INR', 'HDFC Bank', '001234567890', 'HDFC0001234', '', 'Andheri East'],
      ['USD', 'HDFC Bank', 'US-1234567890', '', 'HDFCINBBXXX', 'New York'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BankAccounts');
    XLSX.writeFile(wb, 'bank_accounts_template.xlsx');
  };

  const handleBankImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const cleanRows = rows.map((r, idx) => {
        const row = {
          _rowIndex: idx + 2, // excel row indicator
          currency: (r.Currency || r.currency || 'INR').toString().trim(),
          bankName: (r.BankName || r.bankName || '').toString().trim(),
          accountNo: (r.AccountNo || r.accountNo || '').toString().trim(),
          ifsc: (r.IFSC || r.ifsc || '').toString().trim().toUpperCase(),
          swift: (r.SWIFT || r.swift || '').toString().trim().toUpperCase(),
          branch: (r.Branch || r.branch || '').toString().trim(),
          selected: true,
        };
        // basic sanitization
        row.accountNo = row.accountNo.replace(/\s+/g, '');
        return row;
      });

      const validated = cleanRows.map(validateBankRow);
      const stats = summarizeImport(validated);

      setImportPreview(validated);
      setImportStats(stats);
      setShowImportPreview(true);

      addToast('Preview loaded. Review before importing.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to import bank accounts', 'error');
    }

    e.target.value = null;
  };

  const updatePreviewRowField = (index, field, value) => {
    setImportPreview(prev => {
      const next = prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        return validateBankRow(updated);
      });
      setImportStats(summarizeImport(next));
      return next;
    });
  };


  const toggleRowSelection = (index) => {
    setImportPreview((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const applyIfscSuggestionToRow = (index) => {
    setImportPreview((prev) => {
      const next = [...prev];
      const row = next[index];
      const suggestion = buildIfscSuggestion(row.bankName);
      if (!suggestion) return prev;
      const updated = {
        ...row,
        ifsc: suggestion,
      };
      next[index] = validateBankRow(updated);
      return next;
    });
    setImportStats((prev) => summarizeImport(importPreview));
  };

  const fixAllWithSuggestions = () => {
    setImportPreview((prev) => {
      const next = prev.map((row) => {
        let updated = { ...row };
        if (
          inferFormat(updated) === 'indian' &&
          (!updated.ifsc || !IFSC_REGEX.test(updated.ifsc))
        ) {
          const suggestion = buildIfscSuggestion(updated.bankName);
          if (suggestion) {
            updated.ifsc = suggestion;
          }
        }
        return validateBankRow(updated);
      });
      setImportStats(summarizeImport(next));
      return next;
    });
    addToast('Suggestions applied where possible.', 'info');
  };

  const handleConfirmImport = () => {
    const selected = importPreview.filter(
      (r) => r.selected && !r.hasError
    );
    if (selected.length === 0) {
      addToast('No valid rows selected for import.', 'error');
      return;
    }

    const mapped = selected.map((r) => ({
      currency: r.currency || 'INR',
      bankName: r.bankName,
      accountNo: r.accountNo,
      ifsc: r.ifsc,
      swift: r.swift,
      branch: r.branch,
    }));

    setFormData((prev) => ({
      ...prev,
      bank_accounts: [...(prev.bank_accounts || []), ...mapped],
    }));

    setShowImportPreview(false);
    setImportPreview([]);
    setImportStats(null);

    addToast(`Imported ${mapped.length} bank accounts.`, 'success');
  };

  // --- NEW: Backup & Restore Handlers ---
  const handleDownloadBackup = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/backup`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Backup failed");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Zenith_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        addToast("Backup downloaded successfully!", "success");
    } catch (e) {
        addToast("Failed to download backup", "error");
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("WARNING: This will DELETE all current data and replace it with the backup. Are you sure?")) {
        e.target.value = null;
        return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            const jsonData = JSON.parse(event.target.result);
            const token = localStorage.getItem('token');

            const res = await fetch(`${API_URL}/api/backup`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(jsonData)
            });

            if (!res.ok) throw new Error("Restore failed");

            addToast("Data restored successfully! Reloading...", "success");
            setTimeout(() => window.location.reload(), 1500);

        } catch (err) {
            console.error(err);
            addToast("Invalid backup file or server error", "error");
        } finally {
            setIsRestoring(false);
            e.target.value = null;
        }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Settings</h2>
        <Button onClick={handleSave} icon={Save}>
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Company Details */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="text-[#3194A0]" size={20} />
            <h3 className="font-semibold text-lg dark:text-white">
              Company Details
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">No Logo</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-md transition-colors flex items-center">
                  <Upload size={14} className="mr-1.5" /> Upload
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </label>
                {formData.logo && (
                  <button
                    onClick={() => handleChange('logo', null)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={formData.companyName}
              onChange={(e) =>
                handleChange('companyName', e.target.value)
              }
            />
            <Input
              label="Email"
              value={formData.email}
              onChange={(e) =>
                handleChange('email', e.target.value)
              }
            />
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) =>
                handleChange('gstin', e.target.value)
              }
            />
            <Input
              label="LUT / Bond Number"
              value={formData.lutNumber}
              onChange={(e) =>
                handleChange('lutNumber', e.target.value)
              }
              placeholder="AD270325138597Q"
            />
            <div className="col-span-2">
              <Input
                label="Full Address (For PDF)"
                value={formData.address}
                onChange={(e) =>
                  handleChange('address', e.target.value)
                }
              />
            </div>
            <Select
              label="Home State"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              options={STATES.map((s) => ({ label: s, value: s }))}
            />
          </div>
        </Card>

        {/* Bank Accounts */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Landmark className="text-[#3194A0]" size={20} />
              <h3 className="font-semibold text-lg dark:text-white">
                Bank Accounts
              </h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={addBankAccount}
                icon={Plus}
                className="text-sm"
              >
                Add Bank
              </Button>
              <button
                type="button"
                onClick={handleDownloadBankTemplate}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1"
              >
                <FileText size={14} className="text-emerald-600" />
                Template (.xlsx)
              </button>
              <label className="cursor-pointer px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1">
                <Upload size={14} className="text-blue-600" />
                Import (.xlsx)
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx"
                  onChange={handleBankImport}
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            {formData.bank_accounts &&
              formData.bank_accounts.map((bank, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => duplicateBank(index)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Duplicate Bank Details"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => removeBank(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove Bank"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                    Bank Account {index + 1}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="Currency"
                      value={bank.currency}
                      onChange={(e) =>
                        updateBank(index, 'currency', e.target.value)
                      }
                      options={CURRENCIES}
                    />
                    <Input
                      label="Bank Name"
                      value={bank.bankName}
                      onChange={(e) =>
                        updateBank(index, 'bankName', e.target.value)
                      }
                      placeholder="HDFC Bank"
                    />
                    <Input
                      label="Account Number"
                      value={bank.accountNo}
                      onChange={(e) =>
                        updateBank(index, 'accountNo', e.target.value)
                      }
                    />
                    <Input
                      label="SWIFT Code"
                      value={bank.swift}
                      onChange={(e) =>
                        updateBank(index, 'swift', e.target.value)
                      }
                      placeholder="For International"
                    />
                    <Input
                      label="IFSC / Sort Code"
                      value={bank.ifsc}
                      onChange={(e) =>
                        updateBank(index, 'ifsc', e.target.value)
                      }
                      placeholder="For Local"
                    />
                    <Input
                      label="Branch Address"
                      value={bank.branch}
                      onChange={(e) =>
                        updateBank(index, 'branch', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            {(!formData.bank_accounts ||
              formData.bank_accounts.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">
                No bank accounts added. Click &quot;Add Bank&quot; to
                configure payment details for invoices.
              </p>
            )}
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-[#3194A0]" size={20} />
            <h3 className="font-semibold text-lg dark:text-white">
              Preferences
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Number Format"
              value={formData.number_format}
              onChange={(e) =>
                handleChange('number_format', e.target.value)
              }
              options={[
                { label: 'Indian (1,00,000)', value: 'IN' },
                { label: 'International (100,000)', value: 'US' },
              ]}
            />
            <Select
              label="Filing Frequency"
              value={formData.filingFrequency}
              onChange={(e) =>
                handleChange('filingFrequency', e.target.value)
              }
              options={[
                { label: 'Monthly', value: 'Monthly' },
                { label: 'Quarterly', value: 'Quarterly' },
              ]}
            />
            <Input
              label="Default Invoice Prefix"
              value={formData.invoicePrefix}
              onChange={(e) =>
                handleChange('invoicePrefix', e.target.value)
              }
            />
            <Select
              label="Default Currency"
              value={formData.currency}
              onChange={(e) =>
                handleChange('currency', e.target.value)
              }
              options={CURRENCIES}
            />
          </div>
        </Card>

        {/* --- NEW: Data Backup & Recovery Section --- */}
        <Card className="p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-2 mb-4">
                <Database className="text-[#3194A0]" size={20} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Data Backup</h3>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Backup Your Data
                        <CheckCircle size={16} className="text-emerald-500"/>
                    </h4>
                    <p className="text-sm text-slate-500 max-w-md">
                        Download a full JSON copy of your clients, invoices, expenses, and settings. 
                    </p>
                </div>
                <Button onClick={handleDownloadBackup} variant="outline" className="border-purple-200 hover:bg-purple-50 text-purple-700 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/20">
                    <DownloadCloud size={18} className="mr-2"/> Download Backup
                </Button>
            </div>

            <hr className="my-6 border-slate-100 dark:border-slate-700" />

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                    <h4 className="font-bold text-red-600 flex items-center gap-2">
                        <AlertTriangle size={18}/>
                        Restore Data
                    </h4>
                    <p className="text-sm text-slate-500 max-w-md">
                        Upload a previously downloaded backup file. 
                        <span className="font-bold text-red-500"> Warning: This will completely replace your current data.</span>
                    </p>
                </div>
                <label className="cursor-pointer">
                    <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" disabled={isRestoring}/>
                    <div className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${isRestoring ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                        {isRestoring ? (
                            <span>Restoring...</span>
                        ) : (
                            <>
                                <UploadCloud size={18} className="mr-2"/> 
                                Restore from File
                            </>
                        )}
                    </div>
                </label>
            </div>
        </Card>
      </div>

      {/* IMPORT PREVIEW MODAL */}
      {showImportPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-2 sm:px-4">
          <div
            className="
              bg-white dark:bg-slate-900 rounded-xl shadow-2xl
              w-full max-w-6xl max-h-[90vh]
              flex flex-col border border-slate-200 dark:border-slate-700
              transform transition-all duration-150 ease-out scale-100 opacity-100
            "
          >
            {/* HEADER (sticky) */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-[#3194A0]" />
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Import Bank Accounts – Preview
                </h3>
              </div>
              <button
                onClick={() => setShowImportPreview(false)}
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            {/* SUMMARY BAR */}
            {importStats && (
              <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Info size={14} />
                  <span>
                    Total rows:{' '}
                    <span className="font-semibold">{importStats.total}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={14} />
                  <span>
                    Valid:{' '}
                    <span className="font-semibold">{importStats.valid}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  <span>
                    Warnings:{' '}
                    <span className="font-semibold">
                      {importStats.withWarnings}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} />
                  <span>
                    Errors:{' '}
                    <span className="font-semibold">
                      {importStats.withErrors}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* TABLE BODY */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-3 py-2 text-left w-14">Row</th>
                    <th className="px-3 py-2 text-left w-24">Currency</th>
                    <th className="px-3 py-2 text-left w-40">Bank</th>
                    <th className="px-3 py-2 text-left w-40">Account No</th>
                    <th className="px-3 py-2 text-left w-40">IFSC</th>
                    <th className="px-3 py-2 text-left w-40">SWIFT</th>
                    <th className="px-3 py-2 text-left w-48">Branch</th>
                    <th className="px-3 py-2 text-left w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, index) => {
                    const rowColor = row.hasError
                      ? 'border-l-4 border-l-red-500'
                      : row.hasWarning
                      ? 'border-l-4 border-l-amber-400'
                      : 'border-l-4 border-l-emerald-500';

                    const bgColor = row.hasError
                      ? 'bg-red-50/60 dark:bg-red-900/20'
                      : row.hasWarning
                      ? 'bg-amber-50/60 dark:bg-amber-900/10'
                      : 'bg-white dark:bg-slate-900';

                    return (
                      <tr
                        key={index}
                        className={`${rowColor} ${bgColor} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/70 transition-colors`}
                      >
                        {/* Select */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-[#3194A0]"
                            checked={row.selected}
                            disabled={row.hasError}
                            onChange={() => {
                              setImportPreview(prev => {
                                const next = prev.map((r, i) =>
                                  i === index
                                    ? { ...r, selected: !r.selected }
                                    : r
                                );
                                setImportStats(summarizeImport(next));
                                return next;
                              });
                            }}
                          />
                        </td>

                        {/* Row number */}
                        <td className="px-3 py-2 align-top text-slate-500 dark:text-slate-400">
                          #{row._rowIndex}
                        </td>

                        {/* Currency */}
                        <td className="px-3 py-2 align-top">
                          <PreviewCellInput
                            value={row.currency}
                            onChange={e =>
                              updatePreviewRowField(
                                index,
                                'currency',
                                e.target.value
                              )
                            }
                            warning={
                              row.fieldErrors.currency === 'warning'
                                ? 'Missing – will default to INR'
                                : undefined
                            }
                          />
                        </td>

                        {/* Bank Name */}
                        <td className="px-3 py-2 align-top">
                          <PreviewCellInput
                            value={row.bankName}
                            onChange={e =>
                              updatePreviewRowField(
                                index,
                                'bankName',
                                e.target.value
                              )
                            }
                            error={
                              row.fieldErrors.bankName === 'required'
                                ? 'Bank name is required'
                                : undefined
                            }
                          />
                        </td>

                        {/* Account No */}
                        <td className="px-3 py-2 align-top">
                          <PreviewCellInput
                            value={row.accountNo}
                            onChange={e =>
                              updatePreviewRowField(
                                index,
                                'accountNo',
                                e.target.value.replace(/\s+/g, '')
                              )
                            }
                            error={
                              row.fieldErrors.accountNo === 'required'
                                ? 'Account number is required'
                                : undefined
                            }
                          />
                        </td>

                        {/* IFSC + Suggest */}
                        <td className="px-3 py-2 align-top">
                          <div className="flex gap-1">
                            <PreviewCellInput
                              value={row.ifsc}
                              onChange={e =>
                                updatePreviewRowField(
                                  index,
                                  'ifsc',
                                  e.target.value.toUpperCase()
                                )
                              }
                              error={
                                row.fieldErrors.ifsc === 'required'
                                  ? 'IFSC is required for INR accounts'
                                  : row.fieldErrors.ifsc === 'invalid'
                                  ? 'Invalid IFSC format'
                                  : undefined
                              }
                            />
                            {inferFormat(row) === 'indian' && !row.ifsc && (
                              <button
                                type="button"
                                onClick={() => applyIfscSuggestionToRow(index)}
                                className="text-[10px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                Suggest
                              </button>
                            )}
                          </div>
                        </td>

                        {/* SWIFT */}
                        <td className="px-3 py-2 align-top">
                          <PreviewCellInput
                            value={row.swift}
                            onChange={e =>
                              updatePreviewRowField(
                                index,
                                'swift',
                                e.target.value.toUpperCase()
                              )
                            }
                            error={
                              row.fieldErrors.swift === 'invalid'
                                ? 'Invalid SWIFT format'
                                : undefined
                            }
                            warning={
                              row.fieldErrors.swift === 'warning'
                                ? 'Recommended for international accounts'
                                : undefined
                            }
                          />
                        </td>

                        {/* Branch */}
                        <td className="px-3 py-2 align-top">
                          <PreviewCellInput
                            value={row.branch}
                            onChange={e =>
                              updatePreviewRowField(
                                index,
                                'branch',
                                e.target.value
                              )
                            }
                            warning={
                              row.fieldErrors.branch === 'warning'
                                ? 'Branch/location recommended'
                                : undefined
                            }
                          />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 align-top">
                          {row.hasError ? (
                            <div className="text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              <span>Error</span>
                            </div>
                          ) : row.hasWarning ? (
                            <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              <span>Warning</span>
                            </div>
                          ) : (
                            <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={12} />
                              <span>OK</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {importPreview.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-6 text-slate-500 dark:text-slate-400"
                      >
                        No rows to preview.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER (sticky) */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 sticky bottom-0 flex flex-wrap items-center justify-between gap-3">
              {/* Legend (left) */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                <span>✅ Edit cells inline before importing</span>
                <span>•</span>
                <span>
                  <span className="text-red-500 font-semibold">Red</span> = must
                  fix
                </span>
                <span>•</span>
                <span>
                  <span className="text-amber-500 font-semibold">Yellow</span> =
                  recommended
                </span>
              </div>

              {/* Actions (right) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fixAllWithSuggestions}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Fix with Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportPreview(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 text-xs rounded-lg bg-[#3194A0] text-white hover:bg-[#277783]"
                >
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;