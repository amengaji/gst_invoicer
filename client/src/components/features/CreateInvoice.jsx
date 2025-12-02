// client/src/components/features/CreateInvoice.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { CURRENCIES, STATES } from '../../lib/constants';

const CreateInvoice = ({ onSave, onCancel, userSettings, clients = [], invoices = [], editingInvoice }) => {
  const [items, setItems] = useState([{ id: 1, desc: '', hsn: '', qty: 1, price: 0 }]);
  
  const [client, setClient] = useState({ 
    id: '', name: '', gstin: '', state: 'Maharashtra', address: '', city: '', country: 'India', 
    contacts: [], selectedContact: null 
  });
  
  // Helper: Auto-Increment ID
  const generateNextId = () => {
    const prefix = userSettings.invoicePrefix || 'INV';
    const relevantInvoices = invoices.filter(inv => inv.id.startsWith(prefix));
    if (relevantInvoices.length === 0) return `${prefix}-001`;
    let maxNum = 0;
    relevantInvoices.forEach(inv => {
        const cleanId = inv.id.substring(prefix.length);
        const match = cleanId.match(/(\d+)/); 
        if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [settings, setSettings] = useState({ 
    invoiceNo: '', 
    date: new Date().toISOString().split('T')[0], 
    currency: userSettings.currency,
    myState: userSettings.state,
    isLut: false,
    exchangeRate: 1,
    datePaid: '' // New State
  });

  useEffect(() => {
    if (editingInvoice) {
        // --- EDIT MODE ---
        const mappedItems = (editingInvoice.items || []).map(item => ({
            ...item,
            desc: item.description || item.desc || '', 
            qty: parseFloat(item.qty) || 1,
            price: parseFloat(item.price) || 0
        }));
        setItems(mappedItems.length > 0 ? mappedItems : [{ id: 1, desc: '', hsn: '', qty: 1, price: 0 }]);

        const loadedClient = editingInvoice.client || {};
        let fixedState = loadedClient.state || 'Maharashtra';
        if (fixedState.toLowerCase() === 'other' || fixedState.toLowerCase() === 'foreign') fixedState = 'Other';
        
        setClient({ ...loadedClient, state: fixedState });

        // Safely extract date formats
        const extractDate = (val) => {
             if (!val) return '';
             return val.includes('T') ? val.split('T')[0] : val; 
        };

        const invoiceDate = extractDate(editingInvoice.date) || new Date().toISOString().split('T')[0];
        const loadedDatePaid = extractDate(editingInvoice.date_paid || editingInvoice.datePaid);

        // AUTO-FILL Date Paid if missing but status is 'Paid'
        // This fixes the issue where the box appears empty ("dd-mm-yyyy")
        const finalDatePaid = loadedDatePaid ? loadedDatePaid : (editingInvoice.status === 'Paid' ? invoiceDate : '');

        setSettings({
            invoiceNo: editingInvoice.id,
            date: invoiceDate,
            currency: editingInvoice.currency,
            myState: userSettings.state, 
            isLut: editingInvoice.type?.includes('LUT') || false,
            exchangeRate: parseFloat(editingInvoice.exchange_rate) || 1,
            datePaid: finalDatePaid
        });
    } else {
        // --- NEW MODE ---
        setSettings(prev => ({
            ...prev,
            invoiceNo: generateNextId(),
            currency: userSettings.currency,
            myState: userSettings.state,
            datePaid: ''
        }));
    }
  }, [editingInvoice, userSettings.invoicePrefix, invoices]);

  const handleClientSelect = (clientId) => {
    const selected = clients.find(c => String(c.id) === String(clientId));
    if(selected) {
      setClient({ 
        ...selected, 
        selectedContact: selected.contacts && selected.contacts.length > 0 ? selected.contacts[0] : null 
      });
    } else {
      setClient({ id: '', name: '', gstin: '', state: 'Maharashtra', address: '', contacts: [], selectedContact: null });
    }
  }

  const handleContactSelect = (e) => {
    const contactIndex = e.target.value;
    if (contactIndex !== "" && client.contacts) {
        setClient({ ...client, selectedContact: client.contacts[contactIndex] });
    }
  }

  const addItem = () => setItems([...items, { id: Date.now(), desc: '', hsn: '', qty: 1, price: 0 }]);
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const isInterstate = settings.myState !== client.state;
  const isExport = client.state === 'Other'; 
  const isLut = settings.isLut && isExport;

  let cgst = 0, sgst = 0, igst = 0;
  if (isExport) { if (!isLut) igst = subtotal * 0.18; } 
  else if (isInterstate) { igst = subtotal * 0.18; } 
  else { cgst = subtotal * 0.09; sgst = subtotal * 0.09; }

  const totalTax = cgst + sgst + igst;
  const grandTotal = subtotal + totalTax;

  const handleSaveClick = async () => {
      if (client.id && !client.id.startsWith('new')) {
          try {
              await fetch(`http://localhost:5000/api/clients/${client.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(client)
              });
          } catch (e) { console.error("Failed to update client details", e); }
      }

      onSave({ 
        id: settings.invoiceNo, invoiceNo: settings.invoiceNo, client, items, 
        date: settings.date, total: grandTotal, amount: grandTotal, tax: totalTax, 
        status: editingInvoice ? editingInvoice.status : 'Pending',
        type: isExport ? (isLut ? 'Export (LUT)' : 'Export') : (isInterstate ? 'Interstate' : 'Intrastate'),
        currency: settings.currency, exchangeRate: settings.exchangeRate, isLut: settings.isLut, myState: settings.myState,
        datePaid: settings.datePaid // Pass the new field
      });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</h2>
          <p className="text-slate-500 text-sm">Create a GST compliant invoice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSaveClick} icon={FileText}>{editingInvoice ? 'Update Invoice' : 'Save Invoice'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Bill To</h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
               <Select label="Select Saved Client" placeholder="-- Choose a client --" value={client.id || ''} onChange={(e) => handleClientSelect(e.target.value)} options={clients.map(c => ({label: c.name, value: c.id}))} />
               {client.id && client.contacts && client.contacts.length > 0 && (
                 <Select label="Attention To (PIC)" value={client.contacts.indexOf(client.selectedContact)} onChange={handleContactSelect} options={client.contacts.map((c, idx) => ({ label: c.name, value: idx }))} />
               )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Client Name" value={client.name} onChange={(e) => setClient({...client, name: e.target.value})} placeholder="Acme Corp" />
              <Input label="GSTIN" value={client.gstin} onChange={(e) => setClient({...client, gstin: e.target.value})} />
              <div className="col-span-2"><Input label="Address" value={client.address} onChange={(e) => setClient({...client, address: e.target.value})} /></div>
              <Select label="Place of Supply" value={client.state} onChange={(e) => setClient({...client, state: e.target.value})} options={[...STATES.map(s => ({label: s, value: s})), {label: "Foreign (Export)", value: "Other"}]} />
              <Input label="City" value={client.city || ''} onChange={(e) => setClient({...client, city: e.target.value})} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Items</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 px-2">
                <div className="col-span-5">Description</div><div className="col-span-2">HSN/SAC</div><div className="col-span-2 text-center">Qty</div><div className="col-span-2 text-right">Price</div><div className="col-span-1"></div>
              </div>
              {items.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5"><Input value={item.desc} onChange={(e) => updateItem(item.id, 'desc', e.target.value)} placeholder="Description" /></div>
                  <div className="col-span-2"><Input value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} placeholder="998311" /></div>
                  <div className="col-span-2"><Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)} className="text-center" /></div>
                  <div className="col-span-2"><Input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="text-right" /></div>
                  <div className="col-span-1 flex justify-center"><button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button></div>
                </div>
              ))}
              <Button variant="ghost" onClick={addItem} icon={Plus} className="w-full mt-2 text-sm border-dashed border border-slate-300">Add Line Item</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
             <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Invoice Settings</h3>
             <Input label="Invoice Number" value={settings.invoiceNo} onChange={(e) => setSettings({...settings, invoiceNo: e.target.value})} disabled={!!editingInvoice} />
             <Input label="Date" type="date" value={settings.date} onChange={(e) => setSettings({...settings, date: e.target.value})} />
             <Select label="Currency" value={settings.currency} onChange={(e) => setSettings({...settings, currency: e.target.value})} options={CURRENCIES} />
             
             {/* Show if status is Paid OR if there is already a Date Paid value (even if status mismatch) */}
             {editingInvoice && (editingInvoice.status === 'Paid' || settings.datePaid) && (
                 <Input 
                    label="Date Paid" 
                    type="date" 
                    value={settings.datePaid} 
                    onChange={(e) => setSettings({...settings, datePaid: e.target.value})} 
                 />
             )}

             <div className="flex items-center gap-2 pt-2">
               <input type="checkbox" id="lut" checked={settings.isLut} onChange={(e) => setSettings({...settings, isLut: e.target.checked})} className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
               <label htmlFor="lut" className="text-sm text-slate-700 dark:text-slate-300">Export under LUT</label>
             </div>
          </Card>

          <Card className="p-6 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{settings.currency} {subtotal.toFixed(2)}</span></div>
              {!isLut && cgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>CGST (9%)</span><span>{settings.currency} {cgst.toFixed(2)}</span></div>}
              {!isLut && sgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>SGST (9%)</span><span>{settings.currency} {sgst.toFixed(2)}</span></div>}
              {!isLut && igst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>IGST (18%)</span><span>{settings.currency} {igst.toFixed(2)}</span></div>}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 flex justify-between font-bold text-lg dark:text-white"><span>Total</span><span>{settings.currency} {grandTotal.toFixed(2)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;