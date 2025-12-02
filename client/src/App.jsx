// client/src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Receipt, PieChart, Settings, Menu, Moon, Sun, Search, Users, 
  CheckCircle, Printer, Edit, Trash2, Download, Plus, FileSpreadsheet, ChevronUp, ChevronDown, LogOut, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx'; 
import { ToastContainer } from './components/ui/Toast';
import { DeleteModal, PaymentModal } from './components/ui/Modal';
import Badge from './components/ui/Badge';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import Select from './components/ui/Select'; 
import Pagination from './components/ui/Pagination';
import { formatDate } from './lib/utils'; 
import { formatNumber } from './lib/formatNumber';

// Auth
import Login from './components/auth/Login';

// Features
import Dashboard from './components/features/Dashboard';
import Expenses from './components/features/Expenses';
import Reports from './components/features/Reports';
import ClientManager from './components/features/ClientManager';
import CreateInvoice from './components/features/CreateInvoice';
import SettingsPage from './components/features/SettingsPage';
import InvoiceViewModal from './components/features/InvoiceViewModal';
import { generateInvoicePDF } from './lib/pdf-generator';

// Define API URL
const API_URL = 'http://localhost:5000';

// === SUPER ENHANCED RESIZABLE COLUMN HEADER ===
function ResizableTH({ label, sortKey, onSort, sortConfig, noSort, align }) {
  const STORAGE_KEY = `invoice_col_${label.replace(/\s+/g, "_").toLowerCase()}`;

  const thRef = React.useRef(null);
  const startX = React.useRef(null);
  const startWidth = React.useRef(null);

  // 1️⃣ Load saved width from localStorage
  const [width, setWidth] = React.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 150;
  });

  // 2️⃣ Save width to localStorage on change
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width);
  }, [width]);

  // 3️⃣ Handle drag start
  const handleMouseDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = thRef.current.offsetWidth;

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 4️⃣ Mouse move while dragging
  const handleMouseMove = (e) => {
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(80, startWidth.current + delta);
    setWidth(newWidth);
  };

  // 5️⃣ Mouse up: stop events + restore selection
  const handleMouseUp = () => {
    document.body.style.userSelect = "auto";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // 6️⃣ Auto-fit width on double click
  const handleDoubleClick = () => {
    if (!thRef.current) return;
    const contentWidth = thRef.current.scrollWidth + 24; // some padding
    const autoWidth = Math.max(120, contentWidth);
    setWidth(autoWidth);
  };

  return (
    <th
      ref={thRef}
      style={{ width, minWidth: width, maxWidth: width }}
      className={`relative px-6 py-4 select-none whitespace-nowrap ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : ""
      }`}
    >
      {/* Sortable Header */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => !noSort && onSort(sortKey)}
        onDoubleClick={handleDoubleClick}
      >
        {label}

        {!noSort && (
          <div className="flex flex-col text-slate-400">
            {sortConfig.key === sortKey && sortConfig.direction === "asc" ? (
              <ChevronUp size={14} className="text-[#3194A0]" />
            ) : (
              <ChevronUp size={14} className="opacity-20" />
            )}
            {sortConfig.key === sortKey && sortConfig.direction === "desc" ? (
              <ChevronDown size={14} className="text-[#3194A0]" />
            ) : (
              <ChevronDown size={14} className="opacity-20" />
            )}
          </div>
        )}
      </div>

      {/* Resize Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-slate-400/30"
      />
    </th>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [token, setToken] = useState(localStorage.getItem('token'));

  // --- Logout ---
  const handleLogout = () => {
      localStorage.removeItem('token');
      setToken(null);
      window.location.reload();
  };

  // --- API HELPER ---
  const apiFetch = async (url, options = {}) => {
      const headers = {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      };
      const response = await fetch(url, { ...options, headers });
      
      // If server returns 400/404/500/409, throw an error!
      if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server Error (${response.status}): ${text}`);
      }
      
      return response;
  };

  // --- Render Login if needed ---
  if (!token) {
      return <Login onLogin={(t) => { 
        localStorage.setItem('token', t); setToken(t); 
        //Force a full reload to reset state and ensure clean state and data loading
        window.location.reload();
      }} />;
  }
  
  // --- Dark Mode Persistence ---
  const [darkMode, setDarkMode] = useState(() => {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
  });

  // Effect to apply class AND save to LocalStorage
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);


  // --- Filtering State ---
  const [selectedFY, setSelectedFY] = useState(''); 
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // --- Global Data State ---
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  
  // --- Live Rates State ---
  const [exchangeRates, setExchangeRates] = useState(null);

  // --- View Modal State ---
  const [viewingInvoice, setViewingInvoice] = useState(null);
  
  const [userSettings, setUserSettings] = useState({
     companyName: 'Elementree',
     email: 'accounts@elementree.co.in',
     gstin: '',
     address: '',
     state: 'Maharashtra',
     invoicePrefix: 'ET/INV/',
     currency: 'USD',
     filingFrequency: 'Quaterly',
     bank_accounts: [],
     number_format: 'en-IN'
  });

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Modals & Toasts ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentPaymentInvoice, setCurrentPaymentInvoice] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // --- Helper: Calculate Fiscal Year ---
  const getFiscalYear = (dateStr) => {
      if (!dateStr) return 'Unknown';
      const date = new Date(dateStr);
      const month = date.getMonth() + 1; 
      const year = date.getFullYear();
      if (month < 4) return `FY ${year - 1}-${String(year).slice(-2)}`;
      return `FY ${year}-${String(year + 1).slice(-2)}`;
  };

  // --- API: Load Data ---
  const loadData = async () => {
    if (!token) return; 
    try {
        // Fetch App Data
        const [invRes, expRes, cliRes, setRes] = await Promise.all([
            apiFetch(`${API_URL}/api/invoices`),
            apiFetch(`${API_URL}/api/expenses`),
            apiFetch(`${API_URL}/api/clients`),
            apiFetch(`${API_URL}/api/settings`)
        ]);
        
        // Fetch Live Rates (Silent fail if error)
        try {
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
          const rateData = await rateRes.json();
          setExchangeRates(rateData.rates);
        } catch (e) {
          console.warn("Could not fetch live rates");
        }

        const invData = await invRes.json();
        setInvoices(Array.isArray(invData) ? invData : []);

        const expData = await expRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);

        const cliData = await cliRes.json();
        setClients(Array.isArray(cliData) ? cliData : []);
        
        if (!selectedFY) setSelectedFY("All Time");

        const dbSettings = await setRes.json();
        
        if (dbSettings && dbSettings.id) {
            setUserSettings(prev => ({
                ...prev,
                companyName: dbSettings.company_name || prev.companyName,
                email: dbSettings.email || prev.email,
                gstin: dbSettings.gstin || prev.gstin,
                address: dbSettings.address || prev.address,
                state: dbSettings.state || prev.state,
                invoicePrefix: dbSettings.invoice_prefix || prev.invoicePrefix,
                currency: dbSettings.currency || prev.currency,
                filingFrequency: dbSettings.filing_frequency || prev.filingFrequency,
                logo: dbSettings.logo || prev.logo,
                lutNumber: dbSettings.lut_number || prev.lutNumber,
                number_format: dbSettings.number_format || prev.number_format,
                bank_accounts: typeof dbSettings.bank_accounts === 'string' 
                    ? JSON.parse(dbSettings.bank_accounts) 
                    : (dbSettings.bank_accounts || [])
            }));
        } else {
             setUserSettings(prev => ({ ...prev }));
        }
    } catch (e) {
        console.error("Failed to load data", e);
        addToast("Error connecting to server", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFY]);

  // --- Handlers ---
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleSaveInvoice = async (newInvoice) => {
    try {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const isUpdate = safeInvoices.some(inv => inv.id === newInvoice.id);
        
        const url = isUpdate 
            ? `${API_URL}/api/invoices/${encodeURIComponent(newInvoice.id)}`
            : `${API_URL}/api/invoices`;
        const method = isUpdate ? 'PUT' : 'POST';

        const res = await apiFetch(url, { method: method, body: JSON.stringify(newInvoice) });
        if(!res.ok) { const err = await res.json(); throw new Error(err.error || "Save failed"); }
        
        addToast(isUpdate ? "Invoice updated!" : "Invoice created!", "success");
        setEditingInvoice(null);
        setActiveTab(tab => {
          const finalTab = typeof tab === "string" ? tab : tab; 
          localStorage.setItem("activeTab", finalTab);
          return finalTab;
        });

        loadData(); 
    } catch (e) { addToast(`Error: ${e.message}`, "error"); }
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
        await apiFetch(`${API_URL}/api/invoices/${encodeURIComponent(id)}/status`, { 
            method: 'PUT', 
            body: JSON.stringify({ status, exchangeRate: rate }) 
        });
        addToast("Invoice updated", "success"); 
        loadData();
    } catch (e) { addToast("Update failed", "error"); }
  };


  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
        await apiFetch(`${API_URL}/api/invoices/${encodeURIComponent(invoiceToDelete)}`, { method: 'DELETE' });
        addToast("Invoice deleted", "success");
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
        loadData();
    } catch (e) { 
        addToast(`Delete failed: ${e.message}`, "error"); 
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
              bank_accounts: newSettings.bank_accounts,
              number_format: newSettings.number_format
          };

          await apiFetch(`${API_URL}/api/settings`, {
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

  // --- Sorting & Filtering ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const availableFiscalYears = useMemo(() => {
      const safeInvoices = Array.isArray(invoices) ? invoices : [];
      const years = new Set();
      years.add("All Time"); 
      years.add(getFiscalYear(new Date()));
      safeInvoices.forEach(inv => {
          if(inv.date) years.add(getFiscalYear(inv.date));
      });
      return Array.from(years).sort().reverse();
  }, [invoices]);

  const processedInvoices = useMemo(() => {
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    let data = safeInvoices.filter(inv => 
      !searchQuery || 
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedFY && selectedFY !== "All Time") {
        data = data.filter(inv => getFiscalYear(inv.date) === selectedFY);
    }

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
  }, [invoices, searchQuery, sortConfig, selectedFY]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedInvoices, currentPage]);

  // --- Invoice Import ---
  const handleDownloadInvoiceTemplate = () => {
    const headers = "Invoice No,Date,Client Name,Client State,Currency,Exchange Rate,Item Desc,Item HSN,Item Qty,Item Price,Is LUT\n";
    const sampleRow1 = "INV-001,01-04-2025,Acme Corp,Maharashtra,INR,1,Web Dev Services,9983,1,50000,FALSE\n";
    const blob = new Blob([headers + sampleRow1], { type: 'text/csv' });
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

    const allowOverwrite = window.confirm(
      "If duplicate Invoice IDs are found, do you want to OVERWRITE them?\n\nClick OK to Overwrite.\nClick Cancel to Skip duplicates."
    );

    try {
      addToast("Processing...", "info");

      // 1. Read Excel File
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        cellDates: false,
      });

      // Safe Value Getter
      const getVal = (row, key) => {
        const val =
          row[key] ??
          row[key?.toLowerCase()] ??
          row[key?.toUpperCase()] ??
          row[key?.replace(/\s+/g, "")] ??
          "";

        return val !== undefined && val !== null ? String(val).trim() : "";
      };

      // 2. CLIENT CACHE
      const clientCache = new Map();
      if (Array.isArray(clients)) {
        clients.forEach((c) => {
          if (c.name) clientCache.set(c.name.toLowerCase(), c);
        });
      }

      // 3. AUTO-CREATE CLIENTS
      const uniqueNewClients = new Map();

      for (const row of jsonData) {
        const name = getVal(row, "Client Name");
        const rawContact =
          getVal(row, "Contact Name") ||
          getVal(row, "Contact") ||
          getVal(row, "Person");

        if (name && !clientCache.has(name.toLowerCase())) {
          if (!uniqueNewClients.has(name.toLowerCase())) {
            const cNames = rawContact.split(";");
            const cEmails = (getVal(row, "Email") || "").split(";");
            const cPhones = (getVal(row, "Phone") || "").split(";");

            const contacts = cNames
              .map((cn, i) => ({
                name: cn.trim(),
                email: (cEmails[i] || "").trim(),
                phone: (cPhones[i] || "").trim(),
              }))
              .filter((c) => c.name);

            if (contacts.length === 0)
              contacts.push({ name: "", email: "", phone: "" });

            const newClient = {
              id: `C-AUTO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              name,
              state: getVal(row, "Client State") || "Maharashtra",
              address: "Imported Address",
              city: "Imported City",
              country: "India",
              contacts,
            };

            uniqueNewClients.set(name.toLowerCase(), newClient);
          }
        }
      }

      // Save newly-created clients
      for (const client of uniqueNewClients.values()) {
        try {
          await apiFetch(`${API_URL}/api/clients`, {
            method: "POST",
            body: JSON.stringify(client),
          });
          clientCache.set(client.name.toLowerCase(), client);
        } catch (e) {
          console.error("Client create error", e);
        }
      }

      // 4. GROUP INVOICES
      const invoicesMap = new Map();

      for (const row of jsonData) {
        const invNo = getVal(row, "Invoice No");
        if (!invNo) continue;

        const item = {
          desc: getVal(row, "Item Desc"),
          hsn: getVal(row, "Item HSN"),
          qty: parseFloat(getVal(row, "Item Qty")) || 1,
          price: parseFloat(getVal(row, "Item Price")) || 0,
        };

        if (invoicesMap.has(invNo)) {
          invoicesMap.get(invNo).items.push(item);
        } else {
          const clientName = getVal(row, "Client Name");
          const matchedClient =
            clientCache.get(clientName.toLowerCase()) || {
              name: "Unknown",
              state: "Maharashtra",
            };

          const csvState = getVal(row, "Client State");
          const finalState = csvState || matchedClient.state;

          const rawRoe = getVal(row, "Exchange Rate");
          const exchangeRate = parseFloat(rawRoe);
          const isPaid = rawRoe !== "" && !isNaN(exchangeRate) && exchangeRate > 0;

          // DATE HANDLING (Priority: DD-MM-YYYY)
          const rawDate = getVal(row, "Date");
          let finalDate = rawDate;
          
          // Regex for DD-MM-YYYY or DD/MM/YYYY
          const ddmmyyyy = String(rawDate).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (ddmmyyyy) {
             const [_, d, m, y] = ddmmyyyy;
             finalDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
          }

          invoicesMap.set(invNo, {
            id: invNo,
            invoiceNo: invNo,
            client: matchedClient,
            csvClientState: finalState,
            date: finalDate, // Send string directly
            currency: getVal(row, "Currency") || "INR",
            exchangeRate: exchangeRate || 1,
            isLut: String(getVal(row, "Is LUT")).toUpperCase() === "TRUE",
            items: [item],
            status: isPaid ? "Paid" : "Pending",
            type: "Intrastate",
          });
        }
      }

      // 5. SEND INVOICES
      let successCount = 0;

      for (const inv of invoicesMap.values()) {
        const subtotal = inv.items.reduce(
          (sum, item) => sum + item.qty * item.price,
          0
        );

        const stateToCheck = inv.csvClientState || inv.client.state;
        const isExport = stateToCheck === "Other";
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
          id: inv.id,
          client: inv.client,
          date: inv.date,
          amount: subtotal + tax,
          tax,
          status: inv.status,
          type: isExport
            ? inv.isLut
              ? "Export (LUT)"
              : "Export"
            : isInterstate
            ? "Interstate"
            : "Intrastate",
          currency: inv.currency,
          exchangeRate: inv.exchangeRate,
          items: inv.items,
        };

        try {
          const res = await apiFetch(`${API_URL}/api/invoices`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

          if (res.status === 409 || res.status === 500) {
            if (allowOverwrite) {
              const updateRes = await apiFetch(
                `${API_URL}/api/invoices/${encodeURIComponent(inv.id)}`,
                {
                  method: "PUT",
                  body: JSON.stringify(payload),
                }
              );
              if (updateRes.ok) successCount++;
            }
          } else if (res.ok) {
            successCount++;
          }
        } catch (err) {
          console.error(err);
        }
      }

      addToast(`Imported ${successCount} invoices successfully!`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      addToast("Error processing file.", "error");
    }

    // Reset file input
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
  
  // --- Calculation for Stats ---
  const calculateTotalPendingINR = () => {
    return invoices.filter(i => i.status !== 'Paid').reduce((acc, inv) => {
        const amount = parseFloat(inv.amount) || 0;
        const curr = inv.currency || 'INR';

        if (curr === 'INR') {
            return acc + amount;
        } 
        
        // If we have live rates, use them!
        if (exchangeRates) {
            const rateToUSD = exchangeRates[curr];
            const rateINR = exchangeRates['INR'];
            if (rateToUSD && rateINR) {
                return acc + (amount / rateToUSD * rateINR);
            }
        }
        
        // Fallback to stored rate (which might be 1)
        return acc + (amount * (parseFloat(inv.exchange_rate) || 1));
    }, 0);
  };


  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 font-sans text-slate-900 dark:text-slate-100 flex overflow-hidden`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <DeleteModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteInvoice} title="Delete Invoice" message="Are you sure?" />
      {paymentModalOpen && currentPaymentInvoice && (
        <PaymentModal invoice={currentPaymentInvoice} onClose={() => setPaymentModalOpen(false)} onConfirm={(rate) => { updateInvoiceStatus(currentPaymentInvoice.id, 'Paid', rate); setPaymentModalOpen(false); }} />
      )}

      {/* --- VIEW MODAL --- */}
      {viewingInvoice && (
        <InvoiceViewModal 
          invoice={viewingInvoice}
          userSettings={userSettings}
          onClose={() => setViewingInvoice(null)}
          onEdit={(inv) => { setViewingInvoice(null); setEditingInvoice(inv); 
            setActiveTab(tab => {
              const finalTab = typeof tab === "string" ? tab : tab; 
              localStorage.setItem("activeTab", finalTab);
              return finalTab;
            });
            }}
          addToast={addToast}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
           {/* Dynamic Logo Logic */}
           {userSettings.logo ? (
               <img 
                 src={userSettings.logo} 
                 alt="App Logo" 
                 className="h-8 w-8 rounded object-cover mr-3" 
               />
           ) : (
               <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#3194A0] to-cyan-400 flex items-center justify-center text-white font-bold mr-3">E</div>
           )}
           
           <span className="font-bold text-lg tracking-tight">
               {userSettings.companyName || "Elementree"}
               <span className="text-[#3194A0]"> Invoice</span>
           </span>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} 
                onClick={() => {
                  localStorage.setItem("activeTab", item.id);
                  setActiveTab(item.id);
                  if (item.id === 'create_invoice') setEditingInvoice(null);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === item.id ? 'bg-[#3194A0]/10 text-[#3194A0]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              <item.icon size={18} className="mr-3" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center w-full px-4 py-2 text-sm transition-colors rounded-lg ${activeTab === 'settings' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
            <Settings size={18} className="mr-3" /> Settings
          </button>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 mt-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-700 rounded-lg transition-colors">
            <LogOut size={18} className="mr-3" /> 
            Logout
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
           {/* CRITICAL: Passing settings prop to Dashboard */}
           {activeTab === 'dashboard' && <Dashboard invoices={invoices} expenses={expenses} onNewInvoice={() => { setEditingInvoice(null); setActiveTab('create_invoice'); }} onNewExpense={() => setActiveTab('expenses')} settings={userSettings} />}
           
           {activeTab === 'create_invoice' && (
             <CreateInvoice 
               onSave={handleSaveInvoice} 
               onCancel={() => { setActiveTab('invoices'); setEditingInvoice(null); }}
               userSettings={userSettings}
               clients={clients}
               editingInvoice={editingInvoice}
             />
           )}

           {activeTab === 'reports' && <Reports invoices={invoices} expenses={expenses} userSettings={userSettings} addToast={addToast} />}
           {activeTab === 'expenses' && <Expenses addToast={addToast} />}
           
           {activeTab === 'clients' && <ClientManager addToast={addToast} searchQuery={searchQuery} onUpdate={loadData} />}
           {activeTab === 'settings' && <SettingsPage settings={userSettings} onSave={handleSaveSettings} addToast={addToast} />}

          {activeTab === 'invoices' && (
             <div className="space-y-6">
               
               {/* --- NEW: Invoice Stats Cards --- */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
                      <div className="p-3 bg-blue-50 rounded-full text-blue-600"><FileText size={24} /></div>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Total Invoices</p>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{invoices.length}</h3>
                      </div>
                  </Card>
                  
                  {/* TOTAL VALUE (BOOKED) */}
                  {/* TOTAL VALUE (PROJECTED) */}
                  <Card className="p-4 flex items-center gap-4 border-l-4 border-l-indigo-500">
                      <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><Receipt size={24} /></div>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Total Value (Projected)</p>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                          {/* NEW LOGIC: Paid Actuals + Pending Live Rates */}
                          ₹{formatNumber(
                                  // 1. Calculate Paid Total (Actuals)
                                  invoices.filter(i => i.status === 'Paid')
                                      .reduce((acc, inv) => acc + (parseFloat(inv.amount) * (parseFloat(inv.exchange_rate) || 1)), 0) 
                                  + 
                                  // 2. Add Pending Total (Using Live Rates function we created)
                                  calculateTotalPendingINR(),
                                  
                                  userSettings.number_format
                              )}
                          </h3>
                      </div>
                  </Card>
                  
                  {/* RECEIVED (REALIZED) */}
                  <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
                      <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle size={24} /></div>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Received (INR)</p>
                          <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{formatNumber(
                                invoices.filter(i => i.status === 'Paid')
                                    .reduce((acc, inv) => acc + (parseFloat(inv.amount) * (parseFloat(inv.exchange_rate) || 1)), 0),
                                userSettings.number_format
                            )}
                          </h3>
                      </div>
                  </Card>
                  
                  {/* PENDING (LIVE RATES) */}
                  <Card className="p-4 flex items-center gap-4 border-l-4 border-l-orange-500">
                      <div className="p-3 bg-orange-50 rounded-full text-orange-600"><PieChart size={24} /></div>
                      <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500 uppercase font-bold">Pending (INR)</p>
                            {!exchangeRates && <RefreshCw size={10} className="animate-spin text-slate-400"/>}
                          </div>
                          
                          <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">
                            {/* Uses Live Rates Calculation */}
                            ₹{formatNumber(calculateTotalPendingINR(), userSettings.number_format)}                            
                          </h3>
                      </div>
                  </Card>
               </div>

               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold dark:text-white">All Invoices</h2>
                 </div>
                 
                 <div className="flex gap-2">
                    <div className="w-40">
                        <Select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} options={availableFiscalYears.map(fy => ({ label: fy, value: fy }))} />
                    </div>
                    <button onClick={handleDownloadInvoiceTemplate} className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><Download size={16} className="mr-1.5 text-blue-600"/> Template</button>
                    <label className="flex items-center cursor-pointer px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><FileSpreadsheet size={16} className="mr-1.5 text-emerald-600"/> Import<input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleInvoiceFileUpload} /></label>
                    <Button onClick={() => { setEditingInvoice(null); setActiveTab('create_invoice'); }} icon={Plus}>Create New</Button>
                 </div>
               </div>
               
               <Card className="overflow-hidden">
                 <div className="overflow-hidden w-full">
                   <table className="w-full text-sm text-left table-auto">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400">
                       <tr>
                        {/*-- Resizable Table Headers --*/}
                        <ResizableTH label="ID" sortKey="id" onSort={handleSort} sortConfig={sortConfig} />
                        <ResizableTH label="Client" sortKey="client" onSort={handleSort} sortConfig={sortConfig} />
                        <ResizableTH label="Description" noSort={true} /> {/* New */}
                        <ResizableTH label="Date" sortKey="date" onSort={handleSort} sortConfig={sortConfig} />
                        <ResizableTH label="Amount" sortKey="amount" onSort={handleSort} sortConfig={sortConfig} align="right" />
                        <ResizableTH label="ROE" noSort={true} align="right" /> {/* New */}
                        <ResizableTH label="INR Amount" noSort ={true} align="right"  /> {/* New */}
                        <ResizableTH label="Status" sortKey="status" onSort={handleSort} sortConfig={sortConfig} />
                        <ResizableTH label="Date Paid" noSort={true}/> {/* New */}
                        <ResizableTH label="Actions" noSort={true} align="right" />
                       </tr>
                     </thead>
                     <tbody>
                       {paginatedInvoices.map((inv) => {
                         // Calculations for Row
                         const roe = parseFloat(inv.exchange_rate || inv.exchangeRate || 1);
                         const amount = parseFloat(inv.amount);
                         const inrAmount = amount * roe;
                         const desc = inv.items && inv.items.length > 0 ? inv.items[0].desc : 'No description';
                         
                         return (
                           <tr 
                              key={inv.id} 
                              className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                              onClick={() => setViewingInvoice(inv)}
                           >
                             <td className="px-6 py-4 font-medium">{inv.id}</td>
                             <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{inv.client?.name || 'Unknown'}</td>
                             <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={desc}>{desc}</td>
                             <td className="px-6 py-4 whitespace-nowrap">{formatDate(inv.date)}</td>
                             <td className="px-6 py-4 font-medium text-right whitespace-nowrap">{inv.currency} {formatNumber(amount, userSettings.number_format)}</td>
                             <td className="px-6 py-4 text-right text-slate-500">{roe.toFixed(2)}</td>
                             <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">₹ {formatNumber(inrAmount, userSettings.number_format)}</td>
                             <td className="px-6 py-4"><Badge type={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                             <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{inv.status === 'Paid' ? formatDate(inv.date) : '-'}</td>
                             <td className="px-6 py-4 flex justify-center gap-2">
                                {inv.status !== 'Paid' && <button onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(inv); }} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Mark Paid"><CheckCircle size={16} /></button>}
                                <button onClick={(e) => { e.stopPropagation(); generateInvoicePDF(inv, userSettings, addToast); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="PDF"><Printer size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingInvoice(inv); setActiveTab('create_invoice'); }} className="p-1 text-slate-600 hover:bg-slate-200 rounded" title="Edit"><Edit size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(inv.id); setDeleteModalOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                             </td>
                           </tr>
                         );
                       })}
                       {processedInvoices.length === 0 && (
                         <tr><td colSpan="10" className="text-center py-10 text-slate-500">No invoices found matching "{searchQuery}" in {selectedFY}</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
                 <Pagination 
                   currentPage={currentPage}
                   totalItems={processedInvoices.length}
                   pageSize={ITEMS_PER_PAGE}
                   onPageChange={setCurrentPage}
                 />
               </Card>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}