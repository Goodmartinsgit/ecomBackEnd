
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");  // ✅ Make sure this line is present
const dotenv = require("dotenv");

dotenv.config();


exports.initializePayment = async (req, res) => {
  const { email } = req.body;
  const orderId = uuidv4();

  try {
    // Validate email
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required!" 
      });
    }

    // Get the user
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "User does not exist!" 
      });
    }

    // Get user's cart - FIXED: Changed ProducCart to Productcart
    const userCart = await prisma.cart.findUnique({
  where: { userId: parseInt(user.id) },
  include: {
    productCarts: {
      include: { product: true }
    }
  }
});


    if (!userCart || !userCart.productCarts.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty!"
      });
    }

    const cartItems = userCart.productCarts;

    // Calculate total price
    const totalPrice = cartItems.reduce(
      (acc, item) => acc + item.product.price * (item.quantity || 1),
      0
    );

    // Validate total price
    if (totalPrice <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid cart total!" 
      });
    }

    const payload = {
      tx_ref: orderId,
      amount: totalPrice,
      currency: "NGN",
      redirect_url: `${process.env.FRONTEND_URL}/verify-payment`,
      customer: {
        email: user.email,
        name: `${user.firstname} ${user.lastname}`,
        phonenumber: user.phone,
      },
      meta: {
        userId: user.id,
        orderId,
        totalPrice,
      },
      customizations: {
        title: "Grandeur",
        description: "Payment for Order",
      },
    };

    // Check if FLW_SECRET_KEY is configured
    if (!process.env.FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "Payment service not configured!"
      });
    }

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Check if response is OK before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Flutterwave API error:", response.status, errorText);
      return res.status(500).json({
        success: false,
        message: "Payment service error!",
        error: process.env.NODE_ENV === 'development' ? `Status: ${response.status}` : undefined
      });
    }

    const data = await response.json();

    if (data.status !== "success") {
      console.error("Flutterwave initialization failed:", data);
      return res.status(500).json({
        success: false,
        message: data.message || "Payment initialization failed!"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully!",
      link: data.data.link,
      orderId,
    });

  } catch (error) {
    console.error("Initialize payment error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Something went wrong!" 
    });
  }
};


exports.verifyPayment = async (req, res) => {
  const { transaction_id, status, tx_ref } = req.query;

  try {
    console.log("Payment verification started:", { transaction_id, status, tx_ref });

    // Validate query parameters
    if (!transaction_id) {
      console.error("Missing transaction_id");
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required!"
      });
    }

    // Check if FLW_SECRET_KEY is configured
    if (!process.env.FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "Payment service not configured!"
      });
    }

    // Verify transaction with Flutterwave
    console.log("Verifying with Flutterwave...");
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Flutterwave verification error:", response.status, errorText);
      return res.status(500).json({
        success: false,
        message: "Payment verification failed!",
        error: process.env.NODE_ENV === 'development' ? errorText : undefined
      });
    }

    const data = await response.json();
    console.log("Flutterwave response:", JSON.stringify(data, null, 2));

    if (data.status !== "success" || data.data.status !== "successful") {
      console.error("Payment not successful:", data);
      return res.status(400).json({
        success: false,
        message: "Payment was not successful!"
      });
    }

    const userId = data.data.meta?.userId;
    const orderId = data.data.tx_ref;
    const totalPrice = data.data.amount;

    console.log("Extracted data:", { userId, orderId, totalPrice });

    if (!userId) {
      console.error("User ID not found in meta data");
      return res.status(400).json({
        success: false,
        message: "User ID not found in transaction data!"
      });
    }

    // Get user and cart
    console.log("Fetching user with ID:", userId);
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      console.error("User not found:", userId);
      return res.status(400).json({
        success: false,
        message: "User not found!"
      });
    }

    console.log("User found:", user.email);
    console.log("Fetching user cart...");
    const userCart = await prisma.cart.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        productCarts: {
          include: { product: true }
        }
      }
    });
    console.log("Cart items count:", userCart?.productCarts?.length || 0);

    if (!userCart || !userCart.productCarts.length) {
      console.warn(`Cart empty for user ${userId}, creating order without cart items`);
      // Create order without cart items for completed payment
      const order = await prisma.order.create({
        data: {
          orderId: orderId,
          userId: parseInt(userId),
          email: user.email,
          amount: totalPrice,
          status: "PENDING",
          txRef: orderId,
          transactionId: transaction_id,
          cartItems: "[]",
          paymentData: JSON.stringify(data.data),
          paidAt: new Date(),
          trackingHistory: {
            create: {
              status: "PENDING",
              description: "Order placed and payment confirmed"
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully!",
        data: {
          orderId: order.id,
          transactionId: transaction_id,
          totalPrice: totalPrice,
          order: order,
          receiptItems: []
        }
      });
    }

    // Create order
    console.log("Creating order...");
    const order = await prisma.order.create({
      data: {
        orderId: orderId,
        userId: parseInt(userId),
        email: user.email,
        amount: totalPrice,
        status: "PENDING",
        txRef: orderId,
        transactionId: transaction_id,
        cartItems: JSON.stringify(userCart.productCarts),
        paymentData: JSON.stringify(data.data),
        paidAt: new Date(),
        orderItems: {
          create: userCart.productCarts.map(item => ({
            productId: item.productId,
            quantity: item.quantity || 1,
            price: item.product.price
          }))
        },
        trackingHistory: {
          create: {
            status: "PENDING",
            description: "Order placed and payment confirmed"
          }
        }
      },
      include: {
        orderItems: {
          include: { product: true }
        },
        trackingHistory: true
      }
    });

    // Create receipt with items
    let receiptItems = [];
    try {
      console.log("Creating receipt...");
      const receipt = await prisma.receipt.create({
        data: {
          userId: parseInt(userId),
          orderId: orderId,
          name: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phone: user.phone,
          amount: totalPrice,
          transactionId: transaction_id,
          status: "COMPLETED",
          receiptItems: {
            create: userCart.productCarts.map(item => ({
              productId: item.productId,
              name: item.product.name,
              image: item.product.image,
              price: item.product.price,
              quantity: item.quantity || 1,
              total: item.product.price * (item.quantity || 1)
            }))
          }
        },
        include: {
          receiptItems: true
        }
      });
      receiptItems = receipt.receiptItems;
      console.log("Receipt created successfully");
    } catch (receiptError) {
      console.error("Failed to create receipt:", receiptError);
      // Continue without receipt - order is already created
      receiptItems = userCart.productCarts.map(item => ({
        productId: item.productId,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity || 1,
        total: item.product.price * (item.quantity || 1)
      }));
    }

    // Clear user's cart
    console.log("Clearing cart...");
    await prisma.productCart.deleteMany({
      where: { cartId: userCart.id }
    });

    console.log("Payment verification completed successfully");
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully!",
      data: {
        orderId: order.id,
        transactionId: transaction_id,
        totalPrice: totalPrice,
        order: order,
        receiptItems: receiptItems
      }
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during verification!",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
