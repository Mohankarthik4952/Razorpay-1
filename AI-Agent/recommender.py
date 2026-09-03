from decimal import Decimal
from typing import Optional

from psycopg2.extras import RealDictCursor

from database import get_connection


# ============================================================
# CATEGORY RELATIONSHIPS
# ============================================================

CATEGORY_RELATIONSHIPS = {

    # ========================================================
    # MOBILE
    # ========================================================

    "mobile": [
        "mobile accessories",
        "charger",
        "power bank",
        "earbuds",
        "headphones",
    ],

    "smartphone": [
        "mobile accessories",
        "charger",
        "power bank",
        "earbuds",
        "headphones",
    ],


    # ========================================================
    # LAPTOP
    # ========================================================

    "laptop": [
        "laptop accessories",
        "mouse",
        "keyboard",
        "laptop bag",
        "cooling pad",
        "headphones",
    ],

    "notebook": [
        "laptop accessories",
        "mouse",
        "keyboard",
        "laptop bag",
        "cooling pad",
    ],


    # ========================================================
    # DESKTOP
    # ========================================================

    "desktop": [
        "computer accessories",
        "mouse",
        "keyboard",
        "monitor",
        "webcam",
        "ups",
    ],

    "computer": [
        "computer accessories",
        "mouse",
        "keyboard",
        "monitor",
        "webcam",
        "ups",
    ],


    # ========================================================
    # MONITOR
    # ========================================================

    "monitor": [
        "keyboard",
        "mouse",
        "webcam",
        "speakers",
        "computer accessories",
    ],


    # ========================================================
    # TABLET
    # ========================================================

    "tablet": [
        "tablet accessories",
        "charger",
        "power bank",
        "earbuds",
        "keyboard",
    ],


    # ========================================================
    # TV
    # ========================================================

    "tv": [
        "tv accessories",
        "soundbar",
        "hdmi cable",
        "wall mount",
        "speakers",
    ],

    "television": [
        "tv accessories",
        "soundbar",
        "hdmi cable",
        "wall mount",
        "speakers",
    ],

    "smart tv": [
        "tv accessories",
        "soundbar",
        "hdmi cable",
        "wall mount",
        "streaming device",
    ],


    # ========================================================
    # AIR CONDITIONER
    # ========================================================

    "ac": [
        "ac accessories",
        "ac stabilizer",
        "installation kit",
        "air purifier",
        "surge protector",
    ],

    "air conditioner": [
        "ac accessories",
        "ac stabilizer",
        "installation kit",
        "air purifier",
        "surge protector",
    ],


    # ========================================================
    # REFRIGERATOR
    # ========================================================

    "refrigerator": [
        "refrigerator accessories",
        "refrigerator stabilizer",
        "surge protector",
        "voltage stabilizer",
    ],

    "fridge": [
        "refrigerator accessories",
        "refrigerator stabilizer",
        "surge protector",
        "voltage stabilizer",
    ],


    # ========================================================
    # WASHING MACHINE
    # ========================================================

    "washing machine": [
        "washing machine accessories",
        "washing machine stand",
        "voltage stabilizer",
        "surge protector",
    ],


    # ========================================================
    # MICROWAVE
    # ========================================================

    "microwave": [
        "microwave accessories",
        "kitchen accessories",
        "cookware",
        "surge protector",
    ],


    # ========================================================
    # AIR FRYER
    # ========================================================

    "air fryer": [
        "air fryer accessories",
        "kitchen accessories",
        "cookware",
    ],


    # ========================================================
    # HEADPHONES
    # ========================================================

    "headphones": [
        "headphone accessories",
        "earbuds",
        "speakers",
        "audio accessories",
    ],


    # ========================================================
    # EARBUDS
    # ========================================================

    "earbuds": [
        "earbuds accessories",
        "charger",
        "power bank",
        "audio accessories",
    ],


    # ========================================================
    # SPEAKER
    # ========================================================

    "speaker": [
        "speaker accessories",
        "audio accessories",
        "aux cable",
        "bluetooth accessories",
    ],


    # ========================================================
    # SOUNDBAR
    # ========================================================

    "soundbar": [
        "soundbar accessories",
        "hdmi cable",
        "tv accessories",
        "audio accessories",
    ],


    # ========================================================
    # CAMERA
    # ========================================================

    "camera": [
        "camera accessories",
        "memory card",
        "tripod",
        "camera bag",
        "camera battery",
    ],

    "dslr": [
        "camera accessories",
        "memory card",
        "tripod",
        "camera bag",
        "camera battery",
    ],


    # ========================================================
    # GAMING
    # ========================================================

    "gaming": [
        "gaming accessories",
        "gaming headset",
        "gaming mouse",
        "gaming keyboard",
        "controller",
    ],

    "gaming laptop": [
        "gaming accessories",
        "gaming mouse",
        "gaming keyboard",
        "gaming headset",
        "cooling pad",
    ],

    "gaming console": [
        "controller",
        "gaming headset",
        "gaming accessories",
        "hdmi cable",
    ],


    # ========================================================
    # VACUUM CLEANER
    # ========================================================

    "vacuum cleaner": [
        "vacuum accessories",
        "replacement filter",
        "cleaning accessories",
    ],

    "robot vacuum": [
        "vacuum accessories",
        "replacement filter",
        "cleaning accessories",
    ],


    # ========================================================
    # AIR PURIFIER
    # ========================================================

    "air purifier": [
        "air purifier accessories",
        "replacement filter",
        "surge protector",
    ],


    # ========================================================
    # SMARTWATCH
    # ========================================================

    "smartwatch": [
        "smartwatch accessories",
        "watch strap",
        "smartwatch charger",
        "screen protector",
    ],


    # ========================================================
    # UPS
    # ========================================================

    "ups": [
        "ups accessories",
        "battery backup",
        "surge protector",
    ],


    # ========================================================
    # POWER BANK
    # ========================================================

    "power bank": [
        "charger",
        "charging cable",
        "mobile accessories",
    ],

}


# ============================================================
# NORMALIZE
# ============================================================

def normalize_category(
    category: Optional[str]
) -> str:

    if not category:
        return ""

    return (
        str(category)
        .strip()
        .lower()
    )


# ============================================================
# DECIMAL CONVERSION
# ============================================================

def decimal_to_float(value):

    if isinstance(
        value,
        Decimal
    ):

        return float(value)

    return value


# ============================================================
# GET SOURCE PRODUCT
# ============================================================

def get_source_product(
    product_id: int
):

    connection = None

    try:

        connection = get_connection()

        with connection.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            cursor.execute(
                """
                SELECT
                    product_id,
                    name,
                    category,
                    brand,
                    price,
                    description,
                    stock,
                    status
                FROM products
                WHERE product_id = %s
                AND (
                    status IS NULL
                    OR LOWER(status) = 'active'
                );
                """,
                (product_id,)
            )

            return cursor.fetchone()

    finally:

        if connection:
            connection.close()


# ============================================================
# FIND RELATED PRODUCTS
# ============================================================

def find_related_products(
    source_product,
    limit: int = 4
):

    connection = None

    try:

        connection = get_connection()

        source_category = normalize_category(
            source_product["category"]
        )

        related_categories = (
            CATEGORY_RELATIONSHIPS.get(
                source_category,
                []
            )
        )

        products = []

        with connection.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            # ==================================================
            # PRIMARY RECOMMENDATIONS
            # ==================================================

            if related_categories:

                cursor.execute(
                    """
                    SELECT
                        product_id,
                        name,
                        category,
                        brand,
                        price,
                        description,
                        stock,
                        status
                    FROM products
                    WHERE
                        LOWER(category) = ANY(%s)
                        AND product_id <> %s
                        AND COALESCE(stock, 0) > 0
                        AND (
                            status IS NULL
                            OR LOWER(status) = 'active'
                        )
                    ORDER BY
                        price ASC,
                        product_id ASC
                    LIMIT %s;
                    """,
                    (
                        related_categories,
                        source_product["product_id"],
                        limit,
                    )
                )

                products = cursor.fetchall()


            # ==================================================
            # FALLBACK
            # ==================================================

            if len(products) < limit:

                remaining = (
                    limit - len(products)
                )

                existing_ids = [
                    product["product_id"]
                    for product in products
                ]

                if not existing_ids:
                    existing_ids = [-1]

                cursor.execute(
                    """
                    SELECT
                        product_id,
                        name,
                        category,
                        brand,
                        price,
                        description,
                        stock,
                        status
                    FROM products
                    WHERE
                        product_id <> %s
                        AND NOT (
                            product_id = ANY(%s)
                        )
                        AND COALESCE(stock, 0) > 0
                        AND (
                            status IS NULL
                            OR LOWER(status) = 'active'
                        )
                    ORDER BY
                        price ASC,
                        product_id ASC
                    LIMIT %s;
                    """,
                    (
                        source_product["product_id"],
                        existing_ids,
                        remaining,
                    )
                )

                fallback_products = (
                    cursor.fetchall()
                )

                products.extend(
                    fallback_products
                )

        return products[:limit]

    finally:

        if connection:
            connection.close()


# ============================================================
# CONFIDENCE SCORE
# ============================================================

def calculate_confidence(
    source_product,
    recommended_product
):

    source_category = normalize_category(
        source_product["category"]
    )

    recommended_category = normalize_category(
        recommended_product["category"]
    )

    related_categories = (
        CATEGORY_RELATIONSHIPS.get(
            source_category,
            []
        )
    )


    # Exact category relationship

    if recommended_category in related_categories:

        return 95


    # Accessory

    if "accessor" in recommended_category:

        return 90


    # Same brand

    source_brand = normalize_category(
        source_product.get("brand")
    )

    recommended_brand = normalize_category(
        recommended_product.get("brand")
    )

    if (
        source_brand
        and recommended_brand
        and source_brand == recommended_brand
    ):

        return 82


    return 70


# ============================================================
# RECOMMENDATION REASON
# ============================================================

def generate_reason(
    source_product,
    recommended_product
):

    source_name = source_product["name"]

    source_category = normalize_category(
        source_product["category"]
    )

    recommended_category = normalize_category(
        recommended_product["category"]
    )


    reasons = {

        "ac":
            "A useful companion for your air conditioner.",

        "ac accessories":
            "Helps improve AC installation, protection and convenience.",

        "ac stabilizer":
            "Helps protect your air conditioner from voltage fluctuations.",

        "installation kit":
            "Useful for setting up your air conditioner.",

        "refrigerator":
            "A useful companion for your refrigerator setup.",

        "refrigerator accessories":
            "Helps protect and support your refrigerator.",

        "refrigerator stabilizer":
            "Helps protect your refrigerator from voltage fluctuations.",

        "washing machine":
            "A useful addition to your washing machine setup.",

        "washing machine accessories":
            "Helps support and protect your washing machine.",

        "washing machine stand":
            "Helps provide stability and reduce vibration.",

        "tv":
            "Enhances your home entertainment experience.",

        "tv accessories":
            "A useful accessory for your TV setup.",

        "soundbar":
            "Enhances the audio experience of your TV.",

        "hdmi cable":
            "Useful for connecting compatible entertainment devices.",

        "laptop":
            "A practical companion for your laptop.",

        "laptop accessories":
            "Helps improve laptop productivity and convenience.",

        "mouse":
            "A practical accessory for comfortable computer use.",

        "keyboard":
            "Improves productivity and desktop usability.",

        "headphones":
            "Complements your personal audio experience.",

        "earbuds":
            "A useful addition to your wireless audio setup.",

        "camera":
            "Useful for expanding your photography setup.",

        "camera accessories":
            "Helps you get more from your camera.",

        "gaming":
            "Enhances your gaming experience.",

        "air purifier":
            "A useful companion for maintaining indoor air quality.",

        "smartwatch":
            "Complements your wearable technology setup.",

        "power bank":
            "Provides convenient portable charging.",

    }


    return reasons.get(
        recommended_category,
        (
            f"Recommended to complement "
            f"your {source_name}."
        )
    )


# ============================================================
# GET MULTIPLE RECOMMENDATIONS
# ============================================================

def get_recommendations(
    source_product_id: int,
    limit: int = 4
):

    # ========================================================
    # VALIDATION
    # ========================================================

    if limit <= 0:
        limit = 4

    if limit > 10:
        limit = 10


    # ========================================================
    # SOURCE PRODUCT
    # ========================================================

    source_product = get_source_product(
        source_product_id
    )


    if source_product is None:

        return None


    # ========================================================
    # FIND PRODUCTS
    # ========================================================

    products = find_related_products(
        source_product,
        limit
    )


    # ========================================================
    # BUILD RESPONSE
    # ========================================================

    recommendations = []


    for product in products:

        confidence = calculate_confidence(
            source_product,
            product
        )

        reason = generate_reason(
            source_product,
            product
        )


        recommendations.append({

            "product_id":
                product["product_id"],

            "name":
                product["name"],

            "category":
                product["category"],

            "brand":
                product["brand"],

            "price":
                decimal_to_float(
                    product["price"]
                ),

            "description":
                product["description"],

            "stock":
                product["stock"],

            "confidence":
                confidence,

            "confidence_score":
                round(
                    confidence / 100,
                    2
                ),

            "reason":
                reason,

        })


    # ========================================================
    # POTENTIAL REVENUE
    # ========================================================

    potential_revenue = sum(
        float(
            product["price"] or 0
        )
        for product in recommendations
    )


    # ========================================================
    # SOURCE RESPONSE
    # ========================================================

    source_response = {

        "product_id":
            source_product["product_id"],

        "name":
            source_product["name"],

        "category":
            source_product["category"],

        "brand":
            source_product["brand"],

        "price":
            decimal_to_float(
                source_product["price"]
            ),

        "description":
            source_product["description"],

        "stock":
            source_product["stock"],

    }


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "source_product":
            source_response,

        "recommendations":
            recommendations,

        "recommendation_count":
            len(recommendations),

        "potential_additional_revenue":
            round(
                potential_revenue,
                2
            ),

    }


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def get_recommendation(
    source_product_id: int
):

    result = get_recommendations(
        source_product_id,
        limit=1
    )


    if result is None:

        return None


    if not result["recommendations"]:

        return None


    recommendation = (
        result["recommendations"][0]
    )


    return {

        "name":
            recommendation["name"],

        "category":
            recommendation["category"],

        "price":
            recommendation["price"],

        "confidence":
            recommendation["confidence"],

        "confidence_score":
            recommendation["confidence_score"],

        "source_product":
            result["source_product"]["name"],

        "purchase_count":
            0,

        "total_orders":
            0,

        "potential_additional_revenue":
            recommendation["price"],

        "reason":
            recommendation["reason"],

        "product_id":
            recommendation["product_id"],

    }