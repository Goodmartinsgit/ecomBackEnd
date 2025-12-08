/**
 * @swagger
 * /api/addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: Get user addresses
 *     responses:
 *       200:
 *         description: List of addresses
 *   post:
 *     tags: [Addresses]
 *     summary: Add new address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [street, city, state, country, zipCode]
 *             properties:
 *               street: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               zipCode: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Address created
 *
 * /api/addresses/{id}:
 *   put:
 *     tags: [Addresses]
 *     summary: Update address
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               street: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       200:
 *         description: Address updated
 *   delete:
 *     tags: [Addresses]
 *     summary: Delete address
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Address deleted
 *
 * /api/addresses/{id}/default:
 *   patch:
 *     tags: [Addresses]
 *     summary: Set address as default
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Default address updated
 */
