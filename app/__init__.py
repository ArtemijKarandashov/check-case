from flask import Flask
from flask_socketio import SocketIO
from app.tools.logger import Logger

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

app_logger = Logger()

from app import routes, sockets