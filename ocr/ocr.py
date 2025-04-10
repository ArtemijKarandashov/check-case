# import easyocr
from safe_convertion import is_numeric


# reader = easyocr.Reader(['ru'])


def get_ocr_data(reader: easyocr.Reader(['ru']), img_path: str, **kwargs) -> list:
    width_ths:  float = 2.5
    height_ths: float = 1.5

    data: list = reader.readtext(img_path, width_ths=width_ths, height_ths=height_ths, detail=0)

    return data


def get_total_sum(data: list) -> dict[str: float]:
    total_sum_keywords: set = {'итог', 'всего', 'к оплат'}

    for i, item in enumerate(data):
        try:
            item: str = item.lower().strip(' ')
            if any(item.startswith(keyword) or keyword.startswith(item) for keyword in total_sum_keywords):
                item = item.replace(',', '.')
                if item[-1].isdigit():                               # case when keyword and sum got merged in one string
                    buffer: str = ''
                    while item[-1].isdigit() or item[-1] == '.':
                        buffer = item.pop() + buffer
                    total_sum = float(buffer)

                if is_numeric(d := data[i + 1].replace(',', '.')):   # most likely case of next item being a total sum (unlikely)
                    total_sum = float(d)
                elif is_numeric(d := data[i + 2].replace(',', '.')): # case when something got in between keyword and sum (very unlikely)
                    total_sum = float(d)

                return {'sum': total_sum}

        except Exception as e:                  # ugly failsafe
            print(e)
            return 0
