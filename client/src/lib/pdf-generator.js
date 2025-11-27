import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PRIMARY_COLOR } from './constants';

export const generateInvoicePDF = (invoice, userSettings, addToast) => {
  try {
    addToast("Generating PDF...", "info");
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // --- 1. Header Section ---
    // Logo
    if (userSettings.logo) {
       try { doc.addImage(userSettings.logo, 'JPEG', margin, 10, 25, 25); } 
       catch (e) { console.warn("Logo error", e); }
    }

    // Company Details (Right Aligned)
    doc.setFontSize(18);
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont(undefined, 'bold');
    const companyName = userSettings.companyName || 'Elementree';
    doc.text(companyName, pageWidth - margin, 20, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.setFont(undefined, 'normal');
    
    // Split Company Address (2 lines max)
    const companyAddr = userSettings.address || '';
    const splitCompAddr = doc.splitTextToSize(companyAddr, 80); 
    doc.text(splitCompAddr, pageWidth - margin, 26, { align: 'right' });
    
    // Adjust Y based on address lines
    let headerY = 26 + (splitCompAddr.length * 4);
    doc.text(`GSTIN: ${userSettings.gstin || ''}`, pageWidth - margin, headerY, { align: 'right' });
    doc.text(`Email: ${userSettings.email || ''}`, pageWidth - margin, headerY + 5, { align: 'right' });

    // --- 2. Title Section ---
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE", margin, 50);

    // Invoice Meta
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Row 1
    doc.setFont(undefined, 'bold');
    doc.text("Invoice No:", margin, 60);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.id, margin + 25, 60);

    doc.setFont(undefined, 'bold');
    doc.text("Currency:", margin + 80, 60);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.currency, margin + 100, 60);

    // Row 2
    doc.setFont(undefined, 'bold');
    doc.text("Date:", margin, 66);
    doc.setFont(undefined, 'normal');
    const dateStr = invoice.date ? new Date(invoice.date).toLocaleDateString('en-GB') : '';
    doc.text(dateStr, margin + 25, 66);

    // --- 3. Bill To Section ---
    const billToY = 80;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, billToY, pageWidth - (margin * 2), 40, 'F'); // Increased height for PIC
    
    doc.setFontSize(11);
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont(undefined, 'bold');
    doc.text("Bill To:", margin + 5, billToY + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Client Name
    const clientName = typeof invoice.client === 'object' ? invoice.client.name : invoice.client || '';
    doc.text(clientName, margin + 5, billToY + 14);
    
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60);

    // Client Address
    let clientAddrStr = "";
    if(typeof invoice.client === 'object' && invoice.client) {
        const c = invoice.client;
        // Construct full address string
        const parts = [c.address, c.city, c.state !== 'Other' ? c.state : '', c.country].filter(Boolean);
        clientAddrStr = parts.join(', ');
    }
    const splitClientAddr = doc.splitTextToSize(clientAddrStr, 160);
    doc.text(splitClientAddr, margin + 5, billToY + 19);

    // --- FIX: PIC Details ---
    let picY = billToY + 19 + (splitClientAddr.length * 4);
    
    // Logic: Use selectedContact if available, otherwise default to first contact
    let contact = null;
    if (typeof invoice.client === 'object') {
        if (invoice.client.selectedContact) {
            contact = invoice.client.selectedContact;
        } else if (invoice.client.contacts && invoice.client.contacts.length > 0) {
            contact = invoice.client.contacts[0];
        }
    }

    if (contact) {
        doc.setFont(undefined, 'bold');
        doc.text(`Attn: ${contact.name || 'Manager'}`, margin + 5, picY);
        doc.setFont(undefined, 'normal');
        picY += 5;
        
        // Combine Email and Phone
        const contactDetails = [contact.email, contact.phone].filter(Boolean).join('  |  ');
        if (contactDetails) {
             doc.text(contactDetails, margin + 5, picY);
             picY += 5;
        }
    }

    // GSTIN
    if(typeof invoice.client === 'object' && invoice.client.gstin) {
        doc.text(`GSTIN: ${invoice.client.gstin}`, margin + 5, picY);
    }

    // --- 4. Items Table ---
    const tableColumn = ["Description", "HSN/SAC", "Qty", "Price", "Total"];
    const tableRows = invoice.items.map(item => [
      item.desc || item.description,
      item.hsn,
      item.qty,
      parseFloat(item.price).toLocaleString(undefined, {minimumFractionDigits: 2}),
      (item.qty * item.price).toLocaleString(undefined, {minimumFractionDigits: 2})
    ]);

    autoTable(doc, {
      startY: 130,
      head: [tableColumn],
      body: tableRows,
      headStyles: { 
          fillColor: PRIMARY_COLOR, 
          fontSize: 10,
          fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
          0: { cellWidth: 80 },
          3: { halign: 'right' },
          4: { halign: 'right' }
      },
      theme: 'grid'
    });

    // --- 5. Totals ---
    const finalY = doc.lastAutoTable.finalY + 10;
    const rightColX = pageWidth - 60;
    const valueX = pageWidth - margin;
    
    doc.setTextColor(0);
    doc.setFontSize(10);
    
    const amount = parseFloat(invoice.amount);
    const tax = parseFloat(invoice.tax);
    const subtotal = amount - tax;

    doc.text("Subtotal:", rightColX, finalY);
    doc.text(`${invoice.currency} ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`, valueX, finalY, { align: 'right' });

    if (tax > 0) {
      doc.text("Tax (GST):", rightColX, finalY + 6);
      doc.text(`${invoice.currency} ${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}`, valueX, finalY + 6, { align: 'right' });
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Total:", rightColX, finalY + 14);
    doc.text(`${invoice.currency} ${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, valueX, finalY + 14, { align: 'right' });

    // --- 6. Export Declaration ---
    let footerY = finalY + 25;
    const isExport = (invoice.type && invoice.type.includes('Export')) || 
                     (invoice.client && invoice.client.state === 'Other');

    if(isExport && invoice.isLut) {
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        
        const lutRef = userSettings.lutNumber || "AD270325138597Q";
        const declaration = `Export of Services without payment of Integrated Goods & Service Tax.\nLUT Ref no: ${lutRef}`;
        
        doc.text(declaration, margin, footerY, { align: 'left' }); 
        footerY += 15;
    }

    // --- 7. Bank Details (With Company Name) ---
    const bankY = pageHeight - 50;
    doc.setDrawColor(200);
    doc.line(margin, bankY - 5, pageWidth - margin, bankY - 5);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Bank Details:", margin, bankY);
    doc.setFont(undefined, 'normal');
    
    // Find matching bank
    const bank = (userSettings.bank_accounts || []).find(b => b.currency === invoice.currency);
    
    // Add Company Name to Bank Details
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text(userSettings.companyName || '', margin + 25, bankY);
    doc.setFont(undefined, 'normal');

    if (bank) {
        let bankText = `${bank.bankName}`;
        if(bank.accountNo) bankText += `\nAccount No: ${bank.accountNo}`;
        if(bank.swift) bankText += `\nSWIFT: ${bank.swift}`;
        if(bank.ifsc) bankText += `  |  IFSC: ${bank.ifsc}`;
        
        doc.text(bankText, margin, bankY + 5);
    } else {
        // Fallback
        if (userSettings.bank_accounts && userSettings.bank_accounts.length > 0) {
             const defaultBank = userSettings.bank_accounts[0];
             doc.text(`${defaultBank.bankName}\nAcc: ${defaultBank.accountNo}`, margin, bankY + 5);
        } else {
             doc.text("Please contact for bank details.", margin, bankY + 5);
        }
    }

    doc.save(`${invoice.id}.pdf`);
    addToast("PDF Downloaded successfully!", "success");
  } catch (error) {
    console.error("PDF Gen Error", error);
    addToast("Failed to generate PDF.", "error");
  }
};