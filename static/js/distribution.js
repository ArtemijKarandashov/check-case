
//Элементы процентного распределения
const participantsList = document.getElementById('participantsList');
const manualParticipantsList = document.getElementById('manualParticipantsList');
const totalAmountEl = document.getElementById('totalAmount');
const totalPercentageEl = document.getElementById('totalPercentage');
const confirmDistributionBtn = document.getElementById('confirmDistributionBtn');

// Элементы для ручного распределения
const percentageModeBtn = document.getElementById('percentageModeBtn');
const manualModeBtn = document.getElementById('manualModeBtn');
const percentageSection = document.getElementById('percentageDistribution');
const manualSection = document.getElementById('manualDistribution');
const billItemsContainer = document.getElementById('bill-items');
const calculateButton = document.getElementById('calculate-button');
const resultsContainer = document.getElementById('results');

// Инициализация
initParticipants();
renderParticipants();
updateTotals();
initManualDistribution();

confirmDistributionBtn.addEventListener('click', confirmPercentageDistribution);
calculateButton.addEventListener('click', calculateManualShares);

percentageModeBtn.addEventListener('click', () => switchMode('percentage'));
manualModeBtn.addEventListener('click', () => switchMode('manual'));

function initParticipants() {
  const share = Math.floor(100 / AppData.receipt.participants.length);
  const remainder = 100 - (share * AppData.receipt.participants.length);
  
  AppData.participants = AppData.receipt.participants.map((name, index) => ({
    id: `participant_${index}`,
    name: name,
    percentage: index === 0 ? share + remainder : share,
    amount: (AppData.receipt.totalAmount * (index === 0 ? share + remainder : share)) / 100,
    selected: true
  }));
}

function renderParticipants() {
  participantsList.innerHTML = '';
  manualParticipantsList.innerHTML = '';
  
  AppData.participants.forEach(participant => {
    // Рендер для процентного режима
    const participantEl = document.createElement('div');
    participantEl.className = 'participant-item';
    
    participantEl.innerHTML = `
      <label class="participant-select">
        <input type="checkbox" ${participant.selected ? 'checked' : ''} 
                data-id="${participant.id}" class="participant-checkbox">
        <span class="participant-name">${participant.name}</span>
      </label>
      <div class="percentage-control">
        <input type="number" class="percentage-input" 
                min="0" max="100" 
                value="${participant.percentage}" 
                data-id="${participant.id}"
                ${participant.selected ? '' : 'disabled'}>
        <span>%</span>
      </div>
      <div class="participant-amount" data-id="${participant.id}">
        ${participant.amount.toFixed(2)} ₽
      </div>
      ${AppData.customNames ? 
        `<button class="manual-participant-remove" data-id="${participant.id}">
          <i class="fas fa-times"></i>
        </button>` : ''
      }
    `;
    
    participantsList.appendChild(participantEl);
    
    const input = participantEl.querySelector('.percentage-input');
    input.addEventListener('input', handlePercentageChange);
    input.addEventListener('blur', handlePercentageBlur);
    
    const checkbox = participantEl.querySelector('.participant-checkbox');
    checkbox.addEventListener('change', (e) => {
      const participant = AppData.participants.find(p => p.id === e.target.dataset.id);
      if (participant) {
        participant.selected = e.target.checked;
        input.disabled = !e.target.checked;
        if (!e.target.checked) participant.percentage = 0;
        updateParticipant(participant.id, participant.percentage);
        initManualDistribution(); // Обновляем ручной режим
      }
    });
    
    if (AppData.customNames) {
      participantEl.querySelector('.manual-participant-remove')
        .addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          removeParticipant(id);
        });
    }
    
    // Рендер для ручного режима
    const manualParticipantEl = document.createElement('div');
    manualParticipantEl.className = 'manual-participant-item';
    manualParticipantEl.innerHTML = `
      <label>
        <input type="checkbox" ${participant.selected ? 'checked' : ''} 
                data-id="${participant.id}" class="manual-participant-checkbox">
        ${participant.name}
      </label>
    `;
    
    manualParticipantsList.appendChild(manualParticipantEl);
    
    const manualCheckbox = manualParticipantEl.querySelector('.manual-participant-checkbox');
    manualCheckbox.addEventListener('change', (e) => {
      const participant = AppData.participants.find(p => p.id === e.target.dataset.id);
      if (participant) {
        participant.selected = e.target.checked;
        // Обновляем процентный режим
        const percentageCheckbox = participantsList.querySelector(`.participant-checkbox[data-id="${participant.id}"]`);
        if (percentageCheckbox) {
          percentageCheckbox.checked = e.target.checked;
          const percentageInput = participantsList.querySelector(`.percentage-input[data-id="${participant.id}"]`);
          if (percentageInput) {
            percentageInput.disabled = !e.target.checked;
            if (!e.target.checked) participant.percentage = 0;
            updateParticipant(participant.id, participant.percentage);
          }
        }
        initManualDistribution(); // Обновляем позиции
      }
    });
  });
}

function removeParticipant(id) {
  if (AppData.participants.length === 1) {
    showErrorNotification('Невозможно удалить участника!')
  }
  AppData.participants = AppData.participants.filter(p => p.id !== id);
  renderParticipants();
  updateTotals();
  initManualDistribution();
}

function addCustomParticipant(id, name) {
  
  if (!name) {
    showErrorNotification('Введите имя участника');
    return;
  }
  
  // Если это первое ручное имя - очищаем стандартные
  if (!AppData.customNames) {
    AppData.participants = [];
    AppData.customNames = true;
    showNotification(
      'Режим ручного ввода активирован', 
      'fas fa-info-circle',
      'var(--primary)',
      'Теперь вы можете полностью управлять списком участников'
    );
  }
  
  // Проверяем дубликаты
  if (AppData.participants.some(p => p.id === id)) {
    //showErrorNotification('Этот пользователь уже добавлен');
    return;
  }
  
  // Добавляем нового участника
  const newId = id;
  AppData.participants.push({
    id: newId,
    name: name,
    percentage: 0,
    amount: 0,
    selected: true
  });
  
  // Равномерно распределяем проценты
  const selectedParticipants = AppData.participants.filter(p => p.selected);
  const equalShare = Math.floor(100 / selectedParticipants.length);
  const remainder = 100 - (equalShare * selectedParticipants.length);
  
  let counter = 0;
  AppData.participants.forEach(p => {
    if (p.selected) {
      p.percentage = counter === 0 ? equalShare + remainder : equalShare;
      p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
      counter++;
    } else {
      p.percentage = 0;
      p.amount = 0;
    }
  });
  
  renderParticipants();
  updateTotals();
  initManualDistribution();
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
  const selectedParticipants = AppData.participants.filter(p => p.selected);
  const totalPercentage = selectedParticipants.reduce((sum, p) => sum + p.percentage, 0);
  const difference = totalPercentage - 100;
  
  if (difference <= 0) return;
  
  const otherParticipants = selectedParticipants.filter(p => p.id !== changedId);
  const totalOtherPercentage = otherParticipants.reduce((sum, p) => sum + p.percentage, 0);
  
  otherParticipants.forEach(p => {
    const reduction = (p.percentage / totalOtherPercentage) * difference;
    p.percentage = Math.max(0, Math.floor(p.percentage - reduction));
    p.amount = (AppData.receipt.totalAmount * p.percentage) / 100;
  });
  
  const finalTotal = selectedParticipants.reduce((sum, p) => sum + p.percentage, 0);
  if (finalTotal !== 100) {
    otherParticipants[0].percentage += (100 - finalTotal);
    otherParticipants[0].amount = (AppData.receipt.totalAmount * otherParticipants[0].percentage) / 100;
  }
  
  renderParticipants();
}

function updateTotals() {
  const selectedParticipants = AppData.participants.filter(p => p.selected);
  const totalPercentage = selectedParticipants.reduce((sum, p) => sum + p.percentage, 0);
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

function initManualDistribution() {
  billItemsContainer.innerHTML = AppData.receipt.items.map((item, index) => `
    <div class="item">
      <h3>${item.name} - ${item.price}₽</h3>
      <label>Кто ел:</label>
      <select id="owners-${index}" multiple>
        ${AppData.participants
          .filter(p => p.selected)
          .map(p => `<option value="${p.id}" selected>${p.name}</option>`)
          .join('')}
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

    updateResultsUI(results, totalCalculated);
    showManualDistributionNotification(results, totalCalculated);
  } else {
    showErrorNotification('Выберите участников для хотя бы одной позиции');
  }
}

function updateResultsUI(results, total) {
  resultsContainer.innerHTML = `
    <h3>Итоговые суммы:</h3>
    <div class="results-list">
      ${results.map(r => `<p><strong>${AppData.names[r.name]}:</strong> ${r.amount} ₽</p>`).join('')}
    </div>
    <div class="total-summary">
      <strong>Общая сумма:</strong> ${total.toFixed(2)} ₽
    </div>
  `;
}

function updateReceiptData(new_item) {
  AppData.receipt = {
    totalAmount: AppData.receipt.totalAmount,
    participants: [...AppData.receipt.participants],
    items: [
      ...AppData.receipt.items,
      new_item
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
  const distribution = AppData.participants
    .filter(p => p.selected)
    .map(p => ({
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
  let results = {};
  for (const user of AppData.participants){
    results[user.id] = user.percentage/100 * AppData.receipt.totalAmount;
  }
  sendResultsToOtherUsers(results);
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
            <span>${AppData.names[r.name]}</span>
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
  
  let resultsToSend = {}
  for (const user of results){
    resultsToSend[user.name] = user.amount;
  }
  sendResultsToOtherUsers(resultsToSend);
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
            ${item.percentage ? `<span>${item.percentage}%</span>` : ''}
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

function setDistributionData(){
  const names = AppData.names;
  for (const participant of AppData.participants){
    if ((Object.keys(AppData.names).includes(participant.id) == false)){
      removeParticipant(participant.id);
    }
  }
  for (let id in names){
      addCustomParticipant(id, names[id]);
  }
  for (const serving of AppData.servings){
    for (let i =0; i<serving['amount']; i++){
      updateReceiptData({ name: serving['name'], price: serving['sum'] });
    }
  }
  AppData.servings = [];
}

function sendResultsToOtherUsers(results){
  socket.emit('distribution_results',{'session_key':AppData.sessionKey,'results':results});
}

setDistributionData();