import mysql.connector
from mysql.connector import Error

# MySQL Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'securechain_db'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def show_data():
    conn = get_db_connection()
    if conn is None:
        print("Failed to connect to MySQL database")
        return

    cursor = conn.cursor(dictionary=True)

    tables = ['users', 'devices', 'analytics', 'threats', 'nft_registry', 'certificates']

    for table in tables:
        print(f"\n=== {table.upper()} TABLE ===")
        try:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    print(row)
            else:
                print("No data in this table.")
        except Error as e:
            print(f"Error querying {table}: {e}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    show_data()
