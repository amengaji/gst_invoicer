import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Plus, Copy, Edit, Trash2, MapPin, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import { STATES, INITIAL_CLIENT_STATE } from '../../lib/constants';
import { API_URL } from '../../config/api';
import SearchSelect from "../ui/SearchSelect";
import { COUNTRY_LIST } from "../../lib/countries";


const ClientManager = ({ addToast, searchQuery, onUpdate }) => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newClient, setNewClient] = useState(INITIAL_CLIENT_STATE);
  

  // GSTIN first two digits → Indian State mapping
  const GST_STATE_MAP = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar",
    "36": "Telangana",
    "37": "Andhra Pradesh"
  };




  

  // Convert stored DB value to display label
  const getStateLabel = (state) => {
    if (!state) return "";
    const lower = state.toString().toLowerCase().trim();

    // Database stores "Other" for Foreign (Export)
    if (lower === "other") return "Foreign (Export)";

    // For Indian states just return as it is
    return state;
  };


  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // --- AUTH HEADERS ---
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // --- FETCH CLIENTS ---
  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error("Failed to fetch clients");

      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error("Failed to fetch clients", error);
      addToast("Failed to load clients", "error");
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  // --- SAVE OR UPDATE CLIENT ---
  const handleSave = async () => {
    if (!newClient.name) return;

    try {
      const url = editingId
        ? `${API_URL}/clients/${editingId}`
        : `${API_URL}/clients`;

      const method = editingId ? 'PUT' : 'POST';

      const payload = { ...newClient, id: editingId || `C-${Date.now()}` };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save client");

      addToast(editingId ? "Client updated!" : "Client added!", "success");
      fetchClients();
      if (onUpdate) onUpdate();
      handleCancel();

    } catch (error) {
      console.error(error);
      addToast("Error saving client.", "error");
    }
  };

  // --- DELETE CLIENT ---
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error("Failed to delete");

      addToast("Client deleted", "info");
      fetchClients();
      if (onUpdate) onUpdate();

    } catch (error) {
      addToast("Error deleting client", "error");
    }
  };

  const handleEdit = (client) => {
    setNewClient(JSON.parse(JSON.stringify(client)));
    setEditingId(client.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (client) => {
    const duplicated = JSON.parse(JSON.stringify(client));
    duplicated.name = `${duplicated.name} (Copy)`;
    delete duplicated.id;
    setNewClient(duplicated);
    setEditingId(null);
    setIsAdding(true);
    addToast("Client duplicated.", "info");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewClient(INITIAL_CLIENT_STATE);
  };

  // --- DOWNLOAD CSV TEMPLATE ---
  const handleDownloadTemplate = () => {
    const headers = "Name,GSTIN,Address,City,State,Country,Contact Name,Email,Phone\n";
    const sample = "Acme Corp,27ABCDE1234F1Z5,123 Industrial Estate,Mumbai,Maharashtra,India,John Doe;jane,john@acme.com;jane@acme.com,9876543210;9876543211";

    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "Client_Import_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- IMPORT CLIENTS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      addToast("Reading file...", "info");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;

      for (const row of jsonData) {
        const getVal = (key) => {
          const val = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
          return val ? String(val).trim() : '';
        };

        const name = getVal('Name') || getVal('Company Name');
        if (!name) continue;

        const toArray = (str) => str.split(';').map(s => s.trim()).filter(s => s);

        const contactNames = toArray(getVal('Contact Name'));
        const emails = toArray(getVal('Email'));
        const phones = toArray(getVal('Phone'));

        const contacts = contactNames.map((n, i) => ({
          name: n,
          email: emails[i] || '',
          phone: phones[i] || ''
        }));

        if (contacts.length === 0) contacts.push({ name: '', email: '', phone: '' });

        const payload = {
          id: `C-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name,
          gstin: getVal('GSTIN'),
          address: getVal('Address'),
          city: getVal('City'),
          state: getVal('State') || 'Maharashtra',
          country: getVal('Country') || 'India',
          contacts
        };

        const res = await fetch(`${API_URL}/clients`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) successCount++;
      }

      addToast(`Imported ${successCount} clients successfully!`, "success");
      fetchClients();
      if (onUpdate) onUpdate();

    } catch (err) {
      console.error("Import error:", err);
      addToast("Error importing file.", "error");
    }

    e.target.value = null;
  };

  // --- CONTACT HELPERS ---
  const updateContact = (index, field, value) => {
    const updated = [...(newClient.contacts || [])];
    updated[index] = { ...updated[index], [field]: value };
    setNewClient(prev => ({ ...prev, contacts: updated }));
  };

  const addContact = () => {
    setNewClient(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { name: '', email: '', phone: '' }]
    }));
  };

  const removeContact = (idx) => {
    setNewClient(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx)
    }));
  };

  // --- FILTERING ---
  const filteredClients = clients.filter(c =>
    !searchQuery ||
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading)
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /> Loading Clients...</div>;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold dark:text-white">Client Management</h2>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700">
            Total: {filteredClients.length}
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
            <Download size={18} className="mr-2 text-blue-600" /> Template
          </button>

          <label className="flex items-center cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
            <FileSpreadsheet size={18} className="mr-2 text-emerald-600" /> Import
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </label>

          <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewClient(INITIAL_CLIENT_STATE); }} icon={Plus}>Add Client</Button>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {isAdding && (
        <Card className="p-6 mb-6 border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            {editingId ? "Edit Client Details" : "New Client Details"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input label="Company Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
            <Input 
              label="GSTIN/Tax ID" 
              value={newClient.gstin} 
              disabled={newClient.state === "Other" }  // Disable if Foreign
              onChange={e => {
                const gst = e.target.value.toUpperCase();
                const code = gst.substring(0, 2);

                let autoState = newClient.state;
                let autoCountry = newClient.country;

                // Auto-fill state and country if GSTIN state code matches
                if (GST_STATE_MAP[code]) {
                  autoState = GST_STATE_MAP[code];
                  autoCountry = "India";
                }
                setNewClient({ 
                  ...newClient, 
                  gstin: gst,
                  state: autoState,
                  country: autoCountry 
                })
              }} />



              {/* Address Fields*/}
            <div className="col-span-2">
              <Input label="Address Line 1" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
            </div>

            <Input label="City" value={newClient.city} onChange={e => setNewClient({ ...newClient, city: e.target.value })} />
            <Select 
              label="State" 
              value={newClient.state} 
              onChange={e => {
                const stateValue = e.target.value;
                
                setNewClient({
                  ...newClient, 
                  state: stateValue,
                  country: stateValue === "Other" ? "" : "India" 
                });
              }} 
              options={[
                { label: "Select State", value: "" },
                ...STATES.map(s => ({ label: s, value: s })), 
                { label: "Foreign (Export)", value: "Other" }
              ]} 
              />
            
            <SearchSelect label="Country" value={newClient.country} isSearchable={true} options={COUNTRY_LIST.map(c => ({label:c, value:c }))} onChange={e => setNewClient({ ...newClient, country: e.target.value })} />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Point of Contact</label>
              <Button variant="ghost" onClick={addContact} icon={Plus} className="h-8 text-xs">Add PIC</Button>
            </div>

            <div className="space-y-3">
              {(newClient.contacts || []).map((c, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input placeholder="Name" value={c.name} onChange={e => updateContact(idx, 'name', e.target.value)} className="flex-1" />
                  <Input placeholder="Email" value={c.email} onChange={e => updateContact(idx, 'email', e.target.value)} className="flex-1" />
                  <Input placeholder="Phone" value={c.phone} onChange={e => updateContact(idx, 'phone', e.target.value)} className="flex-1" />

                  {(newClient.contacts || []).length > 1 && (
                    <button onClick={() => removeContact(idx)} className="mt-2 text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSave}>{editingId ? "Update Client" : "Save Client"}</Button>
            <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* CLIENT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(client => (
          <Card key={client.id} className="p-5 flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {(client.name || '??').substring(0, 2).toUpperCase()}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleDuplicate(client)} className="text-slate-400 hover:text-emerald-500"><Copy size={16} /></button>
                  <button onClick={() => handleEdit(client)} className="text-slate-400 hover:text-blue-500"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>

              <h4 className="font-bold mt-2 mb-1 truncate dark:text-white">{client.name}</h4>

              <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={14} className="mt-0.5" />
                <span>{client.city || "N/A"}, {getStateLabel(client.state)}, {client.country}</span>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                {client.contacts?.length || 0} Contact(s)
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge>{getStateLabel(client.state)}</Badge>
              {client.gstin && <Badge type="primary">{client.gstin}</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredClients.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default ClientManager;
