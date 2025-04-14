const themeSwitch = document.getElementById('checkbox');

initTheme();

function initTheme() {
    document.documentElement.setAttribute('data-theme', UserSettings.theme);
    themeSwitch.checked = UserSettings.theme === 'dark';
  }
  
  function toggleTheme() {
    UserSettings.theme = UserSettings.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', UserSettings.theme);
    localStorage.setItem('theme', UserSettings.theme);
  }

themeSwitch.addEventListener('change', toggleTheme);