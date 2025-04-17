const saveUsernameButton = document.getElementById('saveUsernameBtn');

initUserName();

function initUserName() {
    usernameEntry.value = UserSettings.username;
}

saveUsernameButton.addEventListener('click', function() {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        UserSettings.username = username;
        localStorage.setItem('username', username);
    } else {
        alert('Пожалуйста, введите ваше имя');
    }
});


saveUsernameButton.focus();