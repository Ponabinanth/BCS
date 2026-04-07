// @ts-nocheck
/* ============================================
   SecureChain — main.js (vanilla JS, advanced)
   Wires up: theme, console, explorer, scans,
   IoT register, NFT verify, analytics chart,
   mini threat map, wallet, contact form.
   ============================================ */

/* ---------------- Utilities ---------------- */
/* --------------- Expose globals for inline handlers --------------- */
window.toggleTheme = toggleTheme;
window.runThreatScan = runThreatScan;
window.uploadFile = uploadFile;
window.registerIoT = registerIoT;
window.verifyNFT = verifyNFT;
window.showAnalytics = showAnalytics;
window.connectWallet = connectWallet;
window.explore = explore;
window.runConsole = runConsole;
// ⭐ NEW LOGIN/PROFILE FUNCTION EXPOSURES ⭐
window.logout = logout;
window.showProfile = showProfile;
window.openAuth = openAuth;
window.handleAuthSubmit = handleAuthSubmit;
window.showAuth = showAuth;
window.updateAuthUI = updateAuthUI;
window.isUserLoggedIn = isUserLoggedIn;
window.openSystemStatusModal = openSystemStatusModal;
window.closeSystemStatusModal = closeSystemStatusModal;
window.scanUrl = scanUrl;
window.startThreatScan = startThreatScan;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ls = {
  get: (k, d = null) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k),
};

const state = {
  nftRegistry: ls.get("sc_nft_registry", {
    "0xCERT-001": { owner: "Alice", purpose: "Degree" },
    "0xCERT-002": { owner: "Bob", purpose: "Company ID" },
    "0xCERT-003": { owner: "Charlie", purpose: "License" },
  }),
  blocks: ls.get("sc_blocks", [
    { height: 1001, hash: "0xabc123", txs: 12, time: Date.now() - 86400000 },
  ]),
  theme: ls.get("sc_theme", "dark"),
  threats: [
    { type: 'DDoS', severity: 'high', location: { x: 100, y: 150 }, description: 'High volume attack detected' },
    { type: 'Malware', severity: 'medium', location: { x: 300, y: 200 }, description: 'Suspicious file upload' },
    { type: 'Phishing', severity: 'low', location: { x: 500, y: 100 }, description: 'Fake login attempt' },
    { type: 'VULN', severity: 'high', location: { x: 200, y: 300 }, description: 'Exploitable CVE found' },
  ],
};

/* Persist any state mutation */
const persist = () => {
  ls.set("sc_nft_registry", state.nftRegistry);
  ls.set("sc_blocks", state.blocks);
};

if (Array.isArray(state.blocks) && state.blocks.length > 1) {
  state.blocks = [state.blocks.at(-1)];
  persist();
}

/* --------------- AUTHENTICATION & UI STATUS (NEW) --------------- */

/**
 * Checks if a user is logged in by looking for a token in localStorage.
 * @returns {boolean} True if logged in, false otherwise.
 */
function isUserLoggedIn() {
  return !!ls.get('access_token');
}

/**
 * Updates the Navbar's authentication button based on login status.
 */
function updateAuthUI() {
  const authActions = document.getElementById('authActions');
  if (!authActions) return;

  const token = localStorage.getItem('access_token');
  const username = localStorage.getItem('username');

  if (token) {
    // User is logged in
    authActions.innerHTML = `
      <button class="fax" id="themeToggle" onclick="toggleTheme()">🌙</button>
      <span style="color: white; margin-right: 15px;">Welcome, ${username || 'User'}</span>
      <button onclick="logout()" style="background-color: #ff4d4d;">Logout</button>
    `;
  } else {
    // User is logged out
    authActions.innerHTML = `
      <button class="fax" id="themeToggle" onclick="toggleTheme()">🌙</button>
      <button onclick="openAuth()">Login / Sign Up</button>
    `;
  }
}

/**
 * Logs the user out, clears the token, and redirects to the login page.
 */
async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    ls.remove('access_token');
    ls.remove('username');
    ls.remove('user_email');
    alert('You have been logged out.');
    updateAuthUI();
  } catch (error) {
    console.error('Logout error:', error);
    // Fallback: clear local storage even if API call fails
    ls.remove('access_token');
    ls.remove('username');
    ls.remove('user_email');
    updateAuthUI();
    alert('Logged out successfully.');
  }
}

/**
 * Placeholder for showing a user profile (can be expanded later).
 */
function showProfile() {
  if (isUserLoggedIn()) {
    alert('User Profile:\nStatus: Logged In\nEmail: ' + (ls.get('user_email') || 'N/A'));
  } else {
    alert('You must be logged in to view the profile.');
    openAuth();
  }
}

/* --------------- Theme Toggle --------------- */
function applyTheme() {
  document.body.classList.toggle("dark-mode", state.theme === "dark");
  document.body.classList.toggle("light-mode", state.theme === "light");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = state.theme === "dark" ? "🌙" : "☀";
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  ls.set("sc_theme", state.theme);
  applyTheme();
}

/* --------------- System Status Modal --------------- */
function openSystemStatusModal() {
  const modal = document.getElementById('statusModal');
  const content = document.getElementById('systemStatusContent');
  if (!modal || !content) return;

  modal.style.display = 'block';
  content.innerHTML = '<p style="color:#fff;"><strong>Initiating system check...</strong></p>';

  // Simulated Check Process
  const services = [
    { name: 'AI Threat Engine', delay: 1500, status: 'Operational', color: '#00e666' },
    { name: 'Blockchain Ledger Sync', delay: 2800, status: 'Operational', color: '#00e666' },
    { name: 'IoT Registrar', delay: 4000, status: 'Degraded', color: '#ffae42' },
    { name: 'Quantum Encryption Module', delay: 5000, status: 'Operational', color: '#00e666' }
  ];

  let log = '';

  function updateStatus(index) {
    if (index >= services.length) {
      log += '<br><strong style="color: #00f2fe;">[FINAL] All checks complete.</strong>';
      content.innerHTML = log;
      return;
    }

    const service = services[index];
    const startTime = Date.now();

    log = log.substring(0, log.lastIndexOf('<p')) + `<p style="color:#fff; margin-bottom: 5px;">Checking ${service.name}...</p>`;
    content.innerHTML = log;

    setTimeout(() => {
      const statusText = service.status === 'Degraded' ? `⚠️ <strong>${service.status}</strong>` : `✅ <strong>${service.status}</strong>`;
      log = log.substring(0, log.lastIndexOf('<p')) + `<p style="color:${service.color}; margin-bottom: 5px;">${statusText} ${service.name} (${(Date.now() - startTime) / 1000}s)</p>`;
      content.innerHTML = log;
      updateStatus(index + 1);
    }, service.delay - (index > 0 ? services[index - 1].delay : 0));
  }

  updateStatus(0);
}

function closeSystemStatusModal() {
  const modal = document.getElementById('statusModal');
  if (modal) modal.style.display = 'none';
}

/* --------------- Threat Scan Function --------------- */
function startThreatScan() {
  const inputEl = document.getElementById('threatInput');
  const statusEl = document.getElementById('scanStatus');
  const resultEl = document.getElementById('scanResult');
  const animationEl = document.getElementById('scanAnimation')?.parentElement;
  const buttonEl = document.getElementById('scanButton');

  if (!inputEl || !statusEl || !resultEl || !buttonEl) return;

  const value = inputEl.value.trim();

  // 1. Input Validation
  if (!value) {
    statusEl.textContent = 'Please enter a value to scan.';
    statusEl.style.color = '#ffae42';
    resultEl.textContent = '';
    resultEl.className = 'result-box';
    return;
  }

  // 2. Start Animation and UI update
  buttonEl.disabled = true;
  buttonEl.textContent = 'Scanning...';
  statusEl.textContent = `Scanning: ${value}`;
  statusEl.style.color = '#00f2fe';
  resultEl.textContent = 'Running deep AI analysis...';
  if (animationEl) animationEl.classList.add('scanning');

  // 3. Simulate Scan Logic (waits 3 seconds)
  setTimeout(() => {
    // Stop animation and restore button
    if (animationEl) animationEl.classList.remove('scanning');
    buttonEl.disabled = false;
    buttonEl.textContent = 'Start Scan';

    let scanResult;
    let resultClass;
    let scanTime = (Math.random() * 2 + 1).toFixed(2);

    // Simple Threat Logic
    const isMalicious = value.toLowerCase().includes('malware') || value.toLowerCase().includes('phish') || value.toLowerCase().includes('bad.site');
    const isSuspicious = value.toLowerCase().includes('dev') || value.toLowerCase().includes('temp') || value.length > 50;

    if (isMalicious) {
      scanResult = `⛔ MALICIOUS THREAT DETECTED. Action: BLOCK. (Time: ${scanTime}s)`;
      resultClass = 'result-malicious';
      statusEl.textContent = 'Threat Detected!';
      statusEl.style.color = '#ff4d4d';
    } else if (isSuspicious) {
      scanResult = `⚠️ SUSPICIOUS ACTIVITY. Action: MONITOR. (Time: ${scanTime}s)`;
      resultClass = 'result-suspicious';
      statusEl.textContent = 'Suspicious Flagged.';
      statusEl.style.color = '#ffae42';
    } else {
      scanResult = `✅ NO THREATS DETECTED. System Clear. (Time: ${scanTime}s)`;
      resultClass = 'result-safe';
      statusEl.textContent = 'Scan Complete.';
      statusEl.style.color = '#00e6e6';
    }

    // 4. Display Result
    resultEl.textContent = scanResult;
    resultEl.className = 'result-box ' + resultClass;

  }, 3000);
}

/* --------------- Mini Threat Map --------------- */
function renderThreatMap() {
  const container = $("#threatMapContainer") || $("#map");
  if (!container) return;
  const W = container.clientWidth || 700;
  const H = container.clientHeight || 250;

  const worldMap = `
    <svg width="${W}" height="${H}" viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .threat-marker { animation: pulse 2s infinite; }
          @keyframes pulse { 0% { r: 3; opacity: 1; } 50% { r: 6; opacity: 0.5; } 100% { r: 3; opacity: 1; } }
        </style>
      </defs>
      <path d="M 100 200 Q 150 150 200 200 T 300 200 Q 350 250 400 200 T 500 200 Q 550 150 600 200 T 700 200 Q 750 250 800 200 T 900 200 L 900 300 Q 850 350 800 300 T 700 300 Q 650 350 600 300 T 500 300 Q 450 250 400 300 T 300 300 Q 250 350 200 300 T 100 300 Z" fill="none" stroke="#00f5ff" stroke-width="2"/>
      ${state.threats.map(t => {
    let color = '#00ffe0';
    if (t.severity === 'high') color = '#ff4444';
    else if (t.severity === 'medium') color = '#ffaa44';
    return `<circle class="threat-marker" cx="${t.location.x}" cy="${t.location.y}" r="3" fill="${color}" title="${t.type}: ${t.description}"/>`;
  }).join('')}
    </svg>
  `;

  container.innerHTML = worldMap;
}

/* --------------- Threat Map Charts --------------- */
function initThreatMapCharts() {
  const liveChartCanvas = document.getElementById('liveThreatChart');
  const severityChartCanvas = document.getElementById('severityChart');

  if (liveChartCanvas && typeof Chart !== 'undefined') {
    const liveCtx = liveChartCanvas.getContext('2d');
    const liveChart = new Chart(liveCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Live Threats',
          data: [],
          borderColor: '#00ffe0',
          backgroundColor: 'rgba(0, 255, 224, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { type: 'time', time: { unit: 'second' } },
          y: { beginAtZero: true }
        }
      }
    });

    setInterval(() => {
      const now = new Date();
      liveChart.data.labels.push(now);
      liveChart.data.datasets[0].data.push(Math.floor(Math.random() * 10));
      if (liveChart.data.labels.length > 20) {
        liveChart.data.labels.shift();
        liveChart.data.datasets[0].data.shift();
      }
      liveChart.update();
    }, 5000);
  }

  if (severityChartCanvas && typeof Chart !== 'undefined') {
    const severityCtx = severityChartCanvas.getContext('2d');
    const severityCounts = { high: 0, medium: 0, low: 0 };
    state.threats.forEach(t => severityCounts[t.severity]++);
    const severityChart = new Chart(severityCtx, {
      type: 'pie',
      data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          data: [severityCounts.high, severityCounts.medium, severityCounts.low],
          backgroundColor: ['#ff4444', '#ffaa44', '#00ffe0']
        }]
      },
      options: {
        responsive: true
      }
    });
  }
}

/* --------------- Analytics Chart (SVG) --------------- */
function getAnalyticsChartHost() {
  const existingChart = document.getElementById("securityChart") || document.getElementById("deviceChart");
  if (existingChart) return existingChart;

  const analyticsContainer = document.getElementById("analytics-container");
  if (!analyticsContainer) return null;

  analyticsContainer.style.display = "block";
  let deviceChart = document.getElementById("deviceChart");
  if (!deviceChart) {
    deviceChart = document.createElement("div");
    deviceChart.id = "deviceChart";
    deviceChart.style.margin = "16px auto";
    deviceChart.style.width = "250px";
    deviceChart.style.height = "100px";
    analyticsContainer.appendChild(deviceChart);
  }
  return deviceChart;
}

function updateAnalytics() {
  const chart = getAnalyticsChartHost();
  if (!chart) return false;
  const data = [10, 20, 15, 30, 25];
  const max = Math.max(...data);
  const bars = data.map((d, i) => `<rect x="${i * 50}" y="${100 - (d / max) * 100}" width="40" height="${(d / max) * 100}" fill="#00ffe0" />`);
  chart.innerHTML = `<svg width="250" height="100">${bars.join('')}</svg>`;
  return true;
}

function showAnalytics() {
  updateAnalytics();
  const chart = document.getElementById("securityChart")
    || document.getElementById("deviceChart")
    || document.getElementById("analyticsTable")
    || document.getElementById("analytics-container");
  if (chart) {
    chart.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    console.warn("Analytics chart container not found on page.");
  }
}

/* --------------- Explorer --------------- */
function explore() {
  const input = $("#explorerInput");
  const out = $("#explorerResult");
  if (!input || !out) return;

  const q = input.value.trim();
  if (!q) {
    out.textContent = "Enter address or block hash/height.";
    return;
  }

  let result = null;
  if (/^\d+$/.test(q)) {
    const height = Number(q);
    result = state.blocks.find(b => b.height === height);
    out.textContent = result
      ? `Block #${result.height}\nHash: ${result.hash}\nTxs: ${result.txs}\nTime: ${new Date(result.time).toLocaleString()}`
      : "Block not found.";
  } else if (/^0x/i.test(q)) {
    const byHash = state.blocks.find(b => b.hash.toLowerCase() === q.toLowerCase());
    out.textContent = byHash
      ? `Block ${byHash.hash}\nHeight: ${byHash.height}\nTxs: ${byHash.txs}\nTime: ${new Date(byHash.time).toLocaleString()}`
      : `Address/Cert lookup for ${q}\nBalance: ${(Math.random() * 1.2).toFixed(3)} ETH\nTx Count: ${Math.floor(Math.random() * 50)}`;
  } else {
    out.textContent = `Query: ${q}\nNo exact match - showing heuristic profile.\nReputation: GOOD\nLast Seen: ${new Date().toLocaleString()}`;
  }
}

/* --------------- Threat Scan --------------- */
async function runThreatScan() {
  const boxId = "threatScanResults";
  let box = $("#" + boxId);
  if (!box) {
    const host = $("#services") || document.body;
    box = document.createElement("div");
    box.id = boxId;
    box.style.cssText = "background:#0f172a; border:1px solid #334155; padding:15px; border-radius:6px; margin-top:15px; font-family:monospace; color:#e2e8f0;";
    host.appendChild(box);
  }
  box.textContent = "Initializing scanner...";
  await sleep(800);
  box.textContent = "Scanning network interfaces .";
  await sleep(400);
  box.textContent = "Scanning network interfaces ..";
  await sleep(400);
  box.textContent = "Scanning network interfaces ...";
  await sleep(400);
  const findings = [
    { id: "A-124", sev: "LOW", msg: "Open port 8080", risk: "Low", type: "Port Exposure", solution: "Close unnecessary ports or use firewall rules." },
    { id: "B-317", sev: "MED", msg: "Weak cipher suite detected", risk: "Medium", type: "Encryption Weakness", solution: "Upgrade to stronger cipher suites like AES-256." },
    { id: "Z-901", sev: "HIGH", msg: "Suspicious outbound traffic", risk: "High", type: "Potential Malware", solution: "Run antivirus scan and monitor network traffic." },
  ];
  box.innerHTML =
    "<strong>✅ Scan complete</strong><br>" +
    findings.map(f => `<div style="margin:5px 0;"><strong>[${f.sev}] ${f.id} - ${f.msg}</strong><br>Risk: ${f.risk}<br>Type: ${f.type}<br>Solution: ${f.solution}</div>`).join("");
}

/* --------------- File Upload --------------- */
function uploadFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "/";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const box = $("#threatScanResults") || $("#analyticsChart") || document.body;
    const info = document.createElement("div");
    info.className = "glow-box fade-in show";
    info.textContent = `Uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)\nHash: 0x${(Math.random() * 1e16).toString(16)}`;
    box.appendChild(info);
  };
  input.click();
}

/* --------------- IoT Register --------------- */
function registerIoT() {
  const deviceId = document.getElementById("deviceId");
  const deviceName = document.getElementById("deviceName");
  const deviceType = document.getElementById("deviceType");

  if (!deviceId || !deviceName || !deviceType) {
    window.location.href = "registeriot.html";
    return;
  }

  if (deviceId.value.trim() === "" || deviceName.value.trim() === "" || deviceType.value === "") {
    alert("Please fill in all fields before registering!");
    return;
  }

  alert(
    "✅ IoT Device Registered Successfully!\n\n" +
    "Device ID: " + deviceId.value + "\n" +
    "Device Name: " + deviceName.value + "\n" +
    "Device Type: " + deviceType.value
  );

  deviceId.value = "";
  deviceName.value = "";
  deviceType.value = "";
}

// Sample NFT Data
const nftDatabase = [
  { id: "NFT-1001", owner: "0x12345ABCDE67890" },
  { id: "NFT-1002", owner: "0x98765FEDCB43210" },
  { id: "NFT-1003", owner: "0xABCDEF123456789" }
];

/* --------------- NFT Verify --------------- */
function verifyNFT() {
  const nftId = document.getElementById("nftId");
  const nftOwner = document.getElementById("nftOwner");

  if (!nftId || !nftOwner) {
    window.location.href = "verifynft.html";
    return;
  }

  if (nftId.value.trim() === "" || nftOwner.value.trim() === "") {
    alert("Please fill in both fields before verifying!");
    return;
  }

  const nft = nftDatabase.find(item => item.id === nftId.value.trim());

  if (nft) {
    if (nft.owner.toLowerCase() === nftOwner.value.trim().toLowerCase()) {
      alert(`✅ NFT Verified!\n\nNFT ID: ${nft.id}\nOwner: ${nft.owner}`);
    } else {
      alert(`⚠️ NFT Found but Owner Address does not match!\nExpected: ${nft.owner}`);
    }
  } else {
    alert("❌ NFT Not Found in the Database!");
  }

  nftId.value = "";
  nftOwner.value = "";
}

/* --------------- Wallet Connect --------------- */
/* --------------- Wallet Connect (Real w/ Ethers.js) --------------- */
async function connectWallet() {
  const box = $("#explorerResult") || $("#threatScanResults") || $("#consoleOutput");

  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Update UI
      if (box) box.textContent = `Wallet Connected: ${account}`;
      else alert(`Wallet Connected: ${account}`);

      // Store in localStorage for persistence
      ls.set('wallet_address', account);

      // Optional: Initialize Ethers provider
      // const provider = new ethers.BrowserProvider(window.ethereum);
      // const signer = await provider.getSigner();

      return account;
    } catch (error) {
      console.error("User denied account access", error);
      alert("Connection failed: " + error.message);
    }
  } else {
    window.location.href = "connectwallet.html";
    // Fallback to simulation for demo purposes if desired, or just error out.
    // const mock = "0x" + Math.random().toString(16).slice(2).padStart(40, "0");
    // if (box) box.textContent = `(Sim) Wallet Connected: ${mock}`;
  }
}

/* --------------- Console --------------- */
(function initConsole() {
  const out = $("#consoleOutput");
  if (!out) return;
  out.classList.add("fade-in", "show");
  out.textContent = "SecureChain Console Ready. Type 'help'.";
})();

function logConsole(msg) {
  const out = $("#consoleOutput");
  if (!out) return;
  out.classList.add("fade-in", "show");
  out.textContent = (out.textContent ? out.textContent + "\n" : "") + msg;
}

/* --------------- Contract Interaction --------------- */
let nftContract;

async function initContract() {
  if (typeof window.ethereum !== 'undefined' && ls.get('wallet_address')) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Load ABI
      const response = await fetch('/contracts/SecureChainNFT.json');
      const data = await response.json();

      const address = localStorage.getItem('securechain_contract') || "0xYourContractAddressHere"; // Prioritize deployed address

      if (address === "0xYourContractAddressHere") {
        console.log("Contract address not set. Visit /deploy.html to deploy one.");
      }

      nftContract = new ethers.Contract(address, data.abi, signer);
      console.log("Contract initialized at:", address);
    } catch (e) {
      console.error("Failed to init contract:", e);
    }
  }
}

// Call init on load
window.addEventListener('load', initContract);

async function runConsole() {
  const inp = $("#consoleInput");
  if (!inp) return;
  const cmd = inp.value.trim();
  if (!cmd) return;
  logConsole("> " + cmd);

  const [c, ...rest] = cmd.toLowerCase().split(/\s+/);
  switch (c) {
    case "help":
      logConsole("Commands: help, scan, wallet, block, clear, time, theme, explore <q>, register <name> <type>, nft <tokenId>, mint <id> <purpose>");
      break;
    case "scan":
      await runThreatScan();
      logConsole("Scan complete.");
      break;
    case "wallet":
      await connectWallet();
      await initContract(); // Re-init after connect
      break;
    case "mint": {
      if (!nftContract) { logConsole("Error: Wallet not connected or contract not loaded."); break; }
      const id = rest[0];
      const purpose = rest.slice(1).join(" ");
      if (!id || !purpose) { logConsole("Usage: mint <id> <purpose>"); break; }
      try {
        logConsole("Minting NFT... confirm in wallet.");
        const tx = await nftContract.mintNFT(id, "https://securechain.io/metadata/" + id, purpose);
        logConsole("Tx sent: " + tx.hash);
        await tx.wait();
        logConsole("Minted successfully!");
      } catch (e) {
        logConsole("Mint failed: " + e.message);
      }
      break;
    }
    case "block": {
      const next = {
        height: (state.blocks.at(-1)?.height || 1000) + 1,
        hash: "0x" + Math.random().toString(16).slice(2, 8),
        txs: Math.floor(Math.random() * 25) + 1,
        time: Date.now(),
      };
      state.blocks = [next]; persist();
      logConsole(`New block #${next.height} (${next.hash})`);
      break;
    }
    case "clear":
      $("#consoleOutput").textContent = "";
      break;
    case "time":
      logConsole(new Date().toString());
      break;
    case "theme":
      toggleTheme();
      logConsole(`Theme: ${state.theme}`);
      break;
    case "explore":
      $("#explorerInput") && ($("#explorerInput").value = rest.join(" "));
      explore();
      break;
    case "register": {
      const name = rest[0], type = rest[1];
      if (!name || !type) { logConsole("Usage: register <name> <type>"); break; }
      $("#deviceName") && ($("#deviceName").value = name);
      $("#deviceType") && ($("#deviceType").value = type);
      registerIoT();
      logConsole(`Registered ${name} (${type})`);
      break;
    }
    case "nft": {
      const token = rest[0];
      if (!token) { logConsole("Usage: nft <tokenId>"); break; }
      $("#nftTokenId") && ($("#nftTokenId").value = token);
      verifyNFT();
      break;
    }
    default:
      logConsole("Unknown command. Type 'help'.");
  }
  inp.value = "";
}

/* --------------- Contact Form --------------- */
(function wireContactForm() {
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (!form || !status) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";
    await sleep(700);
    const data = Object.fromEntries(new FormData(form).entries());
    status.textContent = `Message queued. Thanks, ${data.name}!`;
    form.reset();
  });
})();

/* --------------- AUTH MODAL LOGIC --------------- */

const loginTemplate = `
    <h2 style="color:#fff;" id="authTitle">User Login</h2>
    <form id="authForm" data-mode="login">
        <input type="email" placeholder="Email" required name="email" style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
        <input type="password" placeholder="Password" required name="password" style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
        <button type="submit" style="width:100%; margin-top:16px; padding:10px; border-radius:8px; border:none; background:linear-gradient(90deg,#00f2fe,#4facfe); color:#fff; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 0 8px #00f2fe;">Login</button>
    </form>
    <p style="font-size: 0.9em; margin-top: 20px; color: #a0a0a0;">
        Don't have an account? <a href="#" onclick="showAuth('signup')" style="color:#00f2fe; text-decoration:none; font-weight:bold;">Sign Up</a>
    </p>
`;

const signupTemplate = `
    <h2 style="color:#fff;" id="authTitle">Create Account</h2>
    <form id="authForm" data-mode="signup">
        <input type="text" placeholder="Username (Optional)" name="username" style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
        <input type="email" placeholder="Email" required name="email" style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
        <input type="password" placeholder="Password" required name="password" style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
        <button type="submit" style="width:100%; margin-top:16px; padding:10px; border-radius:8px; border:none; background:linear-gradient(90deg,#00f2fe,#4facfe); color:#fff; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 0 8px #00f2fe;">Sign Up</button>
    </form>
     <p style="font-size: 0.9em; margin-top: 20px; color: #a0a0a0;">
        Already have an account? <a href="#" onclick="showAuth('login')" style="color:#00f2fe; text-decoration:none; font-weight:bold;">Login</a>
    </p>
`;

function openAuth() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    showAuth('login');
    authModal.style.display = 'block';
  }
}

function closeAuth() {
  const authModal = document.getElementById('authModal');
  if (authModal) authModal.style.display = 'none';
}

function showAuth(mode = 'login') {
  const authContent = document.getElementById('authContent');
  if (!authContent) return;

  authContent.innerHTML = mode === 'signup' ? signupTemplate : loginTemplate;
  const authForm = document.getElementById('authForm');
  if (authForm) authForm.onsubmit = handleAuthSubmit;

  const closeBtn = document.getElementById('closeAuth');
  if (closeBtn) closeBtn.onclick = closeAuth;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const mode = form.dataset.mode;
  const endpoint = mode === 'login' ? '/api/login' : '/api/signup';
  const body = Object.fromEntries(new FormData(form));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An unknown error occurred.');
    }

    if (mode === 'login') {
      // Store authentication data
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }
      if (data.username) {
        localStorage.setItem("username", data.username);
      }
      if (data.email) {
        localStorage.setItem("user_email", data.email);
      }

      alert('Login successful!');
      closeAuth();
      updateAuthUI();
    } else {
      alert('Signup successful! Please log in.');
      showAuth('login');
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/* --------------- URL Phishing Scan --------------- */
function scanUrl() {
  const urlInput = document.getElementById('urlInput');
  const resultEl = document.getElementById('urlResult');
  if (!urlInput || !resultEl) return;

  const url = urlInput.value.trim();

  if (!url) {
    resultEl.textContent = 'Please enter a URL.';
    resultEl.style.color = '#ffae42';
    return;
  }

  resultEl.textContent = 'Scanning...';
  resultEl.style.color = '#00e6e6';

  setTimeout(() => {
    const blacklist = ['evil.com', 'phishing.net', 'badlink.com'];
    try {
      const domain = new URL(url.startsWith('http') ? url : 'http://' + url).hostname.replace('www.', '');
      if (blacklist.includes(domain)) {
        resultEl.textContent = '⛔ MALICIOUS: Known phishing site!';
        resultEl.style.color = '#ff4d4d';
      } else if (url.includes('@') || (url.match(/\./g) || []).length > 3) {
        resultEl.textContent = '⚠️ SUSPICIOUS: URL contains unusual patterns.';
        resultEl.style.color = '#ffae42';
      } else {
        resultEl.textContent = '✅ SAFE: URL appears to be safe.';
        resultEl.style.color = '#00e6e6';
      }
    } catch (e) {
      resultEl.textContent = 'Invalid URL format.';
      resultEl.style.color = '#ff4d4d';
    }
  }, 1000);
}

/* --------------- Init on load --------------- */
function init() {
  applyTheme();
  renderThreatMap();
  showAnalytics();

  // Threatscan page specific
  if ($('#threatMapContainer')) {
    initThreatMapCharts();
    renderDevices();
    const locateBtn = $('#locateBtn');
    if (locateBtn) locateBtn.onclick = () => { const ip = $('#locateInput').value; alert('Locating ' + ip); };
    const scanBtn = $('#scanBtn');
    if (scanBtn) scanBtn.onclick = runThreatScan;
    const clearDevicesBtn = $('#clearDevicesBtn');
    if (clearDevicesBtn) clearDevicesBtn.onclick = clearDevices;
    const threatLog = $('#threatLog');
    if (threatLog) {
      threatLog.innerHTML = state.threats.map(t => `<div>${t.type} - ${t.severity} - ${t.description}</div>`).join('');
    }
  }

  // Wire buttons if present
  $("#themeToggle")?.addEventListener("click", toggleTheme);

  // Services buttons fallback bindings
  $$("#services button").forEach((btn) => {
    const t = (btn.textContent || "").toLowerCase();
    if (t.includes("scan")) btn.onclick = runThreatScan;
    if (t.includes("upload")) btn.onclick = uploadFile;
    if (t.includes("register")) btn.onclick = registerIoT;
    if (t.includes("verify")) btn.onclick = verifyNFT;
    if (t.includes("analytics") || t.includes("view")) btn.onclick = showAnalytics;
    if (t.includes("wallet") || t.includes("connect")) btn.onclick = connectWallet;
  });

  // Explorer quick-enter
  $("#explorerInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") explore();
  });

  // Console quick-enter
  $("#consoleInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runConsole();
  });

  // Re-render visuals on resize
  window.addEventListener("resize", () => {
    renderThreatMap();
    showAnalytics();
  });

  // Check auth status and update UI on load
  updateAuthUI();
}

document.addEventListener("DOMContentLoaded", init);

/* --------------- Expose globals for inline handlers (Final) --------------- */
window.toggleTheme = toggleTheme;
window.runThreatScan = runThreatScan;
window.uploadFile = uploadFile;
window.registerIoT = registerIoT;
window.verifyNFT = verifyNFT;
window.showAnalytics = showAnalytics;
window.connectWallet = connectWallet;
window.explore = explore;
window.runConsole = runConsole;
window.openAuth = openAuth;
window.showAuth = showAuth;
window.handleAuthSubmit = handleAuthSubmit;
window.logout = logout;
window.showProfile = showProfile;
window.updateAuthUI = updateAuthUI;
window.openSystemStatusModal = openSystemStatusModal;
window.closeSystemStatusModal = closeSystemStatusModal;
window.scanUrl = scanUrl;
window.startThreatScan = startThreatScan;

// Other existing exposures...
window.encryptData = encryptData;
window.aiCodeScan = aiCodeScan;
window.clearDevices = clearDevices;
window.renderDevices = renderDevices;

// ===== Analytics, Device Management, and New Service Functions =====
async function addAnalyticsRecord(device_id, action) {
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: device_id,
        action: action,
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error('Failed to add analytics record');
    return await response.json();
  } catch (error) {
    console.error('Error adding analytics record:', error);
    return null;
  }
}

async function saveAnalytics(action, deviceId) {
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceId,
        action: action,
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error('Failed to save analytics');
    return await response.json();
  } catch (error) {
    console.error('Error saving analytics:', error);
    return null;
  }
}

// Device management functions
function getRandomDevice() {
  const types = ["Sensor", "Camera", "Gateway", "Lock", "Monitor", "Light", "Drone"];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    name: type + ' Device',
    type: 'iot',
    status: 'online'
  };
}

async function loadDevices() {
  try {
    const response = await fetch('/api/devices');
    if (!response.ok) throw new Error('Failed to load devices');
    return await response.json();
  } catch (error) {
    console.error('Error loading devices:', error);
    return [];
  }
}

async function saveDevices(device) {
  try {
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });
    if (!response.ok) throw new Error('Failed to add device');
    return await response.json();
  } catch (error) {
    console.error('Error adding device:', error);
    return null;
  }
}

async function renderDevices() {
  const container = document.getElementById('deviceTableWrap');
  if (!container) return;

  let arr = await loadDevices();
  let html = '';
  if (arr.length === 0) {
    html = '<div style="text-align:center; color:#888;">No devices registered.</div>';
  } else {
    html = `<table style="width:100%; background:#181a2b; color:#0ff; border-radius:12px; font-size:1em; margin-top:12px;"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Registered</th></tr></thead><tbody>`;
    html += arr.map(d => `<tr><td>${d.id || d.deviceId || 'N/A'}</td><td>${d.name || d.deviceName || 'N/A'}</td><td>${d.type || d.deviceType || 'N/A'}</td><td>${d.status || 'N/A'}</td><td>${d.registered_at || d.registeredAt || 'N/A'}</td></tr>`).join('');
    html += '</tbody></table>';
  }
  container.innerHTML = html;
}

async function addRandomDevice() {
  const device = getRandomDevice();
  await saveDevices(device);
  await renderDevices();
}

async function clearDevices() {
  await renderDevices();
}

/* --------------- NEW SERVICE FUNCTION: Data Encryption --------------- */
async function encryptData() {
  const dataInput = document.getElementById("dataToEncrypt");
  const resultEl = document.getElementById("encryptionResult");

  if (!dataInput || !resultEl) return;

  if (!dataInput.value.trim()) {
    resultEl.textContent = 'Please enter data to encrypt.';
    resultEl.style.color = '#ff4d4d';
    return;
  }

  resultEl.textContent = 'Encrypting data using AES-256-GCM...';
  resultEl.style.color = '#00ffe0';
  await sleep(800);
  resultEl.textContent = 'Generating decentralized key...';
  await sleep(800);

  const hash = btoa(dataInput.value).slice(0, 30);

  resultEl.innerHTML = `✅ Encryption Complete.
<span style="display:block; margin-top: 8px;">Cipher Hash:</span>
<span style="font-family:monospace; color:#00ffe0; word-break: break-all; background: #131c31; padding: 5px 8px; border-radius: 4px;">0x${hash}...</span>`;
}

/* --------------- NEW SERVICE FUNCTION: AI Code Scan --------------- */
async function aiCodeScan() {
  const codeInput = document.getElementById("codeToScan");
  const resultEl = document.getElementById("codeScanResult");

  if (!codeInput || !resultEl) return;

  const code = codeInput.value.trim();

  if (!code) {
    resultEl.textContent = 'Please enter code to scan.';
    resultEl.style.color = '#ff4d4d';
    return;
  }

  resultEl.textContent = 'Initializing AI static analysis...';
  resultEl.style.color = '#ffae42';
  await sleep(800);
  resultEl.textContent = 'Analyzing syntax and flow...';
  await sleep(1200);

  let resultText = '';
  let resultColor = '#00e6e6';

  // Simple mock vulnerability checks
  if (code.includes('require(msg.sender == owner)')) {
    resultText = '⚠️ WARNING: Access Control Pattern Found. Ensure proper state validation.';
    resultColor = '#ffae42';
  } else if (code.includes('var i = 0')) {
    resultText = '⛔ CRITICAL: Potentially vulnerable variable declaration (type safety issue).';
    resultColor = '#ff4d4d';
  } else {
    resultText = '✅ PASS: No critical vulnerabilities detected by AI. Good job!';
  }

  resultEl.innerHTML = `<span style="color:${resultColor}">${resultText}</span>`;
}

/* --------------- Real-Time Updates (Socket.IO) --------------- */
if (typeof io !== 'undefined') {
  const socket = io();

  socket.on('connect', () => {
    console.log("✅ Main: Socket.IO Connected!");
  });

  socket.on('new_block', (block) => {
    console.log("Events: New Block", block);

    // 1. Update Dashboard Blockchain Widget (if exists)
    const blockList = document.getElementById('recent-blocks-list');
    if (blockList) {
      const row = document.createElement('tr');
      row.className = 'fade-in-row';
      row.innerHTML = `
                <td>#${block.height}</td>
                <td>${block.hash.substring(0, 10)}...</td>
                <td>${block.txs}</td>
                <td>${new Date().toLocaleTimeString()}</td>
            `;
      blockList.insertBefore(row, blockList.firstChild);
      if (blockList.children.length > 8) blockList.lastChild.remove();
    }

    // 2. Toast Notification
    showToast(`📦 New Block Mined! Height: ${block.height}`);
  });

  socket.on('scan_complete', (data) => {
    console.log("Events: Scan Complete", data);
    if (data.threats_found > 0) {
      showToast(`⚠️ Threat Scan: Found ${data.threats_found} risks!`, 'error');
    } else {
      showToast(`✅ Threat Scan: System Clean`, 'success');
    }
  });
} else {
  // console.warn("Socket.IO library not loaded.");
}

// Simple Toast Helper
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.background = type === 'error' ? 'rgba(255, 50, 50, 0.9)' : 'rgba(0, 20, 40, 0.9)';
  toast.style.border = '1px solid #00ffe0';
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '10000';
  toast.style.boxShadow = '0 0 15px rgba(0,255,224,0.3)';
  toast.style.fontFamily = 'monospace';
  toast.style.animation = 'slideIn 0.3s ease-out';
  toast.innerHTML = msg;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.5s forwards';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// CSS for Toast Animation - injected once
if (!document.getElementById('toast-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'toast-styles';
  styleSheet.innerText = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { to { opacity: 0; } }
    .fade-in-row { animation: fadeIn 0.5s; background: rgba(0, 255, 224, 0.1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
  document.head.appendChild(styleSheet);
}
