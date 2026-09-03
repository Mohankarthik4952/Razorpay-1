// ============================================================
// ELECTRONICS AI
// CART ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const pool = require("../database");

// ============================================================
// HELPER — VALIDATE POSITIVE INTEGER
// ============================================================

function isValidId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0;
}

// ============================================================
// HELPER — GET CUSTOMER
// ============================================================

async function customerExists(client, customerId) {
  const result = await client.query(
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

  return result.rows[0] || null;
}

// ============================================================
// HELPER — GET OR CREATE ACTIVE CART
// ============================================================

async function getOrCreateActiveCart(client, customerId) {
  // ----------------------------------------------------------
  // Find ACTIVE cart
  // ----------------------------------------------------------

  const activeResult = await client.query(
    `
        SELECT
          cart_id,
          customer_id,
          status,
          created_at,
          updated_at

        FROM carts

        WHERE customer_id = $1

          AND LOWER(
            TRIM(
              COALESCE(status, 'ACTIVE')
            )
          ) = 'active'

        ORDER BY cart_id DESC

        LIMIT 1

        FOR UPDATE
      `,
    [customerId],
  );

  if (activeResult.rows.length > 0) {
    const cart = activeResult.rows[0];

    // Normalize status if NULL.
    if (!cart.status) {
      await client.query(
        `
          UPDATE carts

          SET
            status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP

          WHERE cart_id = $1
        `,
        [cart.cart_id],
      );

      cart.status = "ACTIVE";
    }

    return cart;
  }

  // ----------------------------------------------------------
  // If no ACTIVE cart exists, check for a cart containing
  // items and reactivate it.
  // ----------------------------------------------------------

  const oldCartResult = await client.query(
    `
        SELECT
          c.cart_id,
          c.customer_id,
          c.status,
          c.created_at,
          c.updated_at

        FROM carts c

        INNER JOIN cart_items ci
          ON ci.cart_id = c.cart_id

        WHERE c.customer_id = $1

        GROUP BY
          c.cart_id,
          c.customer_id,
          c.status,
          c.created_at,
          c.updated_at

        ORDER BY c.cart_id DESC

        LIMIT 1

        FOR UPDATE OF c
      `,
    [customerId],
  );

  if (oldCartResult.rows.length > 0) {
    const oldCart = oldCartResult.rows[0];

    const updatedResult = await client.query(
      `
          UPDATE carts

          SET
            status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP

          WHERE cart_id = $1

          RETURNING
            cart_id,
            customer_id,
            status,
            created_at,
            updated_at
        `,
      [oldCart.cart_id],
    );

    return updatedResult.rows[0];
  }

  // ----------------------------------------------------------
  // Create new cart
  // ----------------------------------------------------------

  const createdResult = await client.query(
    `
        INSERT INTO carts
        (
          customer_id,
          status,
          created_at,
          updated_at
        )

        VALUES
        (
          $1,
          'ACTIVE',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )

        RETURNING
          cart_id,
          customer_id,
          status,
          created_at,
          updated_at
      `,
    [customerId],
  );

  return createdResult.rows[0];
}

// ============================================================
// HELPER — GET CART DETAILS
// ============================================================

async function getCartDetails(client, customerId) {
  // ----------------------------------------------------------
  // Find active cart
  // ----------------------------------------------------------

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

          AND LOWER(
            TRIM(
              COALESCE(status, 'ACTIVE')
            )
          ) = 'active'

        ORDER BY cart_id DESC

        LIMIT 1
      `,
    [customerId],
  );

  if (cartResult.rows.length === 0) {
    return null;
  }

  const cart = cartResult.rows[0];

  // ----------------------------------------------------------
  // Get cart items
  // ----------------------------------------------------------

  const itemsResult = await client.query(
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
          p.price,
          p.description,
          p.stock,
          p.status,
          p.image_url

        FROM cart_items ci

        INNER JOIN products p
          ON p.product_id =
             ci.product_id

        WHERE ci.cart_id = $1

        ORDER BY
          ci.cart_item_id ASC
      `,
    [cart.cart_id],
  );

  // ----------------------------------------------------------
  // Format items
  // ----------------------------------------------------------

  const items = itemsResult.rows.map((item) => {
    const quantity = Number(item.quantity || 0);

    const unitPrice = Number(item.unit_price ?? item.price ?? 0);

    const productPrice = Number(item.price || 0);

    const stock = Number(item.stock || 0);

    return {
      cart_item_id: item.cart_item_id,

      cart_id: item.cart_id,

      product_id: item.product_id,

      name: item.name,

      category: item.category,

      brand: item.brand,

      description: item.description || "",

      image_url: item.image_url || null,

      quantity,

      unit_price: unitPrice,

      price: productPrice,

      stock,

      status: item.status || "ACTIVE",

      is_ai_recommended: Boolean(item.is_ai_recommended),

      recommendation_id: item.recommendation_id,

      subtotal: Number((unitPrice * quantity).toFixed(2)),

      created_at: item.created_at,
    };
  });

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);

  /*
   * Current shipping rule:
   *
   * subtotal = 0       => ₹0
   * subtotal >= ₹50000 => FREE
   * otherwise          => ₹499
   */

  const shipping = subtotal === 0 ? 0 : subtotal >= 50000 ? 0 : 499;

  const total = subtotal + shipping;

  return {
    cart_id: cart.cart_id,

    customer_id: cart.customer_id,

    status: cart.status,

    created_at: cart.created_at,

    updated_at: cart.updated_at,

    items,

    summary: {
      item_count: itemCount,

      subtotal: Number(subtotal.toFixed(2)),

      shipping: Number(shipping.toFixed(2)),

      total: Number(total.toFixed(2)),
    },
  };
}

// ============================================================
// GET CART
//
// GET /api/cart/:customerId
// ============================================================

router.get("/:customerId", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const customerId = Number(req.params.customerId);

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // ------------------------------------------------------
    // Customer
    // ------------------------------------------------------

    const customer = await customerExists(client, customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // ------------------------------------------------------
    // Get active cart
    // ------------------------------------------------------

    let cart = await getCartDetails(client, customerId);

    // ------------------------------------------------------
    // Create empty active cart if necessary
    // ------------------------------------------------------

    if (!cart) {
      await client.query(
        `
            INSERT INTO carts
            (
              customer_id,
              status,
              created_at,
              updated_at
            )

            VALUES
            (
              $1,
              'ACTIVE',
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `,
        [customerId],
      );

      cart = await getCartDetails(client, customerId);
    }

    return res.json({
      success: true,

      customer,

      cart,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// ADD TO CART
//
// POST /api/cart
//
// Body:
//
// {
//   "customer_id": 16,
//   "product_id": 5,
//   "quantity": 1
// }
//
// ============================================================

router.post("/", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const customerId = Number(req.body.customer_id);

    const productId = Number(req.body.product_id);

    const quantity = Number(req.body.quantity);

    // ------------------------------------------------------
    // Validate customer
    // ------------------------------------------------------

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // ------------------------------------------------------
    // Validate product
    // ------------------------------------------------------

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    // ------------------------------------------------------
    // Validate quantity
    // ------------------------------------------------------

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1.",
      });
    }

    await client.query("BEGIN");

    // ------------------------------------------------------
    // Customer
    // ------------------------------------------------------

    const customer = await customerExists(client, customerId);

    if (!customer) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // ------------------------------------------------------
    // Product
    // ------------------------------------------------------

    const productResult = await client.query(
      `
            SELECT
              product_id,
              name,
              price,
              stock,
              status

            FROM products

            WHERE product_id = $1

            LIMIT 1

            FOR UPDATE
          `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = productResult.rows[0];

    // ------------------------------------------------------
    // Product status
    // ------------------------------------------------------

    const productStatus = String(product.status || "ACTIVE")
      .trim()
      .toLowerCase();

    if (productStatus !== "active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "This product is not available.",
      });
    }

    // ------------------------------------------------------
    // Stock
    // ------------------------------------------------------

    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "This product is out of stock.",
      });
    }

    if (quantity > stock) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: `Only ${stock} units of ${product.name} are available.`,
      });
    }

    // ------------------------------------------------------
    // Active cart
    // ------------------------------------------------------

    const cart = await getOrCreateActiveCart(client, customerId);

    console.log("Active cart:", cart);

    // ------------------------------------------------------
    // Existing item
    // ------------------------------------------------------

    const existingResult = await client.query(
      `
            SELECT
              cart_item_id,
              quantity

            FROM cart_items

            WHERE cart_id = $1

              AND product_id = $2

            LIMIT 1

            FOR UPDATE
          `,
      [cart.cart_id, productId],
    );

    if (existingResult.rows.length > 0) {
      const existingItem = existingResult.rows[0];

      const oldQuantity = Number(existingItem.quantity || 0);

      const newQuantity = oldQuantity + quantity;

      if (newQuantity > stock) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Only ${stock} units of ${product.name} are available.`,
        });
      }

      await client.query(
        `
            UPDATE cart_items

            SET
              quantity = $1,
              unit_price = $2

            WHERE cart_item_id = $3
          `,
        [newQuantity, product.price, existingItem.cart_item_id],
      );
    } else {
      // ----------------------------------------------------
      // Insert new item
      // ----------------------------------------------------

      await client.query(
        `
            INSERT INTO cart_items
            (
              cart_id,
              product_id,
              quantity,
              unit_price,
              is_ai_recommended
            )

            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              false
            )
          `,
        [cart.cart_id, productId, quantity, product.price],
      );
    }

    // ------------------------------------------------------
    // Update cart timestamp
    // ------------------------------------------------------

    await client.query(
      `
          UPDATE carts

          SET
            status = 'ACTIVE',
            updated_at =
              CURRENT_TIMESTAMP

          WHERE cart_id = $1
        `,
      [cart.cart_id],
    );

    // ------------------------------------------------------
    // IMPORTANT:
    // Read cart BEFORE COMMIT while transaction is active.
    // ------------------------------------------------------

    const updatedCart = await getCartDetails(client, customerId);

    await client.query("COMMIT");

    console.log("Cart updated successfully:", {
      cart_id: updatedCart.cart_id,

      item_count: updatedCart.summary.item_count,

      total: updatedCart.summary.total,
    });

    return res.status(201).json({
      success: true,

      message: "Product added to cart.",

      cart: updatedCart,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("ADD TO CART ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// UPDATE CART ITEM
//
// PUT /api/cart/:cartItemId
//
// Body:
//
// {
//   "customer_id": 16,
//   "quantity": 2
// }
//
// ============================================================

router.put("/:cartItemId", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const cartItemId = Number(req.params.cartItemId);

    const customerId = Number(req.body.customer_id);

    const quantity = Number(req.body.quantity);

    if (!isValidId(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID.",
      });
    }

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1.",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
            SELECT
              ci.cart_item_id,
              ci.cart_id,
              ci.product_id,
              ci.quantity,

              c.customer_id,

              p.name,
              p.price,
              p.stock,
              p.status

            FROM cart_items ci

            INNER JOIN carts c
              ON c.cart_id =
                 ci.cart_id

            INNER JOIN products p
              ON p.product_id =
                 ci.product_id

            WHERE
              ci.cart_item_id = $1

              AND c.customer_id = $2

              AND LOWER(
                TRIM(
                  COALESCE(
                    c.status,
                    'ACTIVE'
                  )
                )
              ) = 'active'

            LIMIT 1

            FOR UPDATE
          `,
      [cartItemId, customerId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    const item = result.rows[0];

    const stock = Number(item.stock || 0);

    const status = String(item.status || "ACTIVE")
      .trim()
      .toLowerCase();

    if (status !== "active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "This product is no longer available.",
      });
    }

    if (stock <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: `${item.name} is out of stock.`,
      });
    }

    if (quantity > stock) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: `Only ${stock} units of ${item.name} are available.`,
      });
    }

    await client.query(
      `
          UPDATE cart_items

          SET
            quantity = $1,
            unit_price = $2

          WHERE cart_item_id = $3
        `,
      [quantity, item.price, cartItemId],
    );

    await client.query(
      `
          UPDATE carts

          SET
            updated_at =
              CURRENT_TIMESTAMP

          WHERE cart_id = $1
        `,
      [item.cart_id],
    );

    const updatedCart = await getCartDetails(client, customerId);

    await client.query("COMMIT");

    return res.json({
      success: true,

      message: "Cart updated.",

      cart: updatedCart,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("UPDATE CART ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// REMOVE CART ITEM
//
// DELETE /api/cart/:cartItemId?customer_id=16
// ============================================================

router.delete("/:cartItemId", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const cartItemId = Number(req.params.cartItemId);

    const customerId = Number(req.query.customer_id);

    if (!isValidId(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID.",
      });
    }

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    await client.query("BEGIN");

    const itemResult = await client.query(
      `
            SELECT
              ci.cart_item_id,
              ci.cart_id,
              c.customer_id

            FROM cart_items ci

            INNER JOIN carts c
              ON c.cart_id =
                 ci.cart_id

            WHERE
              ci.cart_item_id = $1

              AND c.customer_id = $2

            LIMIT 1

            FOR UPDATE
          `,
      [cartItemId, customerId],
    );

    if (itemResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    const cartId = itemResult.rows[0].cart_id;

    await client.query(
      `
          DELETE FROM cart_items

          WHERE cart_item_id = $1
        `,
      [cartItemId],
    );

    await client.query(
      `
          UPDATE carts

          SET
            updated_at =
              CURRENT_TIMESTAMP

          WHERE cart_id = $1
        `,
      [cartId],
    );

    const updatedCart = await getCartDetails(client, customerId);

    await client.query("COMMIT");

    return res.json({
      success: true,

      message: "Product removed from cart.",

      cart: updatedCart,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("REMOVE CART ITEM ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// CLEAR CART
//
// DELETE /api/cart/clear/:customerId
// ============================================================

router.delete("/clear/:customerId", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const customerId = Number(req.params.customerId);

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    await client.query("BEGIN");

    const cartResult = await client.query(
      `
            SELECT
              cart_id

            FROM carts

            WHERE customer_id = $1

              AND LOWER(
                TRIM(
                  COALESCE(
                    status,
                    'ACTIVE'
                  )
                )
              ) = 'active'

            ORDER BY cart_id DESC

            LIMIT 1

            FOR UPDATE
          `,
      [customerId],
    );

    if (cartResult.rows.length > 0) {
      const cartId = cartResult.rows[0].cart_id;

      await client.query(
        `
            DELETE FROM cart_items

            WHERE cart_id = $1
          `,
        [cartId],
      );

      await client.query(
        `
            UPDATE carts

            SET
              updated_at =
                CURRENT_TIMESTAMP

            WHERE cart_id = $1
          `,
        [cartId],
      );
    }

    const updatedCart = await getCartDetails(client, customerId);

    await client.query("COMMIT");

    return res.json({
      success: true,

      message: "Cart cleared.",

      cart: updatedCart,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("CLEAR CART ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// VALIDATE CART BEFORE CHECKOUT
//
// POST /api/cart/validate
//
// {
//   "customer_id": 16
// }
//
// ============================================================

router.post("/validate", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const customerId = Number(req.body.customer_id);

    if (!isValidId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await customerExists(client, customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const cart = await getCartDetails(client, customerId);

    if (!cart) {
      return res.json({
        success: true,

        valid: false,

        message: "Cart is empty.",

        cart: null,

        issues: [
          {
            issue: "EMPTY_CART",
          },
        ],
      });
    }

    const issues = [];

    // ------------------------------------------------------
    // Validate every item
    // ------------------------------------------------------

    for (const item of cart.items) {
      const productResult = await client.query(
        `
              SELECT
                product_id,
                name,
                price,
                stock,
                status

              FROM products

              WHERE product_id = $1

              LIMIT 1
            `,
        [item.product_id],
      );

      if (productResult.rows.length === 0) {
        issues.push({
          product_id: item.product_id,

          name: item.name,

          issue: "PRODUCT_NOT_FOUND",
        });

        continue;
      }

      const product = productResult.rows[0];

      const stock = Number(product.stock || 0);

      const status = String(product.status || "ACTIVE")
        .trim()
        .toLowerCase();

      if (status !== "active") {
        issues.push({
          product_id: item.product_id,

          name: product.name,

          issue: "PRODUCT_NOT_ACTIVE",
        });
      }

      if (stock <= 0) {
        issues.push({
          product_id: item.product_id,

          name: product.name,

          issue: "OUT_OF_STOCK",
        });

        continue;
      }

      if (item.quantity > stock) {
        issues.push({
          product_id: item.product_id,

          name: product.name,

          issue: "INSUFFICIENT_STOCK",

          available: stock,

          requested: item.quantity,
        });
      }
    }

    return res.json({
      success: true,

      valid: issues.length === 0,

      cart,

      issues,
    });
  } catch (error) {
    console.error("VALIDATE CART ERROR:", error);

    next(error);
  } finally {
    client.release();
  }
});

// ============================================================
// BACKWARD COMPATIBILITY
//
// POST /api/cart/add
//
// ============================================================

router.post("/add", async (req, res, next) => {
  try {
    const customerId = Number(req.body.customer_id);

    const productId = Number(req.body.product_id);

    const quantity = Number(req.body.quantity || 1);

    if (
      !isValidId(customerId) ||
      !isValidId(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart data.",
      });
    }

    /*
     * Use the main POST / route implementation
     * by duplicating the request data.
     *
     * This route exists because some older frontend
     * code may still call /api/cart/add.
     */

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const customer = await customerExists(client, customerId);

      if (!customer) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Customer not found.",
        });
      }

      const productResult = await client.query(
        `
              SELECT
                product_id,
                name,
                price,
                stock,
                status

              FROM products

              WHERE product_id = $1

              LIMIT 1

              FOR UPDATE
            `,
        [productId],
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const product = productResult.rows[0];

      const status = String(product.status || "ACTIVE")
        .trim()
        .toLowerCase();

      if (status !== "active") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "This product is not available.",
        });
      }

      const stock = Number(product.stock || 0);

      if (stock <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "This product is out of stock.",
        });
      }

      if (quantity > stock) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Only ${stock} units are available.`,
        });
      }

      const cart = await getOrCreateActiveCart(client, customerId);

      const existingResult = await client.query(
        `
              SELECT
                cart_item_id,
                quantity

              FROM cart_items

              WHERE cart_id = $1

                AND product_id = $2

              LIMIT 1

              FOR UPDATE
            `,
        [cart.cart_id, productId],
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];

        const newQuantity = Number(existing.quantity || 0) + quantity;

        if (newQuantity > stock) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Only ${stock} units are available.`,
          });
        }

        await client.query(
          `
              UPDATE cart_items

              SET
                quantity = $1,
                unit_price = $2

              WHERE cart_item_id = $3
            `,
          [newQuantity, product.price, existing.cart_item_id],
        );
      } else {
        await client.query(
          `
              INSERT INTO cart_items
              (
                cart_id,
                product_id,
                quantity,
                unit_price,
                is_ai_recommended
              )

              VALUES
              (
                $1,
                $2,
                $3,
                $4,
                false
              )
            `,
          [cart.cart_id, productId, quantity, product.price],
        );
      }

      await client.query(
        `
            UPDATE carts

            SET
              status = 'ACTIVE',
              updated_at =
                CURRENT_TIMESTAMP

            WHERE cart_id = $1
          `,
        [cart.cart_id],
      );

      const updatedCart = await getCartDetails(client, customerId);

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,

        message: "Product added to cart.",

        cart: updatedCart,
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("LEGACY ADD CART ERROR:", error);

    next(error);
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
