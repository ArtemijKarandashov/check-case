from app.model.connection_manager import ConnectionManager
from flask import session, request
from flask_socketio import emit
from . import socketio
from app.tools.logger import Logger
from app.ocr_thread import ThreadOCR



_con_manager = ConnectionManager()
logger = Logger().logger

@socketio.on('connect')
def handle_connect():
    session['sid'] = request.sid
    logger.info(f'Client connected: {session['sid']}')


@socketio.on('disconnect')
def handle_disconnect():
    logout_user()
    logger.info(f'Client disconected: {session['sid']}')


@socketio.on('login')
def handle_login(data):
    name = data['name']
    if not data['name'] == '':
        name = None
    new_user =_con_manager.create_user(name = name, type = "CLIENT", sid = session['sid'])
    print(f'Client {session['sid']} logined as {new_user.name}')
    emit('login_success', {'message': 'You are connected!', 'name': new_user.name, 'type': new_user.type}, room=session['sid'])


@socketio.on('logout')
def handle_logout():
    logout_user()


@socketio.on('create_session')
def handle_create_session(data):
    _VALID_TYPES = ['DEFAULT', 'SINGULAR']
    
    session_type = data['type']

    if session_type not in _VALID_TYPES:
        logger.error(f'Wrong session type {session_type} provided. Session creation abandoned.')
        emit('error', {'message': 'Wrong session type provided!'}, room=session['sid'])
        return None
    
    logger.info(f'Received create_session request from {session["sid"]}')
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
    new_session = _con_manager.create_session(stype=session_type)
    conect_user(new_session.key, user_id)

    if new_session.type == 'SINGULAR':
        ph_users = int(data['ph_users'])
        for i in range(ph_users):
            create_phantom_user(new_session.key)

    emit('send_session_key', {'message': 'Session created!','session_key': str(new_session.key)}, room=session['sid'])


@socketio.on('join_session')
def handle_join_session(data):
    logger.info(f'Received join_session request from {session["sid"]}')

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
def handle_process_check(data):
    base64_image = data['image']
    print(base64_image)

    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)
    
    session_key = _con_manager.get_users_session(user_id)
    session_data = _con_manager.get_session_data(session_key)

    session_status = int(session_data[2])
    session_type = session_data[3]

    if _con_manager.sid_exists(session['sid']) == False:
        emit('error', {'message': 'You are not logged in!'}, room=session['sid'])
        return None
    
    if user_data[2] != 'HOST':
        emit('error', {'message': 'You are not a host!'}, room=session['sid'])
        return None

    if session_status != 0:
        emit('error', {'message': 'Session is already (being) processed',"status":"abandoned"}, room=session['sid'])
        return None
    
    _con_manager.update_session_status(session_key,1)

    new_thread = ThreadOCR(base64_image)
    new_thread.start()
    new_thread.join()

    ocr_data = new_thread.ocr_results

    for (bbox, text, prob) in ocr_data:
        print(f'Detected text: {text} with probability: {prob}')

    _con_manager.update_session_status(session_key,2)
    emit('check_result', {'message': 'Check processed!',"status":"done"}, room=session['sid'])


@socketio.on('all_users_joined')
def handle_all_users_joined():
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)

    if user_data[2] != 'HOST':
        emit('error',{'message':'You are not a host of this session!'}, room=session['sid'])
        return None

    session_key = _con_manager.get_users_session(user_id)
    session_data = _con_manager.get_session_data(session_key)

    if session_data[2] != 3:
        emit('error',{'message':'Set distribution type before continuing!'}, room=session['sid'])
        return None

    _con_manager.update_session_status(session_key,4)
    # TODO: Redirect all users to distrebution results page


@socketio.on('distribution_results')
def handle_distribution_results():
    results = {
        'total_sum':0,
        'personal_sum':0,
        }
    
    return results


def conect_user(session_key: str, user_id: int):
    new_connection = _con_manager.create_connection(session_key, user_id)

    if not new_connection:
        emit('error', {'message': 'Connection request denied!'}, room=session['sid'])
        return None

    users = _con_manager.get_users_in_session(new_connection.session_key)

    for user in users:
        user_data = _con_manager.get_user_data(user)
        connected_user_data =   _con_manager.get_user_data(user_id)
        if user_data[2] != 'PHANTOM' and connected_user_data[2] != 'PHANTOM':
            emit('user_connected', {'message': 'User connected!','name':connected_user_data[1]}, room=user_data[3])


def set_distribution_type(dtype: str, session_key: str):
    VALID_DISTRIBUTION_TYPES = ['EVEN', 'PROCENTAGE','MANUAL']

    session_data = _con_manager.get_session_data(session_key)

    if session_data[2] != 2:
        emit('error', {'message': 'Session is not processed!'}, room=session['sid'])
        return None

    if dtype not in VALID_DISTRIBUTION_TYPES:
        emit('error', {'message': 'Wrong distribution type!'}, room=session['sid'])
        return None
    
    _con_manager.update_session_status(session_key,3)
    
    # TODO: Redirect HOST to distribution page
    #       Redirect CLIENTs to waiting page


def logout_user():
    if not _con_manager.sid_exists(session['sid']):
        print(f'Cannot logout user. User with given sid {session['sid']} does not exist in db. Already logged out?')
        return None

    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)

    session_key = _con_manager.get_users_session(user_id)

    # Delete user if not in session
    if not session_key:
        _con_manager.delete_user(user_id)
        logger.info(f'Client {session["sid"]} logout ({user_data[1]})')
        emit('logout_success', {'message': 'You are disconnected!'}, room=session['sid'])
        return None

    # Delete session if host disconnected
    if user_data[2] == 'HOST':
        _con_manager.delete_session(session_key)
        logger.info(f'Host {user_id} requested disconnect. Session abandoned: {session["sid"]}')

    _con_manager.delete_user(user_id)
    logger.info(f'Client {session["sid"]} logout ({user_data[1]})')

    # Delete session if all clients disconect
    if user_data[2] == 'CLIENT':
        users = _con_manager.get_users_in_session(session_key)
        temp_users = list(users)

        for user_id in temp_users:
            user_data = _con_manager.get_user_data(user_id)
            if user_data[2] == 'PHANTOM':
                users.remove(user_id)
                _con_manager.delete_user(user_id)
                logger.info(f'Phantom user {user_id} in session {session_key} deleted.')
                

        if not len(users):
            logger.info(f'Session {session_key} is empty. It will be deleted from the database.')
            _con_manager.delete_session(session_key)
    
    emit('logout_success', {'message': 'You are disconnected!'}, room=session['sid'])


def create_phantom_user(session_key: str):
    ph_user = _con_manager.create_user(type = "PHANTOM")
    conect_user(session_key, ph_user.id)