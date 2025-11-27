const db = require('../config/db');

exports.getAllClients = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM clients ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createClient = async (req, res) => {
    const { id, name, gstin, address, city, state, country, contacts } = req.body;
    try {
        // Prepare the JSON for contacts
        const contactsJson = JSON.stringify(contacts || []);
        
        await db.query(
            'INSERT INTO clients (id, name, gstin, address, city, state, country, contacts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, name, gstin, address, city, state, country, contactsJson]
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
        const contactsJson = JSON.stringify(contacts || []);
        await db.query(
            'UPDATE clients SET name=$1, gstin=$2, address=$3, city=$4, state=$5, country=$6, contacts=$7 WHERE id=$8',
            [name, gstin, address, city, state, country, contactsJson, id]
        );
        res.json({ message: 'Client updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM clients WHERE id=$1', [id]);
        res.json({ message: 'Client deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};