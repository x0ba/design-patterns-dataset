// Test helper: run a command in its own process group and kill the whole group after N seconds.
const { spawn } = require('child_process')
const [secs, ...cmd] = process.argv.slice(2)
const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', detached: true, env: process.env })
const killAll = () => { try { process.kill(-child.pid, 'SIGTERM') } catch {} ; setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL') } catch {} ; process.exit(0) }, 1500) }
setTimeout(killAll, +secs * 1000)
child.on('exit', () => process.exit(0))
