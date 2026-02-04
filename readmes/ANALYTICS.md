# Business Analytics Guide

A short guide to the analytics we collect and how to use them for insights. Everything is stored locally in MongoDB; no personal data or external services.

---

## What we track

When people use the car price app we record **anonymous events** (no names, no IPs):

| Event | When it’s recorded |
|-------|---------------------|
| **search_submit** | User clicks “Get Price Estimate” (we store the car they searched and the price result) |
| **view_price_graph** | User clicks “View Price Graph” |
| **view_depreciation** | User clicks “View Depreciation” |
| **copy_result** | User clicks “Copy” on a result |
| **page_view** | User loads a page |

Each event has a timestamp, event type, and (for searches) the vehicle (make, model, year, mileage) and the estimate (market price, confidence, sample size). We use a random session ID from the browser, not anything that identifies the person.

---

## How to view the data

You have two options: **quick numbers via API** or **deeper analysis in MongoDB**.

### Option 1: Quick numbers (API)

With the app running (e.g. after `docker compose up`), open a browser or use a terminal:

- **Summary for the last 7 days** (counts by event type, top make/model):  
  [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7)

- **Top models searched (e.g. last 30 days):**  
  [http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit](http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit)

You can change `days` and `limit` in the URL as needed. The summary returns something like: `event_counts` (e.g. `search_submit: 10`, `page_view: 5`), `top_make_model`, and `top_searches`.

### Option 2: Deeper analysis (MongoDB Compass)

For custom reports and trends:

1. Open **MongoDB Compass** and connect to: `mongodb://localhost:27017`
2. Open the database **`carprice`** and the collection **`events`**.
3. Use the example queries below (or adapt them) in the Compass aggregation pipeline.

**What each event document looks like (simplified):**

- `ts` – when it happened  
- `event` – type (e.g. `search_submit`, `view_price_graph`)  
- `session_id` – anonymous session (UUID)  
- `vehicle` – make, model, trim, year, mileage (for searches)  
- `result` – market_price, confidence, sample_size, etc. (for searches)

---

## Example questions and queries

These run in MongoDB Compass → `carprice` → `events` → Aggregations.

### 1. Top models searched (last 7 days)

Pipeline stages:

```json
[
  { "$match": { "event": "search_submit", "vehicle": { "$exists": true, "$ne": null }, "ts": { "$gte": { "$subtract": [ "$$NOW", 7*24*60*60*1000 ] } } } },
  { "$group": { "_id": { "make": "$vehicle.make", "model": "$vehicle.model" }, "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } },
  { "$limit": 20 },
  { "$project": { "_id": 0, "make": "$_id.make", "model": "$_id.model", "searches": "$count" } }
]
```

*(In Compass you can use “Date” for `ts` instead of `$$NOW` if you prefer: e.g. `ts: { $gte: new Date("2026-01-23") }`.)*

### 2. How often do people use Graph vs Depreciation? (last 30 days)

```json
[
  { "$match": { "event": { "$in": ["view_price_graph", "view_depreciation"] }, "ts": { "$gte": { "$subtract": [ "$$NOW", 30*24*60*60*1000 ] } } } },
  { "$group": { "_id": "$event", "count": { "$sum": 1 } } },
  { "$project": { "_id": 0, "feature": "$_id", "clicks": "$count" } }
]
```

### 3. Event counts by type (last 30 days)

```json
[
  { "$match": { "ts": { "$gte": { "$subtract": [ "$$NOW", 30*24*60*60*1000 ] } } } },
  { "$group": { "_id": "$event", "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } },
  { "$project": { "_id": 0, "event_type": "$_id", "total_count": "$count" } }
]
```

### 4. Low-confidence searches (where we might need more data)

Shows make/model combinations where the estimate had confidence below 0.5:

```json
[
  { "$match": { "event": "search_submit", "result.confidence": { "$lt": 0.5 }, "vehicle": { "$exists": true, "$ne": null } } },
  { "$group": { "_id": { "make": "$vehicle.make", "model": "$vehicle.model" }, "count": { "$sum": 1 }, "avg_confidence": { "$avg": "$result.confidence" } } },
  { "$sort": { "count": -1 } },
  { "$limit": 20 },
  { "$project": { "_id": 0, "make": "$_id.make", "model": "$_id.model", "low_confidence_searches": "$count", "average_confidence": { "$round": ["$avg_confidence", 2] } } }
]
```

You can copy these into Compass and adjust the time window or limits. More advanced examples (daily trends, average confidence by make, etc.) can be added later if needed.

---

## How to check it’s working

1. **Generate some events:** Open the app at [http://localhost:3000](http://localhost:3000). Load the page (that’s a `page_view`), then do a search (“Get Price Estimate”) and optionally click “View Price Graph” or “View Depreciation” or “Copy”.
2. **Check the API:** Open [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7). You should see `event_counts` with at least `page_view` and `search_submit` if you did those steps.
3. **Check MongoDB (optional):** In Compass, connect to `mongodb://localhost:27017` → database **`carprice`** → collection **`events`**. New documents should appear shortly after you use the app.

**If nothing appears:** Make sure the frontend (port 3000) and backend (port 8000) are running and MongoDB is up (`docker compose ps`). In the browser, open DevTools → Network and look for requests to `/events` returning 200. Database name must be `carprice` and collection `events`.

---

## Privacy and where it runs

- **No personal data:** We don’t store IP addresses or any identifiers; only a random session ID in the browser.
- **Local only:** Data stays in your MongoDB; nothing is sent to external analytics.
- **Already wired up:** The frontend sends events to the backend; the backend writes to MongoDB. No extra setup is required for basic use.

---

## Quick reference

| What | Where |
|------|--------|
| Connection | `mongodb://localhost:27017` |
| Database | `carprice` |
| Collection | `events` |
| Summary (last N days) | `GET http://localhost:8000/events/summary?days=7` |
| Top models | `GET http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit` |

If you need more report ideas or new API endpoints, we can add them on top of this.

---

# Business Analytics Guide (ภาษาไทย)

คู่มือสั้น ๆ เกี่ยวกับ analytics ที่เรารวบรวมและวิธีใช้เพื่อดูข้อมูลเชิงลึก เก็บทั้งหมดใน MongoDB แบบ local ไม่มีข้อมูลส่วนตัวหรือบริการภายนอก

---

## สิ่งที่เราติดตาม

เมื่อผู้ใช้ใช้แอปประมาณราคารถ เราบันทึก **เหตุการณ์ไม่ระบุตัวตน** (ไม่มีชื่อ ไม่มี IP):

| Event | เมื่อไหร่ที่บันทึก |
|-------|---------------------|
| **search_submit** | ผู้ใช้กด "Get Price Estimate" (เราเก็บรถที่ค้นและผลราคา) |
| **view_price_graph** | ผู้ใช้กด "View Price Graph" |
| **view_depreciation** | ผู้ใช้กด "View Depreciation" |
| **copy_result** | ผู้ใช้กด "Copy" บนผลลัพธ์ |
| **page_view** | ผู้ใช้โหลดหน้า |

แต่ละเหตุการณ์มี timestamp ประเภทเหตุการณ์ และ (สำหรับการค้น) ยานพาหนะ (make, model, year, mileage) กับประมาณการ (market price, confidence, sample size) เราใช้ session ID สุ่มจากเบราว์เซอร์ ไม่มีอะไรที่ระบุตัวบุคคล

---

## วิธีดูข้อมูล

มีสองทาง: **ตัวเลขด่วนผ่าน API** หรือ **วิเคราะห์ลึกใน MongoDB**

### ทางที่ 1: ตัวเลขด่วน (API)

เมื่อแอปรันอยู่ (เช่น หลัง `docker compose up`) เปิดเบราว์เซอร์หรือใช้เทอร์มินัล:

- **สรุป 7 วันล่าสุด** (จำนวนตามประเภทเหตุการณ์ top make/model):  
  [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7)

- **Top models ที่ค้น (เช่น 30 วันล่าสุด):**  
  [http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit](http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit)

เปลี่ยน `days` และ `limit` ใน URL ได้ตามต้องการ สรุปจะคืนค่าประมาณว่า: `event_counts` (เช่น `search_submit: 10`, `page_view: 5`), `top_make_model`, และ `top_searches`

### ทางที่ 2: วิเคราะห์ลึก (MongoDB Compass)

สำหรับรายงานและเทรนด์ที่กำหนดเอง:

1. เปิด **MongoDB Compass** และเชื่อมต่อที่: `mongodb://localhost:27017`
2. เปิดฐานข้อมูล **`carprice`** และ collection **`events`**
3. ใช้ query ตัวอย่างด้านล่าง (หรือปรับ) ใน aggregation pipeline ของ Compass

**เอกสารเหตุการณ์แต่ละรายมีลักษณะอย่างไร (แบบย่อ):**

- `ts` – เมื่อไหร่ที่เกิด  
- `event` – ประเภท (เช่น `search_submit`, `view_price_graph`)  
- `session_id` – session ไม่ระบุตัวตน (UUID)  
- `vehicle` – make, model, trim, year, mileage (สำหรับการค้น)  
- `result` – market_price, confidence, sample_size ฯลฯ (สำหรับการค้น)

---

## ตัวอย่างคำถามและ query

รันใน MongoDB Compass → `carprice` → `events` → Aggregations

### 1. Top models ที่ค้น (7 วันล่าสุด)

Pipeline stages:

```json
[
  { "$match": { "event": "search_submit", "vehicle": { "$exists": true, "$ne": null }, "ts": { "$gte": { "$subtract": [ "$$NOW", 7*24*60*60*1000 ] } } } },
  { "$group": { "_id": { "make": "$vehicle.make", "model": "$vehicle.model" }, "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } },
  { "$limit": 20 },
  { "$project": { "_id": 0, "make": "$_id.make", "model": "$_id.model", "searches": "$count" } }
]
```

*(ใน Compass ใช้ "Date" สำหรับ `ts` แทน `$$NOW` ได้ถ้าต้องการ: เช่น `ts: { $gte: new Date("2026-01-23") }`.)*

### 2. คนใช้ Graph vs Depreciation บ่อยแค่ไหน? (30 วันล่าสุด)

```json
[
  { "$match": { "event": { "$in": ["view_price_graph", "view_depreciation"] }, "ts": { "$gte": { "$subtract": [ "$$NOW", 30*24*60*60*1000 ] } } } },
  { "$group": { "_id": "$event", "count": { "$sum": 1 } } },
  { "$project": { "_id": 0, "feature": "$_id", "clicks": "$count" } }
]
```

### 3. จำนวนเหตุการณ์ตามประเภท (30 วันล่าสุด)

```json
[
  { "$match": { "ts": { "$gte": { "$subtract": [ "$$NOW", 30*24*60*60*1000 ] } } } },
  { "$group": { "_id": "$event", "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } },
  { "$project": { "_id": 0, "event_type": "$_id", "total_count": "$count" } }
]
```

### 4. การค้นที่ confidence ต่ำ (ที่อาจต้องมีข้อมูลเพิ่ม)

แสดงคู่ make/model ที่ประมาณการมี confidence ต่ำกว่า 0.5:

```json
[
  { "$match": { "event": "search_submit", "result.confidence": { "$lt": 0.5 }, "vehicle": { "$exists": true, "$ne": null } } },
  { "$group": { "_id": { "make": "$vehicle.make", "model": "$vehicle.model" }, "count": { "$sum": 1 }, "avg_confidence": { "$avg": "$result.confidence" } } },
  { "$sort": { "count": -1 } },
  { "$limit": 20 },
  { "$project": { "_id": 0, "make": "$_id.make", "model": "$_id.model", "low_confidence_searches": "$count", "average_confidence": { "$round": ["$avg_confidence", 2] } } }
]
```

คัดลอกไปวางใน Compass แล้วปรับช่วงเวลาหรือ limit ได้ ตัวอย่างขั้นสูงกว่า (เทรนด์รายวัน confidence เฉลี่ยตาม make ฯลฯ) เพิ่มได้ภายหลังถ้าต้องการ

---

## วิธีเช็คว่าทำงาน

1. **สร้างเหตุการณ์:** เปิดแอปที่ [http://localhost:3000](http://localhost:3000) โหลดหน้า (นั่นคือ `page_view`) แล้วค้น ("Get Price Estimate") และถ้าต้องการกด "View Price Graph" หรือ "View Depreciation" หรือ "Copy"
2. **เช็ค API:** เปิด [http://localhost:8000/events/summary?days=7](http://localhost:8000/events/summary?days=7) ควรเห็น `event_counts` อย่างน้อย `page_view` และ `search_submit` ถ้าทำขั้นตอนนั้น
3. **เช็ค MongoDB (ถ้าต้องการ):** ใน Compass เชื่อมต่อ `mongodb://localhost:27017` → ฐานข้อมูล **`carprice`** → collection **`events`** เอกสารใหม่ควรโผล่ไม่นานหลังใช้แอป

**ถ้าไม่มีอะไรโผล่:** ตรวจว่า frontend (พอร์ต 3000) และ backend (พอร์ต 8000) รันอยู่ และ MongoDB ทำงาน (`docker compose ps`) ในเบราว์เซอร์ เปิด DevTools → Network แล้วดู request ไป `/events` ที่คืน 200 ชื่อฐานข้อมูลต้องเป็น `carprice` และ collection เป็น `events`

---

## ความเป็นส่วนตัวและที่รัน

- **ไม่มีข้อมูลส่วนตัว:** เราไม่เก็บ IP หรือตัวระบุใด ๆ มีแค่ session ID สุ่มในเบราว์เซอร์
- **Local เท่านั้น:** ข้อมูลอยู่ที่ MongoDB ของคุณ ไม่ส่งไป analytics ภายนอก
- **ต่อสายไว้แล้ว:** Frontend ส่งเหตุการณ์ไป backend; backend เขียนลง MongoDB ไม่ต้องตั้งค่าเพิ่มสำหรับการใช้งานพื้นฐาน

---

## สรุปสั้น ๆ

| อะไร | ที่ไหน |
|------|--------|
| Connection | `mongodb://localhost:27017` |
| Database | `carprice` |
| Collection | `events` |
| Summary (N วันล่าสุด) | `GET http://localhost:8000/events/summary?days=7` |
| Top models | `GET http://localhost:8000/events/top_models?days=30&limit=20&event=search_submit` |

ถ้าต้องการไอเดียรายงานเพิ่มหรือ API endpoints ใหม่ เราสามารถเพิ่มบนพื้นฐานนี้ได้
