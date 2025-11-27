import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Receipt, PieChart, Settings, Menu, Moon, Sun, Search, Users, 
  CheckCircle, Printer, Edit, Trash2, Download, Plus, FileSpreadsheet, ChevronUp, ChevronDown 
} from 'lucide-react';
import * as XLSX from 'xlsx'; 
import { ToastContainer } from './components/ui/Toast';
import { DeleteModal, PaymentModal } from './components/ui/Modal';
import Badge from './components/ui/Badge';
import Card from './components/ui/Card';
import Button from './components/ui/Button';

// Features
import Dashboard from './components/features/Dashboard';
import Expenses from './components/features/Expenses';
import Reports from './components/features/Reports';
import ClientManager from './components/features/ClientManager';
import CreateInvoice from './components/features/CreateInvoice';
import SettingsPage from './components/features/SettingsPage';
import { generateInvoicePDF } from './lib/pdf-generator';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Sorting State ---
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // --- Global Data State ---
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Single declaration of userSettings
  const [userSettings, setUserSettings] = useState({
     companyName: 'My Tech Company',
     email: 'admin@company.com',
     gstin: '27AAAAA0000A1Z5',
     address: '123 Business Park, Mumbai',
     state: 'Maharashtra',
     invoicePrefix: 'INV-23',
     currency: 'INR',
     filingFrequency: 'Monthly',
     bank_accounts: []
  });

  // --- Modals & Toasts ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentPaymentInvoice, setCurrentPaymentInvoice] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // --- API: Load Data ---
  const loadData = async () => {
    try {
        const [invRes, expRes, cliRes, setRes] = await Promise.all([
            fetch('http://localhost:5000/api/invoices'),
            fetch('http://localhost:5000/api/expenses'),
            fetch('http://localhost:5000/api/clients'),
            fetch('http://localhost:5000/api/settings')
        ]);
        
        setInvoices(await invRes.json());
        setExpenses(await expRes.json());
        setClients(await cliRes.json());
        
        const settingsData = await setRes.json();
        if(settingsData && settingsData.id) {
            setUserSettings(prev => ({ 
                ...prev,
                ...settingsData, 
                // Parse JSON string from DB back to Array
                bank_accounts: typeof settingsData.bank_accounts === 'string' 
                    ? JSON.parse(settingsData.bank_accounts) 
                    : (settingsData.bank_accounts || [])
            }));
        }
    } catch (e) {
        console.error("Failed to load data", e);
        addToast("Error connecting to server", "error");
    }
  };

  useEffect(() => {
    loadData();
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- Handlers ---
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleSaveInvoice = async (newInvoice) => {
    try {
        const res = await fetch('http://localhost:5000/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newInvoice)
        });
        
        if(!res.ok) throw new Error("Save failed");
        
        addToast("Invoice saved successfully!", "success");
        setEditingInvoice(null);
        setActiveTab('invoices');
        loadData(); 
    } catch (e) {
        addToast("Error saving invoice", "error");
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    if (invoice.currency === 'INR') {
       await updateInvoiceStatus(invoice.id, 'Paid', 1);
    } else {
       setCurrentPaymentInvoice(invoice);
       setPaymentModalOpen(true);
    }
  };

  const updateInvoiceStatus = async (id, status, rate) => {
    try {
        await fetch(`http://localhost:5000/api/invoices/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, exchangeRate: rate })
        });
        addToast("Invoice updated", "success");
        loadData();
    } catch (e) {
        addToast("Update failed", "error");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
        await fetch(`http://localhost:5000/api/invoices/${invoiceToDelete}`, { method: 'DELETE' });
        addToast("Invoice deleted", "success");
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
        loadData();
    } catch (e) {
        addToast("Delete failed", "error");
    }
  };

  const handleSaveSettings = async (newSettings) => {
      try {
          const payload = {
              company_name: newSettings.companyName,
              email: newSettings.email,
              gstin: newSettings.gstin,
              address: newSettings.address,
              state: newSettings.state,
              invoice_prefix: newSettings.invoicePrefix,
              currency: newSettings.currency,
              filing_frequency: newSettings.filingFrequency,
              logo: newSettings.logo,
              lut_number: newSettings.lutNumber,
              bank_accounts: newSettings.bank_accounts
          };

          await fetch('http://localhost:5000/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          setUserSettings(newSettings);
          addToast("Settings saved to Database!", "success");
      } catch (e) {
          addToast("Failed to save settings", "error");
      }
  }

  // --- Sorting Handler ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Filtering & Sorting Logic ---
  const processedInvoices = useMemo(() => {
    let data = invoices.filter(inv => 
      !searchQuery || 
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'amount') {
           aValue = parseFloat(a.amount);
           bValue = parseFloat(b.amount);
        } else if (sortConfig.key === 'client') {
           aValue = (a.client?.name || '').toLowerCase();
           bValue = (b.client?.name || '').toLowerCase();
        } else {
           aValue = (a[sortConfig.key] || '').toString().toLowerCase();
           bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [invoices, searchQuery, sortConfig]);


  // --- Invoice Import Logic ---
  const handleDownloadInvoiceTemplate = () => {
    const headers = "Invoice No,Date,Client Name,Client State,Currency,Exchange Rate,Item Desc,Item HSN,Item Qty,Item Price,Is LUT\n";
    const sampleRow1 = "INV-001,2023-10-25,Acme Corp,Maharashtra,INR,1,Web Dev Services,9983,1,50000,FALSE\n";
    const sampleRow2 = "INV-001,2023-10-25,Acme Corp,Maharashtra,INR,1,Hosting Charges,9983,1,5000,FALSE\n"; 
    const sampleRow3 = "INV-002,2023-10-26,Global Inc,Other,USD,83.5,Consulting,9983,10,100,TRUE";
    
    const blob = new Blob([headers + sampleRow1 + sampleRow2 + sampleRow3], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Invoice_Import_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInvoiceFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      addToast("Reading file...", "info");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const clientCache = new Map();
      clients.forEach(c => {
          if (c.name) clientCache.set(c.name.toLowerCase(), c);
      });

      const parseDate = (dateStr) => {
         try {
             if (!dateStr) return new Date().toISOString().split('T')[0];
             if (typeof dateStr === 'number') {
                return new Date(Math.round((dateStr - 25569) * 864e5)).toISOString().split('T')[0];
             }
             if (typeof dateStr === 'string') {
                 const cleanStr = dateStr.trim();
                 const numericDate = Number(cleanStr);
                 if (!isNaN(numericDate) && numericDate > 25569) {
                     return new Date(Math.round((numericDate - 25569) * 864e5)).toISOString().split('T')[0];
                 }
                 const parts = cleanStr.split(/[-/.]/);
                 if (parts.length === 3) {
                     let day = parts[0].padStart(2, '0');
                     let month = parts[1].padStart(2, '0');
                     let year = parts[2];
                     if (year.length === 2) year = '20' + year; 
                     if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
                     return `${year}-${month}-${day}`;
                 }
             }
             return new Date(dateStr).toISOString().split('T')[0];
         } catch (e) {
             return new Date().toISOString().split('T')[0];
         }
      };

      const invoicesMap = new Map();

      for (const row of jsonData) {
        const getVal = (key) => {
             const val = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
             return val !== undefined && val !== null ? String(val).trim() : '';
        };

        const invNo = getVal('Invoice No');
        if (!invNo) continue;

        const item = {
            desc: getVal('Item Desc'),
            hsn: getVal('Item HSN'),
            qty: parseFloat(getVal('Item Qty')) || 1,
            price: parseFloat(getVal('Item Price')) || 0
        };

        if (invoicesMap.has(invNo)) {
            invoicesMap.get(invNo).items.push(item);
        } else {
            const clientName = getVal('Client Name');
            const clientState = getVal('Client State') || 'Maharashtra'; 
            
            let matchedClient = null;
            if (clientName) {
                matchedClient = clientCache.get(clientName.toLowerCase());
                if (!matchedClient) {
                    const newClientId = `C-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    matchedClient = {
                        id: newClientId,
                        name: clientName,
                        state: clientState,
                        address: 'Imported Address',
                        city: 'Imported City',
                        country: clientState === 'Other' ? 'Foreign' : 'India',
                        contacts: []
                    };
                    try {
                        await fetch('http://localhost:5000/api/clients', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(matchedClient)
                        });
                        clientCache.set(clientName.toLowerCase(), matchedClient);
                    } catch (err) { console.error(err); }
                }
            }

            invoicesMap.set(invNo, {
                id: invNo,
                invoiceNo: invNo,
                client: matchedClient || { name: 'Unknown', state: clientState },
                csvClientState: clientState, 
                date: parseDate(getVal('Date')),
                currency: getVal('Currency') || 'INR',
                exchangeRate: parseFloat(getVal('Exchange Rate')) || 1,
                isLut: String(getVal('Is LUT')).toUpperCase() === 'TRUE',
                items: [item],
                status: 'Pending',
                type: 'Intrastate'
            });
        }
      }

      const newInvoiceIds = Array.from(invoicesMap.keys());
      const existingIds = new Set(invoices.map(inv => inv.id));
      const duplicates = newInvoiceIds.filter(id => existingIds.has(id));

      let shouldOverwrite = false;
      if (duplicates.length > 0) {
          shouldOverwrite = window.confirm(`Found ${duplicates.length} duplicate Invoices. Overwrite them?`);
          if (!shouldOverwrite) {
              duplicates.forEach(id => invoicesMap.delete(id));
              if (invoicesMap.size === 0) {
                  addToast("Import cancelled.", "info");
                  e.target.value = null;
                  return;
              }
          }
      }

      let successCount = 0;
      addToast(`Importing ${invoicesMap.size} invoices...`, "info");

      for (const inv of invoicesMap.values()) {
         if (shouldOverwrite && existingIds.has(inv.id)) {
             try { await fetch(`http://localhost:5000/api/invoices/${inv.id}`, { method: 'DELETE' }); } catch (e) {}
         }

         const subtotal = inv.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
         const stateToCheck = inv.csvClientState || inv.client.state;
         const isExport = stateToCheck === 'Other';
         const isInterstate = stateToCheck !== userSettings.state;
         
         let tax = 0;
         if (isExport) {
             if (!inv.isLut) tax = subtotal * 0.18; 
         } else if (isInterstate) {
             tax = subtotal * 0.18;
         } else {
             tax = subtotal * 0.18;
         }

         const payload = {
            ...inv,
            amount: subtotal + tax,
            tax: tax,
            type: isExport ? (inv.isLut ? 'Export (LUT)' : 'Export') : (isInterstate ? 'Interstate' : 'Intrastate'),
         };

         try {
             const res = await fetch('http://localhost:5000/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
             });
             if (res.ok) successCount++;
         } catch (e) { console.error(e); }
      }

      addToast(`Successfully imported ${successCount} invoices!`, "success");
      loadData(); 

    } catch (err) {
      console.error(err);
      addToast("Error processing file.", "error");
    }
    e.target.value = null;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Tax Filing', icon: PieChart },
  ];

  const TableHeader = ({ label, sortKey, className = "" }) => (
    <th 
      className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${className.includes('right') ? 'justify-end' : ''}`}>
        {label}
        <div className="flex flex-col text-slate-400">
           {sortConfig.key === sortKey && sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#3194A0]" /> : <ChevronUp size={14} className="opacity-30"/>}
           {sortConfig.key === sortKey && sortConfig.direction === 'desc' ? <ChevronDown size={14} className="text-[#3194A0]" /> : <ChevronDown size={14} className="opacity-30"/>}
        </div>
      </div>
    </th>
  );

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 font-sans text-slate-900 dark:text-slate-100 flex overflow-hidden`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <DeleteModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteInvoice} title="Delete Invoice" message="Are you sure?" />
      {paymentModalOpen && currentPaymentInvoice && (
        <PaymentModal invoice={currentPaymentInvoice} onClose={() => setPaymentModalOpen(false)} onConfirm={(rate) => { updateInvoiceStatus(currentPaymentInvoice.id, 'Paid', rate); setPaymentModalOpen(false); }} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
           <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#3194A0] to-cyan-400 flex items-center justify-center text-white font-bold mr-3">I</div>
           <span className="font-bold text-lg tracking-tight">Invoicer<span className="text-[#3194A0]">Ind</span></span>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (item.id === 'create_invoice') setEditingInvoice(null); }} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === item.id ? 'bg-[#3194A0]/10 text-[#3194A0]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              <item.icon size={18} className="mr-3" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center w-full px-4 py-2 text-sm transition-colors rounded-lg ${activeTab === 'settings' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
            <Settings size={18} className="mr-3" /> Settings
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8">
           <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300"><Menu size={20} /></button>
           <div className="flex-1 px-4 lg:px-8 max-w-xl">
             <div className="relative">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search invoices, clients..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-transparent focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-[#3194A0] focus:outline-none transition-all"
               />
             </div>
           </div>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8 relative">
           {activeTab === 'dashboard' && <Dashboard invoices={invoices} expenses={expenses} onNewInvoice={() => { setEditingInvoice(null); setActiveTab('create_invoice'); }} onNewExpense={() => setActiveTab('expenses')} />}
           
           {activeTab === 'create_invoice' && (
             <CreateInvoice 
               onSave={handleSaveInvoice} 
               onCancel={() => { setActiveTab('dashboard'); setEditingInvoice(null); }}
               userSettings={userSettings}
               clients={clients}
               editingInvoice={editingInvoice}
             />
           )}

           {activeTab === 'reports' && <Reports invoices={invoices} expenses={expenses} userSettings={userSettings} addToast={addToast} />}
           {activeTab === 'expenses' && <Expenses addToast={addToast} />}
           
           {activeTab === 'clients' && <ClientManager addToast={addToast} searchQuery={searchQuery} />}
           {activeTab === 'settings' && <SettingsPage settings={userSettings} onSave={handleSaveSettings} addToast={addToast} />}

           {activeTab === 'invoices' && (
             <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold dark:text-white">All Invoices</h2>
                 <div className="flex gap-2">
                    <button onClick={handleDownloadInvoiceTemplate} className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                       <Download size={16} className="mr-1.5 text-blue-600"/> Template
                    </button>
                    <label className="flex items-center cursor-pointer px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                       <FileSpreadsheet size={16} className="mr-1.5 text-emerald-600"/> Import
                       <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleInvoiceFileUpload} />
                    </label>
                    <Button onClick={() => { setEditingInvoice(null); setActiveTab('create_invoice'); }} icon={Plus}>Create New</Button>
                 </div>
               </div>
               <Card className="overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400">
                       <tr>
                         <TableHeader label="Invoice ID" sortKey="id" />
                         <TableHeader label="Client" sortKey="client" />
                         <TableHeader label="Date" sortKey="date" />
                         <TableHeader label="Amount" sortKey="amount" className="text-right justify-end" />
                         <TableHeader label="Status" sortKey="status" />
                         <th className="px-6 py-4 text-center">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {processedInvoices.map((inv) => (
                         <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                           <td className="px-6 py-4 font-medium">{inv.id}</td>
                           <td className="px-6 py-4">{inv.client?.name || 'Unknown'}</td>
                           <td className="px-6 py-4">{inv.date ? inv.date.split('T')[0] : ''}</td>
                           <td className="px-6 py-4 font-medium text-right">{inv.currency} {parseFloat(inv.amount).toLocaleString()}</td>
                           <td className="px-6 py-4"><Badge type={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                           <td className="px-6 py-4 flex justify-center gap-2">
                              {inv.status !== 'Paid' && <button onClick={() => handleMarkAsPaid(inv)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle size={18} /></button>}
                              <button onClick={() => generateInvoicePDF(inv, userSettings, addToast)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Printer size={18} /></button>
                              <button onClick={() => { setEditingInvoice(inv); setActiveTab('create_invoice'); }} className="p-1 text-slate-600 hover:bg-slate-200 rounded"><Edit size={18} /></button>
                              <button onClick={() => { setInvoiceToDelete(inv.id); setDeleteModalOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                           </td>
                         </tr>
                       ))}
                       {processedInvoices.length === 0 && (
                          <tr><td colSpan="6" className="text-center py-6 text-slate-500">No invoices found matching "{searchQuery}"</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </Card>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}