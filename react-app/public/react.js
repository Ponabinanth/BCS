// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const STORAGE_KEY = "demo_devices";

  const [wallet, setWallet] = useState(null);
  const [devices, setDevices] = useState([]);

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed. Please install MetaMask first.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts[0];
      localStorage.setItem("walletAddress", addr);
      setWallet(addr);
    } catch (err) {
      console.error("Wallet connect failed:", err);
      alert("Wallet connection failed. Check MetaMask.");
    }
  };

  // Ensure demo data exists
  const ensureDemoData = () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const data = [
        { deviceType: "Sensor", registeredAt: Date.now() - 86400000 * 3 },
        { deviceType: "Camera", registeredAt: Date.now() - 86400000 * 2 },
        { deviceType: "Sensor", registeredAt: Date.now() - 86400000 * 1 },
        { deviceType: "Gateway", registeredAt: Date.now() },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  const loadDevices = () => {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setDevices(arr);
  };

  useEffect(() => {
    const storedWallet = localStorage.getItem("walletAddress");
    if (storedWallet) setWallet(storedWallet);

    ensureDemoData();
    loadDevices();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
        } else {
          setWallet(null);
          localStorage.removeItem("walletAddress");
        }
      });
    }
  }, []);

  // Analytics calculation
  const byType = {};
  const byDay = {};

  devices.forEach((d) => {
    byType[d.deviceType] = (byType[d.deviceType] || 0) + 1;
    const day = new Date(d.registeredAt).toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const chartTypes = {
    labels: Object.keys(byType),
    datasets: [
      {
        data: Object.values(byType),
        backgroundColor: ["#0ff", "#ff4d6d", "#ffd88f", "#00ff9d"],
      },
    ],
  };

  const chartTimeline = {
    labels: Object.keys(byDay).sort(),
    datasets: [
      {
        label: "Registrations",
        data: Object.keys(byDay)
          .sort()
          .map((d) => byDay[d]),
        borderColor: "#0ff",
        fill: false,
      },
    ],
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220] p-6">
      <div className="bg-[#161b2e] rounded-2xl shadow-xl p-6 max-w-4xl w-full text-white">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">
          📊 SecureChain IoT Analytics
        </h2>
        <p className="opacity-70 mb-4">
          Uses MetaMask wallet + local storage for demo devices.
        </p>

        <div className="mb-4 flex gap-3 flex-wrap">
          {!wallet ? (
            <button
              onClick={connectWallet}
              className="bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg"
            >
              🔗 Connect Wallet
            </button>
          ) : (
            <span className="bg-[#1e2440] px-4 py-2 rounded-lg text-cyan-300 font-mono">
              ✅ Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
          )}

          <button
            onClick={loadDevices}
            className="bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg"
          >
            📈 Refresh
          </button>
        </div>

        {!wallet ? (
          <p className="text-pink-400 font-bold">
            ❌ Wallet not connected. Please connect first.
          </p>
        ) : devices.length === 0 ? (
          <p>No devices registered yet.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="flex flex-wrap gap-4 justify-center my-6">
              <div className="bg-[#1e2440] rounded-lg p-4 min-w-[120px] text-center">
                <div className="text-cyan-400 text-2xl font-bold">
                  {devices.length}
                </div>
                <div>Total Devices</div>
              </div>
              <div className="bg-[#1e2440] rounded-lg p-4 min-w-[120px] text-center">
                <div className="text-cyan-400 text-2xl font-bold">
                  {Object.keys(byType).length}
                </div>
                <div>Unique Types</div>
              </div>
              <div className="bg-[#1e2440] rounded-lg p-4 min-w-[120px] text-center">
                <div className="text-cyan-400 text-2xl font-bold">
                  {Object.keys(byDay).length}
                </div>
                <div>Active Days</div>
              </div>
            </div>

            {/* Charts */}
            <div className="mb-6">
              <h3 className="text-lg text-cyan-300 mb-2">Devices by Type</h3>
              <Doughnut data={chartTypes} />
            </div>

            <div>
              <h3 className="text-lg text-cyan-300 mb-2">
                Registrations Over Time
              </h3>
              <Line data={chartTimeline} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./style.css";

// Dummy Data
const threatData = [
  { name: "Mon", threats: 40 },
  { name: "Tue", threats: 70 },
  { name: "Wed", threats: 50 },
  { name: "Thu", threats: 90 },
  { name: "Fri", threats: 120 },
];

const geoUrl =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// Navbar
function Navbar({ toggleTheme }) {
  return (
    <nav className="navbar">
      <Link to="/">Home</Link>
      <Link to="/explore">Explore</Link>
      <Link to="/ai">AI</Link>
      <Link to="/cyber">Cybersecurity</Link>
      <Link to="/iot">IoT</Link>
      <Link to="/nft">NFT</Link>
      <Link to="/console">Console</Link>
      <Link to="/contact">Contact</Link>
      <button onClick={toggleTheme} className="theme-btn">🌓</button>
    </nav>
  );
}

// Hero
function Hero() {
  return (
    <motion.div className="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1>SecureChain 🔒</h1>
      <p>Blockchain + AI + Cybersecurity + IoT</p>
      <Link to="/explore" className="btn">Explore</Link>
    </motion.div>
  );
}

// Features
function Features() {
  return (
    <div className="features">
      <h2>Features</h2>
      <div className="grid">
        <Link to="/ai" className="card">AI Threat Detection</Link>
        <Link to="/iot" className="card">IoT Device Manager</Link>
        <Link to="/nft" className="card">NFT Validator</Link>
        <Link to="/cyber" className="card">Cybersecurity Threat Map</Link>
      </div>
    </div>
  );
}

// Explorer Page
function Explorer() {
  return (
    <div className="explorer">
      <h2>SecureChain Ecosystem</h2>
      <p>Blockchain, AI, IoT, NFT verification integrated in one platform.</p>
    </div>
  );
}

// Threat Map
function ThreatMap() {
  return (
    <div className="map">
      <h2>Cyber Threat Map</h2>
      <ComposableMap projectionConfig={{ scale: 150 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography key={geo.rsmKey} geography={geo} className="geo" />
            ))
          }
        </Geographies>
      </ComposableMap>
      <LineChart width={500} height={300} data={threatData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="threats" stroke="#0ff" />
      </LineChart>
    </div>
  );
}

// Console
function Console() {
  const [logs, setLogs] = useState(["> Welcome to SecureChain Console"]);
  const [input, setInput] = useState("");

  const handleCommand = () => {
    let response;
    switch (input.toLowerCase()) {
      case "help":
        response = "Commands: help, scan, wallet, block";
        break;
      case "scan":
        response = "Threat Scan Complete ✅";
        break;
      case "wallet":
        response = "Wallet Connected 🔗";
        break;
      case "block":
        response = "Block Verified ⛓";
        break;
      default:
        response = "Unknown Command ❌";
    }
    setLogs([...logs, `> ${input}`, response]);
    setInput("");
  };

  return (
    <div className="console">
      <h2>SecureChain Console</h2>
      <div className="output">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCommand()}
        placeholder="Type a command..."
      />
      <button onClick={handleCommand}>Run</button>
    </div>
  );
}

// Contact
function Contact() {
  return (
    <div className="contact">
      <h2>Contact Us</h2>
      <form>
        <input type="text" placeholder="Name" required />
        <input type="email" placeholder="Email" required />
        <textarea placeholder="Message"></textarea>
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

// Pages
function AI() {
  return <div className="page">🤖 AI Threat Detection Module</div>;
}

function Cybersecurity() {
  return <div className="page">🛡 Live Cybersecurity Threats</div>;
}

function IoT() {
  return <div className="page">📡 IoT Device Registration & Security</div>;
}

function NFT() {
  return <div className="page">🎭 NFT Certificate Validator</div>;
}

// Main App
export default function App() {
  const [dark, setDark] = useState(true);
  const toggleTheme = () => setDark(!dark);

  return (
    <Router>
      <div className={dark ? "app dark" : "app light"}>
        <Navbar toggleTheme={toggleTheme} />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <Features />
                <ThreatMap />
              </>
            }
          />
          <Route path="/explore" element={<Explorer />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/cyber" element={<Cybersecurity />} />
          <Route path="/iot" element={<IoT />} />
          <Route path="/nft" element={<NFT />} />
          <Route path="/console" element={<Console />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </Router>
    
  );
}