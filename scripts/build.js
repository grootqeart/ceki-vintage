#!/usr/bin/env node
/*
 * Produces the deployable artifact: builds the React client and publishes it
 * into server/public, which is the ONLY folder express serves
 * (server/server.js -> express.static(path.join('server', 'public'))).
 *
 * That copy step is the whole reason this script exists. Building the client
 * alone leaves the new bundle sitting in client/build while the server keeps
 * serving whatever is already in server/public -- the app comes up fine, so
 * the stale deploy is silent and looks like "my changes did nothing".
 *
 * Written in Node rather than as a shell one-liner so the same command works
 * on Windows and on the Linux build container.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clientBuildDir = path.join(root, 'client', 'build');
const serverPublicDir = path.join(root, 'server', 'public');

function run(cmd, args, extraEnv) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true, // needed so `npm` resolves to npm.cmd on Windows
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    console.error(`\nBuild failed at: ${cmd} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

// `npm ci` installs exactly what the lockfile pins, so the same commit always
// produces the same bundle. Plain `npm install` is free to move dependencies
// within their `^` ranges, which was observed changing the built bundle's hash
// between two runs of identical source. Falls back when there's no usable
// lockfile (npm ci refuses to run without one).
const hasLockfile = fs.existsSync(path.join(root, 'client', 'package-lock.json'));
const installArgs = ['--prefix', 'client', '--no-audit', '--no-fund'];
if (hasLockfile) {
  const ci = spawnSync('npm', ['ci', ...installArgs], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (ci.status !== 0) {
    console.warn('\nnpm ci failed (lockfile likely out of sync) -- retrying with npm install');
    run('npm', ['install', ...installArgs]);
  }
} else {
  run('npm', ['install', ...installArgs]);
}

run('npm', ['run', 'build', '--prefix', 'client'], {
  // react-scripts 3.x ships webpack 4, whose hashing uses an MD4 digest that
  // OpenSSL 3 (Node 17+) removed from the default provider.
  NODE_OPTIONS: `--openssl-legacy-provider ${process.env.NODE_OPTIONS || ''}`.trim(),
  // CI=true makes react-scripts promote lint warnings to build failures.
  // Hosting providers set CI=true automatically, so a warning that builds
  // fine locally would break the deploy.
  CI: 'false',
});

if (!fs.existsSync(path.join(clientBuildDir, 'index.html'))) {
  console.error(`\nExpected a built client at ${clientBuildDir}, but none was found.`);
  process.exit(1);
}

console.log(`\n> publishing ${clientBuildDir} -> ${serverPublicDir}`);
fs.rmSync(serverPublicDir, { recursive: true, force: true });
fs.cpSync(clientBuildDir, serverPublicDir, { recursive: true });

const js = fs
  .readdirSync(path.join(serverPublicDir, 'static', 'js'))
  .filter((f) => /^main\..*\.chunk\.js$/.test(f));
console.log(`\nDone. server/public now holds: ${js.join(', ') || '(no main chunk found?)'}`);
