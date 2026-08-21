#!/usr/bin/env node
/*
 * Runs `npm start` inside client/ with the same OpenSSL legacy-provider flag
 * scripts/build.js already sets for production builds.
 *
 * react-scripts 3.x ships webpack 4, whose module hashing uses an MD4 digest
 * that Node 17+'s default OpenSSL 3 provider refuses -- "error:0308010C:
 * digital envelope routines::unsupported". `npm run build` never hit this
 * because build.js sets the flag itself, but `npm run dev` (-> start:client
 * -> `npm start --prefix client` -> react-scripts start) called react-scripts
 * directly with no flag at all, so it broke immediately on any Node from 17
 * up -- Node 18, the version this project is pinned to, included. A plain
 * `"start:client": "npm start --prefix client"` script has no cross-platform
 * way to set an env var inline, hence a small script instead of a one-liner.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const result = spawnSync('npm', ['start'], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: `--openssl-legacy-provider ${process.env.NODE_OPTIONS || ''}`.trim(),
  },
});

process.exit(result.status === null ? 1 : result.status);
