// Live meetings seeded into MiroTalk at startup (see seed-rooms.js).
// The first participant of each room joins first and becomes its presenter.
'use strict';

const rooms = [
    {
        id: 'northwind-product-weekly',
        participants: [
            { name: 'Priya Raman', avatar: 'avatar_03.png', device: 'mac' },
            { name: 'Marco Bellini', device: 'win', muted: true },
            { name: 'Hannah Schultz', avatar: 'avatar_12.png', device: 'macSafari' },
            { name: 'Tomás Oliveira', device: 'linux', muted: true, hand: true },
            { name: 'Aisha Mensah', avatar: 'avatar_07.png', device: 'mac', muted: true },
            { name: 'Kenji Watanabe', device: 'iphone', muted: true },
            { name: 'lucas.ferreira@northwind.io', device: 'winFf', muted: true },
        ],
        polls: [
            {
                question: 'Which date works for the Q1 roadmap offsite?',
                options: ['Tue Jan 13', 'Thu Jan 15', 'Mon Jan 19', 'Remote only, no offsite'],
                votes: { 'Priya Raman': 1, 'Marco Bellini': 1, 'Hannah Schultz': 0, 'Tomás Oliveira': 3, 'Aisha Mensah': 1, 'Kenji Watanabe': 2 },
            },
            {
                question: 'Ship onboarding checklist v2 behind a flag on Nov 24?',
                options: ['Yes, ship it', 'Wait one more sprint', 'Need more QA first'],
                anonymous: true,
                votes: { 'Priya Raman': 0, 'Hannah Schultz': 0, 'Aisha Mensah': 2, 'lucas.ferreira@northwind.io': 0, 'Kenji Watanabe': 1 },
            },
        ],
    },
    {
        id: 'design-critique-mobile-checkout',
        participants: [
            { name: 'Sofia Lindqvist', avatar: 'avatar_16.png', device: 'mac' },
            { name: 'Daniel Cho', device: 'mac', muted: true },
            { name: 'Rachel Adeyemi', avatar: 'avatar_21.png', device: 'ipad', muted: true, hand: true },
            { name: 'Felix Wagner', device: 'linux', muted: true },
        ],
    },
    {
        id: 'acme-logistics-onboarding-call',
        participants: [
            { name: 'Elena Petrova', avatar: 'avatar_09.png', device: 'mac' },
            { name: 'Greg Halvorsen (Acme)', device: 'win' },
            { name: 'Mei Lin (Acme IT)', device: 'winFf', muted: true },
        ],
    },
    {
        id: 'eng-standup-platform',
        participants: [
            { name: 'Oluwaseun Bakare', device: 'linux' },
            { name: 'Jakub Nowak', avatar: 'avatar_05.png', device: 'linux', muted: true },
            { name: 'Ines Carvalho', device: 'mac', muted: true },
            { name: 'Arjun Mehta', avatar: 'avatar_14.png', device: 'mac', muted: true },
            { name: 'Chloé Dubois', device: 'win', muted: true },
            { name: 'Ryan O’Connell', device: 'android', muted: true },
        ],
        polls: [
            {
                question: 'Move the Postgres 17 upgrade to the Dec 2 maintenance window?',
                options: ['Yes', 'No, after the holiday freeze', 'Need a rollback plan first'],
                votes: { 'Jakub Nowak': 2, 'Ines Carvalho': 0, 'Arjun Mehta': 2, 'Chloé Dubois': 0 },
            },
        ],
    },
    {
        id: 'interview-senior-frontend-r2',
        participants: [
            { name: 'Natalie Brooks', avatar: 'avatar_18.png', device: 'mac' },
            { name: 'Samuel Okonkwo', device: 'win' },
        ],
    },
    {
        id: 'support-escalation-ticket-48213',
        participants: [
            { name: 'Valentina Rossi', avatar: 'avatar_11.png', device: 'win' },
            { name: 'Ahmed Farouk', device: 'macSafari', muted: true },
        ],
    },
    {
        id: 'book-club-tuesday',
        participants: [
            { name: 'Lena Hoffmann', avatar: 'avatar_20.png', device: 'ipad' },
            { name: 'Diego Ramírez', device: 'android' },
            { name: 'Grace Kim', avatar: 'avatar_23.png', device: 'iphone', muted: true },
            { name: 'Oscar Nilsson', device: 'mac', muted: true },
            { name: 'Fatima Zahra', device: 'win', muted: true },
        ],
        polls: [
            {
                question: "December pick?",
                options: ['Tomorrow, and Tomorrow, and Tomorrow', 'The Ministry of Time', 'Piranesi (re-read)', 'Demon Copperhead'],
                votes: { 'Lena Hoffmann': 1, 'Diego Ramírez': 0, 'Grace Kim': 1, 'Oscar Nilsson': 3 },
            },
        ],
    },
    {
        id: '1on1-priya-marco',
        participants: [{ name: 'Priya R.', device: 'iphone' }],
    },
    {
        id: 'marketing-launch-war-room',
        participants: [
            { name: 'Zoe Martin', avatar: 'avatar_08.png', device: 'mac', rec: true },
            { name: 'Ben Carter', device: 'mac', muted: true },
            { name: 'Yuki Sato', device: 'macSafari', muted: true },
        ],
    },
];

module.exports = { rooms };
