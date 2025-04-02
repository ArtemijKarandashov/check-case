from Crypto.PublicKey import RSA
from Crypto import Random
from random import randint

class Session:
    def __init__(self):
        self.users = {}
        self.key, self.public_key = self._mock_key_generator()

    def _key_generator(self,bits=2048):
        # TODO: Реализовать логику для взаимодействия с пользователем
        random_generator = Random.new().read
        rsa_key = RSA.generate(bits, random_generator)
        export_key = rsa_key.exportKey()
        public_key = rsa_key.publickey().exportKey()

        return export_key, public_key
    
    def _mock_key_generator(self):
        return str(randint(100,999)),str(randint(100,999))

