//server/index.js
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// 1. Allow the Frontend (Port 5173) to talk to us
app.use(cors());

// 2. Allow us to read JSON data sent in requests (up to 50mb for images)
app.use(express.json({ limit: '50mb' }));

// --- Routes ---
app.use('/api', apiRoutes);

const path = require('path');

// 1. Tell node to serve the files from the build folder
// (Change 'client/build' to wherever your frontend build is located)
app.use(express.static(path.join(__dirname, 'client/build')));

// 2. Handle any requests that don't match the above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});