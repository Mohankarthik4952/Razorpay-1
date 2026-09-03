// ============================================================
// ELECTRONICS AI
// PAYMENT SUCCESS PAGE
// ============================================================

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./PaymentSuccess.css";

import productImages from "../data/productImages";

// ============================================================
// HELPERS
// ============================================================

function formatPrice(price) {
  const amount = Number(price || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// PRODUCT IMAGE
// ============================================================

function getProductImage(productId) {
  return productImages[Number(productId)] || null;
}

// ============================================================
// PAYMENT SUCCESS
// ============================================================

function PaymentSuccess() {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD LATEST ORDER
  // ==========================================================

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("latestOrder");

      if (!stored) {
        setError("Order information could not be found.");

        setLoading(false);

        return;
      }

      const parsed = JSON.parse(stored);

      setOrder(parsed);
    } catch (err) {
      console.error("Payment success loading error:", err);

      setError("Unable to load your order information.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="payment-success-page">
        <div className="payment-success-state">
          <div className="payment-success-spinner" />

          <h2>Loading your order...</h2>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !order) {
    return (
      <main className="payment-success-page">
        <div className="payment-success-state">
          <div className="payment-success-icon">!</div>

          <h1>Order information unavailable</h1>

          <p>{error || "We couldn't find your recent order."}</p>

          <div className="payment-success-actions">
            <Link to="/" className="payment-success-primary">
              Continue Shopping
            </Link>

            <Link to="/orders" className="payment-success-secondary">
              View Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ORDER DATA
  // ==========================================================

  const orderId =
    order.orderId ?? order.local_order_id ?? order.order?.order_id ?? "N/A";

  const customerId =
    order.customerId ?? order.customer_id ?? order.order?.customer_id ?? null;

  const paymentId =
    order.paymentId ??
    order.razorpayPaymentId ??
    order.payment?.razorpay_payment_id ??
    null;

  const razorpayOrderId =
    order.razorpayOrderId ?? order.payment?.razorpay_order_id ?? null;

  const status =
    order.paymentStatus ?? order.status ?? order.order?.status ?? "PAID";

  const items = Array.isArray(order.items) ? order.items : [];

  const subtotal = Number(order.subtotal || order.summary?.subtotal || 0);

  const delivery = Number(order.delivery || order.summary?.shipping || 0);

  const total = Number(
    order.total || order.order?.total_amount || order.summary?.total || 0,
  );

  const customer = order.customer || {};

  // ==========================================================
  // TOTAL ITEMS
  // ==========================================================

  const totalItems = items.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );

  // ==========================================================
  // DATE
  // ==========================================================

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

  const formattedDate = Number.isNaN(orderDate.getTime())
    ? "Today"
    : orderDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="payment-success-page">
      <div className="payment-success-container">
        {/* ==================================================
            SUCCESS HEADER
        ================================================== */}

        <section className="payment-success-hero">
          <div className="payment-success-check">✓</div>

          <span className="payment-success-eyebrow">PAYMENT SUCCESSFUL</span>

          <h1>Thank you for your order</h1>

          <p>
            Your payment has been successfully verified and your order has been
            placed.
          </p>

          <div className="payment-success-order-number">Order #{orderId}</div>
        </section>

        {/* ==================================================
            ORDER SUMMARY
        ================================================== */}

        <section className="payment-success-card">
          <div className="payment-success-card-header">
            <div>
              <span>ORDER DETAILS</span>

              <h2>Your purchase</h2>
            </div>

            <div className="payment-success-paid">
              <span className="payment-success-paid-dot" />
              PAID
            </div>
          </div>

          {/* =================================================
              ORDER ITEMS
          ================================================= */}

          <div className="payment-success-items">
            {items.length === 0 ? (
              <div className="payment-success-empty">
                Order items unavailable.
              </div>
            ) : (
              items.map((item, index) => {
                const productId = Number(
                  item.product_id ?? item.productId ?? item.id ?? 0,
                );

                const quantity = Number(item.quantity || 1);

                const price = Number(item.price || item.unit_price || 0);

                const itemTotal = price * quantity;

                const image = getProductImage(productId);

                return (
                  <div
                    className="payment-success-item"
                    key={item.order_item_id ?? `${productId}-${index}`}
                  >
                    <div className="payment-success-item-image">
                      {image ? (
                        <img src={image} alt={item.name || "Product"} />
                      ) : (
                        <span>—</span>
                      )}
                    </div>

                    <div className="payment-success-item-info">
                      <strong>{item.name || "Product"}</strong>

                      {item.brand && <small>{item.brand}</small>}

                      <span>Qty: {quantity}</span>

                      {item.is_ai_recommended && <em>AI Recommended</em>}
                    </div>

                    <div className="payment-success-item-price">
                      <strong>{formatPrice(itemTotal)}</strong>

                      <span>{formatPrice(price)} each</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* =================================================
              PRICE SUMMARY
          ================================================= */}

          <div className="payment-success-summary">
            <div>
              <span>Items</span>

              <strong>{totalItems}</strong>
            </div>

            <div>
              <span>Subtotal</span>

              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div>
              <span>Delivery</span>

              <strong>{delivery === 0 ? "FREE" : formatPrice(delivery)}</strong>
            </div>

            <div className="payment-success-total">
              <span>Total Paid</span>

              <strong>{formatPrice(total)}</strong>
            </div>
          </div>
        </section>

        {/* ==================================================
            CUSTOMER INFORMATION
        ================================================== */}

        <section className="payment-success-details">
          <div className="payment-success-info-card">
            <span>CUSTOMER</span>

            <h3>{customer.name || "Customer"}</h3>

            {customer.email && <p>{customer.email}</p>}

            {customer.phone && <p>{customer.phone}</p>}
          </div>

          <div className="payment-success-info-card">
            <span>ORDER DATE</span>

            <h3>{formattedDate}</h3>

            {customerId && <p>Customer ID: {customerId}</p>}
          </div>

          <div className="payment-success-info-card">
            <span>PAYMENT</span>

            <h3>Online Payment</h3>

            {paymentId && <p>Payment ID: {paymentId}</p>}
          </div>
        </section>

        {/* ==================================================
            PAYMENT INFORMATION
        ================================================== */}

        {razorpayOrderId && (
          <section className="payment-success-payment-info">
            <div>
              <span>Razorpay Order ID</span>

              <strong>{razorpayOrderId}</strong>
            </div>

            {paymentId && (
              <div>
                <span>Razorpay Payment ID</span>

                <strong>{paymentId}</strong>
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="payment-success-actions">
          <Link to="/orders" className="payment-success-primary">
            View My Orders
            <span>→</span>
          </Link>

          <Link to="/" className="payment-success-secondary">
            Continue Shopping
          </Link>
        </div>

        {/* ==================================================
            FOOTER MESSAGE
        ================================================== */}

        <p className="payment-success-footer">
          Thank you for shopping with Electronics AI.
        </p>
      </div>
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default PaymentSuccess;
