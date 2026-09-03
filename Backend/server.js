// ============================================================
// ELECTRONICS AI
// MAIN BACKEND SERVER
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// ============================================================
// DATABASE
// ============================================================

const { testConnection } = require("./database");

// ============================================================
// SMTP EMAIL SERVICE
// ============================================================

const { verifyEmailConnection } = require("./services/emailService");

// ============================================================
// ROUTES
// ============================================================

const productsRouter = require("./routes/products");

const recommendationsRouter = require("./routes/recommendations");

const cartRouter = require("./routes/cart");

const ordersRouter = require("./routes/orders");

const paymentRouter = require("./routes/payment");

const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const catalogRoutes = require("./routes/catalog");

// ============================================================
// AI COMMERCE AGENT
// ============================================================

const agentRouter = require("./routes/agent");

// ============================================================
// ERROR HANDLER
// ============================================================

const errorHandler = require("./middleware/errorHandler");

// ============================================================
// CREATE EXPRESS APPLICATION
// ============================================================

const app = express();

// ============================================================
// SERVER CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT) || 5000;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: true,

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],

    credentials: true,
  }),
);

// ============================================================
// BODY PARSING
// ============================================================

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,

    limit: "1mb",
  }),
);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/catalog", catalogRoutes);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
    );
  });

  next();
});

// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,

    service: "Electronics AI Backend",

    version: "4.0.0",

    status: "running",

    message: "Electronics AI backend is running successfully.",

    endpoints: {
      health: "/health",

      products: "/api/products",

      recommendations: "/api/recommendations/:productId",

      recommendationSelect: "/api/recommendations/select",

      cart: "/api/cart/:customerId",

      orders: "/api/orders",

      payment: "/api/payment",

      auth: "/api/auth",

      agent: "/api/agent",

      agentTest: "/api/agent/test",

      agentChat: "POST /api/agent/chat",

      cod: "POST /api/payment/cod",
    },
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", async (req, res) => {
  try {
    // ------------------------------------------------------
    // Test PostgreSQL
    // ------------------------------------------------------

    await testConnection();

    return res.json({
      success: true,

      service: "electronics-backend",

      status: "healthy",

      database: "connected",

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    return res.status(503).json({
      success: false,

      service: "electronics-backend",

      status: "unhealthy",

      database: "disconnected",

      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// PRODUCTS
//
// GET
// /api/products
//
// GET
// /api/products/:productId
//
// GET
// /api/products/category/:category
// ============================================================

app.use("/api/products", productsRouter);

// ============================================================
// AI RECOMMENDATIONS
//
// GET
// /api/recommendations/:productId
//
// POST
// /api/recommendations/select
// ============================================================

app.use("/api/recommendations", recommendationsRouter);

// ============================================================
// BACKWARD COMPATIBILITY
//
// Old endpoint:
//
// GET /api/recommendation/:productId
//
// New endpoint:
//
// GET /api/recommendations/:productId
// ============================================================

app.use("/api/recommendation", recommendationsRouter);

// ============================================================
// CART
//
// GET
// /api/cart/:customerId
//
// POST
// /api/cart
//
// POST
// /api/cart/add
//
// PUT
// /api/cart/:cartItemId
//
// DELETE
// /api/cart/:cartItemId
//
// DELETE
// /api/cart/clear/:customerId
//
// POST
// /api/cart/validate
// ============================================================

app.use("/api/cart", cartRouter);

// ============================================================
// ORDERS
// ============================================================

app.use("/api/orders", ordersRouter);

// ============================================================
// PAYMENT
//
// Razorpay:
//
// POST
// /api/payment/create-order
//
// POST
// /api/payment/verify
//
// COD:
//
// POST
// /api/payment/cod
// ============================================================

app.use("/api/payment", paymentRouter);

// ============================================================
// AUTHENTICATION
//
// POST
// /api/auth/register
//
// POST
// /api/auth/login
//
// GET
// /api/auth/customer/:customerId
//
// GET
// /api/auth/test
// ============================================================

app.use("/api/auth", authRoutes);

// ============================================================
// AI COMMERCE AGENT
//
// GET
// /api/agent/test
//
// POST
// /api/agent/chat
//
// Example:
//
// {
//   "customer_id": 16,
//   "message": "Find me a laptop under 70000"
// }
// ============================================================

app.use("/api/agent", agentRouter);

// ============================================================
// API TEST
// ============================================================

app.get("/api/test", (req, res) => {
  return res.json({
    success: true,

    message: "Electronics AI API is working.",

    version: "4.0.0",

    endpoints: {
      // ==================================================
      // PRODUCTS
      // ==================================================

      products: "/api/products",

      product: "/api/products/:productId",

      categoryProducts: "/api/products/category/:category",

      // ==================================================
      // AI RECOMMENDATIONS
      // ==================================================

      recommendations: "/api/recommendations/:productId",

      selectRecommendation: "/api/recommendations/select",

      legacyRecommendation: "/api/recommendation/:productId",

      // ==================================================
      // AI COMMERCE AGENT
      // ==================================================

      agentTest: "GET /api/agent/test",

      agentChat: "POST /api/agent/chat",

      // ==================================================
      // CART
      // ==================================================

      cart: "/api/cart/:customerId",

      addToCart: "POST /api/cart",

      legacyAddToCart: "POST /api/cart/add",

      updateCart: "PUT /api/cart/:cartItemId",

      removeCartItem: "DELETE /api/cart/:cartItemId",

      clearCart: "DELETE /api/cart/clear/:customerId",

      validateCart: "POST /api/cart/validate",

      // ==================================================
      // ORDERS
      // ==================================================

      orders: "/api/orders",

      customerOrders: "GET /api/orders/customer/:customerId",

      singleOrder: "GET /api/orders/:orderId",

      // ==================================================
      // PAYMENT
      // ==================================================

      createPaymentOrder: "POST /api/payment/create-order",

      verifyPayment: "POST /api/payment/verify",

      cashOnDelivery: "POST /api/payment/cod",

      // ==================================================
      // AUTH
      // ==================================================

      authTest: "GET /api/auth/test",

      register: "POST /api/auth/register",

      login: "POST /api/auth/login",

      customer: "GET /api/auth/customer/:customerId",
    },
  });
});

// ============================================================
// API 404 HANDLER
//
// This must come BEFORE the global error handler.
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,

    message: "API endpoint not found",

    path: req.originalUrl,

    method: req.method,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
//
// MUST BE THE LAST MIDDLEWARE
// ============================================================

app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    // ========================================================
    // TEST DATABASE
    // ========================================================

    console.log("");

    console.log("Checking PostgreSQL connection...");

    await testConnection();

    console.log("PostgreSQL connection successful!");

    // ========================================================
    // TEST SMTP
    // ========================================================

    console.log("");

    console.log("Checking SMTP email connection...");

    const smtpConnected = await verifyEmailConnection();

    if (smtpConnected) {
      console.log("SMTP email connection successful!");
    } else {
      console.warn("WARNING: SMTP email connection failed.");

      console.warn("Orders will still work, but confirmation emails may fail.");
    }

    // ========================================================
    // START EXPRESS SERVER
    // ========================================================

    app.listen(PORT, () => {
      console.log("");

      console.log("==========================================");

      console.log("       ELECTRONICS AI BACKEND");

      console.log("==========================================");

      console.log(`Server       : http://localhost:${PORT}`);

      console.log(`Health       : http://localhost:${PORT}/health`);

      console.log(`API Test     : http://localhost:${PORT}/api/test`);

      console.log(`Products     : http://localhost:${PORT}/api/products`);

      console.log(
        `AI           : http://localhost:${PORT}/api/recommendations/1`,
      );

      console.log(
        `AI Select    : http://localhost:${PORT}/api/recommendations/select`,
      );

      console.log(`AI Agent     : http://localhost:${PORT}/api/agent/test`);

      console.log(`AI Chat      : http://localhost:${PORT}/api/agent/chat`);

      console.log(`Cart         : http://localhost:${PORT}/api/cart/1`);

      console.log(
        `Payment      : http://localhost:${PORT}/api/payment/create-order`,
      );

      console.log(`COD          : http://localhost:${PORT}/api/payment/cod`);

      console.log(`Verification : http://localhost:${PORT}/api/payment/verify`);

      console.log(`Orders       : http://localhost:${PORT}/api/orders`);

      console.log(`Auth         : http://localhost:${PORT}/api/auth`);

      console.log(
        `SMTP         : ${smtpConnected ? "CONNECTED" : "NOT CONNECTED"}`,
      );

      console.log("==========================================");

      console.log("");

      console.log("Backend is ready.");

      console.log("");
    });
  } catch (error) {
    console.error("");

    console.error("==========================================");

    console.error("       FAILED TO START SERVER");

    console.error("==========================================");

    console.error("Reason:");

    console.error(error.message);

    console.error("");

    console.error(error);

    console.error("");

    process.exit(1);
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on("SIGINT", () => {
  console.log("");

  console.log("Server shutting down...");

  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("");

  console.log("Server terminated...");

  process.exit(0);
});

// ============================================================
// UNHANDLED PROMISE
// ============================================================

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  process.exit(1);
});

// ============================================================
// RUN SERVER
// ============================================================

startServer();

// ============================================================
// EXPORT APP
// ============================================================

module.exports = app;
