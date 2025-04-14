from . import app, app_con_manager
from flask import render_template, request

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/join', methods=['GET'])
def handle_join():
    key = request.args.get('key')
    return render_template('index.html')
