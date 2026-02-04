# Frontend notices & behaviour – TL;DR

Quick reference for user-facing notices, transparency, and error handling in the car pricing app.

---

## 1. Brand / model name changes & production year

When a brand changed model names or a model wasn’t produced in the selected year, we show a clear message instead of a price.

- **Mercedes ML‑CLASS**  
  From 2016 onward: “This model was discontinued and renamed to **GLE-CLASS**.”  
  User is told to pick GLE-CLASS for 2016+.

- **Mercedes SLK‑CLASS**  
  From 2016 onward: “This model was discontinued and renamed to **SLC-CLASS**.”  
  User is told to pick SLC-CLASS for 2016+.

- **Mercedes EQS‑CLASS**  
  Not produced before 2021: “This model was not produced in the selected year.”

- **Mercedes GLC‑CLASS**  
  Not produced before 2015: “This model was not produced in the selected year.”

- **Mercedes GLE‑CLASS**  
  Not produced before 2016: “This model was not produced in the selected year.”

- **BMW 320d trim vs year**  
  If user picks a trim that wasn’t made in the selected year (e.g. G20 CKD before 2019, or F30 after 2018), we show under the Trim dropdown:  
  “Trim not produced in this year. Please choose a different trim.”  
  Submit is disabled until they change trim or year. Selection is not auto-cleared.

- **Audi TT**  
  Before 2019: “Pricing unavailable for this model and year due to inconsistent market data.”

---

## 2. Transparency about low / unreliable data

We don’t show a price when data is too thin or too variable; we explain why.

- **Bentley Flying Spur**  
  When there are very few listings for that model/year:  
  “Bentley Flying Spur listings are limited and highly spec-dependent. Automated pricing is unavailable for this model and year to avoid misleading estimates.”

- **High‑performance / low‑volume (e.g. Audi RS4)**  
  Generic: “High-performance vehicles have limited listings and highly variable pricing. Automated price estimates are unavailable in the current version to ensure accuracy.”

- **S‑Class (Mercedes)**  
  When we *do* show a price but comparables are few (e.g. 2020+ with &lt;4 listings): we show an **info notice** on the result card: “Important note for S-Class pricing – high variation in specifications and options; prices are indicative and may vary by trim and equipment.”  
  Price is still shown; we’re transparent that it’s less reliable.

---

## 3. Commercial vehicles

- **Mercedes Sprinter & Vito**  
  When we show a price, we add a notice on the result: “Commercial vehicle pricing notice – pricing varies significantly by configuration, usage, and body type.”  
  Same idea for any commercial-vehicle notice: explain that commercial use and config matter a lot.

---

## 4. Error handling (simple)

- **Form validation**  
  Inline errors under fields: missing make/model/year/mileage, invalid mileage (&lt;1k or &gt;450k km), future year (&gt;2025), trim not produced in selected year (BMW 320d). Submit stays disabled when invalid.

- **API / backend**  
  - Can’t reach backend: “Cannot connect to backend at … Please ensure the backend is running.”  
  - Other request failures: we show the backend message when possible (e.g. “Price model not loaded”, “Insufficient market data”) or a generic “Failed to get price estimate. Please try again.”

- **Modals (Graph, Depreciation)**  
  On load failure we show a short error in the modal (e.g. “Failed to load price graph / depreciation. Please try again.”) and allow retry/close.

All of the above use translations (EN/TH) where the strings are in `translations.js`; error handling stays simple and user-facing messages are short.

---

## 5. Other frontend behaviour

- **Confidence & sample size**  
  Result card shows a **confidence badge** (Good / Moderate / Low) and **“Based on X listings”** with a tooltip: “Number of similar vehicles used to calculate this estimate.” When the backend sends `estimate_basis`, we show either **“Comparable Listings”** or **“Market Trends”** (e.g. fewer comparables / fallback). This makes low-data cases visible without blocking a price.

- **Price bands**  
  Three bands (Good Deal, Market Price, Higher Price) with short tooltips explaining each. Yellow band shows “Typical market value.”

- **Year cap**  
  Years after 2025 are blocked in the form with: “Pricing not available for future model years. Maximum supported year is 2025.”

- **Empty / loading**  
  Before first result: “Ready to Price” and “Fill in your car details to get an instant price estimate.” While submitting: “Analyzing market data…” (EN/TH).

- **Depreciation & Graph modals**  
  On load failure we show an error message and a “Try Again” (or equivalent) action; while loading we show a loading state.

- **Copy**  
  After copying the result summary we show brief “Copied!” feedback.

---

# Frontend notices & behaviour – TL;DR (ภาษาไทย)

สรุปสั้น ๆ สำหรับแจ้งเตือนผู้ใช้ ความโปร่งใส และการจัดการข้อผิดพลาดในแอปประมาณราคารถ

---

## 1. การเปลี่ยนชื่อยี่ห้อ/รุ่น และปีที่ผลิต

เมื่อยี่ห้อเปลี่ยนชื่อรุ่น หรือรุ่นยังไม่ผลิตในปีที่เลือก เราจะแสดงข้อความชัดเจนแทนราคา

- **Mercedes ML‑CLASS**  
  ตั้งแต่ปี 2016 เป็นต้นไป: "รุ่นนี้เลิกผลิตและเปลี่ยนชื่อเป็น **GLE-CLASS**"  
  แนะนำให้ผู้ใช้เลือก GLE-CLASS สำหรับปี 2016+

- **Mercedes SLK‑CLASS**  
  ตั้งแต่ปี 2016 เป็นต้นไป: "รุ่นนี้เลิกผลิตและเปลี่ยนชื่อเป็น **SLC-CLASS**"  
  แนะนำให้ผู้ใช้เลือก SLC-CLASS สำหรับปี 2016+

- **Mercedes EQS‑CLASS**  
  ยังไม่ผลิตก่อนปี 2021: "รุ่นนี้ยังไม่ผลิตในปีที่เลือก"

- **Mercedes GLC‑CLASS**  
  ยังไม่ผลิตก่อนปี 2015: "รุ่นนี้ยังไม่ผลิตในปีที่เลือก"

- **Mercedes GLE‑CLASS**  
  ยังไม่ผลิตก่อนปี 2016: "รุ่นนี้ยังไม่ผลิตในปีที่เลือก"

- **BMW 320d trim กับปี**  
  ถ้าผู้ใช้เลือก trim ที่ไม่ได้ผลิตในปีที่เลือก (เช่น G20 CKD ก่อน 2019 หรือ F30 หลัง 2018) เราแสดงใต้ dropdown Trim:  
  "Trim นี้ไม่ได้ผลิตในปีนี้ กรุณาเลือก trim อื่น"  
  ปุ่มส่งจะถูกปิดจนกว่าจะเปลี่ยน trim หรือปี ไม่ล้างการเลือกอัตโนมัติ

- **Audi TT**  
  ก่อนปี 2019: "ไม่สามารถประมาณราคาสำหรับรุ่นและปีนี้ได้ เนื่องจากข้อมูลตลาดไม่สม่ำเสมอ"

---

## 2. ความโปร่งใสเมื่อข้อมูลน้อย/ไม่น่าเชื่อถือ

เราไม่แสดงราคาเมื่อข้อมูลน้อยหรือแปรปรวนเกินไป และอธิบายเหตุผล

- **Bentley Flying Spur**  
  เมื่อมีรายการน้อยมากสำหรับรุ่น/ปีนั้น:  
  "รายการ Bentley Flying Spur มีจำกัดและขึ้นกับสเปกมาก ไม่สามารถประมาณราคาอัตโนมัติสำหรับรุ่นและปีนี้ได้ เพื่อหลีกเลี่ยงการประมาณการที่ทำให้เข้าใจผิด"

- **High‑performance / ปริมาณน้อย (เช่น Audi RS4)**  
  ข้อความทั่วไป: "รถสมรรถนะสูงมีรายการจำกัดและราคาแปรปรวนมาก ไม่สามารถประมาณราคาอัตโนมัติในเวอร์ชันปัจจุบันได้ เพื่อความถูกต้อง"

- **S‑Class (Mercedes)**  
  เมื่อเรา*มี*แสดงราคาแต่มี comparable น้อย (เช่น 2020+ และมีรายการ <4): เราแสดง **ข้อความข้อมูล** บนการ์ดผลลัพธ์: "หมายเหตุสำคัญสำหรับราคา S-Class – ความแปรผันสูงของสเปกและตัวเลือก ราคาเป็นเพียงแนวทางและอาจต่างตาม trim และอุปกรณ์"  
  ราคายังแสดง เราระบุชัดว่าเชื่อถือได้น้อยลง

---

## 3. รถเชิงพาณิชย์

- **Mercedes Sprinter & Vito**  
  เมื่อเราแสดงราคา เราเพิ่มข้อความบนผลลัพธ์: "หมายเหตุราคารถเชิงพาณิชย์ – ราคาแตกต่างกันมากตามการตั้งค่า การใช้งาน และประเภทรถ"  
  แนวคิดเดียวกันสำหรับข้อความรถเชิงพาณิชย์อื่น: อธิบายว่าการใช้งานเชิงพาณิชย์และการตั้งค่าสำคัญมาก

---

## 4. การจัดการข้อผิดพลาด (แบบง่าย)

- **การตรวจสอบฟอร์ม**  
  ข้อความผิดพลาดใต้ฟิลด์: ไม่มี make/model/year/mileage ไมล์ไม่ถูกต้อง (<1k หรือ >450k km) ปีในอนาคต (>2025) trim ไม่ได้ผลิตในปีที่เลือก (BMW 320d) ปุ่มส่งจะถูกปิดเมื่อไม่ถูกต้อง

- **API / backend**  
  - เชื่อมต่อ backend ไม่ได้: "ไม่สามารถเชื่อมต่อ backend ที่ … กรุณาตรวจสอบว่า backend กำลังทำงาน"  
  - ความล้มเหลวอื่น: เราแสดงข้อความจาก backend เมื่อทำได้ (เช่น "โหลดโมเดลราคาไม่ได้" "ข้อมูลตลาดไม่เพียงพอ") หรือข้อความทั่วไป "ไม่สามารถดึงประมาณราคาได้ กรุณาลองอีกครั้ง"

- **โมดัล (กราฟ, ค่าสูญเสีย)**  
  เมื่อโหลดไม่สำเร็จ เราแสดงข้อความผิดพลาดสั้นในโมดัล (เช่น "โหลดกราฟราคา / ค่าสูญเสียไม่ได้ กรุณาลองอีกครั้ง") และให้ลองใหม่/ปิดได้

ทั้งหมดด้านบนใช้คำแปล (EN/TH) ที่สตริงอยู่ใน `translations.js` การจัดการข้อผิดพลาดยังคงง่ายและข้อความที่ผู้ใช้เห็นสั้น

---

## 5. พฤติกรรม frontend อื่น ๆ

- **Confidence และ sample size**  
  การ์ดผลลัพธ์แสดง **badge ความมั่นใจ** (ดี / ปานกลาง / ต่ำ) และ **"อิงจาก X รายการ"** พร้อม tooltip: "จำนวนรถที่คล้ายกันที่ใช้คำนวณประมาณการนี้" เมื่อ backend ส่ง `estimate_basis` เราแสดง **"Comparable Listings"** หรือ **"Market Trends"** (เช่น comparable น้อย / fallback) ทำให้เคสข้อมูลน้อยมองเห็นได้โดยไม่บล็อกราคา

- **แถบราคา**  
  สามแถบ (ดีลดี ราคาตลาด ราคาสูง) พร้อม tooltip สั้นอธิบายแต่ละอัน แถบเหลืองแสดง "มูลค่าตลาดโดยทั่วไป"

- **จำกัดปี**  
  ปีหลัง 2025 ถูกบล็อกในฟอร์มด้วย: "ไม่สามารถประมาณราคาสำหรับปีรุ่นในอนาคต ปีสูงสุดที่รองรับคือ 2025"

- **ว่าง / กำลังโหลด**  
  ก่อนผลลัพธ์แรก: "Ready to Price" และ "กรอกรายละเอียดรถเพื่อดูประมาณราคาทันที" ขณะส่ง: "กำลังวิเคราะห์ข้อมูลตลาด…" (EN/TH)

- **โมดัลค่าสูญเสียและกราฟ**  
  เมื่อโหลดไม่สำเร็จ เราแสดงข้อความผิดพลาดและปุ่ม "ลองอีกครั้ง" (หรือเทียบเท่า) ขณะโหลด เราแสดงสถานะกำลังโหลด

- **Copy**  
  หลังคัดลอกสรุปผลลัพธ์ เราแสดงข้อความสั้น "Copied!" เป็นการตอบรับ
