const express = require("express");

const router = express.Router();

const pool = require("../database");

// ============================================================
// IMAGE URL HELPER
// ============================================================

function getProductImage(product) {
  if (product.image_url) {
    return product.image_url;
  }

  return null;
}

// ============================================================
// FORMAT PRODUCT
// ============================================================

function formatProduct(product) {
  return {
    product_id: product.product_id,

    name: product.name,

    category: product.category,

    brand: product.brand,

    price: Number(product.price || 0),

    description: product.description || "",

    stock: Number(product.stock || 0),

    status: product.status || "ACTIVE",

    image_url: getProductImage(product),

    created_at: product.created_at,
  };
}

// ============================================================
// GET ALL PRODUCTS
//
// GET /api/products
//
// Optional:
//
// /api/products?category=Laptop
// /api/products?category=AC
// /api/products?brand=LG
// /api/products?search=Samsung
// ============================================================

router.get("/", async (req, res, next) => {
  try {
    const { category, brand, search } = req.query;

    let query = `
      SELECT
        product_id,
        name,
        category,
        brand,
        price,
        description,
        stock,
        status,
        image_url,
        created_at
      FROM products
      WHERE LOWER(COALESCE(status, 'ACTIVE'))
            = 'active'
    `;

    const values = [];

    // ----------------------------------------------------------
    // CATEGORY FILTER
    // ----------------------------------------------------------

    if (category) {
      values.push(category);

      query += `
        AND LOWER(category)
            = LOWER($${values.length})
      `;
    }

    // ----------------------------------------------------------
    // BRAND FILTER
    // ----------------------------------------------------------

    if (brand) {
      values.push(brand);

      query += `
        AND LOWER(brand)
            = LOWER($${values.length})
      `;
    }

    // ----------------------------------------------------------
    // SEARCH
    // ----------------------------------------------------------

    if (search) {
      values.push(`%${search}%`);

      query += `
        AND (
          name ILIKE $${values.length}
          OR brand ILIKE $${values.length}
          OR category ILIKE $${values.length}
          OR description ILIKE $${values.length}
        )
      `;
    }

    query += `
      ORDER BY product_id ASC
    `;

    const result = await pool.query(query, values);

    const products = result.rows.map(formatProduct);

    return res.json({
      success: true,

      count: products.length,

      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    next(error);
  }
});

// ============================================================
// GET PRODUCT BY ID
//
// GET /api/products/:productId
// ============================================================

router.get("/:productId", async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Invalid product ID.",
      });
    }

    const result = await pool.query(
      `
            SELECT
              product_id,
              name,
              category,
              brand,
              price,
              description,
              stock,
              status,
              image_url,
              created_at
            FROM products
            WHERE product_id = $1
              AND LOWER(
                COALESCE(
                  status,
                  'ACTIVE'
                )
              ) = 'active'
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

    return res.json({
      success: true,

      product: formatProduct(result.rows[0]),
    });
  } catch (error) {
    console.error("Get product error:", error);

    next(error);
  }
});

// ============================================================
// GET PRODUCTS BY CATEGORY
//
// GET /api/products/category/:category
// ============================================================

router.get("/category/:category", async (req, res, next) => {
  try {
    const category = req.params.category;

    const result = await pool.query(
      `
            SELECT
              product_id,
              name,
              category,
              brand,
              price,
              description,
              stock,
              status,
              image_url,
              created_at

            FROM products

            WHERE LOWER(category)
                  = LOWER($1)

              AND LOWER(
                COALESCE(
                  status,
                  'ACTIVE'
                )
              ) = 'active'

            ORDER BY product_id ASC
          `,
      [category],
    );

    const products = result.rows.map(formatProduct);

    return res.json({
      success: true,

      category,

      count: products.length,

      products,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET PRODUCT CATEGORIES
//
// GET /api/products/meta/categories
// ============================================================

router.get("/meta/categories", async (req, res, next) => {
  try {
    const result = await pool.query(
      `
            SELECT
              category,
              COUNT(*)::integer AS product_count

            FROM products

            WHERE LOWER(
              COALESCE(
                status,
                'ACTIVE'
              )
            ) = 'active'

            GROUP BY category

            ORDER BY category ASC
          `,
    );

    return res.json({
      success: true,

      categories: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
