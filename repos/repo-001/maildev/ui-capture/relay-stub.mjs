// Local stand-in for the outgoing relay SMTP server (e.g. a team's SES/Mailgun
// smarthost). MailDev's "Relay" feature delivers here instead of the internet.
// Accepts every message and discards it, replying like a real MTA would.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(here, '..', 'packages', 'smtp', 'package.json'))
const { SMTPServer } = require('smtp-server')

const port = parseInt(process.env.RELAY_PORT ?? '5587', 10)
let n = 0

const server = new SMTPServer({
  name: 'smtp.relay.local',
  banner: 'Relay stub ready',
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onAuth(auth, session, cb) {
    cb(null, { user: auth.username })
  },
  onData(stream, session, cb) {
    stream.on('data', () => {})
    stream.on('end', () => {
      n += 1
      const to = session.envelope.rcptTo.map((r) => r.address).join(', ')
      console.log(`[relay-stub] accepted message #${n} for ${to}`)
      cb(null, `2.0.0 Ok: queued as RLY${Date.now().toString(36).toUpperCase()}`)
    })
  },
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[relay-stub] listening on 127.0.0.1:${port}`)
})
