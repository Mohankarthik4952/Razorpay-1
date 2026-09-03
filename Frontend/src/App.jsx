// ============================================================
// ELECTRONICS AI
// APP ROUTER
// ============================================================

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useEffect } from "react";

// ============================================================
// PAGES
// ============================================================

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import AiCommerceDashboard from "./pages/AiCommerceDashboard";

// AUTHENTICATION
import Login from "./pages/Login";
import Register from "./pages/Register";

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        {/* ==================================================
            HOME
        ================================================== */}

        <Route path="/" element={<Home />} />

        {/* ==================================================
            AUTHENTICATION
        ================================================== */}

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* ==================================================
            PRODUCTS
        ================================================== */}

        <Route path="/product/:productId" element={<ProductDetails />} />

        {/* ==================================================
            CART
        ================================================== */}

        <Route path="/cart" element={<Cart />} />

        {/* ==================================================
            CHECKOUT
        ================================================== */}

        <Route path="/checkout" element={<Checkout />} />

        {/* ==================================================
            PAYMENT SUCCESS
        ================================================== */}

        <Route path="/payment-success" element={<PaymentSuccess />} />

        <Route path="/ai-commerce" element={<AiCommerceDashboard />} />

        {/* ==================================================
            ORDERS
        ================================================== */}

        <Route path="/orders" element={<Orders />} />

        <Route path="/orders/:orderId" element={<OrderDetails />} />

        {/* ==================================================
            404
        ================================================== */}

        <Route path="/404" element={<NotFound />} />

        {/* ==================================================
            UNKNOWN ROUTES
        ================================================== */}

        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// SCROLL TO TOP
// ============================================================

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [location.pathname]);

  return null;
}

// ============================================================
// 404 PAGE
// ============================================================

function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",

        display: "flex",
        flexDirection: "column",

        alignItems: "center",
        justifyContent: "center",

        background: "#f6f7f9",

        padding: "24px",

        textAlign: "center",

        boxSizing: "border-box",

        position: "relative",
      }}
    >
      {/* ==================================================
          BRAND
      ================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",

          gap: "10px",

          marginBottom: "45px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            background: "#111827",

            color: "#ffffff",

            borderRadius: "11px",

            fontSize: "13px",
            fontWeight: "900",

            letterSpacing: "-0.03em",
          }}
        >
          EA
        </div>

        <div
          style={{
            textAlign: "left",
          }}
        >
          <div
            style={{
              color: "#172033",

              fontSize: "15px",

              fontWeight: "800",

              lineHeight: "1.1",
            }}
          >
            Electronics AI
          </div>

          <div
            style={{
              marginTop: "3px",

              color: "#94a3b8",

              fontSize: "9px",

              fontWeight: "800",

              letterSpacing: "0.12em",

              textTransform: "uppercase",
            }}
          >
            Intelligent Shopping
          </div>
        </div>
      </div>

      {/* ==================================================
          ERROR CODE
      ================================================== */}

      <div
        style={{
          color: "#111827",

          fontSize: "clamp(80px, 15vw, 150px)",

          lineHeight: "0.85",

          fontWeight: "900",

          letterSpacing: "-0.08em",

          marginBottom: "24px",
        }}
      >
        404
      </div>

      {/* ==================================================
          TITLE
      ================================================== */}

      <h1
        style={{
          margin: "0 0 10px",

          color: "#172033",

          fontSize: "clamp(24px, 4vw, 34px)",

          lineHeight: "1.15",

          fontWeight: "800",

          letterSpacing: "-0.04em",
        }}
      >
        Page not found
      </h1>

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      <p
        style={{
          maxWidth: "440px",

          margin: "0 0 28px",

          color: "#64748b",

          fontSize: "14px",

          lineHeight: "1.7",
        }}
      >
        The page you're looking for doesn't exist, may have been moved, or the
        link may be incorrect.
      </p>

      {/* ==================================================
          HOME BUTTON
      ================================================== */}

      <button
        type="button"
        onClick={() => {
          window.location.href = "/";
        }}
        style={{
          display: "inline-flex",

          alignItems: "center",

          justifyContent: "center",

          gap: "10px",

          minHeight: "48px",

          padding: "0 22px",

          border: "none",

          borderRadius: "10px",

          background: "#111827",

          color: "#ffffff",

          cursor: "pointer",

          fontSize: "13px",

          fontWeight: "800",

          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",

          transition: "transform 0.2s ease, background 0.2s ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "#020617";

          event.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "#111827";

          event.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <span
          style={{
            fontSize: "17px",

            lineHeight: "1",
          }}
        >
          ←
        </span>
        Back to Home
      </button>

      {/* ==================================================
          FOOTER MESSAGE
      ================================================== */}

      <div
        style={{
          position: "absolute",

          bottom: "24px",

          color: "#94a3b8",

          fontSize: "10px",

          fontWeight: "600",

          letterSpacing: "0.04em",
        }}
      >
        AI-powered electronics shopping
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default App;
