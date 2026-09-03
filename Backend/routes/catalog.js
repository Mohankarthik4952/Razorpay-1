// ============================================================
// ELECTRONICS AI
// AGENT-READABLE PRODUCT CATALOG
// ============================================================

const express = require("express");

const router = express.Router();

const db = require("../database");

// ============================================================
// CATALOG HEALTH
//
// GET /api/catalog/test
// ============================================================

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "Agent-readable catalog API is working.",
  });
});

// ============================================================
// AGENT-READABLE CATALOG
//
// GET /api/catalog
//
// Designed for AI agents rather than the normal frontend.
//
// Example:
//
// {
//   "success": true,
//   "catalog": [
//     {
//       "product_id": 7,
//       "name": "MacBook Air M3",
//       "brand": "Apple",
//       "category": "Laptop",
//       "price": 95000,
//       "currency": "INR",
//       "stock": 10,
//       "available": true
//     }
//   ]
// }
// ============================================================

router.get("/", async (req, res) => {
  try {
    console.log("");
    console.log("==========================================");
    console.log("AGENT-READABLE CATALOG");
    console.log("==========================================");

    // ========================================================
    // LOAD PRODUCTS
    // ========================================================

    const result = await db.query(`
      SELECT
        product_id,
        name,
        brand,
        category,
        price,
        stock,
        status
      FROM products
      ORDER BY product_id ASC
    `);

    // ========================================================
    // CONVERT PRODUCTS TO AI-FRIENDLY FORMAT
    // ========================================================

    const catalog = result.rows.map((product) => {
      const stock = Number(product.stock || 0);

      const status = String(product.status || "active")
        .trim()
        .toLowerCase();

      const unavailableStatuses = [
        "inactive",
        "disabled",
        "unavailable",
        "deleted",
        "discontinued",
      ];

      const available = stock > 0 && !unavailableStatuses.includes(status);

      return {
        product_id: Number(product.product_id),

        name: product.name,

        brand: product.brand || null,

        category: product.category || null,

        price: Number(product.price || 0),

        currency: "INR",

        stock,

        available,

        status,

        commerce: {
          purchasable: available,

          in_stock: stock > 0,

          price_in_inr: Number(Number(product.price || 0).toFixed(2)),
        },
      };
    });

    // ========================================================
    // SUMMARY
    // ========================================================

    const availableProducts = catalog.filter((product) => product.available);

    const outOfStockProducts = catalog.filter((product) => !product.available);

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,

      agent: {
        name: "Electronics AI Commerce Agent",

        version: "1.0.0",

        catalog_version: "1.0.0",

        purpose: "Machine-readable product catalog for AI commerce agents.",
      },

      summary: {
        total_products: catalog.length,

        available_products: availableProducts.length,

        unavailable_products: outOfStockProducts.length,

        currency: "INR",
      },

      catalog,
    });
  } catch (error) {
    console.error("Agent catalog error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to load agent-readable catalog.",
    });
  }
});

// ============================================================
// AVAILABLE PRODUCTS ONLY
//
// GET /api/catalog/available
// ============================================================

router.get("/available", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        product_id,
        name,
        brand,
        category,
        price,
        stock,
        status
      FROM products
      WHERE stock > 0
        AND (
          status IS NULL
          OR LOWER(TRIM(status)) NOT IN (
            'inactive',
            'disabled',
            'unavailable',
            'deleted',
            'discontinued'
          )
        )
      ORDER BY
        category ASC,
        price ASC
    `);

    const products = result.rows.map((product) => ({
      product_id: Number(product.product_id),

      name: product.name,

      brand: product.brand || null,

      category: product.category || null,

      price: Number(Number(product.price || 0).toFixed(2)),

      currency: "INR",

      stock: Number(product.stock || 0),

      available: true,
    }));

    return res.json({
      success: true,

      count: products.length,

      products,
    });
  } catch (error) {
    console.error("Available catalog error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to load available products.",
    });
  }
});

// ============================================================
// PRODUCT LOOKUP
//
// GET /api/catalog/product/:productId
//
// Useful for an AI agent that already knows the product ID.
// ============================================================

router.get("/product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Invalid product ID.",
      });
    }

    const result = await db.query(
      `
            SELECT
              product_id,
              name,
              brand,
              category,
              price,
              stock,
              status
            FROM products
            WHERE product_id = $1
            LIMIT 1
          `,
      [productId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Product not found.",
      });
    }

    const product = result.rows[0];

    const stock = Number(product.stock || 0);

    const status = String(product.status || "active")
      .trim()
      .toLowerCase();

    const unavailableStatuses = [
      "inactive",
      "disabled",
      "unavailable",
      "deleted",
      "discontinued",
    ];

    const available = stock > 0 && !unavailableStatuses.includes(status);

    return res.json({
      success: true,

      product: {
        product_id: Number(product.product_id),

        name: product.name,

        brand: product.brand || null,

        category: product.category || null,

        price: Number(Number(product.price || 0).toFixed(2)),

        currency: "INR",

        stock,

        available,

        status,

        commerce: {
          purchasable: available,

          in_stock: stock > 0,

          price_in_inr: Number(Number(product.price || 0).toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error("Agent product lookup error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to load product.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
