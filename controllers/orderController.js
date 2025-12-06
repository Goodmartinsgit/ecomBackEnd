const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        orderId: orderId,
        userId: userId
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        },
        reviews: true
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
    const userId = req.user.id;

    const [totalOrders, pendingOrders, completedOrders, totalSpent] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.order.count({ where: { userId, status: 'DELIVERED' } }),
      prisma.order.aggregate({
        where: { userId, status: 'DELIVERED' },
        _sum: { amount: true }
      })
    ]);

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
    console.error("Get order stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics"
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
    const [totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { amount: true }
      })
    ]);

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
    console.error("Get admin order stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics"
    });
  }
};

// ADMIN: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, description, trackingNumber } = req.body;

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
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
