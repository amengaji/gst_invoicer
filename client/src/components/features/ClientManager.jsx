import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Plus, Copy, Edit, Trash2, MapPin, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { STATES, INITIAL_CLIENT_STATE } from '../../lib/constants';

const ClientManager = ({ addToast, searchQuery, onUpdate }) => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newClient, setNewClient] = useState(INITIAL_CLIENT_STATE);

  // --- API: Fetch Clients ---
  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/clients');
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      // Crash Prevention: Ensure data is an array
      if (Array.isArray(data)) {
          setClients(data);
      } else {
          setClients([]);
          console.error("API returned non-array for clients:", data);
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
      addToast("Failed to load clients", "error");
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // --- API: Save/Update ---
  const handleSave = async () => {
    if (!newClient.name) return;
    
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `http://localhost:5000/api/clients/${editingId}`
        : 'http://localhost:5000/api/clients';

      const payload = { ...newClient, id: editingId || `C-${Date.now()}` };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");

      addToast(editingId ? "Client updated!" : "Client added!", "success");
      fetchClients(); 
      if (onUpdate) onUpdate(); // Refresh Global State
      handleCancel();
    } catch (error) {
      console.error(error);
      addToast("Error saving client. Check backend logs.", "error");
    }
  };

  // --- API: Delete ---
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await fetch(`http://localhost:5000/api/clients/${id}`, { method: 'DELETE' });
      addToast("Client deleted", "info");
      fetchClients();
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast("Error deleting client", "error");
    }
  };

  const handleEdit = (client) => {
      // Deep copy to ensure nested contacts are editable
      setNewClient(JSON.parse(JSON.stringify(client)));
      setEditingId(client.id);
      setIsAdding(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleDuplicate = (client) => {
      const duplicated = JSON.parse(JSON.stringify(client));
      duplicated.name = `${duplicated.name} (Copy)`;
      delete duplicated.id;
      setNewClient(duplicated);
      setEditingId(null); 
      setIsAdding(true);
      addToast("Client duplicated.", "info");
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancel = () => {
      setIsAdding(false);
      setEditingId(null);
      setNewClient(INITIAL_CLIENT_STATE);
  }

  const handleDownloadTemplate = () => {
    const headers = "Name,GSTIN,Address,City,State,Country,Contact Name,Email,Phone\n";
    const sampleData = "Acme Corp,27ABCDE1234F1Z5,123 Industrial Estate,Mumbai,Maharashtra,India,John Doe;Jane Smith,john@acme.com;jane@acme.com,9876543210;9876543211";
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Client_Import_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
             return val !== undefined && val !== null ? String(val).trim() : '';
        };

        const name = getVal('Name') || getVal('Company Name');
        if (!name) continue;

        const contactNames = (getVal('Contact Name') || getVal('Contact') || '').split(';');
        const contactEmails = (getVal('Email') || '').split(';');
        const contactPhones = (getVal('Phone') || '').split(';');

        const contacts = contactNames.map((cName, i) => {
            const cleanName = cName.trim();
            if (!cleanName) return null;
            return {
                name: cleanName,
                email: (contactEmails[i] || '').trim(),
                phone: (contactPhones[i] || '').trim()
            };
        }).filter(c => c !== null);

        if (contacts.length === 0) contacts.push({ name: '', email: '', phone: '' });

        const payload = {
            id: `C-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name: name,
            gstin: getVal('GSTIN') || getVal('Tax ID'),
            address: getVal('Address'),
            city: getVal('City'),
            state: getVal('State') || 'Maharashtra',
            country: getVal('Country') || 'India',
            contacts: contacts
        };

        const res = await fetch('http://localhost:5000/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) successCount++;
      }

      addToast(`Success! Imported ${successCount} clients.`, "success");
      fetchClients();
      if (onUpdate) onUpdate(); 
      
    } catch (err) {
      console.error("Import Error:", err);
      addToast("Error importing file.", "error");
    }
    e.target.value = null; 
  };

  const updateContact = (index, field, value) => {
    const updatedContacts = [...(newClient.contacts || [])];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value }; // Safe update
    setNewClient(prev => ({ ...prev, contacts: updatedContacts }));
  }
  
  const addContact = () => {
      setNewClient(prev => ({ 
          ...prev, 
          contacts: [...(prev.contacts || []), { name: '', email: '', phone: '' }] 
      }));
  };
  
  const removeContact = (index) => {
      setNewClient(prev => ({
          ...prev,
          contacts: prev.contacts.filter((_, i) => i !== index)
      }));
  };

  // Filter Logic (Safe Access)
  const filteredClients = (Array.isArray(clients) ? clients : []).filter(c => 
     !searchQuery || 
     (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
     (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
     (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/> Loading Clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold dark:text-white">Client Management</h2>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700">
                Total: {filteredClients.length}
            </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadTemplate} 
            className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <Download size={18} className="mr-2 text-blue-600"/> Template
          </button>

          <label className="flex items-center cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
             <FileSpreadsheet size={18} className="mr-2 text-emerald-600"/> Import
             <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </label>

          <Button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewClient(INITIAL_CLIENT_STATE); }} icon={Plus}>Add Client</Button>
        </div>
      </div>

      {isAdding && (
        <Card className="p-6 mb-6 border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">{editingId ? 'Edit Client Details' : 'New Client Details'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="col-span-2 md:col-span-1">
                <Input label="Company Name" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Legal Entity Name" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Input label="GSTIN/Tax ID" value={newClient.gstin} onChange={e => setNewClient({...newClient, gstin: e.target.value})} placeholder="Optional for export" />
              </div>
              <div className="col-span-2">
                <Input label="Address Line 1" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
              </div>
              <Input label="City" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
              <Select label="State" value={newClient.state} onChange={e => setNewClient({...newClient, state: e.target.value})} options={[...STATES.map(s => ({label: s, value: s})), {label: "Foreign (Export)", value: "Other"}]} />
              <Input label="Country" value={newClient.country} onChange={e => setNewClient({...newClient, country: e.target.value})} />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
               <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Points of Contact</label>
               <Button variant="ghost" onClick={addContact} icon={Plus} className="text-xs h-8">Add PIC</Button>
            </div>
            <div className="space-y-3">
              {(newClient.contacts || []).map((contact, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input placeholder="Name" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} className="flex-1" />
                  <Input placeholder="Email" value={contact.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="flex-1" />
                  <Input placeholder="Phone" value={contact.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="flex-1" />
                  {(newClient.contacts || []).length > 1 && (
                    <button onClick={() => removeContact(idx)} className="mt-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
             <Button onClick={handleSave}>{editingId ? 'Update Client' : 'Save Client'}</Button>
             <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <Card key={client.id} className="p-5 flex flex-col justify-between group h-full">
            <div>
              <div className="flex justify-between items-start">
                 <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-bold text-sm mb-3">
                   {(client.name || '??').substring(0,2).toUpperCase()}
                 </div>
                 <div className="flex gap-2 transition-opacity">
                    <button onClick={() => handleDuplicate(client)} className="text-slate-400 hover:text-emerald-500"><Copy size={16} /></button>
                    <button onClick={() => handleEdit(client)} className="text-slate-400 hover:text-blue-500"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                 </div>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate">{client.name}</h4>
              <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2 mt-2">
                 <MapPin size={14} className="mt-0.5 shrink-0" />
                 <span>{client.city}, {client.country}</span>
              </div>
              {/* Show Contact count */}
              <div className="mt-2 text-xs text-slate-400">
                  {client.contacts?.length || 0} Contact(s)
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-2">
                <Badge>{client.state}</Badge>
                {client.gstin && <Badge type="primary">{client.gstin}</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ClientManager;