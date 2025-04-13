// Основные данные приложения
const AppData = {
    receipt: {
      totalAmount: 5730,
      participants: ["Кот", "Собака", "Сова"],
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
    theme: localStorage.getItem('theme') || 'light'
  };
  
  // Инициализация приложения
  document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const themeSwitch = document.getElementById('checkbox');
    const participantsList = document.getElementById('participantsList');
    const totalAmountEl = document.getElementById('totalAmount');
    const totalPercentageEl = document.getElementById('totalPercentage');
    const confirmDistributionBtn = document.getElementById('confirmDistributionBtn');
    const receiptUpload = document.getElementById('receiptUpload');
    const scannerPreview = document.getElementById('scannerPreview');
    const scannerPlaceholder = document.getElementById('scannerPlaceholder');
    const scanBtn = document.getElementById('scanBtn');
  
    // Инициализация темы
    initTheme();
    
    // Инициализация данных
    initParticipants();
    renderParticipants();
    updateTotals();
  
    // Назначаем обработчики событий
    themeSwitch.addEventListener('change', toggleTheme);
    scanBtn.addEventListener('click', () => receiptUpload.click());
    receiptUpload.addEventListener('change', handleReceiptUpload);
    confirmDistributionBtn.addEventListener('click', confirmDistribution);
  
    // Функция инициализации темы
    function initTheme() {
      document.documentElement.setAttribute('data-theme', AppData.theme);
      themeSwitch.checked = AppData.theme === 'dark';
    }
  
    // Переключение темы
    function toggleTheme() {
      AppData.theme = AppData.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', AppData.theme);
      localStorage.setItem('theme', AppData.theme);
    }
  
    // Инициализация участников
    function initParticipants() {
      const share = Math.floor(100 / AppData.receipt.participants.length);
      const remainder = 100 - (share * AppData.receipt.participants.length);
      
      AppData.participants = AppData.receipt.participants.map((name, index) => ({
        id: `participant_${index}`,
        name: name,
        percentage: index === 0 ? share + remainder : share,
        amount: (AppData.receipt.totalAmount * (index === 0 ? share + remainder : share)) / 100
      }));
    }
  
    // Отрисовка участников
    function renderParticipants() {
      participantsList.innerHTML = '';
      
      AppData.participants.forEach((participant, index) => {
        const participantEl = document.createElement('div');
        participantEl.className = 'participant-item';
        participantEl.innerHTML = `
          <div class="participant-name">${participant.name}</div>
          <div class="percentage-control">
            <input type="number" class="percentage-input" 
                   min="0" max="100" 
                   value="${participant.percentage}" 
                   data-id="${participant.id}">
            <span>%</span>
          </div>
          <div class="participant-amount" data-id="${participant.id}">
            ${participant.amount.toFixed(2)} ₽
          </div>
        `;
        participantsList.appendChild(participantEl);
        
        // Обработчик изменения процента
        const input = participantEl.querySelector('.percentage-input');
        input.addEventListener('input', handlePercentageChange);
        input.addEventListener('blur', handlePercentageBlur);
      });
    }
  
    // Обработчик изменения процента
    function handlePercentageChange(e) {
      const participantId = e.target.dataset.id;
      let newPercentage = parseInt(e.target.value) || 0;
      
      // Ограничиваем значение от 0 до 100
      newPercentage = Math.min(100, Math.max(0, newPercentage));
      e.target.value = newPercentage;
      
      // Обновляем данные участника
      updateParticipant(participantId, newPercentage);
    }
  
    // Обработчик потери фокуса
    function handlePercentageBlur(e) {
      if (e.target.value === '') {
        e.target.value = 0;
        updateParticipant(e.target.dataset.id, 0);
      }
    }
  
    // Обновление данных участника
    function updateParticipant(id, percentage) {
      const participant = AppData.participants.find(p => p.id === id);
      if (!participant) return;
      
      participant.percentage = percentage;
      participant.amount = (AppData.receipt.totalAmount * percentage) / 100;
      
      // Обновляем отображение суммы
      document.querySelector(`.participant-amount[data-id="${id}"]`).textContent = 
        participant.amount.toFixed(2) + ' ₽';
      
      // Балансируем проценты
      balancePercentages(id);
      updateTotals();
    }
  
    // Балансировка процентов
    function balancePercentages(changedId) {
      const totalPercentage = AppData.participants.reduce((sum, p) => sum + p.percentage, 0);
      const difference = totalPercentage - 100;
      
      if (difference <= 0) return;
      
      const otherParticipants = AppData.participants.filter(p => p.id !== changedId);
      const totalOtherPercentage = otherParticipants.reduce((sum, p) => sum + p.percentage, 0);
      
      // Распределяем разницу пропорционально
      otherParticipants.forEach(p => {
        const reduction = (p.percentage / totalOtherPercentage) * difference;
        p.percentage = Math.max(0, Math.floor(p.percentage - reduction));
        p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
      });
      
      // Корректировка округления
      const finalTotal = AppData.participants.reduce((sum, p) => sum + p.percentage, 0);
      if (finalTotal !== 100) {
        otherParticipants[0].percentage += (100 - finalTotal);
        otherParticipants[0].amount = (AppData.receipt.totalAmount * otherParticipants[0].percentage) / 100;
      }
      
      // Перерисовываем всех участников
      renderParticipants();
    }
  
    // Обновление итоговых значений
    function updateTotals() {
      const totalPercentage = AppData.participants.reduce((sum, p) => sum + p.percentage, 0);
      totalPercentageEl.textContent = totalPercentage;
      totalAmountEl.textContent = AppData.receipt.totalAmount.toFixed(2);
      
      if (totalPercentage === 100) {
        totalPercentageEl.style.color = 'var(--primary)';
        confirmDistributionBtn.disabled = false;
      } else {
        totalPercentageEl.style.color = 'var(--error)';
        confirmDistributionBtn.disabled = true;
      }
    }
  
    // Обработка загрузки чека
    function handleReceiptUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = function(event) {
        scannerPreview.src = event.target.result;
        scannerPreview.style.display = 'block';
        scannerPlaceholder.style.display = 'none';
        scanBtn.style.display = 'none';
  
        // Имитация обработки чека
        setTimeout(() => {
          updateReceiptData();
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  
    // Обновление данных чека (имитация бэкенда)
    function updateReceiptData() {
      AppData.receipt = {
        totalAmount: 6200,
        participants: [...AppData.receipt.participants],
        items: [
          ...AppData.receipt.items,
          { name: "Кофе", price: 250 }
        ]
      };
      
      // Перераспределяем проценты
      const equalShare = Math.floor(100 / AppData.participants.length);
      const remainder = 100 - (equalShare * AppData.participants.length);
      
      AppData.participants.forEach((p, i) => {
        p.percentage = i === 0 ? equalShare + remainder : equalShare;
        p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
      });
      
      renderParticipants();
      updateTotals();
    }
  
    // Подтверждение распределения с красивым уведомлением
    function confirmDistribution() {
      const distribution = AppData.participants.map(p => ({
        name: p.name,
        percentage: p.percentage,
        amount: p.amount.toFixed(2)
      }));
  
      // Создаем уведомление
      const notification = document.createElement('div');
      notification.className = 'distribution-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <i class="fas fa-check-circle notification-icon"></i>
          <h3>Распределение подтверждено!</h3>
          <div class="distribution-details">
            ${distribution.map(p => `
              <div class="distribution-item">
                <span class="dist-name">${p.name}</span>
                <span class="dist-percent">${p.percentage}%</span>
                <span class="dist-amount">${p.amount} ₽</span>
              </div>
            `).join('')}
          </div>
          <div class="total-summary">
            <strong>Общая сумма:</strong> ${AppData.receipt.totalAmount.toFixed(2)} ₽
          </div>
          <button class="btn btn-primary notification-close">Закрыть</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Закрытие по кнопке
      notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      });
      
      // Закрытие по клику вне области
      notification.addEventListener('click', (e) => {
        if (e.target === notification) {
          notification.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => notification.remove(), 300);
        }
      });
    }
  });
