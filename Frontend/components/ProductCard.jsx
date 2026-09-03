import { useNavigate } from "react-router-dom";

function ProductCard({ product }) {
  const navigate = useNavigate();

  const handleViewProduct = () => {
    navigate(`/product/${product.product_id}`);
  };

  return (
    <div className="product-card">
      {/* ==================================================
                IMAGE
            ================================================== */}

      <div className="product-image-wrapper" onClick={handleViewProduct}>
        <img src={product.image} alt={product.name} className="product-image" />
      </div>

      {/* ==================================================
                PRODUCT INFORMATION
            ================================================== */}

      <div className="product-content">
        <span className="product-category">{product.category}</span>

        <h3>{product.name}</h3>

        <p className="product-brand">{product.brand}</p>

        <div className="product-price">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </div>

        {/* ==================================================
                    VIEW PRODUCT
                ================================================== */}

        <button className="view-product-button" onClick={handleViewProduct}>
          View Product
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
