const express = require('express');
const { createCategory, getAllCategories, getSingleCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { isUser, isAdmin } = require('../middlewares/auth');
const categoryRouter = express.Router();

// Routes: /api/categories
categoryRouter.post("/", isUser, isAdmin, createCategory)
categoryRouter.get("/", getAllCategories)
categoryRouter.get("/:name", getSingleCategory)
categoryRouter.patch("/", isUser, isAdmin, updateCategory)
categoryRouter.delete("/", isUser, isAdmin, deleteCategory)

module.exports = { categoryRouter };