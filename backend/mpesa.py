import requests
import base64
from datetime import datetime
from config import *

# 🔑 GET ACCESS TOKEN
def get_access_token():
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    response = requests.get(url, auth=(CONSUMER_KEY, CONSUMER_SECRET))
    print("TOKEN STATUS:", response.status_code)  # add this
    print("TOKEN BODY:", response.text)
    return response.json()['access_token']


# 💰 STK PUSH
def stk_push(phone):
    access_token = get_access_token()

    url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    password = base64.b64encode(
        (BUSINESS_SHORT_CODE + PASSKEY + timestamp).encode()
    ).decode()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 2,
        "PartyA": phone,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": "Film",
        "TransactionDesc": "Film Ticket"
    }

    res = requests.post(url, json=payload, headers=headers)
    print("SHORTCODE:", BUSINESS_SHORT_CODE)
    print("PASSKEY:", PASSKEY)
    print("TIMESTAMP:", timestamp)
    print("PASSWORD:", password)


    print("MPESA RESPONSE:", res.text)

    return res.json()
