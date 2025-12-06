const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create a review
exports.createReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body;
    const userId = req.user.id;
    const images = req.files?.map(file => file.path) || [];

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        userId: parseInt(userId),
        status: "DELIVERED"
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not yet delivered"
      });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        orderId: parseInt(orderId),
        userId: parseInt(userId),
        productId: parseInt(productId)
      }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId: parseInt(orderId),
        userId: parseInt(userId),
        productId: parseInt(productId),
        rating: parseInt(rating),
        comment: comment || "",
        images: images
      }
    });

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create review"
    });
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        productId: parseInt(productId)
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await prisma.review.findMany({
      where: {
        userId: parseInt(userId)
      },
      include: {
        order: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
};
