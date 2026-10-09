# Fitnese — คู่มือสำหรับผู้พัฒนา/เอเจนต์

แอป Expo (React Native) วางแผนและบันทึกการฝึกด้วยน้ำหนัก สเปคหลัก: `docs/SPEC.md` (ห้ามแก้) · งาน: `docs/TASKS.md` · ความคืบหน้า: `docs/PROGRESS.md` · สถาปัตยกรรม: `docs/ARCHITECTURE.md` · ภาษาภาพ: `docs/DESIGN_SYSTEM.md` · การตัดสินใจ: `docs/DECISIONS.md`

## คำสั่ง
```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # expo lint --max-warnings 0 (รวม prettier + ห้ามข้อความฮาร์ดโค้ดใน JSX)
npm test              # jest (SQLite จริงผ่าน better-sqlite3, service จำลอง)
npm run check         # ทั้งสามอย่าง — ต้องผ่านก่อน commit ทุกครั้ง
npx prettier --write <files>
npm run db:generate   # หลังแก้ src/db/schema.ts → drizzle/*.sql + src/db/migrations.generated.ts
node scripts/sync-shared.js   # หลังแก้ src/domain/entitlement/machine.ts
```
Expo SDK 57 — API อาจต่างจากที่จำได้ ให้เปิดดู `.d.ts` ใน `node_modules` ก่อนใช้ (เครือข่ายเข้า docs.expo.dev ไม่ได้)
ถ้าทำงานใน git worktree ที่ไม่มี node_modules: `ln -s /home/user/Fitness-Plan-Check/node_modules node_modules`

## กฎของโค้ด
- **ข้อความที่ผู้ใช้เห็นทั้งหมดมาจาก i18n** (`t('ns.key')`) เพิ่ม key ใน `src/i18n/locales/en/<ns>.ts` และ `th/<ns>.ts` ให้ครบทั้งคู่ (ไทยถูกบังคับชนิดให้ key ตรงกับอังกฤษ) ห้ามมี literal ใน JSX หรือ prop `accessibilityLabel/placeholder/title/label`
- **UI ใช้คอมโพเนนต์จาก `src/components`** (Screen, HeroTitle, CardGroup, BigRow, ListRow, WeekdayDots, Toggle, CircleButton, Button, Chip, SegmentedControl, Sheet, NumberPad, TextField, states) และสีจาก `usePalette()` เท่านั้น ห้ามใส่สี hex เองในหน้าจอ
- **เขียนข้อมูลตารางที่ซิงก์ผ่าน `src/db/mutations.ts`** (createRow/updateRow/softDeleteRow) เท่านั้น — ใส่ owner, updatedAt และคิวซิงก์ให้อัตโนมัติ; อ่านข้อมูลต้องกรอง `ownerId = getOwner()` และ `deletedAt IS NULL`
- **สิทธิ์ใช้งาน**: ตัดสินผ่าน `useAccess()`/`getAccess()` เท่านั้น หน้าใหม่ที่เป็นฟีเจอร์ต้องอยู่ใต้ `src/app/(app)/` (ถูกล็อกอัตโนมัติ)
- ตรรกะ/สูตรเป็นฟังก์ชันล้วนใน `src/domain/` และต้องมี unit test
- เวลาใช้ `now()` จาก `src/utils/clock.ts` (สลับได้ในเทสต์), id ใช้ `newId()`
- น้ำหนักเก็บเป็น kg เสมอ, วันที่เก็บเป็น `YYYY-MM-DD` ตามเวลาท้องถิ่น
- ปุ่มแตะได้ ≥ 48 (`MIN_TOUCH`), ใส่ `accessibilityRole/Label` ให้ปุ่มที่เป็นไอคอน
- comment ภาษาไทยเฉพาะส่วนที่ซับซ้อน, ห้ามทิ้ง TODO ที่ไม่ได้บันทึกใน PROGRESS.md, ห้ามเพิ่มฟีเจอร์นอกสเปค
- เทสต์อยู่ใน `__tests__/**.test.ts(x)`; ตัวช่วย `__tests__/helpers/env.ts` (`freshEnv()` = DB ใหม่ + service จำลอง)
