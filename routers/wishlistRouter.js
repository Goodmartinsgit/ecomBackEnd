const express = require('express');
const wishlistRouter = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, clearWishlist } = require('../controllers/wishlistController');
const { isUser } = require('../middlewares/auth');

// Routes: /api/wishlist
wishlistRouter.get('/', isUser, getWishlist);
wishlistRouter.post('/', isUser, addToWishlist);
wishlistRouter.delete('/clear', isUser, clearWishlist);
wishlistRouter.delete('/:productId', isUser, removeFromWishlist);

module.exports = wishlistRouter;
