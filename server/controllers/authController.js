const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = "my_super_secret_key_123";

exports.register = async (req, res) => {
    const { email, password, companyName } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        
        // 1. Create User
        const result = await db.query(
            `INSERT INTO users (email, password, company_name) VALUES ($1, $2, $3) RETURNING id, email, company_name`,
            [email, hash, companyName]
        );
        const user = result.rows[0];
        
        // 2. Create Settings (This is likely where it was failing)
        // We use a TRY/CATCH here specifically so if settings fail, the user is still created
        try {
            await db.query(
                `INSERT INTO settings (user_id, company_name, currency, filing_frequency) VALUES ($1, $2, 'INR', 'Monthly')`,
                [user.id, companyName]
            );
        } catch (settingErr) {
            console.error("⚠️ User created, but Settings failed:", settingErr.message);
            // We continue anyway, because the user can fix settings in the UI
        }

        res.json({ message: "User registered successfully" });

    } catch (err) {
        console.error("❌ Registration Error:", err);
        // Send the ACTUAL error to the frontend so we can see it
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ token, user: { email: user.email, company: user.company_name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};