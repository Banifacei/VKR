#!/usr/bin/env python3
"""
Homework file security scanner.
Usage: python3 scan_file.py <filepath> <ext>
Output: JSON {"safe": bool, "reason"?: str}
"""
import sys
import json
import os
import zipfile


def scan_pdf(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    dangerous = []
    for pat in [b'/JS ', b'/JS\n', b'/JS\r', b'/JavaScript', b'/OpenAction',
                b'/Launch', b'/EmbeddedFile', b'/RichMedia', b'/AA ']:
        if pat in content:
            dangerous.append(pat.decode().strip())
    if dangerous:
        return {'safe': False, 'reason': 'PDF содержит опасные элементы: ' + ', '.join(dangerous)}
    return {'safe': True}


def scan_modern_office(filepath):
    """DOCX / XLSX / PPTX — ZIP-архив, проверяем наличие vbaProject.bin"""
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            if any('vbaProject.bin' in name for name in z.namelist()):
                return {'safe': False, 'reason': 'Обнаружены VBA макросы в документе'}
    except zipfile.BadZipFile:
        return {'safe': False, 'reason': 'Файл не является валидным Office документом'}
    return {'safe': True}


def scan_legacy_office(filepath):
    """DOC / XLS — бинарный OLE формат"""
    try:
        from oletools.oleid import OleID
        for ind in OleID(filepath).check():
            if ind.id in ('vba', 'xlm') and ind.value is True:
                return {'safe': False, 'reason': f'Обнаружены {ind.id.upper()} макросы в документе'}
    except ImportError:
        pass
    except Exception as e:
        return {'safe': False, 'reason': f'Ошибка при сканировании: {e}'}
    return {'safe': True}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'safe': False, 'reason': 'Неверные аргументы сканера'}))
        sys.exit(1)

    filepath, ext = sys.argv[1], sys.argv[2].lower()

    if not os.path.exists(filepath):
        print(json.dumps({'safe': False, 'reason': 'Файл не найден'}))
        sys.exit(1)

    try:
        if ext == 'pdf':
            result = scan_pdf(filepath)
        elif ext in ('docx', 'xlsx', 'pptx'):
            result = scan_modern_office(filepath)
        elif ext in ('doc', 'xls'):
            result = scan_legacy_office(filepath)
        else:
            result = {'safe': True}
    except Exception as e:
        result = {'safe': False, 'reason': f'Неожиданная ошибка сканера: {e}'}

    print(json.dumps(result))


if __name__ == '__main__':
    main()
