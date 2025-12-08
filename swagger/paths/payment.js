/**
 * @swagger
 * /api/payment/initialize:
 *   post:
 *     tags: [Payment]
 *     summary: Initialize payment with Flutterwave
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, email]
 *             properties:
 *               amount: { type: number }
 *               email: { type: string }
 *               orderId: { type: integer }
 *     responses:
 *       200:
 *         description: Payment initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 paymentLink: { type: string }
 *                 transactionId: { type: string }
 *
 * /api/payment/verify:
 *   get:
 *     tags: [Payment]
 *     summary: Verify payment transaction
 *     parameters:
 *       - in: query
 *         name: transaction_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 status: { type: string }
 *                 amount: { type: number }
 */
