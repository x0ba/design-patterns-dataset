// Seeds a running MailDev with ~4 months of mail from "Fernhill", a fictional
// clinic scheduling + billing SaaS whose developer points their local/staging
// app at MailDev. Everything goes in through MailDev's own paths:
//   - delivered over SMTP (port $SMTP_PORT) with nodemailer
//   - opened through the REST API (GET /api/email/:id marks it read)
//   - a few relayed through POST /api/email/:id/relay/:to (goes to relay-stub)
//
// Deterministic (seeded PRNG); dates are relative to "now" so the inbox always
// looks current.
import nodemailer from 'nodemailer'
import { deflateSync } from 'node:zlib'

const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '5025', 10)
const WEB = process.env.WEB_URL ?? 'http://127.0.0.1:5405'

// ---------- PRNG ----------
let seed = 20260716
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const chance = (p) => rnd() < p

// ---------- time helpers ----------
const NOW = Date.now()
let CUR = new Date(NOW) // send date of the message being rendered
const DAY = 86400000
const MIN = 60000
// A working-hours timestamp `daysAgo` days back (Pacific-ish dev hours in UTC)
function workTime(daysAgo) {
  const d = new Date(NOW - daysAgo * DAY)
  if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    // Mostly weekdays; push weekend items to Friday/Monday unless it's a cron job
    d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 6 ? -1 : 1))
  }
  d.setUTCHours(int(16, 25) % 24, int(0, 59), int(0, 59), 0) // 9am–6pm PT
  if (d.getTime() > NOW) return new Date(NOW - int(5, 300) * MIN)
  return d
}

// ---------- people ----------
const customers = [
  ['Priya Raman', 'priya.raman@example.com'],
  ['Dr. Marcus Ojukwu', 'marcus@ojukwuvet.example'],
  ['Hannah Lindqvist', 'hannah.lindqvist@example.org'],
  ['Tomás Alvarez', 'tomas.alvarez@example.com'],
  ['Grace Whitfield', 'gwhitfield@cedarbrookanimal.example'],
  ['Kenji Watanabe', 'kenji.w@example.net'],
  ['Amara Nwosu', 'amara@nwosu-dental.example'],
  ['Eli Bergstrom', 'eli.bergstrom@example.com'],
  ['Sofia Marchetti', 'sofia@pawsandclaws.example'],
  ['Declan Byrne', 'declan.byrne@example.ie'],
  ['Rosa Delgado', 'rosa.delgado@example.com'],
  ['Wen Li', 'wen.li@harborpt.example'],
  ['Olivia Kessler', 'okessler@example.com'],
  ['Jamal Carter', 'jamal.carter@example.com'],
  ['Ingrid Solberg', 'ingrid@fjordphysio.example'],
  ['Nadia Haddad', 'nadia.haddad@example.org'],
]
const clinics = [
  'Ojukwu Veterinary Hospital',
  'Cedarbrook Animal Clinic',
  'Nwosu Family Dental',
  'Paws & Claws Mobile Vet',
  'Harbor Physical Therapy',
  'Fjord Physio & Sports',
  'Riverside Pediatrics',
  'Maple Street Chiropractic',
]
const qa = [
  ['QA Bot', 'qa+signup@fernhill.dev'],
  [null, 'test+0412@fernhill.dev'],
  [null, 'jordan+staging@fernhill.dev'],
  [null, 'asdf@asdf.com'],
  ['Jordan Pike', 'jordan@fernhill.app'],
  [null, 'e2e-runner-17@fernhill.dev'],
]
const team = [
  ['Jordan Pike', 'jordan@fernhill.app'],
  ['Mei Tanaka', 'mei@fernhill.app'],
  ['Sam Okafor', 'sam@fernhill.app'],
  ['Lucía Ferreira', 'lucia@fernhill.app'],
]
const addr = ([name, address]) => (name ? { name, address } : address)
const firstName = (p) => (p[0] ? p[0].replace(/^Dr\. /, '').split(' ')[0] : 'there')

const FROM = {
  noreply: { name: 'Fernhill', address: 'no-reply@fernhill.app' },
  billing: { name: 'Fernhill Billing', address: 'billing@fernhill.app' },
  support: { name: 'Fernhill Support', address: 'support@fernhill.app' },
  alerts: { name: 'Fernhill Alerts', address: 'alerts@fernhill.app' },
  team: { name: 'Mei from Fernhill', address: 'mei@fernhill.app' },
  reminders: { name: 'Fernhill Reminders', address: 'reminders@fernhill.app' },
  cron: 'cron@worker-2.staging.fernhill.internal',
}

// ---------- tiny PNG / PDF builders for attachments ----------
function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function png(w, h, painter) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const [r, g, b] = painter(x, y)
      const o = y * (w * 3 + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
// Fernhill logo: green rounded badge with a leaf-ish diagonal
const LOGO = png(96, 96, (x, y) => {
  const dx = x - 48, dy = y - 48
  if (dx * dx + dy * dy > 46 * 46) return [255, 255, 255]
  if (Math.abs(x - y) < 6 && x > 22 && x < 74) return [236, 253, 245]
  return [22, 128, 92]
})
const CHART = png(480, 160, (x, y) => {
  const bar = Math.floor(x / 40)
  const hgt = [60, 85, 72, 110, 96, 130, 118, 142, 125, 150, 138, 155][bar] ?? 0
  if (x % 40 < 6) return [255, 255, 255]
  return 160 - y < hgt ? [52, 168, 120] : [246, 248, 247]
})
function pdf(lines) {
  const text = lines
    .map((l, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 56 ${760 - i * 22} Td (${l.replace(/[()\\]/g, '')}) Tj ET`)
    .join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offs = []
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offs.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n` })
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

// ---------- HTML layout ----------
function layout({ preheader = '', body, footer = true, logo = true }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;background:#f4f6f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1f2a24}
  .wrap{max-width:600px;margin:0 auto;padding:24px 12px}
  .card{background:#fff;border-radius:10px;padding:32px;border:1px solid #e3e8e5}
  h1{font-size:22px;margin:0 0 16px} p{line-height:1.55;font-size:15px;margin:0 0 14px}
  .btn{display:inline-block;background:#16805c;color:#fff !important;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600}
  .muted{color:#6b7a72;font-size:13px} table.items{width:100%;border-collapse:collapse;margin:12px 0 18px}
  table.items td,table.items th{padding:9px 6px;border-bottom:1px solid #eef1ef;font-size:14px;text-align:left}
  table.items th{color:#6b7a72;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .right{text-align:right !important} .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600}
  @media (max-width:480px){.card{padding:20px}h1{font-size:19px}}
</style></head>
<body><span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
<div class="wrap">
${logo ? '<div style="text-align:center;margin-bottom:18px"><img src="cid:logo@fernhill" width="40" height="40" alt="Fernhill" style="vertical-align:middle"> <span style="font-weight:700;font-size:18px;vertical-align:middle;color:#16805c">Fernhill</span></div>' : ''}
<div class="card">${body}</div>
${footer ? `<p class="muted" style="text-align:center;margin-top:18px">Fernhill Health Software, Inc. · 548 Market St #4012, San Francisco, CA 94104<br>
<a href="https://app.fernhill.app/settings/notifications" style="color:#6b7a72">Notification settings</a> · <a href="https://fernhill.app/privacy" style="color:#6b7a72">Privacy</a></p>` : ''}
</div></body></html>`
}
const logoAtt = { filename: 'logo.png', content: LOGO, cid: 'logo@fernhill', contentDisposition: 'inline' }
const money = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

// ---------- templates: each returns a nodemailer message (minus date) ----------
let invoiceNo = 10412
let tok = () => Array.from({ length: 32 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[int(0, 30)]).join('')

const T = {
  verify(p, opts = {}) {
    const code = String(int(100000, 999999))
    const broken = opts.broken
    const name = broken ? '{{ user.first_name }}' : firstName(p)
    return {
      from: FROM.noreply, to: addr(p),
      subject: broken ? 'Confirm your email address for {{product_name}}' : `${code} is your Fernhill verification code`,
      text: `Hi ${name},\n\nYour verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't create a Fernhill account, you can ignore this email.\n\n— The Fernhill team`,
      html: layout({ preheader: `Your code is ${code}`, body: `<h1>Verify your email</h1><p>Hi ${name},</p><p>Enter this code to finish setting up your account:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f0f7f3;padding:14px;border-radius:8px">${code}</p>
        <p class="muted">This code expires in 10 minutes. If you didn't sign up for Fernhill, ignore this email.</p>` }),
      attachments: [logoAtt],
    }
  },
  reset(p) {
    const t = tok()
    return {
      from: FROM.noreply, to: addr(p), subject: 'Reset your Fernhill password',
      text: `Hi ${firstName(p)},\n\nSomeone (hopefully you) asked to reset the password for your Fernhill account.\n\nReset it here: http://localhost:3000/password/reset?token=${t}\n\nThis link expires in 60 minutes. If you didn't request this, you can safely ignore it.\n`,
      html: layout({ preheader: 'This link expires in 60 minutes', body: `<h1>Reset your password</h1><p>Hi ${firstName(p)},</p>
        <p>Someone (hopefully you) asked to reset the password for your Fernhill account.</p>
        <p style="text-align:center;margin:24px 0"><a class="btn" href="http://localhost:3000/password/reset?token=${t}">Choose a new password</a></p>
        <p class="muted">Link not working? Paste this into your browser:<br><code style="word-break:break-all">http://localhost:3000/password/reset?token=${t}</code></p>
        <p class="muted">Requested from Chrome on macOS · IP 127.0.0.1 · expires in 60 minutes</p>` }),
      attachments: [logoAtt],
    }
  },
  magic(p) {
    const t = tok()
    return {
      from: FROM.noreply, to: addr(p), subject: 'Your sign-in link for Fernhill',
      text: `Click to sign in: http://localhost:3000/auth/magic?t=${t}\nThis link can be used once and expires in 15 minutes.`,
      html: layout({ body: `<h1>Sign in to Fernhill</h1><p>Click the button below to sign in. This link can be used once and expires in 15 minutes.</p>
        <p style="text-align:center;margin:24px 0"><a class="btn" href="http://localhost:3000/auth/magic?t=${t}">Sign in</a></p>` }),
      attachments: [logoAtt],
    }
  },
  invite(p) {
    const inviter = pick(customers)
    const clinic = pick(clinics)
    const role = pick(['Front desk', 'Practitioner', 'Billing admin', 'Owner'])
    return {
      from: FROM.noreply, to: addr(p), replyTo: addr(inviter),
      subject: `${inviter[0]} invited you to join ${clinic} on Fernhill`,
      text: `${inviter[0]} invited you to ${clinic} as ${role}.\n\nAccept: http://localhost:3000/invites/${tok().slice(0, 12)}\n\nThis invite expires in 7 days.`,
      html: layout({ preheader: `Join ${clinic} as ${role}`, body: `<h1>You're invited</h1>
        <p><strong>${inviter[0]}</strong> (${inviter[1]}) invited you to join <strong>${clinic}</strong> on Fernhill as <span class="pill" style="background:#e7f5ee;color:#16805c">${role}</span>.</p>
        <p>Fernhill keeps your schedule, patient reminders and invoices in one place.</p>
        <p style="text-align:center;margin:24px 0"><a class="btn" href="http://localhost:3000/invites/${tok().slice(0, 12)}">Accept invitation</a></p>
        <p class="muted">This invitation expires in 7 days.</p>` }),
      attachments: [logoAtt],
    }
  },
  receipt(p) {
    const n = invoiceNo++
    const plan = pick([['Starter', 4900], ['Practice', 12900], ['Practice', 12900], ['Multi-location', 34900]])
    const seats = plan[0] === 'Starter' ? 0 : int(0, 6)
    const sms = int(0, 2400)
    const lines = [[`${plan[0]} plan — monthly`, plan[1]]]
    if (seats) lines.push([`Additional seats × ${seats}`, seats * 1500])
    if (sms) lines.push([`SMS reminders (${sms.toLocaleString()} msgs)`, Math.round(sms * 1.2)])
    const sub = lines.reduce((s, l) => s + l[1], 0)
    const tax = chance(0.4) ? Math.round(sub * 0.0863) : 0
    const total = sub + tax
    const card = pick(['Visa', 'Mastercard', 'Amex']) + ' •••• ' + int(1000, 9999)
    const clinic = pick(clinics)
    return {
      from: FROM.billing, to: addr(p),
      subject: `Receipt for invoice #FH-${n} — ${money(total)}`,
      text: `Thanks for your payment.\n\nInvoice FH-${n}\n${lines.map((l) => `${l[0]}  ${money(l[1])}`).join('\n')}\n${tax ? `Sales tax  ${money(tax)}\n` : ''}Total paid  ${money(total)}\nPaid with ${card}\n`,
      html: layout({ preheader: `We received ${money(total)} — thank you`, body: `<h1>Payment received</h1>
        <p>Thanks! We charged <strong>${money(total)}</strong> to your ${card} for <strong>${clinic}</strong>.</p>
        <table class="items"><tr><th>Description</th><th class="right">Amount</th></tr>
        ${lines.map((l) => `<tr><td>${l[0]}</td><td class="right">${money(l[1])}</td></tr>`).join('')}
        ${tax ? `<tr><td>Sales tax (8.63%)</td><td class="right">${money(tax)}</td></tr>` : ''}
        <tr><td><strong>Total</strong></td><td class="right"><strong>${money(total)}</strong></td></tr></table>
        <p class="muted">Invoice FH-${n} is attached as a PDF. Questions? Reply to this email.</p>` }),
      attachments: [logoAtt, { filename: `Fernhill-Invoice-FH-${n}.pdf`, content: pdf([`Fernhill Invoice FH-${n}`, clinic, ...lines.map((l) => `${l[0]} ..... ${money(l[1])}`), tax ? `Sales tax ..... ${money(tax)}` : '', `Total paid ..... ${money(total)}`, `Paid with ${card}`]), contentType: 'application/pdf' }],
    }
  },
  paymentFailed(p) {
    const amt = pick([12900, 15900, 34900, 4900, 18400])
    return {
      from: FROM.billing, to: addr(p), priority: 'high',
      subject: `Action needed: your payment of ${money(amt)} failed`,
      text: `We couldn't charge your card ending ${int(1000, 9999)} for ${money(amt)}.\nReason: ${pick(['card_declined', 'insufficient_funds', 'expired_card'])}\n\nUpdate your payment method: http://localhost:3000/billing\nWe'll retry in 3 days.`,
      html: layout({ preheader: 'Update your card to avoid interruption', body: `<h1 style="color:#b42318">Your payment didn't go through</h1>
        <p>We tried to charge <strong>${money(amt)}</strong> for your Fernhill subscription, but the card was declined.</p>
        <p>We'll retry automatically in 3 days. To avoid any interruption to appointment reminders, please update your payment method.</p>
        <p style="text-align:center;margin:24px 0"><a class="btn" style="background:#b42318" href="http://localhost:3000/billing">Update payment method</a></p>` }),
      attachments: [logoAtt],
    }
  },
  reminder(p) {
    const pet = pick(['Biscuit', 'Luna', 'Mochi', 'Rufus', 'Pepper', 'Ziggy', 'Olive', null, null])
    const clinic = pet ? pick(clinics.filter((c) => /Vet|Animal/.test(c))) : pick(clinics.filter((c) => !/Vet|Animal/.test(c)))
    const when = new Date(CUR.getTime() + int(1, 6) * DAY)
    const whenStr = when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' }) + ` at ${pick(['8:30 AM', '9:00 AM', '10:30 AM', '11:15 AM', '1:15 PM', '2:00 PM', '3:45 PM', '4:30 PM'])}`
    const what = pet ? `${pet}'s ${pick(['annual checkup', 'dental cleaning', 'vaccination booster', 'post-op recheck'])}` : `your ${pick(['physical therapy session', 'cleaning', 'follow-up visit', 'consultation'])}`
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fernhill//Reminders//EN\r\nBEGIN:VEVENT\r\nUID:${tok().slice(0, 16)}@fernhill.app\r\nDTSTART:${when.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z\r\nSUMMARY:${what} — ${clinic}\r\nLOCATION:${clinic}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`
    return {
      from: { name: clinic, address: 'reminders@fernhill.app' }, to: addr(p), replyTo: 'frontdesk@' + clinic.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.example',
      subject: `Reminder: ${what} on ${whenStr}`,
      text: `Hi ${firstName(p)},\n\nThis is a reminder of ${what} at ${clinic} on ${whenStr}.\n\nNeed to reschedule? Reply to this email or call the front desk.\n`,
      html: layout({ logo: false, preheader: `See you ${whenStr}`, body: `<p class="muted" style="text-transform:uppercase;letter-spacing:.05em;font-weight:600">${clinic}</p>
        <h1>See you soon, ${firstName(p)}!</h1><p>This is a friendly reminder of <strong>${what}</strong>.</p>
        <table class="items"><tr><td>When</td><td><strong>${whenStr}</strong></td></tr><tr><td>Where</td><td>${clinic}</td></tr></table>
        <p><a class="btn" href="http://localhost:3000/a/confirm/${tok().slice(0, 10)}">Confirm</a> &nbsp; <a href="http://localhost:3000/a/reschedule" style="color:#16805c">Reschedule</a></p>
        <p class="muted">Sent on behalf of ${clinic} by Fernhill.</p>` }),
      attachments: [{ filename: 'appointment.ics', content: ics, contentType: 'text/calendar; method=PUBLISH' }],
    }
  },
  digest(p) {
    const appts = int(42, 310), noShow = int(0, 14), revenue = int(820000, 6400000)
    return {
      from: FROM.noreply, to: addr(p),
      subject: `Your week at ${pick(clinics)}: ${appts} appointments, ${noShow} no-shows`,
      text: `Weekly summary\nAppointments: ${appts}\nNo-shows: ${noShow}\nCollected: ${money(revenue)}\n`,
      html: layout({ preheader: `${appts} appointments this week`, body: `<h1>Your weekly summary</h1>
        <table class="items"><tr><th>Metric</th><th class="right">This week</th><th class="right">vs last week</th></tr>
        <tr><td>Appointments</td><td class="right">${appts}</td><td class="right" style="color:#16805c">+${int(1, 18)}%</td></tr>
        <tr><td>No-shows</td><td class="right">${noShow}</td><td class="right" style="color:#b42318">+${int(0, 4)}</td></tr>
        <tr><td>Collected</td><td class="right">${money(revenue)}</td><td class="right" style="color:#16805c">+${int(1, 12)}%</td></tr>
        <tr><td>Reminder SMS sent</td><td class="right">${int(100, 900)}</td><td class="right">—</td></tr></table>
        <img src="cid:chart@fernhill" width="100%" alt="Appointments per day" style="border-radius:6px">
        <p class="muted" style="margin-top:12px">Busiest day: ${pick(['Tuesday', 'Wednesday', 'Thursday'])}. Tip: turn on 2-hour SMS reminders to cut no-shows.</p>` }),
      attachments: [logoAtt, { filename: 'chart.png', content: CHART, cid: 'chart@fernhill', contentDisposition: 'inline' }],
    }
  },
  exportReady(p) {
    const kind = pick(['appointments', 'invoices', 'patients', 'payouts'])
    const rows = int(3, 12)
    const header = { appointments: 'date,time,patient,provider,status', invoices: 'invoice,date,customer,amount,status', patients: 'id,name,species,owner,last_visit', payouts: 'payout_id,arrival_date,amount,fees,net' }[kind]
    const csv = [header, ...Array.from({ length: rows }, (_, i) => `${i + 1},2026-${String(int(7, 11)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')},${pick(customers)[0]},${int(40, 900)}.00,${pick(['paid', 'open', 'void', 'completed', 'no_show'])}`)].join('\n')
    return {
      from: FROM.noreply, to: addr(p), subject: `Your ${kind} export is ready`,
      text: `Your export of ${rows} ${kind} is attached (CSV).\nThe download link expires in 24 hours.`,
      html: layout({ body: `<h1>Export ready</h1><p>Your <strong>${kind}</strong> export (${rows} rows) is attached as a CSV file.</p><p class="muted">Generated ${CUR.toUTCString()}</p>` }),
      attachments: [logoAtt, { filename: `fernhill-${kind}-export.csv`, content: csv, contentType: 'text/csv' }],
    }
  },
  support(p) {
    const n = int(4800, 5600)
    const [subj, body] = pick([
      ['Re: SMS reminders not sending for Saturday appointments', 'Thanks for flagging this. We found that reminders for appointments booked less than 24 hours ahead were being skipped when the clinic timezone differed from the account owner\'s. A fix shipped this morning — reminders for this Saturday should go out as expected.\n\nLet me know if you see any more gaps.'],
      ['Re: Can we import patients from VetPro?', 'Yes! Export a CSV from VetPro (Reports → Patient list → Export) and upload it under Settings → Import. We map owner name, phone, species and last visit automatically. Anything we can\'t map ends up in a "notes" column so nothing gets lost.'],
      ['Re: Refund for duplicate charge', 'I\'ve refunded the duplicate charge of $129.00. It usually takes 5–10 business days to appear on your statement. Sorry for the hassle!'],
      ['Re: Question about HIPAA BAA', 'We sign BAAs on the Practice and Multi-location plans. I\'ve attached our standard BAA — once you sign and return it, we\'ll countersign within two business days.'],
    ])
    return {
      from: { name: pick(['Lucía at Fernhill', 'Sam at Fernhill']), address: 'support@fernhill.app' }, to: addr(p),
      subject: `${subj} [#${n}]`,
      inReplyTo: `<ticket-${n}-q@fernhill.app>`, references: [`<ticket-${n}-q@fernhill.app>`],
      text: `Hi ${firstName(p)},\n\n${body}\n\nBest,\nFernhill Support\n\n---\nTicket #${n} · reply above this line`,
    }
  },
  comment(p) {
    const who = pick(team)
    const note = pick([
      'Can we move Biscuit to the 3:45 slot? Owner called and said she can\'t make 2pm.',
      'Lab results came back normal, sending a summary to the owner now.',
      'Flagging: this patient has a penicillin allergy that isn\'t in the chart yet.',
      'Insurance pre-auth approved for 6 sessions. Updated the plan.',
      'Left voicemail, will try again tomorrow morning.',
    ])
    return {
      from: { name: `${who[0]} (via Fernhill)`, address: 'notifications@fernhill.app' }, to: addr(p),
      subject: `${who[0]} mentioned you on a patient note`,
      text: `${who[0]} wrote:\n\n> ${note}\n\nReply on Fernhill: http://localhost:3000/notes/${int(1000, 9999)}`,
      html: layout({ body: `<p><strong>${who[0]}</strong> mentioned you:</p><blockquote style="border-left:3px solid #16805c;margin:0 0 16px;padding:6px 14px;color:#33413a">${note}</blockquote><p><a class="btn" href="http://localhost:3000/notes/${int(1000, 9999)}">Reply</a></p>` }),
      attachments: [logoAtt],
    }
  },
  welcome(p) {
    return {
      from: FROM.team, to: addr(p), subject: pick(['Welcome to Fernhill 👋', 'Welcome to Fernhill — let\'s get your clinic set up', p[0] ? 'Welcome aboard, ' + firstName(p) + '!' : 'Welcome to Fernhill 👋']),
      text: `Hi ${firstName(p)},\n\nI'm Mei, one of the founders of Fernhill. Thanks for signing up!\n\nThree things to do first:\n1. Add your providers and opening hours\n2. Import your patient list\n3. Turn on SMS reminders\n\nIf you get stuck, just hit reply — it comes straight to me.\n\nMei`,
      html: layout({ preheader: 'Three things to do first', body: `<h1>Welcome, ${firstName(p)}!</h1><p>I'm Mei, one of the founders of Fernhill. Thanks for signing up — here's how to get going:</p>
        <ol style="line-height:1.8;font-size:15px"><li>Add your providers and opening hours</li><li>Import your patient list (CSV or from VetPro / Dentrix)</li><li>Turn on SMS reminders — clinics typically see 30% fewer no-shows</li></ol>
        <p style="text-align:center;margin:24px 0"><a class="btn" href="http://localhost:3000/onboarding">Start setup</a></p><p>If you get stuck, just hit reply — it comes straight to me.</p><p>— Mei</p>` }),
      attachments: [logoAtt],
    }
  },
  newsletter(p) {
    const issue = CUR.toLocaleDateString('en-US', { month: 'long' })
    return {
      from: { name: 'Fernhill Product Updates', address: 'updates@fernhill.app' }, to: addr(p),
      subject: pick([`What's new in Fernhill — ${issue} 2026`, `${issue} update: two-way SMS, faster calendar, and more`, '[DRAFT v3] Product update — please review copy']),
      headers: { 'List-Unsubscribe': '<https://fernhill.app/u/x>, <mailto:unsubscribe@fernhill.app>' },
      html: layout({ preheader: 'Two-way SMS is here', body: `<p class="muted" style="text-transform:uppercase;letter-spacing:.06em;font-weight:600">Product update · ${issue} 2026</p>
        <h1>Two-way SMS is here</h1><img src="cid:chart@fernhill" width="100%" alt="" style="border-radius:8px;margin-bottom:16px">
        <p>Patients can now reply <strong>C</strong> to confirm or <strong>R</strong> to reschedule straight from their reminder text. Replies land in a shared inbox for your front desk.</p>
        <h2 style="font-size:17px">Also new</h2>
        <table class="items"><tr><td>📅</td><td><strong>Faster calendar.</strong> Week view now loads 3× faster for busy multi-provider clinics.</td></tr>
        <tr><td>🧾</td><td><strong>Partial payments.</strong> Split an invoice across insurance and the patient.</td></tr>
        <tr><td>🔒</td><td><strong>SSO for Multi-location.</strong> Google Workspace and Microsoft Entra ID.</td></tr></table>
        <p style="text-align:center"><a class="btn" href="https://fernhill.app/changelog">Read the full changelog</a></p>` }),
      attachments: [logoAtt, { filename: 'hero.png', content: CHART, cid: 'chart@fernhill', contentDisposition: 'inline' }],
    }
  },
  cronAlert() {
    const job = pick(['ReminderDispatchJob', 'InvoiceSyncJob', 'StripeWebhookReplayJob', 'NightlyExportJob', 'NoShowScoringJob'])
    const failed = int(1, 37)
    return {
      from: FROM.cron, to: [addr(team[0]), addr(team[2])], cc: 'eng-alerts@fernhill.app',
      subject: `[staging] ${job}: ${failed} failure${failed > 1 ? 's' : ''} in the last hour`,
      priority: chance(0.4) ? 'high' : 'normal',
      text: `Job:       ${job}\nQueue:     ${pick(['default', 'mailers', 'critical'])}\nFailures:  ${failed}\nHost:      worker-2.staging.fernhill.internal\n\nLast error:\n  ${pick([
        'Net::ReadTimeout: Net::ReadTimeout with #<TCPSocket:(closed)>',
        "PG::UniqueViolation: ERROR:  duplicate key value violates unique constraint \"index_reminders_on_appointment_id_and_kind\"",
        'Stripe::RateLimitError: Too many requests made to the API too quickly',
        "NoMethodError: undefined method `timezone' for nil:NilClass",
        'Twilio::REST::RestError: [HTTP 400] 21211 : Invalid \'To\' Phone Number: +1555010',
      ])}\n    app/jobs/${job.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}.rb:${int(20, 140)}:in \`perform'\n    app/services/reminders/dispatcher.rb:${int(10, 90)}:in \`call'\n    vendor/bundle/ruby/3.3.0/gems/sidekiq-7.2.4/lib/sidekiq/processor.rb:202:in \`execute_job'\n\nDashboard: http://localhost:3000/sidekiq/retries\n`,
    }
  },
  teamPlain(v) {
    const [subj, body] = ([
      ['staging deploy notes — reminders v2', 'Deployed reminders v2 to staging at 14:10. Known issues:\n- 2h reminders fire twice if the appointment is edited within the window\n- Spanish template still has the old footer\n\nPlease poke at it and reply here with anything weird. MailDev is catching everything, so go wild.'],
      ['Re: which template does the "no-show follow-up" use?', "It's app/views/mailers/appointment_mailer/no_show.html.erb — the plain-text part is generated from it with premailer, which is why the links look odd in the text tab."],
      ['testing reply-to threading', 'please ignore'],
      ['Fwd: Spanish reminder copy from Dr. Ojukwu', 'Forwarding the Spanish copy Marcus sent over. He wants "cita" instead of "turno" everywhere, and the confirm button should say "Confirmar" not "Aceptar".\n\n---------- Forwarded message ---------\nFrom: Dr. Marcus Ojukwu <marcus@ojukwuvet.example>\nSubject: recordatorio\n\nHola {nombre}, le recordamos la cita de {mascota} el {fecha}. Responda C para confirmar o R para reprogramar.'],
      ['', 'sent from the rails console with no subject to see what happens'],
    ])[v]
    return { from: addr(pick(team)), to: [addr(team[0]), addr(team[1]), addr(team[3])], subject: subj, text: body }
  },
  gdpr(p) {
    return {
      from: FROM.support, to: addr(p), subject: 'Your data export request has been completed',
      text: `Hi ${firstName(p)},\n\nAs requested under GDPR Article 15, attached is a JSON export of all personal data Fernhill holds about you.\n\nIf you'd like us to delete your account and data, reply to this email with "DELETE".\n`,
      attachments: [{ filename: 'fernhill-personal-data.json', content: JSON.stringify({ user: { name: p[0], email: p[1], created_at: '2026-03-14T18:22:05Z', locale: 'en-IE' }, sessions: int(3, 40), appointments_booked: int(1, 12) }, null, 2), contentType: 'application/json' }],
    }
  },
}

// ---------- the timeline ----------
// Entries hold a thunk; templates are rendered in date order (so invoice
// numbers increase over time) with CUR set to the send date.
const plan = [] // { make, date, msg, read, relay? }
const addMsg = (make, date, extra = {}) => plan.push({ make, date, ...extra })
const anyone = () => (chance(0.65) ? pick(customers) : pick(qa))

// Steady background traffic over ~120 days
for (let d = 120; d >= 0; d--) {
  const perDay = d < 3 ? int(3, 5) : int(0, 3)
  for (let i = 0; i < perDay; i++) {
    const kind = pick(['verify', 'reset', 'reset', 'magic', 'invite', 'receipt', 'receipt', 'reminder', 'reminder', 'comment', 'welcome', 'exportReady', 'support', 'digest'])
    const p = anyone()
    addMsg(() => T[kind](p), workTime(d))
  }
}
// Cron alerts — some at odd hours, including weekends
for (let i = 0; i < 16; i++) {
  const t = new Date(NOW - int(0, 110) * DAY - int(0, 1439) * MIN)
  addMsg(() => T.cronAlert(), t)
}
// Bursts: iterating on a template (same subject over and over within an hour)
for (const [daysAgo, kind, count] of [[96, 'receipt', 6], [61, 'newsletter', 5], [33, 'paymentFailed', 4], [12, 'digest', 4], [1, 'reminder', 5]]) {
  const base = workTime(daysAgo).getTime()
  const p = pick(qa)
  let t = base
  for (let i = 0; i < count; i++) { addMsg(() => T[kind](p), new Date(t)); t += int(3, 14) * MIN }
}
// A template bug that shipped to staging for a day
for (let i = 0; i < 3; i++) { const p = pick(qa); addMsg(() => T.verify(p, { broken: true }), new Date(workTime(47).getTime() + i * 22 * MIN)) }
// One-offs
{ const p = pick(customers); addMsg(() => T.gdpr(p), workTime(28)) }
addMsg(() => T.gdpr(customers[9]), workTime(4))
for (const v of [0, 1, 2, 3, 0]) addMsg(() => T.teamPlain(v), workTime(int(2, 100)))
addMsg(() => T.teamPlain(4), workTime(71))
for (let i = 0; i < 4; i++) { const p = pick(customers); addMsg(() => T.paymentFailed(p), workTime(int(5, 80))) }
for (let i = 0; i < 3; i++) { const p = pick(customers); addMsg(() => T.newsletter(p), workTime(int(10, 90))) }
// Multi-recipient blast with CC + BCC
addMsg(() => ({
  from: FROM.noreply,
  to: customers.slice(0, 5).map(addr),
  cc: addr(team[1]),
  bcc: ['audit@fernhill.app', 'mei+bcc@fernhill.app'],
  subject: 'Scheduled maintenance: Sunday 2:00–3:00 AM PT',
  text: 'Fernhill will be unavailable for up to 60 minutes on Sunday between 2:00 and 3:00 AM PT while we upgrade our database. Reminders scheduled in that window will be sent at 3:05 AM.',
  html: layout({ body: '<h1>Scheduled maintenance</h1><p>Fernhill will be unavailable for up to <strong>60 minutes</strong> on <strong>Sunday between 2:00 and 3:00 AM PT</strong> while we upgrade our database.</p><p>Appointment reminders scheduled in that window will be sent at 3:05 AM. No action is needed on your side.</p><p class="muted">Status updates: status.fernhill.app</p>' }),
  attachments: [logoAtt],
}), workTime(9))

plan.sort((a, b) => a.date - b.date)

// Read state: everything older than ~5 days is read except a handful the dev
// never opened; recent mail is mostly unread.
plan.forEach((e, i) => {
  CUR = e.date
  e.msg = e.make()
  const age = (NOW - e.date.getTime()) / DAY
  e.read = age > 5 ? !chance(0.05) : age > 1.5 ? chance(0.5) : chance(0.15)
  e.messageId = `<${e.date.getTime().toString(36)}.${i}.${tok().slice(0, 8)}@fernhill.app>`
})
// A few were relayed for a look in real clients: three to their original
// recipients, one to the QA device inbox (custom address).
const relayTargets = plan.filter((e) => /Receipt|Welcome|Reminder|What's new/.test(e.msg.subject || '')).slice(-30)
const toRelay = [relayTargets[3], relayTargets[11], relayTargets[19], relayTargets[26]].filter(Boolean)
toRelay.forEach((e, i) => { e.relay = i === 2 ? 'qa-devices@fernhill.app' : true })

// ---------- send ----------
const transport = nodemailer.createTransport({
  host: '127.0.0.1', port: SMTP_PORT, secure: false, ignoreTLS: true, pool: true, maxConnections: 6, maxMessages: Infinity,
})

async function waitFor(url, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return } catch {}
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('MailDev did not come up: ' + url)
}

await waitFor(`${WEB}/api/healthz`)
const t0 = Date.now()

async function deliver(list) {
  let idx = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (idx < list.length) {
      const e = list[idx++]
      await transport.sendMail({ ...e.msg, date: e.date, messageId: e.messageId })
    }
  }))
}

// MailDev's GET /api/email/:id flips the read flag without updating the
// store's unread counter (upstream quirk), so instead: deliver everything the
// developer has already looked at, mark it all read with the app's own
// "mark all read" endpoint, then deliver the still-unread mail.
const readList = plan.filter((e) => e.read || e.relay)
const unreadList = plan.filter((e) => !(e.read || e.relay))
await deliver(readList)
await new Promise((r) => setTimeout(r, 300))
const marked = await (await fetch(`${WEB}/api/email/read-all`, { method: 'PATCH' })).json()
await deliver(unreadList)
transport.close()
await new Promise((r) => setTimeout(r, 300))

// Relay a few (goes to the local relay stub)
const all = await (await fetch(`${WEB}/api/email`)).json()
const byMsgId = new Map(all.map((m) => [m.headers?.['message-id'], m.id]))
let relayed = 0
for (const e of plan.filter((x) => x.relay)) {
  const id = byMsgId.get(e.messageId)
  if (!id) { console.error('[seed] could not find', e.messageId); continue }
  const r = await fetch(`${WEB}/api/email/${id}/relay` + (e.relay === true ? '' : `/${encodeURIComponent(e.relay)}`), { method: 'POST' })
  if (r.ok) relayed++
  else console.error('[seed] relay failed', r.status, await r.text())
}
const sum = await (await fetch(`${WEB}/api/email/summary?limit=1`)).json()
console.log(`[seed] delivered ${plan.length} emails (${sum.storeTotal} stored, ${sum.unread} unread; read-all marked ${JSON.stringify(marked)}), relayed ${relayed} in ${Date.now() - t0}ms`)
