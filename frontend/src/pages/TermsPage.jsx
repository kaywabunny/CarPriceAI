import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

const TermsPage = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen" data-testid="terms-page">
      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
              {getTranslation('terms.title', language)}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              {getTranslation('terms.effectiveDate', language)}
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          {language === 'th' ? (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">1. การยอมรับข้อตกลง</h2>
                <p>
                  การเข้าถึงหรือใช้งานเว็บไซต์ CarPriceAI (ต่อไปนี้เรียกว่า “บริการ”) ถือว่าคุณยอมรับและตกลงผูกพันตาม
                  ข้อตกลงการใช้บริการฉบับนี้ (“ข้อตกลง”) หากคุณไม่ยอมรับข้อตกลงนี้ โปรดหยุดการใช้งานบริการทันที
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">2. คุณสมบัติของผู้ใช้</h2>
                <p>
                  คุณต้องมีอายุอย่างน้อย 18 ปีบริบูรณ์ หรือบรรลุนิติภาวะตามกฎหมายที่ใช้บังคับในเขตอำนาจของคุณ
                  และมีความสามารถในการทำสัญญาที่มีผลผูกพันตามกฎหมายได้ คุณตกลงที่จะใช้บริการเพื่อวัตถุประสงค์ที่ชอบด้วยกฎหมาย
                  และปฏิบัติตามกฎหมายและระเบียบข้อบังคับที่ใช้บังคับทั้งหมด ทั้งในประเทศไทยและเขตอำนาจของคุณเอง
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">3. รายละเอียดของบริการ</h2>
                <p>
                  CarPriceAI ให้บริการเครื่องมือออนไลน์เพื่อประมาณการราคาซื้อขายรถยนต์มือสองจากข้อมูลที่คุณกรอก เช่น
                  ยี่ห้อ รุ่น รุ่นย่อย ปีที่ผลิต และระยะทางการใช้งาน บริการอาจแสดงช่วงราคาเป็นแถบสี
                  (เช่น สีเขียว “ราคาดี (ขายเร็ว)”, สีเหลือง “ราคาตลาด (เหมาะสม)”, และสีแดง “ราคาสูง (ขายช้า)”)
                  ราคาตลาดโดยประมาณ ค่าความเชื่อมั่น และข้อมูลว่าอ้างอิงจากจำนวนรายการที่เทียบเคียงได้ประมาณเท่าใด
                  (เช่น “อ้างอิงจาก X รายการ”)
                </p>
                <p className="mt-2">
                  ในเวอร์ชันปัจจุบัน บริการยังไม่ต้องใช้บัญชีผู้ใช้หรือการชำระเงิน ฟีเจอร์และความสามารถต่าง ๆ
                  อาจมีการพัฒนาเปลี่ยนแปลงหรือเพิ่มขึ้นในอนาคต
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  4. ไม่มีคำแนะนำทางวิชาชีพ / เพื่อการให้ข้อมูลเท่านั้น
                </h2>
                <p>
                  การประมาณการราคา ช่วงราคา และค่าความเชื่อมั่นที่ CarPriceAI แสดงเป็นเพียงข้อมูลเพื่อประกอบการตัดสินใจเท่านั้น
                  มิใช่คำแนะนำด้านการเงิน การลงทุน ภาษี กฎหมาย หรือคำปรึกษาทางวิชาชีพในลักษณะใด ๆ
                  คุณเป็นผู้รับผิดชอบต่อการตัดสินใจใด ๆ ที่เกิดจากการใช้ข้อมูลดังกล่าวแต่เพียงผู้เดียว
                  ไม่ว่าการซื้อ ขาย หรือตั้งราคารถยนต์
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">5. ข้อจำกัดด้านความถูกต้องของข้อมูล</h2>
                <p>
                  แม้ว่า CarPriceAI จะพยายามใช้วิธีการ แหล่งข้อมูล และเทคนิคด้านการเรียนรู้ของเครื่องที่เหมาะสม
                  เพื่อให้ได้ค่าประมาณที่ใกล้เคียงกับสภาพตลาดจริง แต่เราไม่อาจรับรองได้ว่าการประมาณการราคา
                  ช่วงราคา หรือค่าความเชื่อมั่นใด ๆ จะถูกต้อง ครบถ้วน ทันสมัย หรือเหมาะสมกับสถานการณ์เฉพาะของคุณ
                  ข้อมูลตลาดอาจไม่สมบูรณ์ ล่าช้า หรือไม่สอดคล้องกัน และราคารถยนต์อาจแตกต่างกันอย่างมีนัยสำคัญ
                  ตามสภาพรถ ประวัติการชน การบำรุงรักษา อุปกรณ์เสริม รุ่นย่อย การดัดแปลง ทำเลที่ตั้ง และปัจจัยอื่น ๆ
                  ที่บริการอาจไม่ครอบคลุม
                </p>
                <p className="mt-2">
                  คุณรับทราบว่ารุ่นย่อย สเปก และรุ่นพิเศษของรถรุ่นเดียวกันอาจมีราคาต่างกันมาก
                  และการประมาณการของเราอาจไม่สามารถสะท้อนความแตกต่างเหล่านั้นได้ทั้งหมด
                  CarPriceAI จะไม่รับผิดชอบต่อความสูญเสีย ข้อพิพาท หรือข้อโต้แย้งใด ๆ อันเกิดจากการอ้างอิงข้อมูลดังกล่าว
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">6. ความรับผิดชอบของผู้ใช้</h2>
                <p>คุณตกลงว่า:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    จะให้ข้อมูลเกี่ยวกับรถยนต์อย่างถูกต้องและครบถ้วน เช่น ยี่ห้อ รุ่น ปีที่ผลิต ระยะทาง และรุ่นย่อย
                    เมื่อใช้บริการ
                  </li>
                  <li>
                    จะใช้ราคาที่ประมาณการเป็นเพียงข้อมูลอ้างอิงเบื้องต้น และตรวจสอบข้อมูลจากแหล่งอื่นเพิ่มเติมก่อนตัดสินใจ
                  </li>
                  <li>จะปฏิบัติตามกฎหมายและระเบียบที่เกี่ยวข้องทุกประการเมื่อใช้บริการ</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">7. การใช้งานที่ต้องห้าม</h2>
                <p>คุณตกลงว่าจะไม่:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    ดึงข้อมูลจำนวนมาก หรือเก็บข้อมูลออกจากบริการอย่างเป็นระบบ (scraping หรือ harvesting)
                    รวมถึงการดึงช่วงราคาและข้อมูลที่เกี่ยวข้อง
                  </li>
                  <li>ทำการถอดรหัส วิเคราะห์ย้อนกลับ หรือพยายามเข้าถึงโมเดล อัลกอริทึม หรือชุดข้อมูลที่อยู่เบื้องหลัง</li>
                  <li>
                    ใช้บอต สคริปต์ หรือเครื่องมืออัตโนมัติ ที่ทำให้เกิดภาระหรือโหลดที่ไม่เหมาะสมต่อโครงสร้างพื้นฐานของเรา
                  </li>
                  <li>พยายามเข้าถึงระบบ บัญชี หรือข้อมูลใด ๆ ที่ไม่ได้รับอนุญาต</li>
                  <li>
                    ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย หลอกลวง หรือทำให้เข้าใจผิด รวมถึงการกรอกข้อมูลเท็จเพื่อบิดเบือนราคา
                  </li>
                  <li>
                    กระทำการใด ๆ ที่รบกวนหรือทำลายความปลอดภัย ความสมบูรณ์ หรือประสิทธิภาพของบริการหรือโครงสร้างพื้นฐาน
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">8. ทรัพย์สินทางปัญญา</h2>
                <p>
                  บริการนี้ รวมถึงการออกแบบ ส่วนติดต่อผู้ใช้ โลโก้ การแสดงผลช่วงราคา ตัวอักษร กราฟิก
                  และซอฟต์แวร์หรือโมเดลที่อยู่เบื้องหลัง เป็นทรัพย์สินของเรา หรือผู้ให้สิทธิ์ของเรา
                  และได้รับความคุ้มครองตามกฎหมายลิขสิทธิ์ เครื่องหมายการค้า และกฎหมายทรัพย์สินทางปัญญาอื่น ๆ
                  สิทธิทั้งหมดที่ไม่ได้ระบุไว้โดยชัดแจ้งในข้อตกลงนี้ ยังคงสงวนไว้สำหรับเรา
                </p>
                <p className="mt-2">
                  คุณจะไม่ใช้ชื่อ CarPriceAI โลโก้ หรือเครื่องหมายการค้าใด ๆ ที่เกี่ยวข้อง
                  โดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษรจากเรา คุณสามารถดูและใช้ข้อมูลประมาณการราคาสำหรับการใช้งานส่วนบุคคล
                  หรือภายในองค์กรของคุณเอง แต่ต้องไม่คัดลอก เผยแพร่ หรือแสดงต่อสาธารณะ
                  ในลักษณะที่ทำให้เข้าใจว่ามีการรับรองหรือเป็นพันธมิตร โดยไม่ได้รับอนุญาต
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">9. บริการของบุคคลที่สาม</h2>
                <p>
                  บริการอาจใช้ผู้ให้บริการภายนอกสำหรับการโฮสต์เว็บไซต์ การวิเคราะห์ข้อมูล การบันทึก log
                  หรือโครงสร้างพื้นฐานอื่น ๆ (เช่น ผู้ให้บริการคลาวด์หรือเครื่องมือวิเคราะห์)
                  ผู้ให้บริการเหล่านี้อาจประมวลผลข้อมูลในนามของเรา ภายใต้คำสั่งและข้อกำหนดด้านกฎหมายคุ้มครองข้อมูล
                </p>
                <p className="mt-2">
                  การใช้งานเว็บไซต์หรือบริการของบุคคลที่สามที่เชื่อมโยงจากบริการนี้
                  อยู่ภายใต้เงื่อนไขและนโยบายของบุคคลที่สามนั้น ๆ ซึ่งเราไม่สามารถควบคุมและไม่ต้องรับผิดชอบ
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  10. ความพร้อมใช้งาน การเปลี่ยนแปลง และการยุติการให้บริการ
                </h2>
                <p>
                  เราอาจแก้ไข ระงับ หรือยุติการให้บริการ ทั้งหมดหรือบางส่วน ได้ทุกเมื่อโดยไม่ต้องแจ้งให้ทราบล่วงหน้า
                  และไม่รับรองว่าบริการจะพร้อมใช้งานตลอดเวลา หรือปราศจากการหยุดชะงัก อาทิ
                  ช่วงเวลาบำรุงรักษาหรือปัญหาทางเทคนิค
                </p>
                <p className="mt-2">
                  เราอาจเปลี่ยนแปลง หรือนำฟีเจอร์บางอย่างออกได้ เช่น แถบช่วงราคา ค่าความเชื่อมั่น
                  หรือความสามารถในการวิเคราะห์ข้อมูล ตามการพัฒนาและปรับปรุงบริการ
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">11. ข้อจำกัดความรับผิด</h2>
                <p>
                  ภายใต้ขอบเขตสูงสุดที่กฎหมายอนุญาต CarPriceAI รวมถึงเจ้าของ กรรมการ พนักงาน และบริษัทที่เกี่ยวข้อง
                  จะไม่ต้องรับผิดชอบต่อความเสียหายทางอ้อม โดยมิได้ตั้งใจ ผลสืบเนื่อง พิเศษ ลงโทษ
                  หรือความเสียหายเชิงตัวอย่างใด ๆ รวมถึงแต่ไม่จำกัดเพียง การสูญเสียกำไร รายได้ หรือข้อมูล
                  อันเกี่ยวเนื่องกับการใช้บริการของคุณ แม้ว่าเราจะได้รับแจ้งถึงความเป็นไปได้ของความเสียหายดังกล่าวแล้วก็ตาม
                </p>
                <p className="mt-2">
                  หากไม่อาจจำกัดความรับผิดได้ ความรับผิดรวมสูงสุดทั้งหมดของเรา
                  ที่เกี่ยวเนื่องกับบริการหรือข้อตกลงฉบับนี้ จะถูกจำกัดไว้ไม่เกิน 10,000 บาท (หนึ่งหมื่นบาทถ้วน)
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">12. การชดใช้ค่าเสียหาย</h2>
                <p>
                  คุณตกลงที่จะชดใช้ค่าเสียหาย ปกป้อง และทำให้ CarPriceAI รวมถึงเจ้าของ กรรมการ พนักงาน
                  และบริษัทที่เกี่ยวข้อง ปลอดจากข้อเรียกร้อง ความรับผิด ความเสียหาย การสูญเสีย
                  และค่าใช้จ่ายต่าง ๆ (รวมถึงค่าทนายความตามสมควร) ที่เกิดจาก หรือเชื่อมโยงกับการใช้บริการของคุณ
                  การละเมิดข้อตกลงฉบับนี้ หรือการละเมิดกฎหมายหรือสิทธิของบุคคลที่สามใด ๆ
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  13. กฎหมายที่ใช้บังคับและการระงับข้อพิพาท
                </h2>
                <p>
                  ข้อตกลงฉบับนี้อยู่ภายใต้และตีความตามกฎหมายแห่งราชอาณาจักรไทย
                  โดยไม่คำนึงถึงหลักกฎหมายขัดกันแห่งกฎหมาย ข้อพิพาทใด ๆ ที่เกิดจากหรือเกี่ยวเนื่องกับข้อตกลงนี้
                  หรือการใช้บริการ จะอยู่ภายใต้เขตอำนาจศาลไทยแต่เพียงผู้เดียว
                  และคุณยินยอมต่อเขตอำนาจและสถานที่พิจารณาคดีของศาลดังกล่าว
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">14. การเปลี่ยนแปลงข้อตกลง</h2>
                <p>
                  เราอาจปรับปรุงข้อตกลงฉบับนี้เป็นครั้งคราว เมื่อมีการเปลี่ยนแปลงที่มีนัยสำคัญ
                  เราจะปรับปรุง “วันที่มีผล” ที่ส่วนต้นของหน้านี้ และอาจแสดงประกาศเพิ่มเติมในบริการ
                  (เช่น แบนเนอร์หรือข้อความแจ้งเตือน) การที่คุณยังคงใช้บริการต่อไปหลังจากข้อตกลงที่แก้ไขมีผล
                  ถือว่าคุณยอมรับการเปลี่ยนแปลงดังกล่าวแล้ว
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">15. ช่องทางติดต่อ</h2>
                <p>
                  หากคุณมีคำถามเกี่ยวกับข้อตกลงฉบับนี้ โปรดติดต่อเราได้ที่{' '}
                  <strong>support@yourdomain.com</strong>
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using the CarPriceAI website (the &quot;Service&quot;), you agree to be bound by these
                  Terms of Service (the &quot;Terms&quot;). If you do not agree to these Terms, you must not use the
                  Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">2. Eligibility</h2>
                <p>
                  You may use the Service only if you are at least 18 years old, or the age of legal majority in your
                  jurisdiction, and are capable of entering into a legally binding agreement. You agree to use the
                  Service only for lawful purposes and in compliance with all applicable laws and regulations in
                  Thailand and in your local jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">3. Service Description</h2>
                <p>
                  CarPriceAI provides an online tool that estimates used car prices based on inputs such as make,
                  model, trim, year, and mileage. The Service may present price bands (for example, green / &quot;Good
                  Deal (Quick Sale)&quot;, yellow / &quot;Market Price (Fair)&quot;, and red / &quot;Higher Price
                  (Slower Sale)&quot;), a central market price estimate, confidence indicators, and references to the
                  approximate number of comparable listings used (for example, &quot;based on X listings&quot;).
                </p>
                <p className="mt-2">
                  The Service does not currently require user accounts or payments. Features may evolve over time, and
                  additional functionality may be introduced in future versions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  4. No Professional Advice / Informational Use Only
                </h2>
                <p>
                  All price estimates, bands, and confidence indicators provided by CarPriceAI are for informational
                  and illustrative purposes only. They do not constitute financial, investment, tax, legal, or
                  professional advice of any kind. You are solely responsible for any decisions you make based on the
                  information provided by the Service, including buying, selling, or pricing vehicles.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">5. Accuracy Disclaimer</h2>
                <p>
                  While CarPriceAI aims to use reasonable methods, data sources, and machine learning techniques to
                  provide realistic estimates, we do not guarantee that any estimate, band, or confidence level is
                  accurate, complete, up-to-date, or suitable for your specific situation. Market data may be
                  incomplete, delayed, or inconsistent, and vehicle prices can vary significantly based on condition,
                  accident history, maintenance, options, trim, modifications, location, and other factors that may
                  not be captured by the Service.
                </p>
                <p className="mt-2">
                  You acknowledge that different trims, specifications, and special editions of a model may have
                  materially different prices, and that our estimates may not fully reflect those distinctions.
                  CarPriceAI is not responsible for any losses, disputes, or disagreements arising from reliance on
                  the estimates.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">6. User Responsibilities</h2>
                <p>You agree to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    Provide accurate and complete information about the vehicle (for example, make, model, year,
                    mileage, and trim) when using the Service.
                  </li>
                  <li>
                    Use the estimates as a general reference only and perform your own independent checks before
                    making decisions.
                  </li>
                  <li>Comply with all applicable laws and regulations when using the Service.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">7. Prohibited Uses</h2>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    Scrape, harvest, or systematically extract data from the Service, including price estimates or
                    underlying data.
                  </li>
                  <li>
                    Reverse engineer, decompile, or attempt to derive the underlying models, algorithms, or datasets.
                  </li>
                  <li>
                    Use bots, scripts, or automated tools to access the Service in a way that imposes an unreasonable
                    load on our infrastructure.
                  </li>
                  <li>
                    Attempt to gain unauthorized access to any systems, accounts, or data related to the Service.
                  </li>
                  <li>
                    Use the Service for fraudulent, misleading, or illegal purposes, including falsifying inputs to
                    manipulate estimates.
                  </li>
                  <li>
                    Interfere with or disrupt the security, integrity, or performance of the Service or its
                    infrastructure.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">8. Intellectual Property</h2>
                <p>
                  The Service, including its design, user interface, logos, price band visualizations, text,
                  graphics, and any underlying software and models, is owned by us or our licensors and is protected
                  by copyright, trademark, and other intellectual property laws. All rights not expressly granted to
                  you in these Terms are reserved.
                </p>
                <p className="mt-2">
                  You may not use the CarPriceAI name, logo, or any related trademarks without our prior written
                  permission. You may view and use the estimates for your personal or internal business purposes, but
                  you may not reproduce, distribute, or publicly display them in a way that suggests endorsement or
                  partnership without consent.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">9. Third-Party Services</h2>
                <p>
                  The Service may use third-party services for hosting, analytics, logging, or other infrastructure
                  (for example, cloud hosting providers or analytics tools). These third parties may process data on
                  our behalf in accordance with our instructions and applicable data protection laws.
                </p>
                <p className="mt-2">
                  Your use of any third-party websites or services linked from the Service is subject to those third
                  parties&apos; own terms and policies, which we do not control and for which we are not responsible.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  10. Availability, Changes, and Termination
                </h2>
                <p>
                  We may modify, suspend, or discontinue the Service, in whole or in part, at any time without prior
                  notice. We do not guarantee that the Service will be available at all times or without interruption,
                  and we may experience outages, maintenance windows, or technical issues.
                </p>
                <p className="mt-2">
                  We may also change or remove features, including specific price bands, confidence indicators, or
                  analytics capabilities, as we improve or update the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">11. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, CarPriceAI and its owners, officers, employees, and
                  affiliates shall not be liable for any indirect, incidental, consequential, special, punitive, or
                  exemplary damages, or for any loss of profits, revenue, or data, arising out of or in connection
                  with your use of the Service, even if we have been advised of the possibility of such damages.
                </p>
                <p className="mt-2">
                  To the extent any liability cannot be excluded, our total aggregate liability arising out of or
                  relating to the Service or these Terms shall be limited to the equivalent of THB 10,000 (ten
                  thousand Thai Baht).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">12. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless CarPriceAI and its owners, officers, employees,
                  and affiliates from and against any claims, liabilities, damages, losses, and expenses (including
                  reasonable attorneys&apos; fees) arising out of or in any way connected with your use of the
                  Service, your violation of these Terms, or your violation of any applicable law or the rights of
                  any third party.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">13. Governing Law and Dispute Resolution</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the Kingdom of
                  Thailand, without regard to its conflict of law principles. Any dispute arising out of or relating
                  to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of
                  Thailand, and you consent to the personal jurisdiction and venue of such courts.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">14. Changes to These Terms</h2>
                <p>
                  We may update these Terms from time to time. When we make material changes, we will revise the
                  &quot;Effective date&quot; at the top of this page and may provide additional notice as appropriate
                  (for example, via a banner or notification on the Service). Your continued use of the Service after
                  the updated Terms become effective constitutes your acceptance of the changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">15. Contact Information</h2>
                <p>
                  If you have any questions about these Terms, please contact us at{' '}
                  <strong>support@yourdomain.com</strong>.
                </p>
              </section>
            </>
          )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;


