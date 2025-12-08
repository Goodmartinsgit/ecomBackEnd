const express = require('express');
const userRouter = express.Router();
const { registerUser, loginUser, getUserProfile, updateUserProfile, changePassword, getAllUsers, getUserStats, forgotPassword, resetPassword } = require('../controllers/userController');
const uploads = require('../middlewares/uploads');
const { isUser, isAdmin } = require('../middlewares/auth');

// Routes: /api/users
// Routes: /api/users

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *       400:
 *         description: Invalid input or user already exists
 */
userRouter.post("/register", uploads.single("image"), registerUser);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login an existing user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/profile", isUser, getUserProfile);
userRouter.patch("/profile", isUser, uploads.single("image"), updateUserProfile);
userRouter.post("/change-password", isUser, changePassword);

// Admin routes
userRouter.get("/admin/all", isUser, isAdmin, getAllUsers);
userRouter.get("/admin/stats", isUser, isAdmin, getUserStats);

module.exports = userRouter;