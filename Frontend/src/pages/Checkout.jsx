// ============================================================
// ELECTRONICS AI
// CHECKOUT PAGE
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import "./Checkout.css";

import productImages from "../data/productImages";

// ============================================================
// API
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// PRODUCT ID
// ============================================================

function getProductId(product) {
  return Number(product?.product_id ?? product?.id ?? 0);
}

// ============================================================
// PRODUCT IMAGE
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
// CUSTOMER ID
// ============================================================

function getCustomerId() {
  const possibleKeys = ["customer_id", "customerId", "user_id", "userId"];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value !== null && value !== "") {
      const id = Number(value);

      if (Number.isInteger(id) && id > 0) {
        return id;
      }
    }
  }

  // ----------------------------------------------------------
  // Check stored customer object
  // ----------------------------------------------------------

  const customerKeys = ["customer", "user", "currentUser", "loggedInUser"];

  for (const key of customerKeys) {
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
// STORED CUSTOMER
// ============================================================

function getStoredCustomer() {
  try {
    const stored = localStorage.getItem("customer");

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ============================================================
// LOCAL CART
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

          price: Number.isFinite(price) ? price : 0,

          image: getProductImage(productId),
        };
      })
      .filter((item) => item.product_id > 0);
  } catch (error) {
    console.error("Local cart error:", error);

    return [];
  }
}

// ============================================================
// NORMALIZE BACKEND CART
// ============================================================

function normalizeBackendCart(data) {
  /*
   * Supports several possible
   * backend response formats:
   *
   * data.items
   * data.cart.items
   * data.data.items
   * data.cart
   */

  let items = [];

  if (Array.isArray(data?.items)) {
    items = data.items;
  } else if (Array.isArray(data?.cart?.items)) {
    items = data.cart.items;
  } else if (Array.isArray(data?.data?.items)) {
    items = data.data.items;
  } else if (Array.isArray(data?.data?.cart?.items)) {
    items = data.data.cart.items;
  }

  return items
    .map((item) => {
      const productId = getProductId(item);

      const quantity = Number(item?.quantity || 1);

      const price = Number(
        item?.price ?? item?.unit_price ?? item?.product_price ?? 0,
      );

      return {
        ...item,

        product_id: productId,

        quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,

        price: Number.isFinite(price) ? price : 0,

        image: getProductImage(productId),
      };
    })
    .filter((item) => item.product_id > 0);
}

// ============================================================
// INITIAL FORM
// ============================================================

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

// ============================================================
// CHECKOUT
// ============================================================

function Checkout() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [cart, setCart] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const [processing, setProcessing] = useState(false);

  const [loadingCart, setLoadingCart] = useState(true);

  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState(getCustomerId());

  // ==========================================================
  // LOAD CUSTOMER
  // ==========================================================

  useEffect(() => {
    async function loadCustomer() {
      const id = getCustomerId();

      setCustomerId(id);

      if (!id) {
        setLoadingCart(false);

        return;
      }

      // --------------------------------------------------------
      // Load locally stored customer
      // --------------------------------------------------------

      const storedCustomer = getStoredCustomer();

      if (storedCustomer) {
        setForm((previous) => ({
          ...previous,

          fullName: previous.fullName || storedCustomer.name || "",

          email: previous.email || storedCustomer.email || "",

          phone: previous.phone || storedCustomer.phone || "",
        }));
      }

      // --------------------------------------------------------
      // Load latest customer data
      // --------------------------------------------------------

      try {
        const response = await fetch(`${API_URL}/api/auth/customer/${id}`);

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const customer = data?.customer || data?.data?.customer || data?.data;

          if (customer) {
            setForm((previous) => ({
              ...previous,

              fullName: previous.fullName || customer.name || "",

              email: previous.email || customer.email || "",

              phone: previous.phone || customer.phone || "",
            }));

            localStorage.setItem("customer", JSON.stringify(customer));
          }
        }
      } catch (error) {
        console.warn("Unable to refresh customer information:", error);
      }
    }

    loadCustomer();
  }, []);

  // ==========================================================
  // LOAD SERVER CART
  // ==========================================================

  useEffect(() => {
    async function loadCart() {
      const id = getCustomerId();

      if (!id) {
        setCart([]);

        setLoadingCart(false);

        return;
      }

      try {
        setLoadingCart(true);

        setError("");

        console.log("Checkout customer_id:", id);

        // ====================================================
        // IMPORTANT
        //
        // Load the cart from backend.
        //
        // This keeps Checkout synchronized
        // with PostgreSQL.
        // ====================================================

        const response = await fetch(`${API_URL}/api/cart/${id}`);

        const data = await response.json().catch(() => ({}));

        console.log("Checkout cart response:", data);

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load your cart.");
        }

        const backendCart = normalizeBackendCart(data);

        // ------------------------------------------------------
        // Backend cart exists
        // ------------------------------------------------------

        if (backendCart.length > 0) {
          setCart(backendCart);

          // Keep local cart
          // synchronized.

          try {
            localStorage.setItem("cart", JSON.stringify(backendCart));
          } catch {
            // Ignore
          }

          return;
        }

        // ------------------------------------------------------
        // FALLBACK
        //
        // Some versions of the cart API
        // may return a different shape.
        // ------------------------------------------------------

        const localCart = readLocalCart();

        if (localCart.length > 0) {
          console.warn(
            "Backend cart returned no items. Using local cart fallback.",
          );

          setCart(localCart);

          return;
        }

        // ------------------------------------------------------
        // Actually empty
        // ------------------------------------------------------

        setCart([]);

        setError("Your cart is empty.");
      } catch (error) {
        console.error("Checkout cart loading error:", error);

        // ------------------------------------------------------
        // Local fallback
        // ------------------------------------------------------

        const localCart = readLocalCart();

        if (localCart.length > 0) {
          setCart(localCart);

          setError("");

          return;
        }

        setCart([]);

        setError(error?.message || "Unable to load your cart.");
      } finally {
        setLoadingCart(false);
      }
    }

    loadCart();
  }, []);

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    if (error) {
      setError("");
    }
  }

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cart],
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
  // TOTAL ITEMS
  // ==========================================================

  const totalItems = cart.reduce(
    (count, item) => count + Number(item.quantity || 0),
    0,
  );

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateForm() {
    const id = getCustomerId();

    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    if (!id) {
      return "Customer account not found. Please login or register again.";
    }

    // --------------------------------------------------------
    // CART
    // --------------------------------------------------------

    if (cart.length === 0) {
      return "Your cart is empty.";
    }

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (!form.fullName.trim()) {
      return "Please enter your full name.";
    }

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (!form.email.trim()) {
      return "Please enter your email address.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    const phone = form.phone.replace(/\s/g, "").trim();

    if (!phone) {
      return "Please enter your mobile number.";
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    // --------------------------------------------------------
    // ADDRESS
    // --------------------------------------------------------

    if (!form.address.trim()) {
      return "Please enter your delivery address.";
    }

    // --------------------------------------------------------
    // CITY
    // --------------------------------------------------------

    if (!form.city.trim()) {
      return "Please enter your city.";
    }

    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    if (!form.state.trim()) {
      return "Please enter your state.";
    }

    // --------------------------------------------------------
    // PIN
    // --------------------------------------------------------

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      return "Please enter a valid 6-digit PIN code.";
    }

    return "";
  }

  // ==========================================================
  // RAZORPAY SCRIPT
  // ==========================================================

  async function loadRazorpayScript() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );

      if (existing) {
        existing.onload = () => resolve(true);

        existing.onerror = () => resolve(false);

        return;
      }

      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  // ==========================================================
  // SAVE ORDER
  // ==========================================================

  function saveLatestOrder(data) {
    try {
      sessionStorage.setItem("latestOrder", JSON.stringify(data));
    } catch (error) {
      console.error("Unable to save latest order:", error);
    }
  }

  // ==========================================================
  // CREATE PAYMENT ORDER
  // ==========================================================

  async function createOrder() {
    // ========================================================
    // VALIDATION
    // ========================================================

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);

      return;
    }

    // ========================================================
    // CUSTOMER ID
    // ========================================================

    const currentCustomerId = getCustomerId();

    if (!currentCustomerId) {
      setError("Customer account not found. Please login again.");

      return;
    }

    setCustomerId(currentCustomerId);

    // ========================================================
    // CASH ON DELIVERY
    // ========================================================

    if (paymentMethod === "cod") {
      try {
        setProcessing(true);
        setError("");

        const response = await fetch(`${API_URL}/api/payment/cod`, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer_id: currentCustomerId,
          }),
        });

        const data = await response.json().catch(() => ({}));

        console.log("COD response:", data);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              `COD order failed with status ${response.status}.`,
          );
        }

        if (data?.success === false) {
          throw new Error(data?.message || "Unable to place COD order.");
        }

        // ======================================================
        // SAVE COD ORDER
        // ======================================================

        const codOrder = {
          orderId: data?.local_order_id ?? data?.order?.order_id ?? null,

          customerId: currentCustomerId,

          customer: data?.customer || getStoredCustomer(),

          items: cart,

          subtotal: Number(data?.summary?.subtotal ?? subtotal),

          delivery: Number(data?.summary?.shipping ?? deliveryCharge),

          total: Number(
            data?.summary?.total ?? data?.order?.total_amount ?? total,
          ),

          paymentMethod: "cod",

          paymentStatus: "COD_PENDING",

          paymentVerified: false,

          status: "PLACED",

          paymentId: data?.payment?.payment_id ?? null,

          createdAt: new Date().toISOString(),
        };

        // ======================================================
        // SAVE LATEST ORDER
        // ======================================================

        saveLatestOrder(codOrder);

        // ======================================================
        // CLEAR LOCAL CART
        // ======================================================

        localStorage.removeItem("cart");

        // ======================================================
        // CART UPDATE EVENT
        // ======================================================

        window.dispatchEvent(new Event("cartUpdated"));

        // ======================================================
        // GO TO SUCCESS PAGE
        // ======================================================

        navigate("/payment-success", {
          replace: true,
        });

        return;
      } catch (error) {
        console.error("COD order error:", error);

        setError(error?.message || "Unable to place Cash on Delivery order.");

        setProcessing(false);

        return;
      }
    }

    // ========================================================
    // PROCESSING
    // ========================================================

    try {
      setProcessing(true);

      setError("");

      // ======================================================
      // IMPORTANT PAYMENT PAYLOAD
      //
      // The backend finds the active PostgreSQL cart
      // using customer_id.
      //
      // ======================================================

      const payload = {
        customer_id: currentCustomerId,
      };

      console.log("======================================");

      console.log("CREATE PAYMENT ORDER");

      console.log("customer_id:", currentCustomerId);

      console.log("customer_id type:", typeof currentCustomerId);

      console.log("cart items:", cart);

      console.log("======================================");

      // ======================================================
      // CREATE RAZORPAY ORDER
      // ======================================================

      const response = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      console.log("Create payment response:", data);

      // ======================================================
      // BACKEND ERROR
      // ======================================================

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Payment order failed with status ${response.status}.`,
        );
      }

      if (data?.success === false) {
        throw new Error(data?.message || "Unable to create payment order.");
      }

      // ======================================================
      // LOCAL ORDER ID
      // ======================================================

      const localOrderId =
        data?.local_order_id ?? data?.order?.order_id ?? data?.order_id ?? null;

      if (!localOrderId) {
        throw new Error("Local order ID was not returned by the backend.");
      }

      // ======================================================
      // RAZORPAY ORDER ID
      // ======================================================

      const razorpayOrderId = data?.razorpay_order_id ?? null;

      if (!razorpayOrderId) {
        throw new Error("Razorpay order ID was not returned by the backend.");
      }

      // ======================================================
      // SERVER AMOUNT
      // ======================================================

      const razorpayAmount = Number(data?.amount);

      if (!Number.isFinite(razorpayAmount) || razorpayAmount <= 0) {
        throw new Error("Invalid payment amount returned by the backend.");
      }

      // ======================================================
      // SERVER SUMMARY
      // ======================================================

      const serverSubtotal = Number(data?.summary?.subtotal ?? subtotal);

      const serverShipping = Number(data?.summary?.shipping ?? deliveryCharge);

      const serverTotal = Number(data?.summary?.total ?? total);

      // ======================================================
      // SAVE CHECKOUT DATA
      // ======================================================

      const checkoutData = {
        orderId: localOrderId,

        razorpayOrderId: razorpayOrderId,

        customerId: currentCustomerId,

        customer: data?.customer || getStoredCustomer(),

        items: cart,

        subtotal: serverSubtotal,

        delivery: serverShipping,

        total: serverTotal,

        paymentMethod: "razorpay",

        paymentStatus: "pending",

        paymentVerified: false,

        createdAt: new Date().toISOString(),
      };

      saveLatestOrder(checkoutData);

      // ======================================================
      // LOAD RAZORPAY
      // ======================================================

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Unable to load Razorpay. Please check your internet connection.",
        );
      }

      // ======================================================
      // RAZORPAY KEY
      // ======================================================

      const razorpayKey = data?.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error("Razorpay key is missing.");
      }

      // ======================================================
      // RAZORPAY OPTIONS
      // ======================================================

      const options = {
        key: razorpayKey,

        amount: razorpayAmount,

        currency: data?.currency || "INR",

        name: "Electronics AI",

        description: "Electronics purchase",

        order_id: razorpayOrderId,

        prefill: {
          name: form.fullName.trim(),

          email: form.email.trim(),

          contact: form.phone.replace(/\s/g, "").trim(),
        },

        notes: {
          customer_id: String(currentCustomerId),

          local_order_id: String(localOrderId),
        },

        theme: {
          color: "#111827",
        },

        // ====================================================
        // PAYMENT SUCCESS
        // ====================================================

        handler: async function (paymentResponse) {
          try {
            setProcessing(true);

            setError("");

            console.log("Razorpay payment response:", paymentResponse);

            // ==============================================
            // VERIFY RESPONSE
            // ==============================================

            if (
              !paymentResponse?.razorpay_order_id ||
              !paymentResponse?.razorpay_payment_id ||
              !paymentResponse?.razorpay_signature
            ) {
              throw new Error("Incomplete Razorpay payment response.");
            }

            // ==============================================
            // VERIFY PAYMENT
            // ==============================================

            const verifyResponse = await fetch(
              `${API_URL}/api/payment/verify`,
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,

                  razorpay_payment_id: paymentResponse.razorpay_payment_id,

                  razorpay_signature: paymentResponse.razorpay_signature,

                  customer_id: currentCustomerId,

                  order_id: localOrderId,
                }),
              },
            );

            const verifyData = await verifyResponse.json().catch(() => ({}));

            console.log("Payment verification response:", verifyData);

            // ==============================================
            // VERIFICATION ERROR
            // ==============================================

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData?.message || "Payment verification failed.",
              );
            }

            if (verifyData?.success === false) {
              throw new Error(
                verifyData?.message || "Payment verification failed.",
              );
            }

            // ==============================================
            // PAYMENT SUCCESS
            // ==============================================

            const finalOrder = {
              ...checkoutData,

              orderId: verifyData?.order?.order_id ?? localOrderId,

              customerId: currentCustomerId,

              razorpayOrderId: paymentResponse.razorpay_order_id,

              paymentId: paymentResponse.razorpay_payment_id,

              paymentStatus: "paid",

              paymentVerified: true,

              status: "PAID",

              total: Number(
                verifyData?.order?.total_amount ?? checkoutData.total,
              ),

              verifiedAt: new Date().toISOString(),
            };

            // ==============================================
            // SAVE SUCCESSFUL ORDER
            // ==============================================

            saveLatestOrder(finalOrder);

            // ==============================================
            // CLEAR LOCAL CART
            //
            // Only after successful payment.
            // ==============================================

            localStorage.removeItem("cart");

            // ==============================================
            // CART UPDATE EVENT
            // ==============================================

            window.dispatchEvent(new Event("cartUpdated"));

            // ==============================================
            // PAYMENT SUCCESS PAGE
            // ==============================================

            navigate("/payment-success", {
              replace: true,
            });
          } catch (verificationError) {
            console.error("Payment verification error:", verificationError);

            setError(
              verificationError?.message || "Payment verification failed.",
            );

            setProcessing(false);
          }
        },

        // ====================================================
        // RAZORPAY CLOSED
        // ====================================================

        modal: {
          ondismiss: function () {
            console.log("Razorpay payment window closed.");

            setProcessing(false);
          },
        },
      };

      // ======================================================
      // CREATE RAZORPAY
      // ======================================================

      const razorpay = new window.Razorpay(options);

      // ======================================================
      // PAYMENT FAILED
      // ======================================================

      razorpay.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response);

        const message =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again.";

        setError(message);

        setProcessing(false);
      });

      // ======================================================
      // OPEN RAZORPAY
      // ======================================================

      razorpay.open();
    } catch (error) {
      console.error("Create payment order error:", error);

      setError(error?.message || "Unable to start payment.");

      setProcessing(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loadingCart) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-loading">
            <div className="checkout-spinner" />

            <h2>Preparing your checkout...</h2>

            <p>Loading your cart and customer information.</p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // EMPTY CART
  // ==========================================================

  if (cart.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-empty">
            <h1>Your cart is empty</h1>

            <p>Add some products to your cart before checking out.</p>

            <Link to="/" className="checkout-back-cart">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <div className="checkout-breadcrumb">
          <Link to="/">Home</Link>

          <span>/</span>

          <Link to="/cart">Cart</Link>

          <span>/</span>

          <span>Checkout</span>
        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="checkout-header">
          <span>SECURE CHECKOUT</span>

          <h1>Complete your order</h1>

          <p>Enter your delivery information and choose your payment method.</p>
        </header>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}

        {/* ==================================================
            LAYOUT
        ================================================== */}

        <div className="checkout-layout">
          {/* =================================================
              LEFT
          ================================================= */}

          <section className="checkout-main">
            {/* =================================================
                DELIVERY
            ================================================= */}

            <div className="checkout-card">
              <div className="checkout-card-header">
                <div className="checkout-step">01</div>

                <div>
                  <span>DELIVERY</span>

                  <h2>Delivery information</h2>
                </div>
              </div>

              <div className="checkout-form">
                {/* NAME */}

                <div className="checkout-field">
                  <label htmlFor="fullName">Full Name</label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={processing}
                  />
                </div>

                {/* EMAIL */}

                <div className="checkout-field">
                  <label htmlFor="email">Email Address</label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={processing}
                  />
                </div>

                {/* PHONE */}

                <div className="checkout-field">
                  <label htmlFor="phone">Mobile Number</label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="tel"
                    disabled={processing}
                  />
                </div>

                {/* ADDRESS */}

                <div className="checkout-field checkout-field-full">
                  <label htmlFor="address">Address</label>

                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="House / Flat / Street / Area"
                    rows={3}
                    autoComplete="street-address"
                    disabled={processing}
                  />
                </div>

                {/* CITY */}

                <div className="checkout-field">
                  <label htmlFor="city">City</label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    autoComplete="address-level2"
                    disabled={processing}
                  />
                </div>

                {/* STATE */}

                <div className="checkout-field">
                  <label htmlFor="state">State</label>

                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="State"
                    autoComplete="address-level1"
                    disabled={processing}
                  />
                </div>

                {/* PIN */}

                <div className="checkout-field">
                  <label htmlFor="pincode">PIN Code</label>

                  <input
                    id="pincode"
                    name="pincode"
                    type="text"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="6-digit PIN"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                PAYMENT
            ================================================= */}

            <div className="checkout-card">
              <div className="checkout-card-header">
                <div className="checkout-step">02</div>

                <div>
                  <span>PAYMENT</span>

                  <h2>Choose payment method</h2>
                </div>
              </div>

              <div className="checkout-payment-options">
                {/* RAZORPAY */}

                <label
                  className={
                    paymentMethod === "razorpay"
                      ? "checkout-payment-option active"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    disabled={processing}
                  />

                  <span className="checkout-radio" />

                  <div>
                    <strong>Online Payment</strong>

                    <small>Pay securely using Razorpay</small>
                  </div>
                </label>

                {/* COD */}

                <label
                  className={
                    paymentMethod === "cod"
                      ? "checkout-payment-option active"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    disabled={processing}
                  />

                  <span className="checkout-radio" />

                  <div>
                    <strong>Cash on Delivery</strong>

                    <small>Pay when your order is delivered</small>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <aside className="checkout-summary">
            <div className="checkout-summary-card">
              <span className="checkout-summary-eyebrow">YOUR ORDER</span>

              <h2>Order Summary</h2>

              {/* ITEMS */}

              <div className="checkout-items">
                {cart.map((item) => {
                  const id = getProductId(item);

                  const image = getProductImage(id);

                  const quantity = Number(item.quantity || 1);

                  const price = Number(item.price || 0);

                  const itemTotal = price * quantity;

                  return (
                    <div
                      className="checkout-item"
                      key={`${id}-${item.cart_item_id || item.id || "item"}`}
                    >
                      <div className="checkout-item-image">
                        {image ? (
                          <img src={image} alt={item.name || "Product"} />
                        ) : (
                          <span>No image</span>
                        )}

                        <small>{quantity}</small>
                      </div>

                      <div className="checkout-item-info">
                        <strong>{item.name || "Product"}</strong>

                        <span>{formatPrice(price)}</span>
                      </div>

                      <strong className="checkout-item-total">
                        {formatPrice(itemTotal)}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="checkout-summary-divider" />

              {/* ITEMS COUNT */}

              <div className="checkout-summary-row">
                <span>Items</span>

                <strong>{totalItems}</strong>
              </div>

              {/* SUBTOTAL */}

              <div className="checkout-summary-row">
                <span>Subtotal</span>

                <strong>{formatPrice(subtotal)}</strong>
              </div>

              {/* DELIVERY */}

              <div className="checkout-summary-row">
                <span>Delivery</span>

                <strong>
                  {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                </strong>
              </div>

              <div className="checkout-summary-divider" />

              {/* TOTAL */}

              <div className="checkout-total">
                <span>Total</span>

                <strong>{formatPrice(total)}</strong>
              </div>

              {/* PAY */}

              <button
                type="button"
                className="checkout-place-order"
                onClick={createOrder}
                disabled={processing || !customerId || cart.length === 0}
              >
                {processing
                  ? "Processing..."
                  : paymentMethod === "cod"
                    ? "Place COD Order"
                    : "Pay Securely"}
              </button>

              {/* BACK */}

              <Link to="/cart" className="checkout-back-cart">
                ← Back to Cart
              </Link>

              {/* SECURITY */}

              <div className="checkout-security">
                <span>🔒</span>

                <p>Your payment information is securely processed.</p>
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

export default Checkout;
