import secrets
from random import randint

class Session:
    def __init__(self,stype='DEFAULT'):
        self.type = stype
        self.key = self.generate_hex_key()

    @staticmethod
    def generate_hex_key(length=10):
        random_bytes = secrets.token_bytes(length)
        hex_key = random_bytes.hex()
        return hex_key

