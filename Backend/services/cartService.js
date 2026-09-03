const pool = require("../database");

// ============================================================
// GET OR CREATE CART
// ============================================================

async function getOrCreateCart(customerId) {
  const existing = await pool.query(
    `
      SELECT
        cart_id,
        customer_id,
        status,
        created_at,
        updated_at
      FROM carts
      WHERE customer_id = $1
        AND LOWER(COALESCE(status, 'ACTIVE')) = 'active'
      ORDER BY cart_id DESC
      LIMIT 1;
      `,
    [customerId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const result = await pool.query(
    `
      INSERT INTO carts (
        customer_id,
        status
      )
      VALUES (
        $1,
        'ACTIVE'
      )
      RETURNING
        cart_id,
        customer_id,
        status,
        created_at,
        updated_at;
      `,
    [customerId],
  );

  return result.rows[0];
}

// ============================================================
// GET CART BY CUSTOMER
// ============================================================

async function getCartByCustomerId(customerId) {
  const cartResult = await pool.query(
    `
      SELECT
        cart_id,
        customer_id,
        status,
        created_at,
        updated_at
      FROM carts
      WHERE customer_id = $1
        AND LOWER(COALESCE(status, 'ACTIVE')) = 'active'
      ORDER BY cart_id DESC
      LIMIT 1;
      `,
    [customerId],
  );

  if (cartResult.rows.length === 0) {
    return null;
  }

  const cart = cartResult.rows[0];

  const itemsResult = await pool.query(
    `
      SELECT
        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.unit_price,
        ci.is_ai_recommended,
        ci.recommendation_id,
        ci.created_at,

        p.name,
        p.category,
        p.brand,
        p.price AS current_price,
        p.description,
        p.stock,
        p.status

      FROM cart_items ci

      JOIN products p
        ON p.product_id = ci.product_id

      WHERE ci.cart_id = $1

      ORDER BY ci.cart_item_id;
      `,
    [cart.cart_id],
  );

  const items = itemsResult.rows.map((item) => ({
    cart_item_id: item.cart_item_id,

    cart_id: item.cart_id,

    product_id: item.product_id,

    quantity: Number(item.quantity),

    // Always expose current DB price
    unit_price: Number(item.current_price),

    is_ai_recommended: Boolean(item.is_ai_recommended),

    recommendation_id: item.recommendation_id,

    created_at: item.created_at,

    name: item.name,

    category: item.category,

    brand: item.brand,

    description: item.description,

    stock: item.stock,

    status: item.status,

    subtotal: Number(item.current_price) * Number(item.quantity),
  }));

  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);

  return {
    ...cart,

    items,

    item_count: items.reduce((count, item) => count + item.quantity, 0),

    subtotal: Number(subtotal.toFixed(2)),
  };
}

// ============================================================
// ADD ITEM TO CART
// ============================================================
//
// IMPORTANT:
// Price comes from PostgreSQL.
// The frontend cannot override it.
//
// ============================================================

async function addItemToCart({
  customerId,
  productId,
  quantity = 1,
  isAiRecommended = false,
  recommendationId = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ========================================================
    // PRODUCT
    // ========================================================

    const productResult = await client.query(
      `
        SELECT
          product_id,
          name,
          category,
          brand,
          price,
          stock,
          status
        FROM products
        WHERE product_id = $1;
        `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      throw new Error("Product not found.");
    }

    const product = productResult.rows[0];

    // ========================================================
    // STOCK
    // ========================================================

    if (product.stock !== null && Number(product.stock) < quantity) {
      throw new Error(`Only ${product.stock} unit(s) available.`);
    }

    // ========================================================
    // CART
    // ========================================================

    const cartResult = await client.query(
      `
        SELECT
          cart_id
        FROM carts
        WHERE customer_id = $1
          AND LOWER(COALESCE(status, 'ACTIVE')) = 'active'
        ORDER BY cart_id DESC
        LIMIT 1;
        `,
      [customerId],
    );

    let cartId;

    if (cartResult.rows.length > 0) {
      cartId = cartResult.rows[0].cart_id;
    } else {
      const newCart = await client.query(
        `
          INSERT INTO carts (
            customer_id,
            status
          )
          VALUES (
            $1,
            'ACTIVE'
          )
          RETURNING cart_id;
          `,
        [customerId],
      );

      cartId = newCart.rows[0].cart_id;
    }

    // ========================================================
    // CHECK EXISTING ITEM
    // ========================================================

    const existingItem = await client.query(
      `
        SELECT
          cart_item_id,
          quantity,
          is_ai_recommended,
          recommendation_id
        FROM cart_items
        WHERE cart_id = $1
          AND product_id = $2
        LIMIT 1;
        `,
      [cartId, productId],
    );

    let item;

    // ========================================================
    // UPDATE EXISTING ITEM
    // ========================================================

    if (existingItem.rows.length > 0) {
      const existing = existingItem.rows[0];

      const newQuantity = Number(existing.quantity) + Number(quantity);

      if (product.stock !== null && newQuantity > Number(product.stock)) {
        throw new Error(`Only ${product.stock} unit(s) available.`);
      }

      const updateResult = await client.query(
        `
          UPDATE cart_items
          SET
            quantity = $1,
            unit_price = $2,

            is_ai_recommended =
              CASE
                WHEN $3 = true
                THEN true
                ELSE is_ai_recommended
              END,

            recommendation_id =
              CASE
                WHEN $4 IS NOT NULL
                THEN $4
                ELSE recommendation_id
              END

          WHERE cart_item_id = $5

          RETURNING
            cart_item_id,
            cart_id,
            product_id,
            quantity,
            unit_price,
            is_ai_recommended,
            recommendation_id;
          `,
        [
          newQuantity,

          product.price,

          Boolean(isAiRecommended),

          recommendationId,

          existing.cart_item_id,
        ],
      );

      item = updateResult.rows[0];
    }

    // ========================================================
    // CREATE NEW ITEM
    // ========================================================
    else {
      const insertResult = await client.query(
        `
          INSERT INTO cart_items (
            cart_id,
            product_id,
            quantity,
            unit_price,
            is_ai_recommended,
            recommendation_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING
            cart_item_id,
            cart_id,
            product_id,
            quantity,
            unit_price,
            is_ai_recommended,
            recommendation_id;
          `,
        [
          cartId,

          productId,

          quantity,

          product.price,

          Boolean(isAiRecommended),

          recommendationId,
        ],
      );

      item = insertResult.rows[0];
    }

    // ========================================================
    // UPDATE CART TIMESTAMP
    // ========================================================

    await client.query(
      `
      UPDATE carts
      SET updated_at = CURRENT_TIMESTAMP
      WHERE cart_id = $1;
      `,
      [cartId],
    );

    await client.query("COMMIT");

    return {
      ...item,

      name: product.name,

      category: product.category,

      brand: product.brand,

      price: Number(product.price),
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// UPDATE CART ITEM QUANTITY
// ============================================================

async function updateCartItem(cartItemId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const result = await pool.query(
    `
      UPDATE cart_items ci
      SET
        quantity = $1,
        unit_price = p.price

      FROM products p

      WHERE ci.cart_item_id = $2
        AND p.product_id = ci.product_id

      RETURNING
        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.unit_price,
        ci.is_ai_recommended,
        ci.recommendation_id;
      `,
    [quantity, cartItemId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================
// REMOVE CART ITEM
// ============================================================

async function removeCartItem(cartItemId) {
  const result = await pool.query(
    `
      DELETE FROM cart_items
      WHERE cart_item_id = $1
      RETURNING
        cart_item_id,
        cart_id,
        product_id;
      `,
    [cartItemId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================
// CLEAR CART
// ============================================================

async function clearCart(cartId) {
  await pool.query(
    `
    DELETE FROM cart_items
    WHERE cart_id = $1;
    `,
    [cartId],
  );

  await pool.query(
    `
    UPDATE carts
    SET
      updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = $1;
    `,
    [cartId],
  );

  return true;
}

// ============================================================
// VALIDATE CHECKOUT ITEMS
// ============================================================
//
// This is used by payment creation.
//
// The frontend sends only:
// product_id + quantity.
//
// PostgreSQL provides the real prices.
//
// ============================================================

async function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart cannot be empty.");
  }

  const normalized = items.map((item) => ({
    product_id: Number(item.product_id),

    quantity: Number(item.quantity),
  }));

  for (const item of normalized) {
    if (!Number.isInteger(item.product_id) || item.product_id <= 0) {
      throw new Error("Invalid product ID.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid product quantity.");
    }
  }

  const productIds = normalized.map((item) => item.product_id);

  const result = await pool.query(
    `
      SELECT
        product_id,
        name,
        category,
        brand,
        price,
        stock,
        status
      FROM products
      WHERE product_id = ANY($1::int[]);
      `,
    [productIds],
  );

  const products = result.rows;

  if (products.length !== productIds.length) {
    throw new Error("One or more products no longer exist.");
  }

  const productMap = new Map(
    products.map((product) => [Number(product.product_id), product]),
  );

  const validatedItems = normalized.map((item) => {
    const product = productMap.get(item.product_id);

    if (!product) {
      throw new Error("Product not found.");
    }

    if (
      product.status &&
      !["active", "available", "in_stock"].includes(
        String(product.status).toLowerCase(),
      )
    ) {
      throw new Error(`${product.name} is currently unavailable.`);
    }

    if (product.stock !== null && Number(product.stock) < item.quantity) {
      throw new Error(`${product.name} has insufficient stock.`);
    }

    const price = Number(product.price);

    return {
      product_id: product.product_id,

      name: product.name,

      category: product.category,

      brand: product.brand,

      quantity: item.quantity,

      price,

      subtotal: Number((price * item.quantity).toFixed(2)),
    };
  });

  const subtotal = validatedItems.reduce(
    (total, item) => total + item.subtotal,
    0,
  );

  return {
    items: validatedItems,

    subtotal: Number(subtotal.toFixed(2)),
  };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getOrCreateCart,

  getCartByCustomerId,

  addItemToCart,

  updateCartItem,

  removeCartItem,

  clearCart,

  validateCartItems,
};
