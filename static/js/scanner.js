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
    };
    reader.readAsDataURL(file);
    createNewSession();
}

async function createNewSession(){
  socket.emit('login',{
    "name":UserSettings.username
  });

  socket.emit('create_session', {
    "type":'DEFAULT',
    "ph_users":0
  });
}

async function createInviteLink() {
  socket.emit('request_html', {'page':'link'});  
  socket.emit('request_script', {'script':'link'});
}

socket.on('send_session_key', (data) => {
  createInviteLink();
});