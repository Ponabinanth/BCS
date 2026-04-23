from flask import Flask, render_template, request, jsonify, session, redirect, url_for, Response, send_file, send_from_directory
import mysql.connector
from mysql.connector import Error
import json
import datetime
import secrets
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import subprocess
from io import BytesIO
import os
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit
import threading
import time
import re
import platform
import sys

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Prefer FLASK_SECRET_KEY (documented), but keep backward compatibility.
app.secret_key = os.getenv('FLASK_SECRET_KEY') or os.getenv('SECRET_KEY') or 'default-dev-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Background thread for real-time simulations
def background_simulation():
    """Simulate real-time blockchain activity"""
    while True:
        time.sleep(10) # New block every 10 seconds
        
        # Create a mock block
        block_data = {
            'height': 1000 + int(time.time() % 1000),
            'hash': secrets.token_hex(32),
            'txs': secrets.randbelow(50),
            'time': datetime.datetime.now().isoformat()
        }
        
        # Push to all clients
        try:
             socketio.emit('new_block', block_data)
        except Exception as e:
             log_error(f"SocketIO emit failed: {e}")

# Start background thread
bg_thread = threading.Thread(target=background_simulation, daemon=True)
bg_thread.start()

# MySQL Database Configuration
# Prefer MYSQL_* env vars (documented in .env.example), but support legacy DB_* env vars too.
MYSQL_HOST = os.getenv('MYSQL_HOST') or os.getenv('DB_HOST') or 'localhost'
MYSQL_PORT = int(os.getenv('MYSQL_PORT') or os.getenv('DB_PORT') or '3306')
MYSQL_USER = os.getenv('MYSQL_USER') or os.getenv('DB_USER') or 'root'
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD') or os.getenv('DB_PASSWORD') or ''
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE') or os.getenv('DB_NAME') or 'securechain'

# Database connection helper
def log_error(msg):
    print(f"[ERROR] {datetime.datetime.now().isoformat()}: {msg}")

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
        )
        return conn
    except Error as e:
        log_error(f"DB connection failed: {e}")
        return None

def db_execute(cursor, query, params=None):
    if params is None:
        return cursor.execute(query)
    query = query.replace("?", "%s")
    return cursor.execute(query, params)

# Database initialization
def init_db():
    conn = get_db_connection()
    if conn is None:
        print("Failed to connect to MySQL database")
        return
    
    cursor = conn.cursor(dictionary=True)
    
    # Users table
    cursor.execute('''CREATE TABLE IF NOT EXISTS users
                     (id INT PRIMARY KEY AUTO_INCREMENT,
                      email VARCHAR(255) UNIQUE NOT NULL,
                      password VARCHAR(255) NOT NULL,
                      username VARCHAR(255),
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Devices table
    cursor.execute('''CREATE TABLE IF NOT EXISTS devices
                     (id INT PRIMARY KEY AUTO_INCREMENT,
                      device_id VARCHAR(255) UNIQUE NOT NULL,
                      device_name VARCHAR(255) NOT NULL,
                      device_type VARCHAR(50) NOT NULL,
                      status VARCHAR(20) DEFAULT 'online',
                      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      user_id INT,
                      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)''')
    
    # Analytics table
    cursor.execute('''CREATE TABLE IF NOT EXISTS analytics
                     (id INT PRIMARY KEY AUTO_INCREMENT,
                      device_id VARCHAR(255),
                      action VARCHAR(255) NOT NULL,
                      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      user_id INT,
                      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)''')
    
    # Threats table
    cursor.execute('''CREATE TABLE IF NOT EXISTS threats
                     (id INT PRIMARY KEY AUTO_INCREMENT,
                      threat_type VARCHAR(100) NOT NULL,
                      severity VARCHAR(20) NOT NULL,
                      description TEXT,
                      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      status VARCHAR(20) DEFAULT 'active')''')
    
    # NFT Registry table
    cursor.execute('''CREATE TABLE IF NOT EXISTS nft_registry
                     (id INT PRIMARY KEY AUTO_INCREMENT,
                      token_id VARCHAR(255) UNIQUE NOT NULL,
                      owner_address VARCHAR(255) NOT NULL,
                      purpose TEXT,
                      verified BOOLEAN DEFAULT TRUE,
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')

    # Certificates table
    cursor.execute('''CREATE TABLE IF NOT EXISTS certificates
                     (id VARCHAR(255) PRIMARY KEY,
                      name VARCHAR(255) NOT NULL,
                      course VARCHAR(255) NOT NULL,
                      date VARCHAR(100) NOT NULL,
                      issuer VARCHAR(255) NOT NULL,
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Insert sample data (only if tables are empty)
    try:
        # Check if nft_registry is empty
        cursor.execute("SELECT COUNT(*) AS count FROM nft_registry")
        if cursor.fetchone()["count"] == 0:
            sample_nfts = [
                ('NFT-1001', '0x12345ABCDE67890', 'Degree Certificate'),
                ('NFT-1002', '0x98765FEDCB43210', 'Company ID'),
                ('NFT-1003', '0xABCDEF123456789', 'Software License')
            ]
            
            for nft in sample_nfts:
                db_execute(cursor, '''INSERT IGNORE INTO nft_registry (token_id, owner_address, purpose)
                                 VALUES (?, ?, ?)''', nft)
        
        # Check if threats table is empty
        cursor.execute("SELECT COUNT(*) AS count FROM threats")
        if cursor.fetchone()["count"] == 0:
            sample_threats = [
                ('DDoS', 'high', 'High volume attack detected'),
                ('Malware', 'medium', 'Suspicious file upload'),
                ('Phishing', 'low', 'Fake login attempt'),
                ('Vulnerability', 'high', 'Exploitable CVE found')
            ]
            
            for threat in sample_threats:
                db_execute(cursor, '''INSERT IGNORE INTO threats (threat_type, severity, description)
                                 VALUES (?, ?, ?)''', threat)
        
        conn.commit()
        print("Database initialized successfully")
        
    except Error as e:
        print(f"Error inserting sample data: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

# Initialize database on startup
init_db()

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# CSS content as a string
CSS_CONTENT = '''
@import url("/futuristic.css");

/* ===== Section Headings (Theme Color) ===== */

.threatmap-heading,
.contact-heading {
  font-size: 2em;
  font-weight: 600;
  color: var(--section-heading-color, #000);
  transition: color 0.3s;
}

body.light-mode .threatmap-heading,
body.light-mode .contact-heading {
  --section-heading-color: #000;
}

body.dark-mode .threatmap-heading,
body.dark-mode .contact-heading {
  --section-heading-color: #fff;
}

/* ===== Console Heading (Theme Color, Full Left) ===== */
.console-heading {
  font-size: 2em;
  font-weight: 600;
  color: var(--section-heading-color, #000);
  transition: color 0.3s;
  margin-left: 0;
}

body.light-mode .console-heading {
  --section-heading-color: #000;
}

body.dark-mode .console-heading {
  --section-heading-color: #fff;
}

/* ===== GLOBAL RESET ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', sans-serif;
  background-color: #0a0f1f;
  color: #f0f0f0;
  scroll-behavior: smooth;
  line-height: 1.6;
}

a {
  color: #00ffe0;
  text-decoration: none;
  transition: 0.3s;
}

a:hover {
  color: #00ffcc;
}

button {
  background: linear-gradient(90deg, #00ffe0, #007bff);
  border: none;
  padding: 10px 20px;
  color: #000;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 0 10px #00ffe0;
  transition: all 0.3s ease-in-out;
}

button:hover {
  transform: scale(1.05);
  background: linear-gradient(90deg, #007bff, #00ffe0);
}

/* ===== NAVBAR ===== */
.navbar {
  background-color: #10182f;
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.logo {
  font-size: 1.8em;
  font-weight: bold;
  color: #02f6d9;
  text-shadow: 0 0 10px #00ffe0;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 20px;
}

.nav-links:hover {
  text-shadow: 0 0 40px #f32365;
}


.nav-links li {
  font-size: 1.1em;
}

.actions button {
  margin-left: 10px;
}

/* ===== HERO SECTION ===== */
.hero {
  text-align: center;
  padding: 100px 20px;
  background: radial-gradient(ellipse at center, #131c31 0%, #0a0f1f 100%);
  position: relative;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero h1 {
  font-size: 3em;
  color: #00ffe0;
  text-shadow: 0 0 20px #00ffe0;
  margin-bottom: 15px;
}

.hero p {
  font-size: 1.2em;
  color: #bbb;
  max-width: 700px;
  margin: 0 auto 30px auto;
}

.hero-glow {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.3), transparent 40%);

  animation: pulse 4s infinite;
  z-index: 1;
}

@keyframes pulse {

  0%,
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 0.5;
  }

  50% {
    transform: translateX(-50%) scale(1.2);
    opacity: 1;
  }
}

/* ===== FEATURES GRID ===== */
.features-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  padding-top: 150px;
}

.feature-card {
  flex: 1 1 260px;
  max-width: 320px;
  min-width: 220px;
  margin: 16px 0;
  background-color: #131c31;
  border: 1px solid #00ffe055;
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  transition: transform 0.3s;
  animation: floatIn 1s ease-in;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 0 20px #00ffe0aa;
}

.feature-card i {
  font-size: 2em;
  display: block;
  margin-bottom: 10px;
}

/* ===== SERVICE CARDS ===== */
.service-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 40px;
  padding: 50px 20px;
  padding-top: 150px;
}

.service-card {
  width: 250px;
  background: #1d253f;
  border-radius: 15px;
  padding: 20px;
  text-align: center;
  border: 1px solid #00ffe055;
  transition: all 0.3s ease;
}

.service-card:hover {
  box-shadow: 0 0 15px #00ffe0aa;
  transform: scale(1.05);
}



/* ===== EXPLORER SECTION ===== */
.explorer {
  padding: 60px 20px;
  background-color: #0e1329;
  text-align: center;
  padding-top: 150px;
}

.explorer input {
  padding: 10px;
  width: 60%;
  max-width: 400px;
  border-radius: 8px;
  border: none;
  margin-right: 10px;
  gap: 20px;
}

.explorer pre {
  text-align: left;
  margin-top: 20px;
  background: #181f3a;
  padding: 20px;
  border-radius: 10px;
  white-space: pre-wrap;
}

/* ===== THREAT MAP & CHART ===== */
#map,
#analyticsChart {
  height: 250px;
  background: #1a1a2e;
  margin: 20px auto;
  max-width: 700px;
  border-radius: 15px;
  box-shadow: 0 0 20px #00ffe033;
  padding: 10px;
}

#threatmap {
  padding-top: 120px;
  padding-left: 50px;
}


/* ===== CONTACT FORM ===== */
.contact form {
  max-width: 500px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 40px 0;
}

#contact {
  padding-left: 80px;
  padding-top: 50px;
}

.contact input,
.contact textarea {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #131c31;
  color: #fff;
}

#formStatus {
  margin-top: 10px;
  color: #00ffe0;
}

/* ===== FOOTER ===== */
footer {
  text-align: center;
  padding: 20px;
  background-color: #10182f;
  color: #888;
  font-size: 0.9em;
}

/* ===== ANIMATIONS ===== */
@keyframes floatIn {
  0% {
    transform: translateY(50px);
    opacity: 0;
  }

  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Default: Dark Theme (Initial) */
:root {
  --bg-color: #0f172a;
  --text-color: #e2e8f0;
  --card-color: #1e293b;
  --accent-color: #38bdf8;
}

/* Light Theme Variables */
.light-theme {
  --bg-color: #f1f5f9;
  --text-color: #0f172a;
  --card-color: #ffffff;
  --accent-color: #2563eb;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.card,
.feature-card,
.service-card {
  background: var(--card-color);
  transition: background 0.3s ease, color 0.3s ease;
}

a,
h1,
h2,
h3,
p,
button {
  color: var(--text-color);
}

button {
  background-color: var(--accent-color);
  border: none;
  padding: 10px 18px;
  border-radius: 5px;
  cursor: pointer;
  color: white;
  transition: background-color 0.3s ease;
}

button:hover {
  filter: brightness(1.1);
}

.actions button {
  margin-right: 10px;
}

body.light-mode {
  background-color: #f5f5f5;
  color: #111;
}

body.dark-mode {
  background-color: #0c0c1e;
  color: #f1f1f1;
}

.fax {
  background-color: #0ff;
  color: #000;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 0 10px #0ff;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;

}



.fax:hover {
  background-color: #00bfff;
  color: #fff;
  box-shadow: 0 0 15px #00bfff;
  transform: scale(1.1);
}

.actions {
  display: flex;
  align-items: center;
  gap: 15px;
  /* adjust spacing */
}

/* ===== THREAT SCAN RESULTS BOX ===== */
#threatScanResults {
  margin-top: 20px;
  padding: 15px;
  background: #131c31;
  border: 1px solid #00ffe055;
  border-radius: 10px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  color: #00ffe0;
  font-family: monospace;
  white-space: pre-wrap;
  box-shadow: 0 0 10px #00ffe055;
}

/* ===== NFT TOKEN INPUT ===== */
#nftTokenId {
  padding: 10px;
  margin-top: 10px;
  border-radius: 8px;
  border: none;
  width: 80%;
  background: #0a0f1f;
  color: #00ffe0;
  font-size: 1em;
}

#nftVerificationResult {
  margin-top: 15px;
  color: #00ffcc;
  font-weight: bold;
  text-align: center;
}

/* ===== IOT DEVICE REGISTRATION INPUTS ===== */
#deviceName,
#deviceType {
  padding: 10px;
  margin-top: 10px;
  border-radius: 8px;
  border: none;
  width: 80%;
  background: #0a0f1f;
  color: #00ffe0;
  font-size: 1em;
}

#deviceResult {
  margin-top: 10px;
  color: #00ffcc;
  font-weight: bold;
  text-align: center;
}


/* ===== Input Fields Neon Glow Style ===== */
.input-glow {
  padding: 10px;
  margin-top: 10px;
  border-radius: 10px;
  border: 1px solid #00ffe0aa;
  width: 90%;
  background: #0c1226;
  color: #00ffe0;
  font-size: 1em;
  transition: 0.3s;
  outline: none;
  box-shadow: 0 0 8px #00ffe0aa;
}

.input-glow:focus {
  box-shadow: 0 0 12px #00ffe0;
  background: #10182f;
}

/* ===== Glow Output Box (Results) ===== */
.glow-box {
  margin-top: 15px;
  padding: 15px;
  background: #131c31;
  border: 1px solid #00ffe055;
  border-radius: 12px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  color: #00ffe0;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  box-shadow: 0 0 12px #00ffe055;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease-out;
}

/* Fade-in animation when content is shown */
.glow-box.fade-in.show {
  opacity: 1;
  transform: translateY(0);
}

/* ===== Animated Scan Dots (optional visual) ===== */
@keyframes dots {
  0% {
    content: ".";
  }

  33% {
    content: "..";
  }

  66% {
    content: "...";
  }

  100% {
    content: ".";
  }
}

/* Reusable Animation Classes */
@keyframes glowPulse {

  0%,
  100% {
    box-shadow: 0 0 10px #00ffe033;
  }

  50% {
    box-shadow: 0 0 20px #00ffe0aa;
  }
}

/* ===== Console Heading (Left Near Margin) ===== */
.console-heading {
  font-size: 2em;
  font-weight: 600;
  color: var(--section-heading-color, #000);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  justify-content: flex-start;
  margin-left: 0;
  margin-top: 24px;
  transition: color 0.ms;
}

body.light-mode .console-heading {
  --section-heading-color: #000;
}

body.dark-mode .console-heading {
  --section-heading-color: #fff;
}

/* ===== Features Row ===== */
.features-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 100px;
  margin-bottom: 60px;
}

.features-row .feature-card {
  flex: 1 1 220px;
  max-width: 320px;
  min-width: 180px;
  margin: 0 12px;
}

/* IoT Register Page */
.page-iot {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  border: 2px solid #0ff;
  box-shadow: 0px 0px 20px rgba(0, 255, 255, 0.3);
}

/* NFT Verify Page */
.page-nft {
  background: linear-gradient(135deg, #2c003e, #5a189a, #7b2cbf);
  border: 2px solid #ff00ff;
  box-shadow: 0px 0px 20px rgba(255, 0, 255, 0.4);
}

/* Analytics Page */
.page-analytics {
  background: linear-gradient(135deg, #001219, #005f73, #0a9396);
  border: 2px solid #00eaff;
  box-shadow: 0px 0px 20px rgba(0, 234, 255, 0.3);
}

/* Wallet Connect Page */
.page-wallet {
  background: linear-gradient(135deg, #141e30, #243b55);
  border: 2px solid #ffd700;
  box-shadow: 0px 0px 20px rgba(255, 215, 0, 0.4);
}
'''

# Routes
@app.route('/')
@app.route('/index.html')  # ← ADD THIS LINE
def index():
    """Main page - serves as login page"""
    logged_in = 'user' in session
    return render_template('index.html', logged_in=logged_in, user_email=session.get('user'))

@app.route('/style.css')
def serve_css():
    return Response(CSS_CONTENT, mimetype='text/css')

@app.route('/futuristic.css')
def serve_futuristic_css():
    """Optional neon theme overlay (imported by /style.css)."""
    css_dir = os.path.join(app.root_path, 'static', 'css')
    return send_from_directory(css_dir, 'futuristic.css', mimetype='text/css')

@app.route('/static/main.js')
def serve_main_js():
    return send_file('main.js', mimetype='application/javascript')

@app.route('/login.html')
def login_page():
    return render_template('login.html')

@app.route('/threatscan.html')
def threat_scan():
    return render_template('threatscan.html')

@app.route('/registeriot.html')
def register_iot():
    return render_template('registeriot.html')

@app.route('/verifynft.html')
def verify_nft():
    return render_template('verifynft.html')

@app.route('/datavault.html')
def data_vault():
    return render_template('datavault.html')

@app.route('/certificate-generator.html')
def certificate_generator():
    return render_template('certificate-generator.html')

@app.route('/riskscore.html')
def risk_score():
    return render_template('riskscore.html')

@app.route('/quarantine.html')
def quarantine():
    return render_template('quarantine.html')

@app.route('/connectwallet.html')
def connect_wallet():
    return render_template('connectwallet.html')

@app.route('/dashboardview.html')
def dashboard_view():
    return render_template('dashboardview.html')

@app.route('/encrypted.html')
def encrypted():
    return render_template('encrypted.html')

@app.route('/ecertificate.html')
def ecertificate():
    return render_template('ecertificate.html')

@app.route('/ai.html')
def ai():
    return render_template('ai.html')

@app.route('/cyber.html')
def cyber():
    return render_template('cyber.html')

@app.route('/iot.html')
def iot():
    return render_template('iot.html')

@app.route('/nft.html')
def nft():
    return render_template('nft.html')

@app.route('/wallet.html')
def wallet():
    return render_template('wallet.html')

@app.route('/analytics.html')
def analytics():
    return render_template('analytics.html')

@app.route('/quantum.html')
def quantum():
    return render_template('quantum.html')

@app.route('/deploy.html')
def deploy_page():
    return render_template('deploy.html')

@app.route('/contracts/<path:filename>')
def serve_contracts(filename):
    return send_file(os.path.join('contracts', filename))

# API Routes
@app.route('/api/auth-status')
def auth_status():
    """Check if user is logged in"""
    if 'user_id' in session:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'logged_in': False, 'error': 'Database connection failed'})
        
        cursor = conn.cursor(dictionary=True)
        db_execute(cursor, 'SELECT email FROM users WHERE id = ?', (session['user_id'],))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user:
            return jsonify({
                'logged_in': True,
                'email': user['email']
            })
    return jsonify({'logged_in': False})

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    db_execute(cursor, 'SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username']
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    username = data.get('username', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    hashed_password = generate_password_hash(password)
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        db_execute(cursor, 'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
                   (email, hashed_password, username))
        user_id = cursor.lastrowid
        conn.commit()
        
        session['user_id'] = user_id
        session['user_email'] = email
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user_id,
                'email': email,
                'username': username
            }
        })
    except Error as e:
        if e.errno == 1062:  # Duplicate entry error code
            return jsonify({'error': 'Email already exists'}), 400
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    session.clear()
    return jsonify({'message': 'Logout successful'})

@app.route('/api/devices', methods=['GET', 'POST'])
@login_required
def devices():
    """Get all devices or register a new device"""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        db_execute(cursor, '''
            SELECT * FROM devices WHERE user_id = ? ORDER BY registered_at DESC
        ''', (session['user_id'],))
        devices = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(devices)
    
    elif request.method == 'POST':
        data = request.get_json()
        device_id = data.get('device_id', secrets.token_hex(8))
        device_name = data.get('name', 'Unknown Device')
        device_type = data.get('type', 'iot')
        
        try:
            db_execute(cursor, '''
                INSERT INTO devices (device_id, device_name, device_type, user_id)
                VALUES (?, ?, ?, ?)
            ''', (device_id, device_name, device_type, session['user_id']))
            conn.commit()
            
            # Log analytics
            db_execute(cursor, '''
                INSERT INTO analytics (device_id, action, user_id)
                VALUES (?, ?, ?)
            ''', (device_id, 'device_registered', session['user_id']))
            conn.commit()
            
            cursor.close()
            conn.close()
            return jsonify({'message': 'Device registered successfully', 'device_id': device_id})
        except Error as e:
            if e.errno == 1062:
                return jsonify({'error': 'Device ID already exists'}), 400
            return jsonify({'error': str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@app.route('/api/analytics', methods=['GET', 'POST'])
@login_required
def analytics_data():
    """Get analytics data or add new analytics record"""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        db_execute(cursor, '''
            SELECT * FROM analytics WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50
        ''', (session['user_id'],))
        analytics_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(analytics_data)
    
    elif request.method == 'POST':
        data = request.get_json()
        device_id = data.get('device_id')
        action = data.get('action')
        
        try:
            db_execute(cursor, '''
                INSERT INTO analytics (device_id, action, user_id)
                VALUES (?, ?, ?)
            ''', (device_id, action, session['user_id']))
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'Analytics record added'})
        except Error as e:
            return jsonify({'error': str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@app.route('/api/nft/verify', methods=['POST'])
def verify_nft_api():
    """Verify NFT ownership"""
    data = request.get_json()
    token_id = data.get('token_id')
    owner_address = data.get('owner_address')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    db_execute(cursor, '''
        SELECT * FROM nft_registry WHERE token_id = ? AND owner_address = ?
    ''', (token_id, owner_address))
    nft = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if nft:
        return jsonify({
            'verified': True,
            'nft': nft
        })
    else:
        return jsonify({
            'verified': False,
            'message': 'NFT not found or ownership mismatch'
        }), 404

@app.route('/api/nft/register', methods=['POST'])
@login_required
def register_nft():
    """Register a new NFT"""
    data = request.get_json()
    token_id = data.get('token_id')
    owner_address = data.get('owner_address')
    purpose = data.get('purpose', 'Unknown')
    
    if not token_id or not owner_address:
        return jsonify({'error': 'Token ID and owner address required'}), 400
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        db_execute(cursor, '''
            INSERT INTO nft_registry (token_id, owner_address, purpose)
            VALUES (?, ?, ?)
        ''', (token_id, owner_address, purpose))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'NFT registered successfully'})
    except Error as e:
        if e.errno == 1062:
            return jsonify({'error': 'Token ID already exists'}), 400
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/threats', methods=['GET'])
def get_threats():
    """Get current threats"""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    db_execute(cursor, 'SELECT * FROM threats ORDER BY detected_at DESC')
    threats = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify(threats)

@app.route('/api/threats/scan', methods=['POST'])
@login_required
def scan_threats():
    """Run real threat scan (Port Scanner)"""
    import socket
    import threading
    from queue import Queue
    
    target = "127.0.0.1" # Scanning localhost for demo
    open_ports = []
    
    # Common ports to scan for speed
    common_ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 3306, 3389, 5000, 8080]
    
    def port_scan(port):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5) # Short timeout
            result = sock.connect_ex((target, port))
            if result == 0:
                open_ports.append(port)
            sock.close()
        except:
            pass

    # fast threading
    threads = []
    for port in common_ports:
        t = threading.Thread(target=port_scan, args=(port,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
    
    # Generate threat objects from open ports
    real_threats = []
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Clear old "scan" threats for demo
        # cursor.execute("DELETE FROM threats WHERE description LIKE 'Port %'") # Optional
        
        for port in open_ports:
            threat_type = "Port Exposure"
            severity = "medium"
            desc = f"Open port detected: {port}"
            
            if port in [21, 23, 3389]: # FTP, Telnet, RDP
                severity = "high"
                desc += " (Risky Service)"
            
            # Record in DB
            db_execute(cursor, '''
                INSERT INTO threats (threat_type, severity, description)
                VALUES (?, ?, ?)
            ''', (threat_type, severity, desc))
            
            real_threats.append({
                'threat_type': threat_type,
                'severity': severity,
                'description': desc,
                'detected_at': datetime.datetime.now().isoformat()
            })
            
        conn.commit()
        
        # If no ports found, add a "Clean" log or dummy if needed, but let's be real.
        if not real_threats:
             real_threats.append({
                'threat_type': 'System Scan',
                'severity': 'low',
                'description': 'No exposed common ports found on localhost.',
                'detected_at': datetime.datetime.now().isoformat()
            })

        return jsonify({
            'scan_complete': True,
            'threats_found': len(open_ports),
            'threats': real_threats
        })
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/chat', methods=['POST'])
def chat():
    """Super AI Chatbot - Answers ALL questions!"""
    data = request.get_json(silent=True) or {}
    message = str(data.get('message', '')).lower().strip()

    if not message:
        return jsonify({'response': "Ask me about blockchain, NFT verification, threat scans, IoT, certificates, or type 'diagnose'."})
    
    # Regex Intent Matching KB
    intents = {
        r'(diagnose|self[- ]?diagnose|health|not working|fix my project)': (
            "Run a quick check: GET /api/self-diagnose (shows DB connectivity, files, OpenSSL)."
        ),
        r'(ai|ml|model|anomaly)': (
            "AI module: use POST /api/risk/assess {asset_id} for a simulated risk score; use GET /api/system/status for metrics."
        ),
        r'(blockchain|explorer|block|hash|address)': (
            "Try POST /api/blockchain/explorer {query}. Use a height like '1001' or a '0x..' hash/address."
        ),
        r'hello|hi|hey': "Greetings Cyber Guardian! 🚀 Ask me about NFT deploy, threat scans, IoT register, error fixes, or cyber threats!",
        r'help|features|what': """
**SecureChain Assistant v2.0**
• Threat Scan: POST /api/threats/scan
• NFT Deploy: python deploy_contract.py
• IoT: POST /api/devices
• Fix Errors: Describe issue!
• Wallet: connectwallet.html
        """,
        r'deploy|contract|nft|solidity': """
**NFT Deploy:**
1. docker-compose up ganache
2. python deploy_contract.py
3. ABI: contracts/SecureChainNFT.json
Contract at localhost:8545
        """,
        r'wallet|metamask|connect': "Visit connectwallet.html → Click Connect → MetaMask → POST /api/wallet/connect",
        r'iot|device|register': "POST /api/devices {device_id, name, type}. UI at registeriot.html",
        r'threat|scan|cyber|ddos': "POST /api/threats/scan for live ports. Dashboardview.html live map!",
        r'error|fix|bug|fail': """
**Common Fixes:**
- MySQL 1062: Unique dup, delete row
- DB connect: docker-compose up mysql
- Ganache: docker-compose up ganache
- Run: docker-compose up --build
Share full error!
        """,
        r'cert|certificate': "/api/generate-certificate + /api/download-certificate for SSL",
        r'docker|run|start': "docker-compose up --build (includes Flask/MySQL/Ganache)",
    }
    
    for pattern, resp in intents.items():
        if re.search(pattern, message):
            return jsonify({'response': resp})
    
    return jsonify({'response': 'Try \"deploy nft\", \"fix error\", \"threat scan\", or describe your issue! 🔧'})

@app.route('/api/wallet/connect', methods=['POST'])
@login_required
def connect_wallet_api():
    """Connect wallet endpoint"""
    data = request.get_json()
    wallet_address = data.get('wallet_address')
    
    if not wallet_address:
        return jsonify({'error': 'Wallet address required'}), 400
    
    # In a real app, you'd validate the wallet address and signature
    return jsonify({
        'connected': True,
        'wallet_address': wallet_address,
        'message': 'Wallet connected successfully'
    })

@app.route('/api/system/status')
def system_status():
    """Get system status"""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Get counts
    cursor.execute('SELECT COUNT(*) AS count FROM users')
    users_count = cursor.fetchone()["count"]
    
    cursor.execute('SELECT COUNT(*) AS count FROM devices')
    devices_count = cursor.fetchone()["count"]
    
    cursor.execute('SELECT COUNT(*) AS count FROM threats WHERE status = "active"')
    threats_count = cursor.fetchone()["count"]
    
    cursor.execute('SELECT COUNT(*) AS count FROM nft_registry')
    nfts_count = cursor.fetchone()["count"]
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'status': 'operational',
        'services': {
            'ai_engine': 'operational',
            'blockchain_ledger': 'operational',
            'iot_registrar': 'operational',
            'quantum_encryption': 'operational'
        },
        'metrics': {
            'total_users': users_count,
            'registered_devices': devices_count,
            'active_threats': threats_count,
            'verified_nfts': nfts_count
        },
        'last_updated': datetime.datetime.now().isoformat()
    })

@app.route('/api/blockchain/explorer', methods=['POST'])
def blockchain_explorer():
    """Blockchain explorer endpoint"""
    data = request.get_json()
    query = data.get('query', '').strip()
    
    # Mock blockchain data
    mock_blocks = [
        {'height': 1001, 'hash': '0xabc123', 'transactions': 12, 'timestamp': '2024-01-15T10:30:00Z'},
        {'height': 1002, 'hash': '0xdef456', 'transactions': 7, 'timestamp': '2024-01-15T11:45:00Z'},
        {'height': 1003, 'hash': '0x987fed', 'transactions': 21, 'timestamp': '2024-01-15T12:15:00Z'}
    ]
    
    if query.isdigit():
        # Search by block height
        height = int(query)
        block = next((b for b in mock_blocks if b['height'] == height), None)
        if block:
            return jsonify({'type': 'block', 'data': block})
    elif query.startswith('0x'):
        # Search by hash
        block = next((b for b in mock_blocks if b['hash'].lower() == query.lower()), None)
        if block:
            return jsonify({'type': 'block', 'data': block})
        else:
            # Assume it's an address
            return jsonify({
                'type': 'address',
                'data': {
                    'address': query,
                    'balance': f"{(len(query) / 100):.3f} ETH",
                    'transaction_count': len(query) % 50
                }
            })
    
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/generate-certificate', methods=['POST'])
def generate_certificate():
    """Generate a new e-certificate"""
    data = request.get_json()
    name = data.get('name')
    course = data.get('course')
    date = data.get('date')
    issuer = data.get('issuer', 'SecureChain Academy')

    if not name or not course:
        return jsonify({'error': 'Name and course required'}), 400

    import uuid
    certificate_id = str(uuid.uuid4())

    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        db_execute(cursor, '''
            INSERT INTO certificates (id, name, course, date, issuer)
            VALUES (?, ?, ?, ?, ?)
        ''', (certificate_id, name, course, date, issuer))
        conn.commit()

        certificate = {
            'id': certificate_id,
            'name': name,
            'course': course,
            'date': date,
            'issuer': issuer
        }

        return jsonify({
            'success': True,
            'certificate': certificate,
            'message': 'Certificate generated successfully'
        })
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/certificates', methods=['GET'])
@login_required
def get_certificates():
    """Get all certificates for the user"""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    db_execute(cursor, 'SELECT * FROM certificates ORDER BY created_at DESC')
    certificates = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(certificates)

@app.route('/verify-certificate/<certificate_id>', methods=['GET'])
def verify_certificate(certificate_id):
    """Verify certificate by ID."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        db_execute(cursor, 'SELECT * FROM certificates WHERE id = ?', (certificate_id,))
        certificate = cursor.fetchone()
        if not certificate:
            return jsonify({
                'verified': False,
                'certificate_id': certificate_id,
                'message': 'Certificate not found'
            }), 404

        return jsonify({
            'verified': True,
            'certificate': certificate,
            'message': 'Certificate verified successfully'
        })
    finally:
        cursor.close()
        conn.close()

@app.route('/api/risk/assess', methods=['POST'])
@login_required
def assess_risk():
    """Assess risk for an asset"""
    data = request.get_json()
    asset_id = data.get('asset_id')

    if not asset_id:
        return jsonify({'error': 'Asset ID required'}), 400

    # Mock risk assessment logic
    import random
    score = random.randint(10, 95)

    analysis = "Risk assessment completed. "
    if score > 70:
        analysis += "High risk detected. Immediate action recommended."
    elif score > 40:
        analysis += "Medium risk level. Monitor closely."
    else:
        analysis += "Low risk profile. Maintain current security measures."

    return jsonify({
        'asset_id': asset_id,
        'score': score,
        'analysis': analysis,
        'timestamp': datetime.datetime.now().isoformat()
    })

# === Certificate Download Route ===
@app.route('/api/download-certificate')
@login_required
def download_certificate():
    """Generate and download SSL certificate with one click"""
    try:
        # Generate certificate using OpenSSL
        subprocess.run([
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', 'key.pem', '-out', 'cert.pem',
            '-days', '365', '-nodes',
            '-subj', '/C=US/ST=State/L=City/O=SecureChain/CN=securechain.local'
        ], check=True, capture_output=True)

        # Read the generated certificate
        with open('cert.pem', 'rb') as f:
            cert_data = f.read()

        # Clean up temporary files
        if os.path.exists('cert.pem'):
            os.remove('cert.pem')
        if os.path.exists('key.pem'):
            os.remove('key.pem')

        # Create download response
        return send_file(
            BytesIO(cert_data),
            as_attachment=True,
            download_name='securechain_certificate.pem',
            mimetype='application/x-pem-file'
        )

    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Certificate generation failed: {e.stderr.decode()}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/certificate')
@login_required
def certificate_page():
    return render_template('certificate.html', logged_in=True, user_email=session.get('user'))

# Basic health and self-diagnosis routes (helps local dev setup)
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'ok': True, 'service': 'securechain-flask', 'time': datetime.datetime.now().isoformat()})

@app.route('/api/self-diagnose', methods=['GET'])
def self_diagnose():
    """Lightweight self-checks to help debug local dev setup."""
    checks = {
        'time': datetime.datetime.now().isoformat(),
        'python': sys.version.split()[0],
        'platform': platform.platform(),
        'env': {
            'FLASK_PORT': os.getenv('FLASK_PORT'),
            'MYSQL_HOST': MYSQL_HOST,
            'MYSQL_PORT': MYSQL_PORT,
            'MYSQL_USER': MYSQL_USER,
            'MYSQL_DATABASE': MYSQL_DATABASE,
            'HAS_MYSQL_PASSWORD': bool(MYSQL_PASSWORD),
            'HAS_SECRET_KEY': bool(os.getenv('FLASK_SECRET_KEY') or os.getenv('SECRET_KEY')),
        },
        'files': {
            'templates/index.html': os.path.exists(os.path.join(app.root_path, 'templates', 'index.html')),
            'main.js': os.path.exists(os.path.join(app.root_path, 'main.js')),
            'contracts/': os.path.isdir(os.path.join(app.root_path, 'contracts')),
            'static/css/futuristic.css': os.path.exists(os.path.join(app.root_path, 'static', 'css', 'futuristic.css')),
        },
        'db': {'ok': False},
        'openssl': {'ok': False},
        'tips': [],
    }

    # DB check
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            checks['db'] = {'ok': False, 'error': 'connect_failed'}
        else:
            cursor = conn.cursor()
            cursor.execute('SELECT 1')
            cursor.fetchone()
            checks['db'] = {'ok': True}
    except Exception as e:
        checks['db'] = {'ok': False, 'error': str(e)}
    finally:
        try:
            if cursor is not None:
                cursor.close()
        except Exception:
            pass
        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass

    # OpenSSL check (used by /api/download-certificate)
    try:
        res = subprocess.run(['openssl', 'version'], capture_output=True, text=True, timeout=3, check=False)
        checks['openssl'] = {'ok': res.returncode == 0, 'version': (res.stdout or '').strip(), 'stderr': (res.stderr or '').strip()}
    except Exception as e:
        checks['openssl'] = {'ok': False, 'error': str(e)}

    if not checks['db']['ok']:
        checks['tips'].append('Start MySQL (or update MYSQL_* in .env) so init_db and /api/* endpoints can query tables.')
    if not checks['openssl']['ok']:
        checks['tips'].append('Install OpenSSL or add it to PATH to use /api/download-certificate.')

    return jsonify(checks)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', '5501'))
    socketio.run(app, debug=True, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
