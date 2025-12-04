
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
    //   redirect_url: "http://localhost:5000/verify",
      // redirect_url: "http://localhost:5000/api/payment/verify",
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
    // Validate query parameters
    if (!transaction_id) {
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
        message: "Payment verification failed!"
      });
    }

    const data = await response.json();

    if (data.status !== "success" || data.data.status !== "successful") {
      return res.status(400).json({
        success: false,
        message: "Payment was not successful!"
      });
    }

    const userId = data.data.meta?.userId;
    const orderId = data.data.tx_ref;
    const totalPrice = data.data.amount;

    // Get user and cart
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found!"
      });
    }

    const userCart = await prisma.cart.findUnique({
      where: { userId: parseInt(userId) },
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

    // Create order
    const order = await prisma.order.create({
      data: {
        orderId: orderId,
        userId: parseInt(userId),
        email: user.email,
        amount: totalPrice,
        status: "COMPLETED",
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
        }
      },
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    // Clear user's cart
    await prisma.productCart.deleteMany({
      where: { cartId: userCart.id }
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully!",
      data: {
        orderId: order.id,
        transactionId: transaction_id,
        totalPrice: totalPrice,
        order: order
      }
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during verification!"
    });
  }
};
