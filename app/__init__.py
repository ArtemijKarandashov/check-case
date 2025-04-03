from flask import Flask
from flask_socketio import SocketIO
from app.tools.logger import Logger

import os

app = Flask(__name__,static_folder=os.path.abspath("./static"))
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

app_logger = Logger()

from app import routes, sockets