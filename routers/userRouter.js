const express = require('express');
const userRouter = express.Router();
const { registerUser, loginUser, getUserProfile, updateUserProfile, changePassword, getAllUsers, getUserStats } = require('../controllers/userController');
const uploads = require('../middlewares/uploads');
const { isUser, isAdmin } = require('../middlewares/auth');

// Routes: /api/users
userRouter.post("/register", uploads.single("image"), registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/profile", isUser, getUserProfile);
userRouter.patch("/profile", isUser, uploads.single("image"), updateUserProfile);
userRouter.post("/change-password", isUser, changePassword);

// Admin routes
userRouter.get("/admin/all", isUser, isAdmin, getAllUsers);
userRouter.get("/admin/stats", isUser, isAdmin, getUserStats);

module.exports = userRouter;