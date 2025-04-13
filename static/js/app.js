const app = document.getElementById('app');
const socket = io();

document.getElementById('sendMessage').addEventListener('click', function() {
    socket.emit('request_html', {'page':'DEBUG'});
});

socket.on('load_script', function(data) {
    const script = document.createElement('script');
    script.src = data.script;
    document.head.appendChild(script);
});

socket.on('load_html', function(data) {
    app.innerHTML = data['page'];
});