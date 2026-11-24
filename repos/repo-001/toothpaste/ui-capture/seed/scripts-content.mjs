// Duckyscript library of an established ToothPaste user (sysadmin / homelab / pentest hobbyist).
// [name, daysAgoCreated, daysAgoUpdated, content]
export const SCRIPTS = [
["BIOS - Dell OptiPlex setup password", 212, 198, `REM Dell OptiPlex 7090 fleet - BIOS admin password
REM F2 at POST first, wait for the setup screen
DEFAULT_DELAY 80
DELAY 1500
STRING "Vq7!rT2#kLm9"
DELAY 300
PRESS ENTER`],
["LUKS unlock - nas01", 205, 41, `REM Unlock encrypted root on nas01 at the dracut prompt
DELAY 500
STRING "correct-horse-battery-nas01-2024"
TAP ENTER`],
["Win11 OOBE - bypass network requirement", 190, 190, `REM Shift+F10 at the "Let's connect you to a network" screen first
DELAY 1000
STRING "OOBE\\\\BYPASSNRO"
DELAY 200
TAP ENTER`],
["Wi-Fi guest password", 188, 12, `STRING "Bluefin-Harbor-4471"`],
["Proxmox root login (pve2)", 176, 176, `REM Console login on pve2 when the web UI is down
STRING "root"
TAP ENTER
DELAY 400
STRING "pv3-Rack2-!Kestrel"
TAP ENTER`],
["Hak5 - reverse shell (original, unported)", 171, 171, `REM Imported straight from the payload repo - needs porting to ToothPaste syntax
DELAY 1000
GUI r
DELAY 200
STRING powershell -NoP -NonI -W Hidden
ENTER`],
["Lab - open admin PowerShell", 166, 59, `REM Win+X menu, then "Terminal (Admin)"
WINDOWS
DELAY 600
TAP x
DELAY 300
TAP a
DELAY 1200
TAP LEFT
TAP ENTER`],
["iDRAC console - default creds (lab only)", 160, 160, `REM Only for the lab R720 that never got its password changed
STRING "root"
TAP TAB
STRING "calvin"
TAP ENTER`],
["Email signature", 152, 7, `STRING "Best,\\nMorgan Ellery\\nSenior Systems Engineer, Infrastructure\\nHalvorsen Logistics | +1 (604) 555-0187"`],
["SSH pubkey - ed25519 (work laptop)", 149, 149, `STRING "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOq8m2b3vZ0w7tq4Q1kF9cYJ9e2pXrR7m3sLwH1uT0aD morgan@hl-tp14"`],
["Kiosk reset - lobby display", 141, 88, `REM Lobby kiosk (Chrome in kiosk mode) freezes ~weekly
DEFAULT_DELAY 100
HOLD ALT
TAP F4
RELEASE ALT
DELAY 3000
WINDOWS
DELAY 500
STRING "chrome --kiosk https://status.halvorsen.local/lobby"
TAP ENTER`],
["Linux TTY - quick system info", 133, 133, `REM Paste into a fresh TTY on a box with no network
DEFAULT_DELAY 30
STRING "uname -a; uptime; df -h /; free -m; ip -br a"
TAP ENTER`],
["Badge-in reminder note", 127, 127, `STRING "Reminder: server room badge reader is offline until Facilities replaces the controller. Sign the paper log at the door."`],
["macOS - lock screen", 120, 120, `MAC
HOLD CTRL
HOLD COMMAND
TAP q
RELEASE COMMAND
RELEASE CTRL`],
["Router factory reset creds (UniFi)", 114, 66, `STRING "ubnt"
TAP TAB
STRING "ubnt"
TAP ENTER
DELAY 2000
REM then change it immediately!!`],
["CTF - nmap full sweep", 109, 109, `REM HTB-style box, change the IP each time
DEFAULT_DELAY 20
STRING "sudo nmap -sC -sV -p- --min-rate 5000 -oN full.nmap 10.10.11.42"
TAP ENTER`],
["CTF - python pty upgrade", 108, 102, `STRING "python3 -c 'import pty; pty.spawn(\\"/bin/bash\\")'"
TAP ENTER
DELAY 300
HOLD CTRL
TAP z
RELEASE CTRL
DELAY 200
STRING "stty raw -echo; fg"
TAP ENTER
DELAY 200
STRING "export TERM=xterm"
TAP ENTER`],
["Rubber Ducky - hello world (broken quotes)", 104, 104, `REM first attempt at the parser, keeping for reference
STRING "Hello from ToothPaste!
DELAY
STRING`],
["Mom's iPad - Apple ID", 98, 31, `STRING "linda.ellery@icloud.com"
TAP TAB
DELAY 300
STRING "Sunflower#1958"`],
["Jenkins agent restart (win)", 93, 93, `WINDOWS
DELAY 500
STRING "cmd"
DELAY 400
HOLD CTRL
HOLD SHIFT
TAP ENTER
RELEASE SHIFT
RELEASE CTRL
DELAY 1500
TAP LEFT
TAP ENTER
DELAY 1000
STRING "sc stop jenkins-agent && timeout /t 5 && sc start jenkins-agent"
TAP ENTER`],
["VeraCrypt - backup drive", 87, 87, `STRING "Granite-Otter-Lantern-Fjord-88"
TAP ENTER`],
["Recovery key - BitLocker hl-ws-114", 80, 80, `REM 48-digit recovery key, asset tag HL-WS-114 (Priya's desktop)
DEFAULT_DELAY 60
STRING "418231-650782-093357-226019-571440-308286-712503-194975"
TAP ENTER`],
["Zoom meeting ID - weekly infra sync", 74, 74, `STRING "823 4419 0675"
TAP TAB
STRING "infra22"`],
["Lorem for UI testing", 70, 70, `STRING "The quick brown fox jumps over the lazy dog. 0123456789 !@#$%^&*()_+-=[]{};':,./<>?"`],
["Steam Deck - desktop mode sudo", 63, 63, `STRING "deck-Sp1ral-Mist"
TAP ENTER`],
["Change hostname - new Pi image", 58, 54, `DEFAULT_DELAY 40
STRING "sudo hostnamectl set-hostname pi-garage-cam"
TAP ENTER
DELAY 500
STRING "raspberry"
TAP ENTER
DELAY 300
STRING "sudo reboot"
TAP ENTER`],
["Windows - lock + sleep display", 51, 51, `WINDOWS
HOLD GUI
TAP l
RELEASE GUI`],
["git config one-liner", 47, 47, `STRING "git config --global user.name \\"Morgan Ellery\\" && git config --global user.email morgan.ellery@halvorsen.io && git config --global pull.rebase true"
TAP ENTER`],
["Air-gapped signer - unlock", 44, 9, `REM HSM workstation in cage B, no clipboard, no USB storage allowed
DEFAULT_DELAY 120
DELAY 800
STRING "m.ellery"
TAP TAB
STRING "7Q#vX!p2nW@e9Lr4"
TAP ENTER
DELAY 2500
STRING "831207"
TAP ENTER`],
["TV - Netflix profile PIN", 39, 39, `STRING "4826"`],
["Long - incident template", 35, 28, `DEFAULT_DELAY 5
STRING "INCIDENT SUMMARY\\n================\\nStart (UTC): \\nEnd (UTC): \\nSeverity: SEV-\\nServices affected: \\n\\nTimeline\\n--------\\n- \\n\\nRoot cause\\n----------\\n\\nRemediation\\n-----------\\n- [ ] \\n\\nFollow-ups (owner, due)\\n-----------------------\\n- "`],
["Rename printer share", 30, 30, `REM half finished - REPEAT needs a count
STRING "\\\\\\\\print01\\\\Floor3-Canon"
REPEAT
TAP ENTER`],
["Grafana admin (homelab)", 24, 24, `STRING "admin"
TAP TAB
STRING "g4f-Hollow-Pine!"
TAP ENTER`],
["Cisco console - enable + show run", 19, 15, `DEFAULT_DELAY 60
STRING "enable"
TAP ENTER
DELAY 300
STRING "Sw1tch-3nable-HL"
TAP ENTER
STRING "terminal length 0"
TAP ENTER
STRING "show running-config"
TAP ENTER`],
["Bank 2FA backup codes - DO NOT RUN", 16, 16, `REM stored here only so they're encrypted at rest
REM 5091-2271  8834-0016  4472-9930  1205-6684`],
["PXE boot - select netboot.xyz", 12, 12, `DELAY 4000
TAP F12
DELAY 2500
TAP DOWN
TAP DOWN
TAP ENTER`],
["Delay test (slow target)", 8, 8, `DEFAULT_DELAY 250
STRING "slow typing test for the old Thinkpad BIOS"
DELAY 1000
DELAY -50`],
["Work VPN - Okta push fallback", 5, 2, `STRING "morgan.ellery@halvorsen.io"
TAP TAB
STRING "Okt@-Cascade-2026"
TAP ENTER
DELAY 4000
STRING "push"`],
["Sunshine/Moonlight PIN pair", 1, 1, `STRING "7310"
TAP ENTER`],
];
