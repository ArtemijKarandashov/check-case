const app = document.getElementById('app');
const socket = io();

document.getElementById('sendMessage').addEventListener('click', function() {
    // socket.emit('request_html', {'page':'DEBUG'});
    // socket.emit('request_script', {'script':'image_prep'})
    openFrontPage()
});

socket.on('load_script', function(data) {
    const script = document.createElement('script');
    script.src = data.script;
    document.body.appendChild(script);
});

socket.on('load_html', function(data) {
    app.innerHTML = data['page'];
});

function openFrontPage(){
    socket.emit('request_html', {'page':'front_page'});
    socket.emit('request_script', {'script':'front_page'})
}