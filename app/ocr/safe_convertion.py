def is_numeric(value: str) -> bool:
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False

def clear_text(text: str) -> str:
    for ch in (':', ';', '%', '$', '!', '/', '?', '-', '|', "'", '"'):  # cursed '"' and "'" :D
        text = text.replace(ch, '')
    return text
