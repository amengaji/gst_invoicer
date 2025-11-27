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

// --- NEW: Update Expense ---
exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { category, date, amount, gst_paid, receipt, receiptName } = req.body;
    try {
        await db.query(
            'UPDATE expenses SET category=$1, date=$2, amount=$3, gst_paid=$4, receipt_data=$5, receipt_name=$6 WHERE id=$7',
            [category, date, amount, gst_paid, receipt, receiptName, id]
        );
        res.json({ message: 'Expense updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- NEW: Delete Expense ---
exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM expenses WHERE id=$1', [id]);
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};