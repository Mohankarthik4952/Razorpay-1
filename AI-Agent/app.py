from database import get_connection

try:
    connection = get_connection()
    print("PostgreSQL connection successful!")
    connection.close()
except Exception as e:
    print("Database connection failed:")
    print(e)