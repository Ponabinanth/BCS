from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, session, flash
import json
import os
import sqlite3
from flask_cors import CORS # pyright: ignore[reportMissingModuleSource]
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import webbrowser
import time

# For wallet signature verification (optional imports)
try:
    from eth_account.messages import encode_defunct # type: ignore
    from eth_account import Account # type: ignore
except Exception as e:
    encode_defunct = None
    Account = None
    print("Warning: eth_account not available - some wallet features will be disabled.", e)

import hashlib
import hmac
import math
from collections import Counter
from werkzeug.utils import secure_filename

# For MySQL (optional)
try:
    import mysql.connector # type: ignore
except Exception as e:
    mysql = None
    print("Warning: mysql-connector-python not available - MySQL features will be disabled.", e)

# For Google OAuth (optional)
try:
    from authlib.integrations.flask_client import OAuth # pyright: ignore[reportMissingImports]
except Exception as e:
    OAuth = None
    print("Warning: authlib not available - OAuth features will be disabled.", e)

# Compute absolute path to the backend and resource directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Candidate template directories
candidate_templates_1 = os.path.abspath(os.path.join(BASE_DIR, '..', 'templates'))  # react-app/templates
candidate_templates_2 = os.path.abspath(os.path.join(BASE_DIR, '..', '..', 'templates'))  # repo-level templates/

# Choose templates dir: prefer react-app/templates if it has index.html, otherwise repo-level templates
if os.path.exists(os.path.join(candidate_templates_1, 'index.html')):
    TEMPLATES_DIR = candidate_templates_1
elif os.path.exists(os.path.join(candidate_templates_2, 'index.html')):
    TEMPLATES_DIR = candidate_templates_2
else:
    TEMPLATES_DIR = candidate_templates_1

# Candidate static directories
candidate_static_1 = os.path.abspath(os.path.join(BASE_DIR, '..'))  # react-app/
candidate_static_2 = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))  # repo root

# Prefer repo root static if it has common assets like style.css
if os.path.exists(os.path.join(candidate_static_2, 'style.css')):
    STATIC_DIR = candidate_static_2
else:
    STATIC_DIR = candidate_static_1

# Create Flask app with absolute template and static folder paths
app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)

# Enable CORS for all routes, which is useful for development
CORS(app)

# Configuration: allow overrides from environment for safer dev/prod usage
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a-secure-default-key-for-dev-only')
app.config['UPLOAD_FOLDER'] = os.environ.get('FLASK_UPLOAD_FOLDER', 'uploads')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['PORT'] = int(os.environ.get('FLASK_PORT', os.environ.get('PORT', 5501)))

# Google OAuth Configuration
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')

# Initialize OAuth if available
if OAuth is not None:
    oauth = OAuth(app)
    try:
        # Register Google OAuth client
        google = oauth.register(
            name='google',
            client_id=app.config['GOOGLE_CLIENT_ID'],
            client_secret=app.config['GOOGLE_CLIENT_SECRET'],
            access_token_url='https://accounts.google.com/o/oauth2/token',
            access_token_params=None,
            authorize_url='https://accounts.google.com/o/oauth2/auth',
            authorize_params=None,
            api_base_url='https://www.googleapis.com/oauth2/v1/',
            client_kwargs={'scope': 'openid email profile'},
        )
    except Exception as e:
        google = None
        print('Warning: failed to register Google OAuth client:', e)
else:
    oauth = None
    google = None

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Sample data for demonstration
SAMPLE_DEVICES = [
    {"id": 1, "name": "Smart Thermostat", "status": "online", "type": "iot"},
    {"id": 2, "name": "Security Camera", "status": "offline", "type": "iot"},
    {"id": 3, "name": "LED Lights", "status": "online", "type": "iot"}
]

SAMPLE_NFTS = [
    {"id": 1, "name": "Digital Art #1", "owner": "0x1234...", "verified": True},
    {"id": 2, "name": "Collectible #1", "owner": "0x5678...", "verified": False}
]

# In-memory storage for collected signatures
collected = []

def create_tables():
    """Create necessary MySQL tables if they don't exist."""
    if mysql_cursor is not None:
        mysql_cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'iot',
                status VARCHAR(50) DEFAULT 'online',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        mysql_cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255) NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        mysql_conn.commit()
        print("MySQL tables created.")

def populate_devices():
    """Populate MySQL devices table with data from devices.json if empty."""
    if mysql_cursor is not None:
        mysql_cursor.execute("SELECT COUNT(*) as count FROM devices")
        result = mysql_cursor.fetchone()
        if result['count'] == 0:
            if os.path.exists('devices.json'):
                with open('devices.json', 'r') as f:
                    devices = json.load(f)
                for device in devices:
                    mysql_cursor.execute("""
                        INSERT INTO devices (name, type, status, registered_at)
                        VALUES (%s, %s, %s, %s)
                    """, (device.get('name'), device.get('type', 'iot'), device.get('status', 'online'), device.get('registered_at', datetime.now().isoformat())))
                mysql_conn.commit()
                print("Devices populated from devices.json")

# MySQL setup (optional)
mysql_conn = None
mysql_cursor = None
if mysql is not None:
    try:
        mysql_conn = mysql.connector.connect(
            host=os.environ.get('MYSQL_HOST', 'localhost'),
            user=os.environ.get('MYSQL_USER', 'root'),
            password=os.environ.get('MYSQL_PASSWORD', ''),
            database=os.environ.get('MYSQL_DB', 'securechain')
        )
        mysql_cursor = mysql_conn.cursor(dictionary=True)
        print("MySQL connected successfully.")
        create_tables()
        populate_devices()
    except Exception as e:
        print(f"Warning: MySQL connection failed - {e}. Using JSON fallback.")
        mysql_conn = None
        mysql_cursor = None

DB_PATH = os.environ.get('FLASK_DB_PATH', os.path.join(BASE_DIR, 'securechain_backend.db'))
users_collection = None  # Backward compatibility for older branches that referenced Mongo.

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_sqlite_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                password TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_uid TEXT UNIQUE,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'iot',
                status TEXT DEFAULT 'online',
                registered_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT,
                action TEXT NOT NULL,
                severity TEXT DEFAULT 'low',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                meta_json TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threat_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target TEXT,
                threat_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT,
                confidence INTEGER,
                predicted_risk REAL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS count FROM devices")
        row = cursor.fetchone()
        if row and row["count"] == 0:
            seed_devices = []
            devices_json_path = os.path.join(BASE_DIR, 'devices.json')
            if os.path.exists(devices_json_path):
                with open(devices_json_path, 'r', encoding='utf-8') as f:
                    file_devices = json.load(f)
                for device in file_devices:
                    seed_devices.append({
                        "device_uid": str(device.get("deviceId") or device.get("id") or ""),
                        "name": device.get("deviceName") or device.get("name") or "Unknown Device",
                        "type": device.get("deviceType") or device.get("type") or "iot",
                        "status": device.get("status") or "online",
                        "registered_at": device.get("registeredAt") or device.get("registered_at") or datetime.now().isoformat()
                    })
            if not seed_devices:
                for d in SAMPLE_DEVICES:
                    seed_devices.append({
                        "device_uid": str(d.get("id")),
                        "name": d.get("name", "Unknown Device"),
                        "type": d.get("type", "iot"),
                        "status": d.get("status", "online"),
                        "registered_at": datetime.now().isoformat()
                    })
            for device in seed_devices:
                cursor.execute("""
                    INSERT OR IGNORE INTO devices (device_uid, name, type, status, registered_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (device["device_uid"] or None, device["name"], device["type"], device["status"], device["registered_at"]))
            conn.commit()

def load_users():
    users = {}
    with get_db_connection() as conn:
        rows = conn.execute("SELECT email, username, password, verified FROM users").fetchall()
        for row in rows:
            users[row["email"]] = {
                "username": row["username"] or "",
                "password": row["password"],
                "verified": bool(row["verified"])
            }
    return users

def save_users(users):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for email, payload in users.items():
            cursor.execute("""
                INSERT INTO users (email, username, password, verified, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET
                    username=excluded.username,
                    password=excluded.password,
                    verified=excluded.verified
            """, (
                email,
                payload.get("username", ""),
                payload.get("password", ""),
                1 if payload.get("verified") else 0,
                datetime.now().isoformat()
            ))
        conn.commit()

def _severity_weight(severity):
    key = (severity or "low").lower()
    if key == "critical":
        return 4.0
    if key == "high":
        return 3.0
    if key == "medium":
        return 2.0
    return 1.0

def predict_alert_risk_score(alert_rows):
    if not alert_rows:
        return 5.0
    base = 0.0
    for row in alert_rows:
        confidence = row.get("confidence") if isinstance(row, dict) else row["confidence"]
        severity = row.get("severity") if isinstance(row, dict) else row["severity"]
        conf = float(confidence if confidence is not None else 50.0) / 100.0
        base += (_severity_weight(severity) * 12.0) + (conf * 8.0)
    frequency_boost = min(20.0, len(alert_rows) * 2.5)
    score = min(100.0, base + frequency_boost)
    return round(score, 2)

def risk_level_from_score(score):
    if score >= 80:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "medium"
    return "low"

def recent_alerts(minutes):
    cutoff = datetime.now() - timedelta(minutes=minutes)
    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT id, target, threat_type, severity, description, confidence, predicted_risk, created_at
            FROM threat_alerts
            ORDER BY created_at DESC
            LIMIT 100
        """).fetchall()
    filtered = []
    for row in rows:
        created_text = row["created_at"]
        try:
            created_dt = datetime.fromisoformat(created_text)
        except Exception:
            continue
        if created_dt >= cutoff:
            filtered.append(dict(row))
    return filtered

def create_realtime_prediction():
    alerts_30m = recent_alerts(30)
    risk_score = predict_alert_risk_score(alerts_30m)
    risk_level = risk_level_from_score(risk_score)
    probability_next_15m = min(99, int(round((risk_score * 0.9) + min(len(alerts_30m), 10))))
    return {
        "timestamp": datetime.now().isoformat(),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "next_15_min_probability": probability_next_15m,
        "recent_alerts": alerts_30m[:25]
    }

REGION_HOTSPOTS = {
    "india": [
        {"name": "New Delhi", "x": 52, "y": 28},
        {"name": "Mumbai", "x": 43, "y": 44},
        {"name": "Bengaluru", "x": 49, "y": 61},
        {"name": "Hyderabad", "x": 54, "y": 54},
        {"name": "Chennai", "x": 59, "y": 63},
        {"name": "Kolkata", "x": 66, "y": 46},
        {"name": "Pune", "x": 45, "y": 49},
        {"name": "Kochi", "x": 51, "y": 72}
    ],
    "tamil-nadu": [
        {"name": "Chennai", "x": 56, "y": 40},
        {"name": "Coimbatore", "x": 42, "y": 62},
        {"name": "Madurai", "x": 50, "y": 70},
        {"name": "Tiruchirappalli", "x": 53, "y": 60},
        {"name": "Salem", "x": 49, "y": 54},
        {"name": "Tirunelveli", "x": 52, "y": 79},
        {"name": "Vellore", "x": 52, "y": 47},
        {"name": "Thoothukudi", "x": 57, "y": 83}
    ]
}

def _normalize_region(region_text):
    value = (region_text or "india").strip().lower()
    if value in ("tamilnadu", "tamil_nadu", "tn"):
        return "tamil-nadu"
    if value not in REGION_HOTSPOTS:
        return "india"
    return value

def _jitter(val, spread):
    return max(5, min(95, round(val + random.uniform(-spread, spread), 2)))

def _safe_int(value, fallback):
    try:
        return int(value)
    except Exception:
        return fallback

def _severity_from_risk(score):
    if score >= 80:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "medium"
    return "low"

def build_live_threat_map(region):
    region_key = _normalize_region(region)
    anchors = REGION_HOTSPOTS[region_key]
    prediction = create_realtime_prediction()
    alerts = recent_alerts(120)[:24]
    points = []
    spread = 5.0 if region_key == "india" else 3.2

    for idx, alert in enumerate(alerts):
        anchor = anchors[idx % len(anchors)]
        severity = str(alert.get("severity") or "low").lower()
        if severity not in ("low", "medium", "high", "critical"):
            severity = "medium"
        points.append({
            "id": f"alert-{alert.get('id', idx)}",
            "x": _jitter(anchor["x"], spread),
            "y": _jitter(anchor["y"], spread),
            "location": anchor["name"],
            "severity": severity,
            "type": alert.get("threat_type") or "Threat Event",
            "description": alert.get("description") or "Live alert correlated by AI model",
            "confidence": _safe_int(alert.get("confidence"), 60),
            "target": alert.get("target") or "",
            "first_seen": alert.get("created_at") or datetime.now().isoformat()
        })

    if not points:
        baseline_count = 8 if prediction["risk_score"] >= 45 else 5
        for i in range(baseline_count):
            anchor = anchors[i % len(anchors)]
            sev = _severity_from_risk(max(5, prediction["risk_score"] - random.uniform(0, 28)))
            points.append({
                "id": f"sim-{i}",
                "x": _jitter(anchor["x"], spread),
                "y": _jitter(anchor["y"], spread),
                "location": anchor["name"],
                "severity": sev,
                "type": "AI Predicted Anomaly",
                "description": "No recent alerts; point generated from live risk forecast",
                "confidence": min(95, max(48, int(prediction["risk_score"]))),
                "target": "predictive-model",
                "first_seen": datetime.now().isoformat()
            })

    return {
        "timestamp": datetime.now().isoformat(),
        "region": region_key,
        "risk_score": prediction["risk_score"],
        "risk_level": prediction["risk_level"],
        "next_15_min_probability": prediction["next_15_min_probability"],
        "threats": points[:30]
    }

init_sqlite_db()


# ===== STATIC FILE ROUTES =====
# Serve CSS files
@app.route('/style.css')
def serve_style_css():
    return send_from_directory(STATIC_DIR, 'style.css')

@app.route('/features.css')
def serve_features_css():
    return send_from_directory(STATIC_DIR, 'features.css')

# Serve JS files
@app.route('/main.js')
def serve_main_js():
    return send_from_directory(STATIC_DIR, 'main.js')

@app.route('/react.js')
def serve_react_js():
    return send_from_directory(STATIC_DIR, 'react.js')

@app.route('/server.js')
def serve_server_js():
    return send_from_directory(STATIC_DIR, 'server.js')

# Serve JSON files
@app.route('/devices.json')
def serve_devices_json():
    return send_from_directory(STATIC_DIR, 'devices.json')

# ===== HTML PAGE ROUTES =====
@app.route('/')
def index():
    logged_in = 'user' in session
    user_email = session.get('user') if logged_in else None
    login_time = session.get('login_time') if logged_in else None
    return render_template('index.html', logged_in=logged_in, user_email=user_email, login_time=login_time)


@app.route('/live')
def live():
    """Explicit rendered view of index.html for development/test."""
    logged_in = 'user' in session
    user_email = session.get('user') if logged_in else None
    login_time = session.get('login_time') if logged_in else None
    return render_template('index.html', logged_in=logged_in, user_email=user_email, login_time=login_time)


# Debug info endpoint to help verify paths and files
@app.route('/_debug_info')
def debug_info():
    return jsonify({
        'STATIC_DIR': STATIC_DIR,
        'TEMPLATES_DIR': TEMPLATES_DIR,
        'index_exists': os.path.exists(os.path.join(TEMPLATES_DIR, 'index.html'))
    })


@app.route('/debug_render')
def debug_render():
    """Return the rendered index.html for debugging. When called with ?verbose=1 and app.debug is True,
    a short snippet and length will be logged to the Flask logger. This is safe for local/dev use only.
    """
    logged_in = 'user' in session
    user_email = session.get('user') if logged_in else None
    login_time = session.get('login_time') if logged_in else None
    html = render_template('index.html', logged_in=logged_in, user_email=user_email, login_time=login_time)
    if request.args.get('verbose') == '1' and app.debug:
        try:
            snippet = html.replace('\n', ' ')[:300]
        except Exception:
            snippet = str(html)[:300]
        app.logger.debug("/debug_render: length=%d snippet=%s", len(html), snippet)
    return html

@app.route('/<page_name>.html')
def serve_html_page(page_name):
    """Generic route to serve any .html file from the templates directory."""
    logged_in = 'user' in session
    user_email = session.get('user', '')
    login_time = session.get('login_time', '')
    template_name = f"{page_name}.html"
    
    # Security: Ensure the page_name is simple and doesn't contain path traversal characters.
    if not page_name.isalnum() and '_' not in page_name:
        return "Invalid page name", 404
        
    template_path = os.path.join(TEMPLATES_DIR, template_name)
    if not os.path.exists(template_path):
        return "Page not found", 404
        
    return render_template(template_name, logged_in=logged_in, user_email=user_email, login_time=login_time)

@app.route('/react')
@app.route('/react/<path:path>')
def react(path=None):
    return send_from_directory('../frontend/react-app/build', 'index.html')

@app.route('/react/static/<path:filename>')
def serve_react_static(filename):
    return send_from_directory('../frontend/react-app/build/static', filename)

# ===== API ROUTES =====
@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all IoT devices"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute("""
                SELECT id, device_uid, name, type, status, registered_at
                FROM devices
                ORDER BY id DESC
            """).fetchall()
        devices = []
        for row in rows:
            devices.append({
                'id': row['id'],
                'deviceId': row['device_uid'],
                'name': row['name'],
                'deviceName': row['name'],
                'type': row['type'],
                'deviceType': row['type'],
                'status': row['status'],
                'registered_at': row['registered_at'],
                'registeredAt': row['registered_at']
            })
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['POST'])
def add_device():
    """Add a new IoT device"""
    try:
        data = request.json or {}
        name = data.get('name') or data.get('deviceName')
        if not name:
            return jsonify({'error': 'Device name is required'}), 400
        device_uid = data.get('deviceId') or data.get('device_uid')
        device_type = data.get('type') or data.get('deviceType') or 'iot'
        status = data.get('status') or 'online'
        registered_at = datetime.now().isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO devices (device_uid, name, type, status, registered_at)
                VALUES (?, ?, ?, ?, ?)
            """, (device_uid, name, device_type, status, registered_at))
            device_id = cursor.lastrowid
            conn.commit()

        new_device = {
            'id': device_id,
            'deviceId': device_uid,
            'name': name,
            'deviceName': name,
            'type': device_type,
            'deviceType': device_type,
            'status': status,
            'registered_at': registered_at,
            'registeredAt': registered_at
        }
        return jsonify(new_device), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Device ID already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nfts', methods=['GET'])
def get_nfts():
    """Get all NFTs"""
    return jsonify(SAMPLE_NFTS)

@app.route('/api/verify-nft', methods=['POST'])
def verify_nft():
    """Verify an NFT"""
    try:
        data = request.json
        nft_id = data.get('nft_id')
        
        # Simulate verification process
        if nft_id:
            return jsonify({
                'success': True,
                'message': f'NFT {nft_id} verified successfully',
                'nft_id': nft_id,
                'verified': True,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'success': False, 'error': 'NFT ID is required'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/threat-scan', methods=['POST'])
def threat_scan():
    """Perform threat scan"""
    try:
        data = request.json or {}
        target = str(data.get('target', '')).strip()
        if not target:
            return jsonify({'success': False, 'error': 'target is required'}), 400

        target_l = target.lower()
        threats = []

        if any(k in target_l for k in ['.exe', 'payload', 'trojan', 'malware']):
            threats.append({
                'type': 'Malware Signature',
                'severity': 'high',
                'description': 'Executable payload pattern detected in scan target',
                'confidence': 86
            })
        if any(k in target_l for k in ['admin', 'login', 'auth', 'credential']):
            threats.append({
                'type': 'Unauthorized Access Pattern',
                'severity': 'medium',
                'description': 'Brute-force or credential abuse indicators found',
                'confidence': 72
            })
        if target_l.startswith('http') and any(k in target_l for k in ['bit.ly', 'tinyurl', '.ru', 'free-claim', 'verify-wallet']):
            threats.append({
                'type': 'Phishing URL',
                'severity': 'high',
                'description': 'URL characteristics indicate phishing or redirection risk',
                'confidence': 81
            })
        if not threats:
            threats.append({
                'type': 'Suspicious Behavior',
                'severity': 'low',
                'description': 'No direct signature match; anomaly baseline monitoring recommended',
                'confidence': 55
            })

        now_iso = datetime.now().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for threat in threats:
                cursor.execute("""
                    INSERT INTO threat_alerts (target, threat_type, severity, description, confidence, predicted_risk, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    target,
                    threat['type'],
                    threat['severity'],
                    threat['description'],
                    threat['confidence'],
                    0,
                    now_iso
                ))
                cursor.execute("""
                    INSERT INTO analytics (device_id, action, severity, timestamp, meta_json)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    data.get('device_id') or data.get('deviceId') or target,
                    'threat_scan',
                    threat['severity'],
                    now_iso,
                    json.dumps({'threat_type': threat['type'], 'target': target})
                ))
            conn.commit()

        prediction = create_realtime_prediction()
        return jsonify({
            'success': True,
            'target': target,
            'threats_found': len(threats),
            'threats': threats,
            'scan_time': now_iso,
            'prediction': {
                'risk_score': prediction['risk_score'],
                'risk_level': prediction['risk_level'],
                'next_15_min_probability': prediction['next_15_min_probability']
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def _shannon_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    length = len(data)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())

def analyze_file_content(filename: str, content: bytes) -> dict:
    """Best-effort static file risk analysis from file bytes and metadata."""
    name_l = (filename or "").lower()
    file_size = len(content)
    sha256 = hashlib.sha256(content).hexdigest()
    entropy = round(_shannon_entropy(content[:1024 * 1024]), 3)
    indicators = []
    score = 0
    severity = "low"

    suspicious_ext = {
        ".exe": 50, ".dll": 45, ".bat": 40, ".cmd": 40, ".ps1": 40,
        ".vbs": 35, ".js": 25, ".jar": 25, ".scr": 45, ".msi": 35
    }
    for ext, points in suspicious_ext.items():
        if name_l.endswith(ext):
            score += points
            indicators.append({
                "type": "Risky Extension",
                "severity": "high" if points >= 35 else "medium",
                "description": f"Extension {ext} is commonly abused in malware delivery"
            })
            break

    if content.startswith(b"MZ"):
        score += 35
        indicators.append({
            "type": "Portable Executable",
            "severity": "high",
            "description": "Windows executable header detected (MZ)"
        })
    elif content.startswith(b"\x7fELF"):
        score += 30
        indicators.append({
            "type": "ELF Binary",
            "severity": "high",
            "description": "Linux executable header detected (ELF)"
        })

    content_l = content.lower()
    pattern_checks = [
        (b"powershell -enc", 35, "Encoded PowerShell"),
        (b"invoke-expression", 35, "Code Execution Primitive"),
        (b"cmd.exe /c", 25, "Shell Execution Primitive"),
        (b"wget http", 20, "Remote Payload Fetch"),
        (b"curl http", 20, "Remote Payload Fetch"),
        (b"base64,", 15, "Base64 Embedded Payload"),
        (b"eval(", 15, "Dynamic Code Execution"),
        (b"document.cookie", 15, "Credential/Session Access"),
        (b"vba", 10, "Macro-like Content"),
        (b"autopen", 20, "Office Macro Auto-Execution"),
    ]
    for needle, points, label in pattern_checks:
        if needle in content_l:
            score += points
            indicators.append({
                "type": label,
                "severity": "high" if points >= 25 else "medium",
                "description": f"Matched pattern: {needle.decode('utf-8', errors='ignore')}"
            })

    if entropy >= 7.2 and file_size > 8192:
        score += 20
        indicators.append({
            "type": "Packed/Obfuscated Content",
            "severity": "medium",
            "description": f"High entropy ({entropy}) may indicate packing or encryption"
        })

    if score >= 80:
        severity = "high"
    elif score >= 40:
        severity = "medium"

    harmful = score >= 60 or any(i["severity"] == "high" for i in indicators)
    verdict = "harmful" if harmful else "not_harmful"
    confidence = min(99, 45 + int(score * 0.6))

    return {
        "verdict": verdict,
        "harmful": harmful,
        "severity": severity,
        "confidence": confidence,
        "risk_score": min(100, score),
        "sha256": sha256,
        "file_size": file_size,
        "entropy": entropy,
        "indicators": indicators[:12]
    }

@app.route('/api/upload', methods=['POST'])
def handle_upload():
    """Handle file uploads"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file and run content scan
        safe_name = secure_filename(file.filename or "uploaded_file")
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_name}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        content = file.read()
        with open(file_path, 'wb') as out:
            out.write(content)

        scan_result = analyze_file_content(filename, content)
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO threat_alerts (target, threat_type, severity, description, confidence, predicted_risk, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                filename,
                "File Content Scan",
                scan_result["severity"],
                f"Upload scanned: verdict={scan_result['verdict']}, risk_score={scan_result['risk_score']}",
                scan_result["confidence"],
                float(scan_result["risk_score"]) / 100.0,
                datetime.now().isoformat()
            ))
            conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'filename': filename,
            'file_path': file_path,
            'upload_time': datetime.now().isoformat(),
            'scan': scan_result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wallet/connect', methods=['POST'])
def connect_wallet():
    """Simulate wallet connection"""
    try:
        data = request.json
        wallet_address = data.get('walletAddress') or data.get('wallet_address')

        if wallet_address:
            return jsonify({
                'success': True,
                'message': 'Wallet connected successfully',
                'wallet_address': wallet_address,
                'connected_at': datetime.now().isoformat()
            })
        else:
            return jsonify({'success': False, 'error': 'Wallet address is required'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data for dashboard"""
    try:
        with get_db_connection() as conn:
            total_devices = conn.execute("SELECT COUNT(*) AS c FROM devices").fetchone()["c"]
            at_risk_devices = conn.execute("""
                SELECT COUNT(*) AS c FROM devices
                WHERE lower(status) IN ('at-risk', 'offline', 'compromised', 'quarantined')
            """).fetchone()["c"]
            vulnerabilities = conn.execute("""
                SELECT COUNT(*) AS c FROM threat_alerts
                WHERE lower(severity) IN ('high', 'critical')
                  AND datetime(created_at) >= datetime('now', '-24 hours')
            """).fetchone()["c"]

            threat_rows = conn.execute("""
                SELECT threat_type, COUNT(*) AS c
                FROM threat_alerts
                GROUP BY threat_type
                ORDER BY c DESC
                LIMIT 5
            """).fetchall()

            timeline_labels = []
            timeline_data = []
            for i in range(6, -1, -1):
                day = datetime.now() - timedelta(days=i)
                day_key = day.strftime('%Y-%m-%d')
                day_label = day.strftime('%b %d')
                day_count = conn.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM analytics WHERE date(timestamp)=?) +
                        (SELECT COUNT(*) FROM threat_alerts WHERE date(created_at)=?) AS c
                """, (day_key, day_key)).fetchone()["c"]
                timeline_labels.append(day_label)
                timeline_data.append(int(day_count))

        secure_devices = max(total_devices - at_risk_devices, 0)
        threat_types = [row["threat_type"] for row in threat_rows] or ['No Threats']
        threat_data = [int(row["c"]) for row in threat_rows] or [0]
        prediction = create_realtime_prediction()

        return jsonify({
            'total_devices': int(total_devices),
            'secure_devices': int(secure_devices),
            'at_risk_devices': int(at_risk_devices),
            'vulnerabilities': int(vulnerabilities),
            'threat_types': threat_types,
            'threat_data': threat_data,
            'timeline_labels': timeline_labels,
            'timeline_data': timeline_data,
            'prediction': {
                'risk_score': prediction['risk_score'],
                'risk_level': prediction['risk_level'],
                'next_15_min_probability': prediction['next_15_min_probability']
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics', methods=['POST'])
def add_analytics():
    """Add analytics record"""
    try:
        data = request.json or {}
        if not data:
            return jsonify({'error': 'Data is required'}), 400

        ts = data.get('timestamp', datetime.now().isoformat())
        action = data.get('action') or 'event'
        severity = data.get('severity') or 'low'
        device_id = data.get('device_id') or data.get('deviceId')
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO analytics (device_id, action, severity, timestamp, meta_json)
                VALUES (?, ?, ?, ?, ?)
            """, (
                device_id,
                action,
                severity,
                ts,
                json.dumps(data)
            ))
            analytic_id = cursor.lastrowid
            conn.commit()

        record = {
            'id': analytic_id,
            'device_id': device_id,
            'deviceId': device_id,
            'action': action,
            'severity': severity,
            'timestamp': ts
        }
        return jsonify(record), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts/realtime', methods=['GET'])
def realtime_alerts():
    """Return real-time alert prediction and recent alert stream."""
    try:
        payload = create_realtime_prediction()
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/threat-map/live', methods=['GET'])
def live_threat_map():
    """Return AI-correlated live threat points for India/Tamil Nadu map view."""
    try:
        region = request.args.get('region', 'india')
        payload = build_live_threat_map(region)
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices/advanced', methods=['POST'])
def add_device_advanced():
    """Add a new IoT device with advanced registration"""
    try:
        data = request.json or {}
        if not data or 'deviceId' not in data or 'deviceName' not in data:
            return jsonify({'error': 'Device ID and Name are required'}), 400

        registered_at = datetime.now().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO devices (device_uid, name, type, status, registered_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                data['deviceId'],
                data['deviceName'],
                data.get('deviceType', 'Environmental Sensor'),
                data.get('status', 'online'),
                registered_at
            ))
            new_id = cursor.lastrowid
            conn.commit()

        new_device = {
            'id': new_id,
            'deviceId': data['deviceId'],
            'deviceName': data['deviceName'],
            'deviceType': data.get('deviceType', 'Environmental Sensor'),
            'secret': data.get('secret', ''),  # Assume encrypted on client
            'status': data.get('status', 'online'),
            'registeredAt': registered_at
        }
        return jsonify({'success': True, 'message': f'Device {data["deviceId"]} registered successfully', 'device': new_device}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Device ID already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices/advanced', methods=['GET'])
def get_devices_advanced():
    """Get all IoT devices for advanced view"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute("""
                SELECT id, device_uid, name, type, status, registered_at
                FROM devices
                ORDER BY id DESC
            """).fetchall()
        devices = [{
            'id': row['id'],
            'deviceId': row['device_uid'],
            'deviceName': row['name'],
            'deviceType': row['type'],
            'status': row['status'],
            'registeredAt': row['registered_at']
        } for row in rows]
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chatbot messages and return responses"""
    try:
        data = request.json
        message = data.get('message', '').strip().lower()
        response = ""

        if not message:
            response = "Hello! I'm the SecureChain Assistant. How can I help you today? Ask about our features like AI, IoT, or NFT."
        elif 'hello' in message or 'hi' in message or 'hey' in message:
            response = "Hello! I'm the SecureChain Assistant. How can I help you today? Ask about our features like AI, IoT, or NFT."
        elif 'list' in message and 'feature' in message or 'all' in message and 'feature' in message:
            response = "SecureChain offers: AI Threat Detection (ML-based real-time analysis), IoT Device Management (secure registration and monitoring), NFT Verification (blockchain-based authenticity), Cybersecurity Tools (threat scanning and mapping), Analytics Dashboard (insights and reports), Wallet Integration (secure blockchain connections). Which feature would you like to know more about?"
        elif 'ai' in message or 'threat' in message:
            response = "AI Threat Detection uses machine learning algorithms to analyze network traffic, user behavior, and logs for anomalies. It predicts and neutralizes threats proactively, integrating with analytics for detailed reports."
        elif 'iot' in message or 'device' in message:
            response = "IoT Device Management allows secure registration of devices, monitors their status, and ensures encrypted communication. It prevents unauthorized access and provides real-time alerts."
        elif 'nft' in message or 'verification' in message:
            response = "NFT Verification confirms the authenticity and ownership of non-fungible tokens using blockchain technology. It checks signatures and metadata for fraud prevention."
        elif 'cyber' in message or 'security' in message or 'threat scan' in message:
            response = "Cybersecurity Tools include threat scanning, mapping global threats, and automated incident response. It uses AI for behavioral analysis and signature detection."
        elif 'analytics' in message or 'dashboard' in message:
            response = "Analytics Dashboard provides visualizations of device data, threats, and performance metrics. It helps in decision-making with real-time charts and reports."
        elif 'wallet' in message or 'blockchain' in message:
            response = "Wallet Integration enables secure connection to blockchain wallets, signature verification, and transaction management. It supports multiple providers with nonce-based security."
        elif 'quantum' in message or 'encrypted' in message:
            response = "Quantum Security uses advanced encryption for future-proofing against quantum threats. Encrypted Communications ensure all data is protected with end-to-end encryption."
        elif 'threat scan' in message or 'scan threat' in message:
            response = "Threat Scan uses AI-powered analysis to detect potential security threats in your system or network. It scans for malware, anomalies, and vulnerabilities, providing a detailed report with severity levels and recommendations for mitigation."
        elif 'upload file' in message or 'upload' in message:
            response = "Upload File allows you to securely submit files for analysis. The system checks for malware, viruses, and other threats using advanced scanning techniques, ensuring safe handling of your data."
        elif 'register iot' in message or 'iot register' in message:
            response = "Register IoT enables secure registration of Internet of Things devices. It assigns unique identifiers, verifies authenticity, and integrates devices into the trusted network for monitored communication."
        elif 'verify nft' in message or 'nft verify' in message:
            response = "Verify NFT confirms the authenticity and ownership of non-fungible tokens. It checks blockchain records, signatures, and metadata to prevent fraud and ensure the NFT's legitimacy."
        elif 'view analytics' in message or 'analytics' in message:
            response = "View Analytics provides comprehensive dashboards and reports on system performance, threats, and device metrics. It uses data visualization to help you understand trends and make informed security decisions."
        elif 'connect wallet' in message or 'wallet connect' in message:
            response = "Connect Wallet securely links your blockchain wallet for transactions and interactions. It verifies signatures, manages connections, and ensures encrypted communication with the network."
        elif 'audit contract' in message or 'contract audit' in message:
            response = "Audit Contract analyzes smart contracts for vulnerabilities, bugs, and security flaws. It uses automated tools to review code, identify risks, and suggest improvements for safer blockchain deployments."
        elif 'scan url' in message or 'url scan' in message:
            response = "Scan URL checks web addresses for phishing, malware, and other threats. It analyzes links in real-time, providing safety assessments and warnings to protect against malicious sites."
        elif 'scan' in message:
            # Simulate threat scan response
            response = "Threat scan completed. Found 1 threat. Details: Potential malware signature detected"
        elif 'help' in message:
            response = "Commands: help, scan, wallet, block. Or ask about features like AI, IoT, NFT."
        elif 'wallet' in message and 'connect' in message:
            response = "Wallet connected successfully. Address verified."
        elif 'block' in message:
            response = "Block verified on the blockchain."
        else:
            response = "I'm sorry, I didn't understand. Try asking about AI, IoT, NFT, or say 'list all features'."

        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'response': 'An error occurred. Please try again.'}), 500

@app.route('/api/wallet/collect', methods=['POST'])
def wallet_collect():
    """Collect wallet signature"""
    if Account is None or encode_defunct is None:
        return jsonify({'error': 'Ethereum signature verification is not available on the server.'}), 501
    try:
        data = request.json
        address = data.get('address')
        message = data.get('message')
        signature = data.get('signature')
        provider = data.get('provider', 'unknown')

        if not address or not message or not signature:
            return jsonify({'error': 'address, message, signature required'}), 400

        # Verify signature
        clean = message.strip()
        recovered = Account.recover_message(encode_defunct(text=clean), signature=signature)
        if recovered.lower() != address.lower():
            return jsonify({'error': 'Signature verification failed'}), 401

        # Check nonce freshness
        lines = [l.strip() for l in clean.split('\n')]
        nonce_line = next((l for l in lines if l.lower().startswith('nonce:')), None)
        if not nonce_line:
            return jsonify({'error': 'Missing nonce'}), 400
        nonce = int(nonce_line.split(':')[1])
        max_age_seconds = 5 * 60  # 5 minutes
        if abs(int(datetime.now().timestamp()) - nonce) > max_age_seconds:
            return jsonify({'error': 'Nonce expired or invalid'}), 400

        # Save to in-memory
        collected.append({'address': address, 'provider': provider, 'signedAt': datetime.now().isoformat()})

        return jsonify({'ok': True, 'address': address, 'collectedCount': len(collected)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New POST endpoint for submitting user data
@app.route('/submit-data-endpoint', methods=['POST'])
def submit_data():
    """Submit user data"""
    try:
        data = request.json or {}
        user_name = (data.get('user_name') or '').strip()
        user_email = (data.get('user_email') or '').strip().lower()

        # Validation
        if not user_name or not user_email:
            return jsonify({'message': 'Missing required fields.'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            existing = cursor.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
            if existing:
                cursor.execute("UPDATE users SET username=? WHERE email=?", (user_name, user_email))
            else:
                cursor.execute("""
                    INSERT INTO users (email, username, password, verified, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_email, user_name, '', 0, datetime.now().isoformat()))
            conn.commit()

        return jsonify({
            'message': 'User created successfully!',
            'data': {'name': user_name, 'email': user_email}
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Basic healthcheck for UI and automation."""
    try:
        with get_db_connection() as conn:
            users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
            devices = conn.execute("SELECT COUNT(*) AS c FROM devices").fetchone()["c"]
            analytics = conn.execute("SELECT COUNT(*) AS c FROM analytics").fetchone()["c"]
            alerts = conn.execute("SELECT COUNT(*) AS c FROM threat_alerts").fetchone()["c"]
        return jsonify({
            "status": "ok",
            "database": "connected",
            "counts": {
                "users": int(users),
                "devices": int(devices),
                "analytics": int(analytics),
                "alerts": int(alerts)
            },
            "time": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "database": "disconnected", "error": str(e)}), 500

# ===== AUTH ROUTES =====
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        username = (data.get('username') or '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            existing = cursor.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if existing:
                return jsonify({'error': 'User already exists'}), 400
            cursor.execute("""
                INSERT INTO users (email, username, password, verified, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                email,
                username,
                generate_password_hash(password),
                0,
                datetime.now().isoformat()
            ))
            conn.commit()

        return jsonify({'message': 'Signup successful'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user_data = None
        with get_db_connection() as conn:
            row = conn.execute("""
                SELECT email, username, password, verified
                FROM users
                WHERE email = ?
            """, (email,)).fetchone()
            if row:
                user_data = {
                    'email': row['email'],
                    'username': row['username'] or row['email'],
                    'password': row['password'],
                    'verified': bool(row['verified'])
                }

        if user_data is None or not check_password_hash(user_data['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401

        session['user'] = email
        session['login_time'] = datetime.now().isoformat()

        # Create a dummy access token for the frontend
        # In a real application, you would use a library like Flask-JWT-Extended to create a proper token
        access_token = secrets.token_hex(16)

        # Return username and token, which the frontend expects
        return jsonify({
            'message': 'Login successful', 'username': user_data.get('username', email), 'access_token': access_token
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/remove-login', methods=['POST'])
def remove_login():
    try:
        data = request.json or {}
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE email = ?", (email,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({'error': 'User not found'}), 404

        # If the user is currently logged in, log them out
        if session.get('user') == email: # pyright: ignore[reportUnboundVariable]
            session.pop('user', None)
            session.pop('login_time', None)

        return jsonify({'message': f'User {email} removed successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth-status', methods=['GET'])
def auth_status():
    """Return whether a user is logged in and the user email (if any)."""
    try:
        logged_in = 'user' in session
        user_email = session.get('user') if logged_in else None
        return jsonify({'logged_in': logged_in, 'email': user_email}), 200
    except Exception as e:
        return jsonify({'logged_in': False, 'email': None, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user', None)
    session.pop('login_time', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

# ===== GOOGLE OAUTH ROUTES =====
@app.route('/google-login')
def google_login():
    if google is None:
        return 'Google OAuth not configured.', 501
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/google-callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        resp = google.get('userinfo')
        user_info = resp.json()
        

        email = user_info['email']
        name = user_info.get('name', '')

        # Load users
        users = load_users()

        # Check if user exists
        if email not in users:
            # Create new user
            users[email] = {
                'username': name,
                'password': '',  # No password for Google users
                'verified': True,
                'google_id': user_info['id']
            }
            save_users(users)

        # Login user
        session['user'] = email
        session['login_time'] = datetime.now().isoformat()

        return redirect(url_for('index'))
    except Exception as e:
        print(f"Google OAuth error: {e}")
        flash('Google login failed. Please try again.', 'error')
        return redirect(url_for('login'))

# POST endpoint for /templates/
@app.route('/templates/', methods=['POST'])
def handle_post():
    try:
        data = request.get_json()
        # Process the data as needed, e.g., log it or save to a file
        print('Received POST data:', data)
        return jsonify({'message': 'Data received successfully', 'received': data}), 200
    except Exception as e:
        return jsonify({'error': 'Invalid JSON or server error', 'detail': str(e)}), 400

# ===== CATCH-ALL STATIC FILE ROUTE =====
@app.route('/<path:filename>')
def serve_static_files(filename):
    """Serve any static files that aren't caught by specific routes"""
    if filename.endswith(('.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.ico')):
        return send_from_directory(STATIC_DIR, filename)
    elif filename.endswith('.html'):
        try:
            return render_template(filename)
        except:
            return render_template('index.html')  # Fallback to index.html if file not found
    return render_template('index.html')  # Default to index.html for any other requests

# ===== ERROR HANDLERS =====
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = app.config.get('PORT', 5501)
    url = f'http://127.0.0.1:{port}'
    try:
        webbrowser.open(url)
    except Exception:
        pass
    app.run(debug=True, host='127.0.0.1', port=port)
