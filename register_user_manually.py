import os

import mysql.connector
from dotenv import load_dotenv
from mysql.connector import Error
from werkzeug.security import generate_password_hash

# Load environment variables from .env (if present)
load_dotenv()

# MySQL Database Configuration (kept consistent with app.py)
# Prefer MYSQL_* env vars (documented in .env.example), but support legacy DB_* env vars too.
MYSQL_HOST = os.getenv("MYSQL_HOST") or os.getenv("DB_HOST") or "localhost"
MYSQL_PORT = int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306")
MYSQL_USER = os.getenv("MYSQL_USER") or os.getenv("DB_USER") or "root"
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or ""
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME") or "securechain"


def get_db_connection():
    try:
        return mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
        )
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None


def ensure_users_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users
        (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            username VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def create_user(username, email, password):
    conn = get_db_connection()
    if conn is None:
        print("FAILED: Database connection failed.")
        return

    cursor = conn.cursor()
    hashed_password = generate_password_hash(password)

    try:
        ensure_users_table(cursor)
        cursor.execute(
            "INSERT INTO users (email, password, username) VALUES (%s, %s, %s)",
            (email, hashed_password, username),
        )
        conn.commit()
        print(f"OK: User '{username}' created successfully.")
    except Error as e:
        if getattr(e, "errno", None) == 1062:
            print(f"WARNING: User with email '{email}' already exists.")
        else:
            print(f"FAILED: Error creating user: {e}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_user("DemoUser", "demo@example.com", "password123")
