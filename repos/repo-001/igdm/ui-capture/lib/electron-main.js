// Minimal stand-in for the `electron` module in the main process, so the
// app's real main/main.js can run under plain Node. Windows become browser
// pages; webContents.send / ipcMain are bridged to the browser over SSE+POST
// (see server.js and public/electron-renderer.js).
'use strict';

const EventEmitter = require('events');
const path = require('path');
const url = require('url');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const bridge = new EventEmitter(); // 'send' (channel, args) and 'navigate' (webPath)
let currentPage = '/browser/login.html';
let badge = 0;
let dialogSeq = 0;
const pendingDialogs = {};

function fileUrlToWebPath (u) {
  const p = u.startsWith('file:') ? url.fileURLToPath(u) : u;
  return '/' + path.relative(REPO_ROOT, path.resolve(p)).split(path.sep).join('/');
}

class WebContents extends EventEmitter {
  constructor (win) { super(); this.win = win; }
  send (channel, ...args) { bridge.emit('send', channel, args, this.win); }
  openDevTools () {}
}

let windowCount = 0;
class BrowserWindow extends EventEmitter {
  constructor (opts) {
    super();
    this.id = ++windowCount;
    this.opts = opts || {};
    this.webContents = new WebContents(this);
    this.title = '';
  }
  setTitle (t) { this.title = t; }
  loadURL (u) {
    const p = fileUrlToWebPath(u);
    if (this.id === 1 || /index\.html|login\.html/.test(p)) {
      currentPage = p;
      bridge.emit('navigate', p);
    }
    return Promise.resolve();
  }
  close () { this.emit('closed'); }
  focus () {}
  show () {}
}

class IpcMain extends EventEmitter {}
const ipcMain = new IpcMain();

const app = new EventEmitter();
Object.assign(app, {
  getPath: () => process.env.IGDM_USER_DATA || path.join(__dirname, '..', 'userdata'),
  getName: () => 'IGdm',
  getVersion: () => require(path.join(REPO_ROOT, 'package.json')).version,
  setAppUserModelId () {},
  setBadgeCount (n) { badge = n; },
  getBadgeCount: () => badge,
  quit () {},
});

const Menu = {
  buildFromTemplate: (t) => ({ items: t }),
  setApplicationMenu () {},
  getApplicationMenu: () => ({ items: [] }),
};

const dialog = {
  // Shown in the browser as a confirm() prompt; the selected button index is
  // passed to the callback the app supplies.
  showMessageBox (win, options, callback) {
    const id = ++dialogSeq;
    return new Promise((resolve) => {
      pendingDialogs[id] = (response) => {
        if (typeof callback === 'function') callback(response);
        resolve({ response });
      };
      bridge.emit('send', '__dialog', [{ id, options }]);
    });
  },
  showErrorBox (title, content) {
    console.error(`[dialog] ${title}: ${content}`);
    bridge.emit('send', '__errorBox', [{ title, content }]);
  },
};

const shell = { openExternal: (u) => { console.log('[shell] openExternal', u); return Promise.resolve(); } };

module.exports = {
  electron: { app, BrowserWindow, ipcMain, Menu, dialog, shell, remote: null },
  bridge,
  currentPage: () => currentPage,
  resolveDialog (id, response) {
    const fn = pendingDialogs[id];
    delete pendingDialogs[id];
    if (fn) fn(response);
  },
};
