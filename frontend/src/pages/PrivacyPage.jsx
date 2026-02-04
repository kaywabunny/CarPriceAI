import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

const PrivacyPage = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen" data-testid="privacy-page">
      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
              {getTranslation('privacy.title', language)}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              {getTranslation('privacy.effectiveDate', language)}
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-8 text-sm md:text-base leading-relaxed text-muted-foreground">
          {language === 'th' ? (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">1. ภาพรวมและขอบเขตของนโยบาย</h2>
                <p>
                  นโยบายความเป็นส่วนตัวฉบับนี้อธิบายว่า CarPriceAI (&quot;เรา&quot; &quot;ของเรา&quot; หรือ
                  &quot;ผู้ให้บริการ&quot;) เก็บ ใช้ และปกป้องข้อมูลอย่างไร
                  ที่เกี่ยวข้องกับเว็บไซต์ประเมินราคารถยนต์และบริการที่เกี่ยวข้อง (&quot;บริการ&quot;)
                  นโยบายนี้ใช้กับผู้เยี่ยมชมและผู้ใช้งานทุกคน รวมถึงผู้ใช้ในประเทศไทยและประเทศอื่น ๆ
                </p>
                <p className="mt-2">
                  บริการในปัจจุบันยังไม่ต้องใช้บัญชีผู้ใช้หรือการชำระเงิน อย่างไรก็ตาม เราอาจประมวลผลข้อมูลบางส่วนเกี่ยวกับอุปกรณ์
                  การใช้งาน และข้อมูลที่คุณกรอก เพื่อให้สามารถสร้างการประมาณการราคาและปรับปรุงบริการได้
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">2. ข้อมูลที่เราเก็บรวบรวม</h2>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.1 ข้อมูลรถยนต์ที่ผู้ใช้กรอก</h3>
                <p>
                  เมื่อคุณใช้บริการ คุณอาจกรอกข้อมูลเกี่ยวกับรถยนต์ เช่น ยี่ห้อ รุ่น รุ่นย่อยหรือซีรี่ส์ ปีที่ผลิต
                  และระยะทางการใช้งาน ข้อมูลเหล่านี้ใช้ในการสร้างการประมาณการราคา ช่วงราคา และค่าความเชื่อมั่น
                  ที่เกี่ยวข้อง
                </p>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.2 ข้อมูลการใช้งาน</h3>
                <p>เราอาจเก็บข้อมูลเกี่ยวกับการโต้ตอบของคุณกับบริการ เช่น:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>หน้าที่คุณเข้าชม (เช่น หน้าแรก คำถามที่พบบ่อย หน้าแสดงข้อมูลเชิงวิเคราะห์ ข้อตกลง และนโยบาย)</li>
                  <li>การกระทำที่คุณทำ (เช่น การกดปุ่มค้นหาราคา การดูกราฟราคา การดูข้อมูลค่าซื้อขาย หรือการคัดลอกผลลัพธ์)</li>
                  <li>วันและเวลาของคำขอและการโต้ตอบ</li>
                  <li>ตัวระบุเซสชันหรือรหัสนิรนามที่เก็บใน local storage หรือคุกกี้</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.3 ข้อมูลด้านอุปกรณ์และเทคนิค</h3>
                <p>เราอาจเก็บข้อมูลทางเทคนิคจากเบราว์เซอร์หรืออุปกรณ์ของคุณโดยอัตโนมัติ เช่น:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>ที่อยู่ IP (ซึ่งอาจใช้ประมาณตำแหน่งโดยคร่าว เช่น เมืองหรือประเทศ)</li>
                  <li>ประเภทและเวอร์ชันของเบราว์เซอร์</li>
                  <li>ระบบปฏิบัติการและประเภทอุปกรณ์</li>
                  <li>หน้าอ้างอิง (referrer) และหน้าที่ออกจากเว็บไซต์ รวมถึงข้อมูล log มาตรฐานอื่น ๆ</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.4 คุกกี้และ local storage</h3>
                <p>
                  บริการอาจใช้คุกกี้หรือ local storage เพื่อจดจำการตั้งค่าของคุณ (เช่น ภาษา หรือธีมการแสดงผล)
                  รักษาสถานะของเซสชัน และสนับสนุนการวิเคราะห์การใช้งาน หากเราเชื่อมต่อกับ Google Analytics
                  หรือเครื่องมือที่คล้ายกัน เครื่องมือเหล่านั้นอาจมีการตั้งค่าคุกกี้ของตนเอง
                </p>
                <p className="mt-2 font-semibold">
                  หมายเหตุ: หากเราเชื่อมต่อกับ Google Analytics คุณอาจเห็นคุกกี้จากบริการดังกล่าว และเราจะปรับปรุงนโยบายนี้
                  ให้สอดคล้องกับการใช้งานจริงเพิ่มเติม
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">3. วัตถุประสงค์ในการใช้ข้อมูล</h2>
                <p>เราใช้ข้อมูลที่เก็บรวบรวมเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>ให้บริการและดำเนินการระบบ</strong> รวมถึงการสร้างการประมาณการราคา ช่วงราคา
                    ค่าความเชื่อมั่น และผลลัพธ์อื่นที่เกี่ยวข้อง
                  </li>
                  <li>
                    <strong>ปรับปรุงบริการและโมเดล</strong> เช่น วิเคราะห์วิธีที่ผู้ใช้โต้ตอบกับฟีเจอร์ต่าง ๆ
                    เพื่อปรับปรุงส่วนติดต่อผู้ใช้ โมเดลประเมินราคา และข้อความอธิบายผลลัพธ์
                  </li>
                  <li>
                    <strong>ตรวจสอบประสิทธิภาพและป้องกันการใช้งานที่ไม่เหมาะสม</strong> เช่น ตรวจจับรูปแบบการใช้งานที่ผิดปกติ
                    ป้องกันการดึงข้อมูลอัตโนมัติหรือการโจมตี และรักษาเสถียรภาพของโครงสร้างพื้นฐาน
                  </li>
                  <li>
                    <strong>การวิเคราะห์และสถิติการใช้งาน</strong> เช่น นับจำนวนการเข้าชมหน้าเว็บ
                    ติดตามปริมาณการค้นหาตามยี่ห้อ/รุ่น และประเมินการใช้งานฟีเจอร์ต่าง ๆ ในภาพรวม
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  4. ฐานทางกฎหมายในการประมวลผลข้อมูล
                </h2>
                <p>ขึ้นอยู่กับเขตอำนาจศาลของคุณ เราอาจอาศัยฐานทางกฎหมายต่าง ๆ ในการประมวลผลข้อมูล เช่น:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>ผลประโยชน์อันชอบธรรม</strong> เช่น การให้และปรับปรุงบริการ รักษาความปลอดภัย
                    และทำความเข้าใจรูปแบบการใช้งาน
                  </li>
                  <li>
                    <strong>ความยินยอม</strong> ในกรณีที่เราได้รับความยินยอมสำหรับฟีเจอร์เพิ่มเติมบางอย่าง
                    (เช่น การใช้คุกกี้หรือการติดตามบางประเภท ตามกฎหมายที่กำหนด)
                  </li>
                  <li>
                    <strong>การปฏิบัติตามกฎหมาย</strong> ในกรณีที่เราจำเป็นต้องเก็บหรือเปิดเผยข้อมูลบางประเภทตามข้อกำหนดของกฎหมาย
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">5. การเปิดเผยและแบ่งปันข้อมูล</h2>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.1 ผู้ให้บริการภายนอก</h3>
                <p>
                  เราอาจแบ่งปันข้อมูลกับผู้ให้บริการภายนอกที่ช่วยให้เราดำเนินการบริการได้ เช่น ผู้ให้บริการโฮสต์
                  โครงสร้างพื้นฐานบนคลาวด์ แพลตฟอร์มบันทึก log หรือเครื่องมือวิเคราะห์ข้อมูล ผู้ให้บริการเหล่านี้
                  จะประมวลผลข้อมูลในนามของเรา และมีข้อผูกมัดตามสัญญาในการปกป้องข้อมูล
                  และใช้ข้อมูลเฉพาะตามวัตถุประสงค์ที่เราแจ้งให้ทราบ
                </p>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.2 การปฏิบัติตามกฎหมายและการคุ้มครองสิทธิ</h3>
                <p>เราอาจเปิดเผยข้อมูลหากเห็นโดยสุจริตว่าจำเป็นอย่างสมเหตุสมผลเพื่อ:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>ปฏิบัติตามกฎหมาย ระเบียบ หรือกระบวนการทางกฎหมายที่เกี่ยวข้อง</li>
                  <li>ตอบสนองต่อคำขอที่ถูกต้องจากหน่วยงานของรัฐหรือหน่วยงานกำกับดูแล</li>
                  <li>ปกป้องสิทธิ ทรัพย์สิน หรือความปลอดภัยของ CarPriceAI ผู้ใช้ หรือสาธารณะ</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.3 การไม่ขายข้อมูลส่วนบุคคล</h3>
                <p>
                  เราไม่ขายข้อมูลส่วนบุคคล เราอาจแบ่งปันข้อมูลในรูปแบบสถิติหรือที่ผ่านการทำให้ไม่สามารถระบุตัวตนได้
                  เช่น ปริมาณการค้นหาโดยรวม หรือความนิยมของยี่ห้อ/รุ่นรถ โดยไม่สามารถระบุถึงตัวบุคคลได้อย่างสมเหตุสมผล
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">6. ระยะเวลาในการเก็บรักษาข้อมูล</h2>
                <p>
                  เราจะเก็บรักษาข้อมูลตราบเท่าที่จำเป็นเพื่อบรรลุวัตถุประสงค์ตามที่ระบุในนโยบายนี้
                  หรือเท่าที่กฎหมายกำหนด โดยทั่วไป:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    log ของเซิร์ฟเวอร์และเหตุการณ์การใช้งานแบบละเอียด อาจถูกเก็บไว้ประมาณ 30 ถึง 180 วัน
                    เว้นแต่จำเป็นต้องเก็บไว้นานกว่านั้นเพื่อเหตุผลด้านความปลอดภัย กฎหมาย หรือการดำเนินงาน
                  </li>
                  <li>
                    ข้อมูลการวิเคราะห์ในเชิงสถิติที่ผ่านการทำให้ไม่สามารถระบุตัวบุคคลได้ (เช่น
                    สถิติภาพรวมของการค้นหา) อาจถูกเก็บรักษาไว้นานกว่า
                    เนื่องจากไม่สามารถระบุถึงตัวบุคคลได้โดยตรง
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">7. ความปลอดภัยของข้อมูล</h2>
                <p>
                  เราใช้มาตรการด้านเทคนิคและองค์กรที่เหมาะสม เพื่อปกป้องข้อมูลที่เราประมวลผลจากการเข้าถึง
                  การสูญหาย การใช้งานในทางที่ผิด หรือการแก้ไขโดยไม่ได้รับอนุญาต อย่างไรก็ตาม
                  ไม่มีระบบใดที่ปลอดภัยได้อย่างสมบูรณ์ และเราไม่สามารถรับประกันความปลอดภัยในระดับสัมบูรณ์ได้
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">8. สิทธิและทางเลือกของคุณ</h2>
                <p>
                  ขึ้นอยู่กับกฎหมายในเขตอำนาจของคุณ คุณอาจมีสิทธิบางประการเกี่ยวกับข้อมูลส่วนบุคคลของคุณ
                  เช่น สิทธิในการขอเข้าถึง แก้ไข หรือให้ลบข้อมูลที่เรามีอยู่เกี่ยวกับคุณ
                </p>
                <p className="mt-2">
                  แม้ว่าบริการจะไม่ได้ใช้บัญชีผู้ใช้โดยทั่วไป คุณสามารถติดต่อเราได้ที่{' '}
                  <strong>privacy@yourdomain.com</strong> หากมีคำถามเกี่ยวกับข้อมูลของคุณ
                  หรือประสงค์จะยื่นคำขอ เราอาจต้องทำการยืนยันตัวตนของคุณก่อนดำเนินการบางคำขอ
                </p>
                <p className="mt-2">
                  หากเป็นไปได้ คุณยังสามารถจำกัดการติดตามบางประเภทที่อาศัยคุกกี้หรือการวิเคราะห์พฤติกรรม
                  โดยการปรับตั้งค่าเบราว์เซอร์ของคุณ หรือใช้กลไก opt-out ที่เครื่องมือภายนอก (หากมีการเชื่อมต่อ)
                  จัดเตรียมไว้ให้
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">9. ความเป็นส่วนตัวของเด็กและเยาวชน</h2>
                <p>
                  บริการนี้ไม่ได้มุ่งเน้นหรือออกแบบมาเพื่อเด็กอายุต่ำกว่า 13 ปี
                  (หรือช่วงอายุที่สูงกว่าตามที่กฎหมายท้องถิ่นกำหนด) และเราไม่ได้มีเจตนาเก็บข้อมูลส่วนบุคคลจากเด็กกลุ่มดังกล่าว
                  หากเราทราบว่าได้เก็บข้อมูลจากเด็กโดยฝ่าฝืนกฎหมายที่ใช้บังคับ เราจะดำเนินการตามสมควรเพื่อทำลายหรือลบข้อมูลนั้น
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">10. การโอนข้อมูลระหว่างประเทศ</h2>
                <p>
                  บริการอาจโฮสต์บนเซิร์ฟเวอร์ที่อยู่นอกประเทศของคุณ รวมถึงนอกประเทศไทย
                  ทำให้ข้อมูลของคุณอาจถูกโอนและประมวลผลในประเทศที่มีกฎหมายคุ้มครองข้อมูลแตกต่างจากเขตอำนาจของคุณ
                  เราจะดำเนินการตามความเหมาะสมเพื่อให้การโอนข้อมูลดังกล่าวเป็นไปตามข้อกำหนดของกฎหมาย
                  และเพื่อให้ข้อมูลของคุณยังคงได้รับการคุ้มครองอย่างเหมาะสม
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">11. การเปลี่ยนแปลงนโยบายความเป็นส่วนตัว</h2>
                <p>
                  เราอาจปรับปรุงนโยบายความเป็นส่วนตัวฉบับนี้เป็นครั้งคราว เมื่อมีการเปลี่ยนแปลงที่มีนัยสำคัญ
                  เราจะปรับปรุง “วันที่มีผล” ที่ส่วนต้นของหน้านี้ และอาจแสดงประกาศเพิ่มเติมในบริการ
                  (เช่น แบนเนอร์หรือข้อความแจ้งเตือน) การที่คุณยังคงใช้บริการต่อไปหลังจากนโยบายที่แก้ไขมีผล
                  ถือว่าคุณยอมรับการเปลี่ยนแปลงดังกล่าวแล้ว
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">12. ช่องทางติดต่อ</h2>
                <p>
                  หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวฉบับนี้ หรือแนวทางการประมวลผลข้อมูลของเรา
                  โปรดติดต่อที่ <strong>privacy@yourdomain.com</strong>
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">1. Overview and Scope</h2>
                <p>
                  This Privacy Policy explains how CarPriceAI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
                  collects, uses, and protects information in connection with our car price estimation website and
                  related services (the &quot;Service&quot;). It applies to all visitors and users of the Service,
                  including users located in Thailand and other countries.
                </p>
                <p className="mt-2">
                  The Service currently does not require user accounts or payments. However, we may still process
                  certain information about your device, usage, and the inputs you provide in order to generate price
                  estimates and improve the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">2. Data We Collect</h2>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.1 Vehicle Inputs</h3>
                <p>
                  When you use the Service, you may provide information such as the vehicle&apos;s make, model, trim
                  or series, year, and mileage. These inputs are used to generate price estimates and related outputs
                  such as price bands and confidence levels.
                </p>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.2 Usage Data</h3>
                <p>We may collect information about how you interact with the Service, including:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Pages viewed (for example, home page, FAQ, analytics, terms, privacy).</li>
                  <li>
                    Actions taken (for example, submitting a price estimate search, viewing price graphs, viewing
                    depreciation estimates, or copying results).
                  </li>
                  <li>Timestamps of requests and interactions.</li>
                  <li>Basic session identifiers or anonymous IDs stored in local storage or cookies.</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.3 Device and Technical Data</h3>
                <p>We may automatically collect technical information from your browser or device, such as:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    IP address (which may be used to derive approximate location, such as city or country).
                  </li>
                  <li>Browser type and version.</li>
                  <li>Operating system and device type.</li>
                  <li>Referring and exit pages, and other standard log information.</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">2.4 Cookies and Local Storage</h3>
                <p>
                  The Service may use cookies or local storage to remember your preferences (for example, language or
                  theme), maintain session identifiers, and support analytics. If we integrate Google Analytics or
                  similar tools, they may also set their own cookies.
                </p>
                <p className="mt-2 font-semibold">
                  Note: If we integrate Google Analytics, you may see a cookie from that service; we will update this
                  policy accordingly to reflect the specific implementation.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">3. How We Use Data</h2>
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>Provide and operate the Service</strong>, including generating car price estimates, price
                    bands, confidence indicators, and related outputs.
                  </li>
                  <li>
                    <strong>Improve the Service and models</strong>, for example by analyzing how users interact with
                    features to refine our user interface, pricing models, and result explanations.
                  </li>
                  <li>
                    <strong>Monitor performance and prevent abuse</strong>, such as detecting unusual traffic patterns,
                    preventing automated scraping or attacks, and ensuring the stability of our infrastructure.
                  </li>
                  <li>
                    <strong>Analytics and usage statistics</strong>, such as counting page views, tracking search
                    volume by make/model, and measuring feature engagement in aggregate.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">4. Legal Bases for Processing</h2>
                <p>Depending on your location, we may rely on different legal bases to process your information, including:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>Legitimate interests</strong>, such as providing and improving the Service, maintaining
                    security, and understanding usage patterns.
                  </li>
                  <li>
                    <strong>Consent</strong>, where we obtain it for specific optional features (for example, certain
                    analytics or cookies, where required by law).
                  </li>
                  <li>
                    <strong>Compliance with legal obligations</strong>, where we are required to retain or disclose
                    certain information.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">5. Sharing of Information</h2>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.1 Service Providers</h3>
                <p>
                  We may share information with third-party service providers that help us operate the Service, such
                  as hosting providers, cloud infrastructure, logging platforms, or analytics tools. These providers
                  process data on our behalf and are contractually obligated to protect it and use it only for the
                  purposes we specify.
                </p>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.2 Legal Compliance and Protection</h3>
                <p>We may disclose information if we believe in good faith that such disclosure is reasonably necessary to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Comply with applicable laws, regulations, or legal processes.</li>
                  <li>Respond to valid requests from public authorities.</li>
                  <li>Protect the rights, property, or safety of CarPriceAI, our users, or the public.</li>
                </ul>

                <h3 className="font-semibold mt-3 mb-1 text-foreground">5.3 No Selling of Personal Data</h3>
                <p>
                  We do not sell personal data. We may share aggregated or de-identified statistics that do not
                  reasonably identify you, such as overall search volumes or model popularity trends.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">6. Data Retention</h2>
                <p>
                  We retain information for as long as necessary to fulfill the purposes described in this policy or
                  as required by law. In general:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    Server logs and detailed usage events may be kept for a period in the range of approximately 30
                    to 180 days, unless a longer period is required for security, legal, or operational reasons.
                  </li>
                  <li>
                    Aggregated or anonymized analytics data (for example, summary statistics of searches) may be
                    retained for a longer period, as it does not directly identify individual users.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">7. Security</h2>
                <p>
                  We implement reasonable technical and organizational measures designed to protect the information we
                  process from unauthorized access, loss, misuse, or alteration. However, no system can be completely
                  secure, and we cannot guarantee absolute security of your information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">8. Your Rights and Choices</h2>
                <p>
                  Depending on your jurisdiction, you may have certain rights regarding your personal data, including
                  the right to request access, correction, or deletion of information we hold about you.
                </p>
                <p className="mt-2">
                  While the Service generally operates without user accounts, you may contact us at{' '}
                  <strong>privacy@yourdomain.com</strong> if you have questions about your data or wish to make a
                  request. We may need to verify your identity before acting on certain requests.
                </p>
                <p className="mt-2">
                  Where feasible, you may also choose to limit certain analytics or cookie-based tracking by adjusting
                  your browser settings or using built-in opt-out mechanisms provided by third-party tools (if and
                  when they are integrated).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">9. Children&apos;s Privacy</h2>
                <p>
                  The Service is not directed to children under the age of 13 (or a higher age threshold where
                  required by local law), and we do not knowingly collect personal data from children. If we become
                  aware that we have collected personal data from a child in violation of applicable law, we will take
                  reasonable steps to delete it.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">10. International Data Transfers</h2>
                <p>
                  The Service may be hosted on servers located outside of your country, including outside of Thailand.
                  As a result, your information may be transferred to and processed in countries that may have
                  different data protection laws than those in your jurisdiction. We take steps to ensure that such
                  transfers comply with applicable legal requirements and that your information remains protected.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">11. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. When we make material changes, we will revise
                  the &quot;Effective date&quot; at the top of this page and may provide additional notice as
                  appropriate (for example, via a banner or notification on the Service). Your continued use of the
                  Service after the updated policy becomes effective constitutes your acceptance of the changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 text-foreground">12. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
                  <strong>privacy@yourdomain.com</strong>.
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

export default PrivacyPage;


