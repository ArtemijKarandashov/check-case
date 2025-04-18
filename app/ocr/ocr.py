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

    width_ths:  float = 1.5
    height_ths: float = 1.5

    data: list = reader.readtext(image, width_ths=width_ths, height_ths=height_ths)

    return data


def get_total_sum(data: list) -> dict[str: float]:
    """
    A function that takes the data from get_ocr_data and returns a dictionary with the total sum.

    The function iterates through the data and tries to find the total sum.
    If the sum is found, it is returned as a dictionary with the key 'sum'.
    If not, the function returns None.

    Args:
        data (list): A list of tuples, where each tuple is a detected text, its bounding box, and the confidence of the detection.

    Returns:
        dict[str: float]: A dictionary with the total sum.
    """
    total_sum_keywords: set = {'итог', 'всего', 'к оплат'}

    text_data = list(map(lambda x: x[-2].strip(' ').lower(), data))

    for i, item in enumerate(text_data):
        try:
            total_sum: float = None
            
            if any(item.startswith(keyword) or keyword.startswith(item) for keyword in total_sum_keywords):
                item = item.replace(',', '.')
                # case when keyword and sum got merged in one string (unlikely)
                if item[-1].isdigit():
                    buffer: str = ''
                    while item[-1].isdigit() or item[-1] == '.':
                        buffer = item.pop() + buffer
                    total_sum = float(buffer)

                # most likely case of next item being a total sum
                if is_numeric(d := text_data[i + 1].replace(',', '.').replace(' ', '')):
                    total_sum = float(d)
                # case when something got in between keyword and sum (very unlikely)
                elif is_numeric(d := text_data[i + 2].replace(',', '.').replace(' ', '')):
                    total_sum = float(d)

                return total_sum

        except Exception as e:
            print(e)
            return None


def get_servings(data: list) -> list:
    total_sum_keywords: set = {'итог', 'всего', 'к оплат', 'сумм'}
    servings_keywords: set = {'блюд', 'наимен', 'назван'}
    amount_keywords: set = {'кол'}
    serving_sum_keywords: set = {'сумм'}
    
    # extract bounding boxes and text
    data = list(map(lambda x: (x[0], x[1].strip(' ').lower()), data))

    serving_index: int = None
    amount_index: int = None
    serving_sum_index: int = None

    # find boxes for serving, amount and serving sum
    for item in data:
        # if all boxes are found, break
        if serving_index and amount_index and serving_sum_index:
            break
        # check if keyword is in text
        if any(item[-1].startswith(keyword) or keyword.startswith(item[-1]) for keyword in servings_keywords):
            serving_bounding_box = item[0]
        elif any(item[-1].startswith(keyword) or keyword.startswith(item[-1]) for keyword in amount_keywords):
            amount_bounding_box = item[0]
        elif any(item[-1].startswith(keyword) or keyword.startswith(item[-1]) for keyword in serving_sum_keywords):
            servings_start = data.index(item) + 1
            serving_sum_bounding_box = item[0]

    recog_width: int = max(item[0][1][0] for item in data) - min(item[0][1][0] for item in data)
    
    serving_bounding_col:       tuple = (serving_bounding_box[0][0] - 0.05*recog_width, amount_bounding_box[0][0])
    amount_bounding_col:        tuple = (serving_bounding_box[1][0] + 0.20*recog_width, serving_sum_bounding_box[0][0])
    serving_sum_bounding_col:   tuple = (amount_bounding_box[1][0], serving_sum_bounding_box[1][0] + 0.05*recog_width)
    # serving_bounding_col      => from left serving_name - width*5% to left amount_name
    # amount_bounding_col       => from right serving_name + width*20% to left serving_sum_name
    # serving_sum_bounding_col  => from right amount_name to right serving_sum_name + width*5%


    servings: list = []
    serving: dict = {'name': None, 'amount': None, 'sum': None}
    # start iteration from second item after serving_sum
    for item in data[servings_start:]:
        box, text = item
        text =  text.replace(',', '.')
        # if reached total sum (out of servings) break
        if any(text.startswith(keyword) or keyword.startswith(text) for keyword in total_sum_keywords):
            break
        if serving['name'] and serving['amount'] and serving['sum']:
            servings.append(serving)
            serving = {'name': None, 'amount': None, 'sum': None}


        if serving_bounding_col[0] <= box[0][0] and box[1][0] <= serving_bounding_col[1]:
            serving['name'] = text
            continue
        elif amount_bounding_col[0] <= box[0][0] and box[1][0] <= amount_bounding_col[1]:
            serving['amount'] = text
            continue
        elif serving_sum_bounding_col[0] <= box[0][0] and box[1][0] <= serving_sum_bounding_col[1]:
            serving['sum'] = text
            continue
        
        elif serving_bounding_col[0] <= box[0][0] and box[1][0] <= amount_bounding_col[1]:
            s: list = text.split(' ')
            buffer: str = ''
            while s:
                if not (is_numeric(s[-1]) or s[-1].startswith('.') or s[-1].endswith('.')):
                    break
                buffer = s.pop() + buffer
            s = ' '.join(s)
            if not is_numeric(s):
                serving['name'] = s
            if is_numeric(buffer):
                serving['amount'] = buffer
            continue
        
        elif amount_bounding_col[0] <= box[0][0] and box[1][0] <= serving_sum_bounding_col[1]:
            s: list = text.split('  ')
            s = list(map(lambda x: x.replace(' ', ''), s))
            if is_numeric(s[0]):
                serving['amount'] = s[0]
            if is_numeric(s[-1]) and s[0] != s[-1]:
                serving['sum'] = s[-1]
            continue

    for s in servings:
        s['amount'] = float(s['amount'])
        if s['amount'] > 1:
            s['sum'] = float(float(s['sum']) / s['amount'])
    
    return servings