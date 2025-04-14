const toDistributionBtn = document.getElementById('continueToDistribution');
const hostname = window.location.hostname;

function generate_qr(url){
    const InviteQr = document.getElementById('invite');
    const linkContainer = document.getElementById('linkContainer')
    const inviteLink = `<a href=${url}>${url}</a>`
    InviteQr.innerHTML = '';
    linkContainer.innerHTML = inviteLink
    new QRCode(InviteQr, url);
}

function loadDistr(){
    requestHTML('distribution','init','afterbegin');
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