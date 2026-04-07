import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles.css";

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