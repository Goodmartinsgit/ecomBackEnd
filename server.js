const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const sanitizeInput = require('./middlewares/sanitization');
const validateFieldSize = require('./middlewares/fieldSizeValidator');
const userRouter = require("./routers/userRouter");
const { categoryRouter } = require("./routers/categoryRouter");
const productRouter = require("./routers/productRouter");
const cartRouter = require("./routers/cartRouter");
const paymentRouter = require("./routers/paymentRouter");
const addressRouter = require("./routers/addressRouter");
const orderRouter = require("./routers/orderRouter");
const wishlistRouter = require("./routers/wishlistRouter");
const reviewRouter = require("./routers/reviewRouter");
const { swaggerUi, swaggerSpec } = require("./swagger/swagger");

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET_KEY', 'FLW_SECRET_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31mError: Missing required environment variables:\x1b[0m');
  missingEnvVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}
const app = express();

// CORS configuration (must be before other middleware)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  // Production Vercel domains
  "https://ecommerce-henna-tau-1aw50dd4fi.vercel.app",
  "https://ecommerce-git-master-ecommercs-projects-495935a9.vercel.app",
  "https://ecommerce-1as2klzhq-ecommercs-projects-495935a9.vercel.app"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments
    if (origin && origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    console.warn(`⚠️  Blocked by CORS: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware with relaxed settings for API
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Compression middleware
app.use(compression());

// General rate limiting - apply only to API routes, not static assets
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for production use
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use('/api', limiter); // Only apply to /api routes

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: "Too many password reset attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Field size validation
app.use(validateFieldSize);

// Global input sanitization
app.use(sanitizeInput);

// Apply auth rate limiting to specific routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgot-password', passwordResetLimiter);
app.use('/api/users/reset-password', passwordResetLimiter);



// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Mount routers with proper prefixes and rate limiting
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/orders", orderRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    availableRoutes: [
      "POST /api/users/register",
      "POST /api/users/login",
      "POST /api/users/forgot-password",
      "POST /api/users/reset-password",
      "GET /api/products",
      "GET /api/categories",
      "POST /api/payment/initialize",
      "GET /api/payment/verify"
    ]
  });
});

// Global error handling middleware
const { globalErrorHandler } = require('./utils/errorHandler');
app.use(globalErrorHandler);

const port = process.env.PORT || 5000;

// Start server with database connection
async function startServer() {
  const dbConnected = await connectDatabase();
  
  if (!dbConnected) {
    console.error('\n❌ Failed to connect to database. Server not started.');
    process.exit(1);
  }
  
  app.listen(port, () => {
    console.log(`\n🚀 Server is running on port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
    console.log(`👤 Register: http://localhost:${port}/api/users/register`);
    console.log(`🔐 Login: http://localhost:${port}/api/users/login\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();





