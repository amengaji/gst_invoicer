const db = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings WHERE user_id = $1', [req.userId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Return empty object so frontend keeps its defaults, don't send 404
            res.json({}); 
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    const { company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, bank_accounts, number_format } = req.body;
    
    try {
        // 1. Try to UPDATE first
        const updateResult = await db.query(
            `UPDATE settings 
             SET company_name=$1, email=$2, gstin=$3, address=$4, state=$5, invoice_prefix=$6, currency=$7, filing_frequency=$8, logo=$9, lut_number=$10, bank_accounts=$11, number_format=$12 
             WHERE user_id=$13 
             RETURNING id`,
            [company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, JSON.stringify(bank_accounts || []), number_format || 'IN', req.userId]
        );

        // 2. If no row updated, it means row doesn't exist -> INSERT
        if (updateResult.rowCount === 0) {
            await db.query(
                `INSERT INTO settings (company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, bank_accounts, number_format, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency, logo, lut_number, JSON.stringify(bank_accounts || []), number_format || 'IN', req.userId]
            );
        }

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        console.error("Settings Save Error:", err);
        res.status(500).json({ error: err.message });
    }
};