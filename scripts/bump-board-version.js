#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const versionPath = path.join(__dirname, '..', 'board-version.json');
const payload = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
const nextVersion = Number(payload.version || 0) + 1;

fs.writeFileSync(versionPath, `${JSON.stringify({ version: nextVersion }, null, 2)}\n`);
console.log(`Board version bumped to ${nextVersion}`);
