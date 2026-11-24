// Verification: node check.js <base>  — fetches main pages via the proxy, checks every referenced asset resolves
// locally, flags remaining absolute external resource URLs, and joins the main room as a socket.io client.
const path = require('path');
const { io } = require(path.join(__dirname, '..', '..', 'node_modules', 'socket.io-client'));
const base = process.argv[2] || 'http://localhost:5738';
const pages = ['/', '/newcall', '/activeRooms', '/customizeRoom', '/join/northwind-product-weekly'];
(async () => {
    const seen = new Set();
    for (const p of pages) {
        const r = await fetch(base + p);
        const html = await r.text();
        console.log('PAGE', p, r.status, html.length);
        const refs = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)].map((m) => m[1]);
        for (const ref of refs) {
            if (/^(mailto:|javascript:|data:)/.test(ref)) continue;
            if (/^https?:/.test(ref) && !ref.startsWith(base)) {
                if (/\.(js|css|png|jpg|svg|gif|woff2?)(\?|$)/.test(ref)) console.log('  EXTERNAL', ref);
                continue;
            }
            const u = new URL(ref, base + p).href;
            if (seen.has(u) || /\/(join|newcall|activeRooms|customizeRoom|about|privacy|login|icetest)\b/.test(u)) continue;
            seen.add(u);
            const rr = await fetch(u);
            if (rr.status >= 400) console.log('  MISSING', rr.status, u);
        }
    }
    // CSS @import / url() inside mirrored CSS
    const ar = await (await fetch(base + '/api/v1/activeRooms', { headers: { authorization: 'mirotalkp2p_local_capture_secret' } })).json();
    console.log('ACTIVE', JSON.stringify(ar.activeRooms.map((r) => `${r.id}:${r.peers}`)));

    const s = io(base, { transports: ['websocket'] });
    s.on('connect', () =>
        s.emit('join', { channel: 'northwind-product-weekly', peer_uuid: 'check-' + Date.now(), peer_name: 'Checker', peer_avatar: false, peer_info: { isDesktopDevice: true, osName: 'macOS', browserName: 'Chrome' }, peer_video: false, peer_audio: false, peer_video_status: false, peer_audio_status: false, peer_screen_status: false, peer_hand_status: false, peer_rec_status: false, peer_privacy_status: false, channel_password: false })
    );
    const got = {};
    s.onAny((ev, data) => {
        got[ev] = (got[ev] || 0) + 1;
        if (ev === 'poll' && data.action === 'list') console.log('POLLS', JSON.stringify(data.polls.map((p) => [p.question, p.options.map((o) => o.votes ?? o.count ?? o)])));
        if (ev === 'message' || ev === 'chat') console.log('MSG', JSON.stringify(data).slice(0, 200));
    });
    setTimeout(() => {
        console.log('EVENTS', JSON.stringify(got));
        process.exit(0);
    }, 6000);
})();
