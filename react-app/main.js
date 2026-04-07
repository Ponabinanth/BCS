// @ts-nocheck
/* ============================================
   SecureChain — main.js (vanilla JS, advanced)
   Wires up: theme, console, explorer, scans,
   IoT register, NFT verify, analytics chart,
   mini threat map, wallet, contact form.
   ============================================ */

/* ---------------- Utilities ---------------- */
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
    { height: 1002, hash: "0xdef456", txs: 7, time: Date.now() - 43200000 },
    { height: 1003, hash: "0x987fed", txs: 21, time: Date.now() - 21600000 },
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
// main.js: ADD THIS FUNCTION TO THE END OF THE FILE

function startThreatScan() {
  const inputEl = document.getElementById('threatInput');
  const statusEl = document.getElementById('scanStatus');
  const resultEl = document.getElementById('scanResult');
  // Get the parent container to apply the 'scanning' class
  const animationEl = document.getElementById('scanAnimation').parentElement;
  const buttonEl = document.getElementById('scanButton');
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
  // Start the CSS animation by adding the 'scanning' class
  animationEl.classList.add('scanning');

  // 3. Simulate Scan Logic (waits 3 seconds)
  setTimeout(() => {
    // Stop animation and restore button
    animationEl.classList.remove('scanning');
    buttonEl.disabled = false;
    buttonEl.textContent = 'Start Scan';

    let scanResult;
    let resultClass;
    let scanTime = (Math.random() * 2 + 1).toFixed(2); // Simulate a scan time

    // Simple Threat Logic: check for keywords to simulate different results
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
    resultEl.classList.add(resultClass);

  }, 3000); // 3-second simulation time
}

/* --------------- Mini Threat Map --------------- */
/* Renders a live SVG world map with threat pings */
function renderThreatMap() {
  const container = $("#threatMapContainer") || $("#map");
  if (!container) return;
  const W = container.clientWidth || 700;
  const H = container.clientHeight || 250;

  // Simple world map outline (simplified paths)
  const worldMap = `
    <svg width="${W}" height="${H}" viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .threat-marker { animation: pulse 2s infinite; }
          @keyframes pulse { 0% { r: 3; opacity: 1; } 50% { r: 6; opacity: 0.5; } 100% { r: 3; opacity: 1; } }
        </style>
      </defs>
      <!-- Simplified world outline -->
      <path d="M 100 200 Q 150 150 200 200 T 300 200 Q 350 250 400 200 T 500 200 Q 550 150 600 200 T 700 200 Q 750 250 800 200 T 900 200 L 900 300 Q 850 350 800 300 T 700 300 Q 650 350 600 300 T 500 300 Q 450 250 400 300 T 300 300 Q 250 350 200 300 T 100 300 Z" fill="none" stroke="#00f5ff" stroke-width="2"/>
      <!-- Threat markers -->
      ${state.threats.map(t => {
    let color = '#00ffe0'; // low
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

  if (liveChartCanvas) {
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

    // Update every 5 seconds
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

  if (severityChartCanvas) {
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

  // Very light mock: detect number => height, 0x... => hash, else address
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
    // Create if missing
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

  // Check if fields exist
  if (!deviceId || !deviceName || !deviceType) {
    alert("No device fields found on page!");
    return;
  }

  // Check if user filled all fields
  if (deviceId.value.trim() === "" || deviceName.value.trim() === "" || deviceType.value === "") {
    alert("Please fill in all fields before registering!");
    return;
  }

  // Simulate registration
  alert(
    "✅ IoT Device Registered Successfully!\n\n" +
    "Device ID: " + deviceId.value + "\n" +
    "Device Name: " + deviceName.value + "\n" +
    "Device Type: " + deviceType.value
  );

  // (Optional) Clear fields after registration
  deviceId.value = "";
  deviceName.value = "";
  deviceType.value = "";
}

/* --------------- NFT Verify --------------- */
function verifyNFT() {
  const nftId = document.getElementById("nftId");
  const nftOwner = document.getElementById("nftOwner");

  if (!nftId || !nftOwner) {
    alert("No NFT fields found on page!");
    return;
  }

  if (nftId.value.trim() === "" || nftOwner.value.trim() === "") {
    alert("Please fill in both fields before verifying!");
    return;
  }

  // Look for NFT in the database
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

  // Clear fields
  nftId.value = "";
  nftOwner.value = "";
}

/* --------------- Wallet Connect --------------- */
async function connectWallet() {
  const box = $("#explorerResult") || $("#threatScanResults") || $("#consoleOutput");
  try {
    if (window.ethereum?.request) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0] || "Unknown";
      if (box) box.textContent = `Wallet Connected`;
      else alert(`Wallet Connected`);
      return;
    }
  } catch (e) {
    // fallthrough to mock
  }
  const mock = "0x" + Math.random().toString(16).slice(2).padEnd(40, "a").slice(0, 40);
  if (box) box.textContent = `(Sim) Wallet Connected`;
  else alert(`(Sim) Wallet Connected`);
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

async function runConsole() {
  const inp = $("#consoleInput");
  if (!inp) return;
  const cmd = inp.value.trim();
  if (!cmd) return;
  logConsole("> " + cmd);

  const [c, ...rest] = cmd.toLowerCase().split(/\s+/);
  switch (c) {
    case "help":
      logConsole("Commands: help, scan, wallet, block, clear, time, theme, explore <q>, register <name> <type>, nft <tokenId>");
      break;
    case "scan":
      await runThreatScan();
      logConsole("Scan complete.");
      break;
    case "wallet":
      await connectWallet();
      break;
    case "block": {
      // add a new mock block
      const next = {
        height: (state.blocks.at(-1)?.height || 1000) + 1,
        hash: "0x" + Math.random().toString(16).slice(2, 8),
        txs: Math.floor(Math.random() * 25) + 1,
        time: Date.now(),
      };
      state.blocks.push(next); persist();
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

/* --------------- Auth (Login / Sign Up) --------------- */
const loginTemplate = `
  <form id="authForm" data-mode="login">
    <input type="email" placeholder="Email" required name="email"
      style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
    <input type="password" placeholder="Password" required name="password"
      style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
    <button type="submit"
      style="width:100%; margin-top:16px; padding:10px; border-radius:8px; border:none; background:linear-gradient(90deg,#00f2fe,#4facfe); color:#fff; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 0 8px #00f2fe;">Login</button>
  </form>
  <p class="text-sm mt-4 text-gray-400">
    Or <a href="/google-login" class="text-[#00f2fe] hover:text-[#4facfe] font-medium">Login with Google</a>
  </p>
  <p class="text-sm mt-4 text-gray-400">
    Don't have an account? <a href="#" onclick="showAuth('signup')" class="text-[#00f2fe] hover:text-[#4facfe] font-medium transition-colors">Sign Up</a>
  </p>
`;

const signupTemplate = `
  <form id="authForm" data-mode="signup">
    <input type="text" placeholder="Username (Optional)" name="username"
      style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
    <input type="email" placeholder="Email" required name="email"
      style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
    <input type="password" placeholder="Password" required name="password"
      style="width:90%; margin:12px 0; padding:10px; border-radius:8px; border:none; background:#222; color:#fff; font-size:16px;" />
    <button type="submit"
      style="width:100%; margin-top:16px; padding:10px; border-radius:8px; border:none; background:linear-gradient(90deg,#00f2fe,#4facfe); color:#fff; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 0 8px #00f2fe;">Sign Up</button>
  </form>
  <p class="text-sm mt-4 text-gray-400">
    Or <a href="/google-login" class="text-[#00f2fe] hover:text-[#4facfe] font-medium">Sign Up with Google</a>
  </p>
  <p class="text-sm mt-4 text-gray-400">
    Already have an account? <a href="#" onclick="showAuth('login')" class="text-[#00f2fe] hover:text-[#4facfe] font-medium transition-colors">Login</a>
  </p>
`;

function openAuth() {
  showAuth('login');
}

function showAuth(mode = 'login') {
  const modal = document.getElementById('authModal');
  const content = document.getElementById('authContent');
  const title = document.getElementById('modalTitle');
  if (!modal || !content || !title) return;
  title.textContent = mode === 'login' ? 'Login' : 'Sign Up';
  content.innerHTML = mode === 'login' ? loginTemplate : signupTemplate;
  modal.style.display = 'block';
  // Attach submit handler
  const form = content.querySelector('#authForm');
  if (form) {
    form.addEventListener('submit', handleAuthSubmit);
  }
}

function closeAuth() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const mode = form.dataset.mode;
  // Validate
  if (!data.email || !data.password) {
    alertBox.show('Email and password required', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    alertBox.show('Invalid email format', 'error');
    return;
  }
  if (data.password.length < 6) {
    alertBox.show('Password must be at least 6 characters', 'error');
    return;
  }
  // Fetch
  fetch(`/api/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()).then(res => {
    if (res.message) {
      alertBox.show(res.message, 'success');
      closeAuth();
      location.reload(); // Update navbar
    } else {
      alertBox.show(res.error || 'Error', 'error');
    }
  }).catch(() => alertBox.show('Network error', 'error'));
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

  // Wire buttons if present (safe-guards keep it idempotent)
  $("#themeToggle")?.addEventListener("click", toggleTheme);
  // Services buttons are already onClick in HTML; fallback bindings:
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

  // Console quick-enter is wired in HTML inline; also add here:
  $("#consoleInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runConsole();
  });

  // Re-render visuals on resize
  window.addEventListener("resize", () => {
    renderThreatMap();
    showAnalytics();
  });
}

document.addEventListener("DOMContentLoaded", init);

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
window.openAuth = openAuth;
window.showAuth = showAuth;
window.closeAuth = closeAuth;
window.encryptData = encryptData;
window.scanUrl = scanUrl;
window.aiCodeScan = aiCodeScan;
window.startThreatScan = runThreatScan;
window.clearDevices = clearDevices;
window.renderDevices = renderDevices;
window.logout = function () {
  fetch('/api/logout', { method: 'POST' }).then(() => location.href = '/');
};

// Sample NFT Data (Dummy Database)
const nftDatabase = [
  { id: "NFT-1001", owner: "0x12345ABCDE67890" },
  { id: "NFT-1002", owner: "0x98765FEDCB43210" },
  { id: "NFT-1003", owner: "0xABCDEF123456789" }
];

// ===== Add Analytics Record =====
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

// New Chatbot
(() => {
  const newChatToggle = document.getElementById('newChatToggle');
  const newChatWindow = document.getElementById('newChatWindow');
  const newChatInput = document.getElementById('newChatInput');
  const newSendBtn = document.getElementById('newSendBtn');
  const newChatMessages = document.getElementById('newChatMessages');

  if (newChatToggle) {
    const appendMessage = (sender, text) => {
      const msg = document.createElement("div");
      msg.classList.add("message", sender);
      msg.textContent = text;
      newChatMessages.appendChild(msg);
      newChatMessages.scrollTop = newChatMessages.scrollHeight;
    };

    const toggleChat = () => {
      newChatWindow.style.display = newChatWindow.style.display === 'none' ? 'flex' : 'none';
      if (newChatWindow.style.display === 'flex' && newChatMessages.children.length === 0) {
        appendMessage("ai", "Hello! How can I help you today?");
      }
    };

    const sendMessage = async () => {
      const query = newChatInput.value.trim();
      if (!query) return;
      appendMessage("user", query);
      newChatInput.value = "";
      // Fetch response from API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query })
        });
        const data = await response.json();
        appendMessage("ai", data.response || "Sorry, I couldn't process that.");
      } catch (error) {
        appendMessage("ai", "Error: Unable to connect to chat service.");
      }
    };

    newChatToggle.addEventListener('click', toggleChat);
    newSendBtn.addEventListener('click', sendMessage);
    newChatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
})();

// Example usage:
// saveAnalytics("Registered IoT", "Device123");

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
  let arr = await loadDevices();
  let html = '';
  if (arr.length === 0) {
    html = '<div style="text-align:center; color:#888;">No devices registered.</div>';
  } else {
    html = `<table style="width:100%; background:#181a2b; color:#0ff; border-radius:12px; font-size:1em; margin-top:12px;"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Registered</th></tr></thead><tbody>`;
    html += arr.map(d => `<tr><td>${d.id || d.deviceId || 'N/A'}</td><td>${d.name || d.deviceName || 'N/A'}</td><td>${d.type || d.deviceType || 'N/A'}</td><td>${d.status || 'N/A'}</td><td>${d.registered_at || d.registeredAt || 'N/A'}</td></tr>`).join('');
    html += '</tbody></table>';
  }
  document.getElementById('deviceTableWrap').innerHTML = html;
}

async function addRandomDevice() {
  const device = getRandomDevice();
  await saveDevices(device);
  await renderDevices();
}

async function clearDevices() {
  // Since no delete API, just reload
  await renderDevices();
}

/* --------------- NEW SERVICE FUNCTION: Data Encryption --------------- */
async function encryptData() {
  const dataInput = document.getElementById("dataToEncrypt");
  const resultEl = document.getElementById("encryptionResult");

  if (!dataInput.value.trim()) {
    resultEl.textContent = 'Please enter data to encrypt.';
    resultEl.style.color = '#ff4d4d';
    return;
  }

  resultEl.textContent = 'Encrypting data using AES-256-GCM...';
  resultEl.style.color = '#00ffe0';
  // Use the existing sleep utility function
  await sleep(800);
  resultEl.textContent = 'Generating decentralized key...';
  await sleep(800);

  // Mock encryption: Base64 encode and truncate for a hash
  const hash = btoa(dataInput.value).slice(0, 30);

  resultEl.innerHTML = `✅ Encryption Complete.
<span style="display:block; margin-top: 8px;">Cipher Hash:</span>
<span style="font-family:monospace; color:#00ffe0; word-break: break-all; background: #131c31; padding: 5px 8px; border-radius: 4px;">0x${hash}...</span>`;
}

/* --------------- URL Phishing Scan (Refactored from index.html) --------------- */
function scanUrl() {
  const urlInput = document.getElementById('urlInput');
  const resultEl = document.getElementById('urlResult');
  const url = urlInput.value.trim();

  if (!url) {
    resultEl.textContent = 'Please enter a URL.';
    resultEl.style.color = '#ffae42';
    return;
  }

  resultEl.textContent = 'Scanning...';
  resultEl.style.color = '#00e6e6';

  setTimeout(() => {
    // Mock Blacklist & Suspicious check
    const blacklist = ['evil.com', 'phishing.net', 'badlink.com'];
    try {
      // Add 'http://' if missing for valid URL object creation
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

/* --------------- NEW SERVICE FUNCTION: AI Code Scan --------------- */
async function aiCodeScan() {
  const codeInput = document.getElementById("codeToScan");
  const resultEl = document.getElementById("codeScanResult");
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
  /* ============================================
   --- AI CHATBOT LOGIC --- 
   ============================================ */
  document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!chatToggle || !chatWindow) return; // Exit if chatbot elements don't exist

    // Toggles the chat window open/closed
    chatToggle.addEventListener('click', () => {
      chatWindow.classList.toggle('chat-closed');
      if (!chatWindow.classList.contains('chat-closed')) {
        chatInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom on open
      }
    });

    chatClose.addEventListener('click', () => {
      chatWindow.classList.add('chat-closed');
    });

    // Wires up send button and enter key
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // 1. Creates a new message element in the chat window
    function createMessage(text, sender) {
      const messageEl = document.createElement('div');
      messageEl.classList.add('chat-message', sender);
      messageEl.innerHTML = text; // Use innerHTML to allow for HTML in responses (like links and bold text)
      chatMessages.appendChild(messageEl);

      // Auto-scroll to the bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 2. The core function to send the user's message and get a response
    function sendMessage() {
      const input = chatInput.value.trim();
      if (input === "") return;

      createMessage(input, 'user');
      generateResponse(input);
      chatInput.value = '';
    }

    // 3. ENHANCED MESSAGE RESPONSE LOGIC
    function generateResponse(message) {
      const lowerMsg = message.toLowerCase().trim();
      let response = "";

      // Utility to simulate command execution
      function simulateCommand(command, delay = 1000) {
        response = `Simulating execution of command: <b>${command}</b>...`;
        setTimeout(() => {
          // Direct the user to the console output section
          const consoleEl = document.getElementById('console');
          if (consoleEl) {
            consoleEl.scrollIntoView({ behavior: 'smooth' });
          }
          createMessage(`✅ Command executed. Output is visible in the <b>SecureChain Console</b> section.`, 'ai');
        }, delay);
      }

      // --- CORE INFORMATION RESPONSES ---
      if (lowerMsg.includes("explain project") || lowerMsg.includes("what is securechain")) {
        response = "🔐 <b>SecureChain</b> is an AI-Powered Blockchain Security Platform. It combines <b>AI-driven threat detection</b>, <b>encrypted storage</b>, <b>IoT trust</b>, and <b>NFT validation</b> to create a next-gen decentralized cybersecurity ecosystem. Check out the <a href='#explore'><b>Ecosystem Grid</b></a> for a visual overview!";
      } else if (lowerMsg.includes("features") || lowerMsg.includes("core functions")) {
        response = "<b>SecureChain's Core Features:</b><br><br>" +
          "1. <b>AI Threat Detection</b> 🤖: Real-time anomaly detection.<br>" +
          "2. <b>IoT Trust Registrar</b> 📡: Decentralized registry for devices.<br>" +
          "3. <b>NFT Cert Validator</b> 🎓: Identity & certificate validation.<br>" +
          "4. <b>Quantum Encryption</b> 🧬: Future-proof data protection.<br>" +
          "5. ...and many more in the <a href='#features'><b>Features Grid</b></a>!";
      } else if (lowerMsg.includes("services") || lowerMsg.includes("functions") || lowerMsg.includes("do for me")) {
        response = "<b>SecureChain Services:</b><br><br>" +
          "1. <b>Threat Scan:</b> Use the 'Open Threat Scan' button under Services.<br>" +
          "2. <b>System Status:</b> Click 'Check Status' ⚙️ to run a full system health report.<br>" +
          "3. <b>Explorer:</b> Search for addresses in the <a href='#explorer'><b>Blockchain Explorer</b></a> section.<br><br>" +
          "Try asking me to 'Run a system status check' or 'How do I log in'.";
      } else if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
        response = "Hello there! I'm the <b>SecureChain Assistant</b> 🤖. I can guide you through our AI and Blockchain security platform. How can I assist you today?";
      }

      // --- INTEGRATED FUNCTIONALITY RESPONSES (ACTIONABLE) ---
      // NOTE: These assume the functions (openAuth, openSystemStatusModal) are also defined in main.js, 
      // which they appear to be based on the provided file snippet.

      else if (lowerMsg.includes("log in") || lowerMsg.includes("sign up") || lowerMsg.includes("open auth")) {
        // Executes the openAuth function (if defined in the page scope)
        if (typeof openAuth === 'function') {
          openAuth();
          response = "Authentication modal is now open! Please log in or sign up. We're using a secure, simulated process for this demo.";
        } else {
          response = "I can't open the auth modal right now, but you can click the 'Login/Sign Up' button in the header.";
        }
      } else if (lowerMsg.includes("run system status") || lowerMsg.includes("check status") || lowerMsg.includes("system status")) {
        // Executes the openSystemStatusModal function (if defined in the page scope)
        if (typeof openSystemStatusModal === 'function') {
          openSystemStatusModal();
          response = "Initiating the <b>System Status</b> check... The report modal should now be visible on your screen.";
        } else {
          response = "I can't run the status check. Look for the 'Check Status' button on the dashboard.";
        }
      } else if (lowerMsg.includes("threat scan") || lowerMsg.includes("vulnerability scan")) {
        // Guides the user to the feature
        const scanSection = document.getElementById('services');
        if (scanSection) {
          scanSection.scrollIntoView({ behavior: 'smooth' });
          response = "The <b>Threat Scan</b> service is key! Please scroll up to the **Services** section and click 'Open Threat Scan' to start a dedicated vulnerability scan.";
        } else {
          response = "Please navigate to the **Services** section and click 'Open Threat Scan' to run a dedicated vulnerability analysis.";
        }
      } else if (lowerMsg.includes("add device") || lowerMsg.includes("register device")) {
        // Simulates clicking the add device button
        const addDeviceBtn = document.getElementById('addDeviceBtn');
        if (addDeviceBtn) {
          addDeviceBtn.click();
          document.getElementById('threatmap').scrollIntoView({ behavior: 'smooth' });
          response = "A random IoT device has been added to the registry! Scroll down to the <b>Threat Map</b> section to view the updated device table.";
        } else {
          response = "I couldn't find the device registry button. Please navigate to the **Threat Map** section and click '➕ Add Random Device'.";
        }
      } else if (lowerMsg.includes("clear device") || lowerMsg.includes("remove device")) {
        // Simulates clicking the clear devices button
        const clearDevicesBtn = document.getElementById('clearDevicesBtn');
        if (clearDevicesBtn) {
          clearDevicesBtn.click();
          document.getElementById('threatmap').scrollIntoView({ behavior: 'smooth' });
          response = "The local device registry has been cleared! Scroll down to the <b>Threat Map</b> section to confirm.";
        } else {
          response = "I couldn't find the clear devices button. Please navigate to the **Threat Map** section and click '🧹 Clear All Devices'.";
        }
      } else if (lowerMsg.includes("console") || lowerMsg.includes("run command")) {
        // Triggers a command simulation and directs the user to the console
        const command = lowerMsg.replace(/run console command|run command|console/g, '').trim() || 'help';
        simulateCommand(command);
        return; // Stop here, the simulateCommand handles the final message
      } else if (lowerMsg.includes("theme")) {
        response = "You can toggle the website's theme between <b>light and dark mode</b> by clicking the 🌙 icon next to the Login/Sign Up button in the header!";
      }

      // --- DEFAULT RESPONSE ---
      else {
        response = "I'm sorry, I can only provide information about <b>SecureChain's features and services</b> or execute simple page actions like 'Open Log In', 'Check Status', or 'Add Device'.";
      }

      // Simulate AI typing delay for non-command responses
      setTimeout(() => {
        createMessage(response, 'ai');
      }, 500);
    }

    // Optional: Send a welcome message when the chat opens for the first time
    createMessage("Hello! I'm your <b>SecureChain Assistant</b> 🤖. How can I help you explore our platform?", 'ai');

  });
  // --- END AI CHATBOT LOGIC ---
}




