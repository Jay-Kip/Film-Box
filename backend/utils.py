import random
import string
import requests
import hashlib
import uuid


def generate_token(length=12):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


def get_device_id():
    return requests.remote_addr + requests.headers.get('User-Agent')