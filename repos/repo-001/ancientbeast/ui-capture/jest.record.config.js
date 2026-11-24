// Jest config for recording the seeded match (see seed/record-match.test.ts).
const path = require('path');
const base = require('../jest.config.js');
module.exports = {
	...base,
	rootDir: path.resolve(__dirname, '..'),
	roots: ['<rootDir>/.ui-capture/seed', '<rootDir>/src'],
	testMatch: ['**/.ui-capture/seed/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/'],
	testTimeout: 600000,
};
