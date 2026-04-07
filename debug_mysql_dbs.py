import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST', 'localhost')
user = os.getenv('DB_USER', 'root')
password = os.getenv('DB_PASSWORD', '')

print(f"Connecting to MySQL Server ({host}) as '{user}'...")

try:
    # Connect without specifying database to list available ones
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password
    )
    
    if conn.is_connected():
        print("✅ AUTHENTICATION SUCCESSFUL!")
        
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES")
        dbs = [db[0] for db in cursor]
        print("\n📂 Available Databases:")
        for db in dbs:
            print(f" - {db}")
            
        target_db = os.getenv('DB_NAME', 'securechain_db')
        print(f"\nTarget Database in .env: '{target_db}'")
        
        if target_db in dbs:
            print(f"✅ Target database '{target_db}' exists!")
        else:
            print(f"⚠️ Target database '{target_db}' NOT found.")
            if 'blockchain_db' in dbs:
                print("💡 Found 'blockchain_db'. Recommendation: Update .env DB_NAME=blockchain_db")
            if 'BLOCKCHAIN' in dbs:
                 print("💡 Found 'BLOCKCHAIN'. Recommendation: Update .env DB_NAME=BLOCKCHAIN")

        conn.close()
    else:
        print("❌ Connected but verified failed.")

except mysql.connector.Error as err:
    print(f"❌ CONNECTION FAILED: {err}")
