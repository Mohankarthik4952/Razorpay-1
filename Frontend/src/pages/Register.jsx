import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "./Register.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Phone number must contain 10 digits.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          phone: phone || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create your account.");
      }

      const customer = data.customer || data.data?.customer || data.data;

      const customerId = Number(customer?.customer_id || data.customer_id);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new Error(
          "Registration succeeded, but customer ID was not returned by the server.",
        );
      }

      // ======================================================
      // SAVE CUSTOMER SESSION
      // ======================================================

      localStorage.setItem("customer_id", String(customerId));

      localStorage.setItem(
        "customer",
        JSON.stringify(
          customer || {
            customer_id: customerId,
            name,
            email,
            phone,
          },
        ),
      );

      localStorage.setItem("isLoggedIn", "true");

      window.dispatchEvent(new Event("storage"));

      window.dispatchEvent(new Event("customerUpdated"));

      setSuccess("Account created successfully.");

      // ======================================================
      // RETURN TO ORIGINAL PAGE
      // ======================================================

      const destination = location.state?.from || "/";

      setTimeout(() => {
        navigate(destination, {
          replace: true,
        });
      }, 500);
    } catch (err) {
      console.error("Registration error:", err);

      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          Electronics AI
        </Link>

        <div className="auth-heading">
          <span>CREATE ACCOUNT</span>

          <h1>Join Electronics AI</h1>

          <p>Create your customer account to continue shopping.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {success && <div className="auth-success">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="name">Full Name</label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Mobile Number</label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              autoComplete="tel"
              maxLength={10}
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">Already have an account?</div>

        <Link
          to="/login"
          state={location.state}
          className="auth-secondary-button"
        >
          Login
        </Link>

        <Link to="/" className="auth-back">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

export default Register;
