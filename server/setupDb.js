const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

const setup = async () => {
    try {
        // Read the SQL commands from the models folder
        const sqlPath = path.join(__dirname, 'models', 'database.sql');
        const sql = fs.readFileSync(sqlPath).toString();

        console.log("⏳ Connecting to Database...");
        // Run the SQL commands
        await query(sql);

        console.log("✅ Database Tables Created Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        console.error("Hint: Check your password in .env file");
        process.exit(1);
    }
};

setup();