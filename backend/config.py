import os
from dotenv import load_dotenv

load_dotenv()


# 🔐 DARAJA CREDENTIALS (SANDBOX)

CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY")
CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET")

BUSINESS_SHORT_CODE = "174379"  # sandbox default
PASSKEY = os.environ.get("MPESA_PASSKEY") # from daraja dashboard

CALLBACK_URL = os.environ.get("MPESA_CALLBACK_URL")

# Temporary debug — remove after fixing
print("KEY:", CONSUMER_KEY)
print("SECRET:", CONSUMER_SECRET)


AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")
AWS_BUCKET = os.environ.get("AWS_BUCKET")
AWS_REGION = "eu-west-1"