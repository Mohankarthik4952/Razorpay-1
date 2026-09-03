// ============================================================
// ELECTRONICS AI
// CART PAGE
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import "./Cart.css";

import productImages from "../data/productImages";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// HELPERS
// ============================================================

function getCustomerId() {
  const value = localStorage.getItem("customer_id");

  const id = Number(value);

  if (Number.isInteger(id) && id > 0) {
    return id;
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
// IMAGE
// ============================================================

function getProductImage(productId) {
  return productImages[Number(productId)] || null;
}

// ============================================================
// PRICE
// ============================================================

function formatPrice(price) {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// NORMALIZE CART
// ============================================================

function normalizeCart(data) {
  let cartData = null;

  // ----------------------------------------------------------
  // Supported backend formats
  // ----------------------------------------------------------

  if (data?.cart && !Array.isArray(data.cart)) {
    cartData = data.cart;
  } else if (data?.data?.cart && !Array.isArray(data.data.cart)) {
    cartData = data.data.cart;
  } else if (Array.isArray(data?.items)) {
    cartData = {
      items: data.items,
      summary: data.summary,
    };
  } else if (Array.isArray(data?.data?.items)) {
    cartData = {
      items: data.data.items,

      summary: data.data.summary,
    };
  }

  if (!cartData) {
    return {
      cart_id: null,

      customer_id: getCustomerId(),

      status: "ACTIVE",

      items: [],

      summary: {
        item_count: 0,
        subtotal: 0,
        shipping: 0,
        total: 0,
      },
    };
  }

  const items = Array.isArray(cartData.items) ? cartData.items : [];

  const normalizedItems = items
    .map((item) => {
      const productId = getProductId(item);

      const quantity = Number(item?.quantity || 1);

      const price = Number(
        item?.unit_price ?? item?.price ?? item?.product_price ?? 0,
      );

      return {
        ...item,

        product_id: productId,

        quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,

        price: Number.isFinite(price) ? price : 0,

        unit_price: Number.isFinite(price) ? price : 0,

        image: getProductImage(productId),
      };
    })
    .filter((item) => item.product_id > 0);

  // ----------------------------------------------------------
  // Calculate summary locally as backup
  // ----------------------------------------------------------

  const itemCount = normalizedItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const subtotal = normalizedItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const shipping = subtotal === 0 ? 0 : subtotal >= 50000 ? 0 : 499;

  const total = subtotal + shipping;

  return {
    ...cartData,

    items: normalizedItems,

    summary: {
      item_count: Number(cartData.summary?.item_count ?? itemCount),

      subtotal: Number(cartData.summary?.subtotal ?? subtotal),

      shipping: Number(cartData.summary?.shipping ?? shipping),

      total: Number(cartData.summary?.total ?? total),
    },
  };
}

// ============================================================
// LOCAL CART FALLBACK
// ============================================================

function readLocalCart() {
  try {
    const stored = JSON.parse(localStorage.getItem("cart") || "[]");

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .map((item) => {
        const productId = getProductId(item);

        const quantity = Number(item?.quantity || 1);

        const price = Number(item?.price ?? item?.unit_price ?? 0);

        return {
          ...item,

          product_id: productId,

          quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,

          price,

          unit_price: price,

          image: getProductImage(productId),
        };
      })
      .filter((item) => item.product_id > 0);
  } catch (error) {
    console.error("Local cart read error:", error);

    return [];
  }
}

// ============================================================
// CART PAGE
// ============================================================

function Cart() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [cart, setCart] = useState(null);

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  // ==========================================================
  // LOAD CART FROM BACKEND
  // ==========================================================

  useEffect(() => {
    loadCart();
  }, []);

  // ==========================================================
  // LOAD CART
  // ==========================================================

  async function loadCart() {
    const customerId = getCustomerId();

    console.log("Cart customer_id:", customerId);

    // --------------------------------------------------------
    // No customer
    // --------------------------------------------------------

    if (!customerId) {
      const localCart = readLocalCart();

      if (localCart.length > 0) {
        setCart({
          cart_id: null,

          customer_id: null,

          status: "LOCAL",

          items: localCart,
        });
      } else {
        setCart({
          items: [],
        });
      }

      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      setError("");

      // ======================================================
      // GET BACKEND CART
      // ======================================================

      const response = await fetch(`${API_BASE_URL}/api/cart/${customerId}`);

      const data = await response.json().catch(() => ({}));

      console.log("Cart API response:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load cart.");
      }

      const normalized = normalizeCart(data);

      console.log("Normalized cart:", normalized);

      // ======================================================
      // SAVE SERVER CART TO LOCAL STORAGE
      // ======================================================

      try {
        localStorage.setItem("cart", JSON.stringify(normalized.items));
      } catch {
        // Ignore storage errors
      }

      setCart(normalized);
    } catch (err) {
      console.error("Cart loading error:", err);

      // ------------------------------------------------------
      // Fallback to localStorage
      // ------------------------------------------------------

      const localCart = readLocalCart();

      if (localCart.length > 0) {
        setCart({
          cart_id: null,

          customer_id: customerId,

          status: "LOCAL",

          items: localCart,
        });

        setError(
          "Unable to synchronize with the server. Showing your saved cart.",
        );
      } else {
        setCart({
          items: [],
        });

        setError(err?.message || "Unable to load your cart.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // CART ITEMS
  // ==========================================================

  const items = cart?.items || [];

  // ==========================================================
  // TOTAL ITEMS
  // ==========================================================

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    [items],
  );

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          Number(item.price || item.unit_price || 0) *
            Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  // ==========================================================
  // DELIVERY
  // ==========================================================

  const deliveryCharge = subtotal === 0 ? 0 : subtotal >= 50000 ? 0 : 499;

  // ==========================================================
  // TOTAL
  // ==========================================================

  const total = subtotal + deliveryCharge;

  // ==========================================================
  // UPDATE QUANTITY THROUGH BACKEND
  // ==========================================================

  async function updateQuantity(item, newQuantity) {
    const customerId = getCustomerId();

    if (!customerId) {
      setError("Please login or register before changing your cart.");

      return;
    }

    if (!item.cart_item_id) {
      setError("This cart item is not synchronized with the server.");

      return;
    }

    if (newQuantity < 1) {
      return removeProduct(item);
    }

    try {
      setUpdating(true);

      setError("");

      // ======================================================
      // PUT /api/cart/:cartItemId
      // ======================================================

      const response = await fetch(
        `${API_BASE_URL}/api/cart/${item.cart_item_id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer_id: customerId,

            quantity: newQuantity,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      console.log("Update cart response:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update cart.");
      }

      const updatedCart = normalizeCart(data);

      setCart(updatedCart);

      localStorage.setItem("cart", JSON.stringify(updatedCart.items));

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Update quantity error:", err);

      setError(err?.message || "Unable to update quantity.");
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================================
  // INCREASE
  // ==========================================================

  function increaseQuantity(item) {
    updateQuantity(item, Number(item.quantity || 0) + 1);
  }

  // ==========================================================
  // DECREASE
  // ==========================================================

  function decreaseQuantity(item) {
    updateQuantity(item, Number(item.quantity || 0) - 1);
  }

  // ==========================================================
  // REMOVE PRODUCT
  // ==========================================================

  async function removeProduct(item) {
    const customerId = getCustomerId();

    if (!customerId) {
      setError("Please login or register before modifying your cart.");

      return;
    }

    if (!item.cart_item_id) {
      setError("This cart item is not synchronized with the server.");

      return;
    }

    try {
      setUpdating(true);

      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/cart/${item.cart_item_id}?customer_id=${customerId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json().catch(() => ({}));

      console.log("Remove cart response:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to remove product.");
      }

      const updatedCart = normalizeCart(data);

      setCart(updatedCart);

      localStorage.setItem("cart", JSON.stringify(updatedCart.items));

      setMessage("Product removed from cart.");

      window.dispatchEvent(new Event("cartUpdated"));

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error("Remove product error:", err);

      setError(err?.message || "Unable to remove product.");
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  async function clearCart() {
    if (items.length === 0) {
      return;
    }

    const customerId = getCustomerId();

    // --------------------------------------------------------
    // We intentionally don't blindly remove localStorage.
    // The database must remain synchronized.
    // --------------------------------------------------------

    if (!customerId) {
      localStorage.removeItem("cart");

      setCart({
        items: [],
      });

      window.dispatchEvent(new Event("cartUpdated"));

      return;
    }

    try {
      setUpdating(true);

      setError("");

      // ------------------------------------------------------
      // Remove every server cart item.
      // ------------------------------------------------------

      for (const item of items) {
        if (!item.cart_item_id) {
          continue;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/cart/${item.cart_item_id}?customer_id=${customerId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          throw new Error(data?.message || "Unable to clear cart.");
        }
      }

      // ------------------------------------------------------
      // Reload server cart.
      // ------------------------------------------------------

      await loadCart();

      localStorage.removeItem("cart");

      setMessage("Cart cleared.");

      window.dispatchEvent(new Event("cartUpdated"));

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error("Clear cart error:", err);

      setError(err?.message || "Unable to clear cart.");
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================================
  // CHECKOUT
  // ==========================================================

  function handleCheckout() {
    if (items.length === 0) {
      return;
    }

    const customerId = getCustomerId();

    if (!customerId) {
      navigate("/login", {
        state: {
          from: "/checkout",
        },
      });

      return;
    }

    // --------------------------------------------------------
    // The cart must have server IDs.
    // --------------------------------------------------------

    const unsynchronized = items.some((item) => !item.cart_item_id);

    if (unsynchronized) {
      setError(
        "Your cart is still synchronizing. Please refresh and try again.",
      );

      loadCart();

      return;
    }

    navigate("/checkout");
  }

  // ==========================================================
  // IMAGE ERROR
  // ==========================================================

  function handleImageError(event) {
    event.currentTarget.style.display = "none";

    const parent = event.currentTarget.parentElement;

    if (!parent) {
      return;
    }

    if (parent.querySelector(".cart-image-missing")) {
      return;
    }

    const fallback = document.createElement("div");

    fallback.className = "cart-image-missing";

    fallback.textContent = "Image unavailable";

    parent.appendChild(fallback);
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <div className="cart-loading">
            <div className="cart-spinner" />

            <h2>Loading your cart...</h2>

            <p>Synchronizing your cart with the server.</p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // EMPTY
  // ==========================================================

  if (items.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <div className="cart-breadcrumb">
            <Link to="/">Home</Link>

            <span>/</span>

            <span>Cart</span>
          </div>

          {error && <div className="cart-error">{error}</div>}

          <section className="cart-empty">
            <div className="cart-empty-icon">🛒</div>

            <h1>Your cart is empty</h1>

            <p>Add some electronics to your cart and come back here.</p>

            <Link to="/" className="cart-shop-button">
              Continue Shopping
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN CART
  // ==========================================================

  return (
    <main className="cart-page">
      <div className="cart-container">
        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <div className="cart-breadcrumb">
          <Link to="/">Home</Link>

          <span>/</span>

          <span>Cart</span>
        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="cart-header">
          <div>
            <span className="cart-eyebrow">Shopping Cart</span>

            <h1>Your Cart</h1>

            <p>
              {totalItems} {totalItems === 1 ? "item" : "items"} ready for
              checkout.
            </p>
          </div>

          <button
            type="button"
            className="cart-clear-button"
            onClick={clearCart}
            disabled={updating}
          >
            {updating ? "Updating..." : "Clear Cart"}
          </button>
        </div>

        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && <div className="cart-message">{message}</div>}

        {error && <div className="cart-error">{error}</div>}

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="cart-layout">
          {/* =================================================
              ITEMS
          ================================================= */}

          <section className="cart-items">
            {items.map((item) => {
              const productId = getProductId(item);

              const image = getProductImage(productId);

              const price = Number(item.price ?? item.unit_price ?? 0);

              const quantity = Number(item.quantity || 1);

              const itemTotal = price * quantity;

              return (
                <article
                  className="cart-item"
                  key={item.cart_item_id || `${productId}-${item.id || "item"}`}
                >
                  {/* ======================================
                        IMAGE
                    ====================================== */}

                  <Link
                    to={`/product/${productId}`}
                    className="cart-item-image"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={item.name || "Product"}
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="cart-image-missing">
                        Image unavailable
                      </div>
                    )}
                  </Link>

                  {/* ======================================
                        DETAILS
                    ====================================== */}

                  <div className="cart-item-details">
                    <span className="cart-item-category">
                      {item.category || "Electronics"}
                    </span>

                    <Link
                      to={`/product/${productId}`}
                      className="cart-item-name"
                    >
                      {item.name || "Product"}
                    </Link>

                    {item.brand && (
                      <span className="cart-item-brand">{item.brand}</span>
                    )}

                    <span className="cart-item-price">
                      {formatPrice(price)}
                    </span>

                    {/* ====================================
                          CONTROLS
                      ==================================== */}

                    <div className="cart-item-controls">
                      <div className="cart-quantity">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item)}
                          disabled={updating}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <strong>{quantity}</strong>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item)}
                          disabled={updating}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove-button"
                        onClick={() => removeProduct(item)}
                        disabled={updating}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* ======================================
                        ITEM TOTAL
                    ====================================== */}

                  <strong className="cart-item-total">
                    {formatPrice(itemTotal)}
                  </strong>
                </article>
              );
            })}
          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <aside className="cart-summary">
            <div className="cart-summary-card">
              <span className="cart-summary-eyebrow">Order Summary</span>

              <h2>Summary</h2>

              {/* ITEMS */}

              <div className="cart-summary-row">
                <span>Items</span>

                <strong>{totalItems}</strong>
              </div>

              {/* SUBTOTAL */}

              <div className="cart-summary-row">
                <span>Subtotal</span>

                <strong>{formatPrice(subtotal)}</strong>
              </div>

              {/* DELIVERY */}

              <div className="cart-summary-row">
                <span>Delivery</span>

                <strong>
                  {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                </strong>
              </div>

              {/* DELIVERY MESSAGE */}

              {subtotal > 0 && subtotal < 50000 && (
                <p className="cart-delivery-note">
                  Add {formatPrice(50000 - subtotal)} more for free delivery.
                </p>
              )}

              <div className="cart-summary-divider" />

              {/* TOTAL */}

              <div className="cart-total-row">
                <span>Total</span>

                <strong>{formatPrice(total)}</strong>
              </div>

              {/* CHECKOUT */}

              <button
                type="button"
                className="cart-checkout-button"
                onClick={handleCheckout}
                disabled={updating}
              >
                Proceed to Checkout
              </button>

              {/* CONTINUE */}

              <Link to="/" className="cart-continue-button">
                Continue Shopping
              </Link>

              {/* SECURITY */}

              <div className="cart-secure-note">
                Secure checkout • Trusted shopping
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Cart;
