const app = document.getElementById('app');
const socket = io();

// Пользовательские настройки приложения
const UserSettings = {
    name: localStorage.getItem('name') || 'Jhon-Doe',
    theme: localStorage.getItem('theme') || 'light',
}

// Основные данные приложения
const AppData = {
    receipt: {
      totalAmount: 5730,
      participants: ["Кот", "Собака", "Сова", "Пингвин"],
      items: [
        { name: "Стейк Рибай", price: 1500 },
        { name: "Салат Цезарь", price: 450 },
        { name: "Вино красное", price: 1200 },
        { name: "Пиво крафтовое", price: 380 },
        { name: "Десерт", price: 350 },
        { name: "Чаевые", price: 700 },
        { name: "Доставка", price: 750 }
      ]
    },
    customNames: false // Флаг ручного ввода имён
  };
  
socket.on('load_script', function(data) {
    const script = document.createElement('script');
    script.src = data.script;
    document.body.appendChild(script);
});

socket.on('load_html', function(data) {
    app.insertAdjacentHTML('beforeend',data['page']);
});

socket.on('error', (data) => {
    console.log(data)
    socket.emit('request_html', {'page':'error'});
})

socket.on('warning', (data) => {
    console.log(data)
    socket.emit('request_html', {'page':'error'});
});

function openFrontPage(){
    app.innerHTML = ''
    socket.emit('request_html', {'page':'app'});
    socket.emit('request_html', {'page':'scanner'});
    socket.emit('request_html', {'page':'distribution'});
    
    socket.emit('request_script', {'script':'theme'});
    socket.emit('request_script', {'script':'scanner'});
    socket.emit('request_script', {'script':'distribution'});
}