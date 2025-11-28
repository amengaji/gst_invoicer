const db = require('../config/db');

exports.getAllExpenses = async (req, res) => {
    try {
        // Filter by user_id
        const result = await db.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC', [req.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createExpense = async (req, res) => {
    const { id, category, date, amount, gst_paid, receipt, receiptName } = req.body;
    try {
        // Insert with user_id
        await db.query(
            'INSERT INTO expenses (id, category, date, amount, gst_paid, receipt_data, receipt_name, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, category, date, amount, gst_paid, receipt, receiptName, req.userId]
        );
        res.json({ message: 'Expense added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { category, date, amount, gst_paid, receipt, receiptName } = req.body;
    try {
        await db.query(
            'UPDATE expenses SET category=$1, date=$2, amount=$3, gst_paid=$4, receipt_data=$5, receipt_name=$6 WHERE id=$7 AND user_id=$8',
            [category, date, amount, gst_paid, receipt, receiptName, id, req.userId]
        );
        res.json({ message: 'Expense updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM expenses WHERE id=$1 AND user_id=$2', [id, req.userId]);
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};