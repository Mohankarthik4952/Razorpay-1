function RecommendationCard({ product, selected, onToggle }) {
  return (
    <div
      className={`recommendation-card ${
        selected ? "recommendation-selected" : ""
      }`}
      onClick={() => onToggle(product)}
    >
      {/* ==================================================
                CHECKBOX
            ================================================== */}

      <div className="recommendation-check">
        <div className={selected ? "check checked" : "check"}>
          {selected && "✓"}
        </div>
      </div>

      {/* ==================================================
                PRODUCT ICON
            ================================================== */}

      <div className="recommendation-image">
        <img
          src={product.image || "/images/electronics.jpg"}
          alt={product.name}
        />
      </div>

      {/* ==================================================
                PRODUCT DETAILS
            ================================================== */}

      <div className="recommendation-content">
        <span className="recommendation-category">{product.category}</span>

        <h3>{product.name}</h3>

        <div className="recommendation-price">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </div>

        {/* ==================================================
                    CONFIDENCE
                ================================================== */}

        {Number(product.confidence) > 0 && (
          <div className="confidence">
            <span>AI Match</span>

            <strong>{product.confidence}%</strong>
          </div>
        )}

        <p className="recommendation-reason">{product.reason}</p>
      </div>

      {/* ==================================================
                ADD INDICATOR
            ================================================== */}

      <div className="recommendation-action">
        {selected ? "✓ Added" : "+ Add"}
      </div>
    </div>
  );
}

export default RecommendationCard;
