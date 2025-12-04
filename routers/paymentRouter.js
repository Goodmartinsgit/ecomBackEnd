const express = require("express");
const { initializePayment, verifyPayment } = require("../controllers/paymentController");
const { isUser } = require("../middlewares/auth");
const paymentRouter = express.Router();

// Routes: /api/payment
paymentRouter.post("/initialize", isUser, initializePayment);
paymentRouter.get("/verify", verifyPayment);
// paymentRouter.post("/webhook", paymentWebhook);

module.exports = paymentRouter;

