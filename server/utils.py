'''
Gartic server utilties

Copyright (c) 2024 GoodCoder666

MIT License
'''
from datetime import datetime

class SimpleLogger:
    '''
    Simple logger for replacement of `print()`
    '''
    def __init__(self, time_format=None):
        self.time_format = time_format or '%Y-%m-%d %H:%M:%S'

    def info(self, message):
        time = datetime.now().strftime(self.time_format)
        print(f'[INFO {time}] {message}')

    def warn(self, message):
        time = datetime.now().strftime(self.time_format)
        print(f'[WARNING {time}] {message}')

def read_wordbase(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f.readlines()]