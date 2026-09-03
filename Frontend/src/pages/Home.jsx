// ============================================================
// ELECTRONICS AI
// HOME PAGE
// ============================================================

import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import AgentChat from "../components/AgentChat";

import productImages from "../data/productImages";

import "./Home.css";

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// FORMAT PRICE
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
// PRODUCT ID
// ============================================================

function getProductId(product) {
  return Number(product?.product_id ?? product?.id ?? 0);
}

// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId() {
  const customerId = Number(localStorage.getItem("customer_id"));

  if (Number.isInteger(customerId) && customerId > 0) {
    return customerId;
  }

  return null;
}

// ============================================================
// PRODUCT IMAGE
// ============================================================

function getProductImage(product) {
  const productId = getProductId(product);

  return (
    productImages[productId] ||
    product?.image_url ||
    product?.image ||
    product?.imageUrl ||
    null
  );
}

// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(category) {
  if (!category) {
    return "";
  }

  return String(category).trim().toLowerCase();
}

// ============================================================
// HOME
// ============================================================

function Home() {
  const navigate = useNavigate();

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // SEARCH
  // ==========================================================

  const [searchTerm, setSearchTerm] = useState("");

  // ==========================================================
  // CATEGORY
  // ==========================================================

  const [selectedCategory, setSelectedCategory] = useState("All");

  // ==========================================================
  // CUSTOMER
  // ==========================================================

  const [customer, setCustomer] = useState(null);

  // ==========================================================
  // CART COUNT
  // ==========================================================

  const [cartCount, setCartCount] = useState(0);

  // ==========================================================
  // ADDING PRODUCT
  // ==========================================================

  const [addingProductId, setAddingProductId] = useState(null);

  // ==========================================================
  // CART MESSAGE
  // ==========================================================

  const [cartMessage, setCartMessage] = useState("");

  // ==========================================================
  // LOAD CUSTOMER
  // ==========================================================

  useEffect(() => {
    function loadCustomer() {
      const customerId = getCustomerId();

      const storedCustomer = localStorage.getItem("customer");

      if (customerId) {
        if (storedCustomer) {
          try {
            const parsedCustomer = JSON.parse(storedCustomer);

            setCustomer(parsedCustomer);
          } catch (error) {
            console.error("Customer data error:", error);

            setCustomer({
              customer_id: customerId,
            });
          }
        } else {
          setCustomer({
            customer_id: customerId,
          });
        }
      } else {
        setCustomer(null);
      }
    }

    loadCustomer();

    window.addEventListener("storage", loadCustomer);

    window.addEventListener("customerUpdated", loadCustomer);

    return () => {
      window.removeEventListener("storage", loadCustomer);

      window.removeEventListener("customerUpdated", loadCustomer);
    };
  }, []);

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        setError("");

        const response = await fetch(`${API_BASE_URL}/api/products`);

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to load products.");
        }

        let result = data.products || data.data || data;

        if (!Array.isArray(result)) {
          result = [];
        }

        setProducts(result);
      } catch (err) {
        console.error("Products loading error:", err);

        setError(err.message || "Unable to load products.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // ==========================================================
  // LOAD CART COUNT
  // ==========================================================

  useEffect(() => {
    async function loadCartCount() {
      const customerId = getCustomerId();

      if (!customerId) {
        setCartCount(0);

        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/cart/${customerId}`);

        if (!response.ok) {
          setCartCount(0);

          return;
        }

        const data = await response.json().catch(() => ({}));

        const cart = data.cart || data.data || data;

        const items = cart.items || data.items || [];

        if (Array.isArray(items)) {
          const count = items.reduce(
            (total, item) => total + Number(item.quantity || 1),
            0,
          );

          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch (err) {
        console.error("Cart count error:", err);

        setCartCount(0);
      }
    }

    loadCartCount();

    window.addEventListener("cartUpdated", loadCartCount);

    return () => {
      window.removeEventListener("cartUpdated", loadCartCount);
    };
  }, [customer]);

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const categories = useMemo(() => {
    const uniqueCategories = new Set();

    products.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(String(product.category).trim());
      }
    });

    return ["All", ...Array.from(uniqueCategories)];
  }, [products]);

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();

      const brand = String(product.brand || "").toLowerCase();

      const category = normalizeCategory(product.category);

      const description = String(product.description || "").toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        brand.includes(search) ||
        category.includes(search) ||
        description.includes(search);

      const matchesCategory =
        selectedCategory === "All" ||
        category === normalizeCategory(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // ==========================================================
  // ADD PRODUCT TO CART
  // ==========================================================

  async function handleAddToCart(product) {
    const customerId = getCustomerId();

    const productId = getProductId(product);

    if (!productId) {
      setCartMessage("Invalid product.");

      return;
    }

    // --------------------------------------------------------
    // LOGIN REQUIRED
    // --------------------------------------------------------

    if (!customerId) {
      navigate("/login", {
        state: {
          from: `/product/${productId}`,
        },
      });

      return;
    }

    // --------------------------------------------------------
    // STOCK CHECK
    // --------------------------------------------------------

    const stock = Number(product.stock ?? 1);

    if (Number.isFinite(stock) && stock <= 0) {
      setCartMessage("This product is out of stock.");

      return;
    }

    try {
      setAddingProductId(productId);

      setCartMessage("");

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
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
        throw new Error(data?.message || "Unable to add product to cart.");
      }

      // ------------------------------------------------------
      // SYNCHRONIZE CART
      // ------------------------------------------------------

      const returnedCart = data?.cart || data?.data?.cart || null;

      if (returnedCart && Array.isArray(returnedCart.items)) {
        localStorage.setItem("cart", JSON.stringify(returnedCart.items));

        const newCount = returnedCart.items.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0,
        );

        setCartCount(newCount);
      } else {
        await loadCartCountFromServer(customerId);
      }

      // ------------------------------------------------------
      // NOTIFY OTHER COMPONENTS
      // ------------------------------------------------------

      window.dispatchEvent(new Event("cartUpdated"));

      setCartMessage(`${product.name || "Product"} added to cart.`);

      setTimeout(() => {
        setCartMessage("");
      }, 3000);
    } catch (err) {
      console.error("Add to cart error:", err);

      setCartMessage(err.message || "Unable to add product to cart.");
    } finally {
      setAddingProductId(null);
    }
  }

  // ==========================================================
  // LOAD CART COUNT FROM SERVER
  // ==========================================================

  async function loadCartCountFromServer(customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${customerId}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      const cart = data.cart || data.data || data;

      const items = cart.items || data.items || [];

      if (Array.isArray(items)) {
        const count = items.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0,
        );

        setCartCount(count);
      }
    } catch (err) {
      console.error("Reload cart count error:", err);
    }
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  function handleLogout() {
    localStorage.removeItem("customer_id");

    localStorage.removeItem("customer");

    localStorage.removeItem("isLoggedIn");

    setCustomer(null);

    setCartCount(0);

    setCartMessage("");

    navigate("/");
  }

  // ==========================================================
  // PRODUCT DETAILS PATH
  // ==========================================================

  function getProductDetailsPath(product) {
    const productId = getProductId(product);

    return `/product/${productId}`;
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="home-page">
        <header className="home-header">
          <div className="home-header-inner">
            <Link to="/" className="home-logo">
              Electronics AI
            </Link>

            {/* ==================================================
                LOADING PAGE NAVIGATION
            ================================================== */}

            <nav className="home-nav">
              <Link to="/">Home</Link>

              <Link to="/ai-commerce">AI Analytics</Link>
            </nav>
          </div>
        </header>

        <section className="home-loading">
          <div className="home-spinner" />

          <h2>Loading electronics...</h2>

          <p>Preparing your shopping experience.</p>
        </section>

        <AgentChat />
      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="home-page">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="home-header">
        <div className="home-header-inner">
          {/* BRAND */}

          <Link to="/" className="home-logo">
            Electronics AI
          </Link>

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <nav className="home-nav">
            <Link to="/">Home</Link>

            <a href="#products">Products</a>

            <a href="#categories">Categories</a>

            {/* ==================================================
                AI ANALYTICS
            ================================================== */}

            <Link to="/ai-commerce" className="home-ai-analytics-link">
              AI Analytics
            </Link>
          </nav>

          {/* ACCOUNT */}

          <div className="home-actions">
            {customer ? (
              <>
                <span className="home-welcome">
                  Hi, {customer.name || "Customer"}
                </span>

                <Link to="/orders" className="home-orders-link">
                  My Orders
                </Link>

                <button
                  type="button"
                  className="home-logout-button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="home-login-button">
                  Login
                </Link>

                <Link to="/register" className="home-register-button">
                  Create Account
                </Link>
              </>
            )}

            {/* CART */}

            <Link to="/cart" className="home-cart-button">
              <span>🛒</span>

              <span>Cart</span>

              {cartCount > 0 && (
                <span className="home-cart-count">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ====================================================
          CART MESSAGE
      ==================================================== */}

      {cartMessage && (
        <div className="home-cart-message">
          <span>{cartMessage.includes("added") ? "✓" : "⚠️"}</span>

          <span>{cartMessage}</span>

          {cartMessage.includes("added") && <Link to="/cart">View Cart</Link>}
        </div>
      )}

      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <span className="home-eyebrow">SMART ELECTRONICS STORE</span>

            <h1>
              Everything you need,
              <br />
              all in one place.
            </h1>

            <p>
              Discover laptops, mobiles, TVs, appliances, accessories and more
              at great prices.
            </p>

            <div className="home-hero-buttons">
              <a href="#products" className="home-primary-button">
                Shop Electronics
                <span>→</span>
              </a>

              <button
                type="button"
                className="home-secondary-button"
                onClick={() => {
                  const event = new CustomEvent("openAIAssistant");

                  window.dispatchEvent(event);
                }}
              >
                Ask AI
              </button>

              {!customer && (
                <Link to="/register" className="home-secondary-button">
                  Create Account
                </Link>
              )}
            </div>
          </div>

          <div className="home-hero-stats">
            <div>
              <strong>{products.length}+</strong>

              <span>Products</span>
            </div>

            <div>
              <strong>{Math.max(categories.length - 1, 0)}+</strong>

              <span>Categories</span>
            </div>

            <div>
              <strong>AI</strong>

              <span>Recommendations</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          SEARCH
      ==================================================== */}

      <section className="home-shopping">
        <div className="home-search-wrapper">
          <span className="home-search-icon">🔍</span>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search laptops, mobiles, ACs, TVs..."
            aria-label="Search products"
          />

          {searchTerm && (
            <button
              type="button"
              className="home-search-clear"
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* ====================================================
          CATEGORIES
      ==================================================== */}

      <section id="categories" className="home-categories-section">
        <div className="home-section-heading">
          <span>BROWSE</span>

          <h2>Shop by Category</h2>
        </div>

        <div className="home-category-list">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "home-category active"
                  : "home-category"
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* ====================================================
          PRODUCTS
      ==================================================== */}

      <section id="products" className="home-products-section">
        <div className="home-products-heading">
          <div>
            <span>PRODUCTS</span>

            <h2>
              {selectedCategory === "All"
                ? "All Electronics"
                : selectedCategory}
            </h2>
          </div>

          <div className="home-product-count">
            {filteredProducts.length} products
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="home-error">
            <strong>Unable to load products</strong>

            <p>{error}</p>

            <button type="button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!error && filteredProducts.length === 0 && (
          <div className="home-empty">
            <div className="home-empty-icon">🔎</div>

            <h3>No products found</h3>

            <p>Try another search term or category.</p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");

                setSelectedCategory("All");
              }}
            >
              View All Products
            </button>
          </div>
        )}

        {/* PRODUCT GRID */}

        {filteredProducts.length > 0 && (
          <div className="home-product-grid">
            {filteredProducts.map((product) => {
              const productId = getProductId(product);

              const image = getProductImage(product);

              const detailsPath = getProductDetailsPath(product);

              const stock = Number(product.stock ?? 1);

              const outOfStock = Number.isFinite(stock) && stock <= 0;

              const isAdding = addingProductId === productId;

              return (
                <article className="home-product-card" key={productId}>
                  {/* IMAGE */}

                  <Link to={detailsPath} className="home-product-image">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Product"}
                        loading="lazy"
                      />
                    ) : (
                      <div className="home-image-unavailable">
                        <span>Image unavailable</span>
                      </div>
                    )}
                  </Link>

                  {/* DETAILS */}

                  <div className="home-product-content">
                    <div className="home-product-category">
                      {product.category || "ELECTRONICS"}
                    </div>

                    <Link to={detailsPath} className="home-product-name">
                      {product.name}
                    </Link>

                    <div className="home-product-brand">
                      {product.brand || "Brand"}
                    </div>

                    {product.description && (
                      <p className="home-product-description">
                        {product.description}
                      </p>
                    )}

                    {/* STOCK */}

                    <div
                      style={{
                        marginTop: "8px",

                        marginBottom: "8px",

                        fontSize: "12px",

                        fontWeight: "700",

                        color: outOfStock ? "#dc2626" : "#15803d",
                      }}
                    >
                      {outOfStock ? "Out of stock" : `${stock} available`}
                    </div>

                    {/* BOTTOM */}

                    <div className="home-product-bottom">
                      <strong className="home-product-price">
                        {formatPrice(product.price)}
                      </strong>

                      <div
                        style={{
                          display: "flex",

                          gap: "8px",

                          alignItems: "center",

                          flexWrap: "wrap",
                        }}
                      >
                        {/* VIEW */}

                        <Link to={detailsPath} className="home-view-button">
                          View
                          <span>→</span>
                        </Link>

                        {/* ADD TO CART */}

                        <button
                          type="button"
                          className="home-add-cart-button"
                          onClick={() => handleAddToCart(product)}
                          disabled={isAdding || outOfStock}
                        >
                          {isAdding ? "Adding..." : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================
          FOOTER
      ==================================================== */}

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div>
            <div className="home-footer-logo">Electronics AI</div>

            <p>Smart electronics shopping powered by AI.</p>
          </div>

          <div className="home-footer-links">
            <Link to="/">Home</Link>

            <a href="#products">Products</a>

            <a href="#categories">Categories</a>

            <Link to="/cart">Cart</Link>

            <Link to="/orders">Orders</Link>

            {/* ==================================================
                AI ANALYTICS FOOTER LINK
            ================================================== */}

            <Link to="/ai-commerce">AI Analytics</Link>

            {customer ? (
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <>
                <Link to="/login">Login</Link>

                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>

        <div className="home-footer-bottom">
          © {new Date().getFullYear()} Electronics AI. All rights reserved.
        </div>
      </footer>

      {/* ====================================================
          FLOATING AI ASSISTANT
      ==================================================== */}

      <AgentChat />
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Home;
