// server/controllers/invoiceController.js
const db = require('../config/db');

/* ---------------------------------------------------------
   DATE NORMALIZATION - UNIVERSAL TIMEZONE FIX
--------------------------------------------------------- */
const normalizeDate = (rawDate) => {
  if (!rawDate) return null;
 
  // 1. Handle ISO Format (YYYY-MM-DD) - Standard HTML5 Input
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate;
  }

  // 2. Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = rawDate.split(/[\/\-]/); // supports / or -
 
  if (parts.length !== 3) return null;
 
  let [d, m, y] = parts;
 
  // Convert to integers
  d = parseInt(d, 10);
  m = parseInt(m, 10);
  y = parseInt(y, 10);
 
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
 
  // Convert YY → YYYY
  if (y < 100) {
    y = y < 50 ? 2000 + y : 1900 + y; // Handles “25” → 2025, “89” → 1989
  }
 
  // Validate day/month/year ranges
  if (m < 1 || m > 12) return null;
 
  const maxDay = new Date(y, m, 0).getDate(); // last day of month
  if (d < 1 || d > maxDay) return null;
 
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
 
  return `${y}-${mm}-${dd}`; // ISO format
};

/* ---------------------------------------------------------
   GET ALL INVOICES
--------------------------------------------------------- */

exports.getAllInvoices = async (req, res) => {
    try {
        const invResult = await db.query(`
            SELECT 
                i.*,
                TO_CHAR(i.date, 'YYYY-MM-DD') AS formatted_date,
                TO_CHAR(i.date_paid, 'YYYY-MM-DD') AS formatted_date_paid,
                c.name AS client_name,
                c.gstin AS client_gstin,
                c.state AS client_state,
                c.address AS client_address,
                c.city AS client_city,
                c.country AS client_country,
                c.contacts AS client_contacts
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.user_id = $1
            ORDER BY i.date DESC
        `, [req.userId]);

        const invoices = invResult.rows;

        for (let inv of invoices) {
            const itemsResult = await db.query(
                'SELECT * FROM invoice_items WHERE invoice_id = $1',
                [inv.id]
            );

            inv.client = {
                id: inv.client_id,
                name: inv.client_name || "Unknown Client",
                gstin: inv.client_gstin,
                state: inv.client_state,
                address: inv.client_address,
                city: inv.client_city,
                country: inv.client_country,
                contacts: inv.client_contacts || []
            };

            // Use the clean DB strings
            inv.date = inv.formatted_date || inv.date;
            inv.date_paid = inv.formatted_date_paid || inv.date_paid;

            // Clean extra fields
            delete inv.client_name;
            delete inv.client_gstin;
            delete inv.client_state;
            delete inv.client_address;
            delete inv.client_city;
            delete inv.client_country;
            delete inv.client_contacts;
            delete inv.formatted_date;
            delete inv.formatted_date_paid;

            inv.items = itemsResult.rows.map(item => ({
                ...item,
                desc: item.description,
                qty: parseFloat(item.qty),
                price: parseFloat(item.price)
            }));
        }

        res.json(invoices);
    } catch (err) {
        console.error("❌ Get Invoices Error:", err);
        res.status(500).json({ error: err.message });
    }
};


/* ---------------------------------------------------------
   CREATE INVOICE
--------------------------------------------------------- */

exports.createInvoice = async (req, res) => {
    console.log("📥 Create Invoice Payload - Date:", req.body.date);

    const { id, client, amount, tax, status, type, currency, exchangeRate, items } = req.body;

    const normalizedDate = normalizeDate(req.body.date);
    const normalizedPaid = req.body.datePaid ? normalizeDate(req.body.datePaid) : null;

    console.log("✅ Normalized to:", normalizedDate);

    try {
        await db.query("BEGIN");

        await db.query(`
            INSERT INTO invoices 
            (id, client_id, date, amount, tax, status, type, currency, exchange_rate, date_paid, user_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
            id,
            client.id,
            normalizedDate,
            amount,
            tax,
            status,
            type,
            currency,
            exchangeRate || 1,
            normalizedPaid,
            req.userId
        ]);

        for (const item of items) {
            await db.query(`
                INSERT INTO invoice_items (invoice_id, description, hsn, qty, price)
                VALUES ($1,$2,$3,$4,$5)
            `, [id, item.desc, item.hsn, item.qty, item.price]);
        }

        await db.query("COMMIT");
        res.json({ message: "Invoice Saved" });

    } catch (err) {
        await db.query("ROLLBACK");
        console.error("❌ Create Invoice Error:", err);
        if (err.code === "23505") return res.status(409).json({ error: "Duplicate Invoice ID" });
        res.status(500).json({ error: err.message });
    }
};


/* ---------------------------------------------------------
   UPDATE INVOICE
--------------------------------------------------------- */

exports.updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { client, amount, tax, status, type, currency, exchangeRate, items } = req.body;

    const normalizedDate = normalizeDate(req.body.date);
    const normalizedPaid = req.body.datePaid ? normalizeDate(req.body.datePaid) : null;

    try {
        await db.query("BEGIN");

        await db.query(`
            UPDATE invoices 
            SET client_id=$1, date=$2, amount=$3, tax=$4, status=$5, type=$6,
                currency=$7, exchange_rate=$8, date_paid=$9
            WHERE id=$10 AND user_id=$11
        `, [
            client.id,
            normalizedDate,
            amount,
            tax,
            status,
            type,
            currency,
            exchangeRate || 1,
            normalizedPaid,
            id,
            req.userId
        ]);

        await db.query('DELETE FROM invoice_items WHERE invoice_id=$1', [id]);

        for (const item of items) {
            await db.query(`
                INSERT INTO invoice_items (invoice_id, description, hsn, qty, price)
                VALUES ($1,$2,$3,$4,$5)
            `, [id, item.desc, item.hsn, item.qty, item.price]);
        }

        await db.query("COMMIT");
        res.json({ message: "Invoice Updated" });

    } catch (err) {
        await db.query("ROLLBACK");
        console.error("❌ Update Invoice Error:", err);
        res.status(500).json({ error: err.message });
    }
};


/* ---------------------------------------------------------
   UPDATE STATUS
--------------------------------------------------------- */

exports.updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status, exchangeRate } = req.body;

    // Use current date
    const today = new Date().toISOString().split('T')[0];
    const normalizedPaid = status === "Paid" ? today : null;

    try {
        await db.query(`
            UPDATE invoices 
            SET status=$1, exchange_rate=$2, date_paid=$3
            WHERE id=$4 AND user_id=$5
        `, [status, exchangeRate, normalizedPaid, id, req.userId]);

        res.json({ message: "Status updated" });

    } catch (err) {
        console.error("❌ Status Update Error:", err);
        res.status(500).json({ error: err.message });
    }
};


/* ---------------------------------------------------------
   DELETE INVOICE
--------------------------------------------------------- */

exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(
            'DELETE FROM invoices WHERE id=$1 AND user_id=$2',
            [id, req.userId]
        );
        res.json({ message: "Invoice deleted" });

    } catch (err) {
        console.error("❌ Delete Invoice Error:", err);
        res.status(500).json({ error: err.message });
    }
};