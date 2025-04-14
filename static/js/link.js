function generate_qr(url){
    const InviteQr = document.getElementById('invite');
    const linkContainer = document.getElementById('linkContainer')
    const inviteLink = `<a href=${url}>${url}</a>`
    InviteQr.innerHTML = '';
    linkContainer.innerHTML = inviteLink
    new QRCode(InviteQr, url);
}

generate_qr(window.location.hostname + "?key=" + AppData.sessionKey);