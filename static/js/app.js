const app = document.getElementById('app');
const socket = io();

// Пользовательские настройки приложения
const UserSettings = {
    username: localStorage.getItem('username') || 'Jhon-Doe',
    theme: localStorage.getItem('theme') || 'light',
}

// Основные данные приложения
const AppData = {
    receipt: {
      totalAmount: 5730,
      participants: ["Кот", "Собака", "Сова", "Пингвин"],
      items: [
        { name: "Стейк Рибай", price: 1500 },
        { name: "Салат Цезарь", price: 450 },
        { name: "Вино красное", price: 1200 },
        { name: "Пиво крафтовое", price: 380 },
        { name: "Десерт", price: 350 },
        { name: "Чаевые", price: 700 },
        { name: "Доставка", price: 750 }
      ]
    },
    customNames: false, // Флаг ручного ввода имён
    sessionKey: 'None'
  };

let LoadQueue = []

socket.on('error', (data) => {
    console.log(data)
    socket.emit('request_html', {'page':'error'});
})

socket.on('warning', (data) => {
    console.log(data)
    socket.emit('request_html', {'page':'error'});
});

socket.on('send_session_key', (data) => {
    AppData.sessionKey = data.session_key;
});

function loadHTML(pageData) {
    const pageContent = pageData.page
    return new Promise((resolve) => {
        let currentPromise = LoadQueue[0] === undefined ? new Promise((resolve) => { resolve() }) : LoadQueue.pop();
        console.log(currentPromise);
        currentPromise.then( () => {
            app.insertAdjacentHTML('beforeend',pageContent);
            resolve();
        });
    });
}

function loadScript(scriptData) {
    const scriptPath = scriptData.script
    return new Promise((resolve, reject) => {
        let currentPromise = LoadQueue[0] === undefined ? new Promise((resolve) => { resolve() }) : LoadQueue.pop();
            currentPromise.then( () => {
            const script = document.createElement('script');
            script.src = scriptPath;

            script.onload = () => {
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Failed to load script ${scriptPath}`));
            };

            document.body.appendChild(script);
        });
    });
}

socket.on('load_script', function(data) {
    const newPromise = loadScript(data)
        .then(() => {
            console.log(`${data.title} loaded successfully`);
        })
        .catch((error) => {
            console.error(error);
        });
    LoadQueue.push(newPromise);
});

socket.on('load_html', function(data) {
    const newPromise = loadHTML(data)
        .then(() => {
            console.log(`${data.title} loaded successfully`);
        })
        .catch((error) => {
            console.error(error);
        });
    LoadQueue.push(newPromise)
});

function loadApp(){
    app.innerHTML = ''
    socket.emit('request_html', {'page':'app'});
    
    socket.emit('request_html', {'page':'scanner'})
    socket.emit('request_html', {'page':'info'})
    socket.emit('request_html', {'page':'developers'})
    
    socket.emit('request_script', {'script':'theme'});
    socket.emit('request_script', {'script':'username'});
    socket.emit('request_script', {'script':'scanner'});
    
}

function loadAppWithJoin(session_key){
    app.innerHTML = ''
    socket.emit('request_html', {'page':'app'});

    socket.emit('request_script', {'script':'theme'});
    socket.emit('request_script', {'script':'username'});

    socket.emit('login',        {"name":''})
    socket.emit('join_session', {"session_key": session_key});
}

function loadDebug(){
    app.innerHTML = ''
    socket.emit('request_html', {'page':'app'});
    socket.emit('request_html', {'page':'DEBUG'})
    socket.emit('request_script', {'script':'theme'});
    socket.emit('request_script', {'script':'socket_handler'});
}

// socket.emit('request_html', {'page':'distribution'});
// socket.emit('request_script', {'script':'distribution'});