const pool = require("../database");

// ============================================================
// GET REVENUE SUMMARY
// ============================================================

async function getRevenueSummary() {
  const result = await pool.query(
    `
      SELECT

        COUNT(*) AS total_orders,

        COALESCE(
          SUM(total_amount),
          0
        ) AS total_revenue,

        COALESCE(
          AVG(total_amount),
          0
        ) AS average_order_value

      FROM orders

      WHERE payment_status = 'PAID';
      `,
  );

  const row = result.rows[0];

  return {
    total_orders: Number(row.total_orders || 0),

    total_revenue: Number(Number(row.total_revenue || 0).toFixed(2)),

    average_order_value: Number(
      Number(row.average_order_value || 0).toFixed(2),
    ),
  };
}

// ============================================================
// REVENUE FROM RECOMMENDATIONS
// ============================================================
//
// This provides a simple analytics layer.
// It can later be expanded with recommendation tracking.
//
// ============================================================

async function getTopProducts() {
  const result = await pool.query(
    `
      SELECT

        p.product_id,

        p.name,

        p.category,

        SUM(
          oi.quantity
        ) AS units_sold,

        SUM(
          oi.quantity * oi.price
        ) AS revenue

      FROM order_items oi

      JOIN products p
        ON p.product_id =
           oi.product_id

      JOIN orders o
        ON o.order_id =
           oi.order_id

      WHERE
        o.payment_status = 'PAID'

      GROUP BY
        p.product_id,
        p.name,
        p.category

      ORDER BY
        revenue DESC

      LIMIT 10;
      `,
  );

  return result.rows.map((row) => ({
    product_id: Number(row.product_id),

    name: row.name,

    category: row.category,

    units_sold: Number(row.units_sold || 0),

    revenue: Number(Number(row.revenue || 0).toFixed(2)),
  }));
}

module.exports = {
  getRevenueSummary,
  getTopProducts,
};
