// ============================================================
// ELECTRONICS AI
// PAYMENT ROUTES
// ============================================================

const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const router = express.Router();

const db = require("../database");

// ============================================================
// EMAIL
// ============================================================

const { sendOrderConfirmationEmail } = require("../services/emailService");

// ============================================================
// RAZORPAY
// ============================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ============================================================
// HELPERS
// ============================================================

function isValidId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0;
}

function money(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(number.toFixed(2));
}

// ============================================================
// VERIFY AI RECOMMENDATION
// ============================================================

async function verifyAIRecommendation(
  client,
  { recommendationId, customerId, productId },
) {
  if (!isValidId(recommendationId)) {
    return null;
  }

  if (!isValidId(customerId)) {
    return null;
  }

  if (!isValidId(productId)) {
    return null;
  }

  const result = await client.query(
    `
      SELECT
        recommendation_id,
        customer_id,
        source_product_id,
        recommended_product_id,
        confidence_score,
        reason,
        status,
        created_at

      FROM recommendations

      WHERE recommendation_id = $1

        AND customer_id = $2

        AND recommended_product_id = $3

      LIMIT 1
    `,
    [recommendationId, customerId, productId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================
// FIND LATEST AI RECOMMENDATION
// ============================================================
//
// Used as a fallback when cart_items does not contain
// recommendation_id.
//
// This prevents AI revenue attribution from being lost when
// cart metadata was not correctly saved.
//
// ============================================================

async function findLatestAIRecommendation(client, { customerId, productId }) {
  if (!isValidId(customerId)) {
    return null;
  }

  if (!isValidId(productId)) {
    return null;
  }

  const result = await client.query(
    `
      SELECT
        recommendation_id,
        customer_id,
        source_product_id,
        recommended_product_id,
        confidence_score,
        reason,
        status,
        created_at

      FROM recommendations

      WHERE customer_id = $1

        AND recommended_product_id = $2

        AND LOWER(TRIM(status)) = 'pending'

        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'

      ORDER BY
        created_at DESC,
        recommendation_id DESC

      LIMIT 1
    `,
    [customerId, productId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================
// RESOLVE AI RECOMMENDATION
// ============================================================

async function resolveAIRecommendation(
  client,
  { customerId, productId, recommendationId, isAIRecommended },
) {
  // ----------------------------------------------------------
  // EXPLICIT AI CART ITEM
  // ----------------------------------------------------------

  if (isAIRecommended === true && isValidId(recommendationId)) {
    const recommendation = await verifyAIRecommendation(client, {
      recommendationId,
      customerId,
      productId,
    });

    if (recommendation) {
      return recommendation;
    }

    console.log("⚠️ Explicit AI recommendation could not be verified:", {
      recommendationId,
      customerId,
      productId,
    });
  }

  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------
  //
  // If cart metadata is missing, find the latest matching
  // recommendation.
  //
  // ----------------------------------------------------------

  const fallback = await findLatestAIRecommendation(client, {
    customerId,
    productId,
  });

  if (fallback) {
    console.log("✅ AI recommendation recovered from recommendations table:", {
      recommendationId: fallback.recommendation_id,

      customerId,

      productId,
    });

    return fallback;
  }

  return null;
}

// ============================================================
// SAVE AI REVENUE
// ============================================================

async function saveAIRevenue(
  client,
  {
    orderId,
    customerId,
    recommendationId,
    productId,
    amount,
    paymentStatus,
    paymentId,
  },
) {
  if (!isValidId(orderId)) {
    return false;
  }

  if (!isValidId(customerId)) {
    return false;
  }

  if (!isValidId(recommendationId)) {
    return false;
  }

  if (!isValidId(productId)) {
    return false;
  }

  const revenueAmount = money(amount);

  if (revenueAmount <= 0) {
    return false;
  }

  // ==========================================================
  // VERIFY RECOMMENDATION
  // ==========================================================

  const recommendation = await verifyAIRecommendation(client, {
    recommendationId,
    customerId,
    productId,
  });

  if (!recommendation) {
    console.log("⚠️ AI recommendation verification failed:", {
      recommendationId,
      customerId,
      productId,
    });

    return false;
  }

  // ==========================================================
  // DUPLICATE CHECK
  // ==========================================================

  const existing = await client.query(
    `
        SELECT
          ai_revenue_id,
          payment_status,
          payment_id

        FROM ai_revenue

        WHERE recommendation_id = $1

          AND customer_id = $2

          AND product_id = $3

          AND payment_id = $4

        LIMIT 1
      `,
    [recommendationId, customerId, productId, paymentId],
  );

  if (existing.rows.length > 0) {
    console.log("ℹ️ AI revenue already exists:", {
      recommendationId,
      orderId,
      paymentId,
    });

    return true;
  }

  // ==========================================================
  // INSERT
  // ==========================================================

  await client.query(
    `
      INSERT INTO ai_revenue (
        recommendation_id,
        customer_id,
        product_id,
        amount,
        payment_status,
        payment_id
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
    `,
    [
      recommendationId,
      customerId,
      productId,
      revenueAmount,
      paymentStatus,
      paymentId,
    ],
  );

  console.log("✅ AI revenue saved:", {
    orderId,
    recommendationId,
    customerId,
    productId,
    amount: revenueAmount,
    paymentStatus,
    paymentId,
  });

  return true;
}

// ============================================================
// GET AI CART ITEMS
// ============================================================
//
// Resolves AI recommendations for cart products.
//
// ============================================================

async function getAICartItems(client, { customerId, cartItems }) {
  const aiItems = [];

  for (const item of cartItems) {
    const isAIRecommended = item.is_ai_recommended === true;

    // --------------------------------------------------------
    // IMPORTANT:
    // A normal cart item must NEVER be attributed to AI.
    // --------------------------------------------------------

    if (!isAIRecommended) {
      continue;
    }

    let recommendation = null;

    const productId = Number(item.product_id);

    // --------------------------------------------------------
    // FIRST: EXPLICIT RECOMMENDATION ID
    // --------------------------------------------------------

    if (isValidId(item.recommendation_id)) {
      recommendation = await verifyAIRecommendation(client, {
        recommendationId: Number(item.recommendation_id),
        customerId,
        productId,
      });

      if (!recommendation) {
        console.log(
          "⚠️ AI cart flag exists, but recommendation could not be verified:",
          {
            recommendationId: item.recommendation_id,
            customerId,
            productId,
          },
        );
      }
    }

    // --------------------------------------------------------
    // SECOND: SAFE FALLBACK
    // --------------------------------------------------------
    //
    // Only allowed because the cart item itself is explicitly
    // marked as AI-recommended.
    //
    // findLatestAIRecommendation() additionally requires:
    // - same customer
    // - same product
    // - pending recommendation
    // - recommendation created within 24 hours
    //
    // --------------------------------------------------------

    if (!recommendation) {
      recommendation = await findLatestAIRecommendation(client, {
        customerId,
        productId,
      });
    }

    // --------------------------------------------------------
    // NO VERIFIED AI RECOMMENDATION
    // --------------------------------------------------------

    if (!recommendation) {
      continue;
    }

    aiItems.push({
      ...item,

      recommendation_id: Number(recommendation.recommendation_id),

      is_ai_recommended: true,

      ai_recommendation: recommendation,
    });
  }

  return aiItems;
}

// ============================================================
// CREATE RAZORPAY ORDER
//
// POST /api/payment/create-order
// ============================================================

router.post("/create-order", async (req, res) => {
  let client = null;

  let transactionStarted = false;

  try {
    console.log("");

    console.log("================================================");

    console.log("CREATE PAYMENT ORDER");

    console.log("================================================");

    console.log("Request body:", req.body);

    // ======================================================
    // CUSTOMER ID
    // ======================================================

    const customer_id = req.body?.customer_id;

    if (!isValidId(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer_id is required.",
      });
    }

    const customerId = Number(customer_id);

    // ======================================================
    // DATABASE
    // ======================================================

    client = await db.connect();

    // ======================================================
    // CUSTOMER
    // ======================================================

    const customerResult = await client.query(
      `
            SELECT
              customer_id,
              name,
              email,
              phone

            FROM customers

            WHERE customer_id = $1

            LIMIT 1
          `,
      [customerId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const customer = customerResult.rows[0];

    // ======================================================
    // ACTIVE CART
    // ======================================================

    const cartResult = await client.query(
      `
            SELECT
              cart_id,
              customer_id,
              status,
              created_at,
              updated_at

            FROM carts

            WHERE customer_id = $1

              AND (
                status IS NULL

                OR LOWER(TRIM(status)) =
                   'active'
              )

            ORDER BY
              cart_id DESC

            LIMIT 1
          `,
      [customerId],
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. No active cart was found.",
      });
    }

    const cart = cartResult.rows[0];

    // ======================================================
    // CART ITEMS
    // ======================================================

    const cartItemsResult = await client.query(
      `
            SELECT
              ci.cart_item_id,
              ci.cart_id,
              ci.product_id,
              ci.quantity,
              ci.unit_price,
              ci.is_ai_recommended,
              ci.recommendation_id,

              p.name,
              p.brand,
              p.category,
              p.price,
              p.stock,
              p.status AS product_status

            FROM cart_items ci

            LEFT JOIN products p
              ON p.product_id =
                 ci.product_id

            WHERE ci.cart_id = $1

            ORDER BY
              ci.cart_item_id ASC
          `,
      [cart.cart_id],
    );

    const cartItems = cartItemsResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // ======================================================
    // VALIDATE CART
    // ======================================================

    for (const item of cartItems) {
      const quantity = Number(item.quantity);

      const stock = Number(item.stock);

      const productPrice = Number(item.price);

      if (!item.product_id || !item.name) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id || ""} could not be found.`,
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${item.name}.`,
        });
      }

      if (!Number.isFinite(stock)) {
        return res.status(400).json({
          success: false,
          message: `Stock information is unavailable for ${item.name}.`,
        });
      }

      if (stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `${item.name} has only ${stock} item(s) available.`,
        });
      }

      const productStatus = String(item.product_status || "active")
        .trim()
        .toLowerCase();

      const unavailableStatuses = [
        "inactive",
        "disabled",
        "unavailable",
        "deleted",
        "discontinued",
      ];

      if (unavailableStatuses.includes(productStatus)) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is currently unavailable.`,
        });
      }

      if (!Number.isFinite(productPrice) || productPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${item.name}.`,
        });
      }
    }

    // ======================================================
    // SUBTOTAL
    // ======================================================

    let subtotal = 0;

    for (const item of cartItems) {
      subtotal += Number(item.price) * Number(item.quantity);
    }

    subtotal = money(subtotal);

    // ======================================================
    // SHIPPING
    // ======================================================

    const shipping = subtotal >= 50000 ? 0 : 499;

    // ======================================================
    // TOTAL
    // ======================================================

    const total = money(subtotal + shipping);

    const amountInPaise = Math.round(total * 100);

    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    // ======================================================
    // BEGIN TRANSACTION
    // ======================================================

    await client.query("BEGIN");

    transactionStarted = true;

    // ======================================================
    // LOCK CART
    // ======================================================

    const lockedCartResult = await client.query(
      `
            SELECT
              cart_id,
              customer_id,
              status

            FROM carts

            WHERE cart_id = $1

            FOR UPDATE
          `,
      [cart.cart_id],
    );

    if (lockedCartResult.rows.length === 0) {
      throw new Error("Cart no longer exists.");
    }

    // ======================================================
    // CREATE LOCAL ORDER
    // ======================================================

    const orderResult = await client.query(
      `
            INSERT INTO orders (
              customer_id,
              total_amount,
              status
            )

            VALUES (
              $1,
              $2,
              'PENDING'
            )

            RETURNING
              order_id,
              customer_id,
              total_amount,
              status,
              created_at
          `,
      [customerId, total],
    );

    const order = orderResult.rows[0];

    // ======================================================
    // CREATE ORDER ITEMS
    // ======================================================

    for (const item of cartItems) {
      await client.query(
        `
            INSERT INTO order_items (
              order_id,
              product_id,
              quantity,
              price
            )

            VALUES (
              $1,
              $2,
              $3,
              $4
            )
          `,
        [
          order.order_id,

          Number(item.product_id),

          Number(item.quantity),

          Number(item.price),
        ],
      );
    }

    // ======================================================
    // RESOLVE AI ITEMS
    // ======================================================

    const aiItems = await getAICartItems(client, {
      customerId,

      cartItems,
    });

    console.log(
      "AI items detected during payment creation:",
      aiItems.map((item) => ({
        productId: item.product_id,

        productName: item.name,

        recommendationId: item.recommendation_id,

        cartFlag: item.is_ai_recommended,
      })),
    );

    // ======================================================
    // CREATE RAZORPAY ORDER
    // ======================================================

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,

      currency: "INR",

      receipt: `ORDER_${order.order_id}`,

      notes: {
        local_order_id: String(order.order_id),

        customer_id: String(customerId),

        cart_id: String(cart.cart_id),
      },
    });

    // ======================================================
    // SAVE PAYMENT
    // ======================================================

    const paymentResult = await client.query(
      `
            INSERT INTO payments (
              order_id,
              razorpay_order_id,
              amount,
              status
            )

            VALUES (
              $1,
              $2,
              $3,
              'CREATED'
            )

            RETURNING
              payment_id,
              order_id,
              razorpay_order_id,
              amount,
              status,
              created_at
          `,
      [order.order_id, razorpayOrder.id, total],
    );

    const payment = paymentResult.rows[0];

    // ======================================================
    // SAVE AI REVENUE
    // ======================================================

    let aiRevenueCount = 0;

    const temporaryPaymentId = `RZP_ORDER_${order.order_id}`;

    for (const item of aiItems) {
      const quantity = Number(item.quantity);

      const unitPrice = Number(item.unit_price ?? item.price);

      const aiAmount = money(unitPrice * quantity);

      const saved = await saveAIRevenue(client, {
        orderId: order.order_id,

        customerId,

        recommendationId: Number(item.recommendation_id),

        productId: Number(item.product_id),

        amount: aiAmount,

        paymentStatus: "pending",

        paymentId: temporaryPaymentId,
      });

      if (saved) {
        aiRevenueCount++;
      }
    }

    console.log("AI pending revenue records created:", aiRevenueCount);

    // ======================================================
    // COMMIT
    // ======================================================

    await client.query("COMMIT");

    transactionStarted = false;

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(201).json({
      success: true,

      message: "Payment order created successfully.",

      order: {
        order_id: order.order_id,

        customer_id: order.customer_id,

        total_amount: Number(order.total_amount),

        status: order.status,

        created_at: order.created_at,
      },

      payment: {
        payment_id: payment.payment_id,

        razorpay_order_id: payment.razorpay_order_id,

        amount: Number(payment.amount),

        status: payment.status,
      },

      local_order_id: order.order_id,

      razorpay_order_id: razorpayOrder.id,

      amount: razorpayOrder.amount,

      currency: razorpayOrder.currency,

      key_id: process.env.RAZORPAY_KEY_ID,

      customer,

      cart_id: cart.cart_id,

      summary: {
        subtotal,

        shipping,

        total,
      },

      ai: {
        detected: aiItems.length > 0,

        item_count: aiItems.length,

        revenue_records: aiRevenueCount,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("CREATE PAYMENT ORDER ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Unable to create payment order.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ============================================================
// CREATE COD ORDER
//
// POST /api/payment/cod
// ============================================================

router.post("/cod", async (req, res) => {
  let client = null;

  let transactionStarted = false;

  try {
    console.log("");

    console.log("================================================");

    console.log("CREATE COD ORDER");

    console.log("================================================");

    const customer_id = req.body?.customer_id;

    if (!isValidId(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer_id is required.",
      });
    }

    const customerId = Number(customer_id);

    client = await db.connect();

    // ======================================================
    // CUSTOMER
    // ======================================================

    const customerResult = await client.query(
      `
            SELECT
              customer_id,
              name,
              email,
              phone

            FROM customers

            WHERE customer_id = $1

            LIMIT 1
          `,
      [customerId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const customer = customerResult.rows[0];

    // ======================================================
    // ACTIVE CART
    // ======================================================

    const cartResult = await client.query(
      `
            SELECT
              cart_id,
              customer_id,
              status,
              created_at,
              updated_at

            FROM carts

            WHERE customer_id = $1

              AND (
                status IS NULL

                OR LOWER(TRIM(status)) =
                   'active'
              )

            ORDER BY
              cart_id DESC

            LIMIT 1
          `,
      [customerId],
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. No active cart was found.",
      });
    }

    const cart = cartResult.rows[0];

    // ======================================================
    // CART ITEMS
    // ======================================================

    const cartItemsResult = await client.query(
      `
            SELECT
              ci.cart_item_id,
              ci.cart_id,
              ci.product_id,
              ci.quantity,
              ci.unit_price,
              ci.is_ai_recommended,
              ci.recommendation_id,

              p.name,
              p.brand,
              p.category,
              p.price,
              p.stock,
              p.status AS product_status

            FROM cart_items ci

            LEFT JOIN products p
              ON p.product_id =
                 ci.product_id

            WHERE ci.cart_id = $1

            ORDER BY
              ci.cart_item_id ASC
          `,
      [cart.cart_id],
    );

    const cartItems = cartItemsResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // ======================================================
    // VALIDATE
    // ======================================================

    for (const item of cartItems) {
      const quantity = Number(item.quantity);

      const stock = Number(item.stock);

      const productPrice = Number(item.price);

      if (!item.product_id || !item.name) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id || ""} could not be found.`,
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${item.name}.`,
        });
      }

      if (!Number.isFinite(stock)) {
        return res.status(400).json({
          success: false,
          message: `Stock information is unavailable for ${item.name}.`,
        });
      }

      if (stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `${item.name} has only ${stock} item(s) available.`,
        });
      }

      const productStatus = String(item.product_status || "active")
        .trim()
        .toLowerCase();

      const unavailableStatuses = [
        "inactive",
        "disabled",
        "unavailable",
        "deleted",
        "discontinued",
      ];

      if (unavailableStatuses.includes(productStatus)) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is currently unavailable.`,
        });
      }

      if (!Number.isFinite(productPrice) || productPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${item.name}.`,
        });
      }
    }

    // ======================================================
    // TOTAL
    // ======================================================

    let subtotal = 0;

    for (const item of cartItems) {
      subtotal += Number(item.price) * Number(item.quantity);
    }

    subtotal = money(subtotal);

    const shipping = subtotal >= 50000 ? 0 : 499;

    const total = money(subtotal + shipping);

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount.",
      });
    }

    // ======================================================
    // BEGIN
    // ======================================================

    await client.query("BEGIN");

    transactionStarted = true;

    // ======================================================
    // LOCK CART
    // ======================================================

    const lockedCartResult = await client.query(
      `
            SELECT
              cart_id,
              customer_id,
              status

            FROM carts

            WHERE cart_id = $1

            FOR UPDATE
          `,
      [cart.cart_id],
    );

    if (lockedCartResult.rows.length === 0) {
      throw new Error("Cart no longer exists.");
    }

    // ======================================================
    // CREATE ORDER
    // ======================================================

    const orderResult = await client.query(
      `
            INSERT INTO orders (
              customer_id,
              total_amount,
              status
            )

            VALUES (
              $1,
              $2,
              'PLACED'
            )

            RETURNING
              order_id,
              customer_id,
              total_amount,
              status,
              created_at
          `,
      [customerId, total],
    );

    const order = orderResult.rows[0];

    // ======================================================
    // ORDER ITEMS
    // ======================================================

    for (const item of cartItems) {
      await client.query(
        `
            INSERT INTO order_items (
              order_id,
              product_id,
              quantity,
              price
            )

            VALUES (
              $1,
              $2,
              $3,
              $4
            )
          `,
        [
          order.order_id,

          Number(item.product_id),

          Number(item.quantity),

          Number(item.price),
        ],
      );
    }

    // ======================================================
    // STOCK
    // ======================================================

    for (const item of cartItems) {
      const stockResult = await client.query(
        `
              UPDATE products

              SET
                stock =
                  stock - $1

              WHERE product_id = $2

                AND stock >= $1

              RETURNING
                product_id,
                stock
            `,
        [Number(item.quantity), Number(item.product_id)],
      );

      if (stockResult.rows.length === 0) {
        throw new Error(`Unable to reserve stock for ${item.name}.`);
      }
    }

    // ======================================================
    // COD PAYMENT
    // ======================================================

    const paymentResult = await client.query(
      `
            INSERT INTO payments (
              order_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              status
            )

            VALUES (
              $1,
              NULL,
              NULL,
              $2,
              'COD_PENDING'
            )

            RETURNING
              payment_id,
              order_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              status,
              created_at
          `,
      [order.order_id, total],
    );

    const payment = paymentResult.rows[0];

    // ======================================================
    // RESOLVE AI ITEMS
    // ======================================================

    const aiItems = await getAICartItems(client, {
      customerId,

      cartItems,
    });

    console.log(
      "AI COD items detected:",
      aiItems.map((item) => ({
        productId: item.product_id,

        productName: item.name,

        recommendationId: item.recommendation_id,
      })),
    );

    // ======================================================
    // AI REVENUE
    // ======================================================

    let aiRevenueCount = 0;

    for (const item of aiItems) {
      const quantity = Number(item.quantity);

      const unitPrice = Number(item.unit_price ?? item.price);

      const aiAmount = money(unitPrice * quantity);

      const codPaymentId = `COD_${order.order_id}`;

      const saved = await saveAIRevenue(client, {
        orderId: order.order_id,

        customerId,

        recommendationId: Number(item.recommendation_id),

        productId: Number(item.product_id),

        amount: aiAmount,

        paymentStatus: "cod_pending",

        paymentId: codPaymentId,
      });

      if (saved) {
        aiRevenueCount++;

        // ----------------------------------------------
        // MARK RECOMMENDATION COMPLETED
        // ----------------------------------------------

        await client.query(
          `
              UPDATE recommendations

              SET
                status = 'completed'

              WHERE recommendation_id = $1
            `,
          [Number(item.recommendation_id)],
        );
      }
    }

    // ======================================================
    // COMPLETE CART
    // ======================================================

    await client.query(
      `
          UPDATE carts

          SET
            status = 'completed',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE cart_id = $1
        `,
      [cart.cart_id],
    );

    // ======================================================
    // COMMIT
    // ======================================================

    await client.query("COMMIT");

    transactionStarted = false;

    // ======================================================
    // EMAIL
    // ======================================================

    try {
      await sendOrderConfirmationEmail({
        customer,

        order,

        payment,

        items: cartItems,

        paymentMethod: "cod",
      });
    } catch (emailError) {
      console.error("⚠️ COD email failed:", emailError.message);
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(201).json({
      success: true,

      message: "Cash on Delivery order placed successfully.",

      order: {
        order_id: order.order_id,

        customer_id: order.customer_id,

        total_amount: Number(order.total_amount),

        status: order.status,

        created_at: order.created_at,
      },

      payment: {
        payment_id: payment.payment_id,

        order_id: payment.order_id,

        amount: Number(payment.amount),

        status: payment.status,
      },

      local_order_id: order.order_id,

      customer,

      cart_id: cart.cart_id,

      summary: {
        subtotal,

        shipping,

        total,
      },

      payment_method: "cod",

      payment_status: "COD_PENDING",

      ai: {
        detected: aiItems.length > 0,

        item_count: aiItems.length,

        revenue_records: aiRevenueCount,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("COD rollback error:", rollbackError);
      }
    }

    console.error("CREATE COD ORDER ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Unable to place Cash on Delivery order.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ============================================================
// VERIFY RAZORPAY PAYMENT
//
// POST /api/payment/verify
// ============================================================

router.post("/verify", async (req, res) => {
  let client = null;

  let transactionStarted = false;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_id,
      order_id,
    } = req.body;

    console.log("");

    console.log("================================================");

    console.log("VERIFY PAYMENT");

    console.log("================================================");

    // ======================================================
    // VALIDATION
    // ======================================================

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Incomplete Razorpay payment information.",
      });
    }

    if (!isValidId(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer_id is required.",
      });
    }

    if (!isValidId(order_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required.",
      });
    }

    const customerId = Number(customer_id);

    const orderId = Number(order_id);

    // ======================================================
    // SIGNATURE
    // ======================================================

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // ======================================================
    // DATABASE
    // ======================================================

    client = await db.connect();

    await client.query("BEGIN");

    transactionStarted = true;

    // ======================================================
    // ORDER
    // ======================================================

    const orderResult = await client.query(
      `
            SELECT
              order_id,
              customer_id,
              total_amount,
              status,
              created_at

            FROM orders

            WHERE order_id = $1

            FOR UPDATE
          `,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found.");
    }

    const order = orderResult.rows[0];

    if (Number(order.customer_id) !== customerId) {
      throw new Error("Order does not belong to this customer.");
    }

    // ======================================================
    // PAYMENT
    // ======================================================

    const paymentResult = await client.query(
      `
            SELECT
              payment_id,
              order_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              status,
              created_at

            FROM payments

            WHERE order_id = $1

            ORDER BY
              payment_id DESC

            LIMIT 1

            FOR UPDATE
          `,
      [orderId],
    );

    const existingPayment = paymentResult.rows[0];

    if (!existingPayment) {
      throw new Error("Payment record not found.");
    }

    // ======================================================
    // ALREADY PAID
    // ======================================================

    if (String(order.status).toUpperCase() === "PAID") {
      await client.query("COMMIT");

      transactionStarted = false;

      return res.json({
        success: true,

        message: "Payment was already verified.",

        order,

        payment: existingPayment,
      });
    }

    // ======================================================
    // RAZORPAY ORDER CHECK
    // ======================================================

    if (existingPayment.razorpay_order_id !== razorpay_order_id) {
      throw new Error("Razorpay order does not match this order.");
    }

    // ======================================================
    // AMOUNT
    // ======================================================

    const expectedAmount = money(order.total_amount);

    const recordedAmount = money(existingPayment.amount);

    if (Math.abs(expectedAmount - recordedAmount) > 0.01) {
      throw new Error("Payment amount does not match order amount.");
    }

    // ======================================================
    // ORDER ITEMS
    // ======================================================

    const itemsResult = await client.query(
      `
            SELECT
              oi.order_item_id,
              oi.product_id,
              oi.quantity,
              oi.price,

              p.name,
              p.stock

            FROM order_items oi

            INNER JOIN products p
              ON p.product_id =
                 oi.product_id

            WHERE oi.order_id = $1

            FOR UPDATE OF p
          `,
      [orderId],
    );

    if (itemsResult.rows.length === 0) {
      throw new Error("Order contains no products.");
    }

    // ======================================================
    // STOCK CHECK
    // ======================================================

    for (const item of itemsResult.rows) {
      if (Number(item.stock) < Number(item.quantity)) {
        throw new Error(`${item.name} no longer has enough stock.`);
      }
    }

    // ======================================================
    // REDUCE STOCK
    // ======================================================

    for (const item of itemsResult.rows) {
      const updateResult = await client.query(
        `
              UPDATE products

              SET
                stock =
                  stock - $1

              WHERE product_id = $2

                AND stock >= $1

              RETURNING
                product_id,
                stock
            `,
        [Number(item.quantity), Number(item.product_id)],
      );

      if (updateResult.rows.length === 0) {
        throw new Error(`Unable to update stock for ${item.name}.`);
      }
    }

    // ======================================================
    // MARK ORDER PAID
    // ======================================================

    const updatedOrderResult = await client.query(
      `
            UPDATE orders

            SET
              status = 'PAID'

            WHERE order_id = $1

            RETURNING
              order_id,
              customer_id,
              total_amount,
              status,
              created_at
          `,
      [orderId],
    );

    const updatedOrder = updatedOrderResult.rows[0];

    // ======================================================
    // UPDATE PAYMENT
    // ======================================================

    const updatedPaymentResult = await client.query(
      `
            UPDATE payments

            SET
              razorpay_payment_id = $1,

              amount = $2,

              status = 'SUCCESS'

            WHERE payment_id = $3

            RETURNING
              payment_id,
              order_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              status,
              created_at
          `,
      [razorpay_payment_id, expectedAmount, existingPayment.payment_id],
    );

    const updatedPayment = updatedPaymentResult.rows[0];

    // ======================================================
    // UPDATE AI REVENUE
    // ======================================================

    const temporaryPaymentId = `RZP_ORDER_${orderId}`;

    const aiRevenueResult = await client.query(
      `
            SELECT
              ai_revenue_id,
              recommendation_id,
              customer_id,
              product_id,
              amount,
              payment_status,
              payment_id

            FROM ai_revenue

            WHERE customer_id = $1

              AND payment_id = $2

              AND LOWER(
                    TRIM(
                      payment_status
                    )
                  ) = 'pending'

            FOR UPDATE
          `,
      [customerId, temporaryPaymentId],
    );

    console.log(
      "Pending AI revenue records found:",
      aiRevenueResult.rows.length,
    );

    for (const revenue of aiRevenueResult.rows) {
      await client.query(
        `
            UPDATE ai_revenue

            SET
              payment_status =
                'success',

              payment_id = $1

            WHERE ai_revenue_id = $2
          `,
        [razorpay_payment_id, revenue.ai_revenue_id],
      );

      // ----------------------------------------------------
      // MARK RECOMMENDATION COMPLETED
      // ----------------------------------------------------

      await client.query(
        `
            UPDATE recommendations

            SET
              status = 'completed'

            WHERE recommendation_id = $1
          `,
        [Number(revenue.recommendation_id)],
      );

      console.log("✅ AI revenue converted to SUCCESS:", {
        ai_revenue_id: revenue.ai_revenue_id,

        recommendation_id: revenue.recommendation_id,

        product_id: revenue.product_id,

        amount: revenue.amount,
      });
    }

    // ======================================================
    // COMPLETE CART
    // ======================================================

    const activeCartResult = await client.query(
      `
            SELECT
              cart_id

            FROM carts

            WHERE customer_id = $1

              AND (
                status IS NULL

                OR LOWER(TRIM(status)) =
                   'active'
              )

            ORDER BY
              cart_id DESC

            LIMIT 1

            FOR UPDATE
          `,
      [customerId],
    );

    const activeCart = activeCartResult.rows[0];

    if (activeCart) {
      await client.query(
        `
            UPDATE carts

            SET
              status =
                'completed',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE cart_id = $1
          `,
        [activeCart.cart_id],
      );
    }

    // ======================================================
    // COMMIT
    // ======================================================

    await client.query("COMMIT");

    transactionStarted = false;

    // ======================================================
    // EMAIL
    // ======================================================

    try {
      const emailCustomerResult = await db.query(
        `
              SELECT
                customer_id,
                name,
                email,
                phone

              FROM customers

              WHERE customer_id = $1

              LIMIT 1
            `,
        [customerId],
      );

      const emailCustomer = emailCustomerResult.rows[0] || null;

      const emailItemsResult = await db.query(
        `
              SELECT
                oi.order_item_id,
                oi.product_id,
                oi.quantity,
                oi.price,

                p.name,
                p.brand,
                p.category

              FROM order_items oi

              LEFT JOIN products p
                ON p.product_id =
                   oi.product_id

              WHERE oi.order_id = $1

              ORDER BY
                oi.order_item_id ASC
            `,
        [orderId],
      );

      await sendOrderConfirmationEmail({
        customer: emailCustomer,

        order: updatedOrder,

        payment: updatedPayment,

        items: emailItemsResult.rows,

        paymentMethod: "online",
      });

      console.log("✅ Online payment confirmation email sent.");
    } catch (emailError) {
      console.error(
        "⚠️ Payment successful, but confirmation email failed:",
        emailError.message,
      );
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.json({
      success: true,

      message: "Payment verified successfully.",

      order: updatedOrder,

      payment: updatedPayment,

      ai: {
        revenue_updated: aiRevenueResult.rows.length,

        payment_status: "success",
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Payment verification failed.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ============================================================
// GET PAYMENT
//
// GET /api/payment/:razorpayOrderId
// ============================================================

router.get("/:razorpayOrderId", async (req, res) => {
  try {
    const { razorpayOrderId } = req.params;

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID is required.",
      });
    }

    const result = await db.query(
      `
            SELECT
              payment_id,
              order_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              status,
              created_at

            FROM payments

            WHERE razorpay_order_id = $1

            ORDER BY
              created_at DESC

            LIMIT 1
          `,
      [razorpayOrderId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,

      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
