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
    print(f'Client connected: {session['sid']}')


@socketio.on('disconnect')
def handle_disconnect():
    logout_user()
    print(f'Client disconected: {session['sid']}')


@socketio.on('login')
def handle_login(data):
    new_user =_con_manager.create_user(type = "CLIENT", sid = session['sid'])
    print(f'Client {session['sid']} logined as {new_user.name}')
    emit('login_success', {'message': 'You are connected!', 'sid': session['sid'], 'user_id': new_user.id,'name': new_user.name, 'type': new_user.type}, room=session['sid'])


@socketio.on('logout')
def handle_logout():
    logout_user()


@socketio.on('create_session')
def handle_create_session():
    print(f'Received create_session request from {session["sid"]}')
    # TODO: Автоматически добавлять пользователя запросившего создание сессии как хоста
    user_id = _con_manager.get_user_id_by_sid(session['sid'])

    if not user_id:
        emit('error', {'message': 'You are not logged in!'}, room=session['sid'])
        return None
    
    user_data = _con_manager.get_user_data(user_id)
    user_type = user_data[2]    

    if user_type == 'HOST':
        emit('error', {'message': 'You are already a host!'}, room=session['sid'])
        return None

    _con_manager.update_user_type(user_id,'HOST')
    new_session = _con_manager.create_session()
    conect_user(new_session.key, user_id)

    emit('send_session_key', {'message': 'Session created!','session_key': str(new_session.key)}, room=session['sid'])


@socketio.on('join_session')
def handle_join_session(data):
    print(f'Received join_session request from {session["sid"]}')

    if not data['session_key']:
        emit('error', {'message': 'Session key is empty!'}, room=session['sid'])
        return None
    
    if not _con_manager.session_exists(data['session_key']):
        emit('error', {'message': 'Session does not exist!'}, room=session['sid'])
        return None

    session_key = data['session_key']
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    
    if not user_id:
        emit('error', {'message': 'You are not logged in!'}, room=session['sid'])
        return None
    
    conect_user(session_key, user_id)


@socketio.on('process_check')
def handle_process_check():
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)
    
    session_key = _con_manager.get_users_session(user_id)
    session_data = _con_manager.get_session_data(session_key)
    session_status = int(session_data[2])

    if session_status in (1,2):
        emit('error', {'message': 'Session is already (being) processed',"status":"abandoned"}, room=session['sid'])
        return None
    
    _con_manager.update_session_status(session_key,1)

    new_thread = threading.Thread(target=_mock_calculate)
    new_thread.start()
    new_thread.join()

    _con_manager.update_session_status(session_key,2)
    emit('send_result', {'message': 'Check processed!',"status":"done"}, room=session['sid'])
    
    
def _mock_calculate():
    time.sleep(5)
    return 1


def conect_user(session_key: str, user_id: int):
    new_connection = _con_manager.create_connection(session_key, user_id)

    if not new_connection:
        emit('error', {'message': 'Connection request denied!'}, room=session['sid'])
        return None

    users = _con_manager.get_users_in_session(new_connection.session_key)

    for user in users:
        emit('user_connected', {'message': 'User connected!','name': _con_manager.get_user_data(user_id)[1]}, room=_con_manager.get_user_data(user)[3])


def logout_user():
    if not _con_manager.sid_exists(session['sid']):
        print(f'Cannot logout user. User with given sid {session['sid']} does not exist in db. Already logged out?')
        return False

    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)

    session_key = _con_manager.get_users_session(user_id)

    # Delete user if not in session
    if not session_key:
        _con_manager.delete_user(user_id)
        print(f'Client {session["sid"]} logout ({user_data[1]})')
        emit('logout_success', {'message': 'You are disconnected!'}, room=session['sid'])
        return None

    # Delete session if host disconnected
    if user_data[2] == 'HOST':
        _con_manager.delete_session(session_key)
        print(f'Host {user_id} requested disconnect. Session abandoned: {session["sid"]}')

    _con_manager.delete_user(user_id)
    print(f'Client {session["sid"]} logout ({user_data[1]})')

    # Delete session if all clients disconect
    if user_data[2] == 'CLIENT':
        useres = _con_manager.get_users_in_session(session_key)
        
        if not len(useres):
            print(f'Session {session_key} is empty. It will be deleted from the database.')
            _con_manager.delete_session(session_key)
    
    emit('logout_success', {'message': 'You are disconnected!'}, room=session['sid'])