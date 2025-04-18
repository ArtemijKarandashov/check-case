from flask import session, request, render_template, url_for
from flask_socketio import emit
from . import socketio, app_con_manager

from app.tools.logger import Logger
from app.ocr.ocr_thread import ThreadOCR


_con_manager = app_con_manager
logger = Logger().logger

@socketio.on('connect')
def handle_connect():
    session['sid'] = request.sid
    logger.info(f'Client connected: {session['sid']}')


@socketio.on('disconnect')
def handle_disconnect():
    logout_user()
    # TODO: Send update to HOST if in session
    logger.info(f'Client disconected: {session['sid']}')


@socketio.on('login')
def handle_login(data):
    name = data['name']
    if data['name'] == '':
        name = None
    new_user =_con_manager.create_user(name = name, type = "CLIENT", sid = session['sid'])
    logger.info(f'Client {session['sid']} logined as {new_user.name}')
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
    connect_user(new_session.key, user_id)

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
    
    connect_user(session_key, user_id)


@socketio.on('process_check')
def handle_process_check(data):
    base64_image = data['image']

    if base64_image is None:
        emit('error', {'message': 'Got NoneType instaed of image! OCR process abandoned.'}, room=session['sid'])
        return None

    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)
    
    session_key = _con_manager.get_users_session(user_id)
    session_data = _con_manager.get_session_data(session_key)

    session_status = int(session_data[2])
    session_stype = session_data[3]

    if _con_manager.sid_exists(session['sid']) == False:
        emit('error', {'message': 'You are not logged in!'}, room=session['sid'])
        return None
    
    if user_data[2] != 'HOST':
        emit('error', {'message': 'You are not a host!'}, room=session['sid'])
        return None

    if session_status != 0:
        emit('error', {'message': 'Session is already (being) processed',"status":"abandoned"}, room=session['sid'])
        return None
    
    new_thread = ThreadOCR(base64_image)
    new_thread.start()
    _con_manager.update_session_status(session_key,1)
    new_thread.join()

    total_sum = new_thread.total_sum
    servings = new_thread.servings
    names = {}  # User_id: Name

    users = _con_manager.get_users_in_session(session_key)
    for user_id in users:
        user_data = _con_manager.get_user_data(user_id)
        names[user_id]=user_data[1]

    _con_manager.update_session_status(session_key,2)

    emit('check_result', {
        'message': 'Check processed!',
        "total_sum":total_sum,
        "names":names,
        "servings":servings
        }, room=session['sid'])


def connect_user(session_key: str, user_id: int):
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



def logout_user():
    if not _con_manager.sid_exists(session['sid']):
        logger.info(f'Cannot logout user. User with given sid {session['sid']} does not exist in db. Already logged out?')
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

    # Emit a signal to all members in client's session to update user list
    users = _con_manager.get_users_in_session(session_key)
    for user in users:
        emit('user_left_session',{'message':'user left'},room=_con_manager.get_user_data(user)[3])

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
    connect_user(session_key, ph_user.id)


@socketio.on('request_html')
def handle_message(data):
    page = data['page'].replace('.','')
    emit('load_html',{
        'page':render_template(f'{page}.html'),
        'title':f"{data['page']}.html",
        'requirement':data['requirement'],
        'position':data['position']
        }, room=session['sid'])


@socketio.on('request_script')
def handle_request_script(data):
    script_name = 'js/' + data['script'].replace('.','') + ".js"
    emit('load_script', {
        'script': url_for('static', filename=script_name),
        'title':f"{data['script']}.js",
        'requirement':data['requirement']
        }, room=session['sid'])


@socketio.on('update_users_list')
def handle_update_users_list(data):
    user_id = _con_manager.get_user_id_by_sid(session['sid'])
    user_data = _con_manager.get_user_data(user_id)

    if user_data == ():
        logger.warning(f'No user data for user {user_id}.')
        return None

    if user_data[2] != 'HOST':
        logger.warning(f'User {user_id} is not a HOST of this session! Update user list request denied.')
        return None

    session_key = data['session_key']
    users = _con_manager.get_users_in_session(session_key)
    
    names = {}
    for user in users:
        names[user] = _con_manager.get_user_data(user)[1]
    
    emit('current_user_list',{'names':names}, room=session['sid'])


@socketio.on('distribution_results')
def handle_distribution_results(data):
    results = data['results']
    session_key = data['session_key']
    users = _con_manager.get_users_in_session(session_key)

    for user in users:
        user_data = _con_manager.get_user_data(user)
        emit('my_part',{'sum':results[str(user)]},room=user_data[3])