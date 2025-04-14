const receiptUpload = document.getElementById('receiptUpload');
const scannerPreview = document.getElementById('scannerPreview');
const scannerPlaceholder = document.getElementById('scannerPlaceholder');
const scanBtn = document.getElementById('scanBtn');

scanBtn.addEventListener('click', () => receiptUpload.click());
receiptUpload.addEventListener('change', handleReceiptUpload);

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