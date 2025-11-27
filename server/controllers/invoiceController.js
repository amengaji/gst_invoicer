const db = require('../config/db');

exports.getAllInvoices = async (req, res) => {
    try {
        const invResult = await db.query(`
            SELECT i.id, i.client_id, i.amount, i.tax, i.status, i.type, i.currency, i.exchange_rate,
            TO_CHAR(i.date, 'YYYY-MM-DD') as date,  -- <--- FIX: Force Date as String
            c.name as client_name, 
            c.gstin as client_gstin, 
            c.state as client_state, 
            c.address as client_address,
            c.city as client_city,
            c.country as client_country,
            c.contacts as client_contacts
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            ORDER BY i.date DESC
        `);

        const invoices = invResult.rows;
        
        for (let inv of invoices) {
            const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
            
            inv.client = {
                id: inv.client_id,
                name: inv.client_name,
                gstin: inv.client_gstin,
                state: inv.client_state,
                address: inv.client_address,
                city: inv.client_city,
                country: inv.client_country,
                contacts: inv.client_contacts
            };

            // Cleanup
            delete inv.client_name; delete inv.client_gstin; delete inv.client_state;
            delete inv.client_address; delete inv.client_city; delete inv.client_country; delete inv.client_contacts;

            inv.items = itemsResult.rows.map(item => ({
                ...item,
                desc: item.description, 
                qty: parseFloat(item.qty),
                price: parseFloat(item.price)
            }));
        }

        res.json(invoices);
    } catch (err) {
        console.error("Get Invoices Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.createInvoice = async (req, res) => {
    const { id, client, date, amount, tax, status, type, currency, exchangeRate, items } = req.body;
    const client_id = client.id;
    
    try {
        await db.query('BEGIN');
        await db.query(
            `INSERT INTO invoices (id, client_id, date, amount, tax, status, type, currency, exchange_rate) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, client_id, date, amount, tax, status, type, currency, exchangeRate || 1]
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
        // Check for duplicate key error code (Postgres 23505)
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Duplicate Invoice ID' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { client, date, amount, tax, status, type, currency, exchangeRate, items } = req.body;
    const client_id = client.id;

    try {
        await db.query('BEGIN');
        await db.query(
            `UPDATE invoices 
             SET client_id=$1, date=$2, amount=$3, tax=$4, status=$5, type=$6, currency=$7, exchange_rate=$8 
             WHERE id=$9`,
            [client_id, date, amount, tax, status, type, currency, exchangeRate || 1, id]
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
    } catch (err) {
        await db.query('ROLLBACK');
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