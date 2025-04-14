const app = document.getElementById('app');
const initPendingPromise = createDeferredPromise();
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

let AppLoaded = {
    'init':initPendingPromise
};

let AppHTMLRequests = [];
let AppScriptRequests = [];

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
    const pageContent = pageData.page;
    app.insertAdjacentHTML('beforeend',pageContent);
}

function loadScript(scriptData) {
    const scriptPath = scriptData.script
    const script = document.createElement('script');
    script.src = scriptPath;

    document.body.appendChild(script);
}

socket.on('load_script', async function(data) {
    let requirement = data.requirement;
    const requiredPromise = AppLoaded[requirement];
    requiredPromise['prom'].then( () => {
        loadScript(data);
        const pendingPromise = AppLoaded[data.title];
        const resolveFunc = pendingPromise['res'];
        console.log(AppLoaded);
        console.log(pendingPromise);
        
        setTimeout(() => {
            resolveFunc();
        }, 0);
    });
});

socket.on('load_html', async function(data) {
    let requirement = data.requirement;
    const requiredPromise = AppLoaded[requirement];
    requiredPromise['prom'].then( () => {
        loadHTML(data);
        const pendingPromise = AppLoaded[data.title];
        const resolveFunc = pendingPromise['res'];
        console.log(AppLoaded);
        console.log(pendingPromise);
        setTimeout(() => {
            resolveFunc();
        }, 0);
    });
});

function createDeferredPromise() {
    let res;
    
    const promise = new Promise((resolve) => {
        res = resolve;
    });

    return { 'prom': promise, 'res':res };
}

function requestHTML(page,requirement){
    const newPendingPromise = createDeferredPromise();
    let requirementStr = page + '.html'
    AppLoaded[requirementStr] = newPendingPromise;
    AppHTMLRequests.push({'page':`${page}`,'requirement':`${requirement}`});
}

function requestScript(script,requirement){
    const newPendingPromise = createDeferredPromise();
    let requirementStr = script + '.js';
    AppLoaded[requirementStr] = newPendingPromise;
    AppScriptRequests.push({'script':`${script}`,'requirement':`${requirement}`});
}

function sendHTMLRequests(){
    for (let i = 0; i < AppHTMLRequests.length; i++){
        console.log('sending load request for');
        console.log(AppHTMLRequests[i]);
        socket.emit('request_html',AppHTMLRequests[i]);
    }
    AppHTMLRequests = [];
}

function sendScriptRequests(){
    for (let i = 0; i < AppScriptRequests.length; i++){
        console.log('sending load request for');
        console.log(AppHTMLRequests[i]);
        socket.emit('request_script',AppScriptRequests[i]);
    }
    AppScriptRequests = [];
}

function loadApp(){
    app.innerHTML = ''
    // socket.emit('request_html', {'page':'app'});
    
    // socket.emit('request_html', {'page':'scanner'})
    // socket.emit('request_html', {'page':'info'})
    // socket.emit('request_html', {'page':'developers'})
    
    // socket.emit('request_script', {'script':'theme'});
    // socket.emit('request_script', {'script':'username'});
    // socket.emit('request_script', {'script':'scanner'});
    requestHTML('app','init');
    requestHTML('scanner','app.html');
    requestHTML('info','scanner.html');
    requestHTML('developers','info.html');

    requestScript('theme','developers.html');
    requestScript('username','theme.js');
    requestScript('scanner','username.js');
    sendHTMLRequests();
    sendScriptRequests();
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
setTimeout(() => {
    initPendingPromise['res']();
}, 0);