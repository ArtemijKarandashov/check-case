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
    theme: localStorage.getItem('theme') || 'light'
  };
  
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
    
    // Элементы для ручного распределения
    const percentageModeBtn = document.getElementById('percentageModeBtn');
    const manualModeBtn = document.getElementById('manualModeBtn');
    const percentageSection = document.getElementById('percentageDistribution');
    const manualSection = document.getElementById('manualDistribution');
    const billItemsContainer = document.getElementById('bill-items');
    const calculateButton = document.getElementById('calculate-button');
    const resultsContainer = document.getElementById('results');
  
    // Инициализация
    initTheme();
    initParticipants();
    renderParticipants();
    updateTotals();
    initManualDistribution();
  
    // Обработчики событий
    themeSwitch.addEventListener('change', toggleTheme);
    scanBtn.addEventListener('click', () => receiptUpload.click());
    receiptUpload.addEventListener('change', handleReceiptUpload);
    confirmDistributionBtn.addEventListener('click', confirmPercentageDistribution);
    calculateButton.addEventListener('click', calculateManualShares);
    
    percentageModeBtn.addEventListener('click', () => switchMode('percentage'));
    manualModeBtn.addEventListener('click', () => switchMode('manual'));
  
    function initTheme() {
      document.documentElement.setAttribute('data-theme', AppData.theme);
      themeSwitch.checked = AppData.theme === 'dark';
    }
  
    function toggleTheme() {
      AppData.theme = AppData.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', AppData.theme);
      localStorage.setItem('theme', AppData.theme);
    }
  
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
  
    function renderParticipants() {
      participantsList.innerHTML = '';
      
      AppData.participants.forEach(participant => {
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
        
        const input = participantEl.querySelector('.percentage-input');
        input.addEventListener('input', handlePercentageChange);
        input.addEventListener('blur', handlePercentageBlur);
      });
    }
  
    function handlePercentageChange(e) {
      const participantId = e.target.dataset.id;
      let newPercentage = parseInt(e.target.value) || 0;
      newPercentage = Math.min(100, Math.max(0, newPercentage));
      e.target.value = newPercentage;
      updateParticipant(participantId, newPercentage);
    }
  
    function handlePercentageBlur(e) {
      if (e.target.value === '') {
        e.target.value = 0;
        updateParticipant(e.target.dataset.id, 0);
      }
    }
  
    function updateParticipant(id, percentage) {
      const participant = AppData.participants.find(p => p.id === id);
      if (!participant) return;
      
      participant.percentage = percentage;
      participant.amount = (AppData.receipt.totalAmount * percentage) / 100;
      
      document.querySelector(`.participant-amount[data-id="${id}"]`).textContent = 
        participant.amount.toFixed(2) + ' ₽';
      
      balancePercentages(id);
      updateTotals();
    }
  
    function balancePercentages(changedId) {
      const totalPercentage = AppData.participants.reduce((sum, p) => sum + p.percentage, 0);
      const difference = totalPercentage - 100;
      
      if (difference <= 0) return;
      
      const otherParticipants = AppData.participants.filter(p => p.id !== changedId);
      const totalOtherPercentage = otherParticipants.reduce((sum, p) => sum + p.percentage, 0);
      
      otherParticipants.forEach(p => {
        const reduction = (p.percentage / totalOtherPercentage) * difference;
        p.percentage = Math.max(0, Math.floor(p.percentage - reduction));
        p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
      });
      
      const finalTotal = AppData.participants.reduce((sum, p) => sum + p.percentage, 0);
      if (finalTotal !== 100) {
        otherParticipants[0].percentage += (100 - finalTotal);
        otherParticipants[0].amount = (AppData.receipt.totalAmount * otherParticipants[0].percentage) / 100;
      }
      
      renderParticipants();
    }
  
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
  
    function handleReceiptUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = function(event) {
        scannerPreview.src = event.target.result;
        scannerPreview.style.display = 'block';
        scannerPlaceholder.style.display = 'none';
        scanBtn.style.display = 'none';
  
        setTimeout(() => {
          updateReceiptData();
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  
    function updateReceiptData() {
      AppData.receipt = {
        totalAmount: 6200,
        participants: [...AppData.receipt.participants],
        items: [
          ...AppData.receipt.items,
          { name: "Кофе", price: 250 }
        ]
      };
      
      const equalShare = Math.floor(100 / AppData.participants.length);
      const remainder = 100 - (equalShare * AppData.participants.length);
      
      AppData.participants.forEach((p, i) => {
        p.percentage = i === 0 ? equalShare + remainder : equalShare;
        p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
      });
      
      renderParticipants();
      updateTotals();
      initManualDistribution();
    }
  
    function switchMode(mode) {
      if (mode === 'percentage') {
        percentageModeBtn.classList.add('active');
        manualModeBtn.classList.remove('active');
        percentageSection.style.display = 'block';
        manualSection.style.display = 'none';
      } else {
        manualModeBtn.classList.add('active');
        percentageModeBtn.classList.remove('active');
        manualSection.style.display = 'block';
        percentageSection.style.display = 'none';
      }
    }
  
    function confirmPercentageDistribution() {
      const distribution = AppData.participants.map(p => ({
        name: p.name,
        percentage: p.percentage,
        amount: p.amount.toFixed(2)
      }));
  
      showNotification(
        'Распределение подтверждено!',
        'fas fa-check-circle',
        'var(--success)',
        distribution,
        AppData.receipt.totalAmount
      );
    }
  
    function initManualDistribution() {
      billItemsContainer.innerHTML = AppData.receipt.items.map((item, index) => `
        <div class="item">
          <h3>${item.name} - ${item.price}₽</h3>
          <label>Кто ел:</label>
          <select id="owners-${index}" multiple>
            ${AppData.receipt.participants.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>
      `).join('');
    }
  
    function calculateManualShares() {
      const shares = {};
      let totalCalculated = 0;
      let hasSelectedItems = false;
      
      AppData.receipt.items.forEach((item, index) => {
        const select = document.getElementById(`owners-${index}`);
        const selectedPeople = Array.from(select.selectedOptions).map(o => o.value);
        const price = parseFloat(item.price) || 0;
        
        if (selectedPeople.length > 0) {
          hasSelectedItems = true;
          const sharePerPerson = price / selectedPeople.length;
          totalCalculated += price;
          
          selectedPeople.forEach(person => {
            shares[person] = (shares[person] || 0) + sharePerPerson;
          });
        }
      });
  
      if (hasSelectedItems) {
        const results = Object.entries(shares).map(([name, amount]) => ({
          name: name,
          amount: amount.toFixed(2)
        }));
  
        // Обновляем блок результатов в интерфейсе
        updateResultsUI(results, totalCalculated);
        
        // Показываем уведомление
        showManualDistributionNotification(results, totalCalculated);
      } else {
        showErrorNotification('Выберите участников для хотя бы одной позиции');
      }
    }
  
    function updateResultsUI(results, total) {
      resultsContainer.innerHTML = `
        <h3>Итоговые суммы:</h3>
        <div class="results-list">
          ${results.map(r => `<p><strong>${r.name}:</strong> ${r.amount} ₽</p>`).join('')}
        </div>
        <div class="total-summary">
          <strong>Общая сумма:</strong> ${total.toFixed(2)} ₽
        </div>
      `;
    }
  
    function showManualDistributionNotification(results, total) {
      const notification = document.createElement('div');
      notification.className = 'distribution-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <i class="fas fa-calculator notification-icon" style="color: var(--primary)"></i>
          <h3>Результаты распределения</h3>
          <div class="distribution-details">
            ${results.map(r => `
              <div class="distribution-item">
                <span>${r.name}</span>
                <span>${r.amount} ₽</span>
              </div>
            `).join('')}
          </div>
          <div class="total-summary">
            <strong>Общая сумма:</strong> ${total.toFixed(2)} ₽
          </div>
          <button class="btn btn-primary notification-close">OK</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      setupNotificationClose(notification);
    }
  
    function showNotification(title, icon, iconColor, items, totalAmount) {
      const notification = document.createElement('div');
      notification.className = 'distribution-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <i class="${icon} notification-icon" style="color: ${iconColor}"></i>
          <h3>${title}</h3>
          <div class="distribution-details">
            ${items.map(item => `
              <div class="distribution-item">
                <span>${item.name}</span>
                <span>${item.percentage}%</span>
                <span>${item.amount} ₽</span>
              </div>
            `).join('')}
          </div>
          <div class="total-summary">
            <strong>Общая сумма:</strong> ${parseFloat(totalAmount).toFixed(2)} ₽
          </div>
          <button class="btn btn-primary notification-close">OK</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      setupNotificationClose(notification);
    }
  
    function showErrorNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'distribution-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <i class="fas fa-exclamation-circle notification-icon" style="color: var(--error)"></i>
          <h3>Ошибка</h3>
          <p>${message}</p>
          <button class="btn btn-primary notification-close">OK</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      setupNotificationClose(notification);
    }
  
    function setupNotificationClose(notification) {
      notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      });
      
      notification.addEventListener('click', (e) => {
        if (e.target === notification) {
          notification.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => notification.remove(), 300);
        }
      });
    }
  });
