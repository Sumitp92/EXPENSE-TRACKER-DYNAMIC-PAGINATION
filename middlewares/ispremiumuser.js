const User = require('../model/User'); 

const isPremiumUser = (req, res, next) => {
    try {
        console.log('User in isPremiumUser middleware:', req.user);

        if (req.user && req.user.isPremium) {
            return next();
        }

        return res.status(403).json({ message: 'Access only to premium user' });
    } catch (error) {
        console.error('Error in isPremiumUser middleware:', error);
        res.status(500).json({ message: 'server error' });
    }
};

module.exports = isPremiumUser;
