// Seeds MiroTalk with live meeting participants through the app's own signaling protocol (socket.io),
// so active rooms, participant lists, video tiles (camera-off avatars), raised hands, polls etc. look like real use.
// Room data lives in rooms-data.js. Participants join with camera off, so the client renders their avatar tiles.
'use strict';
const path = require('path');
const { io } = require(path.join(__dirname, '..', 'node_modules', 'socket.io-client'));
const { rooms } = require('./rooms-data');

const URL = process.env.SIGNALING_URL || 'http://127.0.0.1:4439';
const PUBLIC = process.env.HOST || 'http://localhost:4438';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

const devices = {
    mac: { isDesktopDevice: true, isMobileDevice: false, isTabletDevice: false, isIPadDevice: false, osName: 'macOS', osVersion: '15.6', browserName: 'Chrome', browserVersion: '142.0.0.0' },
    macSafari: { isDesktopDevice: true, isMobileDevice: false, isTabletDevice: false, isIPadDevice: false, osName: 'macOS', osVersion: '15.6', browserName: 'Safari', browserVersion: '26.1' },
    win: { isDesktopDevice: true, isMobileDevice: false, isTabletDevice: false, isIPadDevice: false, osName: 'Windows', osVersion: '11', browserName: 'Edge', browserVersion: '142.0.0.0' },
    winFf: { isDesktopDevice: true, isMobileDevice: false, isTabletDevice: false, isIPadDevice: false, osName: 'Windows', osVersion: '10', browserName: 'Firefox', browserVersion: '145.0' },
    linux: { isDesktopDevice: true, isMobileDevice: false, isTabletDevice: false, isIPadDevice: false, osName: 'Linux', osVersion: 'x86_64', browserName: 'Firefox', browserVersion: '145.0' },
    iphone: { isDesktopDevice: false, isMobileDevice: true, isTabletDevice: false, isIPadDevice: false, osName: 'iOS', osVersion: '26.1', browserName: 'Mobile Safari', browserVersion: '26.1' },
    android: { isDesktopDevice: false, isMobileDevice: true, isTabletDevice: false, isIPadDevice: false, osName: 'Android', osVersion: '16', browserName: 'Chrome', browserVersion: '142.0.0.0' },
    ipad: { isDesktopDevice: false, isMobileDevice: false, isTabletDevice: true, isIPadDevice: true, osName: 'iOS', osVersion: '18.6', browserName: 'Mobile Safari', browserVersion: '18.6' },
};

function joinPeer(room, p, roomStartedAt) {
    const socket = io(URL, { transports: ['websocket'], reconnection: true });
    const peer = { socket, room, p, id: null };
    socket.on('connect', () => {
        peer.id = socket.id;
        socket.emit('join', {
            join_data_time: new Date().toLocaleString(),
            channel: room.id,
            channel_password: false,
            peer_info: { ...(devices[p.device] || devices.mac), extras: {} },
            peer_uuid: p.uuid || (p.uuid = uuid()),
            peer_name: p.name,
            peer_avatar: p.avatar ? `${PUBLIC}/images/avatars/${p.avatar}` : false,
            peer_token: false,
            peer_video: false,
            peer_audio: true,
            peer_video_status: false,
            peer_audio_status: !p.muted,
            peer_screen_status: false,
            peer_hand_status: !!p.hand,
            peer_rec_status: !!p.rec,
            peer_privacy_status: false,
            userAgent: 'Mozilla/5.0',
        });
    });
    return peer;
}

async function seedRoom(room) {
    const peers = [];
    for (const p of room.participants) {
        peers.push(joinPeer(room, p));
        await sleep(250);
    }
    // Polls are server side: create them as the presenter, then let each participant vote
    await sleep(800);
    const host = peers[0];
    const byName = Object.fromEntries(peers.map((x) => [x.p.name, x]));
    for (const poll of room.polls || []) {
        const created = new Promise((resolve) => {
            const onPoll = (msg) => {
                if (msg && msg.action === 'update' && msg.poll && msg.poll.question === poll.question) {
                    host.socket.off('poll', onPoll);
                    resolve(msg.poll.id);
                }
            };
            host.socket.on('poll', onPoll);
        });
        host.socket.emit('poll', { action: 'create', room_id: room.id, peer_name: host.p.name, question: poll.question, options: poll.options, anonymous: !!poll.anonymous });
        const pollId = await Promise.race([created, sleep(3000).then(() => null)]);
        if (!pollId) {
            console.error('[seed] poll not created', poll.question);
            continue;
        }
        await sleep(400); // server throttles poll actions per socket (100ms)
        for (const [name, option] of Object.entries(poll.votes || {})) {
            const voter = byName[name];
            if (!voter) continue;
            voter.socket.emit('poll', { action: 'vote', room_id: room.id, poll_id: pollId, option, peer_name: name });
            await sleep(150);
        }
        await sleep(200);
    }
    return peers;
}

(async () => {
    const all = [];
    await Promise.all(
        rooms.map((room, i) =>
            sleep(i * 150)
                .then(() => seedRoom(room))
                .then((peers) => all.push(...peers))
                .catch((e) => console.error('[seed] room failed', room.id, e.message))
        )
    );
    console.log(`[seed] ${rooms.length} rooms, ${all.length} participants connected`);
    module.exports.peers = all;
})();
