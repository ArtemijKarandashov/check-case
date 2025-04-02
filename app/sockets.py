from app.model.connection_manager import ConnectionManager
from flask import session, request
from flask_socketio import emit
from . import socketio

import threading
import time

_con_manager = ConnectionManager()


@socketio.on('connect')
def handle_connect():
    session['sid'] = request.sid
    new_user =_con_manager.create_user(type = "CLIENT", sid = session['sid'])
    print(f'Client connected: {session["sid"]}')
    emit('login', {'message': 'You are connected!', 'sid': session['sid'], 'user_id': new_user.id,'name': new_user.name, 'type': new_user.type}, room=session['sid'])


@socketio.on('disconnect')
def handle_disconnect():
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    data = _con_manager.get_user_data(user_id)

    session_key = _con_manager.get_users_session(user_id)

    # Delete session if host disconnected
    if data[2] == 'HOST':
        _con_manager.delete_session(session_key)
        print(f'Host {user_id} requested disconnect. Session abandoned: {session["sid"]}')

    _con_manager.delete_user(user_id)
    print(f'Client disconnected: {session["sid"]}')

    if data[2] == 'CLIENT':
        useres = _con_manager.get_users_in_session(session_key)
        
        if not len(useres):
            print(f'Session {session_key} is empty. It will be deleted from the database.')
            _con_manager.delete_session(session_key)


@socketio.on('create_session')
def handle_create_session():
    print(f'Received create_session requestfrom {session["sid"]}')
    # TODO: Автоматически добавлять пользователя запросившего создание сессии как хоста
    new_session = _con_manager.create_session()
    emit('recive_key', {'session_key': str(new_session.key)}, room=session['sid'])


@socketio.on('join_session')
def handle_join_session(data):
    print(f'Received join_session request from {session["sid"]}')
    
    session_key = data['session_key']
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    new_connection = _con_manager.create_connection(session_key, user_id)

    users = _con_manager.get_users_in_session(new_connection.session_key)

    for user in users:
        emit('user_connected', {'name': _con_manager.get_user_data(user_id)[1]}, room=_con_manager.get_user_data(user)[3])


@socketio.on('process_check')
def handle_process_check():
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)
    session_key = _con_manager.get_users_session(user_id)

    session_data = _con_manager.get_session_data(session_key)
    session_status = int(session_data[2])

    if session_status in (1,2):
        emit('check', {"status":"abandoned"}, room=session['sid'])
        return None
    
    _con_manager.set_session_status(session_key,1)

    new_thread = threading.Thread(target=_mock_calculate)
    new_thread.start()
    new_thread.join()

    _con_manager.set_session_status(session_key,2)
    emit('check', {"status":"done"}, room=session['sid'])
    
    
def _mock_calculate():
    time.sleep(5)
    return 1