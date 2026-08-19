# ArchVision Phase 38 — Repository Setup

This repository contains the Phase 38 ArchVision application source.

## Run locally

Requirements:
- Node.js 18+ (LTS recommended)

Install dependencies:

```bash
npm run install:all
```

Run development mode:

```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:4000
Health check: http://localhost:4000/api/health

## Production build

```bash
npm run build
npm start
```

The backend serves the built frontend from `frontend/dist`.

## Render deployment

The repository includes `render.yaml`.

Recommended Render settings are already represented there:
- Runtime: Node
- Build command: `npm run build`
- Start command: `npm start`
- `GEMINI_API_KEY` is configured as a secret environment variable.

Do not commit a real API key. Use `backend/.env.example` locally or configure
`GEMINI_API_KEY` as a secret in the hosting provider.

## Repository hygiene

Do not commit:
- `node_modules`
- `.env` files
- database files containing local/private data
- build output
- temporary debug files

## Important product status

Phase 38 is the project release milestone, but a production deployment and
real-browser acceptance test should still be performed before making claims that
the product is production-ready.
