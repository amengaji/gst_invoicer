import React, { useState } from 'react';
import { Briefcase, Upload, Save, FileText, Landmark, Plus, Trash2, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { STATES, CURRENCIES } from '../../lib/constants';
import * as XLSX from "xlsx";


const SettingsPage = ({ settings, onSave, addToast }) => {
  const [formData, setFormData] = useState({
      ...settings,
      bank_accounts: settings.bank_accounts || [],
      number_format: settings.number_format || 'IN'
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logo', reader.result);
        addToast("Logo uploaded successfully!", "success");
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
      setFormData(prev => ({
          ...prev,
          bank_accounts: [...(prev.bank_accounts || []), { currency: 'INR', bankName: '', accountNo: '', ifsc: '', swift: '', branch: '' }]
      }));
  };

  const updateBank = (index, field, value) => {
      const newBanks = [...formData.bank_accounts];
      newBanks[index][field] = value;
      setFormData(prev => ({ ...prev, bank_accounts: newBanks }));
  };

  const removeBank = (index) => {
      if (!window.confirm("Remove this bank account?")) return;
      const newBanks = formData.bank_accounts.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, bank_accounts: newBanks }));
  };

  // NEW: Duplicate Function
  const duplicateBank = (index) => {
      const bankToCopy = { ...formData.bank_accounts[index] };
      setFormData(prev => ({
          ...prev,
          bank_accounts: [...prev.bank_accounts, bankToCopy]
      }));
      addToast("Bank account duplicated.", "info");
  };


  const handleBankImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const imported = rows.map(r => ({
            currency: r.Currency || "INR",
            bankName: r.BankName || "",
            accountNo: r.AccountNo || "",
            ifsc: r.IFSC || "",
            swift: r.SWIFT || "",
            branch: r.Branch || ""
        }));

        setFormData(prev => ({
            ...prev,
            bank_accounts: [...prev.bank_accounts, ...imported]
        }));

        addToast("Bank accounts imported!", "success");

    } catch (err) {
        console.error(err);
        addToast("Failed to import bank accounts", "error");
    }

    e.target.value = null;
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
            <h3 className="font-semibold text-lg dark:text-white">Company Details</h3>
          </div>
          
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
             <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                {formData.logo ? <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">No Logo</span>}
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Logo</label>
                <div className="flex items-center gap-2">
                   <label className="cursor-pointer text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-md transition-colors flex items-center">
                     <Upload size={14} className="mr-1.5"/> Upload
                     <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                   </label>
                   {formData.logo && <button onClick={() => handleChange('logo', null)} className="text-xs text-red-500 hover:text-red-600">Remove</button>}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company Name" value={formData.companyName} onChange={e => handleChange('companyName', e.target.value)} />
            <Input label="Email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
            <Input label="GSTIN" value={formData.gstin} onChange={e => handleChange('gstin', e.target.value)} />
            <Input label="LUT / Bond Number" value={formData.lutNumber} onChange={e => handleChange('lutNumber', e.target.value)} placeholder="AD270325138597Q" />
            <div className="col-span-2">
                <Input label="Full Address (For PDF)" value={formData.address} onChange={e => handleChange('address', e.target.value)} />
            </div>
            <Select label="Home State" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} options={STATES.map(s => ({label: s, value: s}))} />
          </div>
        </Card>
        
        {/* Bank Accounts */}
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Landmark className="text-[#3194A0]" size={20} />
                    <h3 className="font-semibold text-lg dark:text-white">Bank Accounts</h3>
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
                    <label className="cursor-pointer px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1">
                      <Upload size={14} className = "text-blue-600"/> 
                      Import (.xlsx)
                      <input type="file" className="hidden" accept=".xlsx" onChange={handleBankImport} />
                    </label>
                </div>
            </div>
            
            <div className="space-y-6">
                {formData.bank_accounts && formData.bank_accounts.map((bank, index) => (
                    <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative group">
                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button 
                                onClick={() => duplicateBank(index)} 
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" 
                                title="Duplicate Bank Details"
                            >
                                <Copy size={16}/>
                            </button>
                            <button 
                                onClick={() => removeBank(index)} 
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Remove Bank"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </div>

                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Bank Account {index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select 
                                label="Currency" 
                                value={bank.currency} 
                                onChange={(e) => updateBank(index, 'currency', e.target.value)} 
                                options={CURRENCIES} 
                            />
                            <Input label="Bank Name" value={bank.bankName} onChange={(e) => updateBank(index, 'bankName', e.target.value)} placeholder="HDFC Bank" />
                            <Input label="Account Number" value={bank.accountNo} onChange={(e) => updateBank(index, 'accountNo', e.target.value)} />
                            <Input label="SWIFT Code" value={bank.swift} onChange={(e) => updateBank(index, 'swift', e.target.value)} placeholder="For International" />
                            <Input label="IFSC / Sort Code" value={bank.ifsc} onChange={(e) => updateBank(index, 'ifsc', e.target.value)} placeholder="For Local" />
                            <Input label="Branch Address" value={bank.branch} onChange={(e) => updateBank(index, 'branch', e.target.value)} />
                        </div>
                    </div>
                ))}
                {(!formData.bank_accounts || formData.bank_accounts.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No bank accounts added. Click "Add Bank" to configure payment details for invoices.</p>
                )}
            </div>
        </Card>

        {/* Preferences */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-[#3194A0]" size={20} />
            <h3 className="font-semibold text-lg dark:text-white">Preferences</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
                label="Number Format" 
                value={formData.number_format} 
                onChange={(e) => handleChange('number_format', e.target.value)} 
                options={[ 
                    {label: "Indian (1,00,000)", value: "IN"}, 
                    {label: "International (100,000)", value: "US"} 
                ]} 
            />
            <Select label="Filing Frequency" value={formData.filingFrequency} onChange={(e) => handleChange('filingFrequency', e.target.value)} options={[ {label: "Monthly", value: "Monthly"}, {label: "Quarterly", value: "Quarterly"} ]} />
            <Input label="Default Invoice Prefix" value={formData.invoicePrefix} onChange={e => handleChange('invoicePrefix', e.target.value)} />
            <Select label="Default Currency" value={formData.currency} onChange={(e) => handleChange('currency', e.target.value)} options={CURRENCIES} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;