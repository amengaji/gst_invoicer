// server/controllers/backupController.js
const db = require('../config/db');

/* ---------------------------------------------------------
   EXPORT DATA (BACKUP)
--------------------------------------------------------- */
exports.createBackup = async (req, res) => {
    try {
        // 1. Fetch data from all tables
        const clients = await db.query('SELECT * FROM clients');
        const invoices = await db.query('SELECT * FROM invoices');
        const invoiceItems = await db.query('SELECT * FROM invoice_items');
        const expenses = await db.query('SELECT * FROM expenses');
        const settings = await db.query('SELECT * FROM settings');

        // 2. Bundle into a single JSON object
        const backupData = {
            metadata: {
                version: '1.0',
                timestamp: new Date().toISOString(),
                exported_by: req.userId
            },
            data: {
                clients: clients.rows,
                invoices: invoices.rows,
                invoice_items: invoiceItems.rows,
                expenses: expenses.rows,
                settings: settings.rows
            }
        };

        // 3. Send as downloadable JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=zenith_backup_${Date.now()}.json`);
        res.status(200).json(backupData);

    } catch (err) {
        console.error("Backup Error:", err);
        res.status(500).json({ error: "Failed to create backup" });
    }
};

/* ---------------------------------------------------------
   RESTORE DATA
--------------------------------------------------------- */
exports.restoreBackup = async (req, res) => {
    const { data } = req.body;

    if (!data || !data.clients || !data.invoices) {
        return res.status(400).json({ error: "Invalid backup file format" });
    }

    try {
        await db.query('BEGIN');

        // 1. CLEAR EXISTING DATA (Order matters due to Foreign Keys!)
        // Delete children first, then parents
        await db.query('TRUNCATE invoice_items, invoices, clients, expenses, settings RESTART IDENTITY CASCADE');

        // 2. RESTORE CLIENTS
        for (const c of data.clients) {
            await db.query(
                `INSERT INTO clients (id, name, gstin, address, city, state, country, contacts, user_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [c.id, c.name, c.gstin, c.address, c.city, c.state, c.country, JSON.stringify(c.contacts), req.userId, c.created_at]
            );
        }

        // 3. RESTORE SETTINGS
        for (const s of data.settings) {
            // Settings typically just have 1 row per user, but we'll insert what was backed up
            await db.query(
                `INSERT INTO settings (id, user_id, company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, bank_accounts, number_format)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [s.id, req.userId, s.company_name, s.email, s.gstin, s.address, s.state, s.invoice_prefix, s.currency, s.filing_frequency, s.logo, s.lut_number, s.bank_accounts, s.number_format] // Ensure bank_accounts is JSON stringified if needed, usually Postgres driver handles object->json automatically if type is jsonb
            );
        }

        // 4. RESTORE EXPENSES
        for (const e of data.expenses) {
            await db.query(
                `INSERT INTO expenses (id, user_id, date, category, amount, gst_paid, receipt_data, receipt_name, vendor_name, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [e.id, req.userId, e.date, e.category, e.amount, e.gst_paid, e.receipt_data, e.receipt_name, e.vendor_name, e.description]
            );
        }

        // 5. RESTORE INVOICES (Parent)
        for (const i of data.invoices) {
            await db.query(
                `INSERT INTO invoices (id, user_id, client_id, date, amount, tax, status, type, currency, exchange_rate, date_paid)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [i.id, req.userId, i.client_id, i.date, i.amount, i.tax, i.status, i.type, i.currency, i.exchange_rate, i.date_paid]
            );
        }

        // 6. RESTORE INVOICE ITEMS (Child)
        for (const item of data.invoice_items) {
            await db.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn, qty, price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [item.invoice_id, item.description, item.hsn, item.qty, item.price]
            );
        }

        await db.query('COMMIT');
        res.json({ message: "Data restored successfully! Please refresh." });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Restore Error:", err);
        res.status(500).json({ error: "Restore failed: " + err.message });
    }
};