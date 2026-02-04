# API & MongoDB reference

Base URL when running locally: **http://localhost:8000**

---

## MongoDB (environment variables)

Set these in `backend/.env` (or your deployment env):

| Variable | Description | Example |
|----------|-------------|---------|
| **MONGO_URL** | MongoDB connection string | `mongodb://localhost:27017` or `mongodb+srv://user:pass@cluster.mongodb.net/` |
| **DB_NAME** | Database name | `carprice` |

**Collections used by the app:**

| Collection | Purpose |
|------------|--------|
| **status_checks** | Status check records (POST/GET /api/status) |
| **analytics_events** | Private analytics events (POST /api/analytics/event, export/summary) |
| **events** | Business insights events (POST /events, summary, top_models) |

**Optional env (used by server):**

- `ANALYTICS_EXPORT_KEY` – Secret for `/api/analytics/export.csv` and `/api/analytics/summary` (default: `default-secret-change-me`)
- `IP_HASH_SALT` – Salt for hashing IPs in analytics (optional)
- `CORS_ORIGINS` – Comma-separated origins for CORS (default: `*`)

---

## API endpoints

### Pricing & ML (no prefix)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/price` | Price prediction (make, model, year, mileage_km_num, submodel/trim, etc.) |
| POST | `/price_graph` | Price band chart as PNG (same body as `/price`) |
| POST | `/depreciation` | Depreciation forecast (make, model, year, mileage_km_num, horizon_years, market_price, etc.) |
| GET | `/health/price_model` | ML model loaded or not |
| POST | `/admin/reload_price_model` | Reload ML artifacts |
| GET | `/test_dep` | Depreciation service readiness |
| GET | `/health` | Simple health (pricing app) |

### API router (prefix `/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/` | API root |
| POST | `/api/status` | Create status check (body: `client_name`) |
| GET | `/api/status` | List status checks |
| POST | `/api/analytics/event` | Track analytics event (body: event, timestamp, sessionId, props) |
| GET | `/api/analytics/export.csv` | Export analytics as CSV (query: `key=<ANALYTICS_EXPORT_KEY>`) |
| GET | `/api/analytics/summary` | Analytics summary (query: `key=<ANALYTICS_EXPORT_KEY>`) |
| GET | `/api/health` | Health check (includes MongoDB ping) |

### Business events (no prefix)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/events` | Track business event (search_submit, view_price_graph, etc.) – stored in MongoDB `events` |
| GET | `/events/summary` | Events summary (query: `days=7`, 1–365) |
| GET | `/events/top_models` | Top make/model by event count (query: `days=30`, `limit=20`, `event=search_submit` optional) |

---

## Local use links (click in browser – no POST)

**Backend must be running:** `uvicorn server:app --reload --port 8000` (from `backend/`).

### MongoDB summary – most searched / event counts (GET, no key)

| What you see | Click this link |
|--------------|-----------------|
| **Summary last 7 days** (event counts + top make/model + top searches) | [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7) |
| **Summary last 30 days** (same, 30-day window) | [http://localhost:8000/events/summary?days=30](http://localhost:8000/events/summary?days=30) |
| **Top models last 7 days** (most searched cars, JSON list) | [http://localhost:8000/events/top_models?days=7&limit=20](http://localhost:8000/events/top_models?days=7&limit=20) |
| **Top models last 30 days** (most searched cars) | [http://localhost:8000/events/top_models?days=30&limit=20](http://localhost:8000/events/top_models?days=30&limit=20) |
| **Top models – searches only (30 days)** | [http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit](http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit) |

You get JSON in the browser. No login, no POST – just open the link.

### Other GET links (click in browser)

| Use | Link |
|-----|------|
| App health (incl. MongoDB) | [http://localhost:8000/api/health](http://localhost:8000/api/health) |
| Price model ready? | [http://localhost:8000/health/price_model](http://localhost:8000/health/price_model) |
| API root | [http://localhost:8000/api/](http://localhost:8000/api/) |
| Status checks (list) | [http://localhost:8000/api/status](http://localhost:8000/api/status) |
| Analytics export (need `?key=YOUR_KEY`) | http://localhost:8000/api/analytics/export.csv?key=YOUR_ANALYTICS_EXPORT_KEY |
| Analytics summary (need `?key=YOUR_KEY`) | http://localhost:8000/api/analytics/summary?key=YOUR_ANALYTICS_EXPORT_KEY |

**POST (use Postman/curl/frontend):**

- **Price:** `POST http://localhost:8000/price`
- **Price graph (PNG):** `POST http://localhost:8000/price_graph`
- **Depreciation:** `POST http://localhost:8000/depreciation`
- **Track event:** `POST http://localhost:8000/events`
- **Analytics event:** `POST http://localhost:8000/api/analytics/event`
- **Reload ML model:** `POST http://localhost:8000/admin/reload_price_model`

---

# API & MongoDB reference (ภาษาไทย)

URL ฐานเมื่อรัน locally: **http://localhost:8000**

---

## MongoDB (ตัวแปร environment)

ตั้งค่าใน `backend/.env` (หรือ deployment env ของคุณ):

| Variable | Description | Example |
|----------|-------------|---------|
| **MONGO_URL** | สตริงเชื่อมต่อ MongoDB | `mongodb://localhost:27017` หรือ `mongodb+srv://user:pass@cluster.mongodb.net/` |
| **DB_NAME** | ชื่อฐานข้อมูล | `carprice` |

**Collections ที่แอปใช้:**

| Collection | Purpose |
|------------|--------|
| **status_checks** | บันทึก status check (POST/GET /api/status) |
| **analytics_events** | เหตุการณ์ analytics ส่วนตัว (POST /api/analytics/event, export/summary) |
| **events** | เหตุการณ์ business insights (POST /events, summary, top_models) |

**Env เพิ่มเติม (ใช้โดยเซิร์ฟเวอร์):**

- `ANALYTICS_EXPORT_KEY` – รหัสลับสำหรับ `/api/analytics/export.csv` และ `/api/analytics/summary` (ค่าเริ่มต้น: `default-secret-change-me`)
- `IP_HASH_SALT` – Salt สำหรับ hash IP ใน analytics (ไม่บังคับ)
- `CORS_ORIGINS` – Origins สำหรับ CORS คั่นด้วยจุลภาค (ค่าเริ่มต้น: `*`)

---

## API endpoints

### Pricing & ML (ไม่มี prefix)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/price` | ทำนายราคา (make, model, year, mileage_km_num, submodel/trim ฯลฯ) |
| POST | `/price_graph` | กราฟแถบราคาเป็น PNG (body เหมือน `/price`) |
| POST | `/depreciation` | พยากรณ์ค่าสูญเสีย (make, model, year, mileage_km_num, horizon_years, market_price ฯลฯ) |
| GET | `/health/price_model` | โมเดล ML โหลดหรือยัง |
| POST | `/admin/reload_price_model` | โหลด ML artifacts ใหม่ |
| GET | `/test_dep` | ความพร้อมบริการ depreciation |
| GET | `/health` | Health อย่างง่าย (แอปราคา) |

### API router (prefix `/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/` | API root |
| POST | `/api/status` | สร้าง status check (body: `client_name`) |
| GET | `/api/status` | รายการ status checks |
| POST | `/api/analytics/event` | บันทึกเหตุการณ์ analytics (body: event, timestamp, sessionId, props) |
| GET | `/api/analytics/export.csv` | Export analytics เป็น CSV (query: `key=<ANALYTICS_EXPORT_KEY>`) |
| GET | `/api/analytics/summary` | สรุป analytics (query: `key=<ANALYTICS_EXPORT_KEY>`) |
| GET | `/api/health` | ตรวจสุขภาพ (รวม ping MongoDB) |

### Business events (ไม่มี prefix)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/events` | บันทึก business event (search_submit, view_price_graph ฯลฯ) – เก็บใน MongoDB `events` |
| GET | `/events/summary` | สรุปเหตุการณ์ (query: `days=7`, 1–365) |
| GET | `/events/top_models` | ยี่ห้อ/รุ่นที่ค้นมากสุดตามจำนวนเหตุการณ์ (query: `days=30`, `limit=20`, `event=search_submit` ไม่บังคับ) |

---

## ลิงก์ใช้ local (คลิกในเบราว์เซอร์ – ไม่ต้อง POST)

**ต้องรัน backend ก่อน:** `uvicorn server:app --reload --port 8000` (จาก `backend/`)

### MongoDB summary – ค้นมากสุด / จำนวนเหตุการณ์ (GET ไม่ต้องใช้ key)

| สิ่งที่เห็น | คลิกลิงก์นี้ |
|------------|--------------|
| **สรุป 7 วันล่าสุด** (จำนวนเหตุการณ์ + top make/model + top searches) | [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7) |
| **สรุป 30 วันล่าสุด** (เหมือนกัน ช่วง 30 วัน) | [http://localhost:8000/events/summary?days=30](http://localhost:8000/events/summary?days=30) |
| **Top models 7 วันล่าสุด** (รถที่ค้นมากสุด รายการ JSON) | [http://localhost:8000/events/top_models?days=7&limit=20](http://localhost:8000/events/top_models?days=7&limit=20) |
| **Top models 30 วันล่าสุด** (รถที่ค้นมากสุด) | [http://localhost:8000/events/top_models?days=30&limit=20](http://localhost:8000/events/top_models?days=30&limit=20) |
| **Top models – เฉพาะการค้น (30 วัน)** | [http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit](http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit) |

จะได้ JSON ในเบราว์เซอร์ ไม่ต้องล็อกอิน ไม่ต้อง POST แค่เปิดลิงก์

### GET อื่น ๆ (คลิกในเบราว์เซอร์)

| ใช้ทำ | ลิงก์ |
|-------|------|
| App health (รวม MongoDB) | [http://localhost:8000/api/health](http://localhost:8000/api/health) |
| โมเดลราคาพร้อม? | [http://localhost:8000/health/price_model](http://localhost:8000/health/price_model) |
| API root | [http://localhost:8000/api/](http://localhost:8000/api/) |
| Status checks (รายการ) | [http://localhost:8000/api/status](http://localhost:8000/api/status) |
| Analytics export (ต้องมี `?key=YOUR_KEY`) | http://localhost:8000/api/analytics/export.csv?key=YOUR_ANALYTICS_EXPORT_KEY |
| Analytics summary (ต้องมี `?key=YOUR_KEY`) | http://localhost:8000/api/analytics/summary?key=YOUR_ANALYTICS_EXPORT_KEY |

**POST (ใช้ Postman/curl/frontend):**

- **ราคา:** `POST http://localhost:8000/price`
- **กราฟราคา (PNG):** `POST http://localhost:8000/price_graph`
- **ค่าสูญเสีย:** `POST http://localhost:8000/depreciation`
- **บันทึกเหตุการณ์:** `POST http://localhost:8000/events`
- **เหตุการณ์ analytics:** `POST http://localhost:8000/api/analytics/event`
- **โหลดโมเดล ML ใหม่:** `POST http://localhost:8000/admin/reload_price_model`
