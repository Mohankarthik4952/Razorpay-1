// ============================================================
// ELECTRONICS AI
// ORDERS ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const db = require("../database");

// ============================================================
// GET CUSTOMER ORDERS
// GET /api/orders/customer/:customerId
// ============================================================

router.get("/customer/:customerId", async (req, res) => {
  try {
    // ========================================================
    // CUSTOMER ID
    // ========================================================

    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // ========================================================
    // CHECK CUSTOMER
    // ========================================================

    const customerResult = await db.query(
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

    // ========================================================
    // GET ORDERS
    // ========================================================

    const result = await db.query(
      `
          SELECT
            o.order_id,
            o.customer_id,
            o.total_amount,
            o.status,
            o.created_at,

            COUNT(
              oi.order_item_id
            )::INTEGER AS item_count

          FROM orders o

          LEFT JOIN order_items oi
            ON oi.order_id = o.order_id

          WHERE o.customer_id = $1

          GROUP BY
            o.order_id,
            o.customer_id,
            o.total_amount,
            o.status,
            o.created_at

          ORDER BY
            o.created_at DESC
          `,
      [customerId],
    );

    const orders = result.rows;

    // ========================================================
    // NO ORDERS
    // ========================================================

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        customer_id: customerId,
        orders: [],
      });
    }

    // ========================================================
    // ORDER IDS
    // ========================================================

    const orderIds = orders.map((order) => order.order_id);

    // ========================================================
    // PAYMENT INFORMATION
    // ========================================================

    const paymentResult = await db.query(
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

          WHERE order_id = ANY($1::int[])

          ORDER BY
            created_at DESC
          `,
      [orderIds],
    );

    // ========================================================
    // PAYMENT MAP
    // ========================================================

    const paymentMap = new Map();

    for (const payment of paymentResult.rows) {
      // Keep latest payment
      // for each order.

      if (!paymentMap.has(payment.order_id)) {
        paymentMap.set(payment.order_id, payment);
      }
    }

    // ========================================================
    // ADD PAYMENT TO ORDERS
    // ========================================================

    const finalOrders = orders.map((order) => ({
      ...order,

      payment: paymentMap.get(order.order_id) || null,
    }));

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      customer_id: customerId,

      orders: finalOrders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load customer orders.",
    });
  }
});

// ============================================================
// GET SINGLE ORDER
// GET /api/orders/:orderId
// ============================================================

router.get("/:orderId", async (req, res) => {
  try {
    // ========================================================
    // ORDER ID
    // ========================================================

    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    // ========================================================
    // ORDER
    // ========================================================

    const orderResult = await db.query(
      `
          SELECT
            o.order_id,
            o.customer_id,
            o.total_amount,
            o.status,
            o.created_at

          FROM orders o

          WHERE o.order_id = $1

          LIMIT 1
          `,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const order = orderResult.rows[0];

    // ========================================================
    // CUSTOMER
    // ========================================================

    const customerResult = await db.query(
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
      [order.customer_id],
    );

    const customer = customerResult.rows[0] || null;

    // ========================================================
    // ORDER ITEMS
    // ========================================================

    const itemsResult = await db.query(
      `
          SELECT
            oi.order_item_id,
            oi.order_id,
            oi.product_id,
            oi.quantity,
            oi.price,

            p.name,
            p.brand,
            p.category,
            p.image_url

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

    // ========================================================
    // PAYMENT
    // ========================================================

    const paymentResult = await db.query(
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
            created_at DESC

          LIMIT 1
          `,
      [orderId],
    );

    const payment = paymentResult.rows[0] || null;

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      order: {
        ...order,

        customer,

        items: itemsResult.rows,

        payment,
      },
    });
  } catch (error) {
    console.error("Get order details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load order details.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
