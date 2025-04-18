from app.tools.singleton import Singleton
from .. import data_dir

import datetime as dt
import os
import logging

class Logger(metaclass=Singleton):
    def __init__(self, file_path = f'log/{dt.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")}-log.txt', file_size_limit = 1000000, log_level = logging.INFO):
        
        self.file_size_limit = file_size_limit
        self.filename = data_dir + file_path

        self._check_path_exists()
        self._check_file_size()

        self.logger = logging.getLogger()
        self.logger.setLevel(log_level)

        self.file_handler = CustomFileHandler(self.filename, mode='a')
        self.file_handler.setLevel(log_level)

        self.formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        self.file_handler.setFormatter(self.formatter)

        self.logger.addHandler(self.file_handler)

        
    def _check_file_size(self):
        if os.path.getsize(self.filename) > self.file_size_limit:
            logging.warning(f"Log file size is greater than {self.file_size_limit}. Creating new log file.")

    def _check_path_exists(self):
        if not os.path.exists(self.filename):
            logging.warning(f"Log file does not exist. Creating new log file at {self.filename}")
            splited_path = self.filename.split('/')
            path = '/'.join(splited_path[0:-1:1])+'/'
            if not os.path.exists(path):
                os.makedirs(path, exist_ok=True)
            open(self.filename, 'w').close()


class CustomFileHandler(logging.FileHandler):
    def __init__(self, filename, mode='a', encoding=None, delay=False):
        #TODO: Probobly add file size check or smth
        super().__init__(filename, mode, encoding, delay)

    def emit(self, record):
        try:
            msg = self.format(record)
            self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)