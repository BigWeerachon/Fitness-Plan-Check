# Prompt เฟส 1: วางโครงสร้าง

> วิธีใช้: คัดลอกข้อความในกล่องด้านล่างทั้งหมด ไปวางในเครื่องมือ AI ที่เปิด repo นี้อยู่
> สเปคเต็มอยู่ที่ `docs/SPEC.md` และภาพธีมอยู่ที่ `docs/reference/theme-reference.jpg` แล้ว ไม่ต้องแปะซ้ำ

```
คุณคือ Senior Mobile Architect + Developer + UX/UI Designer
งานนี้คือ "เฟส 1: วางโครงสร้าง" ของแอปฟิตเนสสำหรับ iOS และ Android ใน repo นี้ ยังไม่ต้องสร้างฟีเจอร์ให้ใช้งานได้จริง

ก่อนเริ่ม:
1. อ่าน docs/SPEC.md ทั้งไฟล์ — นี่คือสเปคหลักของแอป ห้ามแก้ไข ย่อ หรือตัดทอนไฟล์นี้
2. เปิดดูภาพ docs/reference/theme-reference.jpg (แอปนาฬิกาปลุกธีมมืด) ซึ่งเป็นภาพอ้างอิงธีมตามหมวด [DS] ใน SPEC แล้วบันทึกการวิเคราะห์ภาพลงใน docs/DESIGN_SYSTEM.md

ทำเฉพาะสิ่งที่ระบุใน "ผลงานที่ต้องส่งมอบเฟส 1" ด้านล่าง แล้วหยุดรอฉันตรวจก่อนเริ่มเฟส 2

══════════ ผลงานที่ต้องส่งมอบเฟส 1 ══════════
1. docs/ARCHITECTURE.md — ชั้นของระบบ, การไหลของข้อมูล offline-first และการซิงก์, state machine สิทธิ์ (แผนภาพข้อความ + ตารางการเปลี่ยนสถานะ จากเหตุการณ์ของ RevenueCat), ลำดับตั้งค่า→Paywall→ล็อกอิน→ซื้อ/ทดลอง (SPEC B4), โมเดลความปลอดภัย (RLS), เหตุผลที่เลือกเทคโนโลยีแต่ละตัว
2. docs/DATA_MODEL.md + โค้ด Drizzle schema + migration แรก + SQL ของ Supabase (ตาราง, RLS, Edge Function โครงสำหรับ RevenueCat webhook)
3. docs/SCREENS.md — รายการหน้าทั้งหมด แผนผังการนำทาง และสถานะของแต่ละหน้า (loading / ว่าง / error / ถูกล็อก)
4. docs/DESIGN_SYSTEM.md + ไฟล์ theme tokens ตามหมวด [DS] (สี/ตัวอักษร/ระยะ/มุมโค้ง, มืด/สว่าง, พาเลตสีหลัก 8 สีพร้อมตรวจ contrast, คอมโพเนนต์: GlowBackground, HeroTitle, RowCard, WeekdayDots, PillTabBar, Toggle) พร้อมบันทึกการวิเคราะห์ภาพอ้างอิง
5. docs/TASKS.md — รายการงานเฟส 2 เรียงลำดับ พร้อมเกณฑ์ผ่าน และตารางโยงทุกข้อของ SPEC ไปยังงานที่รับผิดชอบ (ห้ามตกหล่น)
6. docs/HUMAN_TASKS.md — สิ่งที่ฉันต้องทำเอง (สมัคร Apple Developer / Google Play Console / Supabase / RevenueCat, ตั้งค่า OAuth, สร้างสินค้าและ free trial offer ในสโตร์, ตั้งราคา, ใส่ key ใน .env) เรียงตามลำดับ
7. docs/TEST_PLAN.md
8. โปรเจกต์ Expo ที่รันได้: โครงโฟลเดอร์, TypeScript strict, ESLint/Prettier/Jest, .env.example, i18n th/en โครง, ThemeProvider + คอมโพเนนต์ธีมตามข้อ 4, Expo Router พร้อมทุกหน้าเป็น placeholder ในธีมจริง, db client + migration runner, store โครง, โมดูลสิทธิ์ (state machine) เป็นฟังก์ชันล้วนพร้อมเทสต์ และคอมโพเนนต์ตัวกั้นสิทธิ์ (gate) ที่ทุกหน้าใช้ร่วมกัน พร้อม mock adapter ของ RevenueCat
9. docs/OPEN_QUESTIONS.md — คำถามที่ยังไม่ชัดเจนของสเปค (ถ้ามี)

กติกาเฟส 1:
- ห้ามสร้างฟีเจอร์ให้ทำงานจริงนอกเหนือข้อ 8 ห้ามเพิ่มฟีเจอร์นอกสเปค
- รัน typecheck + lint + เทสต์ให้ผ่านก่อนส่งมอบ และ commit งานพร้อมข้อความชัดเจน
- เมื่อเสร็จให้สรุปสั้นๆ ว่าส่งมอบอะไรบ้างและมีคำถามอะไร แล้วหยุดรอฉัน
```
