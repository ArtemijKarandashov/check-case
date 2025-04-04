from . import app
from flask import render_template

@app.route('/')
def index():
    print(app.config['SECRET_KEY'])
    return render_template('index.html')
