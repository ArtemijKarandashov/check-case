from app.tools.singleton import Singleton

import datetime as dt
import os
import sys
import logging
import warnings

_warn_skips = (os.path.dirname(__file__),)

class Logger(metaclass=Singleton):
    def __init__(self, file_path = f'app/data/log/{dt.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")}-log.txt', file_size_limit = 1000000, log_level = logging.DEBUG):
        
        self.file_size_limit = file_size_limit
        self.filename = file_path

        self._check_path_exists()
        self._check_file_size()

        logging.basicConfig(filename=self.filename, level=log_level, format='%(asctime)s %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p')
    
    def _check_file_size(self):
        if os.path.getsize(self.filename) > self.file_size_limit:
            warnings.warn(f"Log file size is greater than {self.file_size_limit}. Creating new log file.",skip_file_prefixes = _warn_skips)

    def _check_path_exists(self):
        if not os.path.exists(self.filename):
            warnings.warn(f"Log file does not exist. Creating new log file at {self.filename}",skip_file_prefixes = _warn_skips)
            splited_path = self.filename.split('/')
            path = '/'.join(splited_path[0:-1:1])+'/'
            if not os.path.exists(path):
                os.makedirs(path)
            open(self.filename, 'w').close()