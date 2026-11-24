// Stub for `auto-launch` (OS login-item integration): keeps state in memory.
class AutoLaunch {
  constructor (opts) { this.opts = opts; this.enabled = false; }
  enable () { this.enabled = true; return Promise.resolve(); }
  disable () { this.enabled = false; return Promise.resolve(); }
  isEnabled () { return Promise.resolve(this.enabled); }
}
module.exports = AutoLaunch;
