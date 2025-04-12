from threading import Thread
from app.ocr.ocr_base64 import OCR

class ThreadOCR(Thread):
    def __init__(self, base64_image: str):
        Thread.__init__(self)
        self.base64 = base64_image
        self.ocr_results = None
    
    def run(self):
        self.ocr_results = OCR(self.base64)
        print(self.ocr_results)