
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const { v4: uuidv4 } = require("uuid");  // ✅ Make sure this line is present
// const dotenv = require("dotenv");

// dotenv.config();


// exports.initializePayment = async (req, res) => {
//   const { email } = req.body;
//   const orderId = uuidv4();

//   try {
//     // Validate email
//     if (!email) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Email is required!" 
//       });
//     }

//     // Get the user
//     const user = await prisma.user.findUnique({ 
//       where: { email } 
//     });

//     if (!user) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "User does not exist!" 
//       });
//     }

//     // Get user's cart - FIXED: Changed ProducCart to Productcart
//     const userCart = await prisma.cart.findUnique({
//   where: { userId: parseInt(user.id) },
//   include: {
//     productCarts: {
//       include: { product: true }
//     }
//   }
// });


//     if (!userCart || !userCart.productCarts.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Cart is empty!"
//       });
//     }

//     const cartItems = userCart.productCarts;

//     // Calculate total price
//     const totalPrice = cartItems.reduce(
//       (acc, item) => acc + item.product.price * (item.quantity || 1),
//       0
//     );

//     // Validate total price
//     if (totalPrice <= 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Invalid cart total!" 
//       });
//     }

//     const payload = {
//       tx_ref: orderId,
//       amount: totalPrice,
//       currency: "NGN",
//       redirect_url: `${process.env.FRONTEND_URL}/verify-payment`,
//       customer: {
//         email: user.email,
//         name: `${user.firstname} ${user.lastname}`,
//         phonenumber: user.phone,
//       },
//       meta: {
//         userId: user.id,
//         orderId,
//         totalPrice,
//       },
//       customizations: {
//         title: "Grandeur",
//         description: "Payment for Order",
//       },
//     };

//     // Check if FLW_SECRET_KEY is configured
//     if (!process.env.FLW_SECRET_KEY) {
//       console.error("FLW_SECRET_KEY is not configured");
//       return res.status(500).json({
//         success: false,
//         message: "Payment service not configured!"
//       });
//     }

//     const response = await fetch("https://api.flutterwave.com/v3/payments", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     // Check if response is OK before parsing JSON
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Flutterwave API error:", response.status, errorText);
//       return res.status(500).json({
//         success: false,
//         message: "Payment service error!",
//         error: process.env.NODE_ENV === 'development' ? `Status: ${response.status}` : undefined
//       });
//     }

//     const data = await response.json();

//     if (data.status !== "success") {
//       console.error("Flutterwave initialization failed:", data);
//       return res.status(500).json({
//         success: false,
//         message: data.message || "Payment initialization failed!"
//       });
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Payment initialized successfully!",
//       link: data.data.link,
//       orderId,
//     });

//   } catch (error) {
//     console.error("Initialize payment error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Something went wrong!" 
//     });
//   }
// };


// exports.verifyPayment = async (req, res) => {
//   const { transaction_id, status, tx_ref } = req.query;

//   try {
//     console.log("Payment verification started:", { transaction_id, status, tx_ref });

//     // Validate query parameters
//     if (!transaction_id) {
//       console.error("Missing transaction_id");
//       return res.status(400).json({
//         success: false,
//         message: "Transaction ID is required!"
//       });
//     }

//     // Check if FLW_SECRET_KEY is configured
//     if (!process.env.FLW_SECRET_KEY) {
//       console.error("FLW_SECRET_KEY is not configured");
//       return res.status(500).json({
//         success: false,
//         message: "Payment service not configured!"
//       });
//     }

//     // Verify transaction with Flutterwave
//     console.log("Verifying with Flutterwave...");
//     const response = await fetch(
//       `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
//       {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
//         },
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Flutterwave verification error:", response.status, errorText);
//       return res.status(500).json({
//         success: false,
//         message: "Payment verification failed!",
//         error: process.env.NODE_ENV === 'development' ? errorText : undefined
//       });
//     }

//     const data = await response.json();
//     console.log("Flutterwave response:", JSON.stringify(data, null, 2));

//     if (data.status !== "success" || data.data.status !== "successful") {
//       console.error("Payment not successful:", data);
//       return res.status(400).json({
//         success: false,
//         message: "Payment was not successful!"
//       });
//     }

//     const userId = data.data.meta?.userId;
//     const orderId = data.data.tx_ref;
//     const totalPrice = data.data.amount;

//     console.log("Extracted data:", { userId, orderId, totalPrice });

//     if (!userId) {
//       console.error("User ID not found in meta data");
//       return res.status(400).json({
//         success: false,
//         message: "User ID not found in transaction data!"
//       });
//     }

//     // Get user and cart
//     console.log("Fetching user with ID:", userId);
//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(userId) }
//     });

//     if (!user) {
//       console.error("User not found:", userId);
//       return res.status(400).json({
//         success: false,
//         message: "User not found!"
//       });
//     }

//     console.log("User found:", user.email);
//     console.log("Fetching user cart...");
//     const userCart = await prisma.cart.findUnique({
//       where: { userId: parseInt(userId) },
//       include: {
//         productCarts: {
//           include: { product: true }
//         }
//       }
//     });
//     console.log("Cart items count:", userCart?.productCarts?.length || 0);

//     if (!userCart || !userCart.productCarts.length) {
//       console.warn(`Cart empty for user ${userId}, creating order without cart items`);
//       // Create order without cart items for completed payment
//       const order = await prisma.order.create({
//         data: {
//           orderId: orderId,
//           userId: parseInt(userId),
//           email: user.email,
//           amount: totalPrice,
//           status: "COMPLETED",
//           txRef: orderId,
//           transactionId: transaction_id,
//           cartItems: "[]",
//           paymentData: JSON.stringify(data.data),
//           paidAt: new Date()
//         }
//       });

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified successfully!",
//         data: {
//           orderId: order.id,
//           transactionId: transaction_id,
//           totalPrice: totalPrice,
//           order: order,
//           receiptItems: []
//         }
//       });
//     }

//     // Create order
//     console.log("Creating order...");
//     const order = await prisma.order.create({
//       data: {
//         orderId: orderId,
//         userId: parseInt(userId),
//         email: user.email,
//         amount: totalPrice,
//         status: "COMPLETED",
//         txRef: orderId,
//         transactionId: transaction_id,
//         cartItems: JSON.stringify(userCart.productCarts),
//         paymentData: JSON.stringify(data.data),
//         paidAt: new Date(),
//         orderItems: {
//           create: userCart.productCarts.map(item => ({
//             productId: item.productId,
//             quantity: item.quantity || 1,
//             price: item.product.price
//           }))
//         }
//       },
//       include: {
//         orderItems: {
//           include: { product: true }
//         }
//       }
//     });

//     // Create receipt with items
//     let receiptItems = [];
//     try {
//       console.log("Creating receipt...");
//       const receipt = await prisma.receipt.create({
//         data: {
//           userId: parseInt(userId),
//           orderId: orderId,
//           name: `${user.firstname} ${user.lastname}`,
//           email: user.email,
//           phone: user.phone,
//           amount: totalPrice,
//           transactionId: transaction_id,
//           status: "Order Placed",
//           receiptItems: {
//             create: userCart.productCarts.map(item => ({
//               productId: item.productId,
//               name: item.product.name,
//               image: item.product.image,
//               price: item.product.price,
//               quantity: item.quantity || 1,
//               total: item.product.price * (item.quantity || 1)
//             }))
//           }
//         },
//         include: {
//           receiptItems: true
//         }
//       });
//       receiptItems = receipt.receiptItems;
//       console.log("Receipt created successfully");
//     } catch (receiptError) {
//       console.error("Failed to create receipt:", receiptError);
//       // Continue without receipt - order is already created
//       receiptItems = userCart.productCarts.map(item => ({
//         productId: item.productId,
//         name: item.product.name,
//         image: item.product.image,
//         price: item.product.price,
//         quantity: item.quantity || 1,
//         total: item.product.price * (item.quantity || 1)
//       }));
//     }

//     // Clear user's cart
//     console.log("Clearing cart...");
//     await prisma.productCart.deleteMany({
//       where: { cartId: userCart.id }
//     });

//     console.log("Payment verification completed successfully");
//     return res.status(200).json({
//       success: true,
//       message: "Payment verified successfully!",
//       data: {
//         orderId: order.id,
//         transactionId: transaction_id,
//         totalPrice: totalPrice,
//         order: order,
//         receiptItems: receiptItems
//       }
//     });

//   } catch (error) {
//     console.error("Verify payment error:", error);
//     console.error("Error stack:", error.stack);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong during verification!",
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };








import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../shared/Layout/Layout";
import { Package, Lock, Loader2 } from "lucide-react";
import ProductContext from "../context/NewProductContext";
import { toast } from "react-toastify";
import { baseUrl } from "../config/config";
import { addToCart as addToCartAPI } from "../Services/CartServices";

const Checkout = () => {
  const { cartItems, isAuthenticated, user, token } = useContext(ProductContext);
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication after component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
      if (!token || !storedUser) {
        toast.info("Please log in to proceed with checkout");
        navigate("/login?returnUrl=/checkout");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Calculate totals
  const subtotal = useMemo(
    () => cartItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0,
    [cartItems]
  );
  const tax = useMemo(() => subtotal * 0.1, [subtotal]); // 10% tax
  const shipping = 0; // Free shipping
  const total = useMemo(() => subtotal + tax + shipping, [subtotal, tax, shipping]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="mx-auto text-gray-400 mb-4 animate-spin" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Redirect if cart is empty
  if (!cartItems || cartItems.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-6">Add some products before checking out!</p>
            <a
              href="/"
              className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all"
            >
              Continue Shopping
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  // Sync cart items to backend before payment
  const syncCartToBackend = async () => {
    const authToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!authToken || !storedUser || !cartItems || cartItems.length === 0) {
      console.warn('Cannot sync cart: missing auth or cart items');
      return false;
    }

    try {
      const userData = JSON.parse(storedUser);

      // Sync each cart item to backend
      const syncPromises = cartItems.map(async (item) => {
        try {
          const response = await addToCartAPI(
            userData.id,
            item.id,
            item.color || null,
            item.size || null,
            item.quantity || 1,
            authToken
          );

          if (!response.ok) {
            console.error(`Failed to sync item ${item.id}:`, response.data?.message || 'Unknown error');
          }
          return response.ok;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          return false;
        }
      });

      const results = await Promise.all(syncPromises);
      const successCount = results.filter(r => r).length;

      console.log(`Cart sync completed: ${successCount}/${cartItems.length} items synced`);
      return successCount > 0;
    } catch (error) {
      console.error('Cart sync error:', error);
      return false;
    }
  };

  // Initialize payment using backend API (NO Flutterwave Inline)
  const handleInitializePayment = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const authToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!authToken || !storedUser) {
        toast.error("Please login to continue");
        navigate("/login?returnUrl=/checkout");
        setIsLoading(false);
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        toast.error("Your cart is empty");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      // Validate user information
      if (!userData.email) {
        toast.error("Email is required. Please update your profile.");
        navigate("/dashboard?section=profile");
        setIsLoading(false);
        return;
      }

      // Step 1: Sync cart to backend
      toast.info("Preparing your order...");
      const syncSuccess = await syncCartToBackend();
      
      if (!syncSuccess) {
        console.warn("Cart sync had issues, but continuing with payment...");
      }

      // Step 2: Initialize payment via backend API
      console.log('Initializing payment for user:', userData.email);
      
      const response = await fetch(`${baseUrl}/payment/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Payment initialization failed:', data);
        toast.error(data.message || "Failed to initialize payment");
        setIsLoading(false);
        return;
      }

      console.log('Payment initialized successfully:', data);

      // Step 3: Redirect to Flutterwave payment page
      if (data.link) {
        toast.success("Redirecting to payment gateway...");
        
        // Store order ID for reference
        localStorage.setItem('pending_order_id', data.orderId);
        
        // Add a small delay for UX
        setTimeout(() => {
          // Redirect to Flutterwave hosted payment page
          window.location.href = data.link;
        }, 500);
      } else {
        console.error('No payment link received:', data);
        toast.error("Payment link not received. Please try again.");
        setIsLoading(false);
      }

    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your order</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Customer & Order Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Package size={24} />
                  Customer Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{user?.firstname} {user?.lastname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{user?.address || 'Not provided'}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard?section=profile')}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit Information
                </button>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Order Items ({cartItems.length})</h2>
                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div
                      key={`${item.id}-${item.size}-${item.color}-${index}`}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && (
                            <span className="flex items-center gap-1">
                              Color:
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                            </span>
                          )}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <p className="text-lg font-bold text-green-700 mt-1">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-28">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (10%)</span>
                    <span className="font-medium">₦{tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold mb-6 text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">₦{total.toLocaleString()}</span>
                </div>

                <button
                  onClick={handleInitializePayment}
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-md hover:bg-gray-800 transition-all font-semibold flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      Proceed to Payment
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate('/cart')}
                  disabled={isLoading}
                  className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  ← Back to Cart
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Lock size={16} />
                    <span>Secure payment via Flutterwave</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;