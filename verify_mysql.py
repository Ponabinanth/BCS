import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("MYSQL_HOST") or os.getenv("DB_HOST") or "localhost"
port = int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306")
user = os.getenv("MYSQL_USER") or os.getenv("DB_USER") or "root"
password = os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or ""
database = os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME") or ""

print("Testing MySQL Connection...")
print(f"Host: {host}")
print(f"Port: {port}")
print(f"User: {user}")
print(f"DB:   {database or '(none)'}")

try:
    conn = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database or None,
    )
    if conn.is_connected():
        print("OK: Connected to MySQL!")
        conn.close()
    else:
        print("FAILED: Connected but verification failed.")
except Exception as e:
    print(f"FAILED: {e}")
