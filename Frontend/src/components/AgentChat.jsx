// ============================================================
// ELECTRONICS AI
// FLOATING AI SHOPPING ASSISTANT
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import productImages from "../data/productImages";
import "./AgentChat.css";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId() {
  const value = localStorage.getItem("customer_id");

  const customerId = Number(value);

  if (Number.isInteger(customerId) && customerId > 0) {
    return customerId;
  }

  return null;
}

// ============================================================
// PRODUCT ID
// ============================================================

function getProductId(product) {
  return Number(product?.product_id ?? product?.id ?? 0);
}

// ============================================================
// PRODUCT IMAGE
// ============================================================

function getProductImage(product) {
  const productId = getProductId(product);

  // ----------------------------------------------------------
  // LOCAL IMAGE
  // ----------------------------------------------------------

  const localImage = productImages[productId];

  if (localImage) {
    return localImage;
  }

  // ----------------------------------------------------------
  // BACKEND IMAGE
  // ----------------------------------------------------------

  if (product?.image_url) {
    return product.image_url;
  }

  if (product?.image) {
    return product.image;
  }

  if (product?.imageUrl) {
    return product.imageUrl;
  }

  return null;
}

// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ============================================================
// COMPONENT
// ============================================================

function AgentChat() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [messages, setMessages] = useState([
    {
      id: 1,

      sender: "agent",

      text: "Hi! I'm your Electronics AI shopping assistant. Tell me what you're looking for, your budget, or ask me for a recommendation.",
    },
  ]);

  // ==========================================================
  // OPEN AI FROM HOME PAGE
  // ==========================================================

  useEffect(() => {
    function openAssistant() {
      setIsOpen(true);
    }

    window.addEventListener("openAIAssistant", openAssistant);

    return () => {
      window.removeEventListener("openAIAssistant", openAssistant);
    };
  }, []);

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || loading) {
      return;
    }

    setError("");

    // --------------------------------------------------------
    // USER MESSAGE
    // --------------------------------------------------------

    setMessages((previous) => [
      ...previous,

      {
        id: Date.now(),

        sender: "user",

        text,
      },
    ]);

    setMessage("");

    try {
      setLoading(true);

      const customerId = getCustomerId();

      const response = await fetch(`${API_BASE_URL}/api/agent/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          customer_id: customerId,

          message: text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to contact the AI assistant.");
      }

      // ------------------------------------------------------
      // AI MESSAGE
      // ------------------------------------------------------

      const timestamp = Date.now();

      const newMessages = [
        {
          id: timestamp + 1,

          sender: "agent",

          text: data.message || "Here are the results I found for you.",
        },
      ];

      // ------------------------------------------------------
      // PRODUCTS
      // ------------------------------------------------------

      if (Array.isArray(data.products) && data.products.length > 0) {
        newMessages.push({
          id: timestamp + 2,

          sender: "products",

          products: data.products,
        });
      }

      // ------------------------------------------------------
      // RECOMMENDATIONS
      // ------------------------------------------------------

      if (
        Array.isArray(data.recommendations) &&
        data.recommendations.length > 0
      ) {
        newMessages.push({
          id: timestamp + 3,

          sender: "products",

          products: data.recommendations,
        });
      }

      // ------------------------------------------------------
      // CROSS-SELL SOURCE PRODUCT
      // ------------------------------------------------------

      if (data.sourceProduct) {
        newMessages.push({
          id: timestamp + 4,

          sender: "source-product",

          product: data.sourceProduct,
        });
      }

      // ------------------------------------------------------
      // COMPARISON
      // ------------------------------------------------------

      if (
        data.type === "PRODUCT_COMPARISON" &&
        Array.isArray(data.products) &&
        data.products.length > 0
      ) {
        newMessages.push({
          id: timestamp + 5,

          sender: "comparison",

          products: data.products,
        });
      }

      // ------------------------------------------------------
      // CART
      // ------------------------------------------------------

      if (data.type === "CART" && data.cart) {
        newMessages.push({
          id: timestamp + 6,

          sender: "cart",

          cart: data.cart,
        });
      }

      // ------------------------------------------------------
      // ORDER STATUS
      // ------------------------------------------------------

      if (data.type === "ORDER_STATUS" && data.order) {
        newMessages.push({
          id: timestamp + 7,

          sender: "order",

          order: data.order,
        });
      }

      // ------------------------------------------------------
      // LATEST ORDER
      // ------------------------------------------------------

      if (data.type === "LATEST_ORDER" && data.order) {
        newMessages.push({
          id: timestamp + 8,

          sender: "latest-order",

          order: data.order,
        });
      }

      // ------------------------------------------------------
      // ORDER HISTORY
      // ------------------------------------------------------

      if (data.type === "ORDER_HISTORY" && Array.isArray(data.orders)) {
        newMessages.push({
          id: timestamp + 9,

          sender: "order-history",

          orders: data.orders,
        });
      }

      setMessages((previous) => [...previous, ...newMessages]);
    } catch (err) {
      console.error("AI chat error:", err);

      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  async function handleAddToCart(product) {
    const customerId = getCustomerId();

    if (!customerId) {
      navigate("/login", {
        state: {
          from: "/",
        },
      });

      return;
    }

    const productId = getProductId(product);

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product.");

      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/agent/add-to-cart`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          customer_id: customerId,

          product_id: productId,

          quantity: 1,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to add product to cart.");
      }

      setMessages((previous) => [
        ...previous,

        {
          id: Date.now(),

          sender: "agent",

          text: data.message || "Product added to your cart successfully.",
        },
      ]);

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("AI add to cart error:", err);

      setError(err.message || "Unable to add product to cart.");
    }
  }

  // ==========================================================
  // VIEW PRODUCT
  // ==========================================================

  function handleViewProduct(product) {
    const productId = getProductId(product);

    if (!Number.isInteger(productId) || productId <= 0) {
      return;
    }

    setIsOpen(false);

    navigate(`/product/${productId}`);
  }

  // ==========================================================
  // VIEW ORDER
  // ==========================================================

  function handleViewOrder(order) {
    if (!order) {
      return;
    }

    const orderId = Number(order.order_id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    // Change this route only if your existing
    // application uses a different order route.

    setIsOpen(false);

    navigate(`/orders`);
  }

  // ==========================================================
  // PRODUCT CARD
  // ==========================================================

  function ProductCard({ product }) {
    const image = getProductImage(product);

    const stock = Number(product?.stock ?? product?.quantity ?? 0);

    const hasStock = stock > 0;

    return (
      <div className="agent-product-card">
        {/* ==================================================
            IMAGE
        ================================================== */}

        <div className="agent-product-image-wrapper">
          {image ? (
            <img
              src={image}
              alt={product.name || "Product"}
              className="agent-product-image"
              loading="lazy"
              onError={(event) => {
                console.error("Product image failed:", image);

                event.currentTarget.style.display = "none";

                const parent = event.currentTarget.parentElement;

                if (parent) {
                  parent.classList.add("image-error");
                }
              }}
            />
          ) : (
            <div className="agent-product-placeholder">
              <span>GMK</span>
            </div>
          )}
        </div>

        {/* ==================================================
            DETAILS
        ================================================== */}

        <div className="agent-product-info">
          <div className="agent-product-brand">
            {product.brand || product.category || "Electronics"}
          </div>

          <div className="agent-product-name">{product.name || "Product"}</div>

          <div className="agent-product-price">
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </div>

          <div
            className={
              hasStock ? "agent-stock available" : "agent-stock unavailable"
            }
          >
            {hasStock ? `${stock} available` : "Available"}
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="agent-product-actions">
            <button
              type="button"
              className="agent-view-button"
              onClick={() => handleViewProduct(product)}
            >
              View
            </button>

            <button
              type="button"
              className="agent-cart-button"
              onClick={() => handleAddToCart(product)}
              disabled={!hasStock}
            >
              {hasStock ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // COMPARISON CARD
  // ==========================================================

  function ComparisonCard({ products }) {
    if (!Array.isArray(products) || products.length === 0) {
      return null;
    }

    return (
      <div className="agent-comparison-container">
        <div className="agent-comparison-title">Product Comparison</div>

        <div className="agent-comparison-products">
          {products.map((product) => (
            <div
              key={getProductId(product)}
              className="agent-comparison-product"
            >
              <div className="agent-comparison-image-wrapper">
                {getProductImage(product) ? (
                  <img
                    src={getProductImage(product)}
                    alt={product.name || "Product"}
                    className="agent-comparison-image"
                  />
                ) : (
                  <div className="agent-product-placeholder">GMK</div>
                )}
              </div>

              <div className="agent-comparison-name">{product.name}</div>

              <div className="agent-comparison-row">
                <strong>Brand</strong>

                <span>{product.brand || "N/A"}</span>
              </div>

              <div className="agent-comparison-row">
                <strong>Category</strong>

                <span>{product.category || "N/A"}</span>
              </div>

              <div className="agent-comparison-row">
                <strong>Price</strong>

                <span>₹{formatMoney(product.price)}</span>
              </div>

              <div className="agent-comparison-row">
                <strong>Stock</strong>

                <span>{Number(product.stock || 0)}</span>
              </div>

              <div className="agent-product-actions">
                <button
                  type="button"
                  className="agent-view-button"
                  onClick={() => handleViewProduct(product)}
                >
                  View
                </button>

                <button
                  type="button"
                  className="agent-cart-button"
                  onClick={() => handleAddToCart(product)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================================
  // CART CARD
  // ==========================================================

  function CartCard({ cart }) {
    if (!cart || !Array.isArray(cart.items)) {
      return null;
    }

    return (
      <div className="agent-cart-container">
        <div className="agent-cart-title">🛒 Your Cart</div>

        {cart.items.map((item) => (
          <div
            key={item.cart_item_id || item.product_id}
            className="agent-cart-item"
          >
            <div className="agent-cart-image-wrapper">
              {getProductImage(item) ? (
                <img
                  src={getProductImage(item)}
                  alt={item.name || "Product"}
                  className="agent-cart-image"
                />
              ) : (
                <div className="agent-product-placeholder">GMK</div>
              )}
            </div>

            <div className="agent-cart-item-info">
              <div className="agent-cart-item-name">
                {item.name || "Product"}
              </div>

              <div className="agent-cart-item-price">
                ₹{formatMoney(item.unit_price)}
              </div>

              <div>Quantity: {item.quantity}</div>

              <div>Subtotal: ₹{formatMoney(item.subtotal)}</div>
            </div>
          </div>
        ))}

        <div className="agent-cart-total">
          <strong>Total</strong>

          <strong>₹{formatMoney(cart.total)}</strong>
        </div>

        <button
          type="button"
          className="agent-cart-checkout-button"
          onClick={() => {
            setIsOpen(false);

            navigate("/cart");
          }}
        >
          Go to Cart
        </button>
      </div>
    );
  }

  // ==========================================================
  // ORDER CARD
  // ==========================================================

  function OrderCard({ order }) {
    if (!order) {
      return null;
    }

    return (
      <div className="agent-order-card">
        <div className="agent-order-header">
          <strong>📦 Order #{order.order_id}</strong>

          <span>{order.status || "Processing"}</span>
        </div>

        <div className="agent-order-row">
          <span>Amount</span>

          <strong>₹{formatMoney(order.total_amount)}</strong>
        </div>

        <div className="agent-order-row">
          <span>Payment</span>

          <span>{order.payment_method || "N/A"}</span>
        </div>

        <div className="agent-order-row">
          <span>Payment Status</span>

          <span>{order.payment_status || "N/A"}</span>
        </div>

        <div className="agent-order-row">
          <span>Ordered</span>

          <span>{formatDate(order.created_at)}</span>
        </div>

        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="agent-order-items">
            <div className="agent-order-items-title">Items</div>

            {order.items.map((item) => (
              <div
                key={item.order_item_id || item.product_id}
                className="agent-order-item"
              >
                <div className="agent-order-item-image">
                  {getProductImage(item) ? (
                    <img
                      src={getProductImage(item)}
                      alt={item.name || "Product"}
                    />
                  ) : (
                    <span>GMK</span>
                  )}
                </div>

                <div>
                  <strong>{item.name}</strong>

                  <div>Qty: {item.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="agent-order-button"
          onClick={() => handleViewOrder(order)}
        >
          View Orders
        </button>
      </div>
    );
  }

  // ==========================================================
  // ORDER HISTORY
  // ==========================================================

  function OrderHistory({ orders }) {
    if (!Array.isArray(orders) || orders.length === 0) {
      return null;
    }

    return (
      <div className="agent-order-history">
        <div className="agent-order-history-title">📋 Recent Orders</div>

        {orders.map((order) => (
          <div key={order.order_id} className="agent-history-item">
            <div>
              <strong>Order #{order.order_id}</strong>

              <div>{formatDate(order.created_at)}</div>
            </div>

            <div className="agent-history-right">
              <strong>₹{formatMoney(order.total_amount)}</strong>

              <span>{order.status || "Processing"}</span>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="agent-order-button"
          onClick={() => {
            setIsOpen(false);

            navigate("/orders");
          }}
        >
          View All Orders
        </button>
      </div>
    );
  }

  // ==========================================================
  // FLOATING BUTTON
  // ==========================================================

  if (!isOpen) {
    return (
      <button
        type="button"
        className="agent-floating-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Electronics AI"
      >
        <span className="agent-floating-icon">✦</span>

        <span className="agent-floating-text">AI Assistant</span>
      </button>
    );
  }

  // ==========================================================
  // CHAT WINDOW
  // ==========================================================

  return (
    <div className="agent-chat-window">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="agent-chat-header">
        <div className="agent-avatar">GMK</div>

        <div className="agent-header-content">
          <h2>Electronics AI</h2>

          <p>Shopping Assistant</p>
        </div>

        <span className="agent-online">● Online</span>

        <button
          type="button"
          className="agent-close-button"
          onClick={() => setIsOpen(false)}
          aria-label="Close AI assistant"
        >
          ×
        </button>
      </div>

      {/* ====================================================
          MESSAGES
      ==================================================== */}

      <div className="agent-chat-messages">
        {messages.map((item) => {
          // ------------------------------------------------
          // NORMAL MESSAGE
          // ------------------------------------------------

          if (item.sender === "user" || item.sender === "agent") {
            return (
              <div
                key={item.id}
                className={
                  item.sender === "user"
                    ? "agent-message-row user-row"
                    : "agent-message-row agent-row"
                }
              >
                <div
                  className={
                    item.sender === "user"
                      ? "agent-message user-message"
                      : "agent-message agent-message-bubble"
                  }
                >
                  {item.text}
                </div>
              </div>
            );
          }

          // ------------------------------------------------
          // PRODUCTS
          // ------------------------------------------------

          if (item.sender === "products") {
            return (
              <div key={item.id} className="agent-products-list">
                {(item.products || []).map((product) => (
                  <ProductCard key={getProductId(product)} product={product} />
                ))}
              </div>
            );
          }

          // ------------------------------------------------
          // COMPARISON
          // ------------------------------------------------

          if (item.sender === "comparison") {
            return <ComparisonCard key={item.id} products={item.products} />;
          }

          // ------------------------------------------------
          // SOURCE PRODUCT
          // ------------------------------------------------

          if (item.sender === "source-product") {
            return (
              <div key={item.id} className="agent-products-list">
                <ProductCard product={item.product} />
              </div>
            );
          }

          // ------------------------------------------------
          // CART
          // ------------------------------------------------

          if (item.sender === "cart") {
            return <CartCard key={item.id} cart={item.cart} />;
          }

          // ------------------------------------------------
          // ORDER STATUS
          // ------------------------------------------------

          if (item.sender === "order") {
            return <OrderCard key={item.id} order={item.order} />;
          }

          // ------------------------------------------------
          // LATEST ORDER
          // ------------------------------------------------

          if (item.sender === "latest-order") {
            return <OrderCard key={item.id} order={item.order} />;
          }

          // ------------------------------------------------
          // ORDER HISTORY
          // ------------------------------------------------

          if (item.sender === "order-history") {
            return <OrderHistory key={item.id} orders={item.orders} />;
          }

          return null;
        })}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className="agent-message-row agent-row">
            <div className="agent-message-bubble agent-loading">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && <div className="agent-error">{error}</div>}

      {/* ====================================================
          QUICK SUGGESTIONS
      ==================================================== */}

      <div className="agent-suggestions">
        <button
          type="button"
          onClick={() => setMessage("Find me a laptop under 70000")}
        >
          Laptop under ₹70K
        </button>

        <button type="button" onClick={() => setMessage("Show me headphones")}>
          Headphones
        </button>

        <button
          type="button"
          onClick={() => setMessage("Recommend laptop accessories")}
        >
          Accessories
        </button>

        <button type="button" onClick={() => setMessage("Show my cart")}>
          My Cart
        </button>

        <button type="button" onClick={() => setMessage("Show my orders")}>
          My Orders
        </button>
      </div>

      {/* ====================================================
          INPUT
      ==================================================== */}

      <form className="agent-chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask me anything..."
          disabled={loading}
        />

        <button type="submit" disabled={loading || !message.trim()}>
          {loading ? "..." : "↑"}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AgentChat;
