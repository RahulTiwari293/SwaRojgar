/**
 * auth.js — JWT Authentication Middleware
 *
 * Usage:
 *   const { authMiddleware } = require('./auth');
 *   router.get('/protected', authMiddleware, handler);
 *
 * The frontend must send: Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'swarojgar_dev_secret_change_in_prod';

// ─── Generate token ────────────────────────────────────────────────────────────
function generateToken(userId, userType) {
    return jwt.sign(
        { userId, userType },
        JWT_SECRET,
        { expiresIn: '7d' }  // stays logged in for 7 days
    );
}

// ─── Verify middleware ─────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // { userId, userType, iat, exp }
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

module.exports = { generateToken, authMiddleware };
