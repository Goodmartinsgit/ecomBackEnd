const { prisma } = require('../config/database');
const { validateRequired, sanitize, parseId } = require('../utils/validation');

// GET user orders with pagination and filtering
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};

// GET single order details
exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { orderId } = req.params;
    
    validateRequired(orderId, 'Order ID');

    const where = { orderId };
    // If not admin, restrict to own orders
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        },
        reviews: true,
        user: { // Include user details for admin view
          select: {
            firstname: true,
            lastname: true,
            email: true,
            phone: true,
            address: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Get order details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
};

// CANCEL order (only if PENDING)
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    
    validateRequired(orderId, 'Order ID');

    const order = await prisma.order.findFirst({
      where: {
        orderId: orderId,
        userId: userId,
        status: 'PENDING'
      }
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled. Either order not found or already processed."
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order"
    });
  }
};

// GET order statistics for dashboard
exports.getOrderStats = async (req, res) => {
  try {
    // Check if user exists
    if (!req.user || !req.user.id) {
      console.error("Order stats - User not authenticated:", req.user);
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const userId = req.user.id;
    console.log("Fetching order stats for user:", userId);

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database connection failed"
      });
    }

    const [totalOrders, pendingOrders, completedOrders, totalSpent] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: 'PENDING' } }),
      prisma.order.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.order.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ]);

    console.log("Order stats fetched successfully:", {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpent: totalSpent._sum.amount || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent: totalSpent._sum.amount || 0
      }
    });
  } catch (error) {
    console.error("Get order stats error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ADMIN: Get all orders with pagination and filtering
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const where = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true
            }
          },
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};

// ADMIN: Get order statistics
exports.getAdminOrderStats = async (req, res) => {
  try {
    console.log("Fetching admin order stats");
    
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database connection failed"
      });
    }

    const [totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ]);

    console.log("Admin order stats fetched successfully:", {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum.amount || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.amount || 0
      }
    });
  } catch (error) {
    console.error("Get admin order stats error:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ADMIN: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    let { status, location, description, trackingNumber } = req.body;
    
    validateRequired(orderId, 'Order ID');
    validateRequired(status, 'Status');
    
    // Sanitize inputs
    status = sanitize(status);
    if (location) location = sanitize(location);
    if (description) description = sanitize(description);
    if (trackingNumber) trackingNumber = sanitize(trackingNumber);

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status. Valid statuses: " + validStatuses.join(', ')
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update order and create tracking entry
    const updatedOrder = await prisma.order.update({
      where: { orderId: orderId },
      data: { 
        status,
        trackingNumber: trackingNumber || order.trackingNumber,
        trackingHistory: {
          create: {
            status,
            location: location || null,
            description: description || `Order status updated to ${status}`
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: true
          }
        },
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
};

// GET order tracking history
exports.getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;
    
    validateRequired(orderId, 'Order ID');

    const where = { orderId };
    if (req.user.role !== 'ADMIN') {
      where.userId = userId;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        trackingNumber: order.trackingNumber,
        trackingHistory: order.trackingHistory
      }
    });
  } catch (error) {
    console.error("Get order tracking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order tracking"
    });
  }
};
