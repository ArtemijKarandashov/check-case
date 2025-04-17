const toDistributionBtn = document.getElementById('continueToDistribution');
const hostname = window.location.hostname;

function generate_qr(url){
    const qrContainer = document.getElementById('qrContainer');
    const linkContainer = document.getElementById('linkContainer');
    const inviteLink = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    const qrCodeSize = Math.min(qrContainer.offsetWidth,qrContainer.offsetHeight)-30; // -2*margin(qr-code)
    qrContainer.innerHTML = '';

    linkContainer.innerHTML = inviteLink;
    new QRCode(qrContainer, {
        text: url,
        width: qrCodeSize,
        height: qrCodeSize,
        correctLevel: QRCode.CorrectLevel.H,
      });
}

function loadDistr(){
    toDistributionBtn.disabled = true;
    toDistributionBtn.textContent = 'Пожалуйста, подождите';
    requestHTML('distribution','doneOCR','afterbegin');
    requestScript('distribution','distribution.html');
    
    sendHTMLRequests();
    sendScriptRequests();
}

toDistributionBtn.addEventListener('click', loadDistr);

if (hostname === 'localhost'){
    generate_qr(hostname+":5000/?key=" + AppData.sessionKey)
}else{
    generate_qr(hostname + "/?key=" + AppData.sessionKey);
}

//This events must be handled here and not in app.js, otherwise CLIENT useres will too send this request 
socket.on('user_connected', (data) => {
    socket.emit('update_users_list', {'session_key': AppData.sessionKey});
  });
  
socket.on('user_left_session', (data) => {
    socket.emit('update_users_list', {'session_key': AppData.sessionKey});
});