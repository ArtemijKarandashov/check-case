class Connection:
    def __init__(self, session_key, user_id):
        self.session_key = session_key
        self.user_id = user_id
    
    # Методы для взаимодействия с пользователями внутри сессии (Например динамическое обновление данных)