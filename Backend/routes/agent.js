// ============================================================
// ELECTRONICS AI
// AI COMMERCE AGENT ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const {
  processAgentMessage,
  addProductToCart,
} = require("../services/agentService");

// ============================================================
// AGENT HEALTH
//
// GET /api/agent/test
// ============================================================

router.get("/test", (req, res) => {
  return res.json({
    success: true,

    message: "Electronics AI Commerce Agent is working.",

    capabilities: [
      "Product search",
      "Budget filtering",
      "Product recommendations",
      "Cross-sell suggestions",
      "Product lookup",
      "AI add to cart",
    ],
  });
});

// ============================================================
// AGENT CHAT
//
// POST /api/agent/chat
//
// Body:
//
// {
//   "customer_id": 16,
//   "message": "Find me a laptop under 70000"
// }
// ============================================================

router.post("/chat", async (req, res) => {
  try {
    const { customer_id, message } = req.body;

    // ========================================================
    // VALIDATE MESSAGE
    // ========================================================

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,

        message: "Message is required.",
      });
    }

    // ========================================================
    // CUSTOMER ID
    // ========================================================

    let customerId = null;

    if (
      customer_id !== undefined &&
      customer_id !== null &&
      customer_id !== ""
    ) {
      customerId = Number(customer_id);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid customer_id.",
        });
      }
    }

    // ========================================================
    // PROCESS AGENT
    // ========================================================

    const result = await processAgentMessage({
      message: String(message).trim(),

      customerId,
    });

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      ...result,

      agent: {
        name: "Electronics AI Commerce Agent",

        version: "1.0.0",
      },
    });
  } catch (error) {
    console.error("Agent error:", error);

    return res.status(500).json({
      success: false,

      type: "AGENT_ERROR",

      message: "I couldn't complete that request right now. Please try again.",
    });
  }
});

// ============================================================
// AI ADD TO CART
//
// POST /api/agent/add-to-cart
//
// Body:
//
// {
//   "customer_id": 16,
//   "product_id": 2,
//   "quantity": 1
// }
// ============================================================

router.post("/add-to-cart", async (req, res) => {
  try {
    const { customer_id, product_id, quantity } = req.body;

    // ======================================================
    // CUSTOMER ID
    // ======================================================

    const customerId = Number(customer_id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,

        type: "INVALID_CUSTOMER",

        message: "Please log in before adding a product to your cart.",
      });
    }

    // ======================================================
    // PRODUCT ID
    // ======================================================

    const productId = Number(product_id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        type: "INVALID_PRODUCT",

        message: "Invalid product ID.",
      });
    }

    // ======================================================
    // QUANTITY
    // ======================================================

    const finalQuantity = quantity === undefined ? 1 : Number(quantity);

    if (!Number.isInteger(finalQuantity) || finalQuantity <= 0) {
      return res.status(400).json({
        success: false,

        type: "INVALID_QUANTITY",

        message: "Quantity must be at least 1.",
      });
    }

    // ======================================================
    // AI ADD TO CART
    // ======================================================

    const result = await addProductToCart({
      customerId,

      productId,

      quantity: finalQuantity,

      sourceProductId: productId,

      reason: "Customer accepted the Electronics AI product recommendation.",
    });

    // ======================================================
    // RESPONSE STATUS
    // ======================================================

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI add-to-cart route error:", error);

    return res.status(500).json({
      success: false,

      type: "ADD_TO_CART_ERROR",

      message: "I couldn't add that product to your cart. Please try again.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
