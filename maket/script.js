// Открытие/закрытие истории
document.getElementById('toggleHistory').addEventListener('click', function() {
    const historyList = document.getElementById('historyList');
    if (historyList.style.display === 'block') {
        historyList.style.display = 'none';
    } else {
        historyList.style.display = 'block';
    }
});

// Загрузка изображения (имитация сканера)
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const scannerBox = document.getElementById('scannerPlaceholder');
            scannerBox.innerHTML = `<img src="${event.target.result}" alt="Загруженный чек" style="max-width: 100%; border-radius: 5px;">`;
        };
        reader.readAsDataURL(file);
    }
});