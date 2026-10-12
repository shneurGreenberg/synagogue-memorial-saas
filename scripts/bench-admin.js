#!/usr/bin/env node
/**
 * Time admin-related HTTP endpoints against a running server.
 * Usage: node scripts/bench-admin.js [BASE_URL]
 * Example: BASE=http://127.0.0.1:3000 node scripts/bench-admin.js
 */
const http = require('http');
const https = require('https');

const BASE = (process.argv[2] || process.env.BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
const RUNS = Number(process.env.RUNS || 5);

const PATHS = [
  '/css/admin.css',
  '/js/admin-number-stepper.js',
  '/admin/login',
  '/board/assets/memorial.css',
];

function fetchOnce(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const started = process.hrtime.bigint();
    const req = lib.get(url, { headers: { Accept: '*/*' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          ms,
          bytes: body.length,
          encoding: res.headers['content-encoding'] || '',
          cacheControl: res.headers['cache-control'] || '',
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function benchPath(path) {
  const url = `${BASE}${path}`;
  const samples = [];
  for (let i = 0; i < RUNS; i += 1) {
    samples.push(await fetchOnce(url));
  }
  const times = samples.map((s) => s.ms);
  const last = samples[samples.length - 1];
  return {
    path,
    medianMs: median(times).toFixed(1),
    minMs: Math.min(...times).toFixed(1),
    maxMs: Math.max(...times).toFixed(1),
    status: last.status,
    bytes: last.bytes,
    encoding: last.encoding,
    cacheControl: last.cacheControl,
  };
}

async function main() {
  console.log(`Benchmark BASE=${BASE} runs=${RUNS}\n`);
  for (const path of PATHS) {
    try {
      const row = await benchPath(path);
      console.log(
        `${row.path}\n`
        + `  median ${row.medianMs} ms (min ${row.minMs}, max ${row.maxMs})`
        + ` | ${row.status} | ${row.bytes} B`
        + (row.encoding ? ` | ${row.encoding}` : '')
        + (row.cacheControl ? ` | Cache-Control: ${row.cacheControl}` : ''),
      );
    } catch (err) {
      console.log(`${path}\n  ERROR: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
