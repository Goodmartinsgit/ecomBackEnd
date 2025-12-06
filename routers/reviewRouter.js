const express = require("express");
const { createReview, getProductReviews, getUserReviews } = require("../controllers/reviewController");
const { isUser } = require("../middlewares/auth");
const { upload } = require("../middlewares/uploads");

const reviewRouter = express.Router();

// Routes: /api/reviews
reviewRouter.post("/", isUser, upload.array('images', 5), createReview);
reviewRouter.get("/product/:productId", getProductReviews);
reviewRouter.get("/user", isUser, getUserReviews);

module.exports = reviewRouter;
