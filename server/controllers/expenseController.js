const db = require('../config/db');

exports.getAllExpenses = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM expenses ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createExpense = async (req, res) => {
    const { id, category, date, amount, gst_paid, receipt, receiptName } = req.body;
    try {
        await db.query(
            'INSERT INTO expenses (id, category, date, amount, gst_paid, receipt_data, receipt_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, category, date, amount, gst_paid, receipt, receiptName]
        );
        res.json({ message: 'Expense added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};