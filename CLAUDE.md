# Fitnese — คู่มือสำหรับผู้พัฒนา/เอเจนต์

แอป Expo (React Native) วางแผนและบันทึกการฝึกด้วยน้ำหนัก สเปคหลัก: `docs/SPEC.md` (ห้ามแก้) — **`docs/SPEC_CHANGES.md` มีผลเหนือ SPEC.md ในข้อที่ขัดกัน** (แอปออฟไลน์ล้วน 2026-10-14) · งาน: `docs/TASKS.md` · ความคืบหน้า: `docs/PROGRESS.md` · สถาปัตยกรรม: `docs/ARCHITECTURE.md` · ภาษาภาพ: `docs/DESIGN_SYSTEM.md` · การตัดสินใจ: `docs/DECISIONS.md`

## คำสั่ง
```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # expo lint --max-warnings 0 (รวม prettier + ห้ามข้อความฮาร์ดโค้ดใน JSX)
npm test              # jest (SQLite จริงผ่าน better-sqlite3, service จำลอง)
npm run check         # ทั้งสามอย่าง — ต้องผ่านก่อน commit ทุกครั้ง
npx prettier --write <files>
npm run db:generate   # หลังแก้ src/db/schema.ts → drizzle/*.sql + src/db/migrations.generated.ts
```
Expo SDK 57 — API อาจต่างจากที่จำได้ ให้เปิดดู `.d.ts` ใน `node_modules` ก่อนใช้ (เครือข่ายเข้า docs.expo.dev ไม่ได้)
ถ้าทำงานใน git worktree ที่ไม่มี node_modules: `ln -s /home/user/Fitness-Plan-Check/node_modules node_modules`

## กฎของโค้ด
- **ข้อความที่ผู้ใช้เห็นทั้งหมดมาจาก i18n** (`t('ns.key')`) เพิ่ม key ใน `src/i18n/locales/en/<ns>.ts` และ `th/<ns>.ts` ให้ครบทั้งคู่ (ไทยถูกบังคับชนิดให้ key ตรงกับอังกฤษ) ห้ามมี literal ใน JSX หรือ prop `accessibilityLabel/placeholder/title/label`
- **UI ใช้คอมโพเนนต์จาก `src/components`** (Screen, HeroTitle, CardGroup, BigRow, ListRow, WeekdayDots, Toggle, CircleButton, Button, Chip, SegmentedControl, Sheet, NumberPad, TextField, states) และสีจาก `usePalette()` เท่านั้น ห้ามใส่สี hex เองในหน้าจอ
- **แอปออฟไลน์ล้วน (D81)**: ไม่มี backend/ล็อกอิน/ซิงก์ ข้อมูลอยู่ใน SQLite บนเครื่องเท่านั้น; ซื้อผ่าน RevenueCat แบบนิรนาม (ห้ามเรียก logIn/logOut)
- **เขียนข้อมูลผู้ใช้ผ่าน `src/db/mutations.ts`** (createRow/updateRow/softDeleteRow) เท่านั้น — ไม่มีคิวซิงก์แล้ว แต่ยังใส่ owner (`getOwner()` = `'local'` เสมอ), updatedAt และแจ้งหน้าจอให้อัตโนมัติ; อ่านข้อมูลต้องกรอง `ownerId = getOwner()` และ `deletedAt IS NULL`
- **สำรอง/กู้คืน (D82)**: รูปแบบไฟล์และการตรวจอยู่ใน `src/domain/backup.ts` (ฟังก์ชันล้วน), อ่าน/เขียนฐานข้อมูลใน `src/db/backup.ts`, UI/IO ใน `src/features/backup/` — เพิ่มตาราง/คอลัมน์ผู้ใช้ใน `schema.ts` แล้วต้องคงการกู้คืนไฟล์เก่าได้ (คอลัมน์ใหม่ต้องมีค่าเริ่มต้นหรือว่างได้, ตารางใหม่ต้องประกาศ `introducedIn`) และเพิ่มเทสต์ใน `__tests__/domain/backup.test.ts` / `__tests__/db/backup.test.ts`; ห้ามเปลี่ยน `format: 'fitnese-backup'`; ตารางผู้ใช้ใหม่ต้องถูกลบใน `wipeLocalData` ด้วย
- **ความเป็นส่วนตัว**: ห้ามเพิ่มโค้ดที่ส่งข้อมูลผู้ใช้ออกจากเครื่อง (ไม่มี `Purchases.setAttributes`/analytics) ถ้าจำเป็นต้องแก้ `src/legal/content.ts`, privacy manifest ใน `app.config.ts` และ `store-metadata/privacy-labels.md` พร้อมกัน
- **สิทธิ์ใช้งาน**: ตัดสินผ่าน `useAccess()`/`getAccess()` เท่านั้น หน้าใหม่ที่เป็นฟีเจอร์ต้องอยู่ใต้ `src/app/(app)/` (ถูกล็อกอัตโนมัติ)
- ตรรกะ/สูตรเป็นฟังก์ชันล้วนใน `src/domain/` และต้องมี unit test
- เวลาใช้ `now()` จาก `src/utils/clock.ts` (สลับได้ในเทสต์), id ใช้ `newId()`
- น้ำหนักเก็บเป็น kg เสมอ, วันที่เก็บเป็น `YYYY-MM-DD` ตามเวลาท้องถิ่น
- ปุ่มแตะได้ ≥ 48 (`MIN_TOUCH`), ใส่ `accessibilityRole/Label` ให้ปุ่มที่เป็นไอคอน
- comment ภาษาไทยเฉพาะส่วนที่ซับซ้อน, ห้ามทิ้ง TODO ที่ไม่ได้บันทึกใน PROGRESS.md, ห้ามเพิ่มฟีเจอร์นอกสเปค
- เทสต์อยู่ใน `__tests__/**.test.ts(x)`; ตัวช่วย `__tests__/helpers/env.ts` (`freshEnv()` = DB ใหม่ + service จำลอง)
