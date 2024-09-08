// Gartic web app script
// Copyright (c) 2024 GoodCoder666
// MIT License

var ws;
var username;

var usernames = [];
var currentHost;

function fillServerAddress() {
  const serverAddress = document.getElementById('server-address');
  serverAddress.value = `ws://${window.location.hostname}:1225`;
  serverAddress.focus();
}

fillServerAddress();

function detectEnter(event, callback) {
  if (event.keyCode === 13) {
    callback();
  }
}

function connectToServer() {
  const addr = document.getElementById('server-address').value;
  ws = new WebSocket(addr);

  function alertConnectionLost() {
    console.log('Connection closed');
    alert('连接意外断开。请检查网络并重新连接。')
  }

  ws.addEventListener('close', alertConnectionLost)

  ws.addEventListener('error', e => {
    console.log('Connection error: ' + e);
    alert('WebSocket 连接出错。请前往控制台查看错误信息。')
  })

  ws.addEventListener('open', () => {
    console.log('Connected')
    document.getElementById('server-setup-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('password').focus();
  })

  window.addEventListener('beforeunload', () => {
    ws.removeEventListener('close', alertConnectionLost);
    ws.close();
  })
}

function systemMessage(msg, useGuessBox = false) {
  const chatBox = document.getElementById(useGuessBox ? 'guess-chat-box' : 'chat-box');
  const message = document.createElement('div');
  message.textContent = `[系统] ${msg}`;
  message.style.fontWeight = 'bold';
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setGuessEnabled(enabled) {
  document.getElementById('guess-input').disabled = !enabled;
  document.getElementById('guess-button').disabled = !enabled;
}

const controls = document.getElementById('controls');

function showControls() {
  controls.className = 'controls';
}

function hideControls() {
  controls.className = 'hidden';
}

const drawingTitle = document.getElementById('drawing-title');

function parseMessage(event) {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'welcome':
      usernames = message.users;
      currentHost = message.host;
      if (currentHost) {
        setGuessEnabled(true);
      }
      hideControls();
      updateUserList();
      break;
    case 'your_turn':
      currentHost = username;
      drawingTitle.textContent = message.answer;
      clearCanvas();
      systemMessage(`你的回合！答案是 ${message.answer}`, true);
      setGuessEnabled(false);
      showControls();
      updateUserList();
      startTimer(message.time);
      break;
    case 'new_round':
      currentHost = message.host;
      drawingTitle.textContent = `${currentHost} 的画板`;
      clearCanvas();
      systemMessage(`${currentHost} 的回合`, true);
      setGuessEnabled(true);
      hideControls();
      updateUserList();
      startTimer(message.time);
      break;
    case 'round_over':
      currentHost = null;
      drawingTitle.textContent = message.answer;
      systemMessage(`回合结束！答案是 ${message.answer}`, true);
      setGuessEnabled(false);
      hideControls();
      startTimer(message.time);
      break;
    case 'add_user':
      systemMessage(`${message.user} 加入了游戏`);
      usernames.push(message.user);
      updateUserList();
      break;
    case 'remove_user':
      systemMessage(`${message.user} 离开了游戏`);
      usernames.splice(usernames.indexOf(message.user), 1);
      updateUserList();
      break;
    case 'chat':
      addChatMessage(message.user, message.content);
      break;
    case 'guess':
      addGuessMessage(message.user, message.correct, message.content);
      break;
    case 'close_guess':
      addCloseGuess(message.content);
      break;
    case 'draw':
      const [x1, y1, x2, y2, color, size] = message.data;
      drawLine(context, x1, y1, x2, y2, color, size);
      break;
    case 'clear':
      context.clearRect(0, 0, canvas.width, canvas.height);
      break;
  }
}

function login() {
  const password = document.getElementById('password').value;
  ws.send(password);
  ws.onmessage = e => {
    if (e.data === '1') {
      document.getElementById('login-container').classList.add('hidden');
      document.getElementById('username-container').classList.remove('hidden');
      document.getElementById('username').focus();
    } else {
      alert('密码错误，请重新输入！');
    }
  }
}

function setUsername() {
  username = document.getElementById('username').value;
  if (username.length > 20) {
    alert('用户名长度不能超过 20 字符！');
    return;
  }
  ws.send(username);
  ws.onmessage = e => {
    if (e.data === '1') {
      document.getElementById('username-container').classList.add('hidden');
      document.getElementById('game-container').classList.remove('hidden');
      document.getElementById('game-container').classList.add('game-container');
      ws.onmessage = null;
      ws.addEventListener('message', parseMessage);
    } else {
      alert('用户名重复，请重新输入！');
    }
  }
}

function updateUserList() {
  const ul = document.getElementById('usernames');
  const current_username = username;
  ul.innerHTML = '';
  usernames.forEach(username => {
    const li = document.createElement('li');
    if (username === currentHost) {
      li.style.fontWeight = 'bold';
    }
    if (username === current_username) {
      username = `* ${username}`;
    }
    li.textContent = username;
    ul.appendChild(li);
  });
}

function addChatMessage(user, content) {
  const chatBox = document.getElementById('chat-box');
  const message = document.createElement('div');
  message.textContent = `${user}: ${content}`;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addGuessMessage(user, correct, content) {
  const guessChatBox = document.getElementById('guess-chat-box');
  const message = document.createElement('div');
  if (correct) {
    if (user === username) {
      setGuessEnabled(false);
      message.textContent = '你猜对了!';
    } else {
      message.textContent = `${user} 猜中了答案!`;
    }
    message.className = 'correct-guess';
  } else {
    message.textContent = `${user}: ${content}`;
  }
  guessChatBox.appendChild(message);
  guessChatBox.scrollTop = guessChatBox.scrollHeight;
}

function addCloseGuess(content) {
  const guessChatBox = document.getElementById('guess-chat-box');
  const message = document.createElement('div');
  message.textContent = `${content} 很接近了!`;
  message.className = 'close-guess';
  guessChatBox.appendChild(message);
  guessChatBox.scrollTop = guessChatBox.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value;
  if (message.length > 40) {
    alert('消息长度不能超过 40 字符！');
  } else if (message) {
    ws.send(JSON.stringify({ type: 'chat', content: message }));
    input.value = '';
  }
}

function sendGuess() {
  const input = document.getElementById('guess-input');
  const guess = input.value;
  if (guess.length > 20) {
    alert('猜测长度不能超过 20 字符！');
  } else if (guess) {
    ws.send(JSON.stringify({ type: 'guess', content: guess }));
    input.value = '';
  }
}

// Drawing module
let isDrawing = false;
let x = 0;
let y = 0;

const canvas = document.getElementById('drawing-board');
const context = canvas.getContext('2d');

const colorPicker = document.getElementById('color-picker');
const brushSize = document.getElementById('brush-size');

canvas.addEventListener('mousedown', e => {
  if (currentHost === username) {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
  }
});

canvas.addEventListener('mouseup', () => {
  if (isDrawing) {
    isDrawing = false;
    context.beginPath();
  }
});

canvas.addEventListener('mousemove', e => {
  if (isDrawing) {
    const x1 = x, y1 = y, x2 = e.offsetX, y2 = e.offsetY;
    const color = colorPicker.value, size = brushSize.value;
    drawLine(context, x1, y1, x2, y2, color, size);
    ws.send(JSON.stringify({ type: 'draw', data: [x1, y1, x2, y2, color, size] }));
    x = x2, y = y2;
  }
});

function clearCanvas() {
  if (username === currentHost) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    ws.send(JSON.stringify({ type: 'clear' }));
  }
}

function drawLine(context, x1, y1, x2, y2, color, size) {
  context.lineWidth = size;
  context.lineCap = 'round';
  context.strokeStyle = color;

  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.beginPath();
  context.moveTo(x2, y2);
}

// timer utility functions
const timerBarContainer = document.getElementById('timer-bar-container');
const timerBar = document.getElementById('timer-bar');

let timerInterval;

function startTimer(secs) {
  clearInterval(timerInterval);
  timerBarContainer.classList.remove('hidden');
  timerBar.style.width = '100%';
  let startTime = Date.now();

  timerInterval = setInterval(() => {
    let elapsedTime = (Date.now() - startTime) / 1000;
    let progress = 1 - (elapsedTime / secs);

    if (progress <= 0) {
      clearInterval(timerInterval);
      timerBar.style.width = '0%';
    } else {
      timerBar.style.width = (progress * 100) + '%';
    }
  }, 100);
}

function hideTimer() {
  clearInterval(timerInterval);
  timerBarContainer.classList.add('hidden');
}
