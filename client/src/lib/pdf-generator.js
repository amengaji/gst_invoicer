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
    const contentWidth = pageWidth - margin * 2;

    // --- Design Tokens ---
    const colors = {
      blueBg: [239, 246, 255],
      blueBorder: [219, 234, 254],
      grayBg: [249, 250, 251],
      grayBorder: [229, 231, 235],
      yellowBg: [254, 252, 232],
      yellowBorder: [254, 240, 138],
      yellowText: [161, 98, 7],
      textPrimary: [17, 24, 39],
      textSecondary: [100, 116, 139],
      tealText: [20, 184, 166],
    };

    const safe = (text) => (text || "").toString();

    const formatCurrency = (val) => {
      const num = parseFloat(val) || 0;
      return `${safe(invoice.currency)} ${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`;
    };

    const drawBox = (x, y, w, h, bg, border) => {
      doc.setFillColor(...bg);
      doc.setDrawColor(...border);
      try {
        doc.roundedRect(x, y, w, h, 3, 3, "FD");
      } catch (e) {
        doc.rect(x, y, w, h, "FD");
      }
    };

    // --- Footer & Bottom-Block Layout (for proper page breaks) ---
    const FOOTER_TEXT_Y = pageHeight - 10; // footer text baseline
    const FOOTER_RULE_Y = pageHeight - 15; // footer separator line
    const FOOTER_RESERVED = 20; // reserved at bottom for footer

    const BOTTOM_BLOCK_H = 45; // approx height of notes + bank + (optional) tax declaration
    const BOTTOM_BLOCK_GAP = 6; // gap between totals and bottom block

    const getBottomBlockTopY = () => FOOTER_RULE_Y - 3 - BOTTOM_BLOCK_H;

    const ensureRoomOnPage = (cursorY, neededH) => {
      const bottomLimitY = getBottomBlockTopY();
      if (cursorY + neededH + BOTTOM_BLOCK_GAP > bottomLimitY) {
        doc.addPage();
        return margin; // reset cursor near top on new page
      }
      return cursorY;
    };

    // --- 1. HEADER ---
    let topY = 15;
    if (userSettings && userSettings.logo) {
      try {
        doc.addImage(userSettings.logo, "JPEG", margin, topY, 20, 20);
      } catch (e) {
        // ignore logo errors
      }
    }

    doc.setFontSize(24);
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth / 2, topY + 12, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(PRIMARY_COLOR); // hex is supported by jsPDF
    doc.text(`# ${safe(invoice.id)}`, pageWidth - margin, topY + 8, {
      align: "right",
    });

    doc.setFontSize(9);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");
    const dateStr = invoice.date
      ? new Date(invoice.date).toLocaleDateString("en-GB")
      : "";
    doc.text(`Issue Date: ${dateStr}`, pageWidth - margin, topY + 14, {
      align: "right",
    });

    doc.setDrawColor(...colors.grayBorder);
    doc.line(margin, topY + 25, pageWidth - margin, topY + 25);

    // --- 2. ADDRESS CARDS (Compact) ---
    const addrY = topY + 35;
    const boxWidth = contentWidth / 2 - 6;
    const boxHeight = 48; // reduced empty space

    // FROM
    drawBox(margin, addrY, boxWidth, boxHeight, colors.blueBg, colors.blueBorder);
    doc.setFontSize(8);
    doc.setTextColor(...colors.tealText);
    doc.setFont("helvetica", "bold");
    doc.text("FROM", margin + 5, addrY + 8);

    doc.setFontSize(10);
    doc.setTextColor(...colors.textPrimary);
    const companyName = safe(userSettings.companyName || "Elementree");
    const companyLines = doc.splitTextToSize(companyName, boxWidth - 10);
    doc.text(companyLines, margin + 5, addrY + 14);

    doc.setFontSize(9);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");

    let compY = addrY + 14 + companyLines.length * 4;
    const compAddr = doc.splitTextToSize(
      safe(userSettings.address),
      boxWidth - 10
    );
    doc.text(compAddr, margin + 5, compY);

    let compNextY = compY + compAddr.length * 3.5 + 2;
    if (userSettings.gstin) {
      doc.text(`GSTIN: ${safe(userSettings.gstin)}`, margin + 5, compNextY);
    }

    // TO
    const rightBoxX = pageWidth - margin - boxWidth;
    drawBox(rightBoxX, addrY, boxWidth, boxHeight, colors.grayBg, colors.grayBorder);
    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "bold");
    doc.text("TO", rightBoxX + 5, addrY + 8);

    doc.setFontSize(10);
    doc.setTextColor(...colors.textPrimary);
    const clientName =
      typeof invoice.client === "object" ? safe(invoice.client.name) : "Unknown";
    const clientLines = doc.splitTextToSize(clientName, boxWidth - 10);
    doc.text(clientLines, rightBoxX + 5, addrY + 14);

    doc.setFontSize(9);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");

    let clientY = addrY + 14 + clientLines.length * 4;
    let clientAddrStr = "";
    if (typeof invoice.client === "object" && invoice.client) {
      const c = invoice.client;
      clientAddrStr = [
        c.address,
        c.city,
        c.state !== "Other" ? c.state : "",
        c.country,
      ]
        .filter(Boolean)
        .join(", ");
    }
    const clientAddrLines = doc.splitTextToSize(clientAddrStr, boxWidth - 10);
    doc.text(clientAddrLines, rightBoxX + 5, clientY);

    let nextClientY = clientY + clientAddrLines.length * 3.5 + 2;
    if (typeof invoice.client === "object" && invoice.client.gstin) {
      doc.text(`GSTIN: ${safe(invoice.client.gstin)}`, rightBoxX + 5, nextClientY);
      nextClientY += 4;
    }

    let contact = null;
    if (typeof invoice.client === "object") {
      if (invoice.client.selectedContact)
        contact = invoice.client.selectedContact;
      else if (
        invoice.client.contacts &&
        invoice.client.contacts.length > 0
      )
        contact = invoice.client.contacts[0];
    }

    if (contact) {
      nextClientY += 1;
      doc.setFont("helvetica", "bold");
      doc.text(`Attn: ${safe(contact.name)}`, rightBoxX + 5, nextClientY);
      doc.setFont("helvetica", "normal");
      nextClientY += 4;

      if (contact.phone) {
        doc.text(`Ph: ${safe(contact.phone)}`, rightBoxX + 5, nextClientY);
        nextClientY += 4;
      }
      if (contact.email) {
        doc.text(safe(contact.email), rightBoxX + 5, nextClientY);
      }
    }

    // --- 3. DETAILS BAR ---
    const barY = addrY + boxHeight + 8;
    drawBox(margin, barY, contentWidth, 12, colors.grayBg, colors.grayBorder);

    doc.setFontSize(7);
    doc.setTextColor(...colors.textSecondary);
    doc.text("DUE DATE", margin + 5, barY + 4);
    doc.text("TERMS", pageWidth / 2, barY + 4, { align: "center" });
    doc.text("CURRENCY", pageWidth - margin - 5, barY + 4, {
      align: "right",
    });

    doc.setFontSize(8);
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "bold");

    const issueDate = invoice.date ? new Date(invoice.date) : new Date();
    issueDate.setDate(issueDate.getDate() + 30);
    const dueDateStr = issueDate.toLocaleDateString("en-GB");

    doc.text(dueDateStr, margin + 5, barY + 9);
    doc.text("Net 30", pageWidth / 2, barY + 9, { align: "center" });
    doc.text(`${safe(invoice.currency)}`, pageWidth - margin - 5, barY + 9, {
      align: "right",
    });

    // --- 4. TABLE ---
    const tableHeaderY = barY + 18;
    doc.setFontSize(10);
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text("Billed Services", margin, tableHeaderY);

    const tableColumn = ["Description", "HSN/SAC", "Qty", "Price", "Total"];
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const tableRows = items.map((item) => [
      safe(item.desc || item.description),
      safe(item.hsn) || "-",
      parseFloat(item.qty) || 0,
      (parseFloat(item.price) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      }),
      (
        (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
      ).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      startY: tableHeaderY + 4,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: colors.grayBg,
        textColor: colors.textSecondary,
        fontStyle: "bold",
        lineColor: colors.grayBorder,
        lineWidth: 0.1,
        halign: "left",
        cellPadding: 2,
        fontSize: 8,
      },
      styles: {
        textColor: colors.textPrimary,
        fontSize: 8,
        cellPadding: 2,
        lineColor: colors.grayBorder,
        lineWidth: 0.1,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: "auto", halign: "left" },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "right", cellWidth: 15 },
        3: { halign: "right", fontStyle: "bold", cellWidth: 25 },
        4: { halign: "right", fontStyle: "bold", cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      // Reserve space for footer on each page
      margin: {
        left: margin,
        right: margin,
        top: margin,
        bottom: FOOTER_RESERVED + 6,
      },
    });

    // --- 5. TOTALS (with proper page break handling) ---
    const amount = parseFloat(invoice.amount) || 0;
    const tax = parseFloat(invoice.tax) || 0;
    const subtotal = amount - tax;
    const isLocal = safe(invoice.type).toLowerCase().includes("intrastate");

    const lastTableY =
      doc.lastAutoTable && doc.lastAutoTable.finalY
        ? doc.lastAutoTable.finalY
        : tableHeaderY + 10;
    let cursorY = lastTableY + 6;

    const totalsH =
      tax > 0 ? (isLocal ? 34 : 30) : 26; // approximate block height

    cursorY = ensureRoomOnPage(cursorY, totalsH);

    const totalBoxWidth = 75;
    const totalBoxX = pageWidth - margin - totalBoxWidth;

    let totalBoxHeight = 22;
    if (tax > 0 && isLocal) totalBoxHeight += 6;

    doc.setFillColor(...colors.grayBg);
    doc.rect(totalBoxX - 5, cursorY, totalBoxWidth + 5, totalBoxHeight, "F");

    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);

    const printTotal = (label, val, y, isBold = false, colorOverride = null) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(
        ...(colorOverride ||
          (isBold ? colors.tealText : colors.textSecondary))
      );
      doc.text(label, totalBoxX, y);
      doc.text(val, pageWidth - margin - 5, y, { align: "right" });
    };

    let tY = cursorY + 5;
    printTotal("Subtotal", formatCurrency(subtotal), tY);

    if (tax > 0) {
      if (isLocal) {
        const halfTax = tax / 2;
        tY += 4;
        printTotal("CGST (9%)", formatCurrency(halfTax), tY, false, [
          249, 115, 22,
        ]);
        tY += 4;
        printTotal("SGST (9%)", formatCurrency(halfTax), tY, false, [
          249, 115, 22,
        ]);
      } else {
        tY += 4;
        printTotal("IGST (18%)", formatCurrency(tax), tY, false, [
          249, 115, 22,
        ]);
      }
    } else {
      tY += 4;
      printTotal("Tax (0%)", formatCurrency(0), tY);
    }

    tY += 3;
    doc.setDrawColor(...colors.grayBorder);
    doc.line(totalBoxX, tY, pageWidth - margin, tY);

    tY += 5;
    doc.setFontSize(10);
    doc.setTextColor(PRIMARY_COLOR);
    printTotal("Total Due", formatCurrency(amount), tY, true);

    // --- 6. BOTTOM BLOCK (always stuck to bottom of LAST page) ---
    const bottomTopY = getBottomBlockTopY();
    const colWidth = contentWidth / 2 - 6;

    const isExport =
      safe(invoice.type).toLowerCase().includes("lut") ||
      safe(invoice.type).toLowerCase().includes("export") ||
      (invoice.client && safe(invoice.client.state) === "Other");

    let notesY = bottomTopY;

    if (isExport) {
      const taxBoxH = 18;
      drawBox(
        margin,
        bottomTopY,
        colWidth,
        taxBoxH,
        colors.yellowBg,
        colors.yellowBorder
      );

      doc.setFontSize(7);
      doc.setTextColor(...colors.yellowText);
      doc.setFont("helvetica", "bold");
      doc.text("TAX DECLARATION", margin + 4, bottomTopY + 5);

      doc.setFont("helvetica", "normal");
      const lutRef = safe(userSettings.lutNumber) || "AD270325138597Q";
      const decText = doc.splitTextToSize(
        `Export without payment of IGST. LUT Ref: ${lutRef}`,
        colWidth - 8
      );
      doc.text(decText, margin + 4, bottomTopY + 9);

      notesY = bottomTopY + taxBoxH + 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Notes", margin, notesY + 4);

    doc.setFontSize(7);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");
    const pNoteText =
      "Payment is due within 30 days of the invoice issue date. A late fee of 1.5% per month will be applied to overdue balances. Thank you for your continued partnership!";
    const pNote = doc.splitTextToSize(pNoteText, colWidth);
    doc.text(pNote, margin, notesY + 8);

    // RIGHT: Bank details box at bottom
    const bankX = pageWidth - margin - colWidth;
    drawBox(bankX, bottomTopY, colWidth, 45, [255, 255, 255], colors.grayBorder);

    doc.setFontSize(7);
    doc.setTextColor(...colors.tealText);
    doc.setFont("helvetica", "bold");
    doc.text("BANK TRANSFER DETAILS", bankX + 5, bottomTopY + 6);

    doc.setFontSize(8);
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");

    const banks = Array.isArray(userSettings.bank_accounts)
      ? userSettings.bank_accounts
      : [];
    const bank =
      banks.find((b) => b.currency === invoice.currency) || banks[0];

    let bankTextY = bottomTopY + 12;
    if (bank) {
      const addLine = (l, v) => {
        doc.text(`${l}:`, bankX + 5, bankTextY);
        doc.text(safe(v) || "-", bankX + 30, bankTextY);
        bankTextY += 4;
      };
      addLine("Bank", bank.bankName);
      addLine("Name", userSettings.companyName || "Elementree");
      addLine("A/C No", bank.accountNo);
      if (bank.swift) addLine("SWIFT", bank.swift);
      else if (bank.ifsc) addLine("IFSC", bank.ifsc);
    } else {
      doc.text(
        "Please add bank details in Settings.",
        bankX + 5,
        bankTextY
      );
    }

    // --- 7. FOOTER (every page) ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...colors.grayBorder);
      doc.line(margin, FOOTER_RULE_Y, pageWidth - margin, FOOTER_RULE_Y);

      doc.setFontSize(7);
      doc.setTextColor(150);

      const website =
        userSettings.companyWebsite || "https://elementree.co.in";
      const contactLine = [
        userSettings.email,
        userSettings.companyPhone,
        website,
      ]
        .filter(Boolean)
        .join("   •   ");

      doc.text(contactLine, margin, FOOTER_TEXT_Y);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, FOOTER_TEXT_Y, {
        align: "right",
      });
    }

    doc.save(`${invoice.id}.pdf`);
    addToast("PDF Downloaded successfully!", "success");
  } catch (error) {
    console.error("PDF Gen Error", error);
    addToast("Failed to generate PDF.", "error");
  }
};
