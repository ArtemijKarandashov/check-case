document.addEventListener('DOMContentLoaded', function() {
    const billItemsContainer = document.getElementById('bill-items');
    const calculateButton = document.getElementById('calculate-button');
    const resultsContainer = document.getElementById('results');

    // Фиксированный список участников
    const sessionParticipants = ["Иван", "Мария", "Петр"];
    
    // Тестовые данные позиций чека
    const scannedItems = [
        { name: "Пицца", price: "1200" },
        { name: "Салат", price: "400" },
        { name: "Напиток", price: "200" }
    ];

    // Отображение позиций чека
    function displayItems() {
        billItemsContainer.innerHTML = scannedItems.map((item, index) => `
            <div class="item">
                <h3>${item.name} - ${item.price}₽</h3>
                <label>Кто ел (выберите несколько):</label>
                <select id="owners-${index}" multiple>
                    ${sessionParticipants.map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
            </div>
        `).join('');
    }

    // Расчет долей
    function calculateShares() {
        const shares = {};
        
        scannedItems.forEach((item, index) => {
            const select = document.getElementById(`owners-${index}`);
            const selectedPeople = Array.from(select.selectedOptions).map(o => o.value);
            const price = parseFloat(item.price) || 0;
            
            if (selectedPeople.length > 0) {
                const sharePerPerson = price / selectedPeople.length;
                
                selectedPeople.forEach(person => {
                    shares[person] = (shares[person] || 0) + sharePerPerson;
                });
            }
        });

        // Вывод результатов
        if (Object.keys(shares).length > 0) {
            resultsContainer.innerHTML = `
                <h2>Итоговые суммы:</h2>
                ${Object.entries(shares).map(([name, sum]) => `
                    <p><strong>${name}:</strong> ${sum.toFixed(2)}₽</p>
                `).join('')}
            `;
        } else {
            resultsContainer.innerHTML = '<p>Выберите участников для расчета</p>';
        }
    }

    // Инициализация
    displayItems();
    calculateButton.addEventListener('click', calculateShares);
});