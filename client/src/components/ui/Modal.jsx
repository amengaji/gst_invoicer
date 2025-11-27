import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Input from './Input';

export const DeleteModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 space-y-4 border-red-200 bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <AlertTriangle size={28} />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-white">
          Type <span className="font-bold select-all text-red-600">DELETE</span> to confirm.
        </p>

        <Input 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder="Type DELETE" 
          className="border-red-300 focus:ring-red-500"
        />

        <div className="flex gap-3 pt-2">
          <Button 
            variant="danger"
            onClick={() => { onConfirm(); setInputValue(''); }} 
            disabled={inputValue !== 'DELETE'}
            className="flex-1"
          >
            Confirm Delete
          </Button>
          <Button 
            variant="ghost"
            onClick={() => { onClose(); setInputValue(''); }} 
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const PaymentModal = ({ invoice, onClose, onConfirm }) => {
  const [rate, setRate] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold dark:text-white">Confirm Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 text-sm">
           <div className="flex justify-between text-slate-600 dark:text-slate-400">
             <span>Invoice Amount</span>
             <span className="font-medium text-slate-900 dark:text-white">{invoice.currency} {invoice.amount.toLocaleString()}</span>
           </div>
           <div className="flex justify-between text-slate-600 dark:text-slate-400">
             <span>Client</span>
             <span>{typeof invoice.client === 'object' ? invoice.client.name : invoice.client}</span>
           </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Exchange Rate (1 {invoice.currency} = ? INR)
          </label>
          <Input 
            type="number" 
            autoFocus
            value={rate} 
            onChange={(e) => setRate(e.target.value)} 
            placeholder="e.g. 83.50" 
          />
          <p className="text-xs text-slate-500">
            Total received: ₹{(parseFloat(rate || 0) * invoice.amount).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onConfirm(rate)} className="flex-1" disabled={!rate}>Mark as Paid</Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
};