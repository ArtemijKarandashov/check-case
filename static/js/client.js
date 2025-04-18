socket.on('my_part', (data)=>{
    showNotification(
        'Чек посчитан!', 
        'fas fa-circle-check',
        'var(--primary)',
        `Ваша доля чека составила ${data.sum}₽`
      );
});

function showNotification(title, icon, iconColor, contents) {
    const elementExists = document.getElementById("personalResult");
    if (!!elementExists){
      return;
    }

    const notification = document.createElement('div');
    notification.className = 'distribution-notification';
    notification.id = 'personalResult';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="${icon} notification-icon" style="color: ${iconColor}"></i>
        <h3>${title}</h3>
        <div class="distribution-details">
            <div class="total-summary">
                <strong>${contents}</strong>
            </div>
        </div>
        <button class="btn btn-primary notification-close">OK</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    setupNotificationClose(notification);
}

function setupNotificationClose(notification) {
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {notification.remove()}, 300);
    });
}
