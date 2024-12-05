const jwt = require('jsonwebtoken');
const User = require('../model/User'); 
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);
        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        req.user = { id: decoded.userId, isPremium: user.isPremium };
        console.log('Authenticated user:', req.user);
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        return res.status(403).json({ success: false, message: 'Failed to authenticate token' });
    }
};

module.exports = { authenticate };
