#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const repoRoot = path.resolve(__dirname);
const backendDir = path.join(repoRoot, 'react-app', 'backend');
const venvDir = path.join(backendDir, '.venv');
const venvPyWin = path.join(venvDir, 'Scripts', 'python.exe');
const venvPyNix = path.join(venvDir, 'bin', 'python');

/**
 * Generic logger
 * @param {...any} args
 */
function log(...args) {
  console.log('[run-dev]', ...args);
}

function tryRun(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, stdio: 'ignore' });
}

function resolvePythonLauncher() {
  const pyLauncher = tryRun('py', ['-3', '-V'], backendDir);
  if (pyLauncher.status === 0) return { cmd: 'py', args: ['-3'] };

  const python = tryRun('python', ['-V'], backendDir);
  if (python.status === 0) return { cmd: 'python', args: [] };

  throw new Error('Python is not available. Install Python 3 and ensure `py` or `python` is in PATH.');
}

function isWorkingPython(exePath) {
  if (!exePath || !fs.existsSync(exePath)) return false;
  const result = tryRun(exePath, ['-V'], backendDir);
  return result.status === 0;
}

function hasBackendDeps(venvPy) {
  const check = tryRun(venvPy, ['-c', 'import flask, flask_cors'], backendDir);
  return check.status === 0;
}

function installBackendRequirements(venvPy) {
  const reqFile = path.join(backendDir, 'requirements.txt');
  if (!fs.existsSync(reqFile)) return;
  const installRes = spawnSync(venvPy, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: backendDir, stdio: 'inherit' });
  if (installRes.status !== 0) {
    throw new Error('Failed to install backend requirements');
  }
}

function createAndInstallVenv() {
  const launcher = resolvePythonLauncher();
  const launcherDisplay = [launcher.cmd, ...launcher.args].join(' ');
  log('Creating virtualenv in', venvDir, 'using', launcherDisplay);

  const createRes = spawnSync(launcher.cmd, [...launcher.args, '-m', 'venv', '.venv'], { cwd: backendDir, stdio: 'inherit' });
  if (createRes.status !== 0) {
    throw new Error('Failed to create virtualenv. Make sure Python 3 is installed and available in PATH.');
  }

  const venvPy = fs.existsSync(venvPyWin) ? venvPyWin : venvPyNix;
  if (!venvPy || !isWorkingPython(venvPy)) {
    throw new Error('Virtualenv created but python executable is not usable.');
  }

  log('Upgrading pip and installing backend requirements...');
  const pipRes = spawnSync(venvPy, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: backendDir, stdio: 'inherit' });
  if (pipRes.status !== 0) {
    log('pip upgrade failed, continuing with existing pip...');
  }

  installBackendRequirements(venvPy);

  return venvPy;
}

function ensureVenv() {
  const existingVenvPy = fs.existsSync(venvPyWin) ? venvPyWin : (fs.existsSync(venvPyNix) ? venvPyNix : null);
  if (isWorkingPython(existingVenvPy)) {
    log('Using existing virtualenv:', existingVenvPy);
    if (!hasBackendDeps(existingVenvPy)) {
      log('Missing backend Python dependencies. Installing requirements...');
      installBackendRequirements(existingVenvPy);
    }
    return existingVenvPy;
  }

  if (existingVenvPy || fs.existsSync(venvDir)) {
    log('Detected broken virtualenv. Recreating .venv...');
    fs.rmSync(venvDir, { recursive: true, force: true });
  }

  return createAndInstallVenv();
}

/**
 * Start child processes for Node and Flask
 * @param {string} venvPy - path to the python executable inside the virtualenv
 */
function startProcesses(venvPy) {
  log('Starting Flask backend using', venvPy);
  const flask = spawn(venvPy, ['app.py'], { cwd: backendDir, stdio: 'inherit' });

  const FLASK_HOST = '127.0.0.1';
  const FLASK_PORT = 5501;

  /** @type {import('child_process').ChildProcess | null} */
  let nodemon = null;
  waitForPort(FLASK_HOST, FLASK_PORT, 15000)
    .then(() => {
      log(`Flask is ready at ${FLASK_HOST}:${FLASK_PORT} - starting Node gateway...`);
      nodemon = spawn(process.execPath, ['server.js'], {
        cwd: repoRoot,
        stdio: 'pipe',
        shell: false
      });
      if (nodemon.stdout) nodemon.stdout.on('data', (d) => process.stdout.write(d));
      if (nodemon.stderr) nodemon.stderr.on('data', (d) => process.stderr.write(d));
      nodemon.on('error', (err) => {
        console.error('[run-dev] Failed to start Node gateway:', err.message || err);
      });

      setTimeout(() => {
        smokeTestApi(`http://${FLASK_HOST}:${FLASK_PORT}/api/auth-status`)
          .then((res) => log('Smoke test passed:', res))
          .catch((err) => console.warn('Smoke test failed:', err));
      }, 1200);

      function shutdown() {
        log('Shutting down children...');
        try { if (nodemon !== null) nodemon.kill(); } catch (_) {}
        try { flask.kill(); } catch (_) {}
        process.exit(0);
      }

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((err) => {
      console.error('[run-dev] Flask did not become ready in time:', err.message || err);
      try { flask.kill(); } catch (_) {}
      process.exit(1);
    });

  process.on('SIGINT', () => {
    try { if (nodemon !== null) nodemon.kill(); } catch (_) {}
  });
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
 * @param {string} url
 * @returns {Promise<{statusCode:number,body:any}>}
 */
function smokeTestApi(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
          resolve({ statusCode: Number(res.statusCode || 0), body: JSON.parse(body) });
        } catch (_) {
          resolve({ statusCode: Number(res.statusCode || 0), body });
        }
      });
    }).on('error', reject);
  });
}

try {
  const venvPy = ensureVenv();
  startProcesses(venvPy);
} catch (err) {
  const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
  console.error('[run-dev] Error:', msg);
  process.exit(1);
}
