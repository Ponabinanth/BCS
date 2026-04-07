// @ts-nocheck
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Doughnut, Line as ChartLine } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ConnectorCard from "./ConnectorCard";

ChartJS.register(
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ChartTooltip,
  Legend
);

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
      <Link to="/connect">Connect Wallet</Link>
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

// ChatBot
function ChatBot() {
  const [messages, setMessages] = useState([{ text: "Hello! I'm the SecureChain Assistant. How can I help you today?", isUser: false }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await response.json();
      const botMessage = { text: data.response, isUser: false };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { text: "Sorry, I couldn't process your request. Please try again.", isUser: false };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="chatbot">
      <h2>SecureChain Assistant</h2>
      <div className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.isUser ? 'user' : 'bot'}`}>
            {msg.text}
          </div>
        ))}
        {isTyping && <div className="message bot typing">Bot is typing...</div>}
      </div>
      <div className="input-container">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about features..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
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
          <Route path="/connect" element={<ConnectorCard />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/cyber" element={<Cybersecurity />} />
          <Route path="/iot" element={<IoT />} />
          <Route path="/nft" element={<NFT />} />
          <Route path="/console" element={<ChatBot />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </Router>
  );
}
