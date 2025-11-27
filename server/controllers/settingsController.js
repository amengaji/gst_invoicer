const db = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({});
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    const { company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, bank_accounts } = req.body;
    try {
        // Check if row exists
        const check = await db.query('SELECT id FROM settings LIMIT 1');

        if (check.rows.length === 0) {
            await db.query(
                `INSERT INTO settings (company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, bank_accounts)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, JSON.stringify(bank_accounts)]
            );
        } else {
            await db.query(
                `UPDATE settings SET company_name=$1, email=$2, gstin=$3, address=$4, state=$5, invoice_prefix=$6, currency=$7, filing_frequency=$8, logo=$9, lut_number=$10, bank_accounts=$11 WHERE id=$12`,
                [company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, JSON.stringify(bank_accounts), check.rows[0].id]
            );
        }
        res.json({ message: 'Settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};