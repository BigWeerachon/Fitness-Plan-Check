# Fitness Plan Check (Fitnese)

แอปมือถือ iOS / Android สำหรับวางแผนและบันทึกการออกกำลังกายด้วยน้ำหนัก เปิดแล้วรู้ทันทีว่าวันนี้ต้องทำอะไร

## โครงสร้างไฟล์

| ไฟล์ | คืออะไร |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | สเปคแอปฉบับเต็ม (แหล่งความจริงหลัก) |
| [`docs/reference/theme-reference.jpg`](docs/reference/theme-reference.jpg) | ภาพอ้างอิงธีม (ธีมมืด แสงเรืองม่วง การ์ดเทาเข้ม แถบเมนูแคปซูล) |
| [`prompts/PHASE_1.md`](prompts/PHASE_1.md) | Prompt เฟส 1: วางโครงสร้าง เอกสาร และโครงโปรเจกต์ |
| [`prompts/PHASE_2.md`](prompts/PHASE_2.md) | Prompt เฟส 2: สร้างแอปจนเสร็จ |

## วิธีใช้

1. เปิด repo นี้ในเครื่องมือ AI ที่เขียนโค้ดได้ (เช่น Claude Code)
2. คัดลอก Prompt ใน `prompts/PHASE_1.md` ไปวาง แล้วรอผลงานเฟส 1
3. ตรวจเอกสารใน `docs/` และตอบคำถามใน `docs/OPEN_QUESTIONS.md`
4. คัดลอก Prompt ใน `prompts/PHASE_2.md` ไปวาง เพื่อสร้างจนเสร็จ
5. ถ้าเซสชันขาดกลางทาง ให้สั่ง "อ่าน docs/PROGRESS.md แล้วทำเฟส 2 ต่อจากจุดที่ค้าง"

## ภาพรวมสเปค

- ตารางออกกำลังกายรายสัปดาห์แบบอิสระ + หน้าแรกเป็นการ์ดของวันนี้
- กรุ๊ปโปรแกรม (PPL, Upper/Lower, Full Body ฯลฯ) ทั้งสร้างเองและเทมเพลต
- Progressive overload (Double / Linear) ปรับได้ระหว่างฝึก
- คำนวณ BMR / TDEE / เป้าสารอาหาร (เป็นคำแนะนำเท่านั้น)
- สถิติ % ตามกรุ๊ป ประเภท routine และกลุ่มกล้ามเนื้อ รายวัน/สัปดาห์/เดือน/ปี
- ล็อกอิน Google / Apple ก่อนเริ่มทดลอง
- ทดลองฟรี 7 วันผ่านสโตร์ จากนั้นรายเดือน (~19 บาท) หรือซื้อขาด (~99 บาท) ตามราคาขั้นต่ำของแต่ละสโตร์

Tech stack: Expo (React Native) + TypeScript, expo-sqlite + Drizzle, Supabase, RevenueCat
