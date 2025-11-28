const { query } = require('./config/db');
const bcrypt = require('bcrypt');

const upgrade = async () => {
    try {
        console.log("🔐 Upgrading Database for Auth...");

        // 1. Create Users Table
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                company_name VARCHAR(255)
            );
        `);

        // 2. Add user_id to other tables
        const tables = ['clients', 'invoices', 'expenses', 'settings'];
        for (const table of tables) {
            await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INT;`);
        }

        // 3. Create Default Admin User
        // Email: admin@test.com  |  Password: 123456
        const hash = await bcrypt.hash('123456', 10);
        
        // Safe Insert (Only if not exists)
        const userCheck = await query(`SELECT id FROM users WHERE email = 'admin@test.com'`);
        
        let userId;
        if (userCheck.rows.length === 0) {
            const newUser = await query(`
                INSERT INTO users (email, password, company_name) 
                VALUES ('admin@test.com', $1, 'My Company') 
                RETURNING id`, 
                [hash]
            );
            userId = newUser.rows[0].id;
            console.log("✅ User 'admin@test.com' created with password '123456'");
        } else {
            userId = userCheck.rows[0].id;
            console.log("ℹ️ User 'admin@test.com' already exists.");
        }

        // 4. Link existing data to this user so you don't lose it
        for (const table of tables) {
            await query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [userId]);
        }

        console.log("✅ Database Upgrade Complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

upgrade();