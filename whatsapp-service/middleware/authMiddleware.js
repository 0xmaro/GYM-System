require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const secret = process.env.WHATSAPP_SERVICE_SECRET;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== secret) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    next();
};

module.exports = authMiddleware;
