from app.ocr.safe_convertion import is_numeric
from .. import app_logger

import numpy as np
import easyocr
import base64
import cv2


logger = app_logger.logger

def get_ocr_data(reader: easyocr.Reader, base64_image: str) -> list:

    base64_image = base64_image.replace('data:image/jpeg;base64,', '')
    # TODO:                         FIX FILE FORMAT ^
    
    image_data = base64.b64decode(base64_image)
    nparr = np.frombuffer(image_data, dtype=np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    width_ths:  float = 2
    height_ths: float = 1.5

    data: list = reader.readtext(image, width_ths=width_ths, height_ths=height_ths, detail=0)

    return data


def get_total_sum(data: list) -> dict[str: float]:
    total_sum_keywords: set = {'итог', 'всего', 'к оплат'}
    total_sum = 0

    for i, item in enumerate(data):
        try:
            item: str = item.lower().strip(' ')
            if any(item.startswith(keyword) or keyword.startswith(item) for keyword in total_sum_keywords):
                item = item.replace(',', '.')

                # case when keyword and sum got merged in one string
                if item[-1].isdigit():
                    buffer: str = ''
                    while item[-1].isdigit() or item[-1] == '.':
                        buffer = item.pop() + buffer
                    total_sum = float(buffer)

                # most likely case of next item being a total sum (unlikely)
                if is_numeric(d := data[i + 1].replace(',', '.').replace(' ','')):
                    total_sum = float(d)
                # case when something got in between keyword and sum (very unlikely)
                elif is_numeric(d := data[i + 2].replace(',', '.').replace(' ','')):
                    total_sum = float(d)

                return total_sum

        except Exception as e:
            logger.error(e)
            return None
