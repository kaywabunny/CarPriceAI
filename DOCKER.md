# Running the Project with Docker

This guide explains how to start the **CarPrice** app with Docker and how to reach the website and API endpoints.

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- Ensure Docker is running before building or starting.

---

## Quick Start

From the **project root** (where `docker-compose.yml` lives):

```bash
# Build and start all services (uses cache; fast after first run)
docker compose up -d --build

# Or on Windows PowerShell, use the helper script:
.\build-and-start.ps1
```

**Full rebuild** (no cache; use after big dependency or Dockerfile changes):

```bash
# Bash / Linux / macOS
docker compose build --no-cache backend frontend
docker compose up -d

# PowerShell (script)
.\build-and-start.ps1 -Rebuild
```

---

## Services and Ports

| Service   | Container name     | Host port | Description                          |
|----------|---------------------|-----------|--------------------------------------|
| **Frontend** | carprice-frontend | **3000** → 80 | React app (nginx); **this is the website** |
| **Backend**  | carprice-backend  | **8000**      | FastAPI server (price API, analytics, health) |
| **MongoDB**  | carprice-mongo    | 27017        | Database for analytics and status    |

---

## How to Reach the Website

- **Website (UI):**  
  **http://localhost:3000**

  Open this in your browser. The frontend is built with React and served by nginx. It talks to the backend at `http://localhost:8000` (see `REACT_APP_API_BASE_URL` in the frontend Dockerfile build args).

- **Backend API base:**  
  **http://localhost:8000**

  All API endpoints (including pricing) are under this base URL.

---

## Main API Endpoints

### Pricing (ML)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/price` | Get price estimate for one vehicle (single or multiple mileages). **Main endpoint used by the website.** |
| `POST` | `/price_graph` | Get price bands + optional PNG chart for one vehicle. |
| `GET`  | `/health/price_model` | Check if the ML price model is loaded (200 = ready, 503 = not loaded). |
| `POST` | `/admin/reload_price_model` | Reload ML model artifacts from disk (e.g. after retraining). |

### Depreciation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/depreciation` | Get depreciation projection for a vehicle. |
| `GET`  | `/test_dep` | Simple “depreciation endpoint is ready” check. |

### Health and status

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Basic health check (`{"status": "healthy"}`). |
| `GET`  | `/api/health` | API health (same idea, under `/api` prefix). |
| `GET`  | `/api/status` | List status checks (MongoDB). |
| `POST` | `/api/status` | Create a status check. |

### Analytics (backend only; no UI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analytics/event` | Ingest an analytics event (used by frontend). |
| `GET`  | `/api/analytics/export.csv` | Export events as CSV. Requires query `?key=<ANALYTICS_EXPORT_KEY>`. |
| `GET`  | `/api/analytics/summary` | Analytics summary. Requires query `?key=<ANALYTICS_EXPORT_KEY>`. |

### Business events (optional)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events` | Ingest a business/insight event. |
| `GET`  | `/events/summary` | Events summary (key required). |
| `GET`  | `/events/top_models` | Top models (key required). |

---

## Example: Calling the Price API

**Single mileage**

```bash
curl -X POST http://localhost:8000/price \
  -H "Content-Type: application/json" \
  -d '{"make":"TOYOTA","model":"CAMRY","year":2020,"mileage_km_num":50000,"submodel":null}'
```

**Multiple mileages** (comma-separated)

```bash
curl -X POST http://localhost:8000/price \
  -H "Content-Type: application/json" \
  -d '{"make":"TOYOTA","model":"CAMRY","year":2020,"mileage_km_num":"30000,60000,100000","submodel":null}'
```

Response includes `green_low`, `green_median`, `green_high`, `yellow`, `red_low`, `red_median`, `red_high`, `confidence`, `sample_size`, `estimate_basis`, etc.

---

## Environment Variables (Docker)

Backend (in `docker-compose.yml`):

| Variable | Purpose |
|----------|---------|
| `MONGO_URL` | MongoDB connection (default `mongodb://mongo:27017`). |
| `DB_NAME` | Database name (default `carprice`). |
| `ANALYTICS_EXPORT_KEY` | Secret for `/api/analytics/export.csv` and summary (default `dev-key`). |

Frontend (build-time):

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_BASE_URL` | Backend base URL. Set in compose as `http://localhost:8000` so the browser can call the API when you use the site at `http://localhost:3000`. |

To use a different backend URL (e.g. for production), change the `args` for the frontend service and rebuild the frontend image.

---

## Useful Docker Commands

```bash
# Start (detached)
docker compose up -d

# View logs (all services)
docker compose logs -f

# Logs for one service
docker compose logs -f backend
docker compose logs -f frontend

# Stop
docker compose down

# Stop and remove volumes (e.g. reset MongoDB data)
docker compose down -v
```

---

## Troubleshooting

1. **Website at 3000 doesn’t load**
   - Confirm containers are up: `docker compose ps`.
   - Check frontend logs: `docker compose logs frontend`.

2. **Price requests fail or 503**
   - Check backend logs: `docker compose logs backend`.
   - Call `GET http://localhost:8000/health/price_model`. If 503, the ML model failed to load (check that `backend/model/price_quantiles_v3/` has the required `.pkl` and config files).

3. **“Connection refused” to backend from browser**
   - Ensure you’re using `http://localhost:8000` (or whatever host/port the frontend is configured with). From the same machine, `localhost` is correct; in other setups you may need to set `REACT_APP_API_BASE_URL` and rebuild the frontend.

4. **Full reset**
   - `docker compose down -v`
   - `docker compose build --no-cache backend frontend`
   - `docker compose up -d`

---

## Summary

| What you want | URL or command |
|----------------|----------------|
| **Open the website** | http://localhost:3000 |
| **API base** | http://localhost:8000 |
| **Price estimate (API)** | `POST http://localhost:8000/price` |
| **Check ML model** | `GET http://localhost:8000/health/price_model` |
| **Start with Docker** | `docker compose up -d --build` (or `.\build-and-start.ps1`) |
| **Stop** | `docker compose down` |
