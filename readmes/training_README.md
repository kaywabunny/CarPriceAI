# Training — Data pipeline & model retrain

This folder holds the scripts to **refresh data** from MySQL, **retrain** the price quantile models, and **use** the new models. Full maintenance guide: [training_MAINTENANCE.md](./training_MAINTENANCE.md) in this readmes folder.

---

## What’s in the `training/` folder

| File | Purpose |
|------|--------|
| **clean_data_v3.py** | Pulls raw data from MySQL, cleans it, writes Parquet + CSV. |
| **train_model_v3.py** | Trains LightGBM quantile models and writes all model artifacts. |
| **env.template** | Copy to `.env` and fill in MySQL connection (see below). |

---

## Before you run anything

1. **`.env`** — Copy `training/env.template` to **`.env`** in the **repo root** (or in `training/` if you run scripts from there). Set:
   - `MYSQL_HOST` (e.g. `localhost` or `db` in Docker)
   - `MYSQL_PORT` (e.g. `3306`)
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DB` (your database name)

2. **MySQL** — The source table (e.g. `car_listings_master`) must exist and have data. Required columns: see **training_MAINTENANCE.md**.

3. **Python** — From repo root: `pip install -r backend/requirements.txt`, plus for training: `pandas`, `numpy`, `lightgbm`, `scikit-learn`, `python-dotenv`, `mysql-connector-python`.

Run all commands below from the **repo root**.

---

## Step 1: Refresh data (clean_data_v3.py)

**Command:**
```bash
python training/clean_data_v3.py --table car_listings_master --out data/cleaned_listings_v3
```

**What to change:**
- **`--table`** — Your MySQL table name (e.g. `car_listings_master`). Change this if your table has a different name.
- **`--out`** — Output path **without** extension. The script adds `.parquet` and `.csv`. Use a path like `data/cleaned_listings_v3` or any folder + prefix you want.

**What gets produced:**
- **`{--out}.parquet`** — e.g. `data/cleaned_listings_v3.parquet`
- **`{--out}.csv`** — e.g. `data/cleaned_listings_v3.csv`

These are the cleaned datasets that the training script reads.

---

## Step 2: Train models (train_model_v3.py)

**Command:**
```bash
python training/train_model_v3.py --in data/cleaned_listings_v3 --out backend/model/price_quantiles_v3
```

**What to change:**
- **`--in`** — Path to the cleaned data **without** extension (same prefix you used for `--out` in Step 1). The script looks for `.parquet` first, then `.csv`.
- **`--out`** — Folder where all model artifacts are written. Use **`backend/model/price_quantiles_v3`** so the API loads them automatically. If you use a different folder, you’ll need to point the backend at it or copy files into `backend/model/price_quantiles_v3` later.

**Optional (usually leave default):**
- `--blend` (default `0.30`) — Weight for group-median blending.
- `--cov_target` (default `0.68`) — Target coverage for green/red bands.
- `--cov_cap` (default `1.6`) — Max band width scale.

**What gets produced (all inside `--out`):**

| File | Purpose |
|------|--------|
| **q20_lgbm.pkl** | LightGBM model for 20th percentile (green band low). |
| **q50_lgbm.pkl** | LightGBM model for 50th percentile (yellow / median). |
| **q80_lgbm.pkl** | LightGBM model for 80th percentile (red band high). |
| **feature_config.json** | Feature names, categorical list, rounding, blend/coverage settings. |
| **group_medians.csv** | Per (brand, model, year) median prices used for blending. |
| **metrics.json** | Validation metrics (WAPE, MAPE, coverage, etc.). |
| **val_preds.csv** | Validation-set predictions (for inspection). |

The API uses the `.pkl` files, `feature_config.json`, and `group_medians.csv`. The others are for monitoring and debugging.

---

## Step 3: Use the new model

- **Restart the API**, or  
- Call **`POST /admin/reload_price_model`** so the app loads the new artifacts from `backend/model/price_quantiles_v3` without a full restart.

---

## Quick reference

| Step | Change these | Output |
|------|--------------|--------|
| 1. Clean data | `--table` (MySQL table), `--out` (path prefix) | `{--out}.parquet`, `{--out}.csv` |
| 2. Train | `--in` (same prefix as Step 1), `--out` (artifact folder) | `.pkl`, `feature_config.json`, `group_medians.csv`, `metrics.json`, `val_preds.csv` |

For data schema, troubleshooting, and checklist, see **training_MAINTENANCE.md** in the readmes folder.

---

# Training — Data pipeline & model retrain (ภาษาไทย)

โฟลเดอร์นี้มีสคริปต์สำหรับ **ดึงข้อมูลใหม่** จาก MySQL **เทรนโมเดล** quantile ราคาใหม่ และ **ใช้** โมเดลใหม่ คู่มือบำรุงรักษาเต็ม: [training_MAINTENANCE.md](./training_MAINTENANCE.md) ในโฟลเดอร์ readmes นี้

---

## มีอะไรในโฟลเดอร์ `training/`

| File | Purpose |
|------|--------|
| **clean_data_v3.py** | ดึงข้อมูลดิบจาก MySQL ทำความสะอาด แล้วเขียน Parquet + CSV |
| **train_model_v3.py** | เทรนโมเดล LightGBM quantile และเขียน artifacts ทั้งหมด |
| **env.template** | คัดลอกไปเป็น `.env` แล้วกรอกการเชื่อมต่อ MySQL (ดูด้านล่าง) |

---

## ก่อนรันอะไร

1. **`.env`** — คัดลอก `training/env.template` ไปเป็น **`.env`** ใน **repo root** (หรือใน `training/` ถ้ารันสคริปต์จากนั้น) ตั้งค่า:
   - `MYSQL_HOST` (เช่น `localhost` หรือ `db` ใน Docker)
   - `MYSQL_PORT` (เช่น `3306`)
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DB` (ชื่อฐานข้อมูลของคุณ)

2. **MySQL** — ตารางต้นทาง (เช่น `car_listings_master`) ต้องมีอยู่และมีข้อมูล คอลัมน์ที่ต้องมี: ดู **training_MAINTENANCE.md**

3. **Python** — จาก repo root: `pip install -r backend/requirements.txt` และสำหรับ training: `pandas`, `numpy`, `lightgbm`, `scikit-learn`, `python-dotenv`, `mysql-connector-python`

รันคำสั่งด้านล่างทั้งหมดจาก **repo root**

---

## ขั้นที่ 1: ดึงข้อมูลใหม่ (clean_data_v3.py)

**คำสั่ง:**
```bash
python training/clean_data_v3.py --table car_listings_master --out data/cleaned_listings_v3
```

**สิ่งที่ต้องเปลี่ยน:**
- **`--table`** — ชื่อตาราง MySQL ของคุณ (เช่น `car_listings_master`) เปลี่ยนถ้าตารางชื่ออื่น
- **`--out`** — path ไฟล์ผลลัพธ์ **ไม่มี** นามสกุล สคริปต์จะเติม `.parquet` และ `.csv` ใช้ path แบบ `data/cleaned_listings_v3` หรือโฟลเดอร์ + prefix ตามต้องการ

**ผลลัพธ์ที่ได้:**
- **`{--out}.parquet`** — เช่น `data/cleaned_listings_v3.parquet`
- **`{--out}.csv`** — เช่น `data/cleaned_listings_v3.csv`

คือชุดข้อมูลที่ทำความสะอาดแล้ว ซึ่งสคริปต์เทรนจะอ่าน

---

## ขั้นที่ 2: เทรนโมเดล (train_model_v3.py)

**คำสั่ง:**
```bash
python training/train_model_v3.py --in data/cleaned_listings_v3 --out backend/model/price_quantiles_v3
```

**สิ่งที่ต้องเปลี่ยน:**
- **`--in`** — path ไปยังข้อมูลที่ทำความสะอาดแล้ว **ไม่มี** นามสกุล (prefix เดียวกับที่ใช้กับ `--out` ในขั้นที่ 1) สคริปต์จะหา `.parquet` ก่อน แล้วค่อย `.csv`
- **`--out`** — โฟลเดอร์ที่เขียน artifacts ทั้งหมด ใช้ **`backend/model/price_quantiles_v3`** เพื่อให้ API โหลดอัตโนมัติ ถ้าใช้โฟลเดอร์อื่น ต้องชี้ backend ไปที่นั้นหรือคัดลอกไฟล์ไปที่ `backend/model/price_quantiles_v3` ทีหลัง

**ตัวเลือก (มักใช้ค่าเริ่มต้น):**
- `--blend` (default `0.30`) — น้ำหนักสำหรับ group-median blending
- `--cov_target` (default `0.68`) — coverage เป้าหมายสำหรับแถบเขียว/แดง
- `--cov_cap` (default `1.6`) — สเกลความกว้างแถบสูงสุด

**ผลลัพธ์ที่ได้ (ทั้งหมดอยู่ใน `--out`):**

| File | Purpose |
|------|--------|
| **q20_lgbm.pkl** | โมเดล LightGBM สำหรับเปอร์เซ็นไทล์ที่ 20 (แถบเขียวต่ำ) |
| **q50_lgbm.pkl** | โมเดล LightGBM สำหรับเปอร์เซ็นไทล์ที่ 50 (เหลือง / median) |
| **q80_lgbm.pkl** | โมเดล LightGBM สำหรับเปอร์เซ็นไทล์ที่ 80 (แถบแดงสูง) |
| **feature_config.json** | ชื่อ features รายการ categorical การปัดเศษ การตั้งค่า blend/coverage |
| **group_medians.csv** | ราคา median ต่อ (brand, model, year) ใช้สำหรับ blending |
| **metrics.json** | เมตริก validation (WAPE, MAPE, coverage ฯลฯ) |
| **val_preds.csv** | การทำนายชุด validation (สำหรับตรวจดู) |

API ใช้ไฟล์ `.pkl`, `feature_config.json` และ `group_medians.csv` ไฟล์อื่นใช้สำหรับตรวจสอบและดีบัก

---

## ขั้นที่ 3: ใช้โมเดลใหม่

- **รีสตาร์ท API** หรือ  
- เรียก **`POST /admin/reload_price_model`** เพื่อให้แอปโหลด artifacts ใหม่จาก `backend/model/price_quantiles_v3` โดยไม่ต้องรีสตาร์ททั้งระบบ

---

## สรุปสั้น ๆ

| Step | สิ่งที่เปลี่ยน | ผลลัพธ์ |
|------|----------------|---------|
| 1. ทำความสะอาดข้อมูล | `--table` (ตาราง MySQL), `--out` (path prefix) | `{--out}.parquet`, `{--out}.csv` |
| 2. เทรน | `--in` (prefix เดียวกับขั้นที่ 1), `--out` (โฟลเดอร์ artifacts) | `.pkl`, `feature_config.json`, `group_medians.csv`, `metrics.json`, `val_preds.csv` |

สำหรับ schema ข้อมูล การแก้ปัญหา และ checklist ดู **training_MAINTENANCE.md** ในโฟลเดอร์ readmes
