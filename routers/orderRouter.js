const express = require('express');
const orderRouter = express.Router();
const { getUserOrders, getOrderDetails, cancelOrder, getOrderStats, getAllOrders, getAdminOrderStats, updateOrderStatus, getOrderTracking } = require('../controllers/orderController');
const { isUser, isAdmin } = require('../middlewares/auth');

// Routes: /api/orders
orderRouter.get('/stats', isUser, getOrderStats);
orderRouter.get('/', isUser, getUserOrders);
orderRouter.get('/:orderId', isUser, getOrderDetails);
orderRouter.get('/:orderId/tracking', isUser, getOrderTracking);
orderRouter.patch('/:orderId/cancel', isUser, cancelOrder);

// Admin routes
orderRouter.get('/admin/all', isUser, isAdmin, getAllOrders);
orderRouter.get('/admin/stats', isUser, isAdmin, getAdminOrderStats);
orderRouter.patch('/admin/:orderId/status', isUser, isAdmin, updateOrderStatus);

module.exports = orderRouter;
