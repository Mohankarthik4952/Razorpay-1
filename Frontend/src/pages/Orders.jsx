// ============================================================
// ELECTRONICS AI
// MY ORDERS
// ============================================================

import React, { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import "./Orders.css";

import productImages from "../data/productImages";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId() {
  const directKeys = ["customer_id", "customerId"];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);

    const id = Number(value);

    if (Number.isInteger(id) && id > 0) {
      return id;
    }
  }

  const objectKeys = ["customer", "user", "currentUser", "loggedInUser"];

  for (const key of objectKeys) {
    try {
      const stored = localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      const parsed = JSON.parse(stored);

      const id = Number(
        parsed?.customer_id ??
          parsed?.customerId ??
          parsed?.user_id ??
          parsed?.userId ??
          0,
      );

      if (Number.isInteger(id) && id > 0) {
        return id;
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  return null;
}

// ============================================================
// PRICE
// ============================================================

function formatPrice(price) {
  const amount = Number(price || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

// ============================================================
// DATE
// ============================================================

function formatDate(date) {
  if (!date) {
    return "Date unavailable";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "Date unavailable";
  }

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// STATUS
// ============================================================

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "success" || value === "completed") {
    return "order-status success";
  }

  if (value.includes("pending")) {
    return "order-status pending";
  }

  if (value === "cancelled" || value === "canceled" || value === "failed") {
    return "order-status failed";
  }

  if (value.includes("processing")) {
    return "order-status processing";
  }

  return "order-status";
}

// ============================================================
// STATUS TEXT
// ============================================================

function getStatusText(status) {
  return String(status || "UNKNOWN")
    .replaceAll("_", " ")
    .toUpperCase();
}

// ============================================================
// PRODUCT IMAGE
// ============================================================

function getProductImage(productId) {
  return productImages[Number(productId)] || null;
}

// ============================================================
// ORDER CARD
// ============================================================

function OrderCard({ order }) {
  const orderId = order.order_id ?? order.id;

  const total = Number(order.total_amount ?? order.amount ?? 0);

  const status = order.status || "UNKNOWN";

  const itemCount = Number(order.item_count ?? order.items?.length ?? 0);

  const payment = order.payment || null;

  return (
    <article className="order-card">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="order-card-header">
        <div className="order-card-number">
          <span>ORDER</span>

          <h2>#{orderId}</h2>
        </div>

        <span className={getStatusClass(status)}>{getStatusText(status)}</span>
      </div>

      {/* ====================================================
          ORDER INFORMATION
      ==================================================== */}

      <div className="order-details">
        <div>
          <span>Order Date</span>

          <strong>{formatDate(order.created_at)}</strong>
        </div>

        <div>
          <span>Items</span>

          <strong>{itemCount}</strong>
        </div>

        <div>
          <span>Total</span>

          <strong>{formatPrice(total)}</strong>
        </div>
      </div>

      {/* ====================================================
          PAYMENT
      ==================================================== */}

      {payment && (
        <div className="order-payment">
          <div>
            <span>Payment Status</span>

            <strong>
              {String(payment.status || "UNKNOWN")
                .replaceAll("_", " ")
                .toUpperCase()}
            </strong>
          </div>

          {payment.razorpay_payment_id && (
            <div>
              <span>Payment ID</span>

              <strong>{payment.razorpay_payment_id}</strong>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          FOOTER
      ==================================================== */}

      <div className="order-card-footer">
        <Link to={`/orders/${orderId}`} className="order-view-button">
          View Order
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}

// ============================================================
// ORDERS PAGE
// ============================================================

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD ORDERS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setLoading(true);

        setError("");

        // ----------------------------------------------------
        // CUSTOMER ID
        // ----------------------------------------------------

        const customerId = getCustomerId();

        if (!customerId) {
          if (!cancelled) {
            setError("Customer account not found. Please log in again.");

            setLoading(false);
          }

          return;
        }

        // ----------------------------------------------------
        // REQUEST
        // ----------------------------------------------------

        const response = await fetch(
          `${API_BASE_URL}/api/orders/customer/${customerId}`,
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load your orders.");
        }

        // ----------------------------------------------------
        // SUPPORT DIFFERENT RESPONSE SHAPES
        // ----------------------------------------------------

        const result = data?.orders ?? data?.data ?? [];

        if (!Array.isArray(result)) {
          throw new Error("Invalid orders response from server.");
        }

        if (!cancelled) {
          setOrders(result);
        }
      } catch (err) {
        console.error("Orders loading error:", err);

        if (!cancelled) {
          setError(err?.message || "Unable to load your orders.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="orders-page">
        <div className="orders-state">
          <div className="orders-spinner" />

          <h2>Loading your orders...</h2>

          <p>Please wait while we retrieve your order history.</p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <main className="orders-page">
        <header className="orders-header">
          <div>
            <span>ORDER HISTORY</span>

            <h1>My Orders</h1>
          </div>

          <Link to="/" className="orders-back">
            ← Continue Shopping
          </Link>
        </header>

        <div className="orders-state">
          <div className="orders-state-icon">!</div>

          <h2>Unable to load orders</h2>

          <p>{error}</p>

          <div className="orders-state-actions">
            <button
              type="button"
              className="orders-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>

            <Link to="/" className="orders-button secondary">
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // EMPTY
  // ==========================================================

  if (orders.length === 0) {
    return (
      <main className="orders-page">
        <header className="orders-header">
          <div>
            <span>ORDER HISTORY</span>

            <h1>My Orders</h1>

            <p>Your purchases will appear here after checkout.</p>
          </div>

          <Link to="/" className="orders-back">
            ← Continue Shopping
          </Link>
        </header>

        <div className="orders-state">
          <div className="orders-state-icon">📦</div>

          <h2>No orders yet</h2>

          <p>
            You haven't placed any orders yet. Start shopping to see your
            purchases here.
          </p>

          <Link to="/" className="orders-button">
            Start Shopping
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ORDER STATISTICS
  // ==========================================================

  const totalSpent = orders.reduce(
    (total, order) => total + Number(order.total_amount ?? order.amount ?? 0),
    0,
  );

  const paidOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();

    return status === "paid" || status === "completed" || status === "success";
  }).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="orders-page">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="orders-header">
        <div>
          <span>ORDER HISTORY</span>

          <h1>My Orders</h1>

          <p>View your purchases and payment status.</p>
        </div>

        <Link to="/" className="orders-back">
          ← Continue Shopping
        </Link>
      </header>

      {/* ====================================================
          STATISTICS
      ==================================================== */}

      <section className="orders-stats">
        <div className="orders-stat">
          <span>Total Orders</span>

          <strong>{orders.length}</strong>
        </div>

        <div className="orders-stat">
          <span>Paid Orders</span>

          <strong>{paidOrders}</strong>
        </div>

        <div className="orders-stat">
          <span>Total Spent</span>

          <strong>{formatPrice(totalSpent)}</strong>
        </div>
      </section>

      {/* ====================================================
          ORDERS
      ==================================================== */}

      <section className="orders-list">
        {orders.map((order) => (
          <OrderCard key={order.order_id ?? order.id} order={order} />
        ))}
      </section>

      {/* ====================================================
          BOTTOM
      ==================================================== */}

      <div className="orders-bottom">
        <button
          type="button"
          className="orders-refresh"
          onClick={() => window.location.reload()}
        >
          Refresh Orders
        </button>

        <Link to="/" className="orders-shopping-link">
          Continue Shopping →
        </Link>
      </div>
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Orders;
