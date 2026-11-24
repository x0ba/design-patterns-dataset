// Stub for `electron-updater` (GitHub releases update feed): reports no update.
const EventEmitter = require('events');
const autoUpdater = new EventEmitter();
autoUpdater.checkForUpdates = () => { autoUpdater.emit('update-not-available', { version: require('../../../package.json').version }); return Promise.resolve(null); };
autoUpdater.quitAndInstall = () => {};
module.exports = { autoUpdater };
