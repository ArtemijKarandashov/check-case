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
    base64Image: String,
    sessionKey: 'None'
  };

const initPromise = createDeferredPromise();
const promiseOCR = createDeferredPromise();

// Use 'init' requirement for loading html or scripts if you want to load it without requirements
let AppLoaded = {
    'init':initPromise,
    'doneOCR':promiseOCR
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
    app.insertAdjacentHTML(pageData.position,pageContent);
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

socket.on('check_result', function(data) {
    AppData.customNames = true;
    const names =  data['names'];
    const totalAmount = data['total_sum'];
    AppData.totalAmount = totalAmount;
    
    setTimeout(() => {
        AppLoaded['doneOCR']['res']();
    });
});

function createDeferredPromise() {
    let res;
    
    const promise = new Promise((resolve) => {
        res = resolve;
    });

    return { 'prom': promise, 'res':res };
}

function requestHTML(page,requirement,position){
    const requirementStr = page + '.html'
    if (Object.keys(AppLoaded).includes(requirementStr)){
        console.log(`${page} is already requested!`);
        return 0;
    }
    const newPendingPromise = createDeferredPromise();

    AppLoaded[requirementStr] = newPendingPromise;
    AppHTMLRequests.push({
        'page':`${page}`,
        'requirement':`${requirement}`,
        'position':`${position}`
    });
}

function requestScript(script,requirement){
    const requirementStr = script + '.js';

    if (Object.keys(AppLoaded).includes(requirementStr)){
        console.log(`${script} is already requested!`);
        return 0;
    }
    const newPendingPromise = createDeferredPromise();
    AppLoaded[requirementStr] = newPendingPromise;
    AppScriptRequests.push({
        'script':`${script}`,
        'requirement':`${requirement}`
    });
}

function sendHTMLRequests(){
    for (let i = 0; i < AppHTMLRequests.length; i++){
        socket.emit('request_html',AppHTMLRequests[i]);
    }
    AppHTMLRequests = [];
}

function sendScriptRequests(){
    for (let i = 0; i < AppScriptRequests.length; i++){
        socket.emit('request_script',AppScriptRequests[i]);
    }
    AppScriptRequests = [];
}

function loadApp(){
    app.innerHTML = '';

    requestHTML('header','init','beforebegin');
    requestHTML('scanner','header.html','beforeend');
    requestHTML('info','scanner.html','beforeend');
    requestHTML('developers','info.html','beforeend');

    requestScript('theme','developers.html');
    requestScript('username','theme.js');
    requestScript('scanner','username.js');

    sendHTMLRequests();
    sendScriptRequests();
}

function loadAppWithJoin(session_key){
    app.innerHTML = '';

    requestHTML('header','init','beforebegin');
    requestScript('theme','header.html');
    requestScript('username','theme.js');

    sendHTMLRequests();
    sendScriptRequests();

    socket.emit('login', {"name":UserSettings.username});
    socket.emit('join_session', {"session_key": session_key});
}

function loadDebug(){
    app.innerHTML = '';
    requestHTML('header','init','beforebegin');
    requestHTML('DEBUG','header.html','beforeend');

    requestScript('theme','DEBUG.html');
    requestScript('socket_handler','theme.js');
    sendHTMLRequests();
    sendScriptRequests();
}

setTimeout(() => {
    initPromise['res']();
}, 0);