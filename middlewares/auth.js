const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
dotenv.config();

exports.isUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Access denied. Please provide a valid token.', 401, 'NO_TOKEN'));
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return next(new AppError('Access denied. No token provided.', 401, 'NO_TOKEN'));
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Token verification failed', { error: error.message, token: token.substring(0, 20) + '...' });
        
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
        } else if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN'));
        } else {
            return next(new AppError('Token verification failed. Please log in again.', 401, 'TOKEN_VERIFICATION_FAILED'));
        }
    }
};

exports.isAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    if (req.user.role !== "ADMIN") {
        logger.warn('Unauthorized admin access attempt', { userId: req.user.id, role: req.user.role });
        return next(new AppError('Access denied. Admin privileges required.', 403, 'ADMIN_REQUIRED'));
    }
    
    next();
};

exports.isSameUser = (req, res, next) => {
    const { uuid } = req.params;
    
    if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    if (req.user.uuid !== uuid) {
        logger.warn('Unauthorized profile access attempt', { 
            userId: req.user.id, 
            requestedUuid: uuid, 
            userUuid: req.user.uuid 
        });
        return next(new AppError('Access denied. You can only access your own profile.', 403, 'PROFILE_ACCESS_DENIED'));
    }
    
    next();
};
