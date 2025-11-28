const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = "my_super_secret_key_123"; // Move to ENV later

// ============================
// REGISTER
// ============================
exports.register = async (req, res) => {
    const { email, password, companyName } = req.body;

    try {
        // 1. Check if email already exists
        const exists = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // 2. Hash password
        const hash = await bcrypt.hash(password, 10);

        // 3. Create User
        const result = await db.query(
            `INSERT INTO users (email, password, company_name)
             VALUES ($1, $2, $3)
             RETURNING id, email, company_name`,
            [email, hash, companyName]
        );

        const user = result.rows[0];
        console.log("✅ User created:", user.email);

        // 4. Create FULL settings row (no missing columns)
        try {
            await db.query(
                `INSERT INTO settings (
                    user_id,
                    company_name,
                    email,
                    gstin,
                    address,
                    state,
                    invoice_prefix,
                    currency,
                    filing_frequency,
                    logo,
                    lut_number,
                    bank_accounts,
                    number_format
                ) VALUES (
                    $1, $2, '', '', '', '',
                    'INV', 'INR', 'Monthly', '', '', '[]', 'IN'
                )`,
                [user.id, companyName]
            );

            console.log("✅ Settings created for user:", user.email);

        } catch (settingErr) {
            console.error("⚠️ Settings creation failed:", settingErr.message);
            // Continue - user can update settings manually
        }

        res.json({ message: "User registered successfully" });

    } catch (err) {
        console.error("❌ Registration Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ============================
// LOGIN
// ============================
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check user existence
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = result.rows[0];

        // 2. Password check
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { id: user.id },
            SECRET_KEY,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                company: user.company_name
            }
        });

    } catch (err) {
        console.error("❌ Login Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};
