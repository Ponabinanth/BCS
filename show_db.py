import mysql.connector
from mysql.connector import Error
import pandas as pd
# Connect to MySQL
conn = sqlite3.connect('securechain.db')

with open('db_dump.txt', 'w', encoding='utf-8') as f:
    def print_table(table_name):
        f.write(f"\n--- {table_name.upper()} TABLE ---\n")
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
            if df.empty:
                f.write("(No data found)\n")
            else:
                f.write(df.to_string(index=False) + "\n")
        except Exception as e:
            f.write(f"Error reading {table_name}: {e}\n")

    # Show data
    f.write("📊 READING DATABASE (securechain.db)...\n")
    print_table('users')
    print_table('devices')
    print_table('threats')
    print_table('nft_registry')

conn.close()
print("✅ Database dump saved to db_dump.txt")
