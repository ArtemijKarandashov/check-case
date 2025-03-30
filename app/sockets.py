from app.model.connection_manager import ConnectionManager
from flask import session, request
from flask_socketio import emit
from . import socketio

con_manager = ConnectionManager()

@socketio.on('connect')
def handle_connect():
    session['sid'] = request.sid
    new_user =con_manager.create_user(type = "CLIENT", sid = session['sid'])
    print(f'Client connected: {session["sid"]}')
    emit('login', {'message': 'You are connected!', 'sid': session['sid'], 'user_id': new_user.id,'name': new_user.name, 'type': new_user.type}, room=session['sid'])

@socketio.on('disconnect')
def handle_disconnect():
    user_id = con_manager.get_user_id_by_sid(session['sid'])
    data = con_manager.get_user_data(user_id)

    # Delete session if host disconnected
    if data[2] == 'HOST':
        # TODO: delete session con_manager.delete_session(user.session)
        print(f'Host {user_id} requested disconnect. Session abandoned: {session["sid"]}')

    con_manager.delete_user(user_id)

    print(f'Client disconnected: {session["sid"]}')

    # TODO: Check if session is empty and delete it if it is
    
@socketio.on('create_session')
def handle_create_session():
    print(f'Received create_session requestfrom {session["sid"]}')
    # TODO: Автоматически добавлять пользователя запросившего создание сессии как хоста
    new_session = con_manager.create_session()
    emit('recive_key', {'session_key': str(new_session.key)}, room=session['sid'])

@socketio.on('join_session')
def handle_join_session(data):
    print(f'Received join_session request from {session["sid"]}')
    
    session_key = data['session_key']
    user_id = con_manager.get_user_id_by_sid(session['sid'])
    new_connection = con_manager.create_connection(session_key, user_id)

    users = con_manager.get_users_in_session(new_connection.session_key)

    for user in users:
        emit('user_connected', {'name': con_manager.get_user_data(user_id)[1]}, room=con_manager.get_user_data(user)[3])