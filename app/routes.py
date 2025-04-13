from . import app
from flask import render_template

@app.route('/')
def index():
    return render_template('DEBUG.html')

@app.route('/man')
def man():
    return render_template('manual_distrebution.html')
