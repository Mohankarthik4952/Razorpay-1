// ============================================================
// ELECTRONICS AI
// ORDER DETAILS PAGE
// ============================================================

import React, { useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import "./OrderDetails.css";

import productImages from "../data/productImages";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
// IMAGE
// ============================================================

function getProductImage(productId) {
  return productImages[Number(productId)] || null;
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
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// DATE + TIME
// ============================================================

function formatDateTime(date) {
  if (!date) {
    return "Date unavailable";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "Date unavailable";
  }

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "success" || value === "completed") {
    return "order-details-status success";
  }

  if (value.includes("pending")) {
    return "order-details-status pending";
  }

  if (value === "failed" || value === "cancelled" || value === "canceled") {
    return "order-details-status failed";
  }

  if (value.includes("processing")) {
    return "order-details-status processing";
  }

  return "order-details-status";
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
// CUSTOMER ID
// ============================================================

function getCustomerId() {
  const keys = ["customer_id", "customerId"];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    const id = Number(value);

    if (Number.isInteger(id) && id > 0) {
      return id;
    }
  }

  return null;
}

// ============================================================
// ORDER DETAILS
// ============================================================

function OrderDetails() {
  const { orderId } = useParams();

  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD ORDER
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        setLoading(true);

        setError("");

        const numericOrderId = Number(orderId);

        if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
          throw new Error("Invalid order ID.");
        }

        // ----------------------------------------------------
        // CUSTOMER ID
        // ----------------------------------------------------

        const customerId = getCustomerId();

        // ----------------------------------------------------
        // REQUEST
        // ----------------------------------------------------

        const response = await fetch(
          `${API_BASE_URL}/api/orders/${numericOrderId}`,
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load order.");
        }

        if (!data?.success && !data?.order) {
          throw new Error(data?.message || "Order could not be found.");
        }

        const orderData = data?.order ?? data?.data ?? data;

        // ----------------------------------------------------
        // EXTRA CLIENT-SIDE SAFETY
        //
        // If customer ID exists locally, make sure the
        // returned order belongs to that customer.
        // ----------------------------------------------------

        if (
          customerId &&
          orderData?.customer_id &&
          Number(orderData.customer_id) !== Number(customerId)
        ) {
          throw new Error("You are not authorized to view this order.");
        }

        if (!cancelled) {
          setOrder(orderData);
        }
      } catch (err) {
        console.error("Order details loading error:", err);

        if (!cancelled) {
          setError(err?.message || "Unable to load order details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="order-details-page">
        <div className="order-details-state">
          <div className="order-details-spinner" />

          <h2>Loading order...</h2>

          <p>Please wait while we retrieve your order details.</p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !order) {
    return (
      <main className="order-details-page">
        <div className="order-details-state">
          <div className="order-details-error-icon">!</div>

          <h1>Order unavailable</h1>

          <p>{error || "We couldn't find this order."}</p>

          <div className="order-details-state-actions">
            <button
              type="button"
              className="order-details-primary-button"
              onClick={() => navigate("/orders")}
            >
              Back to Orders
            </button>

            <Link to="/" className="order-details-secondary-button">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ORDER DATA
  // ==========================================================

  const items = Array.isArray(order.items) ? order.items : [];

  const customer = order.customer || {};

  const payment = order.payment || null;

  const total = Number(order.total_amount || 0);

  const status = order.status || "UNKNOWN";

  const subtotal = items.reduce(
    (totalAmount, item) =>
      totalAmount + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const itemCount = items.reduce(
    (count, item) => count + Number(item.quantity || 0),
    0,
  );

  const calculatedDelivery = Math.max(0, total - subtotal);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="order-details-page">
      <div className="order-details-container">
        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <div className="order-details-breadcrumb">
          <Link to="/">Home</Link>

          <span>/</span>

          <Link to="/orders">My Orders</Link>

          <span>/</span>

          <strong>Order #{order.order_id}</strong>
        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="order-details-header">
          <div>
            <span>ORDER DETAILS</span>

            <h1>Order #{order.order_id}</h1>

            <p>Placed on {formatDate(order.created_at)}</p>
          </div>

          <span className={getStatusClass(status)}>
            {getStatusText(status)}
          </span>
        </header>

        {/* ==================================================
            ORDER ITEMS
        ================================================== */}

        <section className="order-details-card">
          <div className="order-details-card-header">
            <div>
              <span>PRODUCTS</span>

              <h2>Items in your order</h2>
            </div>

            <strong>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </strong>
          </div>

          <div className="order-details-items">
            {items.length === 0 ? (
              <div className="order-details-empty">No order items found.</div>
            ) : (
              items.map((item, index) => {
                const productId = Number(
                  item.product_id ?? item.productId ?? 0,
                );

                const quantity = Number(item.quantity || 1);

                const price = Number(item.price || 0);

                const itemTotal = price * quantity;

                const image = getProductImage(productId);

                return (
                  <article
                    className="order-details-item"
                    key={item.order_item_id ?? `${productId}-${index}`}
                  >
                    {/* ==================================
                          IMAGE
                      =================================== */}

                    <div className="order-details-item-image">
                      {image ? (
                        <img src={image} alt={item.name || "Product"} />
                      ) : (
                        <div className="order-details-no-image">No image</div>
                      )}
                    </div>

                    {/* ==================================
                          PRODUCT
                      =================================== */}

                    <div className="order-details-item-info">
                      <h3>{item.name || "Product"}</h3>

                      {item.brand && <span>{item.brand}</span>}

                      {item.category && <small>{item.category}</small>}

                      <div className="order-details-item-meta">
                        <span>Qty: {quantity}</span>

                        <span>{formatPrice(price)} each</span>
                      </div>

                      {/* =================================
                            AI RECOMMENDATION
                        ================================== */}

                      {item.is_ai_recommended && (
                        <div className="order-details-ai-badge">
                          AI Recommended
                        </div>
                      )}
                    </div>

                    {/* ==================================
                          PRICE
                      =================================== */}

                    <div className="order-details-item-price">
                      <strong>{formatPrice(itemTotal)}</strong>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ==================================================
            TWO COLUMN DETAILS
        ================================================== */}

        <div className="order-details-grid">
          {/* =================================================
              CUSTOMER
          ================================================= */}

          <section className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>CUSTOMER</span>

                <h2>Customer information</h2>
              </div>
            </div>

            <div className="order-details-info">
              <div>
                <span>Name</span>

                <strong>{customer.name || "Not available"}</strong>
              </div>

              <div>
                <span>Email</span>

                <strong>{customer.email || "Not available"}</strong>
              </div>

              <div>
                <span>Phone</span>

                <strong>{customer.phone || "Not available"}</strong>
              </div>

              {order.customer_id && (
                <div>
                  <span>Customer ID</span>

                  <strong>{order.customer_id}</strong>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              PAYMENT
          ================================================= */}

          <section className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>PAYMENT</span>

                <h2>Payment information</h2>
              </div>
            </div>

            <div className="order-details-info">
              <div>
                <span>Status</span>

                <strong>
                  {payment?.status
                    ? getStatusText(payment.status)
                    : getStatusText(status)}
                </strong>
              </div>

              <div>
                <span>Method</span>

                <strong>Online Payment</strong>
              </div>

              {payment?.razorpay_order_id && (
                <div>
                  <span>Razorpay Order</span>

                  <strong className="order-details-mono">
                    {payment.razorpay_order_id}
                  </strong>
                </div>
              )}

              {payment?.razorpay_payment_id && (
                <div>
                  <span>Payment ID</span>

                  <strong className="order-details-mono">
                    {payment.razorpay_payment_id}
                  </strong>
                </div>
              )}

              {payment?.created_at && (
                <div>
                  <span>Payment Date</span>

                  <strong>{formatDateTime(payment.created_at)}</strong>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ==================================================
            ORDER TOTAL
        ================================================== */}

        <section className="order-details-card order-details-total-card">
          <div className="order-details-card-header">
            <div>
              <span>PAYMENT SUMMARY</span>

              <h2>Order total</h2>
            </div>
          </div>

          <div className="order-details-summary">
            <div>
              <span>Products</span>

              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div>
              <span>Delivery</span>

              <strong>
                {calculatedDelivery === 0
                  ? "FREE"
                  : formatPrice(calculatedDelivery)}
              </strong>
            </div>

            <div className="order-details-grand-total">
              <span>Total Paid</span>

              <strong>{formatPrice(total)}</strong>
            </div>
          </div>
        </section>

        {/* ==================================================
            ORDER DATE
        ================================================== */}

        <div className="order-details-meta-footer">
          <span>Order placed</span>

          <strong>{formatDateTime(order.created_at)}</strong>
        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="order-details-actions">
          <Link to="/orders" className="order-details-primary-button">
            ← Back to Orders
          </Link>

          <Link to="/" className="order-details-secondary-button">
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default OrderDetails;
