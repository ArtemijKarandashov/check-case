// Put host specific staff here
const saveUsernameBtn = document.getElementById('saveUsernameBtn');

socket.on('send_session_key', (data) => {
    AppData.sessionKey = data.session_key;
    createInviteLink();
});

socket.on('send_session_key', (data) => {
    const userInSessionPromise = AppLoaded['inSession'];
    setTimeout(()=>{
        userInSessionPromise['res']();
    },0);
});

socket.on('current_user_list', (data) =>{
    AppData.names = data['names'];
    AppData.servings = data['servings'];
    console.log(AppData);
    AppLoaded['doneOCR']['prom'].then(()=>{
        setDistributionData();
    });
});

socket.on('check_result', function(data) {
    const names =  data['names'];
    const totalAmount = parseFloat(data['total_sum']);
    AppData.names = names;
    AppData.servings = data['servings'];
    AppData.receipt.totalAmount = totalAmount;
    console.log(AppData);
    setTimeout(() => {
        AppLoaded['doneOCR']['res']();
    },0);
    
});

function createInviteLink() {
    requestHTML('link','init','afterbegin');
    requestScript('link','link.html');
  
    sendHTMLRequests();
    sendScriptRequests();
    
    const requiredPromise = AppLoaded['inSession'];
    requiredPromise['prom'].then (
      () => {
          socket.emit('process_check',{'image':AppData.base64Image}) 
    });
}

saveUsernameBtn.addEventListener('click',()=>{
    requestHTML('scanner','username.js','afterbegin');
    requestScript('scanner','scanner.html');

    sendHTMLRequests();
    sendScriptRequests();
});