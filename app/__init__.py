from flask import Flask
from flask_socketio import SocketIO
from app.tools.logger import Logger
from config import Config

import os

app = Flask(__name__,static_folder=os.path.abspath("./static"))
app.config.from_object(Config)
socketio = SocketIO(app)

app_logger = Logger()

from app import routes, sockets