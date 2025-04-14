# import easyocr
from safe_convertion import is_numeric


# reader = easyocr.Reader(['ru'])


def get_ocr_data(reader: easyocr.Reader(['ru']), img_path: str, **kwargs) -> list:
    width_ths:  float = 2
    height_ths: float = 1.5

    data: list = reader.readtext(img_path, width_ths=width_ths, height_ths=height_ths, detail=0)

    return data


def get_total_sum(data: list) -> dict[str: float]:
    total_sum_keywords: set = {'итог', 'всего', 'к оплат'}
    data = list(map(lambda x: x.lower().strip(' '), data))

    for i, item in enumerate(data):
        try:
            total_sum: float = None
            if any(item.startswith(keyword) or keyword.startswith(item) for keyword in total_sum_keywords):
                item = item.replace(',', '.')
                # case when keyword and sum got merged in one string
                if item[-1].isdigit():
                    buffer: str = ''
                    while item[-1].isdigit() or item[-1] == '.':
                        buffer = item.pop() + buffer
                    total_sum = float(buffer)

                # most likely case of next item being a total sum (unlikely)
                if is_numeric(d := data[i + 1].replace(',', '.').replace(' ', '')):
                    total_sum = float(d)
                # case when something got in between keyword and sum (very unlikely)
                elif is_numeric(d := data[i + 2].replace(',', '.').replace(' ', '')):
                    total_sum = float(d)

                return {'sum': total_sum}

        except Exception as e:                  # ugly failsafe
            print(e)
            return None


def get_servings(self) -> list:
    servings_keywords: set = {'блюд', 'наимен'}
    amount_keywords: set = {'кол'}
    serving_sum_keywords: set = {'сумм'}

    data = list(map(lambda x: x.lower().strip(' '), data))

    serving_index: int = None
    amount_index: int = None
    serving_sum_index: int = None

    for i in range(len(data)):
        if serving_index and amount_index and serving_sum_index:
            break
        if any(data[i].startswith(keyword) or keyword.startswith(data[i]) for keyword in servings_keywords):
            serving_index = i
        elif any(data[i].startswith(keyword) or keyword.startswith(data[i]) for keyword in amount_keywords):
            amount_index = i
        elif any(data[i].startswith(keyword) or keyword.startswith(data[i]) for keyword in serving_sum_keywords):
            serving_sum_index = i

    
    amount_index_shift: int = amount_index - serving_index
    serving_sum_index_shift: int = serving_sum_index - serving_index

    servings: list = []

    for i in range(serving_sum_index + 1, len(data)):
        serving: dict = {'name': '', 'amount': 0, 'sum': 0}
        s_name = data[i].split(' ') # 'лаваш'
        
        if not is_numeric(s_name[0]):
            serving['name'] = s_name[0]

            if len(s_name) == 1:
                s_amount = data[i + amount_index_shift].replace(',', '.').replace(' ', '')
                if is_numeric(s_amount) \
                and is_numeric(d2 := data[i + serving_sum_index_shift].replace(',', '.').replace(' ', '')):
                    serving['amount'] = float(d1)
                    serving['sum'] = float(d2) / serving['amount']
                    servings.append(serving)
            elif len(s_name) == 2:
                pass
            if not is_numeric(s_name[0]):
                if is_numeric(s_name[1]) \
                and is_numeric(d2 := data[i + amount_index_shift].replace(',', '.').replace(' ', '')):
                    serving['name'] = str(s_name[0])
                    serving['amount'] = float(d1)
                    serving['sum'] = float(d2) / serving['amount']
                    servings.append(serving)
                elif len(s_name) == 3:
                    pass
        else:
            continue
                

    return servings



'''
class OCR:
    def __init__(self, reader: easyocr.Reader(['ru'], self.img_path)):
        self._width_ths:  float = 2
        self._height_ths: float = 1.5
        self.__total_sum_keywords: set = {'итог', 'всего', 'к оплат'}

        self.__position_keywords: set
        
        self._reader = reader
        self.img_path = img_path

        self._data: list
        self._total_sum: float

        if self._reader is None:
            raise ValueError("No reader provided.")
        if self.img_path is None:
            raise ValueError("No image path provided.")

        self._data = get_ocr_data(self._reader, img_path, width_ths=self._width_ths, height_ths=self._height_ths, detail=0)
        self._total_sum = get_total_sum(self._data)
    
    def get_ocr_data(self, img_path: str, **kwargs) -> list:
        return reader.readtext(img_path, width_ths=self._width_ths, height_ths=self._height_ths, detail=0)

    def get_total_sum(self) -> float:
        data = list(map(lambda x: x.lower(), self._data))
        for i, item in enumerate(data):
            try:
                item: str = item.strip(' ')
                if any(item.startswith(keyword) or keyword.startswith(item) for keyword in self.__total_sum_keywords):
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

                    return {'total_sum': total_sum}
                    # return total_sum

            except Exception as e:                  # ugly failsafe
                print(e)
                return None



        # for i, item in enumerate(data):





    @property
    def width_ths(self) -> float:
        return self._width_ths
    
    @width_ths.setter
    def width_ths(self, value: float):
        self._width_ths = value
    
    @property
    def height_ths(self) -> float:
        return self._height_ths

    @height_ths.setter
    def height_ths(self, value: float):
        self._height_ths = value

        
'''