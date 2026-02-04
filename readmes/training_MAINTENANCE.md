## ML Maintenance Guide

This document explains how to **maintain, retrain and safely update** the ML models and data pipeline for this project.

**In this repo:** Data/training scripts live in `training/`. The API and inference code live in `backend/ml/`. Model artifacts are in `backend/model/price_quantiles_v3/`. Run commands from the **repo root** and use paths like `training/clean_data_v3.py`, `data/cleaned_listings_v3`, `backend/model/price_quantiles_v3`.

---

## 1. Key Components & Files

- **API & orchestration**
  - `backend/ml/entry.py`: FastAPI app, exposes `/price`, `/price_graph`, `/depreciation`, health endpoints. Loads the price model automatically on startup (no manual reload needed).
  - `backend/ml/price_helper.py`: Loads quantile models, builds features, applies business logic (bands, caps, confidence).
  - `backend/ml/depreciation.py`: Depreciation estimator (uses MySQL and `.env`).
- **Data pipeline**
  - `training/clean_data_v3.py`: Pulls raw data from MySQL, cleans it, and writes `cleaned_listings_v3.parquet` / `.csv`.
  - MySQL table (default): `car_listings_master` (or as passed via `--table`).
- **Training**
  - `training/train_model_v3.py`: Trains LightGBM quantile models and writes artifacts.
- **Artifacts**
  - `backend/model/price_quantiles_v3/`:
    - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
    - `feature_config.json`
    - `group_medians.csv`
    - `metrics.json`
  - `artifacts/`: Depreciation model assets and curves (if used).
- **Environment & infra**
  - `.env` / `training/env.template`: MySQL connection settings. Copy `env.template` to `.env` in repo root.
  - `backend/requirements.txt`: Python dependencies.
  - `backend/Dockerfile`, `docker-compose.yml`: Container and deployment setup.

---

## 2. Required Data Fields & Formats

### 2.1 Raw listings table (MySQL)

`clean_data_v3.py` expects at least these columns in the **source table** (e.g. `car_listings_master`):

- **Identification & metadata**
  - `id`: Unique row identifier.
  - `sourceName`, `sourceType`, `sourceUrl`, `externalId`: Source tracking.
  - `dateRecorded`, `created_at`, `updated_at`: Timestamps (any reasonable datetime format).
- **Core vehicle fields**
  - `brand`: Car brand (e.g. `"Toyota"`).
  - `model`: Car model (e.g. `"Yaris"`).
  - `submodel`: Trim / submodel (e.g. `"1.5 E"`).
  - `year`: Model year (numeric, can be stringified; converted to `int`).
  - `gear`: Transmission (e.g. `"AT"`, `"MT"`).
  - `engine`: Engine / displacement (free text).
  - `color`: Exterior color.
- **Target & numeric fields**
  - `price`: Listing price in THB. Should be within **5,000–15,000,000** for inclusion.
  - `mileage`: Odometer in km (can be null; negative -> treated as missing).

**Formatting / cleaning rules (implemented in `clean_data_v3.py`):**

- Text columns (`brand`, `model`, `submodel`, `gear`, `engine`, `color`, etc.) are:
  - Stripped, whitespace-normalized, and **uppercased**.
  - Missing/empty -> `"UNKNOWN"`.
- `year` is coerced to `int` and must be in \[1990, current_year + 1\].
- `price` is coerced to float and clipped to \[5,000, 15,000,000\].
- `mileage`:
  - Negative → `NaN`.
  - Missing imputed by median per `(brand, model, year)` if enough data, else global median, else `100,000`.
  - Clipped to \[0, 800,000\].

### 2.2 Cleaned training data (`cleaned_listings_v3.*`)

After running `clean_data_v3.py`, the cleaned dataset includes at least:

- **Core categorical**: `brand`, `model`, `submodel`, `gear`, `engine`, `color`
- **Core numeric**: `year`, `price`, `mileage`
- **Engineered**:
  - `age`: `now_year - year`, clipped at 0.
  - `mileage_per_year`: `mileage / age` (fallback to `mileage` if `age == 0`).
  - `mileage_missing`: `0/1` flag where original mileage was missing.

This is the **expected input** for `train_model_v3.py`.

---

## 3. How to Refresh Data

1. **Ensure MySQL is up to date**
   - New listings must be inserted into the source table (`car_listings_master` or configured table).
2. **Run data cleaning**
   - From **repo root**:
     ```bash
     python training/clean_data_v3.py --table car_listings_master --out data/cleaned_listings_v3
     ```
   - This generates:
     - `data/cleaned_listings_v3.parquet`
     - `data/cleaned_listings_v3.csv`
3. **Quick validation checklist**
   - File sizes and row counts increase as expected.
   - Spot-check a few rows for:
     - Reasonable `year`, `price`, `mileage`, `age`, `mileage_per_year`.
     - No obviously broken brands/models.

---

## 4. How to Retrain Price Models

1. **Prerequisites**
   - Latest cleaned data: `data/cleaned_listings_v3.parquet` or `.csv`.
   - Virtualenv activated and dependencies installed:
     ```bash
     pip install -r backend/requirements.txt
     ```
   - For training you also need: `pandas`, `numpy`, `lightgbm`, `scikit-learn` (and `joblib`).
2. **Run training script**
   - From **repo root**:
     ```bash
     python training/train_model_v3.py --in data/cleaned_listings_v3 --out backend/model/price_quantiles_v3
     ```
   - Script will:
     - Validate required columns: `["price","brand","model","year","age","mileage","mileage_per_year"]`.
     - Create engineered features (`log_mileage`, `sqrt_mileage`, `age_x_mileage`, `mileage_per_age`).
     - Train LightGBM quantile models (`q20`, `q50`, `q80`) on `log(price)`.
     - Compute group medians by `(brand`, `model`, `year)`.
     - Auto-tune coverage of quantile bands.
     - Save to `backend/model/price_quantiles_v3/`:
       - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
       - `group_medians.csv`
       - `feature_config.json`
       - `metrics.json`
       - `val_preds.csv`
3. **Check training quality**
   - Open `backend/model/price_quantiles_v3/metrics.json` and review:
     - `WAPE@q50_after`, `MAPE@q50_after`
     - `coverage_after` vs `coverage_target`
   - Optionally inspect `val_preds.csv` for a few random rows.

---

## 5. Promoting New Models to Production

1. **Backup current model directory**
   - Copy existing artifacts:
     ```bash
     cp -r backend/model/price_quantiles_v3 backend/model/price_quantiles_v3_backup_YYYYMMDD
     ```
2. **Replace artifacts**
   - Run training with `--out backend/model/price_quantiles_v3` so new artifacts are written there, or copy from a staging folder.
   - Required files (must exist):
     - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
     - `feature_config.json`
     - `group_medians.csv` (optional but recommended)
     - `metrics.json`
3. **Pick up the new model**
   - The API loads the price model automatically on startup.
   - After replacing artifacts, either:
     - **Restart** the service or container so the new model is loaded on next startup, or
     - Call the reload endpoint:
       ```bash
       curl -X POST http://localhost:8000/admin/reload_price_model
       ```
4. **Sanity test**
   - Call `/health/price_model` and `/price` for a few typical cases; verify band ordering and sensible confidence/estimate_basis.

---

## 6. Feature & Schema Changes

- **Inference** (`backend/ml/price_helper.py`): Extend `_add_features` and keep in sync with `feature_config.json`.
- **Training** (`training/train_model_v3.py`): Modify `add_features` and `cat_cols`/`num_cols` to match.
- **Important**: `feature_config.json` defines the exact feature order and types at inference. Any change in training features must be reflected there and in `_add_features`.

---

## 7. Depreciation Model Maintenance

- `.env` must contain valid MySQL connection details. `backend/ml/depreciation.py` reads from the MySQL table.
- Refresh data and follow any retrain procedure for depreciation artifacts under `artifacts/`; ensure they are referenced correctly.

---

## 8. Routine Maintenance Checklist

- Confirm `/health` and `/health/price_model` are OK; monitor logs and metrics.
- Before deploying a new model: refresh data → retrain → replace artifacts → restart or call reload → smoke-test endpoints.

---

## 9. How to Add a New Parsing Format / Source

Map source fields to the canonical schema; insert into MySQL (preferred); run `training/clean_data_v3.py`. If writing directly to CSV/Parquet, ensure required columns match section 2.2 and point `--in` in `train_model_v3.py` to that file prefix.

---

## คู่มือบำรุงรักษา ML (ภาษาไทย)

เอกสารนี้อธิบายวิธี **บำรุงรักษา เทรนใหม่ และอัปเดตอย่างปลอดภัย** โมเดล ML และ data pipeline ของโปรเจกต์นี้

**ใน repo นี้:** สคริปต์ข้อมูล/เทรนอยู่ที่ `training/` โค้ด API และ inference อยู่ที่ `backend/ml/` ชิ้นส่วนโมเดลอยู่ที่ `backend/model/price_quantiles_v3/` รันคำสั่งจาก **repo root** และใช้ path แบบ `training/clean_data_v3.py`, `data/cleaned_listings_v3`, `backend/model/price_quantiles_v3`

---

## 1. ส่วนประกอบและไฟล์หลัก

- **API และ orchestration**
  - `backend/ml/entry.py`: แอป FastAPI เปิด endpoint `/price`, `/price_graph`, `/depreciation`, health โหลดโมเดลราคาอัตโนมัติเมื่อสตาร์ท (ไม่ต้อง reload เอง)
  - `backend/ml/price_helper.py`: โหลดโมเดล quantile สร้าง features ใช้ business logic (bands, caps, confidence)
  - `backend/ml/depreciation.py`: ประมาณค่าสูญเสีย (ใช้ MySQL และ `.env`)
- **Data pipeline**
  - `training/clean_data_v3.py`: ดึงข้อมูลดิบจาก MySQL ทำความสะอาด แล้วเขียน `cleaned_listings_v3.parquet` / `.csv`
  - ตาราง MySQL (ค่าเริ่มต้น): `car_listings_master` (หรือตามที่ส่งผ่าน `--table`)
- **Training**
  - `training/train_model_v3.py`: เทรนโมเดล LightGBM quantile และเขียน artifacts
- **Artifacts**
  - `backend/model/price_quantiles_v3/`:
    - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
    - `feature_config.json`
    - `group_medians.csv`
    - `metrics.json`
  - `artifacts/`: ชิ้นส่วนโมเดล depreciation และ curves (ถ้ามีใช้)
- **Environment และ infra**
  - `.env` / `training/env.template`: การตั้งค่าเชื่อมต่อ MySQL คัดลอก `env.template` ไปเป็น `.env` ใน repo root
  - `backend/requirements.txt`: Python dependencies
  - `backend/Dockerfile`, `docker-compose.yml`: การตั้งค่า container และ deployment

---

## 2. ฟิลด์ข้อมูลและรูปแบบที่ต้องมี

### 2.1 ตารางรายการดิบ (MySQL)

`clean_data_v3.py` คาดว่ามีคอลัมน์อย่างน้อยเหล่านี้ใน **ตารางต้นทาง** (เช่น `car_listings_master`):

- **Identification และ metadata**
  - `id`: ตัวระบุแถวที่ไม่ซ้ำ
  - `sourceName`, `sourceType`, `sourceUrl`, `externalId`: ติดตามแหล่งที่มา
  - `dateRecorded`, `created_at`, `updated_at`: Timestamp (รูปแบบ datetime ที่สมเหตุสมผล)
- **ฟิลด์รถหลัก**
  - `brand`: ยี่ห้อรถ (เช่น `"Toyota"`)
  - `model`: รุ่นรถ (เช่น `"Yaris"`)
  - `submodel`: ระดับ trim / submodel (เช่น `"1.5 E"`)
  - `year`: ปีรุ่น (ตัวเลข อาจเป็น string; แปลงเป็น `int`)
  - `gear`: เกียร์ (เช่น `"AT"`, `"MT"`)
  - `engine`: เครื่องยนต์ / ความจุ (ข้อความอิสระ)
  - `color`: สีภายนอก
- **ฟิลด์เป้าหมายและตัวเลข**
  - `price`: ราคารายการเป็นบาท ควรอยู่ในช่วง **5,000–15,000,000** เพื่อนำเข้า
  - `mileage`: ไมล์สะสมเป็น km (เป็น null ได้; ค่าติดลบถือว่าไม่มีข้อมูล)

**กฎการจัดรูปแบบ / ทำความสะอาด (อยู่ใน `clean_data_v3.py`):**

- คอลัมน์ข้อความ (`brand`, `model`, `submodel`, `gear`, `engine`, `color` ฯลฯ):
  - ตัดช่องว่าง จัดช่องว่างให้ปกติ และ **ตัวพิมพ์ใหญ่**
  - ค่าว่าง/ไม่มี → `"UNKNOWN"`
- `year` แปลงเป็น `int` และต้องอยู่ใน \[1990, current_year + 1\]
- `price` แปลงเป็น float และ clip อยู่ใน \[5,000, 15,000,000\]
- `mileage`:
  - ค่าติดลบ → `NaN`
  - ค่าว่างเติมด้วย median ต่อ `(brand, model, year)` ถ้าข้อมูลพอ ไม่งั้นใช้ global median ไม่งั้น `100,000`
  - Clip อยู่ใน \[0, 800,000\]

### 2.2 ข้อมูลเทรนที่ทำความสะอาดแล้ว (`cleaned_listings_v3.*`)

หลังรัน `clean_data_v3.py` ชุดข้อมูลที่ทำความสะอาดแล้วมีอย่างน้อย:

- **Categorical หลัก**: `brand`, `model`, `submodel`, `gear`, `engine`, `color`
- **ตัวเลขหลัก**: `year`, `price`, `mileage`
- **Engineered**:
  - `age`: `now_year - year` clip ที่ 0
  - `mileage_per_year`: `mileage / age` (ใช้ `mileage` ถ้า `age == 0`)
  - `mileage_missing`: แฟล็ก 0/1 ที่ mileage เดิมไม่มี

นี่คือ **input ที่คาดไว้** สำหรับ `train_model_v3.py`

---

## 3. วิธีรีเฟรชข้อมูล

1. **ให้ MySQL เป็นข้อมูลล่าสุด**
   - รายการใหม่ต้องถูก insert เข้าตารางต้นทาง (`car_listings_master` หรือตารางที่ตั้งค่า)
2. **รันการทำความสะอาดข้อมูล**
   - จาก **repo root**:
     ```bash
     python training/clean_data_v3.py --table car_listings_master --out data/cleaned_listings_v3
     ```
   - ได้ผลลัพธ์:
     - `data/cleaned_listings_v3.parquet`
     - `data/cleaned_listings_v3.csv`
3. **เช็คสั้น ๆ**
   - ขนาดไฟล์และจำนวนแถวเพิ่มตามที่คาด
   - สุ่มเช็คบางแถว: `year`, `price`, `mileage`, `age`, `mileage_per_year` สมเหตุสมผล brands/models ไม่พังชัดเจน

---

## 4. วิธีเทรนโมเดลราคาใหม่

1. **สิ่งที่ต้องมี**
   - ข้อมูลที่ทำความสะอาดล่าสุด: `data/cleaned_listings_v3.parquet` หรือ `.csv`
   - เปิด virtualenv และติดตั้ง dependencies:
     ```bash
     pip install -r backend/requirements.txt
     ```
   - สำหรับเทรนต้องมี: `pandas`, `numpy`, `lightgbm`, `scikit-learn` (และ `joblib`)
2. **รันสคริปต์เทรน**
   - จาก **repo root**:
     ```bash
     python training/train_model_v3.py --in data/cleaned_listings_v3 --out backend/model/price_quantiles_v3
     ```
   - สคริปต์จะ:
     - ตรวจคอลัมน์ที่ต้องมี: `["price","brand","model","year","age","mileage","mileage_per_year"]`
     - สร้าง features ที่ engineered (`log_mileage`, `sqrt_mileage`, `age_x_mileage`, `mileage_per_age`)
     - เทรนโมเดล LightGBM quantile (`q20`, `q50`, `q80`) บน `log(price)`
     - คำนวณ group medians ต่อ `(brand`, `model`, `year)`
     - ปรับ coverage ของแถบ quantile อัตโนมัติ
     - บันทึกไปที่ `backend/model/price_quantiles_v3/`:
       - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
       - `group_medians.csv`
       - `feature_config.json`
       - `metrics.json`
       - `val_preds.csv`
3. **เช็คคุณภาพการเทรน**
   - เปิด `backend/model/price_quantiles_v3/metrics.json` ดู:
     - `WAPE@q50_after`, `MAPE@q50_after`
     - `coverage_after` เทียบ `coverage_target`
   - ถ้าต้องการ ดู `val_preds.csv` สุ่มบางแถว

---

## 5. นำโมเดลใหม่ขึ้น production

1. **สำรองโฟลเดอร์โมเดลปัจจุบัน**
   - คัดลอก artifacts ที่มี:
     ```bash
     cp -r backend/model/price_quantiles_v3 backend/model/price_quantiles_v3_backup_YYYYMMDD
     ```
2. **แทนที่ artifacts**
   - รันเทรนด้วย `--out backend/model/price_quantiles_v3` เพื่อให้ artifacts ใหม่เขียนที่นั่น หรือคัดลอกจากโฟลเดอร์ staging
   - ไฟล์ที่ต้องมี:
     - `q20_lgbm.pkl`, `q50_lgbm.pkl`, `q80_lgbm.pkl`
     - `feature_config.json`
     - `group_medians.csv` (ไม่บังคับแต่แนะนำ)
     - `metrics.json`
3. **ให้ระบบใช้โมเดลใหม่**
   - API โหลดโมเดลราคาอัตโนมัติเมื่อสตาร์ท
   - หลังแทนที่ artifacts แล้ว เลือกอย่างใดอย่างหนึ่ง:
     - **รีสตาร์ท** service หรือ container เพื่อให้โหลดโมเดลใหม่เมื่อสตาร์ทครั้งถัดไป หรือ
     - เรียก endpoint reload:
       ```bash
       curl -X POST http://localhost:8000/admin/reload_price_model
       ```
4. **ทดสอบเบื้องต้น**
   - เรียก `/health/price_model` และ `/price` สักสองสามเคส ตรวจว่า band เรียงถูกและ confidence/estimate_basis สมเหตุสมผล

---

## 6. การเปลี่ยน Feature และ Schema

- **Inference** (`backend/ml/price_helper.py`): ขยาย `_add_features` และให้สอดคล้องกับ `feature_config.json`
- **Training** (`training/train_model_v3.py`): แก้ `add_features` และ `cat_cols`/`num_cols` ให้ตรงกัน
- **สำคัญ**: `feature_config.json` กำหนดลำดับและประเภท feature ที่ inference ทุกการเปลี่ยน features ในการเทรนต้องสะท้อนที่นี่และใน `_add_features`

---

## 7. บำรุงรักษาโมเดล Depreciation

- `.env` ต้องมีการตั้งค่าเชื่อมต่อ MySQL ที่ใช้ได้ `backend/ml/depreciation.py` อ่านจากตาราง MySQL
- รีเฟรชข้อมูลและทำตามขั้นตอนเทรนใหม่ของ depreciation artifacts ใน `artifacts/` ให้แน่ใจว่าได้รับการอ้างอิงถูกต้อง

---

## 8. Checklist บำรุงรักษาปกติ

- ตรวจว่า `/health` และ `/health/price_model` OK ดู logs และ metrics
- ก่อน deploy โมเดลใหม่: รีเฟรชข้อมูล → เทรนใหม่ → แทนที่ artifacts → รีสตาร์ทหรือเรียก reload → ทดสอบ endpoints

---

## 9. วิธีเพิ่มรูปแบบ/แหล่ง Parsing ใหม่

แมปฟิลด์แหล่งที่มากับ schema มาตรฐาน insert เข้า MySQL (แนะนำ) รัน `training/clean_data_v3.py` ถ้าเขียนตรงไป CSV/Parquet ให้แน่ใจว่าคอลัมน์ที่ต้องมีตรงกับหัวข้อ 2.2 และชี้ `--in` ใน `train_model_v3.py` ไปที่ prefix ไฟล์นั้น
