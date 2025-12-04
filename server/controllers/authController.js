const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require("speakeasy");

const SECRET_KEY = "my_super_secret_key_123"; // TODO: move to .env later


// ============================
// REGISTER (Protected with TOTP)
// ============================
exports.register = async (req, res) => {
    const { email, password, companyName, totp } = req.body;

    try {
        // =======================================
        // 🔐 1. Verify Authenticator Code (TOTP)
        // =======================================
        const isValid = speakeasy.totp.verify({
            secret: process.env.TOTP_SECRET,   // from your .env
            encoding: "base32",
            token: totp,
            window: 1                          // small time drift allowed
        });

        if (!isValid) {
            return res.status(403).json({
                error: "Invalid authenticator code"
            });
        }

        // =======================================
        // 🔍 2. Check if email already exists
        // =======================================
        const exists = await db.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (exists.rows.length > 0) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // =======================================
        // 🔐 3. Hash password
        // =======================================
        const hash = await bcrypt.hash(password, 10);

        // =======================================
        // 🧑‍💼 4. Create user
        // =======================================
        const result = await db.query(
            `INSERT INTO users (email, password, company_name)
             VALUES ($1, $2, $3)
             RETURNING id, email, company_name`,
            [email, hash, companyName]
        );

        const user = result.rows[0];
        console.log("✅ User created:", user.email);

        // =======================================
        // ⚙️ 5. Create settings row (default values)
        // =======================================
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
        }

        return res.json({ message: "User registered successfully" });

    } catch (err) {
        console.error("❌ Registration Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
};



// ============================
// LOGIN (unchanged)
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

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                company: user.company_name
            }
        });

    } catch (err) {
        console.error("❌ Login Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
};
