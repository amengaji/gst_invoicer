const jwt = require('jsonwebtoken');
const SECRET_KEY = "my_super_secret_key_123"; // In production, use .env


module.exports = (req, res, next) => {
    console.log("Authorization header:", req.headers.authorization);
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "No token provided" });

    try {
        // Token format: "Bearer <token>"
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.userId = decoded.id; // Attach User ID to request
        next();
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized" });
    }
};