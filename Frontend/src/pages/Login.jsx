import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import "./Login.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// LOGIN
// ============================================================

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================================
  // STATE
  // ==========================================================

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    const cleanPhone = phone.trim();

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!cleanEmail) {
      setError("Please enter your email address.");

      return;
    }

    if (!cleanPhone) {
      setError("Please enter your mobile number.");

      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number.");

      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // API
      // ======================================================

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: cleanEmail,
          phone: cleanPhone,
        }),
      });

      const data = await response.json().catch(() => ({}));

      // ======================================================
      // ERROR
      // ======================================================

      if (!response.ok) {
        throw new Error(data.message || "Unable to login.");
      }

      // ======================================================
      // CUSTOMER
      // ======================================================

      const customer = data.customer;

      if (!customer) {
        throw new Error("Customer information was not returned by the server.");
      }

      // ======================================================
      // CUSTOMER ID
      // ======================================================

      const customerId = Number(customer.customer_id);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        console.error("Invalid customer:", customer);

        throw new Error("Invalid customer account ID.");
      }

      // ======================================================
      // SAVE CUSTOMER ID
      // ======================================================

      localStorage.setItem("customer_id", String(customerId));

      // ======================================================
      // SAVE CUSTOMER
      // ======================================================

      localStorage.setItem("customer", JSON.stringify(customer));

      // ======================================================
      // LOGIN FLAG
      // ======================================================

      localStorage.setItem("isLoggedIn", "true");

      // ======================================================
      // DEBUG
      // ======================================================

      console.log("Login successful");

      console.log("Customer ID:", customerId);

      console.log("Customer:", customer);

      // ======================================================
      // REDIRECT
      // ======================================================

      const redirectPath = location.state?.from || "/";

      navigate(redirectPath, {
        replace: true,
      });
    } catch (err) {
      console.error("Login error:", err);

      setError(err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="login-page">
      <section className="login-card">
        {/* ==================================================
            BRAND
        ================================================== */}

        <div className="login-brand">
          <div className="login-brand-icon">EA</div>

          <div>
            <div className="login-brand-name">Electronics AI</div>

            <div className="login-brand-subtitle">Intelligent Shopping</div>
          </div>
        </div>

        {/* ==================================================
            HEADING
        ================================================== */}

        <div className="login-heading">
          <span className="login-eyebrow">WELCOME BACK</span>

          <h1>Sign in to your account</h1>

          <p>Login to access your cart, orders and AI recommendations.</p>
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="login-error" role="alert">
            <span className="login-error-icon">!</span>

            <span>{error}</span>
          </div>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <form className="login-form" onSubmit={handleLogin}>
          {/* ==================================================
              EMAIL
          ================================================== */}

          <div className="login-field">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          {/* ==================================================
              MOBILE
          ================================================== */}

          <div className="login-field">
            <label htmlFor="phone">Mobile Number</label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setPhone(value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="10-digit mobile number"
              autoComplete="tel"
              inputMode="numeric"
              disabled={loading}
              maxLength={10}
              required
            />
          </div>

          {/* ==================================================
              LOGIN BUTTON
          ================================================== */}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* ==================================================
            ACCOUNT INFO
        ================================================== */}

        <div className="login-info">
          Use the email address and mobile number registered with your account.
        </div>

        {/* ==================================================
            HOME
        ================================================== */}

        <Link to="/" className="login-home">
          ← Continue Shopping
        </Link>
      </section>

      {/* ====================================================
          FOOTER
      ==================================================== */}

      <div className="login-footer">
        Secure shopping · AI-powered recommendations
      </div>
    </main>
  );
}

export default Login;
