const db = require('../config/db');

exports.getAllInvoices = async (req, res) => {
    try {
        // FIX: Use TO_CHAR for date to prevent timezone shifts
        const invResult = await db.query(`
            SELECT i.*, 
            TO_CHAR(i.date, 'YYYY-MM-DD') as formatted_date,
            c.name as client_name, c.gstin as client_gstin, c.state as client_state, 
            c.address as client_address, c.city as client_city, c.country as client_country, c.contacts as client_contacts
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.user_id = $1
            ORDER BY i.date DESC
        `, [req.userId]);

        const invoices = invResult.rows;
        
        for (let inv of invoices) {
            // Fetch items
            const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
            
            // Reconstruct Client Object safely
            inv.client = {
                id: inv.client_id,
                name: inv.client_name || 'Unknown Client',
                gstin: inv.client_gstin,
                state: inv.client_state || 'Maharashtra',
                address: inv.client_address,
                city: inv.client_city,
                country: inv.client_country,
                contacts: inv.client_contacts || []
            };

            // Use the formatted date string from DB
            if(inv.formatted_date) inv.date = inv.formatted_date;

            // Clean up flat fields to keep JSON clean
            delete inv.client_name; delete inv.client_gstin; delete inv.client_state;
            delete inv.client_address; delete inv.client_city; delete inv.client_country; delete inv.client_contacts;
            delete inv.formatted_date;

            inv.items = itemsResult.rows.map(item => ({
                ...item,
                desc: item.description, 
                qty: parseFloat(item.qty) || 0,
                price: parseFloat(item.price) || 0
            }));
        }
        res.json(invoices);
    } catch (err) { 
        console.error("Get Invoices Error:", err); // Check your server terminal if this prints!
        res.status(500).json({ error: err.message }); 
    }
};

exports.createInvoice = async (req, res) => {
    const { id, client, date, amount, tax, status, type, currency, exchangeRate, items } = req.body;
    try {
        await db.query('BEGIN');
        await db.query(
            `INSERT INTO invoices (id, client_id, date, amount, tax, status, type, currency, exchange_rate, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, client.id, date, amount, tax, status, type, currency, exchangeRate || 1, req.userId]
        );

        for (const item of items) {
            await db.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn, qty, price) VALUES ($1, $2, $3, $4, $5)`,
                [id, item.desc, item.hsn, item.qty, item.price]
            );
        }
        await db.query('COMMIT');
        res.json({ message: 'Invoice Saved' });
    } catch (err) {
        await db.query('ROLLBACK');
        if (err.code === '23505') return res.status(409).json({ error: 'Duplicate Invoice ID' });
        res.status(500).json({ error: err.message });
    }
};

exports.updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { client, date, amount, tax, status, type, currency, exchangeRate, items } = req.body;
    try {
        await db.query('BEGIN');
        await db.query(
            `UPDATE invoices 
             SET client_id=$1, date=$2, amount=$3, tax=$4, status=$5, type=$6, currency=$7, exchange_rate=$8 
             WHERE id=$9 AND user_id=$10`,
            [client.id, date, amount, tax, status, type, currency, exchangeRate || 1, id, req.userId]
        );
        await db.query('DELETE FROM invoice_items WHERE invoice_id=$1', [id]);
        for (const item of items) {
            await db.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn, qty, price) VALUES ($1, $2, $3, $4, $5)`,
                [id, item.desc, item.hsn, item.qty, item.price]
            );
        }
        await db.query('COMMIT');
        res.json({ message: 'Invoice Updated' });
    } catch (err) { await db.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
};

exports.updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status, exchangeRate } = req.body;
    try {
        await db.query(
            'UPDATE invoices SET status=$1, exchange_rate=$2 WHERE id=$3 AND user_id=$4',
            [status, exchangeRate, id, req.userId]
        );
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('BEGIN');
        
        // 1. Delete Items First (Crucial!)
        await db.query('DELETE FROM invoice_items WHERE invoice_id=$1', [id]);
        
        // 2. Delete Invoice
        const result = await db.query('DELETE FROM invoices WHERE id=$1 AND user_id=$2', [id, req.userId]);
        
        if (result.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: "Invoice not found or access denied" });
        }
        
        await db.query('COMMIT');
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
};