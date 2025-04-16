const receiptUpload = document.getElementById('receiptUpload');
const scannerPreview = document.getElementById('scannerPreview');
const scannerPlaceholder = document.getElementById('scannerPlaceholder');
const scanBtn = document.getElementById('scanBtn');

scanBtn.addEventListener('click', () => receiptUpload.click());
receiptUpload.addEventListener('change', handleReceiptUpload);

function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = function(event) {
      scannerPreview.src = event.target.result;
      scannerPreview.style.display = 'block';
      scannerPlaceholder.style.display = 'none';
      scanBtn.style.display = 'none';
      let result = reader.result;
      AppData.base64Image = result;
    };
    reader.readAsDataURL(file);
    createNewSession();
}

function createNewSession(){
  socket.emit('login',{
    "name":UserSettings.username
  });

  const requiredPromise = AppLoaded['userLogined'];
  requiredPromise['prom'].then( () => {
    socket.emit('create_session', {
      "type":'DEFAULT',
      "ph_users":0
    });
  });
}

function createInviteLink() {
  requestHTML('link','init','afterbegin');
  requestScript('link','link.html');

  sendHTMLRequests();
  sendScriptRequests();
  
  const requiredPromise = AppLoaded['inSession'];
  requiredPromise['prom'].then (() => {socket.emit('process_check',{'image':AppData.base64Image}) });
}

socket.on('send_session_key', (data) => {
  createInviteLink();
});