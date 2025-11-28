const db = require('../config/db');

exports.getAllClients = async (req, res) => {
    try {
        // Filter by user_id
        const result = await db.query('SELECT * FROM clients WHERE user_id = $1 ORDER BY name ASC', [req.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createClient = async (req, res) => {
    const { id, name, gstin, address, city, state, country, contacts } = req.body;
    try {
        // Insert with user_id
        await db.query(
            'INSERT INTO clients (id, name, gstin, address, city, state, country, contacts, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, name, gstin, address, city, state, country, JSON.stringify(contacts || []), req.userId]
        );
        res.json({ message: 'Client created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateClient = async (req, res) => {
    const { id } = req.params;
    const { name, gstin, address, city, state, country, contacts } = req.body;
    try {
        // Ensure user owns this client before updating
        await db.query(
            'UPDATE clients SET name=$1, gstin=$2, address=$3, city=$4, state=$5, country=$6, contacts=$7 WHERE id=$8 AND user_id=$9',
            [name, gstin, address, city, state, country, JSON.stringify(contacts || []), id, req.userId]
        );
        res.json({ message: 'Client updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        // Ensure user owns this client before deleting
        await db.query('DELETE FROM clients WHERE id=$1 AND user_id=$2', [id, req.userId]);
        res.json({ message: 'Client deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};