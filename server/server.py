'''
Gartic WebSocket server

Copyright (c) 2024 GoodCoder666
'''
import asyncio
import json
import websockets
import random
import difflib
from utils import SimpleLogger, read_wordbase

from argparse import ArgumentParser

parser = ArgumentParser(description='Gartic WebSocket server')
parser.add_argument('wordbase', type=str, help='wordbase file path')
parser.add_argument('-l', '--limit', action='store_true', help='limit single IP connections')
parser.add_argument('--addr', type=str, required=True, help='server address')
parser.add_argument('--password', type=str, default='123456', help='server password, defaults to 123456')
parser.add_argument('--port', type=int, default=1225, help='server port, defaults to 1225')
parser.add_argument('--round-time', type=int, default=90, help='round time in seconds')
parser.add_argument('--sleep-time', type=int, default=10, help='sleep time in seconds between rounds')
parser.add_argument('--close-threshold', type=float, default=0.75, help='close guess similarity threshold')

args = parser.parse_args()

WORDBASE = read_wordbase(args.wordbase)
LIMIT_SINGLE_IP = args.limit
PASSWORD = args.password
ADDR = args.addr
PORT = args.port
ROUND_TIME = args.round_time
SLEEP_TIME = args.sleep_time
CLOSE_THRESHOLD = args.close_threshold
user_sockets = []
usernames = []

current_answer = None
current_host = None

logger = SimpleLogger()

def dumps(type, **kwargs):
    return json.dumps({'type': type, **kwargs})

def isclose(s, t):
    return difflib.SequenceMatcher(str.isspace, s.lower(), t.lower()).ratio() >= CLOSE_THRESHOLD

async def process_commands():
    while True:
        command = await asyncio.to_thread(input)
        command = command.split()
        if not command:
            continue
        match command[0]:
            case 'list':
                for username, websocket in zip(usernames, user_sockets):
                    print(f'{username} [{websocket.remote_address[0]}]')
            case 'kick':
                if len(command) < 2:
                    print('usage: kick <username>')
                    continue
                for username in command[1:]:
                    try:
                        idx = usernames.index(username)
                        websocket = user_sockets[idx]
                        await websocket.close()
                        print(f'kicked {username}')
                    except ValueError:
                        print(f'{username} not found')
                    except Exception as e:
                        print(f'error kicking {username}: {e}')
            case _:
                print(f'unknown command: {command[0]}')

async def user_loop(websocket: websockets.WebSocketServerProtocol):
    addr = websocket.remote_address[0]
    if LIMIT_SINGLE_IP and addr in (ws.remote_address[0] for ws in user_sockets):
        logger.info(f'connection from {addr} already exists')
        return
    logger.info(f'new connection from {addr}')
    # ask for password
    while True:
        password = await websocket.recv()
        if password == PASSWORD:
            break
        await websocket.send('0')
    await websocket.send('1')
    logger.info(f'connection from {addr} authenticated')
    # ask for username
    while True:
        username = await websocket.recv()
        username = username.strip()
        if 0 < len(username) <= 20 and username not in usernames:
            break
        await websocket.send('0')
    await websocket.send('1')
    logger.info(f'player {username} [{addr}] connected')
    # add user
    websockets.broadcast(user_sockets, dumps('add_user', user=username))
    user_sockets.append(websocket)
    usernames.append(username)
    # process messages
    try:
        await websocket.send(dumps('welcome', users=usernames, host=current_host))
        async for message in websocket:
            data = json.loads(message)
            if 'type' not in data:
                logger.warn(f'invalid message from {username}: {message}')
                continue
            match data['type']:
                case 'chat' if len(data['content']) <= 40:
                    websockets.broadcast(user_sockets, dumps('chat', user=username, content=data['content']))
                case 'guess' if current_answer and username != current_host and len(data['content']) <= 20:
                    guess = data['content']
                    if guess.lower() == current_answer.lower():
                        websockets.broadcast(user_sockets, dumps('guess', user=username, correct=True))
                    elif isclose(guess, current_answer):
                        await websocket.send(dumps('close_guess', content=guess))
                    else:
                        websockets.broadcast(user_sockets, dumps('guess', user=username, correct=False, content=guess))
                case 'draw' | 'clear' if username == current_host:
                    websockets.broadcast(filter(lambda ws: ws != websocket, user_sockets), message)
                case _:
                    logger.warn(f'invalid message from {username}: {message}')
    except websockets.exceptions.ConnectionClosed as e:
        logger.warn(f'connection to {username} [{addr}] accidentally closed: {e}')
    # remove user
    logger.info(f'player {username} [{addr}] disconnected')
    user_sockets.remove(websocket)
    usernames.remove(username)
    if not usernames:
        logger.warn('server is now empty')
    else:
        websockets.broadcast(user_sockets, dumps('remove_user', user=username))

async def main():
    global current_answer, current_host
    async with websockets.serve(user_loop, ADDR, PORT):
        logger.info(f'server running on ws://{ADDR}:{PORT}')
        asyncio.create_task(process_commands())
        # game loop
        current_player = -1
        while True:
            # wait for players
            if len(usernames) < 2:
                logger.info('waiting for players')
                while len(usernames) < 2:
                    await asyncio.sleep(1)
                await asyncio.sleep(5)
            # start new round
            current_player = (current_player + 1) % len(usernames)
            current_answer = random.choice(WORDBASE)
            username, user_socket = usernames[current_player], user_sockets[current_player]
            logger.info(f'new round: host {username}, answer {current_answer}')
            current_host = username
            await user_socket.send(dumps('your_turn', answer=current_answer, time=ROUND_TIME))
            websockets.broadcast(filter(lambda ws: ws != user_socket, user_sockets),
                                 dumps('new_round', host=username, time=ROUND_TIME))
            # wait for round to end
            await asyncio.sleep(ROUND_TIME)
            logger.info('round over')
            answer = current_answer
            current_answer = current_host = None
            websockets.broadcast(user_sockets, dumps('round_over', answer=answer, time=SLEEP_TIME))
            await asyncio.sleep(SLEEP_TIME)

asyncio.run(main())