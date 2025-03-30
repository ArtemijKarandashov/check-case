from random import randint

import warnings
import os

_warn_skips = (os.path.dirname(__file__),)

class User:
    _VALID_TYPES = ["HOST","CLIENT","PHANTOM"]
    # HOST user type is created when user sends check OCR request. It allows to keep track of main user in session.
    # CLIENT user type is created when users joins existing session. This type of user only recives data from session.
    # PHANTOM user type is created when HOST user sends request with amount of users to create. They can be considered mocks of real users.

    def __init__(self, name : str = None, type: str = "PHANTOM", sid: str = None):

        if type not in self._VALID_TYPES:
            warnings.warn("Invalid user type provided. Defaulting to PHANTOM.",skip_file_prefixes = _warn_skips)
            type = "PHANTOM"

        if not name:
            warnings.warn("No name provided. Using random name.",skip_file_prefixes = _warn_skips)
            name = self._random_name()

        self.id = None
        self.session = None
        self.type = type
        self.name = name
        self.sid = sid

    def _random_name(self):

        if not os.path.exists("data/random_user_names.txt"):
            warnings.warn("Random user names file does not exist. Blank name will be used.",skip_file_prefixes = _warn_skips)
            return f'John-Doe-{randint(0, 1000)}'

        names = []
        with open("data/random_user_names.txt", 'r') as file:
            names = file.read().split('\n')
        
        return names[randint(0, len(names) - 1)]
