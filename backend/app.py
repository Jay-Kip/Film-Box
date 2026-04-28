# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import string
import json
import sqlite3
import os

from mpesa import stk_push
from models import session, Ticket, init_db

app = Flask(__name__)
# NEW
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type", "x-admin-password"]}})

# -----------------------------------
# DATABASE INIT
# -----------------------------------

init_db()

def init_ratings_table():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER,
            token TEXT UNIQUE
        )
    """)

    conn.commit()
    conn.close()

init_ratings_table()

# -----------------------------------
# SETTINGS
# -----------------------------------

RELEASE_DATE = datetime(2026, 1, 1, 0, 0, 0)
TICKET_PRICE = 100  # KES — update if price changes

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin1234")  # set in .env

def generate_token():
    return ''.join(
        random.choices(
            string.ascii_letters + string.digits,
            k=24
        )
    )

# -----------------------------------
# 🔐 ADMIN AUTH HELPER
# -----------------------------------

def admin_auth():
    """Returns True if the request has the correct admin password header."""
    return request.headers.get("x-admin-password") == ADMIN_PASSWORD


# -----------------------------------
# 💰 START PAYMENT (STK PUSH)
# -----------------------------------

@app.route("/pay", methods=["POST"])
def pay():
    try:
        phone = request.json.get("phone")

        if not phone:
            return jsonify({
                "error": "Phone number is required"
            }), 400

        response = stk_push(phone)
        print("STK RESPONSE:", response)

        if response.get("ResponseCode") != "0":
            return jsonify({
                "error": response.get("errorMessage", "STK Push failed")
            }), 400

        checkout_id = response.get("CheckoutRequestID")

        existing = session.query(Ticket).filter_by(
            checkout_id=checkout_id
        ).first()

        if not existing:
            pending_ticket = Ticket(
                token=None,
                phone=phone,
                checkout_id=checkout_id,
                payment_status="pending",
                paid=False,
                mpesa_receipt=None,
                expires_at=datetime.now() + timedelta(days=30)
            )

            session.add(pending_ticket)
            session.commit()

        return jsonify({
            "success": True,
            "message": "STK Push sent successfully",
            "checkout_id": checkout_id
        })

    except Exception as e:
        print("PAY ERROR:", str(e))

        return jsonify({
            "error": str(e)
        }), 500


# -----------------------------------
# 🔁 MPESA CALLBACK
# -----------------------------------

@app.route("/callback", methods=["POST"])
def callback():
    try:
        data = request.get_json(force=True)

        print("CALLBACK DATA:")
        print(json.dumps(data, indent=2))

        result = data["Body"]["stkCallback"]

        checkout_id = result.get("CheckoutRequestID")
        result_code = result.get("ResultCode")

        ticket = session.query(Ticket).filter_by(
            checkout_id=checkout_id
        ).first()

        if not ticket:
            print("⚠️ Ticket not found")
            return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

        if ticket.payment_status == "paid":
            print("⚠️ Payment already processed")
            return jsonify({"ResultCode": 0, "ResultDesc": "Already processed"}), 200

        if result_code != 0:
            ticket.payment_status = "failed"
            ticket.paid = False
            session.commit()
            print("❌ Payment failed")
            return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

        metadata = result.get("CallbackMetadata", {}).get("Item", [])

        receipt = None
        amount = None

        for item in metadata:
            if item.get("Name") == "MpesaReceiptNumber":
                receipt = item.get("Value")
            if item.get("Name") == "Amount":
                amount = item.get("Value")

        token = generate_token()

        ticket.token = token
        ticket.payment_status = "paid"
        ticket.paid = True
        ticket.mpesa_receipt = receipt

        session.commit()

        print("✅ PAYMENT VERIFIED")
        print("🎟 TOKEN:", token)
        print("📄 RECEIPT:", receipt)
        print("💰 AMOUNT:", amount)

        return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

    except Exception as e:
        print("CALLBACK ERROR:", str(e))
        return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200


# -----------------------------------
# 🔍 CHECK PAYMENT STATUS
# -----------------------------------

@app.route("/check-payment-status")
def check_payment_status():
    checkout_id = request.args.get("checkout_id")

    if not checkout_id:
        return jsonify({"error": "checkout_id required"}), 400

    ticket = session.query(Ticket).filter_by(
        checkout_id=checkout_id
    ).first()

    if not ticket:
        return jsonify({"status": "not_found"})

    if ticket.payment_status == "paid":
        return jsonify({"status": "paid", "token": ticket.token})

    if ticket.payment_status == "failed":
        return jsonify({"status": "failed"})

    return jsonify({"status": "pending"})


# -----------------------------------
# 🎬 VIDEO ACCESS
# -----------------------------------

@app.route("/get-video")
def get_video():
    token = request.args.get("token")

    if not token:
        return jsonify({"error": "Token required"}), 400

    ticket = session.query(Ticket).filter_by(token=token).first()

    if not ticket:
        return jsonify({"error": "Invalid ticket"}), 403

    if not ticket.paid:
        return jsonify({"error": "Payment not completed"}), 403

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


# -----------------------------------
# ⭐ RATE MOVIE
# -----------------------------------

@app.route("/rate", methods=["POST"])
def rate():
    token = request.json.get("token")
    rating = request.json.get("rating")

    if not token:
        return jsonify({"error": "Buy a ticket first"}), 403

    if not rating:
        return jsonify({"error": "Rating required"}), 400

    ticket = session.query(Ticket).filter_by(token=token).first()

    if not ticket:
        return jsonify({"error": "Invalid ticket"}), 403

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM ratings WHERE token = ?", (token,))
    existing = c.fetchone()

    if existing:
        conn.close()
        return jsonify({"error": "You already rated this movie"})

    c.execute("INSERT INTO ratings (rating, token) VALUES (?, ?)", (rating, token))
    conn.commit()

    c.execute("SELECT rating FROM ratings")
    rows = c.fetchall()
    conn.close()

    ratings = [r[0] for r in rows]
    avg = round(sum(ratings) / len(ratings), 1)

    return jsonify({"success": True, "avg": avg, "count": len(ratings)})


# -----------------------------------
# 📊 GET RATINGS
# -----------------------------------

@app.route("/ratings")
def get_ratings():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT rating FROM ratings")
    rows = c.fetchall()
    conn.close()

    if not rows:
        return jsonify({"avg": 0, "count": 0})

    ratings = [r[0] for r in rows]
    avg = round(sum(ratings) / len(ratings), 1)

    return jsonify({"avg": avg, "count": len(ratings)})


# -----------------------------------
# 🔐 ADMIN — STATS
# -----------------------------------

@app.route("/admin/stats")
def admin_stats():
    if not admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    paid = session.query(Ticket).filter_by(payment_status="paid").count()
    pending = session.query(Ticket).filter_by(payment_status="pending").count()
    failed = session.query(Ticket).filter_by(payment_status="failed").count()
    revenue = paid * TICKET_PRICE

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT rating FROM ratings")
    rows = c.fetchall()
    conn.close()

    ratings = [r[0] for r in rows]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0

    return jsonify({
        "paid": paid,
        "pending": pending,
        "failed": failed,
        "revenue": revenue,
        "avg_rating": avg_rating,
        "rating_count": len(ratings)
    })


# -----------------------------------
# 🔐 ADMIN — ALL TICKETS
# -----------------------------------

@app.route("/admin/tickets")
def admin_tickets():
    if not admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    tickets = session.query(Ticket).order_by(Ticket.created_at.desc()).all()

    return jsonify([
        {
            "id": t.id,
            "phone": t.phone,
            "payment_status": t.payment_status,
            "mpesa_receipt": t.mpesa_receipt,
            "token": t.token,
            "checkout_id": t.checkout_id,
            "paid": t.paid,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
        }
        for t in tickets
    ])


# -----------------------------------
# 🔐 ADMIN — RATINGS BREAKDOWN
# -----------------------------------

@app.route("/admin/ratings-breakdown")
def admin_ratings_breakdown():
    if not admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT rating FROM ratings")
    rows = c.fetchall()
    conn.close()

    breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for (r,) in rows:
        if r in breakdown:
            breakdown[r] += 1

    return jsonify(breakdown)


# -----------------------------------
# 🔐 ADMIN — MARK TICKET PAID MANUALLY
# -----------------------------------

@app.route("/admin/mark-paid", methods=["POST"])
def admin_mark_paid():
    if not admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    checkout_id = request.json.get("checkout_id")

    ticket = session.query(Ticket).filter_by(checkout_id=checkout_id).first()

    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    if ticket.payment_status == "paid":
        return jsonify({"error": "Already paid"})

    token = generate_token()
    ticket.token = token
    ticket.payment_status = "paid"
    ticket.paid = True
    session.commit()

    print(f"✅ ADMIN manually marked ticket {checkout_id} as paid. Token: {token}")

    return jsonify({"success": True, "token": token})


# -----------------------------------
# 🔐 ADMIN — REVOKE TOKEN
# -----------------------------------

@app.route("/admin/revoke", methods=["POST"])
def admin_revoke():
    if not admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    checkout_id = request.json.get("checkout_id")

    ticket = session.query(Ticket).filter_by(checkout_id=checkout_id).first()

    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    ticket.token = None
    ticket.payment_status = "failed"
    ticket.paid = False
    session.commit()

    print(f"🚫 ADMIN revoked ticket {checkout_id}")

    return jsonify({"success": True})


# -----------------------------------
# RUN SERVER
# -----------------------------------

if __name__ == "__main__":
    app.run(debug=True)
