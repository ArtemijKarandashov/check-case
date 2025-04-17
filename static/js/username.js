const saveUsernameButton = document.getElementById('saveUsernameBtn');
const usernameInput =  document.getElementById('usernameInput');

usernameInput.focus();
initUserName();

function initUserName() {
    usernameInput.value = UserSettings.username;
}

saveUsernameButton.addEventListener('click', function() {
    saveUsernameButton.disabled = true;
    const username = usernameInput.value.trim();
    if (username) {
        UserSettings.username = username;
        localStorage.setItem('username', username);
    } else {
        alert('Пожалуйста, введите ваше имя');
    }
    socket.emit('login', {
        "name":UserSettings.username
    });
});