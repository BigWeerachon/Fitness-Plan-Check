# ระบบดีไซน์ (DESIGN_SYSTEM)

> ภาษาภาพของ Fitnese ตาม SPEC หมวด [DS] และ N5 · อ้างอิงคู่กับ [SPEC.md](SPEC.md) · [SCREENS.md](SCREENS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DECISIONS.md](DECISIONS.md)
>
> แหล่งความจริงของค่าในเอกสารนี้คือโค้ด: `src/theme/tokens.ts`, `src/theme/typography.ts`, `src/theme/color.ts`, `src/theme/useTheme.ts`, `src/hooks/useReduceMotion.ts` และคอมโพเนนต์ใน `src/components/` — ถ้าโค้ดเปลี่ยน ให้แก้เอกสารนี้ตาม และรัน `npm run contrast` ใหม่
>
> ภาพอ้างอิง: [`docs/reference/theme-reference.jpg`](reference/theme-reference.jpg) · ภาพหน้าจอจริง: [`docs/screenshots/`](screenshots/) · ตาราง contrast ล่าสุดรันเมื่อ 2026-10-11 (ผ่านทั้งหมด)

## สารบัญ

1. [วิเคราะห์ภาพอ้างอิง และการแปลงเป็นคอมโพเนนต์](#1-วิเคราะห์ภาพอ้างอิง)
2. [Design tokens](#2-design-tokens)
3. [คอมโพเนนต์ (`src/components`)](#3-คอมโพเนนต์)
4. [กฎการใช้กับแต่ละหน้า + หลักฐานภาพหน้าจอ](#4-กฎการใช้กับแต่ละหน้า)
5. [Contrast (WCAG AA)](#5-contrast-wcag-aa)
6. [Accessibility และ Animation](#6-accessibility-และ-animation)
7. [Do / Don't สำหรับหน้าจอใหม่](#7-do--dont-สำหรับหน้าจอใหม่)
8. [การตรวจสอบ และข้อสังเกตที่ยังเปิดอยู่](#8-การตรวจสอบ-และข้อสังเกตที่ยังเปิดอยู่)

### สรุปหลักใหญ่ (อ่านข้อนี้ข้อเดียวถ้าไม่มีเวลา)

1. **พื้นดำสนิท + แสงเรืองสีหลักด้านบน** (`Screen` ใส่ `GlowBackground` ให้เอง) ยกเว้นหน้าเซสชันที่เป็นดำล้วน
2. **หัวข้อใหญ่สีหลักกลางจอ + บรรทัดย่อยสีเทา** (`HeroTitle`)
3. **รายการอยู่ในการ์ดเทาเข้มมุมโค้ง 28 รวมหลายแถวในกรอบเดียว** (`CardGroup` + `BigRow`/`ListRow`)
4. **สีทั้งหมดมาจาก `usePalette()`** ซึ่งคำนวณจากสีหลักที่ผู้ใช้เลือกด้วย `deriveAccent()` — รับประกัน contrast AA ทุกสี ทั้งสองโหมด
5. **ข้อความทั้งหมดมาจาก i18n, ปุ่มแตะได้ ≥ 48, ไอคอนต้องมี label**

---

## 1. วิเคราะห์ภาพอ้างอิง

ภาพ `docs/reference/theme-reference.jpg` เป็นภาพหน้าจอแอปนาฬิกาปลุกธีมมืด (ภาษาไทย) ขนาด 1080 × 2340 px ค่าด้านล่างวัดจากพิกเซลจริงของภาพ (ไฟล์ JPEG จึงคลาดเคลื่อนได้ ±2–3 ต่อช่องสี) ระยะบอกเป็น **% ของความกว้างจอ** เพื่อไม่ขึ้นกับความหนาแน่นจอ ส่วนค่า dp เป็น **ค่าประมาณ** โดยสมมติจอกว้าง ~411 dp (1080 px ÷ 2.625)

### 1.1 Layout โดยรวม (บนลงล่าง)

| ช่วงความสูงจอ | องค์ประกอบในภาพอ้างอิง |
|---|---|
| 0–4% | แถบสถานะของระบบ |
| 4–13% | พื้นดำว่าง แสงเรืองเริ่มจางๆ |
| 14–18% | หัวข้อใหญ่สีชมพูม่วงกึ่งกลาง "ปลุกใน 10 ชั่วโมง 31 นาที" (กว้าง ~76% ของจอ บรรทัดเดียว) |
| ~19–21% | บรรทัดย่อยสีเทา "พฤ. 8 ต.ค. 06:00" |
| 21–34% | พื้นว่างที่แสงเรืองค่อยๆ สว่างขึ้น |
| 35–37% | ปุ่ม "+" และ "⋮" เส้นบางสีหลัก ชิดขวา |
| 40% → ล่างสุด | การ์ดเทาเข้มก้อนเดียว แถวละหนึ่งนาฬิกาปลุก เลื่อนลอดใต้แถบเมนู |
| 90–97% | แถบเมนูแคปซูลลอย 4 ไอคอน |

รูปแบบที่ได้: ครึ่งบนของจอ "โล่ง" มีแค่หัวข้อกับแสง ข้อมูลทั้งหมดอยู่ในการ์ดก้อนเดียวครึ่งล่าง → เราใช้ลำดับเดียวกันทุกหน้าแท็บ: `HeroTitle` → `ActionBar` (+ ⋯) → `CardGroup`

### 1.2 แสงเรือง (glow)

**ภาพอ้างอิง**

- รูปทรง: วงรีแนวตั้งนุ่มๆ กึ่งกลางแนวนอน มองเห็นกว้างราว 67% ของจอ (x ≈ 17–83%) ขอบข้างจางเป็นดำ `#000000`
- ความสว่างไล่จากบนลงล่าง: `#050306` (y≈8%) → `#1C1421` (y≈21%) → `#2C1D34` (y≈30%) → **`#3B2645` สว่างสุดที่ y≈39%** ซึ่งชิดขอบบนการ์ดพอดี ดูเหมือนแสงลอดออกมาจากหลังการ์ด
- โทน: ม่วงอมชมพูหม่น (R59 G38 B69) ความเข้มเทียบเท่าสีม่วงกลางๆ ที่ความทึบราว 25–30% บนดำ
- หัวข้อใหญ่วางบนแสงที่ยังจางอยู่ (`#110C13` ที่ระดับหัวข้อ)

**ของเรา — `GlowBackground` (`src/components/GlowBackground.tsx`)**

- SVG `RadialGradient` บนสี่เหลี่ยมกว้าง W × สูง 1.25W ติดขอบบนจอ: `cx="50%" cy="22%" rx="62%" ry="48%"` (วงรีแนวตั้งเหมือนภาพอ้างอิง)
- จุดหยุดสี: offset 0 = `glowOpacity`, offset 0.5 = `glowOpacity × 0.45`, offset 1 = 0 (จางสู่พื้นหลัง)
- สีแสงคำนวณจากสีหลัก (ดูข้อ 2.3): โหมดมืด L = 0.55 ความทึบเริ่มที่ **30%**, โหมดสว่าง L = 0.78 ความทึบเริ่มที่ **35%** (บนพื้น `#F2F2F7` จึงดูจางกว่า ตาม SPEC "แสงเรืองจางลง") แล้ว **ลดลงทีละ 1% จนข้อความรองสีเทา (`textSecondary`) ที่วางบนจุดสว่างสุดของแสงผ่าน 4.5:1** — สีที่ทำให้สีเทาอ่านยากบนแสง (โหมดมืด: มินต์ 27%, ไลม์ 26%, ทอง 27%; โหมดสว่าง: ชมพูม่วง 34%, ลาเวนเดอร์ 24%, คอรัล 28%) จึงได้แสงจางกว่าเริ่มต้นเล็กน้อย (พาเลต 8 สี: ต่ำสุด 24% = lavender สว่าง, 26% = lime มืด; สีเองที่ทดสอบ: ต่ำสุด 22%; เพดานล่างในโค้ด `GLOW_OPACITY_MIN` = 12% ไม่เคยถูกใช้จริง) ค่าที่ใช้จริงอยู่ใน `Palette.glowOpacity` — ห้ามฮาร์ดโค้ด 0.30/0.35 ที่อื่น
- จุดสว่างสุดของสีชมพูม่วงโหมดมืด (ทึบ 30%) = `#3D1837` — ความสว่างใกล้กับ `#3B2645` ของภาพอ้างอิง
- **ต่างจากภาพอ้างอิงโดยตั้งใจ:** จุดสว่างสุดอยู่ที่ ~27% ของความกว้างจอจากขอบบน (หลังหัวข้อพอดี) ไม่ใช่ต่ำลงมาหลังการ์ด ตามที่ SPEC เขียนว่า "แสงเรือง … ที่ส่วนบนของหน้าจอ" (อีกทั้งตำแหน่งการ์ดแรกของแต่ละหน้าไม่คงที่เหมือนในภาพอ้างอิง) ผลคือหัวข้อสีหลักและบรรทัดย่อยสีเทาของ `HeroTitle` วางบนจุดที่สว่างที่สุด จึงบังคับให้ทั้งสีหลัก (`heroOnGlow`) และสีเทา (`secondaryOnGlow`) ผ่าน 4.5:1 กับจุดนั้น (คอลัมน์ "หัวข้อ/ข้อความรองบนแสงเรือง" ในข้อ 5)
- แสงอยู่กับที่ (อยู่นอก `ScrollView`) ไม่เลื่อนตามเนื้อหา `pointerEvents="none"`
- เปลี่ยนสีหลัก/โหมดแล้ว แสงใหม่ค่อยๆ ซ้อนทับแสงเดิม (crossfade 350 ms)

### 1.3 ตัวอักษรส่วนหัว (hero)

| | ภาพอ้างอิง | ของเรา (`HeroTitle`) |
|---|---|---|
| หัวข้อ | น้ำหนักปกติ (ไม่บาง ไม่หนา) กึ่งกลาง สูงรวมสระบน/ล่าง ~9% ของความกว้างจอ สีวัดได้ `#E8B6DB` (≈ `#E5A9DC` ใน SPEC) | `typography.hero` = IBM Plex Sans Thai Regular 32/46, สี `accent`, กึ่งกลาง, `accessibilityRole="header"`; แบบ `compact` = 26/38 |
| บรรทัดย่อย | ตัวเล็กสีเทา `#A3A2A7` ห่างจากหัวข้อเล็กน้อย | `typography.heroSub` 15/22 สี `textSecondary` (`#98989F` โหมดมืด) ระยะห่าง 4 |
| ระยะ | หัวข้ออยู่ ~14% จากขอบบน | `paddingTop` 72 (หน้าแท็บ) / 24 (`compact`) ใต้ safe area |

> หมายเหตุ: SPEC เขียนสีเทาบรรทัดย่อยว่า "~#8E8E93" แต่ภาพอ้างอิงจริงสว่างกว่า (`#A3A2A7`) ค่าที่เราใช้ `#98989F` (D44) อยู่ระหว่างสองค่านี้และผ่าน AA ทุกพื้น

### 1.4 การ์ดและการจัดกลุ่ม

| | ภาพอ้างอิง | ของเรา (`CardGroup`) |
|---|---|---|
| สีการ์ด | `#1B1B1B` (≈ `#1C1C1E`) | `card` = `#1C1C1E` (มืด) / `#FFFFFF` (สว่าง) |
| ขอบข้างจอ | 27 px ≈ 2.5% ของจอ (~10 dp) | `Screen` เว้นซ้ายขวา 16 dp (`spacing.lg`) |
| มุมโค้ง | ~65 px ≈ 6% ของจอ (~25 dp) | `radius.card` = 28 (ตาม SPEC ~28 dp) |
| การรวมแถว | ทุกแถวอยู่ในกรอบเดียว | แถวทั้งหมดเป็นลูกของ `CardGroup` ตัวเดียว |
| เส้นคั่น | เส้นบาง `#3A3A3A` เยื้องเข้าจากขอบการ์ดข้างละ ~45 px (~4% ของจอ) | `StyleSheet.hairlineWidth` สี `separator` (`rgba(255,255,255,0.10)` ≈ `#333335` บนการ์ด) เยื้องข้างละ 28 dp (`inset` ค่าเริ่มต้น `true`) |
| ระยะต่อแถว | ~321 px ≈ 30% ของจอ (~122 dp) | `BigRow` สูงอย่างน้อย 104 dp (`MIN_TOUCH + 56`, padding บนล่าง 24); ถ้ามี `footer` สูงอย่างน้อย 72 dp (padding ล่าง 4 แล้วต่อด้วย `footer`) |

### 1.5 โครงสร้างแถว (row anatomy)

```
┌──────────────────────────────────────────────┐
│  06:00                              (●━━)    │  ← ข้อความใหญ่ตัวบางสีขาว · สวิตช์สีหลักชิดขวา กึ่งกลางแนวตั้ง
│  · · ·   ·  ·                                │  ← จุดเล็กเหนือวันที่เปิด
│  อ จ อ พ พ ศ ส                               │  ← วันที่เปิด = สีหลักตัวหนา, วันอื่น = เทา
└──────────────────────────────────────────────┘
```

| ส่วน | ภาพอ้างอิง | ของเรา |
|---|---|---|
| ข้อความใหญ่ | ตัวเลขเวลา น้ำหนักบาง สีขาว เว้นจากขอบการ์ด ~73 px (~28 dp) ตัวเลขสูง ~7.7% ของจอ | `BigRow` → `typography.rowTitle` IBM Plex Sans Thai **Light** 30/42 สี `text`, เว้นซ้ายขวา 32 dp, ตัดได้ 2 บรรทัด (แถวของเราเป็นชื่อ routine/โปรแกรมซึ่งยาวกว่าเวลา 5 ตัวอักษร จึงเล็กกว่าภาพอ้างอิง ตัวเลขใหญ่จริง 48 ใช้ที่ `NumberPad`) |
| ตัวอักษรวัน | 7 ตัว ห่างกันสม่ำเสมอ วันที่เปิดสีชมพูหนา วันอื่นเทา `#747474` | `WeekdayDots` → ไทย `อา จ อ พ พฤ ศ ส` (ตาม SPEC; ภาพอ้างอิงย่อพฤหัสฯ เป็น "พ"), อังกฤษ `S M T W T F S` จาก `src/i18n/locales/*/date.ts` (`date.weekdaysShort`); เปิด = `dayLetterOn` (SemiBold 13/18) สี `accent`; ปิด = `dayLetter` (Regular 13/18) สี `textSecondary` ความทึบ 0.6 (≈ `#66666B` บนการ์ดโหมดมืด ใกล้ `#747474`) แถวแบบอ่านอย่างเดียวห่างกัน 8 dp; แบบแตะได้ (หน้า `week`) กว้างเท่ากันเต็มแถว วางใน `footer` ของ `BigRow` (ข้อ 3.5–3.6) |
| จุด | วงกลม ~5 px (~2 dp) เหนือตัวอักษรที่เปิด | วงกลม 4 × 4 dp สีเดียวกับตัวอักษร เว้นล่าง 2 |
| สวิตช์ | แคปซูล ~89 × 55 px ราง `#DE8FC6` (ชมพูเข้มกว่าข้อความเล็กน้อย) ปุ่มกลมขาว `#FCFCFC` | `Toggle` = `Switch` ของระบบ ราง `accentFill` (โหมดมืด = สีเดียวกับข้อความสีหลัก), ปุ่มกลม `#FFFFFF`, รางปิด `switchOff` |

### 1.6 แถบเมนูล่างแบบแคปซูลลอย

| | ภาพอ้างอิง | ของเรา (`PillTabBar`) |
|---|---|---|
| ตำแหน่ง/ขนาด | ลอยเหนือเนื้อหา กว้าง ~63% ของจอ สูง ~158 px (~60 dp) | ลอยกึ่งกลาง `bottom = max(insets.bottom, 12)`; แท็บละ 72 × 56, padding 6, gap 6 → แคปซูลกว้าง 318 × สูง 68 dp |
| พื้น | เทาเข้ม `#262626` มุมโค้งเต็ม | `tabBar` = `rgba(36,36,38,0.88)` (มืด) / `rgba(255,255,255,0.92)` (สว่าง), `radius.pill`, เส้นขอบ hairline `separator`, เงา (opacity 0.35, radius 16, y 6, elevation 10) |
| แท็บที่เลือก | วงรี ~263 × 133 px สีเทาอมม่วง `#473A44` ไอคอนทึบสีชมพู | วงรี 72 × 56 พื้น `accentSoft` (สีหลักเข้มโปร่งแสง) + ไอคอนแบบทึบสี `accent` |
| แท็บอื่น | ไอคอนเส้นบางสีเกือบขาว `#E9E8ED` | ไอคอนเส้น (`-outline`) สี `textSecondary` — **ต่างโดยตั้งใจ** ให้แท็บที่เลือกเด่นกว่า (SPEC กำหนดเฉพาะแท็บที่เลือก) |
| ไอคอน | นาฬิกาปลุก / นาฬิกาโลก / จับเวลา / นับถอยหลัง | Ionicons `today` · `barbell` · `stats-chart` · `settings` (เลือกแล้วใช้แบบทึบ ไม่เลือกใช้ `-outline`) ตรงกับ วันนี้ / โปรแกรม / สถิติ / ตั้งค่า |

เนื้อหาเลื่อนลอดใต้แคปซูลได้เหมือนภาพอ้างอิง `Screen withTabBar` เว้นที่ล่าง `TAB_BAR_SPACE` = 112 เพื่อให้แถวสุดท้ายเลื่อนขึ้นมาพ้นแถบได้

### 1.7 ปุ่ม "+" และ "⋯"

- ภาพอ้างอิง: "+" เส้นบาง และ "⋮" (จุดสามจุดแนวตั้ง) สีหลัก สูง ~52 px (~20 dp) ชิดขวา อยู่เหนือขอบบนการ์ด ~66 px (~25 dp)
- ของเรา: `ActionBar` (แถวชิดขวา padding ข้าง 12 gap 4) + `IconButton` ไอคอน `add` และ `ellipsis-vertical` ขนาด 26 สี `accent` พื้นที่แตะ 48 × 48 ทุกปุ่มต้องมี `label` จาก i18n (เช่น `today.startEmpty`, `a11y.menu`)
- ใช้ที่: หน้าวันนี้ (`+` = เริ่มเซสชันเปล่า, `⋮` = แผ่นเมนู), หน้าโปรแกรม (`+` = สร้างโปรแกรม, `⋮` = เมนู); หน้า Paywall (ปกติ) ใช้ `ActionBar` เดียวกันใส่ไอคอน `settings-outline` ไป `/account`; ภายในการ์ดเซสชันใช้ `ellipsis-horizontal` (⋯) เป็นเมนูต่อท่า

### 1.8 ตารางสรุป: ภาพอ้างอิง → คอมโพเนนต์

| องค์ประกอบในภาพอ้างอิง | คอมโพเนนต์ | token หลัก |
|---|---|---|
| พื้นดำ + แสงเรือง | `Screen` → `GlowBackground` | `background`, `glow`, `glowOpacity` |
| หัวข้อใหญ่ + บรรทัดย่อย | `HeroTitle` | `typography.hero/heroSub`, `accent`, `textSecondary` |
| + และ ⋮ | `ActionBar` + `IconButton` | `accent`, `MIN_TOUCH` |
| การ์ดรวมแถว + เส้นคั่น | `CardGroup` | `card`, `separator`, `radius.card` |
| แถวตัวเลขใหญ่ | `BigRow` | `typography.rowTitle` |
| แถวตัวอักษรวัน + จุด | `WeekdayDots` | `typography.dayLetter/dayLetterOn`, `accent` |
| สวิตช์ | `Toggle` | `accentFill`, `switchOff` |
| แถบแคปซูลลอย | `PillTabBar` | `tabBar`, `accentSoft`, `TAB_BAR_SPACE` |

สิ่งที่ **ไม่** นำมาจากภาพอ้างอิง: เนื้อหาเฉพาะแอปนาฬิกา (เวลา/ไอคอนนาฬิกา), ไอคอนแท็บที่ไม่ได้เลือกสีขาว, ตำแหน่งจุดสว่างของแสงที่ต่ำหลังการ์ด และการย่อ "พฤ" เป็น "พ"

---

## 2. Design tokens

ทุกค่ามาจาก `src/theme/tokens.ts` และ `src/theme/typography.ts` หน้าจอเข้าถึงสีผ่าน `usePalette()` (`src/theme/useTheme.ts`) เท่านั้น ซึ่งรวมโหมด (`settings.theme`: `dark` / `light` / `system`) กับสีหลัก (`settings.accent`) แล้วเรียก `buildPalette(mode, accent)` (memo ตาม mode+accent จึงอัปเดตสดทุกหน้า) — `system` ใช้ `useColorScheme()` ถ้าระบบไม่ใช่ `light` จะถือเป็นมืด; ค่าเริ่มต้นของแอปคือ `dark` + `pink` (D08, `DEFAULT_ACCENT`)

### 2.1 สีกลาง (`NEUTRALS`)

| key ใน `Palette` | มืด | สว่าง | ใช้ทำอะไร |
|---|---|---|---|
| `background` | `#000000` | `#F2F2F7` | พื้นหลังทุกหน้า, พื้นของระบบ (`SystemUI.setBackgroundColorAsync` ใน `src/app/_layout.tsx`) |
| `card` | `#1C1C1E` | `#FFFFFF` | การ์ด, แผ่นล่าง (Sheet), chip/segment ที่ไม่ได้เลือก, ปุ่ม `secondary` |
| `cardPressed` | `#2C2C2E` | `#E5E5EA` | พื้นแถวขณะถูกกด, ปุ่มแป้นตัวเลขขณะกด |
| `elevated` | `#2C2C2E` | `#FFFFFF` | ปุ่มแป้นตัวเลข, แถบตัวจับเวลาพัก |
| `separator` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.10)` | เส้นคั่นแถว, เส้นขอบ hairline, ขอบ chip ไม่เลือก, ที่จับ Sheet, เส้นกริดกราฟ |
| `text` | `#FFFFFF` | `#000000` | ข้อความหลัก, ข้อความใหญ่ในแถว |
| `textSecondary` | `#98989F` | `#636366` | บรรทัดย่อย, คำอธิบาย, ไอคอนแท็บไม่เลือก, ป้ายแกนกราฟ (D44) |
| `danger` | `#FF7A7A` | `#B71C1C` | `Button kind="danger"`, `ListRow danger`, ขอบ+ข้อความ error ของ `TextField`, ไอคอน `ErrorState`, ช่องยืนยันและปุ่มลบใน `delete-data` (D44) |
| `success` | `#7EE2A8` | `#176B3B` | ประกาศไว้สำหรับสถานะสำเร็จ (D44) — ยังไม่มีหน้าที่ใช้ |
| `warning` | `#F5C46B` | `#8A5A00` | `Badge tone="warning"` (ปัญหาการชำระเงิน BILLING_GRACE บนหน้าแรก), ไอคอนเตือนใน `delete-data` และการ์ดแจ้งก่อนซื้อ Lifetime ของ Paywall, คำเตือนในฟอร์มโปรไฟล์ |
| `tabBar` | `rgba(36,36,38,0.88)` | `rgba(255,255,255,0.92)` | พื้นแคปซูลแถบเมนู |
| `switchOff` | `#39393D` | `#D1D1D6` | รางสวิตช์ตอนปิด, ราง `ProgressBar`, รางแท่งในกราฟ % |
| `overlay` | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.35)` | ฉากหลังมืดลงเมื่อเปิด Sheet |
| `inputBg` | `#2C2C2E` | `#F2F2F7` | ช่องกรอก, ช่องน้ำหนัก/ครั้งในเซสชัน, ปุ่ม − + ของ Stepper |

### 2.2 สีหลัก 8 สี (`ACCENT_PRESETS`) และค่าที่คำนวณได้

ค่า base คือค่าที่เก็บในโค้ด ค่าที่เหลือคำนวณด้วย `deriveAccent()` (รันจริงจาก `src/theme/tokens.ts`) ชื่อแสดงผลมาจาก `appearance.accents.*` ใน i18n

**โหมดมืด** — ทุกสีใช้ base เป็นสีข้อความได้เลยโดยไม่ต้องปรับ

| id | ชื่อ (TH / EN) | base | `accent` (ข้อความ) | `accentFill` | `onAccent` | `glow` | `glowOpacity` (เริ่มที่ 30%) | จุดสว่างสุดของแสง | `accentSoft` | soft บนการ์ด / บนพื้น |
|---|---|---|---|---|---|---|---|---|---|---|
| `pink` (ค่าเริ่มต้น) | ชมพูม่วง / Pink | `#E5A9DC` | `#E5A9DC` | `#E5A9DC` | `#000000` | `#CA4FB7` | 30% | `#3D1837` | `rgba(157,47,140,0.45)` | `#562550` / `#47153F` |
| `lavender` | ลาเวนเดอร์ / Lavender | `#C3B4F7` | `#C3B4F7` | `#C3B4F7` | `#000000` | `#5D36E2` | 30% | `#1C1044` | `rgba(68,41,163,0.45)` | `#2E225A` / `#1F1249` |
| `sky` | ฟ้า / Sky | `#A9D2F7` | `#A9D2F7` | `#A9D2F7` | `#000000` | `#3691E2` | 30% | `#102C44` | `rgba(41,105,163,0.45)` | `#223F5A` / `#122F49` |
| `mint` | มินต์ / Mint | `#9BE3CB` | `#9BE3CB` | `#9BE3CB` | `#000000` | `#4CCDA2` | 27% | `#15372C` | `rgba(45,159,121,0.45)` | `#245747` / `#144836` |
| `lime` | ไลม์ / Lime | `#C8E59B` | `#C8E59B` | `#C8E59B` | `#000000` | `#9BD049` | 26% | `#283613` | `rgba(115,162,42,0.45)` | `#435823` / `#344913` |
| `gold` | ทอง / Gold | `#F2D58C` | `#F2D58C` | `#F2D58C` | `#000000` | `#E2B136` | 27% | `#3D300F` | `rgba(163,128,41,0.45)` | `#594923` / `#493A12` |
| `peach` | พีช / Peach | `#F7C2A2` | `#F7C2A2` | `#F7C2A2` | `#000000` | `#E27736` | 30% | `#442410` | `rgba(163,87,41,0.45)` | `#593723` / `#492712` |
| `coral` | คอรัล / Coral | `#F5A3A8` | `#F5A3A8` | `#F5A3A8` | `#000000` | `#E23641` | 30% | `#441014` | `rgba(163,41,48,0.45)` | `#592226` / `#491216` |

**โหมดสว่าง** — ทุกสีถูกทำให้เข้มลง (คงโทนเดิม) จนผ่าน 4.5:1 บนพื้นขาว/เทาอ่อน

| id | base | `accent` (ข้อความ) | `accentFill` | `onAccent` | `glow` | `glowOpacity` (เริ่มที่ 35%) | จุดสว่างสุดของแสง | `accentSoft` | soft บนการ์ด / บนพื้น |
|---|---|---|---|---|---|---|---|---|---|
| `pink` (ค่าเริ่มต้น) | `#E5A9DC` | `#A53293` | `#A53293` | `#FFFFFF` | `#E5A9DC` | 34% | `#EED9EE` | `rgba(229,169,220,0.35)` | `#F6E1F3` / `#EDD8EE` |
| `lavender` | `#C3B4F7` | `#633CEA` | `#633CEA` | `#FFFFFF` | `#AE9AF4` | 24% | `#E2DDF6` | `rgba(195,180,247,0.35)` | `#EAE5FC` / `#E2DCF7` |
| `sky` | `#A9D2F7` | `#1064AF` | `#1064AF` | `#FFFFFF` | `#98C9F5` | 35% | `#D3E4F6` | `rgba(169,210,247,0.35)` | `#E1EFFC` / `#D8E7F7` |
| `mint` | `#9BE3CB` | `#207358` | `#207358` | `#FFFFFF` | `#A7E6D1` | 35% | `#D8EEEA` | `rgba(155,227,203,0.35)` | `#DCF5ED` / `#D4EDE8` |
| `lime` | `#C8E59B` | `#51731E` | `#51731E` | `#FFFFFF` | `#CEE8A6` | 35% | `#E5EFDB` | `rgba(200,229,155,0.35)` | `#ECF6DC` / `#E3EDD7` |
| `gold` | `#F2D58C` | `#84630F` | `#84630F` | `#FFFFFF` | `#F4DA9A` | 35% | `#F3EAD6` | `rgba(242,213,140,0.35)` | `#FAF0D7` / `#F2E8D2` |
| `peach` | `#F7C2A2` | `#A5470E` | `#A5470E` | `#FFFFFF` | `#F6BB98` | 35% | `#F3DFD6` | `rgba(247,194,162,0.35)` | `#FCEADE` / `#F4E1D9` |
| `coral` | `#F5A3A8` | `#C11520` | `#C11520` | `#FFFFFF` | `#F49A9F` | 28% | `#F3D9DE` | `rgba(245,163,168,0.35)` | `#FCDFE1` / `#F3D6DB` |

ความหมายของแต่ละ key ใน `Palette`:

| key | มาจาก `AccentSet` | ใช้กับ |
|---|---|---|
| `accent` | `text` | ข้อความ/ไอคอนสีหลัก, หัวข้อ hero, ปุ่ม `plain`, ไอคอน `IconButton`, ขอบ chip ที่เลือก |
| `accentFill` | `fill` | พื้นปุ่ม `primary`, `CircleButton`, รางสวิตช์ตอนเปิด, ติ๊กเซ็ต, แถบความคืบหน้า, เส้น/แท่งกราฟ |
| `onAccent` | `onFill` | ข้อความ/ไอคอนบนพื้น `accentFill` |
| `glow`, `glowOpacity` | `glow`, `glowOpacity` | `GlowBackground` เท่านั้น (`glowOpacity` เป็นค่าที่ผ่านการลดจนข้อความรองบนแสงผ่าน 4.5:1 แล้ว ไม่ใช่ค่าคงที่ 0.30/0.35) |
| `accentSoft` | `soft` | พื้นแท็บ/chip/segment/แผนราคาที่เลือก |
| `accentSoftSurfaces` | `softSurfaces` | สีทึบจริงของ `accentSoft` บนการ์ดและพื้น (ใช้ตรวจ contrast เท่านั้น) |
| `chart` | `chartColors()` | สีชุดของกราฟสัดส่วน |

### 2.3 อัลกอริทึม `deriveAccent(base, mode)` และการเลือกสีเอง

ทั้งพาเลต 8 สีและสีที่ผู้ใช้เลือกเองผ่านฟังก์ชันเดียวกัน (`src/theme/tokens.ts`) โดยใช้ฟังก์ชันสีล้วนใน `src/theme/color.ts`:

- `ensureContrast(fg, backgrounds, min)` — ปรับความสว่าง (L ใน HSL) ทีละ 1% สูงสุด 100 ขั้น โดยคงโทนและความอิ่มตัว: ถ้าพื้นทุกสีมืด (luminance < 0.2) ทำให้สว่างขึ้น ไม่งั้นทำให้เข้มลง จนผ่าน `min` กับพื้น **ทุกสี** ที่ส่งเข้าไป ถ้าไม่มีทางผ่านคืนขาวหรือดำที่ดีกว่า
- `onColor(fill)` — เลือกสีที่ contrast สูงสุดจาก 3 ตัว: สีเข้มโทนเดียวกับ fill (H เดิม, S × 0.9, L 0.08), ขาว, ดำ แล้วรับประกัน ≥ 4.5
- `composite(fg, alpha, bg)` — สีทึบที่ได้จริงเมื่อวางสีโปร่งแสงบนพื้น

**โหมดมืด**

1. `glow` = HSL(H ของ base, S จำกัด 0.35–0.75, L 0.55), `glowOpacity` = `glowOpacityFor(glow, 0.30)` (ดูกฎด้านล่าง)
2. `peak` = `composite(glow, glowOpacity, #000000)` (จุดสว่างสุดของแสง = พื้นที่หัวข้อทับอยู่)
3. `softBase` = HSL(H, S จำกัด 0.25–0.60, L 0.40) → `soft` = `softBase` ที่ alpha 0.45, `softSurfaces` = soft วางบน `card` และ `background`
4. `text` = `ensureContrast(base, [background, card, elevated, peak, ...softSurfaces], 4.5)`
5. `fill` = `ensureContrast(base, [card], 3)`
6. `onFill` = `onColor(fill)`

**โหมดสว่าง**

1. `glow` = HSL(H, S จำกัด 0.40–0.85, L 0.78), `glowOpacity` = `glowOpacityFor(glow, 0.35)` (ดูกฎด้านล่าง)
2. `peak` = `composite(glow, glowOpacity, #F2F2F7)`
3. `soft` = base ที่ alpha 0.35, `softSurfaces` = soft วางบน `card` และ `background`
4. `text` = `ensureContrast(base, [background, card, elevated, peak, ...softSurfaces], 4.5)` (ทำให้เข้มลง)
5. `fill` = `ensureContrast(text, [card, background], 3)` (ในทางปฏิบัติ = `text`)
6. `onFill` = `onColor(fill)`

**กฎความทึบของแสงเรือง `glowOpacityFor(glow, start, mode)`** (ใหม่, D58) — เริ่มที่ `start` (30% มืด / 35% สว่าง ตาม SPEC "~20–30%") แล้วลดทีละ 1% (`GLOW_OPACITY_STEP` = 0.01) ตราบที่ contrast ของ `textSecondary` เทียบกับ `composite(glow, opacity, background)` ยัง < 4.5 (และยังไม่ถึงเพดานล่าง `GLOW_OPACITY_MIN` = 0.12) เหตุผล: บรรทัดย่อยของ `HeroTitle` เป็นสีเทาและวางบนจุดสว่างสุดของแสง ถ้าแสงสว่างเกินไป (เช่นเขียวมินต์/ไลม์/ทองโหมดมืด) สีเทาจะอ่านยาก; ค่า `glowOpacity` ที่ได้ถูกใช้ทั้งใน `peak` (ตรวจสีหลัก) และใน `GlowBackground` (วาดจริง) ผลที่พบจริง: พาเลต 8 สี 24–35% (ตารางข้อ 2.2), สีเองที่สุ่มทดสอบต่ำสุด 22%

**พื้นผิวที่รับประกัน** (`contrastReport()` มี 9 ค่า และ `passesAA()` ต้องผ่านทั้ง 9):

| เงื่อนไข | เกณฑ์ |
|---|---|
| `accent` บน `background`, บน `card` — `accentOnBackground` / `accentOnCard` (และบน `elevated` ซึ่งอยู่ในรายการพื้นของขั้นที่ 4) | ≥ 4.5 |
| `accent` บนจุดสว่างสุดของแสงเรือง (หัวข้อ hero) — `heroOnGlow` | ≥ 4.5 (เข้มกว่าเกณฑ์ข้อความใหญ่ 3:1) |
| `textSecondary` บนจุดสว่างสุดของแสงเรือง (บรรทัดย่อย hero) — `secondaryOnGlow` (ใหม่) | ≥ 4.5 (ได้จากการลด `glowOpacity` ไม่ใช่จากการเปลี่ยนสีเทา) |
| `accent` บน `accentSoft` ที่วางบนการ์ด/พื้น (chip/แท็บ/segment ที่เลือก) — `accentOnSoft` | ≥ 4.5 |
| `onAccent` บน `accentFill` (ข้อความบนปุ่ม) — `onAccentOnFill` | ≥ 4.5 |
| `accentFill` บน `card` (ปุ่ม สวิตช์ กราฟ = องค์ประกอบกราฟิก) — `fillOnCard` | ≥ 3 (`AA_GRAPHIC`) |
| `textSecondary` บน `card` — `secondaryOnCard` และบน `elevated`/`inputBg` — `secondaryOnElevated` | ≥ 4.5 |

**ขั้นตอนเลือกสีเอง** (`src/features/appearance/AppearancePickers.tsx`)

1. ผู้ใช้แตะวงสีสุดท้ายที่มีไอคอน `color-palette-outline` (`testID="accent-custom"`) ในหน้าตั้งค่าเริ่มต้นขั้น 1, หน้าตั้งค่า หรือหน้า `/account`
2. เปิด `Sheet` "เลือกสีของคุณ" มีตารางสีตัวอย่าง 36 สี (`CUSTOM_SWATCHES` = 12 โทนทุก 30° × ความสว่าง 0.82/0.72/0.60, S 0.65) และช่อง `TextField` "รหัสสี (Hex)" รับ `#RGB` หรือ `#RRGGBB` (มีหรือไม่มี `#` ก็ได้)
3. ถ้ารหัสไม่ถูกต้อง แสดง error `appearance.customInvalid` ใต้ช่อง และปุ่มใช้สีถูกปิด
4. พรีวิวสด: ข้อความ "วันนี้: Push Day" ด้วยสี `accent` ที่คำนวณจริงบนพื้น `background` ของโหมดปัจจุบัน ถ้าสีถูกปรับ (ค่าที่ได้ ≠ ค่าที่กรอก) แสดง `appearance.customAdjusted` ("ปรับความสว่างเล็กน้อยเพื่อให้ตัวอักษรยังอ่านง่าย")
5. กด "ใช้สีนี้" → เก็บ `#RRGGBB` ตัวพิมพ์ใหญ่ใน `settings.accent` → `usePalette()` คำนวณใหม่ → ทุกหน้าเปลี่ยนทันที แสงเรือง crossfade
6. ถ้าค่าที่เก็บอ่านไม่ได้ `resolveAccentBase()` กลับไปใช้ `pink`

ตัวอย่างผลจริงของสีเอง (คำนวณด้วย `buildPalette`):

| ค่าที่กรอก | โหมด | `accent` | `accentFill` | `onAccent` | หมายเหตุ |
|---|---|---|---|---|---|
| `#FFFF00` | มืด / สว่าง | `#FFFF00` / `#707000` | `#FFFF00` / `#707000` | `#000000` / `#FFFFFF` | สีสว่างมากถูกทำให้เข้มในโหมดสว่าง; แสงเรืองโหมดมืดจางลงเหลือ 22% |
| `#0000FF` | มืด / สว่าง | `#8585FF` / `#0000CC` | `#4D4DFF` / `#0000CC` | `#FFFFFF` / `#FFFFFF` | สีเข้มมากในโหมดมืด: ข้อความกับปุ่มได้คนละระดับ (4.5 vs 3); แสงเรืองโหมดสว่างจางลงเหลือ 22% |
| `#123456` | มืด / สว่าง | `#75ACE2` / `#123456` | `#256AAF` / `#123456` | `#FFFFFF` / `#FFFFFF` | |

> ข้อสังเกต: สีไม่มีโทน (เทา ขาว ดำ) มี H = 0 จึงได้แสงเรืองโทนแดงอมชมพู (`#B46464` มืด ทึบ 30% / `#DDB0B0` สว่าง ทึบ 34%) เพราะสูตรบังคับ S ขั้นต่ำของแสง — เป็นพฤติกรรมปัจจุบันของโค้ด

### 2.4 สีกราฟ (`chartColors(base, mode, 10)`)

- 10 สี เริ่มจาก H ของสีหลักแล้วหมุนทีละ golden angle 137.508° (สีติดกันต่างกันชัด), S จำกัด 0.45–0.80, L = 0.72 (มืด) / 0.42 (สว่าง)
- แต่ละสีผ่าน `ensureContrast(..., [card], 3)` และ **สีแรกแทนด้วย `accentFill`** เสมอ
- ตัวอย่าง `pink` มืด: `#E5A9DC #BCDE91 #91A6DE #DE9391 #91DEAA #C091DE #DED691 #91CFDE #DE91B9 #A2DE91`
- ตัวอย่าง `pink` สว่าง: `#A53293 #6FA031 #3250A4 #A43532 #32A456 #7832A4 #A09531 #328EA4 #A4326D #4BA432`
- contrast ต่ำสุดของทั้ง 10 สีบนการ์ด (ต้อง ≥ 3):

| สีหลัก | pink | lavender | sky | mint | lime | gold | peach | coral |
|---|---|---|---|---|---|---|---|---|
| มืด | 6.76 | 6.03 | 5.57 | 6.38 | 5.78 | 5.60 | 5.72 | 5.10 |
| สว่าง | 3.07 | 3.05 | 3.05 | 3.02 | 3.01 | 3.01 | 3.01 | 3.00 |

- การใช้: โดนัท/แท่งสัดส่วนในหน้าสถิติใช้ `p.chart[i % p.chart.length]`; กราฟเส้น (น้ำหนักตัว, 1RM) และแท่งแคลอรี่ใช้ `accentFill` สีเดียว; เส้นกริด/แกน `separator`; ป้ายแกน `textSecondary` ฟอนต์ `fonts.regular` 11 (`src/features/stats/charts.tsx`)

### 2.5 มุมโค้ง ระยะห่าง ขนาดแตะ การเคลื่อนไหว

| `radius` | ค่า | ใช้กับ |
|---|---|---|
| `card` | 28 | `CardGroup`, `Card`, การ์ดแคลอรี่หน้าแรก, แถบตัวจับเวลาพัก (แผนราคาใน Paywall ใช้ `card - 8` = 20) |
| `row` | 20 | ประกาศไว้ ยังไม่มีคอมโพเนนต์ใช้ |
| `button` | 16 | ปุ่มแป้นตัวเลข, ปุ่ม Stepper, กรอบ Disclaimer, กล่องพรีวิวสีเอง |
| `pill` | 999 | `Button`, `Chip`, `SegmentedControl`, `Badge`, แถบเมนู |
| `sheet` | 28 | มุมบนของ `Sheet` |
| `input` | 14 | `TextField`, ช่องน้ำหนัก/ครั้งในเซสชัน |

| `spacing` | xxs | xs | sm | md | lg | xl | xxl | xxxl |
|---|---|---|---|---|---|---|---|---|
| dp | 2 | 4 | 8 | 12 | 16 | 24 | 32 | 48 |

- `MIN_TOUCH` = **48** ทั้ง iOS/Android (SPEC A2, D07) — ใช้เป็นขนาดขั้นต่ำของทุกสิ่งที่แตะได้
- `motion` = `{ fast: 150, normal: 250, slow: 400 }` ms — ประกาศไว้เป็นกรอบเวลา ปัจจุบันไม่มีโค้ดอ้าง `motion.*` คอมโพเนนต์ใส่ค่าตรง (ดูข้อ 6.6)

### 2.6 สีแบรนด์ของปุ่มล็อกอิน (ตัดออกแล้ว)

แอปไม่มีล็อกอินแล้ว (D81, [SPEC_CHANGES](SPEC_CHANGES.md) B10) — token `BRAND` ปุ่ม Google/Apple และ `src/features/auth/SignInButtons.tsx` ถูกลบ ไม่มีสีนอกระบบ token เหลือในแอป

### 2.7 ฟอนต์และขนาดตัวอักษร (`src/theme/typography.ts`)

ฟอนต์ **IBM Plex Sans Thai** (แพ็กเกจ `@expo-google-fonts/ibm-plex-sans-thai`) รองรับไทยและอังกฤษในชุดเดียว โหลด 4 น้ำหนักใน `src/app/_layout.tsx` ด้วย `useFonts` และรอให้โหลดเสร็จ (หรือ error) ก่อนซ่อน splash — ถ้าโหลดไม่สำเร็จจะใช้ฟอนต์ระบบแทนโดยไม่ค้าง

| `fonts.*` | ชื่อฟอนต์ที่ลงทะเบียน | น้ำหนัก |
|---|---|---|
| `light` | `IBMPlexSansThai_300Light` | 300 |
| `regular` | `IBMPlexSansThai_400Regular` | 400 |
| `medium` | `IBMPlexSansThai_500Medium` | 500 |
| `semibold` | `IBMPlexSansThai_600SemiBold` | 600 |

ภาษาไทยต้องเผื่อ `lineHeight` สำหรับสระบน/วรรณยุกต์/สระล่าง ทุก variant จึงกำหนด lineHeight เอง (≈ 1.4–1.5 เท่าของขนาด ยกเว้นตัวเลขล้วน)

| variant | ฟอนต์ | ขนาด / lineHeight | อัตราส่วน | ใช้ที่ |
|---|---|---|---|---|
| `hero` | Regular | 32 / 46 | 1.44 | หัวข้อ `HeroTitle` (แบบ `compact` ทับเป็น 26 / 38) |
| `heroSub` | Regular | 15 / 22 | 1.47 | บรรทัดย่อยใต้หัวข้อ |
| `bigNumber` | **Light** + `tabular-nums` | 48 / 60 | 1.25 | ตัวเลขบนแป้นตัวเลข |
| `rowTitle` | **Light** | 30 / 42 | 1.40 | ข้อความใหญ่ใน `BigRow` |
| `mediumNumber` | **Light** + `tabular-nums` | 28 / 38 | 1.36 | ปุ่มแป้นตัวเลข, แคลอรี่หน้าแรก, ตัวเลขกลางโดนัท |
| `title` | SemiBold | 22 / 32 | 1.45 | หัวข้อ Sheet, ราคาในแผน Paywall |
| `headline` | Medium | 17 / 26 | 1.53 | หัวหน้า stack, หัวข้อสถานะว่าง/error, ชื่อท่าในเซสชัน, ความคืบหน้าเซสชัน |
| `body` | Regular | 16 / 24 | 1.50 | ค่าเริ่มต้นของ `AppText`, ชื่อใน `ListRow`, ช่องกรอก |
| `callout` | Regular | 15 / 22 | 1.47 | ข้อความใน chip/segment, บรรทัดใต้ `BigRow` |
| `caption` | Regular | 13 / 19 | 1.46 | ค่าใต้ `ListRow`, `SectionTitle`, ข้อความเปิดเผยข้อมูล, คำเตือน |
| `dayLetter` | Regular | 13 / 18 | 1.38 | วันที่ปิดใน `WeekdayDots` |
| `dayLetterOn` | SemiBold | 13 / 18 | 1.38 | วันที่เปิดใน `WeekdayDots` |
| `button` | Medium | 16 / 22 | 1.38 | ข้อความบนปุ่ม |
| `tabular` | Regular + `tabular-nums` | 17 / 24 | 1.41 | ค่าใน Stepper, เลขเซ็ต/ช่องน้ำหนัก/ครั้งในเซสชัน |

**กฎการขยายฟอนต์ (Dynamic Type / Font size ของ Android, SPEC N5)** — ห้ามปิดการขยายฟอนต์ (`allowFontScaling={false}`) ให้จำกัดเพดานผ่าน `maxFontSizeMultiplier` แทน

| ข้อความ | เพดาน | ที่มา |
|---|---|---|
| ข้อความทั่วไปทุกตัวที่ผ่าน `AppText`, ช่อง `TextField` | 2.0 (`BODY_MAX_SCALE`) | ค่าเริ่มต้นใน `AppText` |
| หัวข้อ hero, ข้อความใหญ่ใน `BigRow`, ตัวเลขบนแป้นตัวเลข | 1.4 (`BIG_TEXT_MAX_SCALE`) | `HeroTitle`, `BigRow`, `NumberPad` |
| ปุ่มแป้นตัวเลข, ตัวอักษรวันใน `WeekdayDots` | 1.3 | `NumberPad`, `WeekdayDots` |
| ข้อความใต้ไอคอนใน `CircleButton` (เช่น "เริ่ม") | 1.2 | `CircleButton` |

---

## 3. คอมโพเนนต์

ทุกตัว export จาก `src/components/index.ts` นำเข้าด้วย `import { … } from '../components'` (หรือ path สัมพัทธ์ที่ถูกต้อง) ทุกตัวอ่านสีจาก `usePalette()` เอง หน้าจอไม่ต้องส่งสีเข้าไป path ของหน้าในตาราง "ใช้ที่" นับจาก `src/app/`

### 3.1 `AppText` — ข้อความทุกตัว

- **หน้าที่:** ใส่ฟอนต์/ขนาด/สีตาม token และเพดานการขยายฟอนต์
- **props สำคัญ:** `variant` (ค่าเริ่มต้น `body`), `accent` / `secondary` / `color` (ลำดับความสำคัญ `color` > `accent` > `secondary` > `text`), `align`, และ `TextProps` ทั้งหมด (`numberOfLines`, `accessibilityRole` ฯลฯ)
- **a11y:** `maxFontSizeMultiplier` = 2 (ทับได้)
- **ใช้ที่:** ทุกหน้า — ห้ามใช้ `Text` ของ React Native ตรงๆ ในหน้าจอ

### 3.2 `GlowBackground` — แสงเรือง

- **หน้าที่:** พื้นหลังเต็มจอสี `background` + แสงเรืองวงรีสีหลักด้านบน (ข้อ 1.2) และ crossfade เมื่อสีหลัก/โหมดเปลี่ยน
- **props:** ไม่มี (อ่าน `glow`, `glowOpacity`, `mode`, `background` จากพาเลต — `glowOpacity` คือค่าที่ผ่านกฎลดความทึบแล้ว ข้อ 2.3)
- **a11y:** ตกแต่งล้วน `pointerEvents="none"` ไม่มีเนื้อหาให้โปรแกรมอ่านหน้าจอ; `testID="glow-background"` (เทสต์ `__tests__/app/gate.test.tsx` ตรวจว่า Paywall มีแสง)
- **รายละเอียด:** id ของ gradient สร้างจาก `useId()` เพื่อไม่ซ้ำกันบนเว็บ (ทุกหน้าอยู่ใน DOM เดียว)
- **ใช้ที่:** ผ่าน `Screen` เท่านั้น (`glow` ค่าเริ่มต้น `true`) — ไม่ต้องวางเองในหน้าจอ

### 3.3 `Screen` และ `StackHeader` — โครงหน้า

`Screen`

- **หน้าที่:** โครงมาตรฐาน: พื้น + แสง + safe area (บน/ซ้าย/ขวา) + เนื้อหาเลื่อนได้ เว้นซ้ายขวา 16
- **props:** `scroll` (ค่าเริ่มต้น `true`; `false` = `View` ธรรมดา), `withTabBar` (เว้นล่าง 112 ให้แถบลอย; ไม่ใส่ = เว้น 32), `header` (วางเหนือเนื้อหา ไม่เลื่อนตาม), `glow` (`false` = ดำล้วน), `contentStyle`, `keyboardShouldPersistTaps` (ค่าเริ่มต้น `handled`), `refreshControl`, `testID`
- **ใช้ที่:** ทุกหน้า รวม `AccessGate` (ตอนกำลังตรวจสิทธิ์) และ `OnboardingFrame`

`StackHeader`

- **หน้าที่:** หัวของหน้าที่ซ้อนเข้ามา: ปุ่มย้อนกลับ + ชื่อหน้าสีหลักตรงกลาง + ช่องขวา
- **props:** `title?`, `right?` (เช่น `IconButton` ⋮), `onBack?` (ค่าเริ่มต้น `router.back()` หรือกลับ `/` ถ้าย้อนไม่ได้), `backIcon` = `chevron-back` | `close`
- **a11y:** ปุ่มย้อนมี label `a11y.back` / `a11y.close`; ชื่อหน้า `accessibilityRole="header"`, ตัดบรรทัดเดียว; สูง ≥ 52; ช่องขวากว้าง ≥ 48
- **ใช้ที่:** ทุกหน้าที่ซ้อนเข้ามา (`week`, `session/[id]`, `session/summary/[id]`, `routine/[id]`, `program/[id]`, `program/templates`, `history/*`, `exercises/*`, `stats/exercise/[id]`, `profile`, `account`, `legal/[doc]`, `references`, `delete-data`, onboarding ขั้น 2–3 ผ่าน `showBack` ของ `OnboardingFrame`); หน้า `delete-data` ใช้ `backIcon="close"` และ `paywall` ใช้ `backIcon="close"` เฉพาะตอนเข้ามาเพื่ออัปเกรดเป็น Lifetime (`model.upgrade`, เช่นจากปุ่ม "Get lifetime" ในตั้งค่า) — หน้าแท็บ 4 หน้า, onboarding ขั้น 1 และ Paywall ปกติไม่มีปุ่มย้อน (Paywall ปกติใช้ `ActionBar` ไอคอนตั้งค่าแทน)

### 3.4 `HeroTitle` — หัวข้อใหญ่

- **หน้าที่:** หัวข้อสีหลักกลางจอ + บรรทัดย่อยสีเทา (ข้อ 1.3)
- **props:** `title`, `subtitle?`, `children?` (วางใต้บรรทัดย่อย เช่น `Badge` วันสิ้นสุดทดลอง), `compact?`
- **a11y:** หัวข้อเป็น `header`, เพดานฟอนต์ 1.4
- **ใช้ที่:** แบบเต็มในหน้าแท็บ 4 หน้า (`(app)/(tabs)/index`, `programs`, `stats`, `settings`); แบบ `compact` ในหน้าอื่นทั้งหมด รวม `paywall`, `account`, `delete-data`, `OnboardingFrame`

### 3.5 `CardGroup`, `Card`, `ListRow`, `BigRow`, `SectionTitle` — การ์ดและแถว

`CardGroup`

- **หน้าที่:** การ์ดเทาเข้มมุม 28 ที่รวมหลายแถว ใส่เส้นคั่น hairline ระหว่างแถวให้อัตโนมัติ
- **props:** `children`, `style`, `inset` (เส้นคั่นเยื้องข้างละ 28; ค่าเริ่มต้น `true`)
- **รายละเอียด:** กรองลูกที่เป็น `null`/`false` ออกก่อน — ใส่แถวแบบมีเงื่อนไข (`cond ? <ListRow/> : null`) ได้โดยไม่เกิดเส้นคั่นซ้อน
- **a11y:** เส้นคั่นถูกซ่อนจากโปรแกรมอ่านหน้าจอ
- **ใช้ที่:** เกือบทุกหน้า (วันนี้, โปรแกรม, ตารางสัปดาห์, สถิติ, ตั้งค่า, Paywall, account, onboarding ฯลฯ)

`Card`

- **หน้าที่:** การ์ดเดี่ยว padding 20 สำหรับเนื้อหาที่ไม่ใช่รายการ (กราฟ ตารางเซ็ต สรุป)
- **ใช้ที่:** `(tabs)/index` (กล้ามเนื้อวันนี้), `(tabs)/stats`, `session/[id]` (การ์ดต่อท่า), `session/summary/[id]`, `stats/exercise/[id]`, `history/[id]`, `profile`, `legal/[doc]`, `references`, `delete-data`, `program/templates`, `exercises/[id]`

`ListRow`

- **หน้าที่:** แถวมาตรฐานของรายการตั้งค่า/ลิงก์/ประวัติ สูง ≥ 56
- **props:** `title`, `value?` (บรรทัดเล็กสีเทา), `icon?` (ไอคอน 20 สี `accent` หรือ `danger`), `right?` (ถ้าไม่ใส่และมี `onPress` จะแสดง chevron), `onPress?`, `danger?`, `disabled?` (ทึบ 0.45), `accessibilityHint?`, `testID`
- **a11y:** ถ้ามี `onPress` = ปุ่มเดียวทั้งแถว label "`title`, `value`" + state disabled; ขณะกดพื้นเป็น `cardPressed`
- **ใช้ที่:** วันนี้ ("วันนี้อยากทำอะไร"), สถิติ (ประวัติ/ความแข็งแรง/พลังงาน), ตั้งค่า, Paywall (รายการฟีเจอร์ไม่มี `onPress`), account, history, exercises ฯลฯ

`BigRow`

- **หน้าที่:** แถวใหญ่สไตล์ภาพอ้างอิง: ข้อความใหญ่ตัวบางชิดซ้าย + `below` (เช่น `WeekdayDots` แบบอ่านอย่างเดียว) + `right` (ตัวควบคุมชิดขวา) + `footer` (เต็มความกว้างการ์ดใต้แถว)
- **props:** `title`, `below?`, `footer?`, `right?`, `onPress?`, `accessibilityLabel?` (ค่าเริ่มต้น = `title`), `accessibilityHint?`, `dimmed?` (ข้อความเป็นสีเทา ใช้กับ routine ที่ปิดอยู่), `testID`
- **`footer`:** เนื้อหาที่ต้องกว้างเต็มการ์ดใต้ข้อความ (padding ซ้ายขวา 12, ล่าง 12) — ใช้กับ `WeekdayDots` แบบแตะได้เพื่อให้ปุ่มวันกว้างเท่ากันและไม่มีช่องว่างที่กดไม่ติด; เมื่อมี `footer` ความสูงขั้นต่ำของส่วนข้อความลดเป็น 72 (padding ล่าง 4) เพราะ `footer` เติมความสูงต่อ
- **a11y:** สูง ≥ 104 (≥ 72 + `footer` เมื่อมี `footer`); ข้อความตัด 2 บรรทัด; มี `onPress` = ปุ่มเดียวทั้งแถว
- **กฎ:** ถ้า `right` เป็นตัวควบคุมที่แตะได้ (`Toggle`, `CircleButton`) หรือ `below`/`footer` เป็น `WeekdayDots` แบบแตะได้ **ห้ามใส่ `onPress`** ที่ตัวแถว (ปุ่มซ้อนปุ่ม) — ใช้ `onPress` เฉพาะแถวที่เป็นลิงก์และ `right` เป็นไอคอน chevron
- **ใช้ที่:** `(tabs)/index` (routine ของวันนี้ + `CircleButton`), `(tabs)/programs` (ตารางสัปดาห์ + โปรแกรม, กดได้), `week` (routine + `WeekdayDots` แตะได้ใน `footer` + `Toggle`), `program/[id]`, `AppearancePreview`

`SectionTitle`

- **หน้าที่:** หัวข้อเล็กสีเทาเหนือการ์ด (เช่น "วันนี้อยากทำอะไร", "Activity")
- **a11y:** `accessibilityRole="header"`
- **ใช้ที่:** วันนี้, โปรแกรม, ตารางสัปดาห์, สถิติ, ตั้งค่า, profile, account, routine, program, history, session summary

### 3.6 `WeekdayDots` — แถวตัวอักษรวัน

- **หน้าที่:** ตัวอักษรย่อ 7 วันใต้ข้อความของแถว วันที่เกี่ยวข้องเป็นสีหลักตัวหนาและมีจุดด้านบน (ข้อ 1.5) มี 2 โหมด: อ่านอย่างเดียว (กลุ่มชิดซ้าย ห่าง 8 dp) และแตะสลับวันได้ (เต็มความกว้าง ช่องละ 1/7)
- **props:** `active` (เลขวัน 0 = อาทิตย์ … 6 = เสาร์), `weekStart` (ค่าเริ่มต้น 1 = จันทร์; ตามการตั้งค่าผู้ใช้), `dimmed?` (วันที่เปิดเป็นสีเทาแทนสีหลัก), `onToggleDay?` (ใส่แล้วแตะสลับวันได้), `label?` (ชื่อแถว ใช้ประกอบคำอ่าน), `highlightDay?` (ขีดเส้นใต้วันนี้ — ประกาศไว้ ยังไม่มีหน้าที่ใช้)
- **a11y:**
  - แบบอ่านอย่างเดียว: ทั้งแถวเป็นองค์ประกอบเดียว อ่านสรุปเช่น "Weekly schedule. Monday: scheduled, Tuesday: not scheduled, …" (`a11y.weekdayOn` / `a11y.weekdayOff` + ชื่อวันเต็ม)
  - แบบแตะได้ (`onToggleDay`): แต่ละวันเป็น `checkbox` มี `checked` และ label "ชื่อแถว, ชื่อวันเต็ม"; **7 ช่องกว้างเท่ากันเต็มความกว้างแถว (`flex: 1`) สูง ≥ 48 (`MIN_TOUCH`)** จึงไม่มีช่องว่างที่กดไม่ติดและไม่ต้องใช้ `hitSlop`; ตัวอักษร/จุดอยู่กึ่งกลางช่อง ควรวางใน `footer` ของ `BigRow` (ไม่ใช่ `below`) เพื่อให้กว้างเต็มการ์ด
  - ไม่ใช้สีอย่างเดียวบอกสถานะ: วันที่เปิดมีจุด + ตัวหนา + สีหลัก
- **ใช้ที่:** `(tabs)/programs` (อ่านอย่างเดียว), `week` (แตะได้ `testID="weekday-<n>"`), `AppearancePreview`

### 3.7 `Toggle` — สวิตช์

- **หน้าที่:** สวิตช์สีหลักชิดขวา ใช้ `Switch` ของระบบเพื่อให้ VoiceOver/TalkBack อ่านสถานะถูกต้อง
- **props:** `value`, `onValueChange`, `label` (**บังคับ** เป็น accessibilityLabel), `disabled?`, `testID`
- **สี:** รางเปิด `accentFill`, รางปิด `switchOff` (`ios_backgroundColor` ด้วย), ปุ่มกลม `#FFFFFF` (บนเว็บตั้ง `activeThumbColor` ขาวเพิ่ม)
- **ใช้ที่:** `week` (เปิด/ปิด routine), `(tabs)/settings`, `exercises/index` (รวมกล้ามเนื้อรอง), `AppearancePreview`

### 3.8 `Button` และ `CircleButton`

`Button`

- **หน้าที่:** ปุ่มแคปซูล สูง ≥ 52 กว้าง ≥ 48
- **props:** `title`, `onPress`, `kind`, `disabled?` (ทึบ 0.4), `loading?` (แสดงตัวหมุน), `icon?`, `style`, `accessibilityHint?`, `testID`

| `kind` | พื้น | ตัวอักษร | ใช้เมื่อ |
|---|---|---|---|
| `primary` (ค่าเริ่มต้น) | `accentFill` | `onAccent` | การกระทำหลักของหน้า (เริ่มทดลอง, ถัดไป, จบเซสชัน) — ไม่เกิน 1 ปุ่มต่อจุด |
| `secondary` | `card` + ขอบ hairline | `text` | การกระทำรอง (Restore, เพิ่มท่า, ลองใหม่) |
| `plain` | โปร่งใส | `accent` | ลิงก์ (Terms/Privacy, +15 วิ, เพิ่มเซ็ต) |
| `danger` | โปร่งใส | `danger` | ทิ้งเซสชัน/ลบ |

- **a11y:** role `button`, label = `title`, state `disabled`/`busy`; ขณะกดทึบ 0.75
- **ใช้ที่:** แทบทุกหน้า

`CircleButton`

- **หน้าที่:** ปุ่มวงกลมสีหลัก "เริ่ม" บนการ์ด routine ของวันนี้ (SPEC DS/D: ใช้แทนสวิตช์ในหน้าแรก)
- **props:** `label` (**บังคับ** a11y เช่น `today.startA11y` "เริ่ม {ชื่อ}"), `onPress`, `icon` (ค่าเริ่มต้น `play`), `size` (ค่าเริ่มต้น 64), `text?` (ข้อความสั้นใต้ไอคอน เพดานฟอนต์ 1.2), `testID`
- **ใช้ที่:** `(tabs)/index` เท่านั้น (เริ่ม routine, เริ่มเซสชันเปล่า, ทำต่อเซสชันค้าง)

### 3.9 `Chip`, `SegmentedControl`, `Badge`

`Chip`

- **หน้าที่:** ตัวเลือกแคปซูลแบบเลือกหนึ่ง (`radio`) หรือหลายตัว (`checkbox`)
- **props:** `label`, `selected`, `onPress`, `role` (ค่าเริ่มต้น `radio`), `accessibilityLabel?`, `style`, `testID`
- **ขนาด:** สูง ≥ 48 (`MIN_TOUCH`), padding ข้าง 16, ขอบ 1, มุม `pill`
- **สี:** เลือก = พื้น `accentSoft` ขอบ+ตัวอักษร `accent`; ไม่เลือก = พื้น `card` ขอบ `separator` ตัวอักษร `text`
- **a11y:** `radio` ใช้ state `selected`, `checkbox` ใช้ `checked`; ตัวที่ครอบกลุ่มต้องใส่ `accessibilityRole="radiogroup"` + label (เช่น `LanguagePicker`, ตัวกรองกรุ๊ปในสถิติ)
- **ใช้ที่:** ภาษา, โปรแกรมทั้งสัปดาห์ (`week`), ตัวกรองกรุ๊ป (`stats`), ตัวกรองคลังท่า (`ExerciseFilters`), ประเภท routine, ความหนัก (session summary), ฟอร์มโปรไฟล์, ตั้งค่า, เซสชัน

`SegmentedControl`

- **หน้าที่:** ตัวสลับแคปซูล 2–4 ตัวเลือกกว้างเท่ากัน
- **props:** `options` (`{ value, label }[]`), `value`, `onChange`, `label` (ชื่อกลุ่มสำหรับโปรแกรมอ่านหน้าจอ), `style`
- **ขนาด:** แต่ละตัวสูง ≥ 48 (`MIN_TOUCH`) กว้างเท่ากัน (`flex: 1`) ข้อความบรรทัดเดียว; กรอบนอก padding 4 จึงสูงรวม ≥ 56
- **สี:** กรอบ `card` + ขอบ hairline; ตัวที่เลือกพื้น `accentSoft` ตัวอักษร `accent`; ตัวอื่นตัวอักษร `textSecondary`
- **a11y:** `radiogroup` + แต่ละตัว `radio` state `selected`; `testID="segment-<value>"`
- **ใช้ที่:** ธีม (`ThemePicker`), วันเริ่มสัปดาห์ (`week`), ช่วงเวลา/มุมมอง/ตัวชี้วัด (`stats`), หน่วย (`settings`), ฟอร์มโปรไฟล์

`Badge`

- **หน้าที่:** ป้ายขอบแคปซูลไม่กดได้ (เช่น "ทดลองถึง ศ. 16 ต.ค.", "Active", "ทดลองฟรี 7 วัน")
- **props:** `label`, `tone` = `accent` (ค่าเริ่มต้น) | `neutral` | `warning`
- **ใช้ที่:** `(tabs)/index` (สถานะสมาชิก B7: `neutral`, ปัญหาการชำระเงิน: `warning`), `(tabs)/programs`, `paywall`

### 3.10 States — `LoadingState`, `EmptyState`, `ErrorState`, `LockedState`

| คอมโพเนนต์ | props | หน้าตา | a11y | ใช้ที่ |
|---|---|---|---|---|
| `LoadingState` | `label?` | ตัวหมุนใหญ่สี `accent` กลางจอ | role `progressbar` label ค่าเริ่มต้น `common.loading` | `paywall` (โหลดแผน), `AccessGate` |
| `EmptyState` | `title?`, `body?`, `icon?` (ค่าเริ่มต้น `leaf-outline`), `actionLabel?`, `onAction?` | ไอคอน 36 สีหลัก + headline + ข้อความเทา + ปุ่ม primary (ถ้ามี) | — | วันนี้, โปรแกรม, ตารางสัปดาห์, สถิติ, เซสชัน, routine, program, history, exercises, stats/exercise |
| `ErrorState` | `message?`, `onRetry?` | ไอคอน `cloud-offline-outline` สี `danger` + `common.errorTitle` + ข้อความ (ค่าเริ่มต้นยืนยันว่าข้อมูลในเครื่องปลอดภัย) + ปุ่ม secondary "ลองใหม่" | role `alert` | paywall, เซสชัน, session summary, routine, program, history/[id], exercises/[id] |
| `LockedState` | `onUnlock` | ไอคอนกุญแจ + `common.lockedTitle/Body/Cta` | label `a11y.locked` | ยังไม่มีหน้าที่ใช้ — การล็อกจริงทำโดย `AccessGate` ที่พาไป `/paywall` |

### 3.11 `PillTabBar` — แถบเมนูล่าง

- **หน้าที่:** แถบแคปซูลลอย 4 แท็บ (ข้อ 1.6) ส่งเป็น `tabBar` ของ `Tabs` ใน `src/app/(app)/(tabs)/_layout.tsx`
- **props:** `BottomTabBarProps` จาก expo-router (`state`, `descriptors`, `navigation`, `insets`); ไอคอนเลือกตามชื่อ route (`index`, `programs`, `stats`, `settings`)
- **a11y:** แคปซูลเป็น `tablist`, แต่ละแท็บ `tab` + state `selected` + label จาก `options.title` (`tabs.*` ใน i18n); `testID="tab-<route>"`; แท็บ 72 × 56
- **พฤติกรรม:** ส่ง event `tabPress` (ยกเลิกได้) แล้วนำทาง + haptic `selectionAsync` เมื่อเปลี่ยนแท็บ; export `TAB_BAR_SPACE` = 112

### 3.12 `TextField`

- **หน้าที่:** ช่องกรอกพร้อม label ด้านบน, หน่วยต่อท้าย, ข้อความ error ใต้ช่อง
- **props:** `label` (**บังคับ**), `error?`, `suffix?` (เช่น "kg") + `TextInputProps` ทั้งหมด (`value`, `onChangeText`, `keyboardType`, `placeholder` จาก i18n ฯลฯ)
- **หน้าตา:** พื้น `inputBg` มุม 14 สูง ≥ 52 ขอบ 1 (เป็น `danger` เมื่อ error), cursor/selection สี `accent`, placeholder สี `textSecondary`
- **a11y:** `accessibilityLabel` = `label`; error เป็น live region `polite`; เพดานฟอนต์ 2
- **ใช้ที่:** ฟอร์มโปรไฟล์ (`ProfileFormView`), สร้างท่า, ค้นหาท่า, ชื่อ routine/โปรแกรม, `TargetSheet`, `ExerciseSettingsSheet`, รหัสสีเอง, session summary

### 3.13 `Sheet` — แผ่นล่าง

- **หน้าที่:** แผ่นล่างสำหรับเมนู ⋮/⋯ ตัวเลือก และฟอร์มสั้น ใช้ `Modal` ของระบบ (`animationType="slide"`)
- **props:** `visible`, `onClose`, `title?`, `children`, `testID`
- **หน้าตา:** พื้น `card` มุมบน 28 สูงไม่เกิน 88% ของจอ, ที่จับ 40 × 4, หัวข้อ `title` กึ่งกลาง, ปุ่ม ✕ ขวา, เนื้อหาเลื่อนได้ padding 24 gap 12, ฉากหลัง `overlay`, หลบคีย์บอร์ดบน iOS
- **a11y:** ปิดได้ 4 ทาง — ปุ่ม ✕ (`a11y.close`, `testID="sheet-close"`), แตะฉากหลัง, ท่าทาง escape ของ VoiceOver (`onAccessibilityEscape`), ปุ่ม back ของ Android (`onRequestClose`); `accessibilityViewIsModal`; หัวข้อเป็น `header`
- **ใช้ที่:** วันนี้ (เมนู + ย้อนบันทึกวันก่อน), โปรแกรม, ตารางสัปดาห์, เซสชัน, session summary, routine, program, ตั้งค่า, `TargetSheet`, `ExerciseSettingsSheet`, เลือกสีเอง, และเป็นฐานของ `NumberPad`

### 3.14 `NumberPad` — แป้นตัวเลขใหญ่

- **หน้าที่:** กรอกน้ำหนัก/ครั้ง/แคลอรี่ระหว่างฝึกด้วยมือเดียว (SPEC G1)
- **props:** `visible`, `title`, `initial` (`number | null`), `allowDecimal` (ค่าเริ่มต้น `true`; `false` สำหรับจำนวนครั้ง), `suffix?`, `max` (ค่าเริ่มต้น 9999), `onSubmit(value | null)`, `onClose`
- **หน้าตา:** ตัวเลขปัจจุบัน `bigNumber` สีหลัก (ว่าง = "–") + หน่วย; ปุ่ม 12 ปุ่ม (1–9 . 0 ⌫) กว้าง 31.5% สูง ≥ 64 มุม 16 พื้น `elevated`; ปุ่ม "เสร็จ" primary
- **กติกา:** ทศนิยมไม่เกิน 2 ตำแหน่ง ไม่เกิน `max`; เนื้อหาสร้างใหม่ทุกครั้งที่เปิด (เริ่มจากค่าปัจจุบันเสมอ); haptic `selectionAsync` ทุกปุ่ม
- **a11y:** ตัวเลขเป็น live region `polite`; ปุ่ม ⌫ label `session.keypadDelete`; "." ที่ปิดอยู่ทึบ 0.3 และกดไม่ได้
- **ใช้ที่:** `session/[id]` (น้ำหนัก/ครั้ง), `(tabs)/index` (แคลอรี่ใช้/กิน), `(tabs)/stats` (น้ำหนักตัว), `profile`

### 3.15 `Stepper`

- **หน้าที่:** ปุ่ม − ค่า + สำหรับตัวเลขเล็ก (จำนวนเซ็ต ช่วงครั้ง % ไขมัน MET ฯลฯ)
- **props:** `label`, `value`, `onChange`, `min` (0), `max` (999), `step` (1; ปัดทศนิยม 2 ตำแหน่ง), `format?`, `testID` (ปุ่มได้ `-dec`/`-inc`)
- **หน้าตา:** ปุ่ม 48 × 48 มุม 16 พื้น `inputBg` ไอคอน `remove`/`add` สีหลัก (เป็นสีเทาเมื่อถึงขอบ), ค่าแบบ `tabular`
- **a11y:** ทั้งแถวเป็นองค์ประกอบ `adjustable` เดียว มี `accessibilityValue` (`min`/`max`/`now`/`text`) และ action `increment`/`decrement` (ปัดขึ้นลงใน VoiceOver/TalkBack)
- **ใช้ที่:** `(tabs)/settings`, `profile`, `session/summary/[id]`, `ExerciseSettingsSheet`, `TargetSheet`

### 3.16 `ProgressBar`

- **หน้าที่:** แถบความคืบหน้าสูง 6 ราง `switchOff` เติม `accentFill`
- **props:** `value` (0–1, ตัดขอบให้), `label`
- **a11y:** role `progressbar` + label + `accessibilityValue` 0–100
- **ใช้ที่:** `session/[id]` (เซ็ตที่เสร็จ), `RestTimerBar`, `OnboardingFrame` (ขั้นที่ x จาก 3)

### 3.17 `Disclaimer`

- **หน้าที่:** คำเตือน "ไม่ใช่คำแนะนำทางการแพทย์" ตาม SPEC H5 (`nutrition.disclaimer`)
- **props:** ไม่มี
- **หน้าตา:** กรอบ hairline มุม 16 ไอคอน `information-circle-outline` + ข้อความ caption สีเทา
- **a11y:** `accessibilityRole="text"`, `testID="health-disclaimer"`
- **ใช้ที่:** ทุกหน้าที่แสดงผลคำนวณ + ตั้งค่า: `profile`, `(tabs)/stats`, `session/summary/[id]`, `history/[id]`, `(tabs)/settings`, `references`

### 3.18 `Icon`, `IconButton`, `ActionBar`

- `Icon` — Ionicons (`@expo/vector-icons`) props `name`, `size` (22), `color` (**บังคับ** ส่งจากพาเลต) ใช้แบบเส้น `-outline` เป็นหลัก แบบทึบเฉพาะสถานะเลือก
- `IconButton` — ปุ่มไอคอนเส้นบางสีหลัก props `icon`, `label` (**บังคับ** จาก i18n), `onPress`, `size` (26), `color?` (ค่าเริ่มต้น `accent`), `disabled?` (ทึบ 0.35), `style`, `testID`; พื้นที่แตะ ≥ 48 × 48 + `hitSlop` 4; role `button` + state disabled — ใช้ที่ ActionBar, ปุ่มย้อนใน `StackHeader`, ✕ ใน `Sheet`, ⋮/⋯ ในเซสชัน, ย้อน/ถัดไปของช่วงเวลาในสถิติ, routine, program, exercises
- `ActionBar` — แถวปุ่ม "+" "⋯" ชิดขวาเหนือการ์ดแรก (ข้อ 1.7) ใช้ที่ `(tabs)/index`, `(tabs)/programs`, `paywall` (เป็น header)
- `RadioIndicator` — วงกลมเรดิโอ `radio-button-on/off` ขนาด 22 (เลือก = `accent`, ไม่เลือก = `textSecondary`) prop `selected` วางท้ายแถวที่แตะเพื่อเลือก (`ListRow right`, หัวการ์ดแผนใน `paywall`) — ตัวแถวต้องใส่ role/state เอง ใช้ที่: `ProfileFormView` (ระดับกิจกรรม), `paywall`, `onboarding/program`
- `LabeledRow` — แถวในการ์ดที่มีป้ายหัวข้อ caption สี secondary อยู่เหนือตัวควบคุม (padding `lg`, gap `sm`) prop `label` (ไม่ใส่ = เว้นขอบอย่างเดียว) ใช้ที่: `settings` (หน่วย วันเริ่มสัปดาห์ ก้าวน้ำหนัก ตัวจับเวลาพัก) และ `AppearanceGroup`

### 3.19 คอมโพเนนต์ระดับฟีเจอร์ที่ยึดตาม DS

| ไฟล์ | คอมโพเนนต์ | ภาษาภาพ |
|---|---|---|
| `src/features/session/SetTick.tsx` | `SetTick` | วงกลม 48 ขอบ 2: ยังไม่เสร็จ = ขอบ `textSecondary`; เสร็จ = พื้น+ขอบ `accentFill` และ ✓ สี `onAccent`; role `checkbox`; haptic success (ติ๊ก) / selection (ยกเลิก); เด้ง 1 → 1.25 (120 ms) → 1 (160 ms) **เฉพาะตอนติ๊ก** (ตอนยกเลิกไม่เด้ง) และข้ามเมื่อผู้ใช้เปิดลดการเคลื่อนไหว; `hitSlop` 4 |
| `src/features/session/RestTimerBar.tsx` | `RestTimerBar` | แถบลอยล่าง พื้น `elevated` มุม 28 ขอบ hairline: "พัก m:ss" headline สีหลัก + `ProgressBar` + ปุ่ม plain "+15 วิ" + ปุ่ม secondary "ข้าม/ตกลง"; live region `polite`; haptic warning เมื่อครบ |
| `src/features/appearance/AppearancePickers.tsx` | `LanguagePicker`, `ThemePicker`, `AccentPicker`, `AppearanceGroup` (ภาษา/ธีม/สีหลักในการ์ดเดียว `showLabels` — ใช้ที่ `settings`, `account`, `onboarding/index`), `AppearancePreview` | Chip / SegmentedControl / วงสี 36 ในพื้นที่แตะ 48 (เลือก = วงแหวนสี `text`) / พรีวิวหัวข้อ + `BigRow` + `WeekdayDots` + `Toggle` |
| `src/features/stats/charts.tsx` | `DonutChart`, `ShareBars`, `TrendChart`, `KcalBars` | กราฟบน `Card`; สีจาก `p.chart` / `accentFill`; วงในโดนัทสี `card`; สรุปเป็นข้อความสำหรับโปรแกรมอ่านหน้าจอ (ข้อ 6.4) |
| `src/features/onboarding/OnboardingFrame.tsx` | `OnboardingFrame` | `Screen` + `ProgressBar` ขั้นที่ x/3 + `HeroTitle compact` + ปุ่ม primary "ถัดไป" |

---

## 4. กฎการใช้กับแต่ละหน้า

### 4.1 กฎร่วมทุกหน้า

1. ห่อด้วย `<Screen>` เสมอ — หน้าแท็บใส่ `withTabBar`; หน้า stack ใส่ `header={<StackHeader … />}`
2. หัวข้อด้วย `HeroTitle`: หน้าแท็บ 4 หน้าใช้แบบเต็ม หน้าอื่นใช้ `compact`
3. ปุ่มเพิ่ม/เมนูของทั้งหน้า → `ActionBar` + `IconButton` (`add`, `ellipsis-vertical`) ใต้หัวข้อ เหนือการ์ดแรก
4. รายการ → `CardGroup` + `BigRow` (แถวเด่น) / `ListRow` (แถวทั่วไป); เนื้อหาที่ไม่ใช่รายการ → `Card`; หัวข้อกลุ่ม → `SectionTitle`
5. แสงเรืองเปิดทุกหน้า ยกเว้นหน้าเซสชัน (`glow={false}`)
6. ทุกหน้ามีสถานะ ว่าง / error ด้วย `EmptyState` / `ErrorState` (รายละเอียดต่อหน้าใน [SCREENS.md](SCREENS.md))
7. หน้าที่แสดงผลคำนวณสุขภาพต้องมี `Disclaimer`

### 4.2 ต่อหน้า (กฎจาก SPEC [DS] ข้อสุดท้าย) พร้อมหลักฐาน

ภาพหน้าจอสร้างจากพรีวิวเว็บ (D43) ภาพโหมดมืดใช้สีหลัก `pink` ภาพโหมดสว่างใช้สีหลัก `mint` (ข้อความ `#207358`)

| หน้า (ไฟล์) | กฎจาก SPEC | การใช้จริง | หลักฐาน |
|---|---|---|---|
| **วันนี้** `src/app/(app)/(tabs)/index.tsx` | หัวข้อสีหลักใหญ่ + แถวการ์ด routine (ปุ่มวงกลม "เริ่ม" แทนสวิตช์) | `HeroTitle` "วันนี้: …" + บรรทัดย่อย "วันที่ · n ท่า · ~นาที" + `Badge` วันสิ้นสุดทดลอง (B7) → `ActionBar` (+ เริ่มเซสชันเปล่า, ⋮ เมนู) → `CardGroup` ของ `BigRow` ต่อ routine + `CircleButton` "เริ่ม" → `SectionTitle` "วันนี้อยากทำอะไร" + `CardGroup` ของ `ListRow` (สลับ routine / เริ่มเซสชันเปล่า / วันนี้พัก) → `Card` กล้ามเนื้อวันนี้ (แคปซูลขอบสีหลักเมื่อทำแล้ว) → การ์ดแคลอรี่ 2 ใบ (แตะเปิด `NumberPad`) | [en มืด](screenshots/en-dark-07-today.jpg) · [th มืด](screenshots/th-dark-07-today.jpg) · [en สว่าง](screenshots/en-light-07-today.jpg) |
| **โปรแกรม** `src/app/(app)/(tabs)/programs.tsx` | ภาษาภาพทั่วไปของ DS | `HeroTitle` + `ActionBar` (+ สร้างโปรแกรม, ⋮) → `BigRow` "ตารางประจำสัปดาห์" + `WeekdayDots` อ่านอย่างเดียว + chevron (กดไป `/week`) → `BigRow` ต่อโปรแกรม + `Badge` "Active" → ปุ่ม secondary "เริ่มจากเทมเพลต" + ปุ่ม plain "คลังท่า" | [en มืด](screenshots/en-dark-08-programs.jpg) |
| **ตารางประจำสัปดาห์** `src/app/(app)/week.tsx` | แถว routine พร้อมแถวจุดวัน + สวิตช์เปิด/ปิด | `StackHeader` + `HeroTitle compact` → `Chip` เลือกโปรแกรมทั้งสัปดาห์ → `SegmentedControl` วันเริ่มสัปดาห์ → `CardGroup` ของ `BigRow` ต่อ routine: `WeekdayDots` แตะเปิด/ปิดวันได้ (วางใน `footer` เต็มความกว้างการ์ด ช่องละ 1/7 สูง 48) + `Toggle` ชิดขวา; routine ที่ปิด → `dimmed` ทั้งชื่อและจุดวัน | [en มืด](screenshots/en-dark-09-week.jpg) |
| **เซสชัน** `src/app/(app)/session/[id].tsx` | พื้นดำ ติ๊กเซ็ตสีหลัก | `Screen glow={false}` (ดำล้วน ไม่มีแสง) + `StackHeader` ชื่อ routine + ⋮ → เวลาที่ผ่านไป + "เสร็จ x จาก y เซ็ต" (headline สีหลัก) + `ProgressBar` → `Card` ต่อท่า: ตาราง เซ็ต / ครั้งก่อน / เป้าหมาย (สีหลัก แตะแก้) / ช่องน้ำหนัก×ครั้ง (`inputBg` มุม 14 แตะเปิด `NumberPad`) / `SetTick` → `RestTimerBar` ลอยล่าง | [th มืด](screenshots/th-dark-10-session.jpg) · [en มืด หลังติ๊ก](screenshots/en-dark-11-session-ticked.jpg) |
| **สถิติ** `src/app/(app)/(tabs)/stats.tsx` | กราฟสีหลักบนการ์ดเทาเข้ม | `HeroTitle` (บรรทัดย่อย = กรุ๊ปที่กรอง) → `SegmentedControl` วัน/สัปดาห์/เดือน/ปี + `IconButton` ย้อน/ถัดไป → `Chip` กรองกรุ๊ป (เลื่อนแนวนอน) → `Card` สรุป → `SegmentedControl` มุมมอง + ตัวชี้วัด → `Card` โดนัท (`p.chart`) + แท่ง % → `CardGroup` ประวัติ/ความแข็งแรง/พลังงาน → `Card` กราฟแท่งแคลอรี่/เส้นน้ำหนักตัว (`accentFill`) → `Disclaimer` | [en มืด](screenshots/en-dark-13-stats.jpg) · [en สว่าง](screenshots/en-light-13-stats.jpg) |
| **ตั้งค่า** `src/app/(app)/(tabs)/settings.tsx` | ภาษาภาพทั่วไปของ DS | `HeroTitle` แบบเต็ม → `SectionTitle` + `CardGroup` เรียงเป็นหมวด: รูปลักษณ์ (ภาษา `Chip`, ธีม `SegmentedControl`, สีหลัก `AccentPicker`) → การฝึก (`SegmentedControl`, `Toggle`, `Stepper`, `Chip`) → โปรไฟล์ → สมาชิกภาพ → ข้อมูลของคุณ (สำรองข้อมูล + วันที่สำรองล่าสุด, กู้คืนจากไฟล์, ส่งออก CSV, ลบข้อมูลทั้งหมดในเครื่องนี้ `danger` + caption เตือนว่าข้อมูลอยู่ในเครื่องนี้เท่านั้น) → เกี่ยวกับ (`ListRow`) → `Disclaimer` | [en มืด](screenshots/en-dark-14-settings.jpg) |
| **Paywall** `src/app/paywall.tsx` | พื้นดำ + แสงเรืองด้านบน | `Screen` มีแสง + header: ปกติ `ActionBar` (ไอคอน `settings-outline` "การตั้งค่า" → `/account`), โหมดอัปเกรดเป็น Lifetime (`model.upgrade`) ใช้ `StackHeader backIcon="close"` → `HeroTitle compact` (headline นำด้วยประโยชน์ เช่น "Unlock your full training plan" ตาม eligibility B6: `subscribe` / `winback` / `billing` / `upgrade`) → (กรณีตัดเงินไม่ผ่าน) ปุ่ม primary "Fix payment" → `CardGroup` รายการฟีเจอร์ 5 ข้อ (`ListRow` ไอคอนสีหลัก ข้อความเน้นผลลัพธ์) → แผนราคา 2 ใบ (radio; เลือก = พื้น `accentSoft` ขอบ `accent`; มุม 20; ราคาเต็มจากสโตร์เป็นบรรทัด `title` แยกกับรอบการชำระ; `Badge` ทดลองฟรี; หมายเหตุ caption D45) → (โหมดอัปเกรด) `Card` เตือนว่าซื้อ Lifetime ไม่ยกเลิกรายเดือน/ทดลองอัตโนมัติ + ปุ่ม plain เปิดการจัดการสมาชิก (ไอคอนเตือนสี `warning`) → บรรทัด headline ยอดที่จะถูกเรียกเก็บ ("{{count}} days free, then {{price}}/month" / "{{price}}/month, renews automatically" / "{{price}} one-time payment") → ปุ่ม primary CTA ("Start free trial, then {{price}}/month" / "Subscribe for …" / "Buy lifetime for …") → caption "การซื้อผูกกับบัญชีสโตร์ เครื่องใหม่แตะกู้คืนการซื้อ" → ข้อความเปิดเผยข้อมูล B5 (caption) → Restore (secondary) → จัดการสมาชิก (plain, ไม่แสดงในโหมดอัปเกรด) → Terms/Privacy/แหล่งอ้างอิง (plain) | [en มืด](screenshots/en-dark-04-paywall.jpg) · [th มืด](screenshots/th-dark-04-paywall.jpg) (ภาพถ่ายก่อนปรับข้อความ — ถ่ายใหม่ก่อนส่งสโตร์) |
| **ตั้งค่าเริ่มต้นขั้น 1** `src/app/onboarding/index.tsx` | C ขั้น 1 + พรีวิวสดของ DS | `OnboardingFrame` (`ProgressBar` 1/3 + `HeroTitle compact`) → `CardGroup` ภาษา/ธีม/สีหลัก → `AppearancePreview` (หัวข้อสีหลัก + `BigRow` + `WeekdayDots` + `Toggle`) → ปุ่ม primary "ถัดไป" | [en มืด](screenshots/en-dark-01-onboarding-1.jpg) |

### 4.3 สิ่งที่ภาพหน้าจอยืนยัน

- แสงเรืองอยู่หลังหัวข้อทุกหน้าแท็บ และหายไปในหน้าเซสชัน (เทียบ `en-dark-07-today.jpg` กับ `en-dark-11-session-ticked.jpg`)
- โหมดสว่าง: พื้น `#F2F2F7` การ์ดขาว แสงจางลง สีหลักถูกทำให้เข้มอัตโนมัติ (`en-light-07-today.jpg`, `en-light-13-stats.jpg`)
- ข้อความไทยยาวขึ้นแต่ไม่ถูกตัด (สระบน/ล่างไม่ชนกัน) และราคาไม่ถูกตัด (`th-dark-04-paywall.jpg`)
- แถบเมนูลอยทับเนื้อหาส่วนล่าง เนื้อหาเลื่อนลอดใต้ได้ (`en-dark-07-today.jpg`, `en-dark-13-stats.jpg`)

> ข้อจำกัด (D43): พรีวิวเว็บใช้ react-native-web ฟอนต์/เงา/สวิตช์อาจต่างจาก iOS/Android เล็กน้อย ต้องตรวจซ้ำบนเครื่องจริงก่อนส่งสโตร์

### 4.4 วิธีถ่ายภาพหน้าจอชุดใหม่

```bash
npm run preview:web                       # EXPO_PUBLIC_USE_MOCKS=1 export เว็บ + เปิดเซิร์ฟเวอร์พอร์ต 8089
# อีกเทอร์มินัล (ต้องมี Playwright: ตั้ง PLAYWRIGHT_MODULE=/path/to/playwright ถ้าไม่ได้ติดตั้งในโปรเจกต์,
# CHROMIUM_PATH ถ้าใช้ Chromium ของเครื่อง, PORT ถ้าไม่ใช่ 8089)
node scripts/web-screenshots.js <โฟลเดอร์ภาพ> en dark pink
node scripts/web-screenshots.js <โฟลเดอร์ภาพ> th dark pink
node scripts/web-screenshots.js <โฟลเดอร์ภาพ> en light mint
```

สคริปต์เดินผ่าน onboarding → Paywall → ซื้อจำลอง (mock) → ทุกแท็บ แล้วบันทึกไฟล์ชื่อ `<ภาษา>-<ธีม>-<ลำดับ>-<หน้า>.png` ขนาด 780 × 1688 (viewport 390 × 844 ที่ scale 2) — ไฟล์ใน `docs/screenshots/` เป็น .jpg ที่ย่อเหลือ 390 × 844

---

## 5. Contrast (WCAG AA)

### 5.1 เกณฑ์

| ประเภท | เกณฑ์ | อ้างอิง WCAG 2.x | ค่าคงที่ในโค้ด |
|---|---|---|---|
| ข้อความทุกขนาด (รวมหัวข้อ hero ซึ่งจริงๆ เป็นข้อความใหญ่ที่ต้องการแค่ 3:1) | ≥ 4.5:1 | 1.4.3 Contrast (Minimum) | `AA_TEXT` |
| องค์ประกอบกราฟิก/ส่วนของตัวควบคุม (พื้นปุ่ม สวิตช์ ติ๊ก กราฟ) | ≥ 3:1 | 1.4.11 Non-text Contrast | `AA_GRAPHIC` |
| ข้อความใหญ่ | ≥ 3:1 (ประกาศไว้ แต่เราใช้ 4.5 กับทุกข้อความ) | 1.4.3 | `AA_LARGE` |

สูตร relative luminance และ contrast ratio ตามนิยาม WCAG อยู่ใน `src/theme/color.ts` (`relativeLuminance`, `contrastRatio`)

### 5.2 ผลจริง — `npm run contrast`

รันด้วย `npm run contrast` (`scripts/contrast-report.ts`) สคริปต์จบด้วย exit code 1 ถ้ามีค่าใดไม่ผ่าน ผลล่าสุด (2026-10-11 — หลังเพิ่มกฎ `secondaryOnGlow`/ลด `glowOpacity`) วางตามที่พิมพ์ออกมาทุกตัวอักษร:

| สีหลัก | โหมด | accent (ข้อความ) | บนพื้น | บนการ์ด | หัวข้อ/ข้อความรองบนแสงเรือง | ข้อความบนปุ่ม | ปุ่ม/กราฟบนการ์ด | ข้อความรองบนการ์ด/sheet | สีหลักบน chip/แท็บที่เลือก | ผล |
|---|---|---|---|---|---|---|---|---|---|---|
| pink `#E5A9DC` | dark | `#E5A9DC` / ปุ่ม `#E5A9DC` | 11.04 | 8.95 | 7.98 / 5.29 | 11.04 | 8.95 | 5.94 / 4.86 | 6.22 | ผ่าน |
| pink `#E5A9DC` | light | `#A53293` / ปุ่ม `#A53293` | 5.41 | 6.04 | 4.54 / 4.50 | 6.04 | 6.04 | 5.99 / 5.37 | 4.50 | ผ่าน |
| lavender `#C3B4F7` | dark | `#C3B4F7` / ปุ่ม `#C3B4F7` | 11.19 | 9.07 | 9.27 / 6.07 | 11.19 | 9.07 | 5.94 / 4.86 | 7.50 | ผ่าน |
| lavender `#C3B4F7` | light | `#633CEA` / ปุ่ม `#633CEA` | 5.59 | 6.24 | 4.73 / 4.54 | 6.24 | 6.24 | 5.99 / 5.37 | 4.70 | ผ่าน |
| sky `#A9D2F7` | dark | `#A9D2F7` / ปุ่ม `#A9D2F7` | 13.25 | 10.73 | 9.04 / 5.00 | 13.25 | 10.73 | 5.94 / 4.86 | 6.88 | ผ่าน |
| sky `#A9D2F7` | light | `#1064AF` / ปุ่ม `#1064AF` | 5.43 | 6.06 | 4.68 / 4.62 | 6.06 | 6.06 | 5.99 / 5.37 | 4.82 | ผ่าน |
| mint `#9BE3CB` | dark | `#9BE3CB` / ปุ่ม `#9BE3CB` | 14.24 | 11.54 | 8.82 / 4.54 | 14.24 | 11.54 | 5.94 / 4.86 | 5.63 | ผ่าน |
| mint `#9BE3CB` | light | `#207358` / ปุ่ม `#207358` | 5.15 | 5.75 | 4.74 / 4.94 | 5.75 | 5.75 | 5.99 / 5.37 | 4.67 | ผ่าน |
| lime `#C8E59B` | dark | `#C8E59B` / ปุ่ม `#C8E59B` | 15.14 | 12.26 | 9.30 / 4.50 | 15.14 | 12.26 | 5.94 / 4.86 | 5.69 | ผ่าน |
| lime `#C8E59B` | light | `#51731E` / ปุ่ม `#51731E` | 4.93 | 5.50 | 4.63 / 5.05 | 5.50 | 5.50 | 5.99 / 5.37 | 4.54 | ผ่าน |
| gold `#F2D58C` | dark | `#F2D58C` / ปุ่ม `#F2D58C` | 14.67 | 11.89 | 9.01 / 4.50 | 14.67 | 11.89 | 5.94 / 4.86 | 6.11 | ผ่าน |
| gold `#F2D58C` | light | `#84630F` / ปุ่ม `#84630F` | 4.99 | 5.57 | 4.65 / 5.00 | 5.57 | 5.57 | 5.99 / 5.37 | 4.57 | ผ่าน |
| peach `#F7C2A2` | dark | `#F7C2A2` / ปุ่ม `#F7C2A2` | 13.19 | 10.69 | 8.76 / 4.87 | 13.19 | 10.69 | 5.94 / 4.86 | 6.61 | ผ่าน |
| peach `#F7C2A2` | light | `#A5470E` / ปุ่ม `#A5470E` | 5.37 | 5.99 | 4.66 / 4.66 | 5.99 | 5.99 | 5.99 / 5.37 | 4.74 | ผ่าน |
| coral `#F5A3A8` | dark | `#F5A3A8` / ปุ่ม `#F5A3A8` | 10.69 | 8.66 | 8.04 / 5.51 | 10.69 | 8.66 | 5.94 / 4.86 | 6.36 | ผ่าน |
| coral `#F5A3A8` | light | `#C11520` / ปุ่ม `#C11520` | 5.54 | 6.18 | 4.65 / 4.50 | 6.18 | 6.18 | 5.99 / 5.37 | 4.55 | ผ่าน |

```text
เกณฑ์: ข้อความ ≥ 4.5:1, องค์ประกอบกราฟิก ≥ 3:1
ALL CONTRAST CHECKS PASSED
```

**อ่านตาราง:** คอลัมน์ตรงกับฟิลด์ของ `contrastReport()` — บนพื้น = `accentOnBackground`, บนการ์ด = `accentOnCard`, หัวข้อ/ข้อความรองบนแสงเรือง = `heroOnGlow` / `secondaryOnGlow` (ค่าแรก = สีหลัก ค่าหลัง = สีเทาของบรรทัดย่อย), ข้อความบนปุ่ม = `onAccentOnFill`, ปุ่ม/กราฟบนการ์ด = `fillOnCard` (เกณฑ์ 3), ข้อความรองบนการ์ด/sheet = `secondaryOnCard` / `secondaryOnElevated`, สีหลักบน chip/แท็บที่เลือก = `accentOnSoft` (ค่าต่ำสุดของทุกพื้น) นอกจากนี้สคริปต์ตรวจสีกราฟทุกสี ≥ 3:1 บนการ์ด (พิมพ์เฉพาะเมื่อไม่ผ่าน) 

**ข้อสังเกตจากตาราง:** โหมดมืดไม่มีสีไหนต้องปรับสีหลัก (สีพาสเทลบนดำผ่านสบาย) ส่วนโหมดสว่างทุกสีถูกทำให้เข้มลง ค่าที่ "ตึง" ที่สุดคือหัวข้อบนแสงเรือง (4.54–4.74) และสีหลักบน chip ที่เลือก (4.50–4.88) เพราะทั้งสองพื้นเป็นสีโทนเดียวกับสีหลัก และข้อความรองบนแสงเรือง (4.50–5.51) ซึ่งหลายสีวิ่งอยู่ที่ขอบ 4.50 พอดีเพราะ `glowOpacity` ถูกลดลงจนเพิ่งผ่าน (ดูข้อ 2.3)

### 5.3 การปรับตาม D44

D44 ([DECISIONS.md](DECISIONS.md)) ปรับสีกลางและสีสถานะ เพราะค่าเดิมไม่ผ่าน 4.5:1 บน sheet/ช่องกรอก/แถวที่ถูกกด:

| สี | เดิม → ใหม่ | contrast เดิม | contrast ใหม่ |
|---|---|---|---|
| `textSecondary` มืด | `#8E8E93` → `#98989F` | 4.27 บน `elevated`/`inputBg`/`cardPressed` (`#2C2C2E`) ❌, 5.22 บนการ์ด | 4.86 บน `#2C2C2E`, 5.94 บนการ์ด, 7.33 บนพื้น |
| `textSecondary` สว่าง | → `#636366` | D44 ไม่ได้บันทึกค่าเดิม (เทียบ: ถ้าใช้ `#8E8E93` แบบ SPEC จะได้แค่ 2.60–3.26 บนพื้นสว่าง) | 5.37 บนพื้น/`inputBg`, 5.99 บนการ์ด, 4.77 บน `cardPressed` |
| `danger` สว่าง | → `#B71C1C` | D44 ไม่ได้บันทึกค่าเดิม | 5.23–6.57 ทุกพื้นสว่าง |
| `success` สว่าง | → `#176B3B` | D44 ไม่ได้บันทึกค่าเดิม | 5.22–6.56 ทุกพื้นสว่าง |
| สีหลัก | เพิ่มเงื่อนไข: ต้องผ่าน 4.5 บน `accentSoft` (chip/แท็บที่เลือก) และบน `elevated` | — | คอลัมน์ "สีหลักบน chip/แท็บที่เลือก" ≥ 4.50 ทุกแถว |

ผลข้างเคียงที่ยอมรับ: สีเทาต่างจาก "~#8E8E93" ใน SPEC เล็กน้อย (แต่ใกล้กับสีเทาจริงในภาพอ้างอิง `#A3A2A7` มากขึ้น) ค่า contrast ของสีกลาง/สีสถานะทุกตัวบนพื้นทุกแบบ (โหมดมืด: ข้อความหลัก ≥ 13.94, รอง ≥ 4.86, danger ≥ 5.52, success ≥ 8.85, warning ≥ 8.62; โหมดสว่าง: ข้อความหลัก ≥ 16.73, รอง ≥ 4.77, danger ≥ 5.23, success ≥ 5.22, warning ≥ 4.72) ถูกตรวจใน `__tests__/theme/contrast.test.ts`

### 5.4 เทสต์ที่ป้องกัน contrast ถอยหลัง (`__tests__/theme/contrast.test.ts`, รันใน `npm test`)

- พาเลตมี 8 สีพอดี สีแรกคือ `pink` `#E5A9DC` และโหมดมืดคงค่า `#E5A9DC` ไว้
- 8 สี × 2 โหมด ผ่าน `passesAA()` ทุกข้อ (รวม `secondaryOnGlow` ≥ 4.5)
- สีเองแบบตารางครบวงสี (H ทุก 20°, S 0.1/0.6/1, L 0.05/0.3/0.5/0.7/0.95) × 2 โหมด ผ่าน `passesAA()` ทั้งหมด
- `onColor()` ได้ ≥ 4.5 กับ fill ทุกโทน/ความสว่าง; `ensureContrast()` ทำให้ผ่านจริง
- สีกราฟ ≥ 3:1 บนการ์ด
- สีกลาง/สถานะผ่าน 4.5 บน `background`, `card`, `elevated`, `inputBg`, `cardPressed`
- สีหลักบน chip/แท็บที่เลือก ≥ 4.5 สำหรับสีเองด้วย

---

## 6. Accessibility และ Animation

### 6.1 พื้นที่แตะ (SPEC A2, D07)

กฎ: ทุกสิ่งที่แตะได้ต้องมีพื้นที่แตะ ≥ `MIN_TOUCH` (48 × 48) — ใช้ `minWidth/minHeight` หรือ `hitSlop` ถ้าภาพต้องเล็กกว่า

| คอมโพเนนต์ | พื้นที่แตะ |
|---|---|
| `Button` | สูง ≥ 52, กว้าง ≥ 48 |
| `Chip` / ตัวเลือกใน `SegmentedControl` | สูง ≥ 48 |
| ช่องวันใน `WeekdayDots` (แตะได้) | กว้าง 1/7 ของแถว × สูง ≥ 48 |
| `IconButton` | ≥ 48 × 48 + `hitSlop` 4 |
| `CircleButton` | 64 × 64 (ค่าเริ่มต้น) |
| `SetTick` | 48 × 48 + `hitSlop` 4 |
| `Stepper` − / + | 48 × 48 |
| ปุ่ม `NumberPad` | สูง ≥ 64 กว้าง 31.5% ของแผ่น |
| ช่องน้ำหนัก/ครั้ง/เป้าหมายในเซสชัน | สูง ≥ 48 (แถวเซ็ตสูง ≥ 56) |
| `ListRow` / `BigRow` | สูง ≥ 56 / ≥ 104 เต็มความกว้าง |
| แท็บใน `PillTabBar` | 72 × 56 |
| วงสีใน `AccentPicker` / ตารางสีเอง | 48 × 48 (วงสี 36 อยู่ข้างใน สำหรับ `AccentPicker`) |

ข้อยกเว้นที่เหลือในโค้ดตอนนี้ (ดูข้อ 8.2): `Toggle` ใช้ขนาดของ `Switch` ระบบ (ราว 51 × 31 บน iOS) — ส่วนที่เคยต่ำกว่า 48 ถูกแก้แล้ว: `Chip` และตัวเลือกใน `SegmentedControl` สูง ≥ 48, ช่องวันใน `WeekdayDots` แบบแตะได้กว้าง 1/7 ของแถว (ราว 43 dp บนจอ 360 dp, ≥ 44 บนจอ ≥ 390 — D57) สูง ≥ 48, ตารางสีตัวอย่างในแผ่นเลือกสีเอง 48 × 48

### 6.2 Label, role และ state

- ข้อความทุกตัวรวม `accessibilityLabel`/`accessibilityHint`/`placeholder`/`title`/`label` มาจาก i18n — eslint (`i18next/no-literal-string` โหมด `jsx-only` ใน `eslint.config.js`; prop ที่ตรวจ: `accessibilityLabel`, `accessibilityHint`, `placeholder`, `title`, `label`, `subtitle`, `message`, `hint`, `caption`) บังคับใน `src/app`, `src/components`, `src/features`
- ปุ่มที่เป็นไอคอนล้วนต้องมี label เสมอ: `IconButton.label`, `CircleButton.label`, `Toggle.label` เป็น prop บังคับ ใช้ key กลางใน `a11y.*` (`a11y.menu`, `a11y.close`, `a11y.back`, `a11y.add`) หรือ key ที่บอกการกระทำจริง (เช่น `today.startA11y` "เริ่ม {ชื่อ}")
- เมนูต่อรายการต้องบอกว่าเป็นของอะไร: เช่น ⋯ ของท่าในเซสชันใช้ "`a11y.menu`: ชื่อท่า"
- role ที่ใช้: `button`, `header` (`HeroTitle`, `SectionTitle`, `StackHeader`, หัวข้อ `Sheet`), `tab`/`tablist`, `radio`/`radiogroup` (`Chip`, `SegmentedControl`, วงสี, แผนราคา), `checkbox` (`Chip role="checkbox"`, `WeekdayDots` แบบแตะได้, `SetTick`), `adjustable` (`Stepper`), `progressbar` (`ProgressBar`, `LoadingState`), `alert` (`ErrorState`), `image` (กราฟ), `text` (`Disclaimer`)
- สถานะต้องส่งผ่าน `accessibilityState` (`selected`, `checked`, `disabled`, `busy`) ไม่ใช่แค่สี
- live region `polite`: ตัวเลขใน `NumberPad`, ข้อความ error ใน `TextField`, `RestTimerBar`
- องค์ประกอบตกแต่ง (เส้นคั่นใน `CardGroup`, ฉากหลัง Sheet, แสงเรือง) ถูกซ่อนจากโปรแกรมอ่านหน้าจอ
- Sheet: `accessibilityViewIsModal` + escape ของ VoiceOver + ปุ่ม ✕ ที่โฟกัสได้

### 6.3 ขยายฟอนต์

- ใช้ `AppText` เสมอ (เพดาน 2×) — ห้าม `allowFontScaling={false}`
- ตัวเลข/หัวข้อใหญ่จำกัด 1.4× (`BIG_TEXT_MAX_SCALE`), ข้อความในพื้นที่จำกัดมาก 1.2–1.3× (ตาราง 2.7)
- เผื่อให้ข้อความตัดบรรทัดได้: ใช้ `numberOfLines` เฉพาะจุดที่ยอมให้ตัดได้จริง (ชื่อยาวในแถว) ห้ามตัดราคา/ข้อความเปิดเผยข้อมูลของ Paywall (D45)
- ใช้ `tabular-nums` (`bigNumber`, `mediumNumber`, `tabular`) กับตัวเลขที่เปลี่ยนค่า เพื่อไม่ให้ layout กระตุก

### 6.4 กราฟ: สรุปเป็นข้อความสำหรับโปรแกรมอ่านหน้าจอ

ทุกกราฟใน `src/features/stats/charts.tsx` เป็นองค์ประกอบเดียว `accessible` + `accessibilityRole="image"` + label ที่สรุปข้อมูลเป็นข้อความ (ไม่ให้โปรแกรมอ่านหน้าจอไล่ทีละจุด svg):

| กราฟ | label ที่อ่าน |
|---|---|
| `DonutChart` (สถิติ) | `stats.chartA11y` + `stats.share` = "{มุมมอง}. {ชื่อ}: x%, {ชื่อ}: y%, …" |
| `ShareBars` (แท่ง %) | แต่ละแถวเป็นองค์ประกอบเดียว: "ชื่อ, x%, ค่าจริงตามตัวชี้วัด" |
| `KcalBars` | "ใช้ไปจากการออกกำลังกาย: {ผลรวม}" (`stats.exerciseKcal`) |
| `TrendChart` น้ำหนักตัว | "น้ำหนักตัว: {ค่า} {หน่วย}, {ค่า} {หน่วย}, …" ทุกจุด (`stats.weight`) |
| `TrendChart` 1RM (`stats/exercise/[id]`) | "ความแข็งแรง (1RM โดยประมาณ): {ค่า} {หน่วย}, …" ทุกจุด (`stats.strength`) |

นอกจากนี้ข้อมูลเดียวกันมีเป็นข้อความบนจอเสมอ (แท่ง % มีชื่อ + ตัวเลข, รายการพลังงาน/ประวัติ/1RM เป็น `ListRow`) จึงไม่พึ่งสีอย่างเดียว

### 6.5 ไม่ใช้สีเป็นสัญญาณเดียว

- วันที่เปิดใน `WeekdayDots`: จุด + ตัวหนา + สี
- แท็บที่เลือก: วงรีพื้น + ไอคอนแบบทึบ + สี + state `selected`
- เซ็ตที่เสร็จ: วงกลมเต็ม + ✓
- chip/แผนที่เลือก: พื้น + ขอบ + ไอคอน radio (แผนราคา)
- กล้ามเนื้อที่ทำแล้ววันนี้: ไอคอน `checkmark-circle` แทน `ellipse-outline` + label "ทำแล้ว/ยังไม่ได้ทำ"

### 6.6 Animation และ haptic

SPEC: "Animation เรียบ: ติ๊กเซ็ต (haptic), สลับแท็บ, การเปลี่ยนสีหลักแบบสด"

| จุด | animation | haptic | เคารพ "ลดการเคลื่อนไหว" |
|---|---|---|---|
| ติ๊กเซ็ต (`SetTick`) | เด้ง scale 1 → 1.25 (120 ms) → 1 (160 ms) ด้วย reanimated เฉพาะตอนติ๊ก (ยกเลิกไม่เด้ง) | ติ๊ก = `notificationAsync(Success)`, ยกเลิก = `selectionAsync` | ✅ ข้ามการเด้งเมื่อ `useReduceMotion()` เป็นจริง (haptic ยังทำงาน) |
| สลับแท็บ | `animation: 'shift'` ของ `Tabs` (`src/app/(app)/(tabs)/_layout.tsx`) | `selectionAsync` | ใช้พฤติกรรมของ navigator |
| เปลี่ยนสีหลัก/โหมด | แสงเรือง crossfade 350 ms (`Animated.timing`, native driver; `GlowBackground`) ส่วนอื่นเปลี่ยนทันที | — | เป็นการเปลี่ยนความทึบ ไม่ใช่การเคลื่อนที่ |
| Sheet / NumberPad | `Modal animationType="slide"` ของระบบ | ปุ่มแป้นตัวเลข = `selectionAsync` | ใช้พฤติกรรมของระบบ |
| เข้า onboarding / Paywall | `animation: 'fade'` (`src/app/_layout.tsx`); delete-data เปิดแบบ `modal` | — | ใช้พฤติกรรมของ navigator |
| ตัวจับเวลาพักครบ | — | `notificationAsync(Warning)` ครั้งเดียว | — |

กฎ animation:

1. เรียบและสั้น: ช่วงเวลาอยู่ในกรอบ `motion` 150–400 ms (ปัจจุบันคอมโพเนนต์ใส่ตัวเลข 120/160/350 ms ตรงๆ ยังไม่อ้าง `motion.*`) ไม่มี animation วนซ้ำ/ตกแต่งล้วน
2. animation ที่ **เคลื่อนที่หรือขยาย** ต้องเช็ก `useReduceMotion()` (`src/hooks/useReduceMotion.ts`) แล้วข้ามเมื่อผู้ใช้เปิดลดการเคลื่อนไหว
3. ใช้ native driver / reanimated ไม่ animate layout บน JS thread
4. haptic ใช้กับการกระทำที่ยืนยันผล (ติ๊ก เปลี่ยนแท็บ แป้นตัวเลข เวลาพักครบ) และต้อง `.catch(() => undefined)` เสมอ (บางเครื่อง/เว็บไม่มี haptic)
5. การเปลี่ยนสีหลักต้องเห็นผลทันทีทุกหน้า — ห้ามแคชสีไว้ใน state ของหน้า ให้เรียก `usePalette()` ทุก render (เทสต์ `__tests__/app/onboarding.test.tsx` สลับธีม/สีหลักระหว่างตั้งค่าเริ่มต้น)

---

## 7. Do / Don't สำหรับหน้าจอใหม่

**Do**

- ✅ เริ่มทุกหน้าด้วย `Screen` (+ `withTabBar` ถ้าเป็นแท็บ, + `StackHeader` ถ้าเป็นหน้าซ้อน) และ `HeroTitle` (`compact` ถ้าไม่ใช่หน้าแท็บ)
- ✅ ดึงสีจาก `const p = usePalette()` เท่านั้น และเลือก key ตามความหมาย (`accent` = ข้อความสีหลัก, `accentFill` = พื้นสีหลัก, `onAccent` = ข้อความบนพื้นสีหลัก, `accentSoft` = พื้นของสิ่งที่ถูกเลือก)
- ✅ ใช้ `AppText` + `variant` จาก `typography` แทนการกำหนดขนาดฟอนต์เอง
- ✅ ใช้ `spacing.*`, `radius.*`, `MIN_TOUCH` จาก `src/theme/tokens.ts`
- ✅ รวมแถวไว้ใน `CardGroup` เดียว และใช้ `BigRow` สำหรับแถวที่สำคัญที่สุดของหน้า
- ✅ เพิ่มข้อความใน `src/i18n/locales/en/<ns>.ts` และ `th/<ns>.ts` ให้ครบทั้งคู่ แล้วเรียก `t('ns.key')`
- ✅ ใส่ `label`/`accessibilityLabel` ให้ปุ่มไอคอนทุกตัว และส่งสถานะผ่าน `accessibilityState`
- ✅ ใส่ `EmptyState`/`ErrorState` ให้ครบ และ `Disclaimer` ถ้าหน้าแสดงผลคำนวณสุขภาพ
- ✅ ถ้ากราฟใหม่: ห่อด้วย `accessible` + `accessibilityRole="image"` + label สรุปข้อมูล และมีตัวเลขเป็นข้อความบนจอด้วย
- ✅ ตรวจทั้ง 2 โหมด × 2 ภาษา และอย่างน้อย 1 สีหลักโทนสว่างมาก (เช่น `lime`/`gold`) ก่อน commit

**Don't**

- ❌ ห้ามเขียนสี hex/rgba ตรงในหน้าจอหรือ `src/features` — ถ้าต้องการสีใหม่ให้เพิ่มเป็น token ใน `NEUTRALS` ทั้งสองโหมด แล้วเพิ่มในการตรวจ contrast
- ❌ ห้ามใช้ `Text`/`Switch`/`TextInput`/`Modal` ของ React Native ตรงๆ ในหน้าจอ ใช้ `AppText`/`Toggle`/`TextField`/`Sheet`
- ❌ ห้ามใส่ข้อความ literal ใน JSX หรือ prop `accessibilityLabel`/`placeholder`/`title`/`label` (lint จะไม่ผ่าน)
- ❌ ห้ามวาง `GlowBackground` เอง (ใช้ `Screen`) และห้ามปิดแสงนอกจากหน้าเซสชัน
- ❌ ห้ามใส่ `onPress` ให้ `BigRow` ที่มี `Toggle`/`CircleButton`/`WeekdayDots` แบบแตะได้อยู่ข้างใน
- ❌ ห้ามทำปุ่มเล็กกว่า 48 โดยไม่มี `hitSlop` ชดเชย
- ❌ ห้ามปิดการขยายฟอนต์ หรือตั้ง `lineHeight` ของข้อความไทยต่ำกว่า ~1.35 เท่า (สระจะถูกตัด)
- ❌ ห้ามใช้สีเป็นสัญญาณเดียวของสถานะ
- ❌ ห้ามเพิ่มสีหลักเกิน 8 สี (SPEC กำหนด 8 + เลือกเอง; เทสต์ตรวจจำนวน) หรือข้ามการคำนวณ `deriveAccent()` ด้วยการใช้ base ตรงๆ
- ❌ ห้ามฮาร์ดโค้ดราคาใน UI (ใช้ `priceString` จาก service, D20) และห้ามตัดราคา (D45)
- ❌ ห้ามสร้าง animation ที่เคลื่อนที่โดยไม่เช็ก `useReduceMotion()`

---

## 8. การตรวจสอบ และข้อสังเกตที่ยังเปิดอยู่

### 8.1 คำสั่งที่ต้องรันเมื่อแก้ UI/ธีม

| คำสั่ง | ตรวจอะไร |
|---|---|
| `npm run check` | typecheck + lint (prettier + ห้ามข้อความฮาร์ดโค้ด) + jest ทั้งหมด (รวม `__tests__/theme/contrast.test.ts`) — ต้องผ่านก่อน commit |
| `npm run contrast` | พิมพ์ตารางในข้อ 5.2 ใหม่ ถ้าแก้ `src/theme/tokens.ts` หรือ `src/theme/color.ts` ให้วางผลใหม่แทนตารางเดิมในเอกสารนี้ |
| `npm run preview:web` + `node scripts/web-screenshots.js …` | เทียบภาพกับภาพอ้างอิงและภาพใน `docs/screenshots/` (ข้อ 4.4) |
| เครื่องจริง iOS/Android | ฟอนต์ไทย, เงาแถบเมนู, `Switch` ของระบบ, VoiceOver/TalkBack, ขยายฟอนต์ใหญ่สุด, ลดการเคลื่อนไหว (D43) |

### 8.2 ข้อสังเกตที่ยังไม่ได้แก้ในโค้ด (ให้เจ้าของโปรเจกต์ตัดสินใจ)

ข้อเหล่านี้พบระหว่างเขียนเอกสาร ไม่ได้ทำให้ `npm run contrast` หรือเทสต์ล้ม แต่ควรรู้ไว้:

| # | เรื่อง | ค่าปัจจุบัน | ผลกระทบ |
|---|---|---|---|
| 1 | ตัวอักษรวันที่ "ปิด" ใน `WeekdayDots` (`textSecondary` ทึบ 0.6) | 2.98:1 (มืด) / 2.58:1 (สว่าง) บนการ์ด | ต่ำกว่า 4.5 ของข้อความ (ภาพอ้างอิงเองก็ใช้เทาจาง `#747474` ≈ 3.6:1 บน `#1C1C1E`) — โปรแกรมอ่านหน้าจอได้ข้อมูลครบจากคำอ่านสรุป/state |
| 2 | รางสวิตช์ตอนปิด และราง `ProgressBar` (`switchOff`) | 1.48:1 (มืด) / 1.52:1 (สว่าง) เทียบการ์ด | ต่ำกว่า 3:1 ของ 1.4.11 — สถานะยังดูได้จากตำแหน่งปุ่มกลมขาว/ความยาวแถบ และ state ของระบบ |
| 3 | พื้นที่แตะต่ำกว่า 48 | เหลือเฉพาะ `Switch` ตามระบบ (`Toggle`) — `Chip`, segment, วันใน `WeekdayDots` (โหมดแตะได้) และตารางสีเอง ถูกแก้เป็น ≥ 48 แล้ว | `Switch` ใหญ่เท่าที่ระบบกำหนด (iOS ~51 × 31) แต่แถวที่ครอบมักสูง ≥ 56 |
| 4 | token/คอมโพเนนต์ที่ประกาศแต่ยังไม่ถูกใช้ | `radius.row`, `motion.*`, `success`, `LockedState`, `WeekdayDots.highlightDay` | ไม่มีผลต่อการทำงาน (ตรวจด้วย grep ใน `src/` 2026-10-11) |
| 5 | animation ที่ไม่ได้เช็ก `useReduceMotion()` | crossfade แสงเรือง, `Tabs` `shift`, `Modal` slide | crossfade เป็นการเปลี่ยนความทึบ (โดยทั่วไปยอมรับได้); ส่วนการเลื่อนเป็นของระบบ/navigator |
| 6 | สีเองที่ไม่มีโทน (เทา/ขาว/ดำ) | แสงเรืองออกโทนแดงอมชมพู | แค่ภาพ ไม่กระทบ contrast |
| 7 | ป้ายแกนกราฟ (`react-native-gifted-charts`) | ฟอนต์ 11 ไม่ผ่าน `AppText` | ไม่ขยายตามการตั้งค่าฟอนต์ของระบบ — ข้อมูลเดียวกันมีเป็นข้อความ/label สรุปแล้ว (ข้อ 6.4) |
