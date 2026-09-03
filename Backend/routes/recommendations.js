const express = require("express");
const axios = require("axios");

const router = express.Router();

const pool = require("../database");

// ============================================================
// CONFIGURATION
// ============================================================

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";

// ============================================================
// HELPER — VALIDATE INTEGER
// ============================================================

function isValidId(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

// ============================================================
// GET AI RECOMMENDATIONS
//
// GET /api/recommendation/:productId
//
// Example:
// /api/recommendation/1
// ============================================================

router.get("/:productId", async (req, res) => {
  try {
    // ======================================================
    // STEP 1 — VALIDATE PRODUCT ID
    // ======================================================

    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Invalid product ID",
      });
    }

    // ======================================================
    // STEP 2 — GET SOURCE PRODUCT
    // ======================================================

    const productResult = await pool.query(
      `
          SELECT
              product_id,
              name,
              category,
              brand,
              price,
              description,
              stock,
              status
          FROM products
          WHERE product_id = $1;
          `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Product not found",
      });
    }

    const sourceProduct = productResult.rows[0];

    // ======================================================
    // STEP 3 — CALL AI AGENT
    // ======================================================

    let aiResponse;

    try {
      aiResponse = await axios.get(
        `${AI_AGENT_URL}/recommendations/${productId}`,
        {
          timeout: 10000,
        },
      );
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          success: false,

          message: "AI recommendation service is unavailable",
        });
      }

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          success: false,

          message: "AI recommendation request timed out",
        });
      }

      console.error("AI Agent error:", error.response?.data || error.message);

      return res.status(502).json({
        success: false,

        message: "Unable to communicate with AI recommendation service",
      });
    }

    const aiData = aiResponse.data;

    // ======================================================
    // STEP 4 — CHECK AI RESPONSE
    // ======================================================

    if (!aiData || aiData.success !== true) {
      return res.json({
        success: true,

        data: {
          decision: "REJECT",

          source_product: sourceProduct,

          recommendations: [],

          recommendation_count: 0,

          potential_additional_revenue: 0,
        },
      });
    }

    // ======================================================
    // STEP 5 — GET RECOMMENDATIONS
    // ======================================================

    const recommendations = Array.isArray(aiData.recommendations)
      ? aiData.recommendations
      : [];

    // ======================================================
    // STEP 6 — NO RECOMMENDATIONS
    // ======================================================

    if (recommendations.length === 0) {
      return res.json({
        success: true,

        data: {
          decision: "REJECT",

          source_product: sourceProduct,

          recommendations: [],

          recommendation_count: 0,

          potential_additional_revenue: 0,
        },
      });
    }

    // ======================================================
    // STEP 7 — NORMALIZE RESPONSE
    // ======================================================

    const formattedRecommendations = recommendations.map((product) => ({
      product_id: Number(product.product_id),

      name: product.name,

      category: product.category,

      brand: product.brand,

      price: Number(product.price || 0),

      description: product.description || "",

      stock: Number(product.stock || 0),

      confidence: Number(product.confidence || 0),

      confidence_score: Number(product.confidence_score || 0),

      reason: product.reason || "Recommended by AI",
    }));

    // ======================================================
    // STEP 8 — POTENTIAL REVENUE
    // ======================================================

    const potentialRevenue = formattedRecommendations.reduce(
      (total, product) => {
        return total + Number(product.price || 0);
      },
      0,
    );

    // ======================================================
    // STEP 9 — RESPONSE
    // ======================================================

    return res.json({
      success: true,

      data: {
        decision: "RECOMMEND",

        source_product: {
          product_id: sourceProduct.product_id,

          name: sourceProduct.name,

          category: sourceProduct.category,

          brand: sourceProduct.brand,

          price: Number(sourceProduct.price),
        },

        recommendations: formattedRecommendations,

        recommendation_count: formattedRecommendations.length,

        potential_additional_revenue: Number(potentialRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Recommendation API error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to generate recommendations",
    });
  }
});

// ============================================================
// SAVE SELECTED AI RECOMMENDATION
//
// POST /api/recommendation/select
//
// Body:
//
// {
//   "customer_id": 1,
//   "source_product_id": 5,
//   "recommended_product_id": 8,
//   "confidence_score": 0.95,
//   "reason": "Recommended to complement..."
// }
//
// ============================================================

router.post("/select", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customer_id,

      source_product_id,

      recommended_product_id,

      confidence_score,

      reason,
    } = req.body;

    // ======================================================
    // VALIDATION
    // ======================================================

    if (!isValidId(customer_id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid customer_id",
      });
    }

    if (!isValidId(source_product_id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid source_product_id",
      });
    }

    if (!isValidId(recommended_product_id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid recommended_product_id",
      });
    }

    // ======================================================
    // VALIDATE CONFIDENCE
    // ======================================================

    const confidence = Number(confidence_score || 0);

    if (confidence < 0 || confidence > 1) {
      return res.status(400).json({
        success: false,

        message: "confidence_score must be between 0 and 1",
      });
    }

    // ======================================================
    // CHECK CUSTOMER
    // ======================================================

    const customerResult = await client.query(
      `
          SELECT
              customer_id
          FROM customers
          WHERE customer_id = $1;
          `,
      [customer_id],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Customer not found",
      });
    }

    // ======================================================
    // CHECK SOURCE PRODUCT
    // ======================================================

    const sourceResult = await client.query(
      `
          SELECT
              product_id,
              name,
              price
          FROM products
          WHERE product_id = $1;
          `,
      [source_product_id],
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Source product not found",
      });
    }

    // ======================================================
    // CHECK RECOMMENDED PRODUCT
    // ======================================================

    const recommendedResult = await client.query(
      `
          SELECT
              product_id,
              name,
              category,
              brand,
              price,
              stock
          FROM products
          WHERE product_id = $1;
          `,
      [recommended_product_id],
    );

    if (recommendedResult.rows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Recommended product not found",
      });
    }

    const recommendedProduct = recommendedResult.rows[0];

    // ======================================================
    // CHECK STOCK
    // ======================================================

    if (Number(recommendedProduct.stock || 0) <= 0) {
      return res.status(409).json({
        success: false,

        message: "Recommended product is out of stock",
      });
    }

    // ======================================================
    // CREATE RECOMMENDATION
    // ======================================================

    const recommendationResult = await client.query(
      `
          INSERT INTO recommendations
          (
              customer_id,
              source_product_id,
              recommended_product_id,
              confidence_score,
              reason,
              status
          )
          VALUES
          (
              $1,
              $2,
              $3,
              $4,
              $5,
              'SELECTED'
          )
          RETURNING
              recommendation_id,
              customer_id,
              source_product_id,
              recommended_product_id,
              confidence_score,
              reason,
              status,
              created_at;
          `,
      [
        customer_id,
        source_product_id,
        recommended_product_id,
        confidence,
        reason || "AI recommended product",
      ],
    );

    const recommendation = recommendationResult.rows[0];

    // ======================================================
    // SUCCESS
    // ======================================================

    return res.status(201).json({
      success: true,

      message: "AI recommendation selected successfully",

      recommendation,

      product: recommendedProduct,
    });
  } catch (error) {
    console.error("Select recommendation error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to save recommendation",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
