const { Pool } = require('pg');
require('dotenv').config();

// Connect to the database using the URL from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false // Disable SSL for local database
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};