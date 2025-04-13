const user_name = document.getElementById('user_name');
const session_key = document.getElementById('session_key');
const session_data = document.getElementById('session_data');
const socket = io();

            
function print_response(data) {
    const message = document.createElement('p');
    message.textContent = data.message;
    session_data.appendChild(message);
}

socket.on('connect', () => {
    console.log('Connected to WebSocket');
});

socket.on('error', (data) => {
    console.log('Received:', data);
    print_response(data)
})

socket.on('warning', (data) => {
    console.log('Received:', data);
    print_response(data)
});
    
socket.on('login_success', (data) => {
    console.log('Received:', data);
    print_response(data)
    user_name.innerHTML = `Logined us: ${data.name}`;
});

socket.on('logout_success', (data) => {
    console.log('You are no longer connected');
    print_response(data)
    user_name.innerHTML = `Logined us: My name`;
});
    
socket.on('send_session_key', (data) => {
    console.log('Received:', data);
    print_response(data)
    session_key.value = data.session_key;
});

socket.on('user_connected', (data) => {
    console.log('Received:', data);
    print_response(data)
});

socket.on('check_result', data => {
    console.log(data)
    print_response(data)
});
    
function createSession() {
    socket.emit('create_session', {
        "type":'DEFAULT',
        "ph_users":0
    });
}
            
function joinSession() {
    socket.emit('join_session', {
        "session_key": session_key.value
    });
}
            
function login(){
    socket.emit('login', {"name":''})
}

function logout(){
    socket.emit('logout')
}