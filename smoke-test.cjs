#!/usr/bin/env node
const http = require('http');

/**
 * @param {string} url
 * @param {number} timeout
 * @returns {Promise<{statusCode:number, body:string}>}
 */
function fetchRaw(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: Number(res.statusCode || 0), body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(new Error('timeout')); });
  });
}

async function run() {
  try {
    console.log('[smoke] Checking Flask /_debug_info...');
    const dbg = await fetchRaw('http://127.0.0.1:5501/_debug_info');
    if (dbg.statusCode !== 200) throw new Error('/_debug_info returned status ' + dbg.statusCode);
    let dbgJson = null;
    try { dbgJson = JSON.parse(dbg.body); } catch (e) { throw new Error('Failed to parse JSON from /_debug_info'); }
    if (!dbgJson.index_exists) throw new Error('index_exists is false in /_debug_info');

    console.log('[smoke] Checking proxied /api/devices via Node...');
    const dev = await fetchRaw('http://127.0.0.1:5500/api/devices');
    if (dev.statusCode !== 200) throw new Error('/api/devices returned status ' + dev.statusCode);
    let devJson = null;
    try { devJson = JSON.parse(dev.body); } catch (e) { throw new Error('Failed to parse JSON from /api/devices'); }
    // Allow both array or object with value/Count (older formats)
    const hasDevices = Array.isArray(devJson) ? devJson.length > 0 : (Array.isArray(devJson.value) ? devJson.value.length > 0 : (devJson.Count && devJson.Count > 0));
    if (!hasDevices) throw new Error('No devices found in /api/devices response');

    console.log('[smoke] OK — endpoints healthy');
    process.exit(0);
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
    console.error('[smoke] FAILED:', msg);
    process.exit(1);
  }
}

run();
