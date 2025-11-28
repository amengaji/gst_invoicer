const { query } = require('./config/db');

const upgrade = async () => {
    try {
        console.log("🔐 Upgrading Database Structure...");

        // 1. Create Users Table if missing
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                company_name VARCHAR(255)
            );
        `);

        console.log("✔ users table ensured");

        // 2. Ensure user_id exists on the required tables
        const tables = ['clients', 'invoices', 'expenses', 'settings'];
        for (const table of tables) {
            await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INT;`);
            console.log(`✔ user_id added to ${table}`);
        }

        console.log("🎉 Database Upgrade Complete (No Default User Created)");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error during upgrade:", err);
        process.exit(1);
    }
};

upgrade();
