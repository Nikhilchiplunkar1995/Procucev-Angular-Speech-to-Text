# Procucev AI Speech-to-Text — Angular Edition

A full-stack assignment with **Angular 19**, Node.js/Express, PostgreSQL, and self-hosted faster-whisper (Python/FastAPI).

## Requirements
- Docker Desktop with Docker Compose (recommended); 4+ GB free RAM for Whisper small model
- Chrome or Edge for browser speech recognition; allow microphone permissions

## Start all services
```bash
docker compose up --build
```
Open **http://localhost:5173**. The API is on http://localhost:4000/api/health and Whisper on http://localhost:8000/health. The initial Whisper model download can take time; audio upload will work after the model loads.

## Features
- Angular standalone components and responsive UI
- Live browser speech recognition (Hindi or English selectable; browser-dependent)
- Upload audio to open-source self-hosted Whisper, edit results, save
- PostgreSQL-backed CRUD and search/history
- Browser text-to-speech playback of the current draft

## Architecture
Angular (5173) -> Express API (4000) -> PostgreSQL (5432). Angular -> FastAPI Whisper (8000) for uploads.

## Development
```bash
cd client
npm install
npm start
```
In another terminal, start PostgreSQL, the API, and the transcriber using Docker Compose. For a locally run API, `server/.env` can configure PostgreSQL with either `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. PostgreSQL must be running and accepting connections before the API starts. Angular dev server uses port 5173.

## Notes
- This is **not** an external paid API. Live speech uses the browser's recognition engine; uploaded files use locally hosted Whisper. Hindi-English code-switching is best handled with Whisper automatic language detection (currently upload language follows selection; change language query to `auto` for automatic detection).
- API URLs are configured for localhost in `client/src/app/app.component.ts`; adjust for production deployments.
- Docker volumes persist PostgreSQL data. Default credentials are development-only; change before deployment.
- Microphone access on deployed domains requires HTTPS.
- Deployment and GitHub publishing must be completed by the developer.
