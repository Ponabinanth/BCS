import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("MYSQL_HOST") or os.getenv("DB_HOST") or "localhost"
port = int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306")
user = os.getenv("MYSQL_USER") or os.getenv("DB_USER") or "root"
password = os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or ""
target_db = os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME") or ""

print(f"Connecting to MySQL server ({host}:{port}) as '{user}'...")

try:
    # Connect without specifying database to list available ones
    conn = mysql.connector.connect(host=host, port=port, user=user, password=password)

    if not conn.is_connected():
        print("FAILED: Connected but verification failed.")
        raise SystemExit(1)

    print("OK: Authentication successful.")

    cursor = conn.cursor()
    cursor.execute("SHOW DATABASES")
    dbs = [db[0] for db in cursor]

    print("\nAvailable databases:")
    for db in dbs:
        print(f" - {db}")

    print(f"\nTarget database from env: '{target_db or '(not set)'}'")

    if target_db:
        if target_db in dbs:
            print(f"OK: Target database '{target_db}' exists.")
        else:
            print(f"WARNING: Target database '{target_db}' not found.")

    cursor.close()
    conn.close()
except mysql.connector.Error as err:
    print(f"FAILED: {err}")
