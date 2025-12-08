/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get user cart
 *     responses:
 *       200:
 *         description: Cart retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: integer }
 *               quantity: { type: integer, minimum: 1 }
 *               size: { type: string }
 *               color: { type: string }
 *     responses:
 *       200:
 *         description: Item added to cart
 *   delete:
 *     tags: [Cart]
 *     summary: Clear cart
 *     responses:
 *       200:
 *         description: Cart cleared
 *
 * /api/cart/{productId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Cart updated
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Item removed
 */
