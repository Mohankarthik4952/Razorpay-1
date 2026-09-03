// ============================================================
// ELECTRONICS AI
// AI COMMERCE ANALYTICS ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const db = require("../database");

// ============================================================
// PERIOD HELPER
// ============================================================
//
// Supported:
//
// today
// 7d
// 30d
// all
//
// Default = all
// ============================================================

function getPeriodCondition(period, column = "created_at") {
  const normalizedPeriod = String(period || "all")
    .trim()
    .toLowerCase();

  switch (normalizedPeriod) {
    case "today":
      return {
        condition: `${column} >= CURRENT_DATE`,
        period: "today",
      };

    case "7d":
      return {
        condition: `${column} >= CURRENT_DATE - INTERVAL '6 days'`,
        period: "7d",
      };

    case "30d":
      return {
        condition: `${column} >= CURRENT_DATE - INTERVAL '29 days'`,
        period: "30d",
      };

    case "all":
    default:
      return {
        condition: "TRUE",
        period: "all",
      };
  }
}

// ============================================================
// HEALTH CHECK
//
// GET /api/analytics/test
// ============================================================

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "AI Commerce Analytics API is working.",
  });
});

// ============================================================
// AI COMMERCE DASHBOARD
//
// GET /api/analytics/ai-commerce
// ============================================================

router.get("/ai-commerce", async (req, res) => {
  try {
    const periodInfo = getPeriodCondition(req.query.period, "created_at");

    const period = periodInfo.period;

    const condition = periodInfo.condition;

    // ========================================================
    // TOTAL RECOMMENDATIONS
    // ========================================================

    const recommendationsResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS total_recommendations

      FROM recommendations

      WHERE ${condition}
    `);

    const totalRecommendations = Number(
      recommendationsResult.rows[0]?.total_recommendations || 0,
    );

    // ========================================================
    // COMPLETED RECOMMENDATIONS
    // ========================================================

    const completedResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS completed_recommendations

      FROM recommendations

      WHERE LOWER(TRIM(status)) = 'completed'

        AND ${condition}
    `);

    const completedRecommendations = Number(
      completedResult.rows[0]?.completed_recommendations || 0,
    );

    // ========================================================
    // PENDING RECOMMENDATIONS
    // ========================================================

    const pendingResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS pending_recommendations

      FROM recommendations

      WHERE LOWER(TRIM(status)) = 'pending'

        AND ${condition}
    `);

    const pendingRecommendations = Number(
      pendingResult.rows[0]?.pending_recommendations || 0,
    );

    // ========================================================
    // TOTAL ACTIONS
    // ========================================================

    const actionsResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS total_actions

      FROM agent_actions

      WHERE ${condition}
    `);

    const totalActions = Number(actionsResult.rows[0]?.total_actions || 0);

    // ========================================================
    // SUCCESSFUL ACTIONS
    // ========================================================

    const successfulActionsResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS successful_actions

      FROM agent_actions

      WHERE UPPER(TRIM(action_status)) = 'SUCCESS'

        AND ${condition}
    `);

    const successfulActions = Number(
      successfulActionsResult.rows[0]?.successful_actions || 0,
    );

    // ========================================================
    // FAILED ACTIONS
    // ========================================================

    const failedActionsResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS failed_actions

      FROM agent_actions

      WHERE UPPER(TRIM(action_status)) = 'FAILED'

        AND ${condition}
    `);

    const failedActions = Number(
      failedActionsResult.rows[0]?.failed_actions || 0,
    );

    // ========================================================
    // ADD TO CART ACTIONS
    // ========================================================

    const addToCartResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS add_to_cart_actions

      FROM agent_actions

      WHERE UPPER(TRIM(action_type)) IN (
        'AI_ADD_TO_CART',
        'ADD_TO_CART',
        'ADD_CART',
        'CART_ADD'
      )

        AND ${condition}
    `);

    const addToCartActions = Number(
      addToCartResult.rows[0]?.add_to_cart_actions || 0,
    );

    // ========================================================
    // AI REVENUE
    // ========================================================

    const revenueResult = await db.query(`
      SELECT
        COALESCE(
          SUM(amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'success'
          ),
          0
        ) AS ai_revenue

      FROM ai_revenue

      WHERE ${condition}
    `);

    const aiRevenue = Number(revenueResult.rows[0]?.ai_revenue || 0);

    // ========================================================
    // PENDING REVENUE
    // ========================================================

    const pendingRevenueResult = await db.query(`
      SELECT
        COALESCE(
          SUM(amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'pending'
          ),
          0
        ) AS pending_revenue

      FROM ai_revenue

      WHERE ${condition}
    `);

    const pendingRevenue = Number(
      pendingRevenueResult.rows[0]?.pending_revenue || 0,
    );

    // ========================================================
    // COD PENDING REVENUE
    // ========================================================

    const codRevenueResult = await db.query(`
      SELECT
        COALESCE(
          SUM(amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'cod_pending'
          ),
          0
        ) AS cod_pending_revenue

      FROM ai_revenue

      WHERE ${condition}
    `);

    const codPendingRevenue = Number(
      codRevenueResult.rows[0]?.cod_pending_revenue || 0,
    );

    // ========================================================
    // TOTAL INFLUENCED VALUE
    // ========================================================

    const influencedResult = await db.query(`
      SELECT
        COALESCE(
          SUM(amount),
          0
        ) AS influenced_value

      FROM ai_revenue

      WHERE ${condition}
    `);

    const influencedOrderValue = Number(
      influencedResult.rows[0]?.influenced_value || 0,
    );

    // ========================================================
    // AI ORDERS
    // ========================================================

    const aiOrdersResult = await db.query(`
      SELECT
        COUNT(DISTINCT payment_id)::INTEGER AS ai_orders

      FROM ai_revenue

      WHERE payment_id IS NOT NULL

        AND TRIM(payment_id) <> ''

        AND ${condition}
    `);

    const aiOrders = Number(aiOrdersResult.rows[0]?.ai_orders || 0);

    // ========================================================
    // SUCCESSFUL AI ORDERS
    // ========================================================

    const successfulOrdersResult = await db.query(`
      SELECT
        COUNT(DISTINCT payment_id)::INTEGER
          AS successful_ai_orders

      FROM ai_revenue

      WHERE LOWER(TRIM(payment_status)) = 'success'

        AND payment_id IS NOT NULL

        AND TRIM(payment_id) <> ''

        AND ${condition}
    `);

    const successfulAIOrders = Number(
      successfulOrdersResult.rows[0]?.successful_ai_orders || 0,
    );

    // ========================================================
    // COD AI ORDERS
    // ========================================================

    const codOrdersResult = await db.query(`
      SELECT
        COUNT(DISTINCT payment_id)::INTEGER
          AS cod_ai_orders

      FROM ai_revenue

      WHERE LOWER(TRIM(payment_status)) = 'cod_pending'

        AND payment_id IS NOT NULL

        AND TRIM(payment_id) <> ''

        AND ${condition}
    `);

    const codAIOrders = Number(codOrdersResult.rows[0]?.cod_ai_orders || 0);

    // ========================================================
    // CONVERSION RATE
    // ========================================================

    const conversionRate =
      totalRecommendations > 0
        ? Number(
            ((completedRecommendations / totalRecommendations) * 100).toFixed(
              2,
            ),
          )
        : 0;

    // ========================================================
    // ACTION SUCCESS RATE
    // ========================================================

    const actionSuccessRate =
      totalActions > 0
        ? Number(((successfulActions / totalActions) * 100).toFixed(2))
        : 0;

    // ========================================================
    // RECOMMENDATION STATUS
    // ========================================================

    const recommendationStatusResult = await db.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(status), ''),
          'unknown'
        ) AS status,

        COUNT(*)::INTEGER AS count

      FROM recommendations

      WHERE ${condition}

      GROUP BY
        COALESCE(
          NULLIF(TRIM(status), ''),
          'unknown'
        )

      ORDER BY count DESC
    `);

    // ========================================================
    // ACTION TYPES
    // ========================================================

    const actionTypeResult = await db.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(action_type), ''),
          'unknown'
        ) AS action_type,

        COUNT(*)::INTEGER AS count

      FROM agent_actions

      WHERE ${condition}

      GROUP BY
        COALESCE(
          NULLIF(TRIM(action_type), ''),
          'unknown'
        )

      ORDER BY count DESC
    `);

    // ========================================================
    // TOP RECOMMENDED PRODUCTS
    // ========================================================

    const topProductsResult = await db.query(`
      SELECT
        r.recommended_product_id AS product_id,

        p.name,

        p.brand,

        p.category,

        COUNT(*)::INTEGER AS recommendation_count

      FROM recommendations r

      LEFT JOIN products p
        ON p.product_id =
           r.recommended_product_id

      WHERE ${condition.replace("created_at", "r.created_at")}

      GROUP BY
        r.recommended_product_id,
        p.name,
        p.brand,
        p.category

      ORDER BY
        recommendation_count DESC

      LIMIT 10
    `);

    // ========================================================
    // REVENUE BY PRODUCT
    // ========================================================

    const revenueByProductResult = await db.query(`
      SELECT
        ar.product_id,

        p.name,

        p.brand,

        p.category,

        COUNT(*)::INTEGER
          AS ai_recommendation_count,

        COALESCE(
          SUM(ar.amount) FILTER (
            WHERE LOWER(
              TRIM(ar.payment_status)
            ) = 'success'
          ),
          0
        ) AS successful_revenue,

        COALESCE(
          SUM(ar.amount) FILTER (
            WHERE LOWER(
              TRIM(ar.payment_status)
            ) = 'cod_pending'
          ),
          0
        ) AS cod_pending_revenue,

        COALESCE(
          SUM(ar.amount),
          0
        ) AS influenced_value

      FROM ai_revenue ar

      LEFT JOIN products p
        ON p.product_id =
           ar.product_id

      WHERE ${condition.replace("created_at", "ar.created_at")}

      GROUP BY
        ar.product_id,
        p.name,
        p.brand,
        p.category

      ORDER BY
        successful_revenue DESC,
        influenced_value DESC

      LIMIT 10
    `);

    // ========================================================
    // RECENT AI REVENUE
    // ========================================================
    //
    // IMPORTANT:
    //
    // ai_revenue.payment_id may contain:
    //
    // COD_67
    //
    // In that case:
    //
    // COD_67 -> order_id 67
    //
    // For Razorpay records we try to resolve the order
    // through the payments table.
    //
    // We deliberately DO NOT add order_id to ai_revenue.
    // ========================================================

    const recentRevenueResult = await db.query(`
      SELECT
        ar.ai_revenue_id,

        ar.recommendation_id,

        ar.customer_id,

        ar.product_id,

        ar.amount,

        ar.payment_status,

        ar.payment_id,

        ar.created_at,

        p.name AS product_name,

        p.brand,

        p.category,

        resolved_order.order_id

      FROM ai_revenue ar

      LEFT JOIN products p
        ON p.product_id =
           ar.product_id

      LEFT JOIN LATERAL (
        SELECT
          pay.order_id

        FROM payments pay

        WHERE
          pay.razorpay_order_id =
            ar.payment_id

          OR pay.razorpay_payment_id =
            ar.payment_id

          OR (
            ar.payment_id ~ '^COD_[0-9]+$'

            AND pay.order_id =
              CAST(
                SUBSTRING(
                  ar.payment_id
                  FROM 5
                ) AS INTEGER
              )
          )

        ORDER BY
          pay.created_at DESC NULLS LAST,
          pay.payment_id DESC

        LIMIT 1
      ) resolved_order
        ON TRUE

      WHERE ${condition.replace("created_at", "ar.created_at")}

      ORDER BY
        ar.created_at DESC

      LIMIT 10
    `);

    // ========================================================
    // NORMALIZE RECENT REVENUE
    // ========================================================

    const recentRevenue = recentRevenueResult.rows.map((row) => ({
      ...row,

      ai_revenue_id: Number(row.ai_revenue_id),

      recommendation_id:
        row.recommendation_id !== null ? Number(row.recommendation_id) : null,

      customer_id: row.customer_id !== null ? Number(row.customer_id) : null,

      product_id: row.product_id !== null ? Number(row.product_id) : null,

      amount: Number(row.amount || 0),

      order_id: row.order_id !== null ? Number(row.order_id) : null,
    }));

    // ========================================================
    // RECENT AGENT ACTIONS
    // ========================================================

    const recentActionsResult = await db.query(`
      SELECT
        aa.action_id,

        aa.recommendation_id,

        aa.action_type,

        aa.action_status,

        aa.reason,

        aa.created_at

      FROM agent_actions aa

      WHERE ${condition.replace("created_at", "aa.created_at")}

      ORDER BY
        aa.created_at DESC

      LIMIT 10
    `);

    // ========================================================
    // DASHBOARD
    // ========================================================

    const dashboard = {
      period,

      summary: {
        totalRecommendations,

        completedRecommendations,

        pendingRecommendations,

        totalActions,

        successfulActions,

        failedActions,

        addToCartActions,

        aiOrders,

        successfulAIOrders,

        codAIOrders,

        aiRevenue: Number(aiRevenue.toFixed(2)),

        pendingRevenue: Number(pendingRevenue.toFixed(2)),

        codPendingRevenue: Number(codPendingRevenue.toFixed(2)),

        influencedOrderValue: Number(influencedOrderValue.toFixed(2)),

        conversionRate,

        actionSuccessRate,
      },

      recommendations: {
        byStatus: recommendationStatusResult.rows,
      },

      actions: {
        byType: actionTypeResult.rows,
      },

      topProducts: topProductsResult.rows,

      revenueByProduct: revenueByProductResult.rows,

      recentRevenue,

      recentActions: recentActionsResult.rows,
    };

    console.log(`AI Commerce Dashboard [${period}]:`, dashboard.summary);

    return res.json({
      success: true,

      data: dashboard,
    });
  } catch (error) {
    console.error("AI commerce analytics error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to load AI commerce analytics.",

      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ============================================================
// AI REVENUE TREND
//
// GET /api/analytics/ai-commerce/trends
// ============================================================

router.get("/ai-commerce/trends", async (req, res) => {
  try {
    const periodInfo = getPeriodCondition(req.query.period, "ar.created_at");

    const period = periodInfo.period;

    const condition = periodInfo.condition;

    const result = await db.query(`
          SELECT
            DATE(ar.created_at) AS date,

            COUNT(
              DISTINCT ar.recommendation_id
            )::INTEGER AS recommendations,

            COALESCE(
              SUM(ar.amount) FILTER (
                WHERE LOWER(
                  TRIM(ar.payment_status)
                ) = 'success'
              ),
              0
            ) AS revenue,

            COALESCE(
              SUM(ar.amount) FILTER (
                WHERE LOWER(
                  TRIM(ar.payment_status)
                ) = 'cod_pending'
              ),
              0
            ) AS cod_pending_revenue,

            COUNT(
              DISTINCT ar.payment_id
            ) FILTER (
              WHERE LOWER(
                TRIM(ar.payment_status)
              ) = 'success'

              AND ar.payment_id IS NOT NULL

              AND TRIM(ar.payment_id) <> ''
            )::INTEGER AS successful_orders

          FROM ai_revenue ar

          WHERE ${condition}

          GROUP BY
            DATE(ar.created_at)

          ORDER BY
            DATE(ar.created_at) ASC
        `);

    const trends = result.rows.map((row) => ({
      date: row.date,

      recommendations: Number(row.recommendations || 0),

      revenue: Number(row.revenue || 0),

      codPendingRevenue: Number(row.cod_pending_revenue || 0),

      successfulOrders: Number(row.successful_orders || 0),
    }));

    return res.json({
      success: true,

      period,

      data: trends,
    });
  } catch (error) {
    console.error("AI revenue trends error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to load AI revenue trends.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
