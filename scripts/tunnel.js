#!/usr/bin/env node
/*
 * Exposes the local server to the internet through a Cloudflare quick tunnel,
 * and keeps it alive.
 *
 * Quick tunnels (the account-less kind) have no uptime guarantee and drop
 * regularly -- often silently, with the process still running but the proxy
 * dead. This supervises cloudflared, restarts it whenever it exits, and
 * reports each new URL, since a restarted quick tunnel always gets a
 * different hostname.
 *
 * The current URL is also written to .tunnel-url so it can be read without
 * scrolling back through the log.
 *
 * Usage: npm run tunnel
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 5000;
const TARGET = `http://localhost:${PORT}`;
const URL_FILE = path.resolve(__dirname, '..', '.tunnel-url');
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const RESTART_DELAY_MS = 3000;

let child = null;
let currentUrl = null;
let restarts = 0;
let stopping = false;

function stamp() {
  return new Date().toTimeString().slice(0, 8);
}

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(TARGET, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function announce(url) {
  currentUrl = url;
  try {
    fs.writeFileSync(URL_FILE, `${url}\n`);
  } catch (e) {
    /* not fatal */
  }
  const bar = '='.repeat(url.length + 8);
  console.log(`\n${bar}\n    ${url}\n${bar}`);
  console.log(`(tersimpan di ${path.relative(process.cwd(), URL_FILE)})\n`);
}

function start() {
  if (stopping) return;
  child = spawn('cloudflared', ['tunnel', '--url', TARGET], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const onData = (buf) => {
    const text = buf.toString();
    const match = text.match(URL_RE);
    // The banner line and the informational blurb both mention the domain;
    // only the first full URL of a given run is the actual hostname.
    if (match && match[0] !== currentUrl) announce(match[0]);
    if (/ERR|error=/.test(text) && !/Retrying/.test(text)) {
      process.stderr.write(`[${stamp()}] ${text.trim().slice(0, 200)}\n`);
    }
  };

  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  child.on('exit', (code) => {
    if (stopping) return;
    restarts++;
    console.log(
      `\n[${stamp()}] tunnel berhenti (exit ${code}) -- menyalakan ulang ` +
        `(restart ke-${restarts}). URL akan BERUBAH.`,
    );
    currentUrl = null;
    setTimeout(start, RESTART_DELAY_MS);
  });

  child.on('error', (err) => {
    console.error(
      `\nGagal menjalankan cloudflared: ${err.message}\n` +
        'Pastikan cloudflared terpasang dan ada di PATH.',
    );
    process.exit(1);
  });
}

(async () => {
  const status = await checkServer();
  if (status === null) {
    console.error(
      `\nServer tidak merespons di ${TARGET}.\n` +
        'Jalankan `npm start` dulu di terminal lain, baru `npm run tunnel`.\n',
    );
    process.exit(1);
  }
  console.log(`Server OK di ${TARGET} (HTTP ${status}). Membuka tunnel...`);
  start();
})();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    stopping = true;
    if (child) child.kill();
    console.log('\nTunnel dimatikan.');
    process.exit(0);
  });
}
