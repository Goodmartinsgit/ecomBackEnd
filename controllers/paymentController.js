const { prisma } = require('../config/database');
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const logger = require('../utils/logger');

dotenv.config();

// Get payment configuration
exports.getPaymentConfig = async (req, res) => {
  try {
    // Validate that keys are configured
    if (!process.env.FLW_PUBLIC_KEY) {
      logger.error("FLW_PUBLIC_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "Payment configuration not available!"
      });
    }

    return res.status(200).json({
      success: true,
      flutterwavePublicKey: process.env.FLW_PUBLIC_KEY,
      currency: "NGN"
    });

  } catch (error) {
    logger.error("Get payment config error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment configuration!"
    });
  }
};

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

    // Get user's cart
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
      logger.error("FLW_SECRET_KEY is not configured");
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
      logger.error(`Flutterwave API error: ${response.status}`, { error: errorText });
      return res.status(500).json({
        success: false,
        message: "Payment service error!",
        error: process.env.NODE_ENV === 'development' ? `Status: ${response.status}` : undefined
      });
    }

    const data = await response.json();

    if (data.status !== "success") {
      logger.error("Flutterwave initialization failed:", { message: data.message });
      return res.status(500).json({
        success: false,
        message: data.message || "Payment initialization failed!"
      });
    }

    logger.info(`Payment initialized for user ${user.id} with orderId ${orderId}`);

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully!",
      link: data.data.link,
      orderId,
    });

  } catch (error) {
    logger.error("Initialize payment error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Something went wrong!" 
    });
  }
};

exports.verifyPayment = async (req, res) => {
  const { transaction_id, status, tx_ref } = req.query;

  try {
    logger.info("Payment verification started", { transaction_id, status, tx_ref });

    // Validate query parameters
    if (!transaction_id) {
      logger.error("Missing transaction_id");
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required!"
      });
    }

    // Check if FLW_SECRET_KEY is configured
    if (!process.env.FLW_SECRET_KEY) {
      logger.error("FLW_SECRET_KEY is not configured");
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
      logger.error(`Flutterwave verification error: ${response.status}`, { error: errorText });
      return res.status(500).json({
        success: false,
        message: "Payment verification failed!",
        error: process.env.NODE_ENV === 'development' ? errorText : undefined
      });
    }

    const data = await response.json();
    
    // Log success but without sensitive data
    logger.info("Flutterwave verification response received", { status: data.status });

    if (data.status !== "success" || data.data.status !== "successful") {
      logger.error("Payment not successful", { status: data.status, flutterwaveStatus: data.data.status });
      return res.status(400).json({
        success: false,
        message: "Payment was not successful!"
      });
    }

    const userId = data.data.meta?.userId;
    const orderId = data.data.tx_ref;
    const totalPrice = data.data.amount;

    if (!userId) {
      logger.error("User ID not found in meta data");
      return res.status(400).json({
        success: false,
        message: "User ID not found in transaction data!"
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(400).json({
        success: false,
        message: "User not found!"
      });
    }

    // Get user cart
    const userCart = await prisma.cart.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        productCarts: {
          include: { product: true }
        }
      }
    });

    // Check if order already exists to prevent duplicate processing
    const existingOrder = await prisma.order.findUnique({
      where: { orderId: orderId }
    });

    if (existingOrder) {
      logger.info(`Order ${orderId} already processed`);
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: {
            orderId: existingOrder.id,
            transactionId: transaction_id,
            totalPrice: totalPrice,
            order: existingOrder
        }
      });
    }

    if (!userCart || !userCart.productCarts.length) {
      logger.warn(`Cart empty for user ${userId}, creating order without cart items`);
      
      const order = await prisma.order.create({
        data: {
          orderId: orderId,
          userId: parseInt(userId),
          email: user.email,
          amount: totalPrice,
          status: "COMPLETED",
          txRef: orderId,
          transactionId: transaction_id,
          cartItems: "[]",
          paymentData: JSON.stringify({ 
            id: data.data.id,
            status: data.data.status,
            amount: data.data.amount,
            currency: data.data.currency,
            customer: {
              email: data.data.customer?.email,
              name: data.data.customer?.name
            }
          }), // Sanitized payment data
          paidAt: new Date()
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

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderId: orderId,
          userId: parseInt(userId),
          email: user.email,
          amount: totalPrice,
          status: "COMPLETED",
          txRef: orderId,
          transactionId: transaction_id,
          cartItems: JSON.stringify(userCart.productCarts),
          paymentData: JSON.stringify({ 
            id: data.data.id,
            status: data.data.status,
            amount: data.data.amount,
            currency: data.data.currency
          }),
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

      // Create receipt with items
      const receipt = await tx.receipt.create({
        data: {
          userId: parseInt(userId),
          orderId: orderId,
          name: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phone: user.phone,
          amount: totalPrice,
          transactionId: transaction_id,
          status: "Order Placed",
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

      // Clear user's cart
      await tx.productCart.deleteMany({
        where: { cartId: userCart.id }
      });

      return { order, receiptItems: receipt.receiptItems };
    });

    const { order, receiptItems } = result;
    logger.info(`Transaction completed successfully for order ${orderId}`);

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
    logger.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during verification!",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.paymentWebhook = async (req, res) => {
    // Validate webhook signature
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers["verif-hash"];

    if (!signature || (secretHash && signature !== secretHash)) {
        logger.warn("Webhook signature mismatch", { 
            received: signature, 
            expected: secretHash ? "CONFIGURED" : "NOT_CONFIGURED" 
        });
        return res.status(401).end();
    }

    const payload = req.body;
    
    // Process only successful charges
    if (payload.event !== 'charge.completed' || payload.data?.status !== 'successful') {
        logger.info("Webhook ignored: event not charge.completed or status not successful", {
            event: payload.event,
            status: payload.data?.status
        });
        return res.status(200).end();
    }

    const { tx_ref, id: transactionId, amount } = payload.data;
    const userId = payload.data.meta?.userId;

    logger.info("Processing webhook for successful payment", { txRef: tx_ref, transactionId });

    try {
        // 1. Check if order already exists
        const existingOrder = await prisma.order.findUnique({
            where: { txRef: tx_ref } // Changed from orderId to txRef based on schema
        });

        if (existingOrder) {
            if (existingOrder.status === 'COMPLETED') {
                logger.info(`Order ${tx_ref} already completed, skipping webhook processing`);
                return res.status(200).end();
            }

            // Update status if pending/failed but payment is now successful
            await prisma.order.update({
                where: { id: existingOrder.id },
                data: {
                    status: 'COMPLETED',
                    transactionId: String(transactionId),
                    paidAt: new Date(),
                    paymentData: JSON.stringify({
                        id: payload.data.id,
                        status: payload.data.status,
                        amount: payload.data.amount,
                        currency: payload.data.currency,
                        customer: {
                            email: payload.data.customer?.email,
                            name: payload.data.customer?.name
                        }
                    })
                }
            });
            logger.info(`Updated existing order ${tx_ref} to COMPLETED via webhook`);
            return res.status(200).end();
        }

        // 2. Order doesn't exist - Create it (similar to verifyPayment)
        // Check if we have userId to process
        if (!userId) {
            logger.error("Webhook missing userId in meta data", { txRef: tx_ref });
            return res.status(200).end(); // Return 200 to stop retries even if we can't process
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user) {
            logger.error(`Webhook user not found: ${userId}`);
            return res.status(200).end();
        }

        const userCart = await prisma.cart.findUnique({
            where: { userId: parseInt(userId) },
            include: { productCarts: { include: { product: true } } }
        });

        // If no cart items, we can't create a full order with items, but we should record the payment
        const cartItems = userCart?.productCarts || [];
        const cartJson = JSON.stringify(cartItems);

        await prisma.$transaction(async (tx) => {
            // Create order
            const order = await tx.order.create({
                data: {
                    orderId: tx_ref, // Using tx_ref as orderId based on initializePayment logic
                    userId: parseInt(userId),
                    email: user.email,
                    amount: amount,
                    status: "COMPLETED",
                    txRef: tx_ref,
                    transactionId: String(transactionId),
                    cartItems: cartJson,
                    paymentData: JSON.stringify({ 
                        id: payload.data.id,
                        status: payload.data.status,
                        amount: payload.data.amount,
                        currency: payload.data.currency
                    }),
                    paidAt: new Date(),
                    orderItems: {
                        create: cartItems.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity || 1,
                            price: item.product.price
                        }))
                    }
                }
            });

            // Create receipt
            await tx.receipt.create({
                data: {
                    userId: parseInt(userId),
                    orderId: tx_ref,
                    name: `${user.firstname} ${user.lastname}`,
                    email: user.email,
                    phone: user.phone,
                    amount: amount,
                    transactionId: String(transactionId),
                    status: "Order Placed",
                    receiptItems: {
                        create: cartItems.map(item => ({
                            productId: item.productId,
                            name: item.product.name,
                            image: item.product.image,
                            price: item.product.price,
                            quantity: item.quantity || 1,
                            total: item.product.price * (item.quantity || 1)
                        }))
                    }
                }
            });

            // Clear cart if items were processed
            if (userCart && cartItems.length > 0) {
                await tx.productCart.deleteMany({
                    where: { cartId: userCart.id }
                });
            }
        });

        logger.info(`Created new order ${tx_ref} via webhook`);
        res.status(200).end();

    } catch (error) {
        logger.error("Webhook processing error", { error: error.message, stack: error.stack });
        // Respond with 200 to acknowledge receipt and stop retries, 
        // unless it's a transient error where we want a retry (then use 500)
        res.status(200).end(); 
    }
};
