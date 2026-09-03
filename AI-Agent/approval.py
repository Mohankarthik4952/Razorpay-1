from database import get_connection
from psycopg2.extras import Json


def create_recommendation(
    customer_id,
    source_product_id,
    recommendation
):
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        INSERT INTO recommendations
        (
            customer_id,
            source_product_id,
            recommended_product_id,
            confidence_score,
            reason,
            status
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING recommendation_id;
    """

    reason = (
        f"Recommended because the product was purchased "
        f"together {recommendation['purchase_count']} times "
        f"with a confidence of {recommendation['confidence']}%."
    )

    cursor.execute(
        query,
        (
            customer_id,
            source_product_id,
            recommendation["product_id"],
            recommendation["confidence"],
            reason,
            "pending"
        )
    )

    recommendation_id = cursor.fetchone()[0]

    connection.commit()

    cursor.close()
    connection.close()

    return recommendation_id


def approve_recommendation(recommendation_id):

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        UPDATE recommendations
        SET status = 'approved'
        WHERE recommendation_id = %s
        AND status = 'pending'
        RETURNING recommendation_id;
    """

    cursor.execute(query, (recommendation_id,))

    result = cursor.fetchone()

    connection.commit()

    cursor.close()
    connection.close()

    if result:
        return True

    return False


def reject_recommendation(recommendation_id):

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        UPDATE recommendations
        SET status = 'rejected'
        WHERE recommendation_id = %s
        AND status = 'pending'
        RETURNING recommendation_id;
    """

    cursor.execute(query, (recommendation_id,))

    result = cursor.fetchone()

    connection.commit()

    cursor.close()
    connection.close()

    if result:
        return True

    return False