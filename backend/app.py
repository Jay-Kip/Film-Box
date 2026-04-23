from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import random, string

app = Flask(__name__)
CORS(app)

# -------------------------------
# DATABASE SETUP (SQLite)
# -------------------------------
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # comments
    c.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            text TEXT
        )
    """)

    # ratings (with device tracking)
    c.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER,
            device TEXT
        )
    """)

    conn.commit()
    conn.close()

init_db()

# -------------------------------
# TOKEN STORAGE (temporary)
# -------------------------------
valid_tokens = {}

def generate_token():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

# 🎬 RELEASE DATE
RELEASE_DATE = datetime(2026, 5, 5, 0, 0, 0)

# -------------------------------
# 🔐 DEVICE IDENTIFIER (simple)
# -------------------------------
def get_device():
    ip = request.remote_addr
    ua = request.headers.get("User-Agent")
    return f"{ip}-{ua}"

# -------------------------------
# 💰 MOCK PAYMENT
# -------------------------------
@app.route('/pay', methods=['POST'])
def pay():
    phone = request.json.get("phone")

    token = generate_token()

    valid_tokens[token] = {
        "phone": phone
    }

    return jsonify({
        "token": token
    })

# -------------------------------
# 🎬 VIDEO ACCESS + COUNTDOWN
# -------------------------------
@app.route('/get-video')
def get_video():
    token = request.args.get("token")

    if token not in valid_tokens:
        return jsonify({"error": "Invalid token"}), 403

    now = datetime.now()

    if now < RELEASE_DATE:
        return jsonify({
            "status": "locked",
            "release_date": RELEASE_DATE.strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify({
        "status": "unlocked",
        "video_url": "https://russellmisarable.s3.eu-north-1.amazonaws.com/index.m3u8"
    })

# -------------------------------
# 💬 ADD COMMENT
# -------------------------------
@app.route('/comment', methods=['POST'])
def comment():
    name = request.json.get("name")
    text = request.json.get("text")

    if not name or not text:
        return jsonify({"error": "Missing fields"}), 400

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO comments (name, text) VALUES (?, ?)", (name, text))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

# -------------------------------
# 💬 GET COMMENTS
# -------------------------------
@app.route('/comments')
def get_comments():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT name, text FROM comments ORDER BY id DESC")
    data = c.fetchall()

    conn.close()

    return jsonify(data)

# -------------------------------
# ⭐ RATE FILM (NO BUTTON FLOW)
# -------------------------------
@app.route('/rate', methods=['POST'])
def rate():
    rating = request.json.get("rating")

    # ✅ Validate rating
    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"error": "Invalid rating"}), 400

    device = get_device()

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # 🚫 Prevent duplicate rating per device
    c.execute("SELECT * FROM ratings WHERE device=?", (device,))
    existing = c.fetchone()

    if existing:
        conn.close()
        return jsonify({"error": "You already rated"}), 403

    # ✅ Insert rating
    c.execute(
        "INSERT INTO ratings (rating, device) VALUES (?, ?)",
        (rating, device)
    )

    conn.commit()

    # 📊 Return updated stats immediately
    c.execute("SELECT rating FROM ratings")
    ratings = [r[0] for r in c.fetchall()]

    conn.close()

    avg = round(sum(ratings) / len(ratings), 1)

    return jsonify({
        "status": "ok",
        "avg": avg,
        "count": len(ratings)
    })

# -------------------------------
# 📊 GET RATINGS
# -------------------------------
@app.route('/ratings')
def get_ratings():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT rating FROM ratings")
    data = [r[0] for r in c.fetchall()]

    conn.close()

    if len(data) == 0:
        return jsonify({"avg": 0, "count": 0})

    avg = round(sum(data) / len(data), 1)

    return jsonify({
        "avg": avg,
        "count": len(data)
    })

# -------------------------------
# 🚀 RUN SERVER
# -------------------------------
if __name__ == "__main__":
    app.run(debug=True)
