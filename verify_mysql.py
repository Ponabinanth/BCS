import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing MySQL Connection...")
print(f"Host: {os.getenv('DB_HOST')}")
print(f"User: {os.getenv('DB_USER')}")
print(f"DB:   {os.getenv('DB_NAME')}")

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    if conn.is_connected():
        print("✅ SUCCESS: Connected to MySQL!")
        conn.close()
    else:
        print("❌ FAILED: Connected but verified failed.")
except Exception as e:
    print(f"❌ FAILED: {e}")
