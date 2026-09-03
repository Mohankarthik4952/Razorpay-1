// ============================================================
// ELECTRONICS AI
// AI AGENT AUDIT SERVICE
// ============================================================

const db = require("../database");

// ============================================================
// RECORD AI ACTION
// ============================================================
//
// Records every important AI commerce action.
//
// Examples:
//
// AI_SEARCH
// AI_RECOMMENDATION
// AI_ADD_TO_CART
//
// Status:
//
// SUCCESS
// BLOCKED
// FAILED
//
// ============================================================

async function recordAgentAction({
  recommendationId = null,
  actionType,
  status,
  reason = null,
}) {
  try {
    if (!actionType) {
      console.warn("AI audit skipped: actionType is missing.");

      return null;
    }

    if (!status) {
      console.warn("AI audit skipped: status is missing.");

      return null;
    }

    const result = await db.query(
      `
        INSERT INTO agent_actions
        (
          recommendation_id,
          action_type,
          action_status,
          reason,
          created_at
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP
        )
        RETURNING
          action_id,
          recommendation_id,
          action_type,
          action_status,
          reason,
          created_at
      `,
      [
        recommendationId,
        String(actionType).trim(),
        String(status).trim(),
        reason ? String(reason).trim() : null,
      ],
    );

    const action = result.rows[0];

    return action;
  } catch (error) {
    // --------------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------------
    // Audit logging must NEVER break:
    //
    // Cart
    // Checkout
    // Razorpay
    // COD
    // Orders
    //
    // Therefore we log the error and return null.
    // --------------------------------------------------------

    console.error("AI audit database error:", error);

    return null;
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  recordAgentAction,
};
