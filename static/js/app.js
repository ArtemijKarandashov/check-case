const app = document.getElementById('app');
const initPendingPromise = createDeferredPromise();
const socket = io();

// Пользовательские настройки приложения
const UserSettings = {
    username: localStorage.getItem('username') || '',
    theme: localStorage.getItem('theme') || 'light',
}

// Основные данные приложения
const AppData = {
    receipt: {
      totalAmount: 5730,
      participants: [],
      names: {},
      items: [] // Contains dicts with keys {name: str, price: int}
    },
    customNames: true, // Флаг ручного ввода имён
    base64Image: String,
    sessionKey: 'None'
  };

const initPromise = createDeferredPromise();
const promiseOCR = createDeferredPromise();
const userLogined = createDeferredPromise();
const userInSession = createDeferredPromise();

// AppLoaded contains an dict of pending promises with their resolve functions. That allows to create "chains" of actions 
// from promises, so all requests to servers stay in correct order.
// To get promise you need to call AppLoaded['key']['prom'];
// To get resolve function you need to call AppLoaded['key']['res'];
// Use 'init' requirement for loading html or scripts if you want to load it without requirements.
// Use 'userLogined' requirement for anything that requires user to be logined into system.
// Use 'inSession' requirement for anything that requires user to be in session. 
// Use 'doneOCR' requirement if you need to use OCR data to continue.
let AppLoaded = {
    'init':initPromise,
    'userLogined':userLogined,
    'inSession':userInSession,
    'doneOCR':promiseOCR
};
let AppHTMLRequests = [];
let AppScriptRequests = [];

socket.on('error', (data) => {
    console.log(data)
    requestHTML('error','header.html','afterbegin');
})

socket.on('warning', (data) => {
    console.log(data)
    requestHTML('error','header.html','afterbegin');
});

socket.on('load_script', async function(data) {
    let requirement = data.requirement;
    const requiredPromise = AppLoaded[requirement];
    requiredPromise['prom'].then( () => {
        loadScript(data);
        const pendingPromise = AppLoaded[data.title];
        const resolveFunc = pendingPromise['res'];
        
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
        setTimeout(() => {
            resolveFunc();
            window.scrollTo(0, 0);
        }, 0);
    });
});


socket.on('login_success', (data) => {
    const userLoginedPromise = AppLoaded['userLogined'];
    setTimeout(() => {
        userLoginedPromise['res']();
    },0);
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

function loadAppHost(){
    app.innerHTML = '';

    requestHTML('header','init','beforebegin');
    requestHTML('username','header.html','beforeend');
    requestHTML('infoHost','username.html','beforeend');
    requestHTML('developers','infoHost.html','beforeend');

    requestScript('theme','header.html');
    requestScript('username','username.html');
    requestScript('host','username.js');

    sendHTMLRequests();
    sendScriptRequests();
}

function loadAppClient(session_key){
    app.innerHTML = '';

    requestHTML('header','init','beforebegin');
    requestHTML('infoClient','header.html','beforeend');
    requestHTML('developers','infoClient.html','beforeend');
    requestHTML('username','developers.html','afterbegin');

    requestScript('theme','header.html');
    requestScript('username','username.html');
    requestScript('client','userLogined');

    sendHTMLRequests();
    sendScriptRequests();

    AppLoaded['userLogined']['prom'].then(()=> {
        socket.emit('join_session', {"session_key": session_key});
    });
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