# CarPrice

Car price estimation app: ML-backed price bands (green/yellow/red), depreciation projections, and a React frontend.

---

## Quick start with Docker

1. **Prerequisites:** Docker Desktop (or Docker Engine + Docker Compose) running.

2. **From the project root:**
   ```bash
   docker compose up -d --build
   ```
   Or on Windows PowerShell: `.\build-and-start.ps1`

3. **Open the app in your browser.**  
   The frontend runs on **port 3000**. In your browser’s address bar go to:
   - **Website (UI):** [http://localhost:3000](http://localhost:3000)  
   Use this to search cars and see price estimates.

4. **API (optional).**  
   The backend runs on **port 8000**. For direct API calls:
   - **API base:** [http://localhost:8000](http://localhost:8000)  
   Main endpoint: `POST /price` (make, model, year, mileage_km_num, optional submodel).

For **detailed Docker instructions, ports, and all API endpoints**, see **[DOCKER.md](./DOCKER.md)**.

---

## Project layout

- **`frontend/`** — React app (port 3000 when run via Docker).
- **`backend/`** — FastAPI server (port 8000): `/price`, `/price_graph`, `/depreciation`, `/api/*`, health.
- **`backend/model/price_quantiles_v3/`** — ML artifacts (LightGBM quantile models, feature config).
- **`training/`** — Scripts for data cleaning and model retraining; see [training/README.md](training/README.md) (points to readmes).
- **`readmes/`** — Project documentation (analytics, API, frontend notices, training guides, PRD, etc.). Main startup docs stay at root: [README.md](README.md) and [DOCKER.md](DOCKER.md).

---

## Stopping services

```bash
docker compose down
```

See **[DOCKER.md](./DOCKER.md)** for more commands, troubleshooting, and endpoint reference.

---

# CarPrice (ภาษาไทย)

แอปประมาณราคารถ: แถบราคา (เขียว/เหลือง/แดง) จาก ML การประมาณค่าสูญเสีย และ frontend ใช้ React

---

## เริ่มต้นแบบรวดด้วย Docker

1. **สิ่งที่ต้องมี:** เปิด Docker Desktop (หรือ Docker Engine + Docker Compose) ให้ทำงานอยู่

2. **ที่โฟลเดอร์รากของโปรเจกต์:**
   ```bash
   docker compose up -d --build
   ```
   หรือบน Windows PowerShell: `.\build-and-start.ps1`

3. **เปิดแอปในเบราว์เซอร์**  
   หน้า frontend รันที่ **พอร์ต 3000** ในแถบที่อยู่ของเบราว์เซอร์ไปที่:
   - **เว็บ (UI):** [http://localhost:3000](http://localhost:3000)  
   ใช้หน้านี้ค้นหารถและดูประมาณราคา

4. **API (ถ้าต้องการ)**  
   backend รันที่ **พอร์ต 8000** สำหรับเรียก API โดยตรง:
   - **API base:** [http://localhost:8000](http://localhost:8000)  
   Endpoint หลัก: `POST /price` (make, model, year, mileage_km_num, submodel ถ้ามี)

คำแนะนำ Docker รายละเอียด พอร์ต และ API endpoints ทั้งหมด ดู **[DOCKER.md](./DOCKER.md)**

---

## โครงสร้างโปรเจกต์

- **`frontend/`** — แอป React (พอร์ต 3000 เมื่อรันผ่าน Docker)
- **`backend/`** — เซิร์ฟเวอร์ FastAPI (พอร์ต 8000): `/price`, `/price_graph`, `/depreciation`, `/api/*`, health
- **`backend/model/price_quantiles_v3/`** — ชิ้นส่วน ML (โมเดล LightGBM quantile, feature config)
- **`training/`** — สคริปต์ทำความสะอาดข้อมูลและเทรนโมเดลใหม่ ดู [training/README.md](training/README.md) (ชี้ไปที่ readmes)
- **`readmes/`** — เอกสารโปรเจกต์ (analytics, API, frontend notices, คู่มือ training, PRD ฯลฯ) เอกสารเริ่มต้นอยู่ที่ราก: [README.md](README.md) และ [DOCKER.md](DOCKER.md)

---

## หยุดบริการ

```bash
docker compose down
```

คำสั่งเพิ่มเติม การแก้ปัญหา และรายการ endpoint ดู **[DOCKER.md](./DOCKER.md)**
