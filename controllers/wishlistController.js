const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET user wishlist
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          },
          orderBy: {
            addedAt: 'desc'
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: wishlist || { items: [] }
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist"
    });
  }
};

// ADD to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Ensure wishlist exists
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: parseInt(productId)
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist"
      });
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: parseInt(productId)
      },
      include: {
        product: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "Added to wishlist successfully",
      data: wishlistItem
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to wishlist"
    });
  }
};

// REMOVE from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    const wishlistItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: parseInt(productId)
        }
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Product not in wishlist"
      });
    }

    await prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: parseInt(productId)
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Removed from wishlist successfully"
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove from wishlist"
    });
  }
};

// CLEAR entire wishlist
exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id }
    });

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully"
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist"
    });
  }
};
