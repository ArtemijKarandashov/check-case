from flask import Flask
from flask_socketio import SocketIO
from config import Config
from app.tools.logger import Logger

import os

Logger()

app = Flask(__name__,static_folder=os.path.abspath("./static"))
app.config.from_object(Config)
socketio = SocketIO(app)

from app import routes, sockets