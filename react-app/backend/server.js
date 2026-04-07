// @ts-nocheck
// server.js (Node.js + Express)

import express from 'express';
import bodyParser from 'body-parser';
import { ethers } from 'ethers';
import path from 'path';


const app = express();
app.use(bodyParser.json());

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Replace with real DB in production
const collected = []; // { address, signedAt, provider, meta }

function cleanMessage(message) {
  // optional: normalize line endings, trimming
  return message.trim();
}

app.post('/api/wallet/collect', async (req, res) => {
  try {
    const { address, message, signature, provider } = req.body;
    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'address, message, signature required' });
    }

    // Verify signature: recoverAddress
    const clean = cleanMessage(message);
    const recovered = ethers.verifyMessage(clean, signature); // ethers v6 helper

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Optional: check nonce freshness to avoid replay attacks (parse from message)
    // Example message format: "SecureChain authentication\nAddress: ...\nNonce: 169XXXXX"
    const lines = clean.split('\n').map(l => l.trim());
    const nonceLine = lines.find(l => l.toLowerCase().startsWith('nonce:'));
    if (!nonceLine) {
      return res.status(400).json({ error: 'Missing nonce in message' });
    }
    const nonce = Number(nonceLine.split(':')[1]);
    const maxAgeSeconds = 5 * 60; // 5 minutes
    if (Number.isNaN(nonce) || (Math.floor(Date.now()/1000) - nonce) > maxAgeSeconds) {
      return res.status(400).json({ error: 'Nonce expired or invalid' });
    }

    // Save to DB (demo in-memory)
    collected.push({ address, provider, signedAt: new Date().toISOString() });

    return res.json({ ok: true, address, collectedCount: collected.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

// New POST endpoint for submitting user data
app.post('/submit-data-endpoint', (req, res) => {
  try {
    const { user_name, user_email } = req.body;

    // Validation
    if (!user_name || !user_email) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Perform business logic (e.g., save to database - pseudo-code)
    // database.saveUser({ name: user_name, email: user_email });

    // Send success response
    res.status(201).json({
      message: "User created successfully!",
      data: { name: user_name, email: user_email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

app.post('/templates/', (req, res) => {
  try {
    const data = req.body;
    // Process the data as needed, e.g., log it or save to a file
    console.log('Received POST data:', data);
    res.status(200).json({ message: 'Data received successfully', received: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

app.post('/templates', (req, res) => {
  try {
    const data = req.body;
    // Process the data as needed, e.g., log it or save to a file
    console.log('Received POST data:', data);
    res.status(200).json({ message: 'Data received successfully', received: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

// Serve static files (HTML, CSS, JS, images)
const staticDir = path.join(process.cwd(), '..');
app.use(express.static(staticDir));

const PORT = process.env.PORT || 5501;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
