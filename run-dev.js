#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const repoRoot = path.resolve(__dirname);
const backendDir = path.join(repoRoot, 'react-app', 'backend');
const venvPyWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const venvPyNix = path.join(backendDir, '.venv', 'bin', 'python');

/**
 * Generic logger
 * @param {...any} args
 */
function log(...args) { console.log('[run-dev]', ...args); }

function ensureVenv() {
  let venvPy = fs.existsSync(venvPyWin) ? venvPyWin : (fs.existsSync(venvPyNix) ? venvPyNix : null);
  if (venvPy) {
    log('Using existing virtualenv:', venvPy);
    return venvPy;
  }

  log('Creating virtualenv in', path.join(backendDir, '.venv'));
  const p = spawnSync('python', ['-m', 'venv', '.venv'], { cwd: backendDir, stdio: 'inherit' });
  if (p.status !== 0) {
    throw new Error('Failed to create virtualenv (python -m venv .venv). Make sure Python is installed and in PATH.');
  }

  // pick python path
  venvPy = fs.existsSync(venvPyWin) ? venvPyWin : venvPyNix;
  if (!venvPy) throw new Error('Virtualenv created but python executable not found');

  log('Upgrading pip and installing backend requirements...');
  const pipRes = spawnSync(venvPy, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: backendDir, stdio: 'inherit' });
  if (pipRes.status !== 0) throw new Error('pip upgrade failed');
  const reqFile = path.join(backendDir, 'requirements.txt');
  if (fs.existsSync(reqFile)) {
    const ins = spawnSync(venvPy, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: backendDir, stdio: 'inherit' });
    if (ins.status !== 0) throw new Error('Failed to install backend requirements');
  }

  return venvPy;
}

/**
 * Start child processes for Node and Flask
 * @param {string} venvPy - path to the python executable inside the virtualenv
 */
function startProcesses(venvPy) {
  // Start Flask using venv python
  log('Starting Flask backend using', venvPy);
  const flask = spawn(venvPy, ['app.py'], { cwd: backendDir, stdio: 'inherit' });

  // Wait for Flask port to be ready before starting Node proxy
  const FLASK_HOST = '127.0.0.1';
  const FLASK_PORT = 5501;

  /** @type {import('child_process').ChildProcess|null} */
  let nodemon = null;
  waitForPort(FLASK_HOST, FLASK_PORT, 15000)
    .then(() => {
      log(`Flask is ready at ${FLASK_HOST}:${FLASK_PORT} — starting Node server (nodemon if available)...`);
      // Start nodemon (or node) for server.js
      nodemon = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['nodemon', 'server.js', '--ext', 'js,env'], { cwd: repoRoot, stdio: 'inherit', shell: false });

      // After a short delay, run a smoke-test against /api/auth-status
      setTimeout(() => {
        smokeTestApi(`http://${FLASK_HOST}:${FLASK_PORT}/api/auth-status`)
          .then(res => log('Smoke test passed:', res))
          .catch(err => console.warn('Smoke test failed:', err));
      }, 1200);

      function shutdown() {
        log('Shutting down children...');
        try { if (nodemon !== null) nodemon.kill(); } catch (e) {}
        try { flask.kill(); } catch (e) {}
        process.exit(0);
      }

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch(err => {
      console.error('[run-dev] Flask did not become ready in time:', err.message || err);
      try { flask.kill(); } catch (e) {}
      process.exit(1);
    });

  function shutdown() {
    log('Shutting down children...');
        try { if (typeof nodemon !== 'undefined' && nodemon !== null) nodemon.kill(); } catch (e) {}
    try { flask.kill(); } catch (e) {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Wait for TCP port to accept connections.
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForPort(host, port, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      const s = net.createConnection(port, host);
      let settled = false;
      s.on('connect', () => {
        settled = true;
        s.destroy();
        resolve();
      });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) {
          if (!settled) reject(new Error('timeout'));
          return;
        }
        setTimeout(attempt, 300);
      });
    })();
  });
}

/**
 * Simple HTTP GET smoke test returning parsed JSON or status
 */
/**
 * @param {string} url
 * @returns {Promise<{statusCode:number,body:any}>}
 */
function smokeTestApi(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
  try { resolve({ statusCode: Number(res.statusCode || 0), body: JSON.parse(body) }); }
  catch (e) { resolve({ statusCode: Number(res.statusCode || 0), body }); }
      });
    }).on('error', reject);
  });
}

try {
  const venvPy = ensureVenv();
  startProcesses(venvPy);
} catch (err) {
  // err may be unknown; stringify safely
  const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
  console.error('[run-dev] Error:', msg);
  process.exit(1);
}
