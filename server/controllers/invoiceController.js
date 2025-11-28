const db = require('../config/db');

exports.getAllInvoices = async (req, res) => {
    try {
        // FIX: Added date_paid to the select with formatting
        const invResult = await db.query(`
            SELECT i.*, 
            TO_CHAR(i.date, 'YYYY-MM-DD') as formatted_date,
            TO_CHAR(i.date_paid, 'YYYY-MM-DD') as formatted_date_paid,
            c.name as client_name, c.gstin as client_gstin, c.state as client_state, 
            c.address as client_address, c.city as client_city, c.country as client_country, c.contacts as client_contacts
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.user_id = $1
            ORDER BY i.date DESC
        `, [req.userId]);

        const invoices = invResult.rows;
        
        for (let inv of invoices) {
            const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
            
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

            // Use the formatted date strings
            if(inv.formatted_date) inv.date = inv.formatted_date;
            if(inv.formatted_date_paid) inv.date_paid = inv.formatted_date_paid;

            // Cleanup
            delete inv.client_name; delete inv.client_gstin; delete inv.client_state;
            delete inv.client_address; delete inv.client_city; delete inv.client_country; delete inv.client_contacts;
            delete inv.formatted_date; delete inv.formatted_date_paid;

            inv.items = itemsResult.rows.map(item => ({
                ...item,
                desc: item.description, 
                qty: parseFloat(item.qty) || 0,
                price: parseFloat(item.price) || 0
            }));
        }
        res.json(invoices);
    } catch (err) { 
        console.error("Get Invoices Error:", err); 
        res.status(500).json({ error: err.message }); 
    }
};

exports.createInvoice = async (req, res) => {
    console.log("📥 Incoming Invoice Payload:", req.body);

    // Added datePaid to destructuring
    const { id, client, date, amount, tax, status, type, currency, exchangeRate, items, datePaid } = req.body;
    try {
        await db.query('BEGIN');
        await db.query(
            `INSERT INTO invoices (id, client_id, date, amount, tax, status, type, currency, exchange_rate, date_paid, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, client.id, date, amount, tax, status, type, currency, exchangeRate || 1, datePaid || null, req.userId]
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
    // Added datePaid to destructuring
    const { client, date, amount, tax, status, type, currency, exchangeRate, items, datePaid } = req.body;
    try {
        await db.query('BEGIN');
        // FIX: Update date_paid column
        await db.query(
            `UPDATE invoices 
             SET client_id=$1, date=$2, amount=$3, tax=$4, status=$5, type=$6, currency=$7, exchange_rate=$8, date_paid=$9 
             WHERE id=$10 AND user_id=$11`,
            [client.id, date, amount, tax, status, type, currency, exchangeRate || 1, datePaid || null, id, req.userId]
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
    // If marking as Paid, default date_paid to TODAY. If Unpaid, NULL.
    const datePaid = status === 'Paid' ? new Date() : null;
    
    try {
        await db.query(
            'UPDATE invoices SET status=$1, exchange_rate=$2, date_paid=$3 WHERE id=$4 AND user_id=$5',
            [status, exchangeRate, datePaid, id, req.userId]
        );
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM invoices WHERE id=$1 AND user_id=$2', [id, req.userId]);
        res.json({ message: 'Invoice deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};