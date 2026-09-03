from fastapi import FastAPI, HTTPException

from recommender import get_recommendations


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Electronics AI Agent",
    version="2.0.0",
    description=(
        "AI-powered electronics cross-sell "
        "recommendation engine focused on "
        "increasing transaction value."
    )
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "service": "Electronics AI Agent",
        "version": "2.0.0",
        "message": (
            "AI recommendation engine is running"
        )
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "success": True,
        "service": "electronics-ai-agent",
        "status": "healthy"
    }


# ============================================================
# GET MULTIPLE RECOMMENDATIONS
#
# GET /recommendations/{product_id}
#
# Example:
# GET /recommendations/1
#
# Returns up to 4 related electronics products.
# ============================================================

@app.get(
    "/recommendations/{product_id}"
)
def recommendations(
    product_id: int
):

    # --------------------------------------------------------
    # VALIDATE PRODUCT ID
    # --------------------------------------------------------

    if product_id <= 0:

        raise HTTPException(
            status_code=400,
            detail="Product ID must be greater than 0"
        )


    # --------------------------------------------------------
    # GET RECOMMENDATIONS
    # --------------------------------------------------------

    try:

        result = get_recommendations(
            source_product_id=product_id,
            limit=4
        )

    except Exception as error:

        print(
            "Recommendation engine error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate "
                "recommendations"
            )
        )


    # --------------------------------------------------------
    # SOURCE PRODUCT NOT FOUND
    # --------------------------------------------------------

    if result is None:

        raise HTTPException(
            status_code=404,
            detail="Source product not found"
        )


    # --------------------------------------------------------
    # SOURCE PRODUCT
    # --------------------------------------------------------

    source_product = (
        result.get(
            "source_product"
        )
    )


    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    recommendations_list = (
        result.get(
            "recommendations",
            []
        )
    )


    # --------------------------------------------------------
    # POTENTIAL REVENUE
    # --------------------------------------------------------

    potential_revenue = (
        result.get(
            "potential_additional_revenue",
            0
        )
    )


    # --------------------------------------------------------
    # NO RECOMMENDATIONS
    # --------------------------------------------------------

    if not recommendations_list:

        return {

            "success": True,

            "decision": "REJECT",

            "message": (
                "No suitable related "
                "products were found."
            ),

            "source_product":
                source_product,

            "recommendations": [],

            "recommendation_count":
                0,

            "potential_additional_revenue":
                0

        }


    # --------------------------------------------------------
    # CALCULATE SELECTABLE REVENUE
    # --------------------------------------------------------

    recommendation_revenue = 0

    for product in recommendations_list:

        recommendation_revenue += float(
            product.get(
                "price",
                0
            )
        )


    # --------------------------------------------------------
    # RETURN SUCCESS
    # --------------------------------------------------------

    return {

        "success": True,

        "decision": "RECOMMEND",

        "source_product":
            source_product,

        "recommendations":
            recommendations_list,

        "recommendation_count":
            len(
                recommendations_list
            ),

        "potential_additional_revenue":
            round(
                float(
                    potential_revenue
                ),
                2
            ),

        "recommendation_value":
            round(
                recommendation_revenue,
                2
            ),

        "revenue_opportunity":
            (
                "AI identified related "
                "products that may increase "
                "the customer's order value."
            )

    }


# ============================================================
# SINGLE RECOMMENDATION
#
# BACKWARD COMPATIBILITY
#
# GET /recommendation/{product_id}
# ============================================================

@app.get(
    "/recommendation/{product_id}"
)
def recommendation(
    product_id: int
):

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    if product_id <= 0:

        raise HTTPException(
            status_code=400,
            detail="Product ID must be greater than 0"
        )


    # --------------------------------------------------------
    # GET ONE RECOMMENDATION
    # --------------------------------------------------------

    try:

        result = get_recommendations(
            source_product_id=product_id,
            limit=1
        )

    except Exception as error:

        print(
            "Single recommendation error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate "
                "recommendation"
            )
        )


    # --------------------------------------------------------
    # PRODUCT NOT FOUND
    # --------------------------------------------------------

    if result is None:

        raise HTTPException(
            status_code=404,
            detail="Source product not found"
        )


    recommendations_list = (
        result.get(
            "recommendations",
            []
        )
    )


    # --------------------------------------------------------
    # NO RECOMMENDATION
    # --------------------------------------------------------

    if not recommendations_list:

        return {

            "success": True,

            "decision": "REJECT",

            "reason": (
                "No suitable "
                "recommendation found."
            ),

            "recommendation":
                None

        }


    # --------------------------------------------------------
    # FIRST RECOMMENDATION
    # --------------------------------------------------------

    recommendation_data = (
        recommendations_list[0]
    )


    return {

        "success": True,

        "decision": "RECOMMEND",

        "recommendation":
            recommendation_data

    }


# ============================================================
# TEST ENDPOINT
# ============================================================

@app.get("/test")
def test():

    return {

        "success": True,

        "message": (
            "Electronics AI recommendation "
            "API is working"
        ),

        "available_endpoints": [

            "/",

            "/health",

            "/test",

            "/recommendations/{product_id}",

            "/recommendation/{product_id}"

        ]

    }


# ============================================================
# AI RECOMMENDATION SYSTEM INFORMATION
# ============================================================

@app.get("/info")
def info():

    return {

        "success": True,

        "system": {
            "name":
                "Electronics AI Cross-Sell Engine",

            "version":
                "2.0.0",

            "purpose":
                (
                    "Recommend complementary "
                    "electronics products "
                    "to increase order value."
                )
        },

        "strategy": {

            "source":
                "Customer-selected product",

            "recommendation_type":
                "Complementary products",

            "max_recommendations":
                4,

            "customer_control":
                True,

            "automatic_cart_addition":
                False

        },

        "business_goal": {

            "primary":
                "Increase average order value",

            "secondary":
                "Increase cross-sell revenue",

            "measurement":
                "AI-attributed revenue"

        }

    }