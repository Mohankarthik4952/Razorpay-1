// ============================================================
// ELECTRONICS AI
// AI COMMERCE DASHBOARD
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./AiCommerceDashboard.css";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// CURRENCY
// ============================================================

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

// ============================================================
// DATE
// ============================================================

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ title, value, subtitle }) {
  return (
    <div className="ai-stat-card">
      <div className="ai-stat-title">{title}</div>

      <div className="ai-stat-value">{value}</div>

      {subtitle && <div className="ai-stat-subtitle">{subtitle}</div>}
    </div>
  );
}

// ============================================================
// PERIOD OPTIONS
// ============================================================

const PERIOD_OPTIONS = [
  {
    value: "today",
    label: "Today",
  },
  {
    value: "7d",
    label: "Last 7 Days",
  },
  {
    value: "30d",
    label: "Last 30 Days",
  },
  {
    value: "all",
    label: "All Time",
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function AiCommerceDashboard() {
  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [dashboard, setDashboard] = useState(null);

  const [trends, setTrends] = useState([]);

  const [period, setPeriod] = useState("all");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // SELECTED REVENUE
  // ==========================================================

  const [selectedRevenue, setSelectedRevenue] = useState(null);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  async function loadDashboard(selectedPeriod = period) {
    try {
      setLoading(true);

      setError("");

      const dashboardUrl =
        `${API_BASE_URL}/api/analytics/ai-commerce` +
        `?period=${encodeURIComponent(selectedPeriod)}`;

      const trendsUrl =
        `${API_BASE_URL}/api/analytics/ai-commerce/trends` +
        `?period=${encodeURIComponent(selectedPeriod)}`;

      const [dashboardResponse, trendsResponse] = await Promise.all([
        fetch(dashboardUrl),
        fetch(trendsUrl),
      ]);

      const dashboardData = await dashboardResponse.json().catch(() => ({}));

      const trendsData = await trendsResponse.json().catch(() => ({}));

      if (!dashboardResponse.ok || !dashboardData.success) {
        throw new Error(
          dashboardData.message || "Unable to load analytics dashboard.",
        );
      }

      if (!trendsResponse.ok || !trendsData.success) {
        throw new Error(
          trendsData.message || "Unable to load analytics trends.",
        );
      }

      setDashboard(dashboardData.data || null);

      setTrends(Array.isArray(trendsData.data) ? trendsData.data : []);
    } catch (err) {
      console.error("AI Commerce Dashboard error:", err);

      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadDashboard("all");
  }, []);

  // ==========================================================
  // PERIOD CHANGE
  // ==========================================================

  function handlePeriodChange(event) {
    const selectedPeriod = event.target.value;

    setPeriod(selectedPeriod);

    setSelectedRevenue(null);

    loadDashboard(selectedPeriod);
  }

  // ==========================================================
  // CLOSE DETAILS
  // ==========================================================

  function closeRevenueDetails() {
    setSelectedRevenue(null);
  }

  // ==========================================================
  // OPEN ORDER
  // ==========================================================

  function openOrder(orderId) {
    if (!orderId) {
      return;
    }

    setSelectedRevenue(null);

    navigate(`/orders/${orderId}`);
  }

  // ==========================================================
  // KEYBOARD SUPPORT FOR REVENUE ROW
  // ==========================================================

  function handleRevenueRowKeyDown(event, item) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      setSelectedRevenue(item);
    }
  }

  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedRevenue(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading && !dashboard) {
    return (
      <div className="ai-dashboard-page">
        <div className="ai-dashboard-loading">
          Loading AI Commerce Analytics...
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && !dashboard) {
    return (
      <div className="ai-dashboard-page">
        <div className="ai-dashboard-error">
          <h2>Unable to load dashboard</h2>

          <p>{error}</p>

          <button type="button" onClick={() => loadDashboard(period)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // DATA
  // ==========================================================

  const summary = dashboard?.summary || {};

  const topProducts = dashboard?.topProducts || [];

  const revenueByProduct = dashboard?.revenueByProduct || [];

  const recentRevenue = dashboard?.recentRevenue || [];

  const recentActions = dashboard?.recentActions || [];

  // ==========================================================
  // SAFE VALUES
  // ==========================================================

  const totalRecommendations = Number(summary.totalRecommendations || 0);

  const completedRecommendations = Number(
    summary.completedRecommendations || 0,
  );

  const pendingRecommendations = Number(summary.pendingRecommendations || 0);

  const totalActions = Number(summary.totalActions || 0);

  const successfulActions = Number(summary.successfulActions || 0);

  const failedActions = Number(summary.failedActions || 0);

  const addToCartActions = Number(summary.addToCartActions || 0);

  const aiOrders = Number(summary.aiOrders || 0);

  const successfulAIOrders = Number(summary.successfulAIOrders || 0);

  const codAIOrders = Number(summary.codAIOrders || 0);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="ai-dashboard-page">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="ai-dashboard-header">
        <div>
          <div className="ai-dashboard-label">ELECTRONICS AI</div>

          <h1>AI Commerce Dashboard</h1>

          <p>
            Track how your AI agent drives recommendations, actions and revenue.
          </p>
        </div>

        <div className="ai-dashboard-header-actions">
          <select
            className="ai-period-select"
            value={period}
            onChange={handlePeriodChange}
            disabled={loading}
            aria-label="Analytics period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="ai-refresh-button"
            onClick={() => loadDashboard(period)}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && <div className="ai-dashboard-inline-error">{error}</div>}

      {/* ====================================================
          PERIOD
      ==================================================== */}

      <div className="ai-period-label">
        Showing analytics for:{" "}
        <strong>
          {PERIOD_OPTIONS.find((option) => option.value === period)?.label ||
            "All Time"}
        </strong>
      </div>

      {/* ====================================================
          SUMMARY
      ==================================================== */}

      <div className="ai-stat-grid">
        <StatCard
          title="AI Recommendations"
          value={totalRecommendations}
          subtitle="Recommendations generated"
        />

        <StatCard
          title="Completed Recommendations"
          value={completedRecommendations}
          subtitle="Converted recommendations"
        />

        <StatCard
          title="Pending Recommendations"
          value={pendingRecommendations}
          subtitle="Still pending"
        />

        <StatCard
          title="AI Add to Cart"
          value={addToCartActions}
          subtitle="Agent cart actions"
        />

        <StatCard
          title="AI Orders"
          value={aiOrders}
          subtitle="AI influenced orders"
        />

        <StatCard
          title="Successful AI Orders"
          value={successfulAIOrders}
          subtitle="Successfully paid orders"
        />

        <StatCard
          title="COD AI Orders"
          value={codAIOrders}
          subtitle="COD pending orders"
        />

        <StatCard
          title="Conversion Rate"
          value={`${summary.conversionRate || 0}%`}
          subtitle="Recommendation conversion"
        />

        <StatCard
          title="Action Success Rate"
          value={`${summary.actionSuccessRate || 0}%`}
          subtitle="Successful agent actions"
        />

        <StatCard
          title="Total Actions"
          value={totalActions}
          subtitle="All recorded agent actions"
        />

        <StatCard
          title="Successful Actions"
          value={successfulActions}
          subtitle="Successful agent actions"
        />

        <StatCard
          title="Failed Actions"
          value={failedActions}
          subtitle="Failed agent actions"
        />
      </div>

      {/* ====================================================
          REVENUE
      ==================================================== */}

      <div className="ai-revenue-grid">
        <div className="ai-revenue-card">
          <div className="ai-revenue-label">AI INFLUENCED REVENUE</div>

          <div className="ai-revenue-value">
            {formatCurrency(summary.aiRevenue)}
          </div>

          <div className="ai-revenue-description">
            Successfully paid AI-attributed revenue.
          </div>
        </div>

        <div className="ai-revenue-card">
          <div className="ai-revenue-label">AI INFLUENCED ORDER VALUE</div>

          <div className="ai-revenue-value">
            {formatCurrency(summary.influencedOrderValue)}
          </div>

          <div className="ai-revenue-description">
            Includes successful and COD-pending AI orders.
          </div>
        </div>

        <div className="ai-revenue-card">
          <div className="ai-revenue-label">COD PENDING REVENUE</div>

          <div className="ai-revenue-value">
            {formatCurrency(summary.codPendingRevenue)}
          </div>

          <div className="ai-revenue-description">
            AI-attributed COD orders awaiting payment.
          </div>
        </div>
      </div>

      {/* ====================================================
          RECOMMENDATION TREND
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>AI Recommendation Trend</h2>

            <p>Number of AI recommendations generated over time.</p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="ai-empty">
            No trend data available for this period.
          </div>
        ) : (
          <div
            className="ai-chart-container"
            style={{
              width: "100%",
              height: 350,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" tickFormatter={formatDate} />

                <YAxis />

                <Tooltip labelFormatter={formatDate} />

                <Line
                  type="monotone"
                  dataKey="recommendations"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ====================================================
          REVENUE TREND
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>AI Revenue Trend</h2>

            <p>Successfully paid AI revenue over time.</p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="ai-empty">
            No revenue data available for this period.
          </div>
        ) : (
          <div
            className="ai-chart-container"
            style={{
              width: "100%",
              height: 350,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" tickFormatter={formatDate} />

                <YAxis />

                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={formatDate}
                />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ====================================================
          COD TREND
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>COD Pending Revenue Trend</h2>

            <p>AI-attributed COD revenue awaiting payment.</p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="ai-empty">No COD trend data available.</div>
        ) : (
          <div
            className="ai-chart-container"
            style={{
              width: "100%",
              height: 350,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" tickFormatter={formatDate} />

                <YAxis />

                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={formatDate}
                />

                <Line
                  type="monotone"
                  dataKey="codPendingRevenue"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ====================================================
          SUCCESSFUL ORDERS
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>Successful AI Orders</h2>

            <p>Successfully paid AI-attributed orders over time.</p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="ai-empty">No order trend data available.</div>
        ) : (
          <div
            className="ai-chart-container"
            style={{
              width: "100%",
              height: 350,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" tickFormatter={formatDate} />

                <YAxis />

                <Tooltip labelFormatter={formatDate} />

                <Line
                  type="monotone"
                  dataKey="successfulOrders"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ====================================================
          TOP PRODUCTS
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <h2>Top AI Recommended Products</h2>
        </div>

        {topProducts.length === 0 ? (
          <div className="ai-empty">
            No AI recommendation data available for this period.
          </div>
        ) : (
          <div className="ai-product-table">
            <div className="ai-table-header">
              <span>Product</span>

              <span>Brand</span>

              <span>Recommendations</span>
            </div>

            {topProducts.map((product) => (
              <div className="ai-table-row" key={product.product_id}>
                <span>{product.name || "Unknown Product"}</span>

                <span>{product.brand || "-"}</span>

                <span>{product.recommendation_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================
          REVENUE BY PRODUCT
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <h2>AI Revenue by Product</h2>
        </div>

        {revenueByProduct.length === 0 ? (
          <div className="ai-empty">No AI revenue data available.</div>
        ) : (
          <div className="ai-product-table">
            <div className="ai-table-header">
              <span>Product</span>

              <span>Successful Revenue</span>

              <span>COD Pending</span>

              <span>Influenced Value</span>
            </div>

            {revenueByProduct.map((product) => (
              <div className="ai-table-row" key={product.product_id}>
                <span>{product.name || "Unknown Product"}</span>

                <span>{formatCurrency(product.successful_revenue)}</span>

                <span>{formatCurrency(product.cod_pending_revenue)}</span>

                <span>{formatCurrency(product.influenced_value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================
          RECENT AI REVENUE
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>Recent AI Revenue</h2>

            <p>Click a record to view AI attribution details.</p>
          </div>
        </div>

        {recentRevenue.length === 0 ? (
          <div className="ai-empty">
            No AI revenue recorded for this period.
          </div>
        ) : (
          <div className="ai-revenue-list">
            {recentRevenue.map((item) => (
              <div
                className="ai-revenue-row ai-revenue-row-clickable"
                key={item.ai_revenue_id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRevenue(item)}
                onKeyDown={(event) => handleRevenueRowKeyDown(event, item)}
              >
                <div>
                  <strong>{item.product_name || "Product"}</strong>

                  <small>Recommendation #{item.recommendation_id}</small>
                </div>

                <div>
                  <strong>{formatCurrency(item.amount)}</strong>

                  <small>{item.payment_status}</small>
                </div>

                {item.order_id && (
                  <button
                    type="button"
                    className="ai-order-link"
                    onClick={(event) => {
                      event.stopPropagation();

                      openOrder(item.order_id);
                    }}
                  >
                    Order #{item.order_id}
                    {" →"}
                  </button>
                )}

                {!item.order_id && (
                  <span className="ai-revenue-view">View →</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================
          RECENT AGENT ACTIONS
      ==================================================== */}

      <div className="ai-section">
        <div className="ai-section-header">
          <h2>Recent Agent Actions</h2>
        </div>

        {recentActions.length === 0 ? (
          <div className="ai-empty">
            No agent actions recorded for this period.
          </div>
        ) : (
          <div className="ai-action-list">
            {recentActions.map((action) => {
              const successful =
                String(action.action_status || "").toUpperCase() === "SUCCESS";

              return (
                <div className="ai-action-row" key={action.action_id}>
                  <div>
                    <strong>{action.action_type}</strong>

                    <small>
                      Recommendation #{action.recommendation_id || "-"}
                    </small>
                  </div>

                  <div
                    className={
                      successful ? "ai-action-success" : "ai-action-failed"
                    }
                  >
                    {action.action_status}
                  </div>

                  <div className="ai-action-reason">{action.reason || "-"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================
          REVENUE DETAILS MODAL
      ==================================================== */}

      {selectedRevenue && (
        <div
          className="ai-revenue-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRevenueDetails();
            }
          }}
        >
          <div
            className="ai-revenue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-revenue-modal-title"
          >
            {/* HEADER */}

            <div className="ai-revenue-modal-header">
              <div>
                <div className="ai-revenue-modal-label">AI ATTRIBUTION</div>

                <h2 id="ai-revenue-modal-title">Revenue Details</h2>
              </div>

              <button
                type="button"
                className="ai-revenue-modal-close"
                onClick={closeRevenueDetails}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* PRODUCT */}

            <div className="ai-revenue-modal-product">
              <div className="ai-revenue-modal-product-icon">AI</div>

              <div>
                <strong>{selectedRevenue.product_name || "Product"}</strong>

                <span>
                  {selectedRevenue.brand ||
                    selectedRevenue.category ||
                    "Electronics"}
                </span>
              </div>
            </div>

            {/* AMOUNT */}

            <div className="ai-revenue-modal-amount">
              <span>Attributed Amount</span>

              <strong>{formatCurrency(selectedRevenue.amount)}</strong>
            </div>

            {/* DETAILS */}

            <div className="ai-revenue-detail-grid">
              <div className="ai-revenue-detail-item">
                <span>AI Revenue ID</span>

                <strong>{selectedRevenue.ai_revenue_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Recommendation ID</span>

                <strong>{selectedRevenue.recommendation_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Customer ID</span>

                <strong>{selectedRevenue.customer_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Product ID</span>

                <strong>{selectedRevenue.product_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Order ID</span>

                <strong>{selectedRevenue.order_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Payment Status</span>

                <strong className="ai-revenue-status">
                  {selectedRevenue.payment_status || "-"}
                </strong>
              </div>

              <div className="ai-revenue-detail-item">
                <span>Payment ID</span>

                <strong>{selectedRevenue.payment_id || "-"}</strong>
              </div>

              <div className="ai-revenue-detail-item ai-revenue-detail-wide">
                <span>Recorded At</span>

                <strong>{formatDate(selectedRevenue.created_at)}</strong>
              </div>
            </div>

            {/* ATTRIBUTION */}

            <div className="ai-revenue-attribution">
              <div className="ai-revenue-attribution-title">AI Attribution</div>

              <div className="ai-attribution-item">
                <span className="ai-attribution-check">✓</span>

                <div>
                  <strong>AI recommendation recorded</strong>

                  <small>
                    Recommendation #{selectedRevenue.recommendation_id || "-"}
                  </small>
                </div>
              </div>

              <div className="ai-attribution-item">
                <span className="ai-attribution-check">✓</span>

                <div>
                  <strong>Product attributed to AI activity</strong>

                  <small>Product #{selectedRevenue.product_id || "-"}</small>
                </div>
              </div>
            </div>

            {/* VIEW ORDER */}

            {selectedRevenue.order_id && (
              <button
                type="button"
                className="ai-revenue-modal-footer-button"
                onClick={() => openOrder(selectedRevenue.order_id)}
              >
                View Order #{selectedRevenue.order_id}
                {" →"}
              </button>
            )}

            {/* CLOSE */}

            <button
              type="button"
              className={
                selectedRevenue.order_id
                  ? "ai-revenue-modal-secondary-button"
                  : "ai-revenue-modal-footer-button"
              }
              onClick={closeRevenueDetails}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
