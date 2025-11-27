const db = require('../config/db');

exports.getAllInvoices = async (req, res) => {
    try {
        // Fetch invoices
        const invResult = await db.query(`
            SELECT i.*, 
            json_build_object(
                'id', c.id, 'name', c.name, 'gstin', c.gstin, 'state', c.state, 'address', c.address, 'contacts', c.contacts
            ) as client
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            ORDER BY i.date DESC
        `);

        // Fetch items for each invoice
        const invoices = invResult.rows;
        for (let inv of invoices) {
            const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
            inv.items = itemsResult.rows.map(item => ({
                ...item,
                qty: parseFloat(item.qty),
                price: parseFloat(item.price)
            }));
        }

        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createInvoice = async (req, res) => {
    const { id, client, date, amount, tax, status, type, currency, exchangeRate, items } = req.body;
    
    // Start a "Transaction" (All or Nothing)
    const client_id = client.id;
    
    try {
        await db.query('BEGIN'); // Start

        // 1. Save Invoice Header
        await db.query(
            `INSERT INTO invoices (id, client_id, date, amount, tax, status, type, currency, exchange_rate) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, client_id, date, amount, tax, status, type, currency, exchangeRate || 1]
        );

        // 2. Save Items
        for (const item of items) {
            await db.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn, qty, price) VALUES ($1, $2, $3, $4, $5)`,
                [id, item.desc, item.hsn, item.qty, item.price]
            );
        }

        await db.query('COMMIT'); // Finish
        res.json({ message: 'Invoice Saved' });
    } catch (err) {
        await db.query('ROLLBACK'); // Undo if error
        res.status(500).json({ error: err.message });
    }
};

exports.updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status, exchangeRate } = req.body;
    try {
        await db.query(
            'UPDATE invoices SET status=$1, exchange_rate=$2 WHERE id=$3',
            [status, exchangeRate, id]
        );
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM invoices WHERE id=$1', [id]);
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};