const usernameEntry = document.getElementById('setUserName');

initUserName();

function initUserName() {
    usernameEntry.value = UserSettings.username
}

function ChangeUsername(){
    UserSettings.username = usernameEntry.value ;
    localStorage.setItem('username', UserSettings.username);
}

usernameEntry.addEventListener('change', ChangeUsername);