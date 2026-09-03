const axios = require("axios");

// ============================================================
// CONFIGURATION
// ============================================================

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";

// ============================================================
// GET RECOMMENDATIONS
// ============================================================

async function getRecommendations(productId, limit = 4) {
  try {
    const response = await axios.get(
      `${AI_AGENT_URL}/recommendations/${productId}`,
      {
        timeout: 10000,
      },
    );

    const data = response.data;

    if (!data || data.success !== true) {
      return {
        success: true,
        recommendations: [],
      };
    }

    let recommendations = Array.isArray(data.recommendations)
      ? data.recommendations
      : [];

    recommendations = recommendations.slice(0, limit);

    return {
      success: true,

      source_product: data.source_product || null,

      recommendations,

      recommendation_count: recommendations.length,

      potential_additional_revenue: Number(
        data.potential_additional_revenue || 0,
      ),
    };
  } catch (error) {
    console.error("AI service error:", error.response?.data || error.message);

    // --------------------------------------------------------
    // Don't break shopping if AI is unavailable.
    // --------------------------------------------------------

    return {
      success: false,

      recommendations: [],

      recommendation_count: 0,

      potential_additional_revenue: 0,

      message: "AI recommendation service unavailable",
    };
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

async function checkAIHealth() {
  try {
    const response = await axios.get(`${AI_AGENT_URL}/health`, {
      timeout: 3000,
    });

    return response.data?.success === true;
  } catch {
    return false;
  }
}

module.exports = {
  getRecommendations,
  checkAIHealth,
};
