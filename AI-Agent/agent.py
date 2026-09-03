from recommender import (
    get_recommendation,
)

from database import get_connection

from psycopg2.extras import Json


# ============================================================
# AI GUARDRAILS
# ============================================================

MIN_CONFIDENCE = 70


# ============================================================
# ALLOWED ELECTRONICS CATEGORIES
# ============================================================

ALLOWED_CATEGORIES = {

    # Computers

    "Laptop",
    "Mobile",
    "Tablet",
    "Desktop",
    "Computer",
    "Monitor",

    # Accessories

    "Keyboard",
    "Mouse",
    "Charger",
    "Power Bank",
    "SSD",
    "Hard Disk",
    "Webcam",
    "Printer",

    # Audio

    "Speaker",
    "Speakers",
    "Headphones",
    "Earbuds",
    "Soundbar",

    # Entertainment

    "TV",
    "Television",
    "Smart TV",

    # Appliances

    "AC",
    "Air Conditioner",
    "Refrigerator",
    "Fridge",
    "Washing Machine",
    "Microwave",
    "Air Fryer",

    # Home

    "Vacuum Cleaner",
    "Robot Vacuum",
    "Air Purifier",

    # Gaming

    "Gaming",
    "Gaming Laptop",
    "Gaming Console",

    # Camera

    "Camera",
    "DSLR",

    # Wearables

    "Smartwatch",

    # Power

    "UPS",

    # Generic

    "Accessory",

    # New accessory categories

    "AC Accessories",
    "AC Stabilizer",
    "Installation Kit",

    "Refrigerator Accessories",
    "Refrigerator Stabilizer",

    "Washing Machine Accessories",
    "Washing Machine Stand",

    "TV Accessories",
    "Laptop Accessories",
    "Computer Accessories",

    "Camera Accessories",
    "Gaming Accessories",

    "Headphone Accessories",
    "Earbuds Accessories",

    "Air Purifier Accessories",
    "Vacuum Accessories",

    "Kitchen Accessories",
    "Air Fryer Accessories",

    "Replacement Filter",
    "Cleaning Accessories",

    "Memory Card",
    "Tripod",
    "Camera Bag",

    "Wall Mount",
    "HDMI Cable",

    "Laptop Bag",
    "Cooling Pad",

    "Gaming Headset",
    "Gaming Mouse",
    "Gaming Keyboard",

    "Controller",

    "Smartwatch Accessories",
    "Watch Strap",
    "Smartwatch Charger",
    "Screen Protector",

    "Surge Protector",
    "Voltage Stabilizer",

}


# ============================================================
# SAVE AUDIT LOG
# ============================================================

def save_audit_log(
    action,
    input_data,
    decision,
    reason,
    result
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO audit_logs
            (
                agent_action,
                input_data,
                decision,
                reason,
                result
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            );
            """,
            (
                action,
                Json(input_data),
                decision,
                reason,
                result,
            )
        )

        connection.commit()

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# EVALUATE RECOMMENDATION
# ============================================================

def evaluate_recommendation(
    source_product_id
):

    recommendation = get_recommendation(
        source_product_id
    )


    # ========================================================
    # NO RECOMMENDATION
    # ========================================================

    if not recommendation:

        reason = (
            "No suitable electronics "
            "cross-sell recommendation "
            "was found."
        )

        save_audit_log(
            "RECOMMENDATION_CHECK",

            {
                "source_product_id":
                    source_product_id
            },

            "REJECT",

            reason,

            "No recommendation"
        )


        return {

            "decision":
                "REJECT",

            "reason":
                reason,

        }


    # ========================================================
    # EXTRACT DATA
    # ========================================================

    confidence = int(
        recommendation.get(
            "confidence",
            0
        )
    )


    category = (
        recommendation.get(
            "category",
            ""
        )
    )


    source_product = (
        recommendation.get(
            "source_product",
            ""
        )
    )


    recommended_product = (
        recommendation.get(
            "name",
            ""
        )
    )


    purchase_count = (
        recommendation.get(
            "purchase_count",
            0
        )
    )


    total_orders = (
        recommendation.get(
            "total_orders",
            0
        )
    )


    potential_revenue = (
        recommendation.get(
            "potential_additional_revenue",
            0
        )
    )


    # ========================================================
    # AUDIT DATA
    # ========================================================

    audit_input = {

        "source_product_id":
            source_product_id,

        "source_product":
            source_product,

        "recommended_product":
            recommended_product,

        "recommended_category":
            category,

        "confidence":
            confidence,

        "purchase_count":
            purchase_count,

        "total_orders":
            total_orders,

        "potential_additional_revenue":
            potential_revenue,

    }


    # ========================================================
    # GUARDRAIL 1
    # CONFIDENCE
    # ========================================================

    if confidence < MIN_CONFIDENCE:

        reason = (
            f"Recommendation confidence is "
            f"{confidence}%, which is below "
            f"the required {MIN_CONFIDENCE}%."
        )


        save_audit_log(
            "RECOMMENDATION_CHECK",

            audit_input,

            "REJECT",

            reason,

            "Confidence guardrail failed"
        )


        return {

            "decision":
                "REJECT",

            "reason":
                reason,

            "recommendation":
                recommendation,

        }


    # ========================================================
    # GUARDRAIL 2
    # CATEGORY
    # ========================================================

    if category not in ALLOWED_CATEGORIES:

        reason = (
            f"Category '{category}' is not "
            f"allowed for electronics "
            f"cross-selling."
        )


        save_audit_log(
            "RECOMMENDATION_CHECK",

            audit_input,

            "REJECT",

            reason,

            "Category guardrail failed"
        )


        return {

            "decision":
                "REJECT",

            "reason":
                reason,

            "recommendation":
                recommendation,

        }


    # ========================================================
    # GUARDRAILS PASSED
    # ========================================================

    reason = (
        f"{recommended_product} is recommended "
        f"as a complementary product for "
        f"{source_product}. "
        f"The recommendation confidence is "
        f"{confidence}% and the product belongs "
        f"to the allowed electronics category "
        f"'{category}'."
    )


    save_audit_log(
        "RECOMMENDATION_CHECK",

        audit_input,

        "RECOMMEND",

        reason,

        "All AI guardrails passed"
    )


    return {

        "decision":
            "RECOMMEND",

        "reason":
            reason,

        "recommendation":
            recommendation,

    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    result = evaluate_recommendation(
        1
    )


    print()

    print(
        "AI Growth Agent"
    )

    print(
        "========================"
    )


    print(
        f"Decision : "
        f"{result['decision']}"
    )


    print(
        f"Reason   : "
        f"{result['reason']}"
    )


    if "recommendation" in result:

        product = result[
            "recommendation"
        ]


        print()

        print(
            f"Recommended Product : "
            f"{product['name']}"
        )


        print(
            f"Category            : "
            f"{product['category']}"
        )


        print(
            f"Price               : "
            f"₹{product['price']}"
        )


        print(
            f"Confidence          : "
            f"{product['confidence']}%"
        )


        print(
            f"Potential Revenue   : "
            f"₹{product['potential_additional_revenue']}"
        )