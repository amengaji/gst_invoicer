import React, { useMemo } from 'react';
import { Mail, Phone, Globe, Calendar, Hash, DollarSign, Banknote, Landmark, X, Edit, Printer } from 'lucide-react';
import { generateInvoicePDF } from '../../lib/pdf-generator';

const InvoiceViewModal = ({ invoice, userSettings, onClose, onEdit, addToast }) => {
  if (!invoice) return null;

  // --- Data Mapping ---
  const data = {
    logoUrl: userSettings.logo,
    companyName: userSettings.companyName || 'Elementree',
    companyAddress: userSettings.address,
    companyEmail: userSettings.email,
    companyPhone: userSettings.companyPhone, // Assuming added to settings
    companyWebsite: userSettings.companyWebsite || 'www.elementree.co.in',
    companyGstin: userSettings.gstin,
    
    clientName: invoice.client?.name || 'Unknown',
    clientContact: invoice.client?.selectedContact?.name || (invoice.client?.contacts?.[0]?.name) || '',
    clientContactPhone: invoice.client?.selectedContact?.phone || (invoice.client?.contacts?.[0]?.phone) || '',
    clientContactEmail: invoice.client?.selectedContact?.email || (invoice.client?.contacts?.[0]?.email) || '',
    clientAddress: invoice.client?.address,
    clientCityState: `${invoice.client?.city || ''}, ${invoice.client?.state || ''}`,
    clientGstin: invoice.client?.gstin,
    
    invoiceNumber: invoice.id,
    issueDate: invoice.date ? new Date(invoice.date).toLocaleDateString('en-GB') : '',
    dueDate: 'Net 30', // Or calc date
    paymentTerms: 'Net 30',
    items: invoice.items || [],
    taxRate: 0.18, // Approx logic
    currency: invoice.currency || 'INR',
    
    // Find Bank
    bankDetails: (userSettings.bank_accounts || []).find(b => b.currency === invoice.currency) || (userSettings.bank_accounts?.[0] || {}),
    
    isExport: invoice.type?.includes('LUT') || invoice.client?.state === 'Other',
    lutNumber: userSettings.lutNumber
  };

  // --- Helper: Currency Format ---
  const formatCurrency = (val) => {
      const num = parseFloat(val) || 0;
      const locale = userSettings.number_format === 'US' ? 'en-US' : 'en-IN';
      return `${data.currency} ${num.toLocaleString(locale, {minimumFractionDigits: 2})}`;
  };

  // --- Sub-Components ---
  const InvoiceItemRow = ({ item }) => (
    <tr key={item.id} className="hover:bg-teal-50/50 transition-colors border-b border-gray-100">
      <td className="py-4 px-6 text-sm font-medium text-gray-700">{item.desc || item.description}</td>
      <td className="py-4 px-3 text-xs text-center font-mono text-gray-500">{item.hsn || '-'}</td>
      <td className="py-4 px-6 text-sm text-right text-gray-600">{item.qty}</td>
      <td className="py-4 px-6 text-sm text-right font-mono text-gray-600">{formatCurrency(item.price)}</td>
      <td className="py-4 px-6 text-sm font-semibold text-right font-mono text-gray-900">
        {formatCurrency((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0))}
      </td>
    </tr>
  );

  const TotalRow = ({ label, value, isGrandTotal = false, isTax = false }) => (
    <div className={`flex justify-between items-center ${isGrandTotal ? 'text-lg font-bold pt-3 border-t border-gray-300 mt-2' : 'text-sm text-gray-600 py-1'}`}>
      <span>{label}</span>
      <span className={`font-mono ${isGrandTotal ? 'text-teal-600' : isTax ? 'text-orange-500' : 'text-gray-900'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );

  const DetailItem = ({ icon: Icon, label, value, className = '' }) => (
    <div className="flex items-center space-x-2 text-sm">
        <Icon className={`w-4 h-4 ${className} text-gray-400`} />
        <span className="text-gray-500">{label}:</span>
        <span className={`font-semibold text-gray-800 ${className}`}>{value}</span>
    </div>
  );

  const ContactLink = ({ icon: Icon, text, href }) => (
    <a href={href} className="flex items-center space-x-1 hover:text-teal-600 transition-colors text-xs text-gray-500">
        <Icon className="w-3 h-3" />
        <span>{text}</span>
    </a>
  );

  // --- Calculations ---
  const amount = parseFloat(invoice.amount) || 0;
  const tax = parseFloat(invoice.tax) || 0;
  const subtotal = amount - tax;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 relative flex flex-col max-h-[90vh]">
        
        {/* --- Toolbar --- */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl sticky top-0 z-10">
            <div className="flex gap-2">
                <button onClick={() => generateInvoicePDF(invoice, userSettings, addToast)} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                    <Printer size={16} className="mr-2"/> PDF
                </button>
                <button onClick={() => { onClose(); onEdit(invoice); }} className="flex items-center px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors shadow-sm">
                    <Edit size={16} className="mr-2"/> Edit
                </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* --- Scrollable Content --- */}
        <div className="p-6 sm:p-10 overflow-y-auto font-sans">
            
            {/* Header */}
            <header className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start pb-8 border-b border-gray-100 mb-8">
                <div className="justify-self-start">
                    {data.logoUrl ? (
                        <img src={data.logoUrl} alt="Logo" className="h-20 w-20 object-contain rounded-xl border border-gray-100" />
                    ) : (
                        <div className="h-20 w-20 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">No Logo</div>
                    )}
                </div>
                <div className="justify-self-center text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">INVOICE</h1>
                    {invoice.status === 'Paid' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mt-2 inline-block">PAID</span>}
                </div>
                <div className="justify-self-end text-right space-y-1">
                    <div className="flex items-center justify-end space-x-2 text-gray-600">
                        <Hash className="w-4 h-4 text-teal-500" />
                        <span className="font-semibold text-gray-900 text-lg">{data.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-end space-x-2 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Date: <span className="font-medium text-gray-700">{data.issueDate}</span></span>
                    </div>
                </div>
            </header>

            {/* Addresses */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* FROM */}
                <div className="p-5 bg-teal-50/30 rounded-xl border border-teal-100/50">
                    <h3 className="text-xs uppercase font-bold text-teal-600 mb-3 tracking-wider">From</h3>
                    <p className="text-lg font-bold text-gray-800">{data.companyName}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{data.companyAddress}</p>
                    {data.companyGstin && <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">GSTIN:</span> {data.companyGstin}</p>}
                </div>

                {/* TO */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-3 tracking-wider">To</h3>
                    <p className="text-lg font-bold text-gray-800">{data.clientName}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{data.clientAddress}, {data.clientCityState}</p>
                    {data.clientGstin && <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">GSTIN:</span> {data.clientGstin}</p>}
                    
                    {(data.clientContact) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Attn: {data.clientContact}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                {data.clientContactPhone && <span className="flex items-center gap-1"><Phone size={12}/> {data.clientContactPhone}</span>}
                                {data.clientContactEmail && <span className="flex items-center gap-1"><Mail size={12}/> {data.clientContactEmail}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Details Bar */}
            <section className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-lg border border-gray-200 mb-8 shadow-sm">
                <DetailItem icon={Calendar} label="Due Date" value={data.dueDate} className="text-red-500" />
                <DetailItem icon={Hash} label="Terms" value={data.paymentTerms} />
                <DetailItem icon={DollarSign} label="Currency" value={`${data.currency}`} />
            </section>

            {/* Table */}
            <section className="mb-10">
                <h2 className="text-lg font-bold mb-4 text-gray-800">Billed Services</h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase w-2/5">Description</th>
                                <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase">HSN/SAC</th>
                                <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Qty</th>
                                <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Unit Price</th>
                                <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {data.items.map(item => <InvoiceItemRow key={item.id} item={item} />)}
                        </tbody>
                    </table>
                </div>
                
                {/* Totals */}
                <div className="flex justify-end mt-6">
                    <div className="w-full sm:w-80 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                        <TotalRow label="Subtotal" value={subtotal} />
                        <TotalRow label={`Tax (${tax > 0 ? '18%' : '0%'})`} value={tax} isTax={true} />
                        <TotalRow label="Total Due" value={amount} isGrandTotal={true} />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <div className="space-y-6">
                    {data.isExport && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                            <h3 className="font-bold mb-1 flex items-center gap-1"><Banknote size={14}/> Tax Declaration</h3>
                            <p>Export of Services without payment of Integrated Goods & Service Tax.</p>
                            <p>LUT Ref: {data.lutNumber || '---'}</p>
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Payment Notes</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Payment is due within 30 days. A late fee of 1.5% per month will be applied to overdue balances. 
                            Thank you for your continued partnership!
                        </p>
                    </div>
                </div>

                <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Landmark className="w-4 h-4 text-teal-500" /> Bank Transfer Details
                    </h3>
                    {data.bankDetails.bankName ? (
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between"><span className="text-gray-400">Bank:</span> <span>{data.bankDetails.bankName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">A/C No:</span> <span className="font-mono font-medium text-gray-900">{data.bankDetails.accountNo}</span></div>
                            {data.bankDetails.swift && <div className="flex justify-between"><span className="text-gray-400">SWIFT:</span> <span className="font-mono">{data.bankDetails.swift}</span></div>}
                            {data.bankDetails.ifsc && <div className="flex justify-between"><span className="text-gray-400">IFSC:</span> <span className="font-mono">{data.bankDetails.ifsc}</span></div>}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4">No bank details configured for {data.currency}.</p>
                    )}
                </div>
            </footer>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center gap-6">
                <ContactLink icon={Mail} text={data.companyEmail} href={`mailto:${data.companyEmail}`} />
                <ContactLink icon={Phone} text={data.companyPhone} href={`tel:${data.companyPhone}`} />
                <ContactLink icon={Globe} text={data.companyWebsite} href={`https://${data.companyWebsite}`} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;