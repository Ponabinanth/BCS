# SecureChain (local dev)

This repository contains a Flask backend (in `react-app/backend`) and a Node static server at the repo root.

Quick start (Windows PowerShell)

1. Start both services for development (cross-platform):

```powershell
npm run dev
```

2. Quick health check after startup:

```powershell
npm run smoke
```

3. The Node static server will listen on port `5500` and the Flask app on `5501` by default.

Environment
- Copy `.env.example` to `.env` for local overrides (do NOT commit `.env`). The Flask app reads `FLASK_SECRET_KEY` and `FLASK_PORT` from environment variables.

CI
- A GitHub Actions workflow `ci-smoke.yml` will run on push/pull-request. It brings up Flask and the Node server and runs the smoke test; logs are captured on failure.

Docker (optional)
 - There's a `docker-compose.yml` to run the Node web server and Flask backend locally.
 - Build and start both services with:

```bash
docker-compose up --build
```

 - The Node server will be available on port 5500 and Flask on 5501 by default.

Notes
- The Node server serves static assets and provides a redirect to the Flask-rendered site. In production you should use Nginx or a CDN for static files and run Flask behind a WSGI server (Gunicorn/Waitress) behind TLS.
- Secure your SECRET_KEY and sessions before deploying.
