// Stub "other participants": socket.io clients that join the seeded room via
// the app's own /stream namespace (subscribe, chat events) exactly like the
// browser client does. Whenever a new user arrives in the room, the chat
// history from seed-chat.js is replayed to the room, then the bots post an
// occasional live message.
const { io } = require('./stubs/node_modules/socket.io-client');
const { people, history, live } = require('./seed-chat');

const PORT = process.env.PORT || 4441;
const ROOM = process.env.SEED_ROOM || 'Tidewater_Weekly Sync_2813309571';
const URL = `http://127.0.0.1:${PORT}/stream`;

const bots = {};
const botIds = new Set();
let replaying = false;
let liveIdx = 0;

function say(key, msg) {
  const b = bots[key];
  if (!b || !b.socket.connected) return;
  b.socket.emit('chat', { room: ROOM, msg, sender: `${b.name} (${b.id})` });
}

function replay() {
  if (replaying) return;
  replaying = true;
  history.forEach(([who, msg], i) => setTimeout(() => say(who, msg), 300 + i * 35));
  setTimeout(() => { replaying = false; }, 300 + history.length * 35 + 100);
}

function connectBot(key) {
  const p = people[key];
  const socket = io(URL, { transports: ['websocket'], reconnection: true, reconnectionDelay: 500 });
  bots[key] = { ...p, socket };
  socket.on('connect', () => {
    const socketId = socket.io.engine.id;
    botIds.add(socketId);
    socket.emit('subscribe', { room: ROOM, socketId });
  });
  // Only one bot coordinates the replay so messages stay in order.
  if (key === 'priya') {
    socket.on('new user', (data) => {
      if (botIds.has(data.socketId)) return;
      setTimeout(replay, 150);
    });
  }
}

function start() {
  Object.keys(people).forEach(connectBot);
  setInterval(() => {
    const [who, msg] = live[liveIdx++ % live.length];
    say(who, msg);
  }, 75000);
  console.log(`[participants] ${Object.keys(people).length} participants in room "${ROOM}"`);
}

start();
