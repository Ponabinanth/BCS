import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5500);
const FLASK_TARGET = process.env.FLASK_TARGET || 'http://127.0.0.1:5501';

app.use('/api', createProxyMiddleware({
  target: FLASK_TARGET,
  changeOrigin: true,
  ws: true
}));

app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.redirect(302, FLASK_TARGET);
});

// Redirect HTML routes to Flask (templates live there)
app.get(/.*\.html$/, (req, res) => {
  res.redirect(302, `${FLASK_TARGET}${req.originalUrl}`);
});

// Redirect extension-less routes to Flask (e.g. /iot, /nft, /wallet)
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  if (path.extname(req.path)) return next();
  res.redirect(302, `${FLASK_TARGET}${req.originalUrl}`);
});

// Fallback: proxy any other GETs to Flask
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  return createProxyMiddleware({
    target: FLASK_TARGET,
    changeOrigin: true,
    ws: true
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Node gateway listening on http://127.0.0.1:${PORT}`);
  console.log(`Proxying /api -> ${FLASK_TARGET}`);
});
