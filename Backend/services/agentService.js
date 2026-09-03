// ============================================================
// ELECTRONICS AI
// AI COMMERCE AGENT SERVICE
// ============================================================

const db = require("../database");

const { recordAgentAction } = require("./agentAuditService");

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

// ============================================================
// SAFE AUDIT
// ============================================================
//
// Audit logging must NEVER break shopping, cart, payment,
// Razorpay, COD or checkout.
//
// ============================================================

async function safeAudit({
  recommendationId = null,
  customerId = null,
  actionType,
  status,
  reason = null,
}) {
  try {
    if (typeof recordAgentAction !== "function") {
      console.warn("recordAgentAction is not available. Skipping AI audit.");

      return;
    }

    await recordAgentAction({
      recommendationId,
      customerId,
      actionType,
      status,
      reason,
    });
  } catch (error) {
    console.error("AI audit logging failed:", error);
  }
}

// ============================================================
// EXTRACT BUDGET
// ============================================================

function extractBudget(message) {
  const text = normalizeText(message);

  const patterns = [
    /under\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /below\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /less\s+than\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /within\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /budget\s*(?:of|is)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /₹\s*([\d,]+)/i,
    /rs\.?\s*([\d,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match || !match[1]) {
      continue;
    }

    const budget = Number(match[1].replace(/,/g, ""));

    if (Number.isFinite(budget) && budget > 0) {
      return budget;
    }
  }

  return null;
}

// ============================================================
// DETECT CATEGORY
// ============================================================

function detectCategory(message) {
  const text = normalizeText(message);

  const categories = [
    "laptop",
    "laptops",
    "mobile",
    "mobiles",
    "smartphone",
    "smartphones",
    "tablet",
    "tablets",
    "desktop",
    "desktops",
    "monitor",
    "monitors",
    "headphone",
    "headphones",
    "earbuds",
    "keyboard",
    "keyboards",
    "mouse",
    "mice",
    "tv",
    "television",
    "speaker",
    "speakers",
    "charger",
    "chargers",
    "power bank",
    "power banks",
    "ssd",
    "webcam",
    "webcams",
  ];

  for (const category of categories) {
    if (text.includes(category)) {
      return category;
    }
  }

  return null;
}

// ============================================================
// CATEGORY ALIASES
// ============================================================

function getCategoryAliases(category) {
  const normalized = normalizeText(category);

  const aliases = {
    laptop: ["laptop", "laptops", "notebook"],

    laptops: ["laptop", "laptops", "notebook"],

    mobile: ["mobile", "mobiles", "smartphone", "smartphones"],

    mobiles: ["mobile", "mobiles", "smartphone", "smartphones"],

    smartphone: ["mobile", "mobiles", "smartphone", "smartphones"],

    smartphones: ["mobile", "mobiles", "smartphone", "smartphones"],

    tablet: ["tablet", "tablets"],

    tablets: ["tablet", "tablets"],

    desktop: ["desktop", "desktops", "computer"],

    desktops: ["desktop", "desktops", "computer"],

    monitor: ["monitor", "monitors"],

    monitors: ["monitor", "monitors"],

    headphone: ["headphone", "headphones"],

    headphones: ["headphone", "headphones"],

    keyboard: ["keyboard", "keyboards"],

    keyboards: ["keyboard", "keyboards"],

    mouse: ["mouse", "mice"],

    mice: ["mouse", "mice"],

    tv: ["tv", "television"],

    television: ["tv", "television"],

    speaker: ["speaker", "speakers"],

    speakers: ["speaker", "speakers"],

    charger: ["charger", "chargers"],

    chargers: ["charger", "chargers"],

    "power bank": ["power bank", "power banks"],

    "power banks": ["power bank", "power banks"],

    ssd: ["ssd"],

    webcam: ["webcam", "webcams"],

    webcams: ["webcam", "webcams"],
  };

  return aliases[normalized] || [normalized];
}

// ============================================================
// GET CUSTOMER
// ============================================================

async function getCustomer(customerId) {
  if (!isValidId(customerId)) {
    return null;
  }

  const result = await db.query(
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
// GET PRODUCT
// ============================================================

async function getProduct(productId) {
  if (!isValidId(productId)) {
    return null;
  }

  const result = await db.query(
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
        image_url
      FROM products
      WHERE product_id = $1
      LIMIT 1
    `,
    [productId],
  );

  return result.rows[0] || null;
}

// ============================================================
// FIND PRODUCT BY NAME
// ============================================================
//
// Examples:
//
// Add MacBook Air M3
// Add wireless mouse
// Buy Lenovo IdeaPad
// Add the Apple laptop
//
// ============================================================

async function findProductByName(searchText) {
  const text = normalizeText(searchText);

  if (!text) {
    return [];
  }

  // ----------------------------------------------------------
  // Search the complete phrase first
  // ----------------------------------------------------------

  const result = await db.query(
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
        image_url

      FROM products

      WHERE
        LOWER(COALESCE(name, ''))
          LIKE '%' || $1 || '%'

        OR LOWER(COALESCE(brand, ''))
          LIKE '%' || $1 || '%'

        OR LOWER(COALESCE(category, ''))
          LIKE '%' || $1 || '%'

      ORDER BY
        CASE
          WHEN LOWER(COALESCE(name, '')) = $1
            THEN 1

          WHEN LOWER(COALESCE(name, ''))
            LIKE $1 || '%'
            THEN 2

          WHEN LOWER(COALESCE(name, ''))
            LIKE '%' || $1 || '%'
            THEN 3

          ELSE 4
        END,

        CASE
          WHEN stock > 0 THEN 0
          ELSE 1
        END,

        product_id ASC

      LIMIT 5
    `,
    [text],
  );

  if (result.rows.length > 0) {
    return result.rows;
  }

  // ----------------------------------------------------------
  // If the complete phrase did not match, search individual
  // meaningful words.
  //
  // Example:
  //
  // "the wireless mouse"
  //
  // becomes:
  //
  // wireless + mouse
  // ----------------------------------------------------------

  const words = text
    .replace(/^(the|a|an|my)\s+/i, "")
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  if (words.length === 0) {
    return [];
  }

  const conditions = [];
  const values = [];

  words.forEach((word, index) => {
    values.push(`%${word}%`);

    conditions.push(`
        (
          LOWER(COALESCE(name, ''))
            LIKE $${index + 1}

          OR LOWER(COALESCE(brand, ''))
            LIKE $${index + 1}

          OR LOWER(COALESCE(category, ''))
            LIKE $${index + 1}
        )
      `);
  });

  const wordResult = await db.query(
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
        image_url

      FROM products

      WHERE
        ${conditions.join(" AND ")}

      ORDER BY
        CASE
          WHEN stock > 0 THEN 0
          ELSE 1
        END,

        price ASC,

        product_id ASC

      LIMIT 5
    `,
    values,
  );

  return wordResult.rows;
}

// ============================================================
// SAVE LAST AI PRODUCT
// ============================================================

async function saveLastAgentProduct({
  customerId,
  product,
  recommendationId = null,
}) {
  if (!isValidId(customerId)) {
    return;
  }

  if (!product || !isValidId(Number(product.product_id))) {
    return;
  }

  try {
    await db.query(
      `
        INSERT INTO agent_sessions
        (
          customer_id,
          last_product_id,
          last_product_name,
          last_recommendation_id,
          updated_at
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP
        )

        ON CONFLICT (customer_id)

        DO UPDATE SET
          last_product_id =
            EXCLUDED.last_product_id,

          last_product_name =
            EXCLUDED.last_product_name,

          last_recommendation_id =
            EXCLUDED.last_recommendation_id,

          updated_at =
            CURRENT_TIMESTAMP
      `,
      [customerId, Number(product.product_id), product.name, recommendationId],
    );
  } catch (error) {
    console.error("Unable to save agent context:", error);
  }
}

// ============================================================
// GET LAST AI PRODUCT
// ============================================================

async function getLastAgentProduct(customerId) {
  if (!isValidId(customerId)) {
    return null;
  }

  try {
    const result = await db.query(
      `
        SELECT
          customer_id,
          last_product_id,
          last_product_name,
          last_recommendation_id,
          updated_at

        FROM agent_sessions

        WHERE customer_id = $1

        LIMIT 1
      `,
      [customerId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    if (!isValidId(Number(session.last_product_id))) {
      return null;
    }

    return getProduct(Number(session.last_product_id));
  } catch (error) {
    console.error("Unable to get agent context:", error);

    return null;
  }
}

// ============================================================
// SEARCH PRODUCTS
// ============================================================

async function searchProducts({ category, budget, search }) {
  const conditions = [];
  const values = [];

  // ----------------------------------------------------------
  // ACTIVE PRODUCTS
  // ----------------------------------------------------------

  conditions.push(`
    LOWER(COALESCE(status, 'active'))
    NOT IN (
      'inactive',
      'disabled',
      'deleted',
      'unavailable',
      'discontinued'
    )
  `);

  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  if (category) {
    const aliases = getCategoryAliases(category);

    values.push(aliases);

    conditions.push(`
      LOWER(category) =
      ANY($${values.length}::text[])
    `);
  }

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (search) {
    const searchValue = `%${normalizeText(search)}%`;

    values.push(searchValue);

    const index = values.length;

    conditions.push(`
      (
        LOWER(name) LIKE $${index}

        OR LOWER(brand) LIKE $${index}

        OR LOWER(category) LIKE $${index}

        OR LOWER(
          COALESCE(description, '')
        ) LIKE $${index}
      )
    `);
  }

  // ----------------------------------------------------------
  // BUDGET
  // ----------------------------------------------------------

  if (budget) {
    values.push(budget);

    conditions.push(`price <= $${values.length}`);
  }

  const result = await db.query(
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
        image_url

      FROM products

      WHERE ${conditions.join(" AND ")}

      ORDER BY
        CASE
          WHEN stock > 0 THEN 0
          ELSE 1
        END,

        price ASC

      LIMIT 10
    `,
    values,
  );

  return result.rows;
}

// ============================================================
// GET ACTIVE CART
// ============================================================

async function getActiveCart(customerId) {
  const result = await db.query(
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

          OR LOWER(TRIM(status))
             = 'active'
        )

      ORDER BY
        cart_id DESC

      LIMIT 1
    `,
    [customerId],
  );

  return result.rows[0] || null;
}

// ============================================================
// CREATE ACTIVE CART
// ============================================================

async function createActiveCart(customerId) {
  const result = await db.query(
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

  return result.rows[0];
}

// ============================================================
// GET OR CREATE ACTIVE CART
// ============================================================

async function getOrCreateActiveCart(customerId) {
  let cart = await getActiveCart(customerId);

  if (!cart) {
    cart = await createActiveCart(customerId);
  }

  return cart;
}

// ============================================================
// AI ADD PRODUCT TO CART
// ============================================================

async function addProductToCart({
  customerId,
  productId,
  quantity = 1,
  sourceProductId = null,
  reason = null,
}) {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    await safeAudit({
      customerId,

      actionType: "AI_ADD_TO_CART",

      status: "BLOCKED",

      reason: "Invalid customer ID.",
    });

    return {
      success: false,

      type: "INVALID_CUSTOMER",

      message: "Please log in before asking me to add products to your cart.",
    };
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    await safeAudit({
      customerId,

      actionType: "AI_ADD_TO_CART",

      status: "BLOCKED",

      reason: "Invalid product ID.",
    });

    return {
      success: false,

      type: "INVALID_PRODUCT",

      message: "I couldn't determine which product you want to add.",
    };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    await safeAudit({
      customerId,

      actionType: "AI_ADD_TO_CART",

      status: "BLOCKED",

      reason: "Invalid quantity.",
    });

    return {
      success: false,

      type: "INVALID_QUANTITY",

      message: "Quantity must be at least 1.",
    };
  }

  const client = await db.connect();

  let recommendation = null;

  try {
    await client.query("BEGIN");

    // ========================================================
    // CUSTOMER
    // ========================================================

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
      await client.query("ROLLBACK");

      await safeAudit({
        customerId,

        actionType: "AI_ADD_TO_CART",

        status: "BLOCKED",

        reason: "Customer account not found.",
      });

      return {
        success: false,

        type: "CUSTOMER_NOT_FOUND",

        message:
          "Your customer account could not be found. Please log in again.",
      };
    }

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
            status,
            image_url

          FROM products

          WHERE product_id = $1

          LIMIT 1

          FOR UPDATE
        `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");

      await safeAudit({
        customerId,

        actionType: "AI_ADD_TO_CART",

        status: "BLOCKED",

        reason: `Product ${productId} was not found.`,
      });

      return {
        success: false,

        type: "PRODUCT_NOT_FOUND",

        message: "That product could not be found.",
      };
    }

    const product = productResult.rows[0];

    // ========================================================
    // STATUS
    // ========================================================

    const status = String(product.status || "active")
      .trim()
      .toLowerCase();

    if (
      [
        "inactive",
        "disabled",
        "deleted",
        "unavailable",
        "discontinued",
      ].includes(status)
    ) {
      await client.query("ROLLBACK");

      await safeAudit({
        customerId,

        actionType: "AI_ADD_TO_CART",

        status: "BLOCKED",

        reason: `${product.name} is unavailable.`,
      });

      return {
        success: false,

        type: "PRODUCT_UNAVAILABLE",

        message: `${product.name} is currently unavailable.`,
      };
    }

    // ========================================================
    // STOCK
    // ========================================================

    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      await client.query("ROLLBACK");

      await safeAudit({
        customerId,

        actionType: "AI_ADD_TO_CART",

        status: "BLOCKED",

        reason: `${product.name} is out of stock.`,
      });

      return {
        success: false,

        type: "OUT_OF_STOCK",

        message: `${product.name} is currently out of stock. I have not added it to your cart.`,
      };
    }

    if (quantity > stock) {
      await client.query("ROLLBACK");

      await safeAudit({
        customerId,

        actionType: "AI_ADD_TO_CART",

        status: "BLOCKED",

        reason: `Insufficient stock for ${product.name}. Requested ${quantity}, available ${stock}.`,
      });

      return {
        success: false,

        type: "INSUFFICIENT_STOCK",

        message: `Only ${stock} unit(s) of ${product.name} are available. I have not added the product to your cart.`,

        product: {
          product_id: product.product_id,

          name: product.name,

          available: stock,

          requested: quantity,
        },
      };
    }

    // ========================================================
    // CART
    // ========================================================

    let cartResult = await client.query(
      `
          SELECT
            cart_id,
            customer_id,
            status

          FROM carts

          WHERE customer_id = $1

            AND (
              status IS NULL

              OR LOWER(TRIM(status))
                 = 'active'
            )

          ORDER BY
            cart_id DESC

          LIMIT 1

          FOR UPDATE
        `,
      [customerId],
    );

    let cart;

    if (cartResult.rows.length === 0) {
      const newCart = await client.query(
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
              status
          `,
        [customerId],
      );

      cart = newCart.rows[0];
    } else {
      cart = cartResult.rows[0];
    }

    // ========================================================
    // EXISTING ITEM
    // ========================================================

    const existingResult = await client.query(
      `
          SELECT
            cart_item_id,
            quantity,
            recommendation_id

          FROM cart_items

          WHERE cart_id = $1

            AND product_id = $2

          LIMIT 1

          FOR UPDATE
        `,
      [cart.cart_id, productId],
    );

    let cartItem;

    // ========================================================
    // SOURCE PRODUCT
    // ========================================================

    const finalSourceProductId =
      Number.isInteger(sourceProductId) && sourceProductId > 0
        ? sourceProductId
        : productId;

    // ========================================================
    // CREATE RECOMMENDATION
    // ========================================================

    const recommendationResult = await client.query(
      `
          INSERT INTO recommendations
          (
            customer_id,
            source_product_id,
            recommended_product_id,
            confidence_score,
            reason,
            status,
            created_at
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            'pending',
            CURRENT_TIMESTAMP
          )

          RETURNING
            recommendation_id,
            customer_id,
            source_product_id,
            recommended_product_id,
            confidence_score,
            reason,
            status,
            created_at
        `,
      [
        customerId,

        finalSourceProductId,

        productId,

        95,

        reason || `Electronics AI Commerce Agent recommended ${product.name}.`,
      ],
    );

    recommendation = recommendationResult.rows[0];

    // ========================================================
    // ADD / UPDATE CART ITEM
    // ========================================================

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      const currentQuantity = Number(existing.quantity || 0);

      const finalQuantity = currentQuantity + quantity;

      if (finalQuantity > stock) {
        await client.query("ROLLBACK");

        await safeAudit({
          recommendationId: recommendation.recommendation_id,

          customerId,

          actionType: "AI_ADD_TO_CART",

          status: "BLOCKED",

          reason: `Cart quantity would exceed stock for ${product.name}.`,
        });

        return {
          success: false,

          type: "INSUFFICIENT_STOCK",

          message: `Your cart already contains ${currentQuantity} unit(s) of ${product.name}. Only ${stock} unit(s) are available in total. I have not changed your cart.`,
        };
      }

      const updateResult = await client.query(
        `
            UPDATE cart_items

            SET
              quantity = $1,

              unit_price = $2,

              is_ai_recommended = TRUE,

              recommendation_id = $3

            WHERE cart_item_id = $4

            RETURNING
              cart_item_id,
              cart_id,
              product_id,
              quantity,
              unit_price,
              is_ai_recommended,
              recommendation_id,
              created_at
          `,
        [
          finalQuantity,

          product.price,

          recommendation.recommendation_id,

          existing.cart_item_id,
        ],
      );

      cartItem = updateResult.rows[0];
    } else {
      const insertResult = await client.query(
        `
            INSERT INTO cart_items
            (
              cart_id,
              product_id,
              quantity,
              unit_price,
              is_ai_recommended,
              recommendation_id,
              created_at
            )

            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              TRUE,
              $5,
              CURRENT_TIMESTAMP
            )

            RETURNING
              cart_item_id,
              cart_id,
              product_id,
              quantity,
              unit_price,
              is_ai_recommended,
              recommendation_id,
              created_at
          `,
        [
          cart.cart_id,

          productId,

          quantity,

          product.price,

          recommendation.recommendation_id,
        ],
      );

      cartItem = insertResult.rows[0];
    }

    // ========================================================
    // UPDATE CART
    // ========================================================

    await client.query(
      `
        UPDATE carts

        SET
          updated_at =
            CURRENT_TIMESTAMP

        WHERE cart_id = $1
      `,
      [cart.cart_id],
    );

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query("COMMIT");

    // ========================================================
    // AUDIT SUCCESS
    // ========================================================

    await safeAudit({
      recommendationId: recommendation.recommendation_id,

      customerId,

      actionType: "AI_ADD_TO_CART",

      status: "SUCCESS",

      reason:
        reason ||
        `AI recommended and added ${product.name} to the customer's cart.`,
    });

    // ========================================================
    // CONSOLE
    // ========================================================

    console.log("==========================================");

    console.log("AI COMMERCE ACTION");

    console.log("Customer:", customerId);

    console.log("Product:", product.name);

    console.log("Quantity:", quantity);

    console.log("Recommendation ID:", recommendation.recommendation_id);

    console.log("Cart ID:", cart.cart_id);

    console.log("==========================================");

    // ========================================================
    // RESPONSE
    // ========================================================

    return {
      success: true,

      type: "ADD_TO_CART",

      message: `I've added ${quantity} ${
        quantity === 1 ? "unit" : "units"
      } of ${product.name} to your cart.`,

      action: {
        type: "AI_ADD_TO_CART",

        customer_id: customerId,

        product_id: productId,

        quantity,

        amount: Number(product.price) * quantity,

        recommendation_id: recommendation.recommendation_id,

        status: "SUCCESS",
      },

      recommendation,

      cart: {
        cart_id: cart.cart_id,

        customer_id: customerId,
      },

      product: {
        product_id: product.product_id,

        name: product.name,

        brand: product.brand,

        category: product.category,

        price: Number(product.price),

        stock,

        image_url: product.image_url,
      },

      cart_item: cartItem,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    await safeAudit({
      recommendationId: recommendation?.recommendation_id || null,

      customerId,

      actionType: "AI_ADD_TO_CART",

      status: "FAILED",

      reason: error.message || "Unknown AI add-to-cart error.",
    });

    console.error("AI add-to-cart error:", error);

    return {
      success: false,

      type: "ADD_TO_CART_ERROR",

      message:
        "I couldn't add that product to your cart. No order or payment was created.",
    };
  } finally {
    client.release();
  }
}

// ============================================================
// CROSS-SELL
// ============================================================

async function getCrossSellProducts(product) {
  if (!product) {
    return [];
  }

  const category = normalizeText(product.category);

  const relationships = {
    laptop: ["mouse", "keyboard", "headphones", "webcam", "ssd"],

    laptops: ["mouse", "keyboard", "headphones", "webcam", "ssd"],

    mobile: ["charger", "power bank", "earbuds", "headphones"],

    smartphone: ["charger", "power bank", "earbuds", "headphones"],

    tablet: ["keyboard", "headphones", "earbuds", "charger"],

    desktop: ["monitor", "keyboard", "mouse", "webcam"],

    monitor: ["keyboard", "mouse", "webcam", "speakers"],

    keyboard: ["mouse", "monitor", "headphones"],

    mouse: ["keyboard", "headphones"],

    headphones: ["mouse", "keyboard", "webcam"],

    earbuds: ["charger", "power bank"],
  };

  const compatible = relationships[category] || [];

  if (compatible.length === 0) {
    return [];
  }

  const result = await db.query(
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
          image_url

        FROM products

        WHERE
          LOWER(category) =
          ANY($1::text[])

          AND stock > 0

          AND LOWER(
            COALESCE(
              status,
              'active'
            )
          ) NOT IN (
            'inactive',
            'disabled',
            'deleted',
            'unavailable',
            'discontinued'
          )

        ORDER BY
          price ASC

        LIMIT 5
      `,
    [compatible],
  );

  return result.rows;
}

// ============================================================
// PROCESS SEARCH
// ============================================================

async function processSearch(message) {
  const category = detectCategory(message);

  const budget = extractBudget(message);

  const products = await searchProducts({
    category,

    budget,

    search: null,
  });

  if (products.length === 0) {
    return {
      success: true,

      type: "NO_RESULT",

      message:
        category && budget
          ? `I couldn't find a ${category} within ₹${formatMoney(
              budget,
            )}. Try increasing your budget.`
          : "I couldn't find a matching product. Try giving me a product category or budget.",
    };
  }

  return {
    success: true,

    type: "PRODUCT_SEARCH",

    message:
      category && budget
        ? `I found ${products.length} ${category} product(s) within ₹${formatMoney(
            budget,
          )}.`
        : category
          ? `I found ${products.length} ${category} product(s) for you.`
          : `I found ${products.length} product(s) for you.`,

    filters: {
      category: category || null,

      budget: budget || null,
    },

    products,
  };
}

// ============================================================
// COMPARE PRODUCTS
// ============================================================

async function compareProducts(productIds) {
  if (!Array.isArray(productIds)) {
    return [];
  }

  const validIds = productIds.map(Number).filter(isValidId);

  if (validIds.length < 2) {
    return [];
  }

  const result = await db.query(
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
        image_url
      FROM products
      WHERE product_id = ANY($1::integer[])
      ORDER BY
        array_position($1::integer[], product_id)
    `,
    [validIds],
  );

  return result.rows;
}

// ============================================================
// GET CUSTOMER ORDERS
// ============================================================

async function getCustomerOrders(customerId) {
  if (!isValidId(customerId)) {
    return [];
  }

  try {
    const result = await db.query(
      `
        SELECT *
        FROM orders
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [customerId],
    );

    return result.rows;
  } catch (error) {
    console.error("getCustomerOrders error:", error);

    throw error;
  }
}

// ============================================================
// GET SINGLE CUSTOMER ORDER
// ============================================================

async function getCustomerOrder(customerId, orderId) {
  if (!isValidId(customerId) || !isValidId(orderId)) {
    return null;
  }

  try {
    const result = await db.query(
      `
        SELECT *
        FROM orders
        WHERE customer_id = $1
          AND order_id = $2
        LIMIT 1
      `,
      [customerId, orderId],
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("getCustomerOrder error:", error);

    throw error;
  }
}

// ============================================================
// GET ORDER ITEMS
// ============================================================

async function getOrderItems(orderId) {
  if (!isValidId(orderId)) {
    return [];
  }

  try {
    const result = await db.query(
      `
        SELECT
          oi.*,

          p.name,
          p.brand,
          p.category,
          p.image_url

        FROM order_items oi

        LEFT JOIN products p
          ON p.product_id = oi.product_id

        WHERE oi.order_id = $1

        ORDER BY oi.order_item_id ASC
      `,
      [orderId],
    );

    return result.rows;
  } catch (error) {
    console.error("getOrderItems error:", error);

    throw error;
  }
}

// ============================================================
// GET CUSTOMER CART
// ============================================================

async function getCustomerCart(customerId) {
  if (!isValidId(customerId)) {
    return null;
  }

  const cartResult = await db.query(
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
          OR LOWER(TRIM(status)) = 'active'
        )
      ORDER BY cart_id DESC
      LIMIT 1
    `,
    [customerId],
  );

  if (cartResult.rows.length === 0) {
    return null;
  }

  const cart = cartResult.rows[0];

  const itemsResult = await db.query(
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
        p.stock,
        p.image_url

      FROM cart_items ci

      LEFT JOIN products p
        ON p.product_id = ci.product_id

      WHERE ci.cart_id = $1

      ORDER BY ci.cart_item_id ASC
    `,
    [cart.cart_id],
  );

  const items = itemsResult.rows.map((item) => ({
    cart_item_id: Number(item.cart_item_id),

    product_id: Number(item.product_id),

    name: item.name,

    brand: item.brand,

    category: item.category,

    quantity: Number(item.quantity || 0),

    unit_price: Number(item.unit_price || 0),

    subtotal: Number(item.unit_price || 0) * Number(item.quantity || 0),

    stock: Number(item.stock || 0),

    image_url: item.image_url,

    is_ai_recommended: Boolean(item.is_ai_recommended),

    recommendation_id: item.recommendation_id
      ? Number(item.recommendation_id)
      : null,
  }));

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    cart_id: Number(cart.cart_id),

    customer_id: Number(cart.customer_id),

    status: cart.status,

    items,

    item_count: items.reduce((sum, item) => sum + item.quantity, 0),

    total,

    created_at: cart.created_at,

    updated_at: cart.updated_at,
  };
}

// ============================================================
// REMOVE CART ITEM
// ============================================================

async function removeCartItem({ customerId, productId }) {
  if (!isValidId(customerId)) {
    return {
      success: false,
      type: "INVALID_CUSTOMER",
      message: "Please log in before modifying your cart.",
    };
  }

  if (!isValidId(productId)) {
    return {
      success: false,
      type: "INVALID_PRODUCT",
      message: "I couldn't determine which product you want to remove.",
    };
  }

  const cart = await getActiveCart(customerId);

  if (!cart) {
    return {
      success: false,
      type: "EMPTY_CART",
      message: "Your cart is empty.",
    };
  }

  const result = await db.query(
    `
      DELETE FROM cart_items
      WHERE cart_id = $1
        AND product_id = $2
      RETURNING
        cart_item_id,
        product_id,
        quantity
    `,
    [cart.cart_id, productId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      type: "PRODUCT_NOT_IN_CART",
      message: "That product is not currently in your cart.",
    };
  }

  await db.query(
    `
      UPDATE carts
      SET updated_at = CURRENT_TIMESTAMP
      WHERE cart_id = $1
    `,
    [cart.cart_id],
  );

  await safeAudit({
    customerId,

    actionType: "AI_REMOVE_FROM_CART",

    status: "SUCCESS",

    reason: `AI agent removed product ${productId} from the customer's cart.`,
  });

  return {
    success: true,

    type: "REMOVE_FROM_CART",

    message: "The product has been removed from your cart.",

    product_id: productId,

    cart_id: Number(cart.cart_id),
  };
}

// ============================================================
// UPDATE CART QUANTITY
// ============================================================

async function updateCartQuantity({ customerId, productId, quantity }) {
  if (!isValidId(customerId)) {
    return {
      success: false,

      type: "INVALID_CUSTOMER",

      message: "Please log in before modifying your cart.",
    };
  }

  if (!isValidId(productId)) {
    return {
      success: false,

      type: "INVALID_PRODUCT",

      message: "I couldn't determine which product you want to update.",
    };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      success: false,

      type: "INVALID_QUANTITY",

      message: "Quantity must be at least 1.",
    };
  }

  const cart = await getActiveCart(customerId);

  if (!cart) {
    return {
      success: false,

      type: "EMPTY_CART",

      message: "Your cart is empty.",
    };
  }

  const product = await getProduct(productId);

  if (!product) {
    return {
      success: false,

      type: "PRODUCT_NOT_FOUND",

      message: "That product could not be found.",
    };
  }

  const stock = Number(product.stock || 0);

  if (quantity > stock) {
    return {
      success: false,

      type: "INSUFFICIENT_STOCK",

      message: `Only ${stock} unit(s) of ${product.name} are available.`,
    };
  }

  const result = await db.query(
    `
      UPDATE cart_items

      SET
        quantity = $1,

        unit_price = $2

      WHERE cart_id = $3

        AND product_id = $4

      RETURNING
        cart_item_id,
        cart_id,
        product_id,
        quantity,
        unit_price
    `,
    [quantity, product.price, cart.cart_id, productId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,

      type: "PRODUCT_NOT_IN_CART",

      message: `${product.name} is not currently in your cart.`,
    };
  }

  await db.query(
    `
      UPDATE carts

      SET updated_at =
        CURRENT_TIMESTAMP

      WHERE cart_id = $1
    `,
    [cart.cart_id],
  );

  await safeAudit({
    customerId,

    actionType: "AI_UPDATE_CART_QUANTITY",

    status: "SUCCESS",

    reason: `AI agent changed ${product.name} quantity to ${quantity}.`,
  });

  return {
    success: true,

    type: "UPDATE_CART",

    message: `I've updated ${product.name} quantity to ${quantity}.`,

    cart_item: result.rows[0],
  };
}

// ============================================================
// CLEAR CART
// ============================================================

async function clearCustomerCart(customerId) {
  if (!isValidId(customerId)) {
    return {
      success: false,

      type: "INVALID_CUSTOMER",

      message: "Please log in before modifying your cart.",
    };
  }

  const cart = await getActiveCart(customerId);

  if (!cart) {
    return {
      success: true,

      type: "EMPTY_CART",

      message: "Your cart is already empty.",
    };
  }

  const result = await db.query(
    `
      DELETE FROM cart_items

      WHERE cart_id = $1

      RETURNING cart_item_id
    `,
    [cart.cart_id],
  );

  await db.query(
    `
      UPDATE carts

      SET updated_at =
        CURRENT_TIMESTAMP

      WHERE cart_id = $1
    `,
    [cart.cart_id],
  );

  await safeAudit({
    customerId,

    actionType: "AI_CLEAR_CART",

    status: "SUCCESS",

    reason: "AI agent cleared the customer's cart.",
  });

  return {
    success: true,

    type: "CLEAR_CART",

    message: "I've cleared all products from your cart.",

    removed_items: result.rows.length,

    cart_id: Number(cart.cart_id),
  };
}

// ============================================================
// PROCESS AGENT MESSAGE
// ============================================================

async function processAgentMessage({ message, customerId }) {
  const text = normalizeText(message);

  // ==========================================================
  // EMPTY MESSAGE
  // ==========================================================

  if (!text) {
    return {
      success: false,

      type: "ERROR",

      message: "Please tell me what you are looking for.",
    };
  }

  // ==========================================================
  // GREETING
  // ==========================================================

  if (/^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(text)) {
    return {
      success: true,

      type: "GREETING",

      message:
        "Hello! I'm your Electronics AI shopping assistant. You can ask me to find products, compare options, recommend accessories, add products to your cart, manage your cart, or check your orders.",
    };
  }

  // ==========================================================
  // ORDER STATUS / ORDER HISTORY
  // ==========================================================

  const orderIntent =
    /\b(order|orders|purchase|purchases|shipment|delivery)\b/i.test(text);

  const orderStatusIntent =
    /\b(status|where|track|tracking|delivery|delivered|arrive|arrived|latest|last)\b/i.test(
      text,
    );

  const orderHistoryIntent =
    /\b(show|list|view|see|get|my|recent|history|latest|last)\b/i.test(text) &&
    /\b(order|orders|purchase|purchases)\b/i.test(text);

  if (orderIntent && (orderStatusIntent || orderHistoryIntent)) {
    // --------------------------------------------------------
    // LOGIN REQUIRED
    // --------------------------------------------------------

    if (!isValidId(customerId)) {
      return {
        success: false,

        type: "LOGIN_REQUIRED",

        message: "Please log in to view your orders.",
      };
    }

    console.log("Checking orders for customer:", customerId);

    // ========================================================
    // SPECIFIC ORDER
    // ========================================================

    const orderIdMatch = text.match(/\b(?:order|purchase)\s*#?\s*(\d+)\b/i);

    if (orderIdMatch) {
      const orderId = Number(orderIdMatch[1]);

      const order = await getCustomerOrder(customerId, orderId);

      if (!order) {
        return {
          success: false,

          type: "ORDER_NOT_FOUND",

          message: `I couldn't find order #${orderId} in your account.`,
        };
      }

      const items = await getOrderItems(orderId);

      return {
        success: true,

        type: "ORDER_STATUS",

        message: `Order #${order.order_id} is currently ${String(
          order.status || "processing",
        ).toLowerCase()}.`,

        order: {
          order_id: Number(order.order_id),

          status: order.status,

          total_amount: Number(order.total_amount || 0),

          created_at: order.created_at,

          items: items.map((item) => ({
            order_item_id: Number(item.order_item_id),

            product_id: Number(item.product_id),

            name: item.name,

            brand: item.brand,

            category: item.category,

            quantity: Number(item.quantity || 0),

            unit_price: Number(item.unit_price || item.price || 0),

            image_url: item.image_url,
          })),
        },
      };
    }

    // ========================================================
    // ORDER HISTORY
    // ========================================================

    const orders = await getCustomerOrders(customerId);

    if (!Array.isArray(orders) || orders.length === 0) {
      return {
        success: true,

        type: "NO_ORDERS",

        message: "You don't have any orders yet.",
      };
    }

    // ========================================================
    // LATEST ORDER
    // ========================================================

    if (/\b(latest|last|recent)\b/i.test(text)) {
      const latestOrder = orders[0];

      return {
        success: true,

        type: "LATEST_ORDER",

        message: `Your latest order is #${latestOrder.order_id}. Its current status is ${String(
          latestOrder.status || "processing",
        ).toLowerCase()}.`,

        order: {
          order_id: Number(latestOrder.order_id),

          total_amount: Number(latestOrder.total_amount || 0),

          status: latestOrder.status,

          created_at: latestOrder.created_at,
        },
      };
    }

    // ========================================================
    // FULL ORDER HISTORY
    // ========================================================

    return {
      success: true,

      type: "ORDER_HISTORY",

      message: `You have ${orders.length} recent order(s).`,

      orders: orders.map((order) => ({
        order_id: Number(order.order_id),

        total_amount: Number(order.total_amount || 0),

        status: order.status,

        created_at: order.created_at,
      })),
    };
  }

  // ==========================================================
  // CART MANAGEMENT
  // ==========================================================

  const cartIntent = /\b(cart|basket)\b/i.test(text);

  if (cartIntent && isValidId(customerId)) {
    // ========================================================
    // CLEAR CART
    // ========================================================

    if (/\b(clear|empty|remove everything|delete everything)\b/i.test(text)) {
      return clearCustomerCart(customerId);
    }

    // ========================================================
    // UPDATE QUANTITY
    // ========================================================

    if (
      /\b(change|set|update)\b/i.test(text) &&
      /\b(quantity|qty|to)\b/i.test(text)
    ) {
      const productIdMatch = text.match(/\b(?:product\s*)?#?(\d+)\b/i);

      const quantityMatch =
        text.match(/\b(?:quantity|qty)\s*(?:to)?\s*(\d+)\b/i) ||
        text.match(/\bto\s+(\d+)\b/i);

      if (productIdMatch && quantityMatch) {
        return updateCartQuantity({
          customerId,

          productId: Number(productIdMatch[1]),

          quantity: Number(quantityMatch[1]),
        });
      }

      // ------------------------------------------------------
      // PRODUCT NAME + QUANTITY
      // ------------------------------------------------------

      const nameQuantityMatch = text.match(
        /(?:change|set|update)\s+(?:the\s+)?(.+?)\s+(?:quantity\s+)?to\s+(\d+)/i,
      );

      if (nameQuantityMatch) {
        const productName = nameQuantityMatch[1]
          .replace(/^product\s+/i, "")
          .trim();

        const quantity = Number(nameQuantityMatch[2]);

        const matchingProducts = await findProductByName(productName);

        if (matchingProducts.length === 1) {
          return updateCartQuantity({
            customerId,

            productId: Number(matchingProducts[0].product_id),

            quantity,
          });
        }
      }
    }

    // ========================================================
    // REMOVE PRODUCT
    // ========================================================

    if (/\b(remove|delete|take out)\b/i.test(text)) {
      const productIdMatch = text.match(/\b(?:product\s*)?#?(\d+)\b/i);

      if (productIdMatch) {
        return removeCartItem({
          customerId,

          productId: Number(productIdMatch[1]),
        });
      }

      let productName = text
        .replace(/^(please\s+)?/i, "")
        .replace(/^(remove|delete|take out)\s+/i, "")
        .replace(/\s+(from|out of)\s+(my\s+)?(cart|basket)\s*$/i, "")
        .trim();

      productName = productName.replace(/^(the|a|an|my)\s+/i, "");

      if (productName) {
        const matchingProducts = await findProductByName(productName);

        if (matchingProducts.length === 1) {
          return removeCartItem({
            customerId,

            productId: Number(matchingProducts[0].product_id),
          });
        }

        if (matchingProducts.length > 1) {
          return {
            success: true,

            type: "PRODUCT_SELECTION",

            message:
              "I found multiple products matching your request. Please specify which one you want to remove.",

            products: matchingProducts.map((product) => ({
              product_id: Number(product.product_id),

              name: product.name,

              brand: product.brand,

              price: Number(product.price),

              image_url: product.image_url,
            })),
          };
        }
      }
    }

    // ========================================================
    // SHOW CART
    // ========================================================

    if (
      /\b(show|view|see|display|list|get|what)\b/i.test(text) ||
      /\bwhat('?s| is)\s+(in|inside)\s+(my\s+)?cart\b/i.test(text)
    ) {
      const cart = await getCustomerCart(customerId);

      if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        return {
          success: true,

          type: "EMPTY_CART",

          message: "Your cart is currently empty.",
        };
      }

      return {
        success: true,

        type: "CART",

        message: `You have ${cart.item_count} item(s) in your cart. Your cart total is ₹${formatMoney(
          cart.total,
        )}.`,

        cart,
      };
    }
  }

  // ==========================================================
  // PRODUCT COMPARISON
  // ==========================================================

  const compareIntent =
    /\b(compare|comparison|differences?|difference)\b/i.test(text);

  if (compareIntent) {
    const productIdMatches = text.match(/\b(?:product\s*)?#?(\d+)\b/gi) || [];

    const productIds = productIdMatches
      .map((value) => {
        const match = value.match(/(\d+)/);

        return match ? Number(match[1]) : null;
      })
      .filter(isValidId);

    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length >= 2) {
      const products = await compareProducts(uniqueProductIds.slice(0, 4));

      if (products.length < 2) {
        return {
          success: false,

          type: "COMPARISON_ERROR",

          message: "I couldn't find enough valid products to compare.",
        };
      }

      if (isValidId(customerId)) {
        await saveLastAgentProduct({
          customerId,

          product: products[0],
        });
      }

      return {
        success: true,

        type: "PRODUCT_COMPARISON",

        message: `Here's a comparison of ${products.length} products.`,

        products: products.map((product) => ({
          product_id: Number(product.product_id),

          name: product.name,

          brand: product.brand,

          category: product.category,

          price: Number(product.price),

          stock: Number(product.stock || 0),

          status: product.status,

          description: product.description,

          image_url: product.image_url,
        })),
      };
    }

    return {
      success: false,

      type: "COMPARISON_NEEDS_PRODUCTS",

      message:
        "Please tell me the product IDs you want to compare. For example: Compare product 7 and product 8.",
    };
  }

  // ==========================================================
  // ADD / BUY INTENT
  // ==========================================================

  const addIntent = /\b(add|buy|put|select|get)\b/i.test(text);

  // ==========================================================
  // CONTEXTUAL ADD
  // ==========================================================

  const contextualAddIntent =
    /\b(add|buy|put|select|get)\b.*\b(it|that|this|one)\b/i.test(text);

  if (contextualAddIntent && isValidId(customerId)) {
    const lastProduct = await getLastAgentProduct(customerId);

    if (!lastProduct) {
      return {
        success: false,

        type: "NO_PRODUCT_CONTEXT",

        message:
          "I don't have a product selected from our current conversation. Please tell me the product name or ask me for recommendations first.",
      };
    }

    return addProductToCart({
      customerId,

      productId: Number(lastProduct.product_id),

      quantity: 1,

      reason: `Customer asked the AI agent to add the previously discussed product "${lastProduct.name}" to the cart.`,
    });
  }

  // ==========================================================
  // ADD QUANTITY + PRODUCT ID
  // ==========================================================

  if (addIntent) {
    const quantityProductMatch = text.match(
      /(?:add|buy|put|select|get)\s+(\d+)\s+(?:of\s+)?(?:product\s*)?#?(\d+)/i,
    );

    if (quantityProductMatch) {
      return addProductToCart({
        customerId,

        productId: Number(quantityProductMatch[2]),

        quantity: Number(quantityProductMatch[1]),
      });
    }
  }

  // ==========================================================
  // ADD / BUY PRODUCT ID
  // ==========================================================

  if (addIntent) {
    const addProductMatch = text.match(
      /(?:add|buy|put|select|get)\s+(?:product\s*)?#?(\d+)(?:\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket))?/i,
    );

    if (addProductMatch) {
      const productId = Number(addProductMatch[1]);

      const product = await getProduct(productId);

      if (!product) {
        return {
          success: false,

          type: "PRODUCT_NOT_FOUND",

          message: `I couldn't find product ${productId}.`,
        };
      }

      if (isValidId(customerId)) {
        await saveLastAgentProduct({
          customerId,

          product,
        });
      }

      return addProductToCart({
        customerId,

        productId,

        quantity: 1,
      });
    }
  }

  // ==========================================================
  // ADD / BUY PRODUCT BY NAME
  // ==========================================================

  if (addIntent) {
    let productSearchText = text
      .replace(/^(please\s+)?/i, "")
      .replace(/^(add|buy|put|select|get)\s+/i, "")
      .replace(/\s+(to|in|into)\s+(my\s+)?(?:cart|basket)\s*$/i, "")
      .trim();

    let quantity = 1;

    const quantityNameMatch = productSearchText.match(/^(\d+)\s+(.+)$/i);

    if (quantityNameMatch) {
      const parsedQuantity = Number(quantityNameMatch[1]);

      if (Number.isInteger(parsedQuantity) && parsedQuantity > 0) {
        quantity = parsedQuantity;

        productSearchText = quantityNameMatch[2].trim();
      }
    }

    productSearchText = productSearchText
      .replace(/^product\s+/i, "")
      .replace(/^(the|a|an|my)\s+/i, "")
      .trim();

    if (productSearchText) {
      const matchingProducts = await findProductByName(productSearchText);

      if (matchingProducts.length === 1) {
        const product = matchingProducts[0];

        if (isValidId(customerId)) {
          await saveLastAgentProduct({
            customerId,

            product,
          });
        }

        return addProductToCart({
          customerId,

          productId: Number(product.product_id),

          quantity,

          reason: `Customer requested ${product.name} by natural-language product name.`,
        });
      }

      if (matchingProducts.length > 1) {
        return {
          success: true,

          type: "PRODUCT_SELECTION",

          message:
            "I found multiple products matching your request. Please choose one.",

          products: matchingProducts.map((product) => ({
            product_id: Number(product.product_id),

            name: product.name,

            brand: product.brand,

            category: product.category,

            price: Number(product.price),

            stock: Number(product.stock || 0),

            image_url: product.image_url,
          })),
        };
      }

      return {
        success: false,

        type: "PRODUCT_NOT_FOUND",

        message: `I couldn't find a product matching "${productSearchText}". Try the product name or ask me for alternatives.`,
      };
    }
  }

  // ==========================================================
  // PRODUCT ID LOOKUP
  // ==========================================================

  const productIdMatch = text.match(
    /(?:show|view|find|details?\s+(?:of|for)?|tell\s+me\s+about)?\s*product\s*#?\s*(\d+)/i,
  );

  if (productIdMatch) {
    const productId = Number(productIdMatch[1]);

    const product = await getProduct(productId);

    if (!product) {
      return {
        success: false,

        type: "PRODUCT_NOT_FOUND",

        message: `I couldn't find product ${productId}.`,
      };
    }

    if (isValidId(customerId)) {
      await saveLastAgentProduct({
        customerId,

        product,
      });
    }

    return {
      success: true,

      type: "PRODUCT",

      message: `I found ${product.name}.`,

      product,
    };
  }

  // ==========================================================
  // CROSS SELL / RECOMMENDATIONS
  // ==========================================================

  if (
    text.includes("accessor") ||
    text.includes("cross sell") ||
    text.includes("cross-sell") ||
    text.includes("recommend") ||
    text.includes("suggest")
  ) {
    const category = detectCategory(message);

    if (category) {
      const products = await searchProducts({
        category,
      });

      if (products.length > 0) {
        const sourceProduct = products[0];

        const recommendations = await getCrossSellProducts(sourceProduct);

        if (recommendations.length > 0) {
          if (isValidId(customerId)) {
            await saveLastAgentProduct({
              customerId,

              product: recommendations[0],
            });
          }

          return {
            success: true,

            type: "CROSS_SELL",

            message: `Here are some products that can complement ${sourceProduct.name}.`,

            sourceProduct,

            recommendations,
          };
        }
      }
    }
  }

  // ==========================================================
  // SEARCH
  // ==========================================================

  const searchResult = await processSearch(message);

  // ==========================================================
  // SAVE FIRST SEARCH RESULT
  // ==========================================================

  if (
    searchResult.success &&
    Array.isArray(searchResult.products) &&
    searchResult.products.length > 0 &&
    isValidId(customerId)
  ) {
    await saveLastAgentProduct({
      customerId,

      product: searchResult.products[0],
    });
  }

  return searchResult;
}

// ============================================================
// CREATE AI RECOMMENDATION
// ============================================================

async function createAgentRecommendation({
  customerId,
  sourceProductId,
  recommendedProductId,
  confidenceScore = 95,
  reason,
}) {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("Invalid customer ID.");
  }

  if (!Number.isInteger(sourceProductId) || sourceProductId <= 0) {
    throw new Error("Invalid source product ID.");
  }

  if (!Number.isInteger(recommendedProductId) || recommendedProductId <= 0) {
    throw new Error("Invalid recommended product ID.");
  }

  const result = await db.query(
    `
        INSERT INTO recommendations
        (
          customer_id,
          source_product_id,
          recommended_product_id,
          confidence_score,
          reason,
          status,
          created_at
        )

        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          'pending',
          CURRENT_TIMESTAMP
        )

        RETURNING
          recommendation_id,
          customer_id,
          source_product_id,
          recommended_product_id,
          confidence_score,
          reason,
          status,
          created_at
      `,
    [
      customerId,

      sourceProductId,

      recommendedProductId,

      confidenceScore,

      reason || "Recommended by Electronics AI Commerce Agent.",
    ],
  );

  return result.rows[0];
}

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  processAgentMessage,

  searchProducts,

  getProduct,

  findProductByName,

  compareProducts,

  getCrossSellProducts,

  addProductToCart,

  createAgentRecommendation,

  saveLastAgentProduct,

  getLastAgentProduct,

  getCustomerOrders,

  getCustomerOrder,

  getOrderItems,

  getCustomerCart,

  removeCartItem,

  updateCartQuantity,

  clearCustomerCart,
};
