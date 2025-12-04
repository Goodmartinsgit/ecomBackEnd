const express = require("express");
const { createProduct, getAllProducts, getSingleProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const uploads = require("../middlewares/uploads");
const { isUser, isAdmin } = require("../middlewares/auth");

const productRouter = express.Router();

// Routes: /api/products
productRouter.post("/", isUser, isAdmin, uploads.single("image"), createProduct);
productRouter.get("/", getAllProducts)
productRouter.get("/:id", getSingleProduct)
productRouter.patch("/", isUser, isAdmin, updateProduct)
productRouter.delete("/", isUser, isAdmin, deleteProduct)

module.exports = productRouter