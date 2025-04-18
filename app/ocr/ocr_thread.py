from threading import Thread
from easyocr import Reader
from app.ocr.ocr import get_ocr_data, get_total_sum, get_servings

class ThreadOCR(Thread):
    def __init__(self, base64_image: str):
        Thread.__init__(self)
        self.base64 = base64_image
        self.reader = Reader(['ru'])
        self.ocr_results = None
        self.total_sum = 0
        self.servings = None
    
    def run(self):
        self.ocr_results = get_ocr_data(self.reader,self.base64)
        self.total_sum = get_total_sum(self.ocr_results)
        self.servings = get_servings(self.ocr_results)