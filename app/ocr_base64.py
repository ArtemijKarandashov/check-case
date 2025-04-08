from time import sleep

import easyocr
import base64
import numpy as np
import cv2

def OCR(base64_image: str, languages:str = ['ru']):

    if base64_image.startswith('data:image/png;base64,'):
        base64_image = base64_image.replace('data:image/png;base64,', '')
    
    image_data = base64.b64decode(base64_image)
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    reader = easyocr.Reader(languages)
    results = reader.readtext(image)
    
    return results