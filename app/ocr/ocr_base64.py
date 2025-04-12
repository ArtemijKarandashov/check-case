from time import sleep

import io
import easyocr
import base64
import numpy as np
import cv2
from PIL import Image

def OCR(base64_image: str):

    base64_image = base64_image.replace('data:image/jpeg;base64,', '')
    # TODO:                         FIX FILE FORMAT ^
    
    image_data = base64.b64decode(base64_image)
    nparr = np.frombuffer(image_data, dtype=np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    reader = easyocr.Reader(['ru'])

    results = reader.readtext(image)
    
    return results