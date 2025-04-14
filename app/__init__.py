from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from config import Config

import os


app = Flask(__name__,static_folder=os.path.abspath("./static"))
app.config.from_object(Config)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*')

data_dir = app.config['DATA_DIR_PATH']
if not os.path.exists(data_dir):
    try:
        os.makedirs(data_dir,exist_ok=True)
    except:
        raise OSError
        

from app.tools.logger import Logger
app_logger = Logger()

from app.controller.connection_manager import ConnectionManager
app_con_manager = ConnectionManager()

from app import routes, sockets