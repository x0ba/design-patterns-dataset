/**
 * Persona + content for the seeded save.
 * Mira Calloway: 3rd-year Information Security student at Aurora University who
 * does freelance pentest work on the side. Installed Aurora OS on 2026-05-22.
 */
import nebula from '@/assets/images/wallpaper-nebula.avif';
import city from '@/assets/images/wallpaper-city.avif';
import aurora from '@/assets/images/wallpaper-aurora.avif';
import lake from '@/assets/images/wallpaper-lake.avif';

export const NOW = '2026-11-17T09:42:00.000Z';
export const INSTALL_DATE = '2026-05-22T19:14:00.000Z';

export const USER = { username: 'mira', fullName: 'Mira Calloway', password: 'nightowl42', hint: 'bird that stays up late' };
export const PREFS = { accentColor: '#d453f6', wallpaper: 'aurora', themeMode: 'shades', changedAt: '2026-05-23T08:30:00.000Z' };

// ---------- deterministic helpers ----------
let seed = 20261117;
export const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString();
const T0 = Date.parse(INSTALL_DATE), TN = Date.parse(NOW);
/** date N days before NOW at given UTC hour/min */
export const daysAgo = (d: number, h = 10, m = 0) => {
  const t = new Date(TN - d * DAY); t.setUTCHours(h, m, 0, 0); return iso(t.getTime());
};
const between = (a: number, b: number) => a + rand() * (b - a);

// ---------- Filesystem ----------
export const DIRS: [string, string, string][] = [
  ['2026-05-24T10:02:00Z', '~/Documents', 'University'],
  ['2026-05-24T10:03:00Z', '~/Documents/University', 'SEC-331 Network Security'],
  ['2026-05-24T10:03:30Z', '~/Documents/University', 'SEC-342 Applied Cryptography'],
  ['2026-05-24T10:04:00Z', '~/Documents/University', 'CS-310 Operating Systems'],
  ['2026-06-03T21:40:00Z', '~/Documents', 'Freelance'],
  ['2026-06-03T21:41:00Z', '~/Documents/Freelance', 'Kestrel Logistics'],
  ['2026-08-11T15:20:00Z', '~/Documents/Freelance', 'Brightwater Dental'],
  ['2026-10-02T11:05:00Z', '~/Documents/Freelance', 'Hollow Pine Coffee'],
  ['2026-06-10T22:15:00Z', '~/Documents', 'CTF'],
  ['2026-06-10T22:16:00Z', '~/Documents', 'Finance'],
  ['2026-05-30T13:00:00Z', '~', 'Projects'],
  ['2026-05-30T13:01:00Z', '~/Projects', 'portscan-lite'],
  ['2026-07-19T18:44:00Z', '~/Projects', 'dotfiles'],
  ['2026-09-08T20:12:00Z', '~/Projects', 'wifi-survey'],
];

export interface SeedFile { at: string; dir: string; name: string; content: string }
const F = (at: string, dir: string, name: string, content: string): SeedFile => ({ at, dir, name, content });

export const FILES: SeedFile[] = [
  // Notes (Documents/Notes is created by the stock home template)
  F('2026-05-22T19:40:00Z', '~/Documents/Notes', 'first-boot.md', `# First boot\n\n- root pw is still the default (admin). change it? -> later\n- /etc/hosts is writable by root only\n- WiFi: home network is "Calloway-5G" (WPA2)\n- dock: pin Terminal, Notepad, Mail\n`),
  F('2026-06-02T08:15:00Z', '~/Documents/Notes', 'todo.md', `# TODO\n\n- [x] set up TrustMail\n- [x] ask Devon for the SEC-331 lab VM image\n- [ ] renew student ID before Dec 1\n- [ ] invoice Hollow Pine (INV-2026-014) — sent 11/09, follow up 11/23\n- [ ] read chapter 9 (TLS 1.3 handshake) before Thursday\n- [ ] backup ~/Projects to the USB stick\n- [ ] call grandma Sunday\n`),
  F('2026-07-04T23:58:00Z', '~/Documents/Notes', 'ideas.txt', `tool ideas\n----------\n* a tiny wrapper that diffs nmap runs over time (what opened since last week?)\n* browser extension that warns when a login form posts over http\n* "honest" password meter that actually explains entropy\n* CTF writeup template generator\n\nmaybe: talk at the student sec club about home-router hardening\n`),
  F('2026-09-15T07:30:00Z', '~/Documents/Notes', 'reading-list.md', `# Reading list\n\n1. The Web Application Hacker's Handbook (ch. 4–6 again)\n2. Serious Cryptography — finished Aug\n3. "Bugs in the TLS state machine" paper (Halloran recommended)\n4. Practical Packet Analysis, 3rd ed.\n5. techblog.com series on supply-chain attacks\n`),
  F('2026-11-14T22:10:00Z', '~/Documents/Notes', 'meeting-notes-2026-11-14.md', `# Hollow Pine — kickoff call (Nov 14)\n\nAttendees: Rosa Whitfield (owner), Tomás (shift lead), me\n\n- POS on a separate VLAN? -> **no**. Same flat /24 as guest WiFi!!\n- Router admin page reachable from guest network\n- They want a 1-page summary, not a 40-page report\n- Budget: $650 fixed, Rosa ok with 50% upfront\n\nNext: send scope + rules of engagement by Monday.\n`),
  // University
  F('2026-09-03T16:00:00Z', '~/Documents/University/SEC-331 Network Security', 'syllabus.txt', `SEC-331 Network Security — Fall 2026\nInstructor: Prof. Elaine Halloran (halloran@aurora.edu)\nOffice hours: Tue 14:00–16:00, Hensley Hall 412\n\nGrading: Labs 40% · Midterm 20% · Final project 30% · Participation 10%\nLate policy: 10%/day, max 3 days.\n`),
  F('2026-09-18T23:41:00Z', '~/Documents/University/SEC-331 Network Security', 'lab2-arp-spoofing.md', `# Lab 2 — ARP spoofing in the sandbox\n\n## Setup\nvictim 10.0.2.15, gateway 10.0.2.1, attacker 10.0.2.66\n\n## Observations\n- ARP cache poisoned within ~2s\n- victim kept the bogus entry for 60s after we stopped\n- static ARP entry on gateway fixed it (obviously)\n\n## Questions for TA\n- does DAI on the lab switch actually get enabled? config says yes but it didn't block us\n`),
  F('2026-10-09T02:13:00Z', '~/Documents/University/SEC-331 Network Security', 'lab4-firewall-rules.txt', `# lab4 — iptables ruleset (draft 3)\n*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\n-A INPUT -i lo -j ACCEPT\n-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT\n-A INPUT -p tcp --dport 22 -s 10.0.2.0/24 -j ACCEPT\n-A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT\nCOMMIT\n`),
  F('2026-10-27T20:05:00Z', '~/Documents/University/SEC-331 Network Security', 'midterm-review.md', `# Midterm review\n\n- OSI vs TCP/IP — know where TLS "lives" (argue both sides)\n- SYN flood + SYN cookies\n- DNS cache poisoning (Kaminsky) — why randomizing source port helps\n- VLAN hopping: switch spoofing vs double tagging\n- WPA2 4-way handshake, KRACK\n\nGot 86/100. Lost points on the double-tagging diagram.\n`),
  F('2026-09-10T18:22:00Z', '~/Documents/University/SEC-342 Applied Cryptography', 'notes-week2.md', `# Week 2 — block cipher modes\n\nECB: never. (the penguin)\nCBC: needs unpredictable IV, padding oracle risk\nCTR: nonce reuse = game over\nGCM: AEAD, 96-bit nonce, don't exceed 2^32 msgs per key\n`),
  F('2026-10-21T21:30:00Z', '~/Documents/University/SEC-342 Applied Cryptography', 'assignment3-padding-oracle.py', `#!/usr/bin/env python3\n"""SEC-342 A3: CBC padding oracle against the course server (sandbox only)."""\nimport requests\n\nBLOCK = 16\nORACLE = "http://crypto-lab.aurora.edu/a3/check"\n\ndef oracle(ct: bytes) -> bool:\n    r = requests.post(ORACLE, data={"ct": ct.hex()})\n    return r.status_code != 500\n\ndef decrypt_block(prev: bytes, block: bytes) -> bytes:\n    inter = bytearray(BLOCK)\n    for pad in range(1, BLOCK + 1):\n        for guess in range(256):\n            forged = bytearray(BLOCK)\n            # TODO: fill tail with inter ^ pad\n            ...\n    return bytes(i ^ p for i, p in zip(inter, prev))\n`),
  F('2026-06-14T12:00:00Z', '~/Documents/University/CS-310 Operating Systems', 'final-project-report.md', `# CS-310 Final Project: A toy round-robin scheduler\n\nTeam: Mira Calloway, Devon Kerr\nGrade: A-\n\n## Summary\nWe implemented a preemptive RR scheduler with a 10ms quantum in the course kernel and compared it against the FIFO baseline. Average turnaround time dropped 31% for the interactive workload, at the cost of ~4% more context switches.\n`),
  // Freelance
  F('2026-06-04T09:10:00Z', '~/Documents/Freelance/Kestrel Logistics', 'scope.md', `# Kestrel Logistics — external perimeter review\n\nClient contact: Aaron Pike (IT manager)\nIn scope: kestrel-logistics.net, vpn.kestrel-logistics.net, 3 public IPs\nOut of scope: social engineering, DoS, the warehouse scanners\nWindow: Jun 8 – Jun 19, 2026, 18:00–23:00 local\n`),
  F('2026-06-20T17:45:00Z', '~/Documents/Freelance/Kestrel Logistics', 'findings-summary.md', `# Findings — Kestrel Logistics\n\n| # | Finding | Severity | Status |\n|---|---------|----------|--------|\n| 1 | VPN portal exposes version banner (outdated) | High | Fixed 07/02 |\n| 2 | TLS 1.0 still enabled on mail relay | Medium | Fixed 07/15 |\n| 3 | Directory listing on /backup/ | High | Fixed 06/22 |\n| 4 | Missing HSTS | Low | Accepted risk |\n`),
  F('2026-06-21T10:00:00Z', '~/Documents/Freelance/Kestrel Logistics', 'INV-2026-007.txt', `INVOICE INV-2026-007\nBill to: Kestrel Logistics LLC\nDate: 2026-06-21\n\nExternal perimeter review (Jun 8–19) ........ $1,800.00\nRetest (2 findings) ......................... $  250.00\n                                              ---------\nTOTAL ....................................... $2,050.00\nPAID 2026-07-03\n`),
  F('2026-08-12T14:30:00Z', '~/Documents/Freelance/Brightwater Dental', 'wifi-assessment.md', `# Brightwater Dental — WiFi assessment\n\n- Staff SSID: "BW-Staff" WPA2-PSK, passphrase on a sticky note at reception (!)\n- Guest SSID isolated properly ✔\n- Printer exposes admin panel w/ default creds\n\nRecommendation: WPA3 or at least rotate PSK quarterly; take the sticky note down.\n`),
  F('2026-08-30T10:00:00Z', '~/Documents/Freelance/Brightwater Dental', 'INV-2026-011.txt', `INVOICE INV-2026-011\nBill to: Brightwater Dental Group\nDate: 2026-08-30\n\nOn-site wireless assessment (Aug 14) ........ $900.00\nTOTAL ....................................... $900.00\nPAID 2026-09-12\n`),
  F('2026-10-03T09:00:00Z', '~/Documents/Freelance/Hollow Pine Coffee', 'quote.txt', `Quote for Hollow Pine Coffee\nNetwork review + POS segmentation advice\nFixed price: $650 (50% upfront)\nValid until 2026-11-30\n`),
  F('2026-11-09T19:12:00Z', '~/Documents/Freelance/Hollow Pine Coffee', 'INV-2026-014.txt', `INVOICE INV-2026-014\nBill to: Hollow Pine Coffee Co.\nDate: 2026-11-09\n\nDeposit (50%) — network review ............... $325.00\nTOTAL DUE ................................... $325.00\nDue: 2026-11-23\n`),
  F('2026-06-02T09:00:00Z', '~/Documents/Freelance', 'rates-2026.txt', `rates (student discount already applied)\n- external scan + report: $900/day\n- wifi on-site: $900 flat (small office)\n- retest: $125/finding\n- small business "health check": $650 fixed\n`),
  // CTF
  F('2026-06-11T03:20:00Z', '~/Documents/CTF', 'writeup-nightshift-ctf-2026.md', `# NightShift CTF 2026 — team "segfault sisters"\n\nPlace: 14 / 212\n\n## web/cookie-monster (300)\nJWT signed with HS256 but the server accepted alg=none. Flag: NS{n0n3_1s_n0t_4n_alg0r1thm}\n\n## forensics/static (200)\nAudio file with a spectrogram message. Audacity -> spectrogram view.\n`),
  F('2026-09-27T04:02:00Z', '~/Documents/CTF', 'writeup-aurora-uni-ctf.md', `# Aurora Uni internal CTF (Sep 26)\n\nSolo. 9/15 challenges. 3rd place.\n\nStuck on rev/maze — the binary checked a CRC of its own .text section, so patching broke it. Next time: patch the check first.\n`),
  F('2026-11-02T01:15:00Z', '~/Documents/CTF', 'pwn-cheatsheet.txt', `checksec ./bin\nROPgadget --binary ./bin | grep "pop rdi"\ncyclic 200 / cyclic -l 0x6161616c\none_gadget libc.so.6\n`),
  // Finance
  F('2026-07-01T20:00:00Z', '~/Documents/Finance', 'budget-2026.csv', `month,income,rent,food,transport,subscriptions,savings\n2026-06,2450.00,780.00,310.45,62.00,24.97,600.00\n2026-07,2050.00,780.00,298.10,58.50,24.97,500.00\n2026-08,1320.00,780.00,341.20,61.00,24.97,100.00\n2026-09,1520.00,780.00,322.80,74.00,32.96,200.00\n2026-10,1180.00,780.00,305.15,70.00,32.96,0.00\n2026-11,325.00,780.00,140.60,35.00,32.96,0.00\n`),
  F('2026-09-02T11:30:00Z', '~/Documents/Finance', 'tuition-fall-2026.txt', `Aurora University — Fall 2026 statement\nTuition .............. $4,860.00\nLab fee (SEC) ........ $  120.00\nScholarship ......... -$2,000.00\nBalance .............. $2,980.00  (plan: 4 x $745)\n`),
  // Projects
  F('2026-05-30T13:30:00Z', '~/Projects/portscan-lite', 'README.md', `# portscan-lite\n\nA tiny TCP connect scanner for the Aurora OS terminal. Learning project, don't point it at things you don't own.\n\n\`\`\`\nportscan-lite 10.0.0.1 -p 1-1024 --timeout 200\n\`\`\`\n`),
  F('2026-06-01T22:47:00Z', '~/Projects/portscan-lite', 'scan.js', `// portscan-lite v0.3\nconst [host, ...args] = process.argv.slice(2);\nconst range = (args[args.indexOf('-p') + 1] || '1-1024').split('-').map(Number);\nconst timeout = Number(args[args.indexOf('--timeout') + 1]) || 300;\n\nasync function probe(port) {\n  return new Promise((resolve) => {\n    const sock = net.connect({ host, port });\n    const t = setTimeout(() => { sock.destroy(); resolve(false); }, timeout);\n    sock.on('connect', () => { clearTimeout(t); sock.end(); resolve(true); });\n    sock.on('error', () => { clearTimeout(t); resolve(false); });\n  });\n}\n\nfor (let p = range[0]; p <= range[1]; p++) {\n  if (await probe(p)) console.log(\`\${p}/tcp open\`);\n}\n`),
  F('2026-06-01T22:50:00Z', '~/Projects/portscan-lite', 'CHANGELOG.md', `## 0.3 (2026-06-01)\n- --timeout flag\n## 0.2 (2026-05-31)\n- port ranges\n## 0.1 (2026-05-30)\n- it works (barely)\n`),
  F('2026-07-19T18:50:00Z', '~/Projects/dotfiles', '.bashrc', `# mira's bashrc\nexport PS1="\\u@aurora:\\w$ "\nalias ll='ls -la'\nalias gs='git status'\nalias scan='node ~/Projects/portscan-lite/scan.js'\nexport EDITOR=notepad\n`),
  F('2026-07-19T18:52:00Z', '~/Projects/dotfiles', 'aliases.sh', `alias ..='cd ..'\nalias ...='cd ../..'\nalias please='sudo'\nalias weather='curl wttr.in/?format=3'\n`),
  F('2026-09-08T20:30:00Z', '~/Projects/wifi-survey', 'survey-2026-09-08.csv', `ssid,bssid,channel,security,signal_dbm,location\nCalloway-5G,a4:2b:b0:11:9e:20,36,WPA2,-41,apartment\nAuroraU-Secure,00:1a:2b:3c:4d:01,11,WPA2-Enterprise,-67,library\nAuroraU-Guest,00:1a:2b:3c:4d:02,6,OPEN,-62,library\nHollowPine-Guest,c8:3a:35:09:aa:10,1,WPA2,-55,cafe\nxfinitywifi,9c:34:26:aa:01:fe,6,OPEN,-80,street\nDIRECT-7F-HP OfficeJet,da:12:65:7f:00:01,11,WPA2,-71,apartment\n`),
  F('2026-09-09T21:00:00Z', '~/Projects/wifi-survey', 'notes.md', `- 2 open networks within 50m of the apartment\n- neighbor's printer broadcasts Wi-Fi Direct with a default PIN?\n- library guest net: captive portal over http :(\n`),
  // Desktop clutter
  F('2026-11-16T23:05:00Z', '~/Desktop', 'scratch.txt', `10.0.4.17  <- hollow pine router?\nadmin / hollowpine2019 (from the sticky note in the photo Rosa sent)\nask before touching the POS box\n`),
  F('2026-11-12T18:00:00Z', '~/Desktop', 'SEC-331 final project proposal.md', `# Final project proposal (draft)\n\n**Title:** Measuring captive-portal security on campus networks\n\n**Team:** Mira Calloway, Devon Kerr\n\nWe will survey captive portals on 6 campus/library networks and evaluate: HTTPS usage, session fixation, MAC-spoofing bypass. Deliverable: report + responsible-disclosure letter to IT.\n\nDue: Nov 24\n`),
  F('2026-10-30T12:00:00Z', '~/Desktop', 'halloween-party-playlist.txt', `1. Runway Electric\n2. Lo-Fi Girl\n3. whatever Sasha brings\n`),
  // Downloads
  F('2026-06-20T09:00:00Z', '~/Downloads', 'Job_Description_Senior_Engineer.txt', `JOB DESCRIPTION - Senior Software Engineer\n\nCOMPANY: TrustMail Inc.\nPOSITION: Senior Software Engineer\nLOCATION: Remote\n`),
  F('2026-09-03T15:58:00Z', '~/Downloads', 'SEC-331-syllabus-fall2026.txt', `SEC-331 Network Security — Fall 2026\n(see Documents/University for my annotated copy)\n`),
  F('2026-10-15T08:12:00Z', '~/Downloads', 'securebank-statement-2026-09.txt', `SecureBank — Statement Sep 2026\nAccount ****4471\nOpening balance  $3,214.88\nDeposits         $1,520.00\nWithdrawals      $1,612.31\nClosing balance  $3,122.57\n`),
  F('2026-11-05T16:40:00Z', '~/Downloads', 'lab5-pcap-notes.txt', `pcap: lab5-dhcp-starvation.pcapng (2.1 MB, on lab VM)\n- 1,402 DISCOVER packets in 9s from randomized MACs\n- pool exhausted at t=6.8s\n`),
  F('2026-11-15T10:20:00Z', '~/Downloads', 'hollowpine-network-diagram.txt', `[ISP modem] -- [TP-Link router 10.0.4.1]\n                 |-- POS terminal 10.0.4.17\n                 |-- office PC 10.0.4.22\n                 |-- guest WiFi clients 10.0.4.100-200\n(all same subnet!)\n`),
  // Pictures (library photos)
  F('2026-06-15T19:30:00Z', '~/Pictures', 'City.jpg', city),
  F('2026-07-28T06:10:00Z', '~/Pictures', 'Lake.jpg', lake),
  F('2026-10-12T22:45:00Z', '~/Pictures', 'Aurora.jpg', aurora),
  F('2026-11-03T14:02:00Z', '~/Pictures/Screenshots', 'Screenshot 2026-11-03 at 14.02.11.png', nebula),
  // Music
  F('2026-06-07T20:00:00Z', '~/Music', 'Lo-Fi Girl.mp3', '/media/Lo-Fi Girl.opus'),
  // Shell history file visible to terminal users
  F('2026-11-16T23:30:00Z', '~', '.bash_history', [
    'ls -la', 'cd Projects/portscan-lite', 'cat README.md', 'node scan.js 10.0.2.15 -p 20-25', 'cd ~',
    'cat /etc/hosts', 'sudo cat /etc/shadow', 'whoami', 'grep -r "hollow" Documents', 'cat Desktop/scratch.txt',
  ].join('\n') + '\n'),
];

export const TRASHED = [
  { at: '2026-11-10T09:00:00Z', path: '~/Documents/Notes/old-todo.md' },
];
// file that gets trashed must exist first
FILES.push(F('2026-06-01T08:00:00Z', '~/Documents/Notes', 'old-todo.md', `# todo (june)\n- [x] install aurora\n- [x] figure out the terminal\n- [x] kestrel scope doc\n`));

export const TERMINAL_INPUT = ['ls', 'cd Documents', 'ls -la', 'cat Notes/todo.md', 'cd ~/Projects/portscan-lite', 'cat scan.js', 'cd ~', 'whoami', 'cat Desktop/scratch.txt', 'ls Downloads'];

// ---------- Mail ----------
export const MAIL = { address: 'mira.calloway@trustmail.com', password: 'Tr0ub4dor&3', createdAt: '2026-05-24T09:12:00.000Z' };

type Mail = { from: string; fromEmail: string; subject: string; body: string; at: string; read?: boolean; starred?: boolean; archived?: boolean; deleted?: boolean; attachments?: { name: string; type: string; content: string }[] };

const FIXED_MAIL: Mail[] = [
  { from: 'TrustMail Team', fromEmail: 'support@trustmail.com', subject: 'Welcome to TrustMail!', at: '2026-05-24T09:12:00Z', archived: true,
    body: `Hello,\n\nWelcome to TrustMail! We're excited to have you on board.\n\nYour account has been successfully created and is ready to use.\n\nBest regards,\nThe TrustMail Team` },
  { from: 'Recruiting Team', fromEmail: 'careers@trustmail.com', subject: 'Exciting Job Opportunity - Senior Software Engineer', at: '2026-05-24T08:12:00Z', deleted: true,
    body: `Hi there,\n\nWe believe you might be a great fit for an exciting opportunity at our company.\n\n**Position:** Senior Software Engineer\n**Location:** Remote\n\nBest regards,\nThe Recruiting Team` },
  { from: 'Aaron Pike', fromEmail: 'aaron.pike@kestrel-logistics.net', subject: 'Perimeter review — can you start Monday?', at: '2026-06-03T16:20:00Z', archived: true,
    body: `Hi Mira,\n\nDevon's cousin passed along your name. We'd like an outside look at our VPN and mail relay before our insurance renewal. Budget is around $2k.\n\nCould you start Monday the 8th? Evenings only please, the warehouse runs on that network during the day.\n\nThanks,\nAaron Pike\nIT Manager, Kestrel Logistics` },
  { from: 'Aaron Pike', fromEmail: 'aaron.pike@kestrel-logistics.net', subject: 'Re: Findings summary', at: '2026-06-22T11:05:00Z', archived: true, starred: true,
    body: `Mira,\n\nThe /backup/ listing one made my stomach drop. Fixed it this morning — can you confirm?\n\nVPN upgrade is scheduled for July 2. I'll send payment once the invoice clears accounting.\n\nAaron` },
  { from: 'Mira Calloway', fromEmail: MAIL.address, subject: 'Re: Re: Findings summary', at: '2026-06-22T13:40:00Z', read: true,
    body: `Hi Aaron,\n\nConfirmed — /backup/ now returns 403 and the index is gone. I'll retest the VPN after the 2nd.\n\nBest,\nMira` },
  { from: 'Prof. Elaine Halloran', fromEmail: 'halloran@aurora.edu', subject: 'SEC-331: Lab 4 grades posted + final project groups', at: '2026-10-20T15:30:00Z', starred: true,
    body: `Hi all,\n\nLab 4 grades are posted. Common issue: many of you allowed ICMP without rate limiting.\n\nFinal project proposals are due **Nov 24**. Groups of two max. Proposals that involve testing live campus infrastructure MUST be cleared with me and University IT first — no exceptions.\n\nEH` },
  { from: 'Prof. Elaine Halloran', fromEmail: 'halloran@aurora.edu', subject: 'Re: Captive portal project — approval', at: '2026-11-13T09:02:00Z', read: false, starred: true,
    body: `Mira, Devon,\n\nThe topic is good. I've cc'd Dan Ortiz from University IT; you need his written OK for the library network specifically. Do not test MAC spoofing on AuroraU-Secure.\n\nPlease revise section 3 (methodology) to include a rollback plan.\n\nEH` },
  { from: 'Rosa Whitfield', fromEmail: 'rosa@hollowpinecoffee.com', subject: 'photo of the router + sticky note lol', at: '2026-11-15T10:18:00Z', read: true,
    body: `Hi Mira!\n\nHere's the picture you asked for. Yes, the password has been on that sticky note since 2019. Please don't judge me 😅\n\nAlso attaching the network drawing Tomás made.\n\nRosa`,
    attachments: [{ name: 'hollowpine-network-diagram.txt', type: 'text/plain', content: `[ISP modem] -- [TP-Link router 10.0.4.1]\n  |-- POS terminal 10.0.4.17\n  |-- office PC 10.0.4.22\n  |-- guest WiFi 10.0.4.100-200` }] },
  { from: 'Rosa Whitfield', fromEmail: 'rosa@hollowpinecoffee.com', subject: 'Re: Scope + rules of engagement', at: '2026-11-17T07:55:00Z', read: false,
    body: `Morning! Read it over coffee (obviously). All good with me. Tomás can let you in Thursday at 7 before we open.\n\nOne question — will the card machine go offline at all? Saturday is our busiest day so please not then.\n\nR.` },
  { from: 'Mira Calloway', fromEmail: MAIL.address, subject: 'Scope + rules of engagement', at: '2026-11-16T21:30:00Z', read: true,
    body: `Hi Rosa,\n\nAttached is the scope. Short version: I'll look at the router, the WiFi setup and how the POS is connected. I won't touch the card terminal itself or anything at your bank.\n\nIf anything looks risky I stop and call you first.\n\nMira` },
  { from: 'Devon Kerr', fromEmail: 'devon.kerr@aurora.edu', subject: 'proposal draft v2', at: '2026-11-12T23:48:00Z', read: true,
    body: `ok I rewrote section 2, feel free to butcher it. I think we should drop the MAC spoofing part entirely, Halloran is going to hate it.\n\nalso are you coming to sec club thurs?` },
  { from: 'SecureBank Alerts', fromEmail: 'alerts@securebank.com', subject: 'New sign-in to your SecureBank account', at: '2026-11-08T03:14:00Z', read: true, deleted: true,
    body: `We noticed a new sign-in to your account from a device we don't recognize.\n\nLocation: Bucharest, RO\nTime: 03:14 UTC\n\nIf this wasn't you, reset your password at securebank.com.` },
  { from: 'Aurora University Registrar', fromEmail: 'registrar@aurora.edu', subject: 'Action required: student ID renewal before Dec 1', at: '2026-11-04T13:00:00Z', read: false,
    body: `Dear Mira Calloway,\n\nYour student ID card expires on 2026-12-01. Please visit the Registrar's office (Hensley Hall, ground floor) with a photo ID.\n\nOffice hours: Mon–Fri 9:00–16:30.` },
  { from: 'Jack Reyes', fromEmail: 'jack@hackwithjack.org', subject: 'Your writeup got featured 🎉', at: '2026-06-13T18:30:00Z', read: true, starred: true,
    body: `Hey Mira,\n\nLoved your NightShift "cookie-monster" writeup — the alg=none explanation was the clearest I've seen. Mind if we feature it in this week's digest?\n\n— Jack` },
  { from: 'Grandma', fromEmail: 'nana.calloway@trustmail.com', subject: 'Re: Sunday', at: '2026-10-05T17:20:00Z', read: true,
    body: `Sweetheart, Sunday at 1 is fine. I'll make the plum cake. Bring that boy from your class if he wants, the one who fixed my printer.\n\nLove, Nana` },
];

const NEWSLETTERS: { from: string; fromEmail: string; subjects: string[]; body: (s: string) => string }[] = [
  { from: 'TechBlog Weekly', fromEmail: 'newsletter@techblog.com', subjects: [
      'Supply-chain attacks, part 3: typosquatting in package registries', 'Why your router\'s admin page is still on port 80', 'Passkeys one year later: what actually changed',
      'Inside a ransomware negotiation', 'The quiet death of TLS 1.1', 'Rust in the kernel: a status report', 'Five CVEs that should scare small businesses',
      'Zero-trust is a direction, not a product', 'How browsers decide a certificate is valid', 'Home lab on a budget: 2026 edition', 'DNS over HTTPS: privacy vs visibility',
      'What we learned from 10,000 leaked .env files', 'The case for boring infrastructure'],
    body: s => `This week on TechBlog:\n\n## ${s}\n\nA deep dive with examples, mitigations and a reading list. Plus: reader mailbag, job board, and the 5-minute security quiz.\n\nRead online at techblog.com · Unsubscribe` },
  { from: 'HackWithJack Digest', fromEmail: 'digest@hackwithjack.org', subjects: [
      'Digest #41: beginner pwn ladder', 'Digest #42: WiFi deauth — what still works', 'Digest #43: featured writeup — cookie-monster', 'Digest #44: Burp extensions we actually use',
      'Digest #45: OSINT ethics thread', 'Digest #46: CTF calendar for autumn', 'Digest #47: reversing a smart plug', 'Digest #48: hardware hacking starter kit',
      'Digest #49: the great JWT confusion', 'Digest #50 🎉 anniversary AMA', 'Digest #51: captive portals are weird', 'Digest #52: memory forensics 101'],
    body: s => `${s}\n\nTop threads this week, new challenges in the arena, and community writeups.\n\nStay curious, stay legal.\n— Jack & the HWJ crew` },
  { from: 'SecureBank', fromEmail: 'statements@securebank.com', subjects: [
      'Your June statement is ready', 'Your July statement is ready', 'Your August statement is ready', 'Your September statement is ready', 'Your October statement is ready'],
    body: s => `${s}.\n\nAccount: Student Checking ****4471\nLog in at securebank.com to view and download your statement.\n\nSecureBank will never ask for your password by email.` },
  { from: 'Aurora University', fromEmail: 'info@aurora.edu', subjects: [
      'Fall 2026 registration opens Monday', 'Library hours extended for midterms', 'Campus network maintenance Saturday 02:00–06:00', 'Career fair: cybersecurity employers list',
      'Reminder: tuition installment 2 due Oct 1', 'Reminder: tuition installment 3 due Nov 1', 'Student Security Club — fall kickoff', 'Phishing awareness: real examples from this month'],
    body: s => `${s}\n\nFull details on the student portal at aurora.edu.\n\nAurora University · Office of Student Affairs` },
];

export function buildEmails() {
  const out: any[] = [];
  let n = 0;
  const push = (m: Mail) => {
    const t = Date.parse(m.at);
    const old = TN - t > 4 * DAY;
    out.push({
      id: `mail-${(++n).toString().padStart(3, '0')}`,
      from: m.from, fromEmail: m.fromEmail, subject: m.subject, body: m.body,
      timestamp: new Date(t).toISOString(),
      read: m.read ?? (old ? rand() > 0.08 : rand() > 0.6),
      starred: m.starred ?? false, archived: m.archived ?? false, deleted: m.deleted ?? false,
      attachments: m.attachments?.map((a, i) => ({ id: `att-${n}-${i}`, name: a.name, size: a.content.length, type: a.type, content: a.content })),
    });
  };
  FIXED_MAIL.forEach(push);
  for (const nl of NEWSLETTERS) {
    const span = TN - T0 - 3 * DAY;
    nl.subjects.forEach((s, i) => {
      const t = T0 + 3 * DAY + (span * (i + rand() * 0.6)) / nl.subjects.length;
      const r = rand();
      push({ from: nl.from, fromEmail: nl.fromEmail, subject: s, body: nl.body(s), at: iso(t),
        archived: r < 0.25, deleted: r > 0.9 });
    });
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ---------- Messages ----------
export const MSG = { username: 'mira', password: 'nightowl42', createdAt: '2026-05-25T18:00:00.000Z', starred: ['devon', 'nana'] };
export const CONTACTS = [
  { handle: 'devon', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'sasha', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'nana', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'jack_hwj', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'rosa.hollowpine', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'priya', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
  { handle: 'theo_ta', password: 'x', joined: '2026-05-25T17:00:00.000Z' },
];

// Conversation scripts: [daysAgo, hh:mm, from ('me' | partner), text]
type Line = [number, string, 'me' | 'them', string];
const CONV: Record<string, Line[]> = {
  devon: [
    [174, '18:05', 'me', 'hey did you get the OS lab VM image?'], [174, '18:20', 'them', 'yeah, uploading it to the shared drive, 4gb tho'], [174, '18:21', 'me', 'legend'],
    [163, '22:40', 'them', 'my cousin aaron needs someone to look at their vpn, paid. you interested?'], [163, '22:41', 'me', 'YES'], [163, '22:41', 'me', 'I mean. yes, professionally.'], [163, '22:43', 'them', 'lol giving him your email'],
    [156, '13:10', 'them', 'scheduler benchmark finished, RR is 31% better on turnaround'], [156, '13:12', 'me', 'put that in the report in bold'],
    [120, '20:00', 'them', 'nightshift ctf this weekend?'], [120, '20:02', 'me', 'already registered us. team name is segfault sisters'], [120, '20:02', 'them', 'i am not a sister'], [120, '20:03', 'me', 'honorary'],
    [75, '09:15', 'them', 'halloran\'s class is 8am this term 💀'], [75, '09:16', 'me', 'we suffer together'],
    [60, '23:41', 'me', 'does DAI actually work on the lab switch? it didn\'t stop my arp spoof'], [60, '23:50', 'them', 'theo said it\'s enabled but only on vlan 20'], [60, '23:51', 'me', 'that explains it'],
    [21, '11:30', 'them', 'midterm: 81. you?'], [21, '11:31', 'me', '86, lost points on double tagging'], [21, '11:31', 'them', 'nerd'],
    [8, '16:20', 'me', 'captive portal idea for the final project?'], [8, '16:22', 'them', 'yes but halloran will make us get IT approval'], [8, '16:22', 'me', 'already emailing her'],
    [4, '23:49', 'them', 'sent you proposal v2'], [4, '23:55', 'me', 'reading now'], [3, '00:20', 'me', 'agree on dropping MAC spoofing'],
    [1, '19:02', 'them', 'sec club thursday?'], [0, '08:58', 'them', 'also halloran replied, we need dan ortiz\'s ok for the library'],
  ],
  sasha: [
    [150, '21:00', 'them', 'rooftop thing on saturday, you in?'], [150, '21:10', 'me', 'only if there are snacks'], [150, '21:11', 'them', 'there are ALWAYS snacks'],
    [110, '14:22', 'them', 'my insta got hacked 😭 can you help'], [110, '14:25', 'me', 'did you reuse your password'], [110, '14:30', 'them', '...define reuse'], [110, '14:31', 'me', 'ok come over, bring your laptop. we\'re setting up a password manager'],
    [109, '10:00', 'them', 'thank youuu. 2FA is on everything now'],
    [48, '19:45', 'them', 'halloween party at mine, 31st'], [48, '19:46', 'me', 'i\'m doing the playlist'], [48, '19:46', 'them', 'not the lofi again'], [48, '19:47', 'me', 'absolutely the lofi again'],
    [17, '01:12', 'them', 'that was the best party of the year'], [17, '10:30', 'me', 'my feet disagree'],
    [2, '20:15', 'them', 'brunch sunday?'],
  ],
  nana: [
    [170, '12:00', 'them', 'Hello dear is this how the messages work'], [170, '12:05', 'me', 'yes nana! it works'], [170, '12:06', 'them', 'Wonderful. Call me sunday'],
    [130, '15:00', 'them', 'The printer is broken again'], [130, '15:20', 'me', 'is it plugged in?'], [130, '15:45', 'them', 'It is now. Thank you'],
    [43, '17:10', 'them', 'Sunday at 1? plum cake'], [43, '17:12', 'me', 'yes!! 💜'],
    [12, '09:00', 'them', 'Did you eat today'], [12, '09:30', 'me', 'yes nana'], [5, '18:40', 'them', 'Are you sleeping enough. Your mother says no'],
  ],
  jack_hwj: [
    [157, '18:35', 'them', 'hey, sent you an email about featuring your writeup'], [157, '18:50', 'me', 'of course, go for it!'],
    [90, '20:00', 'them', 'would you be up for writing a guest post on wifi survey basics?'], [89, '09:10', 'me', 'yes, give me two weeks'], [70, '22:30', 'me', 'draft sent'], [69, '11:00', 'them', 'this is great, publishing friday'],
    [14, '13:00', 'them', 'captive portal digest next week, want to share notes?'], [14, '13:40', 'me', 'after we get approval from uni IT, yes'],
  ],
  'rosa.hollowpine': [
    [46, '08:10', 'them', 'Hi! Priya gave me your number, she said you help small shops with wifi stuff?'], [46, '09:00', 'me', 'Hi Rosa! yes, happy to take a look. I\'ll send a quote'],
    [44, '10:15', 'them', 'Quote looks good. When can you start?'], [44, '10:20', 'me', 'Mid-November works best (midterms 😅)'],
    [3, '14:00', 'them', 'kickoff call today at 6 still ok?'], [3, '14:02', 'me', 'yes!'],
    [2, '10:18', 'them', 'sent the photo by email'], [0, '07:56', 'them', 'replied to your email ☕'],
  ],
  priya: [
    [140, '12:30', 'them', 'library study session tmrw?'], [140, '12:31', 'me', 'yes, 3rd floor quiet room'],
    [95, '18:00', 'them', 'my friend Rosa owns Hollow Pine, she needs a network person. ok if I give her your number?'], [95, '18:20', 'me', 'please do!'],
    [30, '15:00', 'them', 'crypto A3 is killing me'], [30, '15:05', 'me', 'padding oracle? start from the last byte, it clicks after that'], [30, '15:06', 'them', 'you\'re a saint'],
    [6, '21:00', 'them', 'did you see the phishing email that went around campus'], [6, '21:02', 'me', 'yes, reported it to IT. the link went to aur0ra.edu lol'],
  ],
  theo_ta: [
    [60, '10:00', 'me', 'Hi Theo, quick question about lab 2 — is DAI enabled on the lab switch for all VLANs?'], [60, '13:30', 'them', 'Only VLAN 20 right now. Good catch, I\'ll mention it in section.'],
    [26, '09:00', 'them', 'Reminder: lab 5 pcaps are on the lab VM, don\'t copy them off-network.'], [26, '09:05', 'me', 'noted, thanks'],
  ],
};
export function buildMessages() {
  const msgs: { sender: string; recipient: string; content: string; timestamp: string }[] = [];
  for (const [partner, lines] of Object.entries(CONV)) {
    for (const [d, hm, who, text] of lines) {
      const [h, m] = hm.split(':').map(Number);
      const ts = daysAgo(d, h, m);
      if (Date.parse(ts) > TN) continue;
      msgs.push(who === 'me'
        ? { sender: MSG.username, recipient: partner, content: text, timestamp: ts }
        : { sender: partner, recipient: MSG.username, content: text, timestamp: ts });
    }
  }
  return msgs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
export const unreadMessagePredicate = (m: { recipient: string; timestamp: string }) =>
  m.recipient === MSG.username && TN - Date.parse(m.timestamp) < 2.2 * DAY;

// ---------- Calendar ----------
export const CALENDAR_CATEGORIES = [
  { id: 'all', labelKey: 'calendar.categories.all', color: 'white' },
  { id: 'work', labelKey: 'calendar.categories.work', color: 'blue' },
  { id: 'personal', labelKey: 'calendar.categories.personal', color: 'green' },
  { id: 'social', labelKey: 'calendar.categories.social', color: 'purple' },
  { id: 'events', labelKey: 'calendar.categories.events', color: 'yellow' },
  { id: 'family', labelKey: 'calendar.categories.family', color: 'red' },
  { id: 'uni', label: 'University', color: 'orange' },
];
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function buildEvents() {
  const ev: any[] = [];
  let n = 0;
  const add = (date: string, time: string, title: string, type: string, color: string, dur: number, location?: string, notes?: string) =>
    ev.push({ id: `evt-${++n}`, title, type, start: `${date} ${time}`, durationMinutes: dur, location, notes, color });
  // Recurring classes Sep 1 – Dec 11
  for (let t = Date.parse('2026-09-01T00:00:00Z'); t <= Date.parse('2026-12-11T00:00:00Z'); t += DAY) {
    const d = new Date(t); const dow = d.getUTCDay(); const ds = fmt(d);
    if (ds === '2026-11-26' || ds === '2026-11-27') continue; // Thanksgiving break
    if (dow === 2 || dow === 4) add(ds, '08:00', 'SEC-331 Network Security', 'uni', 'orange', 75, 'Hensley Hall 210');
    if (dow === 1 || dow === 3) add(ds, '13:30', 'SEC-342 Applied Cryptography', 'uni', 'orange', 75, 'Ridley 105');
    if (dow === 3) add(ds, '16:00', 'SEC-331 Lab', 'uni', 'orange', 110, 'Cyber Range, B-wing');
    if (dow === 4) add(ds, '18:30', 'Student Security Club', 'social', 'purple', 90, 'Hensley Hall 118');
    if (dow === 0 && rand() < 0.5) add(ds, '13:00', 'Lunch at Nana\'s', 'family', 'red', 150, 'Maple St.');
  }
  const one: [string, string, string, string, string, number, string?, string?][] = [
    ['2026-06-08', '18:00', 'Kestrel — external review starts', 'work', 'blue', 300, 'remote', 'Evenings only (18–23)'],
    ['2026-06-12', '20:00', 'NightShift CTF', 'events', 'yellow', 1440, 'online', 'team: segfault sisters'],
    ['2026-06-19', '18:00', 'Kestrel — review ends / report', 'work', 'blue', 120, 'remote'],
    ['2026-07-02', '19:00', 'Kestrel VPN retest', 'work', 'blue', 90, 'remote'],
    ['2026-07-18', '17:00', 'Sasha rooftop party', 'social', 'purple', 240, 'Sasha\'s building'],
    ['2026-08-14', '07:30', 'Brightwater Dental on-site WiFi', 'work', 'blue', 240, '22 Brightwater Ave'],
    ['2026-08-27', '10:00', 'Dentist (actual appointment lol)', 'personal', 'green', 45, 'Brightwater Dental'],
    ['2026-09-02', '11:00', 'Tuition installment 1', 'personal', 'green', 30],
    ['2026-09-26', '10:00', 'Aurora Uni internal CTF', 'events', 'yellow', 480, 'Cyber Range'],
    ['2026-10-01', '09:00', 'Tuition installment 2', 'personal', 'green', 30],
    ['2026-10-14', '14:00', 'Halloran office hours (lab 4 regrade)', 'uni', 'orange', 30, 'Hensley 412'],
    ['2026-10-22', '08:00', 'SEC-331 Midterm', 'uni', 'orange', 120, 'Hensley Hall 210', 'Bring calculator + one cheat sheet'],
    ['2026-10-31', '20:00', 'Halloween party @ Sasha\'s', 'social', 'purple', 300, 'Sasha\'s place', 'I\'m doing the playlist'],
    ['2026-11-01', '09:00', 'Tuition installment 3', 'personal', 'green', 30],
    ['2026-11-07', '10:00', 'Career fair', 'events', 'yellow', 240, 'Student Union'],
    ['2026-11-14', '18:00', 'Hollow Pine kickoff call', 'work', 'blue', 45, 'phone'],
    ['2026-11-17', '15:00', 'Send Hollow Pine scope + RoE', 'work', 'blue', 30],
    ['2026-11-18', '14:00', 'Halloran office hours — proposal', 'uni', 'orange', 30, 'Hensley 412'],
    ['2026-11-20', '07:00', 'Hollow Pine on-site review', 'work', 'blue', 120, 'Hollow Pine Coffee, 5th & Elm', 'Tomás opens the door. Do NOT take the POS offline.'],
    ['2026-11-22', '11:00', 'Brunch w/ Sasha', 'social', 'purple', 90, 'Juniper Café'],
    ['2026-11-23', '09:00', 'Follow up INV-2026-014', 'work', 'blue', 15],
    ['2026-11-24', '23:59', 'SEC-331 final project proposal due', 'uni', 'orange', 1],
    ['2026-11-26', '12:00', 'Thanksgiving at Nana\'s', 'family', 'red', 360, 'Maple St.'],
    ['2026-12-01', '09:00', 'Student ID expires — renew!', 'personal', 'green', 30, 'Registrar, Hensley Hall'],
    ['2026-12-01', '09:00', 'Tuition installment 4', 'personal', 'green', 30],
    ['2026-12-09', '10:00', 'SEC-342 final exam', 'uni', 'orange', 150, 'Ridley 105'],
    ['2026-12-11', '16:00', 'SEC-331 project presentations', 'uni', 'orange', 120, 'Hensley Hall 210'],
  ];
  one.forEach(o => add(...o));
  return ev;
}

// ---------- Notepad / Browser / Notifications / Music ----------
export const notepadState = (home: string) => ({
  activeTabId: 'tab-proposal',
  tabs: [
    { id: 'tab-todo', name: 'todo.md', path: `${home}/Documents/Notes/todo.md`, content: (FILES.find(f => f.name === 'todo.md')!).content, isModified: false, context: 'markdown', previewMode: false },
    { id: 'tab-proposal', name: 'SEC-331 final project proposal.md', path: `${home}/Desktop/SEC-331 final project proposal.md`,
      content: (FILES.find(f => f.name === 'SEC-331 final project proposal.md')!).content + `\n## Methodology (rev. after Halloran feedback)\n1. Get written approval from Dan Ortiz (Univ. IT)\n2. Passive observation only on AuroraU-Guest\n3. Rollback: \n`, isModified: true, context: 'markdown', previewMode: false },
    { id: 'tab-scan', name: 'scan.js', path: `${home}/Projects/portscan-lite/scan.js`, content: (FILES.find(f => f.name === 'scan.js')!).content, isModified: false, context: 'javascript', previewMode: false },
  ],
});

export function browserState() {
  const visits: [string, string][] = [
    ['aurora.edu', 'Aurora University'], ['techblog.com', 'TechBlog'], ['hackwithjack.org', 'Hack With Jack'], ['securebank.com', 'SecureBank'],
    ['trustmail.com', 'TrustMail'], ['search://home', 'Search'],
  ];
  const history = [] as { url: string; title: string; timestamp: string }[];
  for (let i = 0; i < 48; i++) {
    const [url, title] = pick(visits);
    history.push({ url, title, timestamp: iso(between(TN - 30 * DAY, TN - 3600000)) });
  }
  history.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  history.push({ url: 'aurora.edu', title: 'Aurora University', timestamp: iso(TN - 20 * 60000) });
  return { url: 'aurora.edu', bookmarks: ['aurora.edu', 'hackwithjack.org', 'techblog.com', 'securebank.com'], history };
}

export const notifications = (owner: string) => [
  { id: 'n-1', appId: 'mail', owner, title: 'Rosa Whitfield', message: 'Re: Scope + rules of engagement', createdAt: Date.parse('2026-11-17T07:55:00Z'), unread: true },
  { id: 'n-2', appId: 'messages', owner, title: 'devon', message: 'also halloran replied, we need dan ortiz\'s ok for the library', createdAt: Date.parse('2026-11-17T08:58:00Z'), unread: true },
  { id: 'n-3', appId: 'messages', owner, title: 'rosa.hollowpine', message: 'replied to your email ☕', createdAt: Date.parse('2026-11-17T07:56:00Z'), unread: true },
  { id: 'n-4', appId: 'mail', owner, title: 'Prof. Elaine Halloran', message: 'Re: Captive portal project — approval', createdAt: Date.parse('2026-11-13T09:02:00Z'), unread: false },
  { id: 'n-5', appId: 'messages', owner, title: 'sasha', message: 'brunch sunday?', createdAt: Date.parse('2026-11-15T20:15:00Z'), unread: false },
  { id: 'n-6', appId: 'mail', owner, title: 'Aurora University Registrar', message: 'Action required: student ID renewal before Dec 1', createdAt: Date.parse('2026-11-04T13:00:00Z'), unread: false },
];

export const musicRecent = (home: string) => [
  { id: `${home}/Music/Lo-Fi Girl.mp3`, path: `${home}/Music/Lo-Fi Girl.mp3`, url: '/media/Lo-Fi Girl.opus', title: 'Lo-Fi Girl', artist: 'Unknown Artist', album: 'Unknown Album', duration: '2:41' },
  { id: `${home}/Music/Runway Electric.mp3`, path: `${home}/Music/Runway Electric.mp3`, url: '/src/assets/sounds/Runway Electric.opus', title: 'Runway Electric', artist: 'Unknown Artist', album: 'Unknown Album', duration: '1:00' },
];

// ---------- WiFi ----------
export const WIFI = {
  connected: 'Calloway-5G',
  known: {
    'Calloway-5G': { security: 'WPA2', maxSpeed: 300 },
    'AuroraU-Secure': { security: 'WPA3', maxSpeed: 450 },
    'HollowPine-Guest': { security: 'WPA2', maxSpeed: 54 },
    'Juniper_Cafe_Guest': { security: 'OPEN', maxSpeed: 24 },
  },
};

// ---------- App Store installs ----------
export const INSTALLS: [string, string][] = [
  ['2026-05-22T20:05:00Z', 'notepad'],
  ['2026-05-25T17:55:00Z', 'messages'],
  ['2026-05-26T08:30:00Z', 'calendar'],
  ['2026-06-07T19:58:00Z', 'music'],
  ['2026-06-15T19:25:00Z', 'photos'],
];

// ---------- Saved window session (restored by useWindowManager on login) ----------
export const windowSession = (owner: string) => [
  { id: 'finder-1763365200000', type: 'finder', title: 'Finder', isMinimized: false, isMaximized: false,
    position: { x: 96, y: 72 }, size: { width: 860, height: 560 }, zIndex: 101, owner },
  { id: 'mail-1763368800000', type: 'mail', title: 'Mail', isMinimized: false, isMaximized: false,
    position: { x: 400, y: 150 }, size: { width: 960, height: 620 }, zIndex: 102, owner },
];
