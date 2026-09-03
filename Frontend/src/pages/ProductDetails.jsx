// ============================================================
// ELECTRONICS AI
// PRODUCT DETAILS
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import "./ProductDetails.css";

import productImages from "../data/productImages";

// ============================================================
// API
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
// HELPERS
// ============================================================

function getProductId(product) {
  return Number(product?.product_id ?? product?.id ?? 0);
}

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
// LOCAL CART
//
// Used only when the customer isn't logged in.
// ============================================================

function getLocalCart() {
  try {
    const stored = JSON.parse(localStorage.getItem("cart") || "[]");

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored;
  } catch (error) {
    console.error("Unable to read local cart:", error);

    return [];
  }
}

// ============================================================
// SAVE LOCAL CART
// ============================================================

function saveLocalCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));

  window.dispatchEvent(new Event("cartUpdated"));
}

// ============================================================
// PRODUCT NORMALIZATION
// ============================================================

function normalizeProduct(product) {
  const productId = getProductId(product);

  return {
    ...product,

    product_id: productId,

    name: product?.name || product?.product_name || `Product ${productId}`,

    category: product?.category || product?.category_name || "Electronics",

    brand: product?.brand || "",

    description: product?.description || "High-quality electronics product.",

    price: Number(product?.price || 0),

    stock: Number(product?.stock ?? product?.stock_quantity ?? 1),

    image: getProductImage(productId),
  };
}

// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(category) {
  return String(category || "")
    .toLowerCase()
    .trim();
}

// ============================================================
// RECOMMENDATION RULES
// ============================================================

const recommendationRules = {
  laptop: [41, 42, 43, 44, 28],

  laptops: [41, 42, 43, 44, 28],

  mobile: [29, 30, 28, 42],

  mobiles: [29, 30, 28, 42],

  smartphone: [29, 30, 28, 42],

  tablet: [42, 43, 30, 29],

  tablets: [42, 43, 30, 29],

  desktop: [21, 22, 26, 27, 30],

  desktops: [21, 22, 26, 27, 30],

  monitor: [26, 27, 30, 42],

  monitors: [26, 27, 30, 42],

  tv: [39, 40, 28],

  television: [39, 40, 28],

  "washing machine": [37, 30],

  refrigerator: [35, 30],

  ac: [32, 33, 30],

  "air conditioner": [32, 33, 30],

  microwave: [30],

  "air fryer": [30],

  "vacuum cleaner": [30],

  "air purifier": [30],

  headphone: [29, 30],

  headphones: [29, 30],

  earbuds: [29, 30],

  accessory: [30, 26, 27],

  accessories: [30, 26, 27],

  watch: [30, 29],

  watches: [30, 29],

  "smart watch": [30, 29],
};

// ============================================================
// PRODUCT DETAILS
// ============================================================

function ProductDetails() {
  const { productId } = useParams();

  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [product, setProduct] = useState(null);

  const [allProducts, setAllProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [cartMessage, setCartMessage] = useState("");

  const [addingToCart, setAddingToCart] = useState(false);

  // ==========================================================
  // LOAD PRODUCT
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      try {
        setLoading(true);

        setError("");

        const id = Number(productId);

        if (!Number.isInteger(id) || id <= 0) {
          throw new Error("Invalid product ID.");
        }

        // ====================================================
        // PRODUCT API
        // ====================================================

        let response;

        try {
          response = await fetch(`${API_URL}/api/products/${id}`);
        } catch {
          response = null;
        }

        if (response && response.ok) {
          const data = await response.json();

          const productData = data?.product || data;

          if (mounted) {
            setProduct(normalizeProduct(productData));
          }
        } else {
          // ==================================================
          // FALLBACK
          // ==================================================

          let productsResponse;

          try {
            productsResponse = await fetch(`${API_URL}/api/products`);
          } catch {
            productsResponse = null;
          }

          if (productsResponse && productsResponse.ok) {
            const data = await productsResponse.json();

            const products = Array.isArray(data) ? data : data?.products || [];

            const found = products.find((item) => getProductId(item) === id);

            if (!found) {
              throw new Error("Product not found.");
            }

            if (mounted) {
              setProduct(normalizeProduct(found));
            }
          } else {
            throw new Error("Unable to load product.");
          }
        }

        // ====================================================
        // ALL PRODUCTS
        // ====================================================

        try {
          const productsResponse = await fetch(`${API_URL}/api/products`);

          if (productsResponse.ok) {
            const data = await productsResponse.json();

            const products = Array.isArray(data) ? data : data?.products || [];

            if (mounted) {
              setAllProducts(products.map(normalizeProduct));
            }
          }
        } catch (recommendationError) {
          console.warn(
            "Could not load product catalogue:",
            recommendationError,
          );
        }
      } catch (err) {
        console.error("Product loading error:", err);

        if (mounted) {
          setError(err?.message || "Unable to load product.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  // ==========================================================
  // RECOMMENDATIONS
  // ==========================================================

  const recommendations = useMemo(() => {
    if (!product) {
      return [];
    }

    const currentId = getProductId(product);

    const category = normalizeCategory(product.category);

    let recommendedIds = recommendationRules[category] || [];

    if (recommendedIds.length === 0) {
      const matchingKey = Object.keys(recommendationRules).find((key) =>
        category.includes(key),
      );

      if (matchingKey) {
        recommendedIds = recommendationRules[matchingKey];
      }
    }

    let products = allProducts.filter((item) =>
      recommendedIds.includes(getProductId(item)),
    );

    if (products.length === 0) {
      products = recommendedIds.map((id) => ({
        product_id: id,

        name: `Recommended Accessory ${id}`,

        category: "Accessories",

        price: 0,

        image: getProductImage(id),
      }));
    }

    products = products.filter((item) => getProductId(item) !== currentId);

    products = products.filter((item) =>
      Boolean(getProductImage(getProductId(item))),
    );

    const seen = new Set();

    products = products.filter((item) => {
      const id = getProductId(item);

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    });

    return products.slice(0, 5);
  }, [product, allProducts]);

  // ==========================================================
  // ADD TO BACKEND CART
  // ==========================================================

  async function addToServerCart(selectedProduct, selectedQuantity) {
    const customerId = getCustomerId();

    const id = getProductId(selectedProduct);

    if (!customerId) {
      return {
        success: false,

        requiresLogin: true,
      };
    }

    if (!id) {
      throw new Error("Invalid product ID.");
    }

    // ========================================================
    // POST /api/cart
    // ========================================================

    console.log("Adding product to server cart:", {
      customer_id: customerId,

      product_id: id,

      quantity: selectedQuantity,
    });

    const response = await fetch(`${API_URL}/api/cart`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        customer_id: customerId,

        product_id: id,

        quantity: selectedQuantity,
      }),
    });

    const data = await response.json().catch(() => ({}));

    console.log("Add to cart API response:", data);

    if (!response.ok) {
      throw new Error(data?.message || "Unable to add product to cart.");
    }

    // ========================================================
    // SAVE SERVER CART LOCALLY
    // ========================================================

    if (data?.cart?.items) {
      localStorage.setItem("cart", JSON.stringify(data.cart.items));
    }

    window.dispatchEvent(new Event("cartUpdated"));

    return {
      success: true,

      cart: data?.cart || null,
    };
  }

  // ==========================================================
  // ADD TO LOCAL CART
  // ==========================================================

  function addToLocalCart(selectedProduct, selectedQuantity) {
    const id = getProductId(selectedProduct);

    const image = getProductImage(id);

    if (!id) {
      throw new Error("Invalid product ID.");
    }

    const cart = getLocalCart();

    const existingIndex = cart.findIndex(
      (item) => Number(item.product_id) === id,
    );

    if (existingIndex !== -1) {
      const updatedCart = [...cart];

      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],

        quantity:
          Number(updatedCart[existingIndex].quantity || 0) +
          Number(selectedQuantity),

        image,
      };

      saveLocalCart(updatedCart);
    } else {
      cart.push({
        product_id: id,

        name: selectedProduct.name || "Product",

        category: selectedProduct.category || "Electronics",

        brand: selectedProduct.brand || "",

        price: Number(selectedProduct.price || 0),

        quantity: Number(selectedQuantity),

        image,
      });

      saveLocalCart(cart);
    }
  }

  // ==========================================================
  // MAIN ADD TO CART
  // ==========================================================

  async function addToCart(selectedProduct, selectedQuantity = 1) {
    const id = getProductId(selectedProduct);

    if (!id) {
      setCartMessage("Invalid product.");

      return false;
    }

    // ========================================================
    // STOCK VALIDATION
    // ========================================================

    const stock = Number(selectedProduct.stock ?? 1);

    if (stock <= 0) {
      setCartMessage("This product is out of stock.");

      return false;
    }

    if (selectedQuantity > stock) {
      setCartMessage(`Only ${stock} units are available.`);

      return false;
    }

    try {
      setAddingToCart(true);

      setCartMessage("");

      const customerId = getCustomerId();

      // ======================================================
      // LOGGED-IN CUSTOMER
      // ======================================================

      if (customerId) {
        const result = await addToServerCart(selectedProduct, selectedQuantity);

        if (result.requiresLogin) {
          throw new Error(
            "Please login before adding products to your account.",
          );
        }

        setCartMessage(
          `${selectedProduct.name || "Product"} added to your cart.`,
        );
      } else {
        // ====================================================
        // NOT LOGGED IN
        // ====================================================

        addToLocalCart(selectedProduct, selectedQuantity);

        setCartMessage("Product added to cart. Please login before checkout.");
      }

      return true;
    } catch (err) {
      console.error("Add to cart error:", err);

      setCartMessage(err?.message || "Unable to add product to cart.");

      return false;
    } finally {
      setAddingToCart(false);

      setTimeout(() => {
        setCartMessage("");
      }, 3500);
    }
  }

  // ==========================================================
  // MAIN PRODUCT
  // ==========================================================

  async function handleAddToCart() {
    await addToCart(product, quantity);
  }

  // ==========================================================
  // BUY NOW
  // ==========================================================

  async function handleBuyNow() {
    const customerId = getCustomerId();

    // --------------------------------------------------------
    // If not logged in, ask user to login.
    // --------------------------------------------------------

    if (!customerId) {
      navigate("/login", {
        state: {
          from: `/product/${productId}`,
        },
      });

      return;
    }

    const success = await addToCart(product, quantity);

    if (success) {
      navigate("/cart");
    }
  }

  // ==========================================================
  // RECOMMENDATION
  // ==========================================================

  async function handleAddRecommendation(recommendation) {
    await addToCart(recommendation, 1);
  }

  // ==========================================================
  // ADD ALL RECOMMENDATIONS
  // ==========================================================

  async function handleAddAllRecommendations() {
    if (recommendations.length === 0) {
      return;
    }

    const customerId = getCustomerId();

    // --------------------------------------------------------
    // Login required for server cart.
    // --------------------------------------------------------

    if (!customerId) {
      navigate("/login", {
        state: {
          from: `/product/${productId}`,
        },
      });

      return;
    }

    try {
      setAddingToCart(true);

      let addedCount = 0;

      // ------------------------------------------------------
      // Add each recommendation through backend.
      // ------------------------------------------------------

      for (const recommendation of recommendations) {
        try {
          await addToServerCart(recommendation, 1);

          addedCount++;
        } catch (recommendationError) {
          console.error("Recommendation add error:", recommendationError);
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));

      setCartMessage(
        `${addedCount} recommended ${
          addedCount === 1 ? "accessory" : "accessories"
        } added to cart.`,
      );

      setTimeout(() => {
        setCartMessage("");
      }, 3500);
    } catch (err) {
      console.error("Add all recommendations error:", err);

      setCartMessage(err?.message || "Unable to add recommendations.");
    } finally {
      setAddingToCart(false);
    }
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  function decreaseQuantity() {
    setQuantity((previous) => Math.max(1, previous - 1));
  }

  function increaseQuantity() {
    const stock = Number(product?.stock || 10);

    setQuantity((previous) => Math.min(stock, previous + 1));
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

    if (parent.querySelector(".product-image-missing")) {
      return;
    }

    const message = document.createElement("span");

    message.className = "product-image-missing";

    message.textContent = "Image unavailable";

    parent.appendChild(message);
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="product-details-page">
        <div className="product-details-container">
          <div className="product-loading">
            <div className="product-loading-spinner" />

            <p>Loading product...</p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !product) {
    return (
      <main className="product-details-page">
        <div className="product-details-container">
          <div className="product-error">
            <div>!</div>

            <h1>Product not found</h1>

            <p>{error || "The product you are looking for is unavailable."}</p>

            <Link to="/" className="product-error-button">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN IMAGE
  // ==========================================================

  const mainImage = getProductImage(getProductId(product));

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="product-details-page">
      <div className="product-details-container">
        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <div className="product-breadcrumb">
          <Link to="/">Home</Link>

          <span>/</span>

          <span>{product.category}</span>

          <span>/</span>

          <span>Product</span>
        </div>

        {/* ==================================================
            PRODUCT
        ================================================== */}

        <section className="product-main">
          {/* =================================================
              IMAGE
          ================================================= */}

          <div className="product-gallery">
            <div className="product-main-image">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  onError={handleImageError}
                />
              ) : (
                <div className="product-image-missing">Image unavailable</div>
              )}
            </div>
          </div>

          {/* =================================================
              INFORMATION
          ================================================= */}

          <div className="product-information">
            <span className="product-category">{product.category}</span>

            <h1>{product.name}</h1>

            {product.brand && (
              <div className="product-brand">{product.brand}</div>
            )}

            <div className="product-rating">
              <span className="rating-stars">★★★★★</span>

              <span>Highly rated</span>
            </div>

            <div className="product-price">{formatPrice(product.price)}</div>

            <p className="product-description">{product.description}</p>

            {/* ================================================
                STOCK
            ================================================= */}

            <div
              style={{
                marginBottom: "16px",

                fontSize: "13px",

                color: Number(product.stock) > 0 ? "#15803d" : "#dc2626",

                fontWeight: "700",
              }}
            >
              {Number(product.stock) > 0
                ? `${product.stock} available`
                : "Out of stock"}
            </div>

            {/* ================================================
                QUANTITY
            ================================================= */}

            <div className="product-purchase">
              <div className="product-quantity-label">Quantity</div>

              <div className="product-quantity">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={addingToCart}
                >
                  −
                </button>

                <strong>{quantity}</strong>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={addingToCart || Number(product.stock) <= quantity}
                >
                  +
                </button>
              </div>
            </div>

            {/* ================================================
                ACTIONS
            ================================================= */}

            <div className="product-actions">
              <button
                type="button"
                className="product-add-button"
                onClick={handleAddToCart}
                disabled={addingToCart || Number(product.stock) <= 0}
              >
                {addingToCart ? "Adding..." : "Add to Cart"}
              </button>

              <button
                type="button"
                className="product-buy-button"
                onClick={handleBuyNow}
                disabled={addingToCart || Number(product.stock) <= 0}
              >
                Buy Now
              </button>
            </div>

            {/* ================================================
                BENEFITS
            ================================================= */}

            <div className="product-benefits">
              <div>
                <span>✓</span>

                <p>Secure checkout</p>
              </div>

              <div>
                <span>✓</span>

                <p>Quality assured</p>
              </div>

              <div>
                <span>✓</span>

                <p>Fast delivery</p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            CART MESSAGE
        ================================================== */}

        {cartMessage && (
          <div className="product-cart-message">
            <span>✓</span>

            {cartMessage}

            <Link to="/cart">View Cart</Link>
          </div>
        )}

        {/* ==================================================
            RECOMMENDATIONS
        ================================================== */}

        {recommendations.length > 0 && (
          <section className="recommendations-section">
            <div className="recommendations-header">
              <div>
                <span>Complete your setup</span>

                <h2>Recommended Accessories</h2>

                <p>Frequently paired with this product.</p>
              </div>

              <button
                type="button"
                className="add-all-button"
                onClick={handleAddAllRecommendations}
                disabled={addingToCart}
              >
                {addingToCart ? "Adding..." : "Add All Accessories"}
              </button>
            </div>

            <div className="recommendations-grid">
              {recommendations.map((recommendation) => {
                const id = getProductId(recommendation);

                const image = getProductImage(id);

                return (
                  <article className="recommendation-card" key={id}>
                    {/* IMAGE */}

                    <Link
                      to={`/product/${id}`}
                      className="recommendation-image"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={recommendation.name || "Accessory"}
                          onError={handleImageError}
                        />
                      ) : (
                        <span className="product-image-missing">
                          Image unavailable
                        </span>
                      )}
                    </Link>

                    {/* INFO */}

                    <div className="recommendation-info">
                      <span>{recommendation.category || "Accessory"}</span>

                      <Link
                        to={`/product/${id}`}
                        className="recommendation-name"
                      >
                        {recommendation.name || `Accessory ${id}`}
                      </Link>

                      <div className="recommendation-bottom">
                        <strong>
                          {Number(recommendation.price) > 0
                            ? formatPrice(recommendation.price)
                            : "View Price"}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            handleAddRecommendation(recommendation)
                          }
                          disabled={addingToCart}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ==================================================
            BACK
        ================================================== */}

        <div className="product-back">
          <Link to="/">← Continue Shopping</Link>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default ProductDetails;
