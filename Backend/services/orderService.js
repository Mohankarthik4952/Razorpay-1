// ============================================================
// ELECTRONICS AI
// ORDER SERVICE
// ============================================================

const pool = require("../database");

// ============================================================
// GET OR CREATE CUSTOMER
// ============================================================

async function getOrCreateCustomer({ name, email, phone }) {
  const existing = await pool.query(
    `
      SELECT
        customer_id,
        name,
        email,
        phone
      FROM customers
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `,
    [email],
  );

  // ----------------------------------------------------------
  // CUSTOMER ALREADY EXISTS
  // ----------------------------------------------------------

  if (existing.rows.length > 0) {
    const customer = existing.rows[0];

    await pool.query(
      `
        UPDATE customers
        SET
          name = $1,
          phone = $2
        WHERE customer_id = $3;
      `,
      [name, phone || null, customer.customer_id],
    );

    return {
      ...customer,

      name,

      phone: phone || null,
    };
  }

  // ----------------------------------------------------------
  // CREATE NEW CUSTOMER
  // ----------------------------------------------------------

  const result = await pool.query(
    `
      INSERT INTO customers (
        name,
        email,
        phone
      )
      VALUES (
        $1,
        $2,
        $3
      )
      RETURNING
        customer_id,
        name,
        email,
        phone;
    `,
    [name, email, phone || null],
  );

  return result.rows[0];
}

// ============================================================
// CREATE PENDING ORDER
// ============================================================
//
// Creates:
//
// 1. Customer
// 2. Order
// 3. Order items
//
// Payment is created separately.
//
// AI information is preserved in the returned
// "aiItems" array without requiring changes to
// the order_items database table.
//
// ============================================================

async function createPendingOrder({ customer, items, total }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ========================================================
    // VALIDATE CUSTOMER
    // ========================================================

    if (!customer || !customer.email) {
      throw new Error("Customer information is required.");
    }

    // ========================================================
    // VALIDATE ITEMS
    // ========================================================

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Order must contain at least one item.");
    }

    // ========================================================
    // CUSTOMER
    // ========================================================

    let customerResult = await client.query(
      `
          SELECT
            customer_id,
            name,
            email,
            phone
          FROM customers
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1;
        `,
      [customer.email],
    );

    let customerRecord;

    // --------------------------------------------------------
    // EXISTING CUSTOMER
    // --------------------------------------------------------

    if (customerResult.rows.length > 0) {
      customerRecord = customerResult.rows[0];

      await client.query(
        `
          UPDATE customers
          SET
            name = $1,
            phone = $2
          WHERE customer_id = $3;
        `,
        [customer.name, customer.phone || null, customerRecord.customer_id],
      );

      customerRecord = {
        ...customerRecord,

        name: customer.name,

        phone: customer.phone || null,
      };
    }

    // --------------------------------------------------------
    // NEW CUSTOMER
    // --------------------------------------------------------
    else {
      const newCustomer = await client.query(
        `
            INSERT INTO customers (
              name,
              email,
              phone
            )
            VALUES (
              $1,
              $2,
              $3
            )
            RETURNING
              customer_id,
              name,
              email,
              phone;
          `,
        [customer.name, customer.email, customer.phone || null],
      );

      customerRecord = newCustomer.rows[0];
    }

    // ========================================================
    // CREATE ORDER
    // ========================================================

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
            $3
          )
          RETURNING
            order_id,
            customer_id,
            total_amount,
            status,
            created_at;
        `,
      [customerRecord.customer_id, total, "PENDING"],
    );

    const order = orderResult.rows[0];

    // ========================================================
    // AI ITEMS
    // ========================================================
    //
    // We don't store these fields in order_items because
    // the existing database table does not contain them.
    //
    // We preserve them in memory and return them to the
    // caller so the payment service can attribute revenue.
    //
    // ========================================================

    const aiItems = [];

    // ========================================================
    // CREATE ORDER ITEMS
    // ========================================================

    for (const item of items) {
      // ------------------------------------------------------
      // BASIC VALIDATION
      // ------------------------------------------------------

      const productId = Number(item.product_id);

      const quantity = Number(item.quantity);

      const price = Number(item.price);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error(`Invalid product ID: ${item.product_id}`);
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for product ${productId}.`);
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`Invalid price for product ${productId}.`);
      }

      // ------------------------------------------------------
      // INSERT ORDER ITEM
      // ------------------------------------------------------

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
          );
        `,
        [order.order_id, productId, quantity, price],
      );

      // ======================================================
      // CAPTURE AI ATTRIBUTION
      // ======================================================

      const isAIRecommended =
        item.is_ai_recommended === true ||
        item.is_ai_recommended === "true" ||
        item.isAIRecommended === true;

      const recommendationId = Number(
        item.recommendation_id ?? item.recommendationId ?? 0,
      );

      if (
        isAIRecommended &&
        Number.isInteger(recommendationId) &&
        recommendationId > 0
      ) {
        aiItems.push({
          product_id: productId,

          quantity,

          price,

          recommendation_id: recommendationId,

          is_ai_recommended: true,

          amount: Number((price * quantity).toFixed(2)),
        });
      }
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query("COMMIT");

    // ========================================================
    // RETURN
    // ========================================================

    return {
      order,

      customer: customerRecord,

      // ------------------------------------------------------
      // AI ATTRIBUTION
      // ------------------------------------------------------

      aiItems,

      aiItemCount: aiItems.length,

      hasAIItems: aiItems.length > 0,
    };
  } catch (error) {
    // ========================================================
    // ROLLBACK
    // ========================================================

    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Order rollback error:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// GET ORDER
// ============================================================

async function getOrderById(orderId) {
  const orderResult = await pool.query(
    `
        SELECT
          o.order_id,
          o.customer_id,
          o.total_amount,
          o.status,
          o.created_at,

          c.name AS customer_name,
          c.email AS customer_email,
          c.phone AS customer_phone

        FROM orders o

        JOIN customers c
          ON c.customer_id =
             o.customer_id

        WHERE o.order_id = $1;
      `,
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const order = orderResult.rows[0];

  // ==========================================================
  // ORDER ITEMS
  // ==========================================================

  const itemsResult = await pool.query(
    `
        SELECT
          oi.order_item_id,
          oi.product_id,
          oi.quantity,
          oi.price,

          p.name,
          p.category,
          p.brand,
          p.image_url

        FROM order_items oi

        JOIN products p
          ON p.product_id =
             oi.product_id

        WHERE oi.order_id = $1

        ORDER BY
          oi.order_item_id;
      `,
    [orderId],
  );

  // ==========================================================
  // PAYMENT
  // ==========================================================

  const paymentResult = await pool.query(
    `
        SELECT
          payment_id,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          status,
          created_at

        FROM payments

        WHERE order_id = $1

        ORDER BY
          payment_id DESC

        LIMIT 1;
      `,
    [orderId],
  );

  // ==========================================================
  // RETURN ORDER
  // ==========================================================

  return {
    ...order,

    total_amount: Number(order.total_amount),

    items: itemsResult.rows.map((item) => ({
      ...item,

      price: Number(item.price),
    })),

    payment:
      paymentResult.rows.length > 0
        ? {
            ...paymentResult.rows[0],

            amount: Number(paymentResult.rows[0].amount),
          }
        : null,
  };
}

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

async function updateOrderStatus(orderId, status, client = pool) {
  const result = await client.query(
    `
        UPDATE orders
        SET status = $1
        WHERE order_id = $2
        RETURNING
          order_id,
          customer_id,
          total_amount,
          status,
          created_at;
      `,
    [status, orderId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getOrCreateCustomer,

  createPendingOrder,

  getOrderById,

  updateOrderStatus,
};
