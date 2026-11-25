# Procucev AI Speech-to-Text — Angular + MySQL

A full-stack speech-to-text application built for the Procucev AI Tech Hiring Assignment.

**Technology stack**
- Frontend: Angular 19
- Backend: Node.js and Express
- Database: MySQL 8.4
- Audio transcription: faster-whisper with Python and FastAPI
- Local orchestration: Docker Compose

## Features

- Responsive Angular dashboard
- Browser-based live speech recognition (Hindi or English, depending on browser support)
- Audio-file upload and transcription using self-hosted faster-whisper
- MySQL-backed transcription history
- Create, read, update, and delete transcription records
- Search transcription history
- Browser text-to-speech playback for the current draft

> Browser speech recognition depends on the browser's speech engine and language support. Uploaded audio is processed by the locally hosted Whisper service. Hindi-English code-switching quality can vary by audio quality and model.

## Prerequisites

For the recommended Docker setup:

- Windows 10/11, macOS, or Linux
- Docker Desktop with Docker Compose (Windows users should start Docker Desktop before running commands)
- At least 4 GB of free RAM recommended for the Whisper `small` model
- Chrome or Edge recommended for browser speech recognition
- Microphone permission enabled for the application

For development without Docker:

- Node.js 20 or later
- MySQL 8.4
- Python 3.10 or later for the Whisper service

## Quick start with Docker Compose

1. Download and extract the project ZIP.
2. Open the extracted project folder (the folder containing `docker-compose.yml`) in VS Code.
3. Start Docker Desktop and wait until Docker reports that it is running.
4. Open **Terminal → New Terminal** in VS Code.
5. Run:

   ```bash
   docker compose up --build
   ```

6. Wait for all containers to start. On the first run, faster-whisper downloads its model; this may take several minutes.
7. Open the application:

   **http://localhost:5173**

To stop the application, press `Ctrl + C` in the terminal, then run:

```bash
docker compose down
```

To start it again later:

```bash
docker compose up
```

## Service URLs

| Service | URL |
|---|---|
| Angular application | http://localhost:5173 |
| Express API health check | http://localhost:4000/api/health |
| Whisper service health check | http://localhost:8000/health |
| MySQL | `127.0.0.1:3306` |

## MySQL connection (local development)

The Docker Compose file configures the following development database:

| Setting | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `speech_ai` |
| Username | `speech_user` |
| Password | `speech_password` |
| Root password | `root_password_change_me` |

These credentials are for local development only. Change them before deploying the application or exposing services outside your computer.

The MySQL container creates the `speech_ai` database. The Express API creates the `transcriptions` table when it initializes.

### Connect using MySQL Workbench

1. Open MySQL Workbench.
2. Click the **+** icon next to **MySQL Connections**.
3. Enter a connection name, for example `Procucev Speech AI`.
4. Set **Hostname** to `127.0.0.1`.
5. Set **Port** to `3306`.
6. Set **Username** to `speech_user`.
7. Click **Store in Vault** and enter `speech_password`.
8. Click **Test Connection**, then **OK**.
9. Open the connection.

Run these SQL statements:

```sql
USE speech_ai;

SHOW TABLES;

SELECT *
FROM transcriptions
ORDER BY updated_at DESC;
```

If the table is not present yet, make sure the API container is running and check its logs:

```bash
docker compose logs api
```

## Run services individually (optional)

Docker Compose is the recommended way to run the complete application. For local frontend/backend development without Docker, first ensure MySQL is running and create the database and user:

```sql
CREATE DATABASE speech_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'speech_user'@'localhost'
  IDENTIFIED BY 'speech_password';

GRANT ALL PRIVILEGES ON speech_ai.* TO 'speech_user'@'localhost';

FLUSH PRIVILEGES;
```

### Start the Express API

1. Open a terminal in the project root.
2. Copy the environment example:

   **Windows Command Prompt:**
   ```bat
   copy server\.env.example server\.env
   ```

   **PowerShell:**
   ```powershell
   Copy-Item server/.env.example server/.env
   ```

3. Install dependencies and start the API:

   ```bash
   cd server
   npm install
   npm start
   ```

The API expects MySQL to be available using the settings in `server/.env`.

### Start the Angular frontend

Open a second terminal:

```bash
cd client
npm install
npm start
```

Open **http://localhost:5173**.

### Start the Whisper service

For audio uploads, the Python/FastAPI transcriber must also be running. The Docker Compose setup is the easiest way to run it with its required Python dependencies and model configuration.

## Useful Docker commands

View running containers:

```bash
docker compose ps
```

View logs for all services:

```bash
docker compose logs -f
```

View logs for one service:

```bash
docker compose logs -f api
docker compose logs -f client
docker compose logs -f transcriber
docker compose logs -f db
```

Rebuild after changing source or configuration:

```bash
docker compose up --build
```

Stop containers without deleting database data:

```bash
docker compose down
```

**Warning:** The following command removes the named database volume and permanently deletes locally stored transcription history:

```bash
docker compose down -v
```

## Architecture

```text
Browser
  |
  v
Angular 19 frontend (port 5173)
  |                         \
  v                          v
Express API (port 4000)    FastAPI Whisper (port 8000)
  |
  v
MySQL 8.4 (port 3306)
```

- Angular communicates with Express for transcription history and CRUD operations.
- Express stores transcription records in MySQL.
- Angular sends uploaded audio to the FastAPI service for Whisper transcription.
- Live microphone transcription uses the browser's speech-recognition capability.

## Troubleshooting

### Docker command is not recognized

Install Docker Desktop, restart the terminal, and verify:

```bash
docker --version
docker compose version
```

### Cannot connect to Docker

Start Docker Desktop and wait until it has fully started.

### MySQL is not ready or API cannot connect

Check container status and logs:

```bash
docker compose ps
docker compose logs db
docker compose logs api
```

The API container waits for the MySQL health check. If you changed database credentials, make sure the values in the API service and database service match.

### Port 3306, 4000, 5173, or 8000 is already in use

Stop the other application using that port, or change the corresponding port mapping in `docker-compose.yml`. If you change a host port, use the new port when opening the service from your computer.

### Whisper takes a long time to start

The first startup downloads the selected model (`small`). Keep the transcriber container running and inspect its logs:

```bash
docker compose logs -f transcriber
```

The model runs on CPU with `int8` compute settings in the provided Compose configuration.

### Microphone does not work

- Use Chrome or Edge.
- Allow microphone access when prompted.
- Check the browser's site permissions and Windows microphone privacy settings.
- Deployed sites need HTTPS for browser microphone access.

## Security and deployment notes

- The credentials in `docker-compose.yml` are development defaults. Replace them before deployment.
- Do not commit real secrets or `.env` files to Git.
- Configure production API URLs, CORS origins, database credentials, and HTTPS before deployment.
- Browser microphone access on deployed domains requires HTTPS.
- GitHub publishing and cloud deployment are not performed automatically by this project.

## Assignment deliverables

Before submitting the assignment:

1. Run the application locally and test microphone recognition.
2. Upload an audio file and confirm Whisper returns a transcript.
3. Create, edit, search, and delete transcription records.
4. Confirm records persist after restarting containers.
5. Push the source code to your GitHub repository.
6. Deploy the frontend and backend services to suitable hosting.
7. Email the GitHub repository and deployed application URLs to the contacts specified in the assignment.

## License

See the `LICENSE` file included with the project.
