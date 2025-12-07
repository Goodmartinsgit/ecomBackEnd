const express = require("express");
const { initializePayment, verifyPayment, getPaymentConfig } = require("../controllers/paymentController");
const { isUser } = require("../middlewares/auth");
const paymentRouter = express.Router();

// Get payment configuration (public key)
paymentRouter.get('/config', isUser, getPaymentConfig);

// Routes: /api/payment
paymentRouter.post("/initialize", isUser, initializePayment);
paymentRouter.get("/verify", verifyPayment);
// paymentRouter.post("/webhook", paymentWebhook);

module.exports = paymentRouter;