import sqlite3
from werkzeug.security import generate_password_hash

DB_NAME = 'securechain.db'

def create_user(username, email, password):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Matches app.py hashing method
    hashed_password = generate_password_hash(password)
    
    try:
        cursor.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                       (username, email, hashed_password))
        conn.commit()
        print(f"✅ User '{username}' created successfully!")
    except sqlite3.IntegrityError:
        print(f"⚠️ User '{username}' already exists.")
    except Exception as e:
        print(f"❌ Error creating user: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_user('DemoUser', 'demo@example.com', 'password123')
