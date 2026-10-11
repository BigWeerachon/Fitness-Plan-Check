# คำตอบแบบฟอร์ม Google Play (Policy and programs → App content)

> ใช้คู่กับ [privacy-labels.md](privacy-labels.md) (Data safety) และ [review-notes.md](review-notes.md) (App access) — SPEC N2, HUMAN_TASKS ข้อ 73–76
> ชื่อเมนู/ตัวเลือกเขียนเป็นภาษาอังกฤษตามคอนโซล ชื่ออาจเปลี่ยนเล็กน้อยตามเวลา ให้เลือกตัวเลือกที่ความหมายตรงกัน ทุกข้อด้านล่างตรวจกับโค้ดแล้ว

## สรุปเร็ว

| หัวข้อใน App content | คำตอบ |
|---|---|
| Privacy policy | `<PRIVACY_URL>` (ต้องเปิดได้โดยไม่ต้องล็อกอิน และเป็นเนื้อหาเดียวกับในแอปที่ `/legal/privacy`) |
| Ads | **No, my app does not contain ads** |
| App access | **All or some functionality is restricted** → ใช้คำตอบใน [review-notes.md ข้อ 2](review-notes.md) |
| Content rating | ทำแบบสอบถาม IARC ตามข้อ 3 |
| Target audience and content | **18 and over** (แนะนำ) — ดูข้อ 2 |
| News apps | **No** (ไม่ใช่แอปข่าว) |
| Data safety | ตาม [privacy-labels.md ข้อ 4](privacy-labels.md) |
| Government apps | **No** |
| Financial features | **My app doesn't provide any financial features** |
| Health apps | ตามข้อ 1 |
| Advertising ID | **No** (ไม่ใช้) — ตรวจ manifest ตามข้อ 4 |
| COVID-19 contact tracing and status apps (ถ้าคอนโซลถาม) | ไม่ใช่แอปประเภทนี้ |

## 1. Health apps declaration

ที่ไหน: App content → **Health apps** (หรือ "Health" declaration)

| คำถาม/หมวด | คำตอบ | เหตุผลจากแอป |
|---|---|---|
| Does your app have health features? | **Yes** | วางแผนและบันทึกการออกกำลังกาย + คำนวณแคลอรี่/สารอาหาร |
| **Activity and fitness** (เช่น ติดตามการออกกำลังกาย) | **ติ๊ก** | ตารางฝึก เซสชัน เซ็ต progressive overload สถิติ (SPEC D–I) |
| **Nutrition and weight management** | **ติ๊ก** | BMR/TDEE แคลอรี่เป้าหมาย โปรตีน/คาร์บ/ไขมัน ช่องกรอกแคลอรี่ที่กิน แนวโน้มน้ำหนักตัว (SPEC H, I3–I4) — ไม่มีระบบบันทึกอาหารรายมื้อ (H4) |
| Period tracking, Sleep management, Stress management/relaxation/mental acuity, Medical (การจัดการโรค ยา การตัดสินใจทางคลินิก บริการทางการแพทย์), Health research, Medical device | **ไม่ติ๊ก** | แอปไม่มีฟีเจอร์เหล่านี้ |
| Is your app a medical device / regulated by a health authority? | **No** | SPEC N2 — แอปไม่ใช่อุปกรณ์การแพทย์ ไม่วินิจฉัยหรือรักษาโรค |
| Health Connect | **ไม่ใช้** (ไม่ประกาศสิทธิ์ Health Connect) | SPEC L ยังไม่เชื่อม HealthKit/Health Connect |

**ข้อความ disclaimer ที่ Play ต้องการ** มีอยู่แล้ว:
- หน้าร้าน: ย่อหน้า "คำเตือนด้านสุขภาพ" / "HEALTH DISCLAIMER" ใน [listing.th.md](listing.th.md) และ [listing.en.md](listing.en.md) — "ไม่ใช่อุปกรณ์การแพทย์ และไม่ได้ใช้วินิจฉัยหรือรักษาโรคหรือภาวะใดๆ"
- ในแอป: คำเตือน "ไม่ใช่คำแนะนำทางการแพทย์" (`Disclaimer`) ที่ commit `3cb4c4f` อยู่ในหน้าสถิติ โปรไฟล์และเป้าหมาย สรุปเซสชัน รายละเอียดประวัติ ตั้งค่า และหน้าแหล่งอ้างอิง `/references` ซึ่งเข้าได้เสมอจากตั้งค่า → เกี่ยวกับ, หน้าบัญชี และ Paywall (SPEC H5, H6) — SPEC H5 ให้ใส่ "ทุกหน้าผลลัพธ์" ถ้าผู้พัฒนาเพิ่มในหน้าวันนี้/กราฟความแข็งแรง/ลิงก์ "แหล่งอ้างอิง" ก่อนปล่อย ให้ปรับบรรทัดนี้ตามจริง
- นโยบายความเป็นส่วนตัว: หัวข้อ "ข้อมูลสุขภาพและคำเตือน" (`src/legal/content.ts`)

## 2. Target audience and content

| คำถาม | คำตอบที่แนะนำ |
|---|---|
| Target age groups | **18 and over** — เจ้าของจะเพิ่ม **16–17** ได้ถ้าต้องการ (เป็นการตัดสินใจทางธุรกิจ) **ห้ามเลือกกลุ่มต่ำกว่า 13 ปี** (จะเข้าโปรแกรม Families และขัดกับนโยบายความเป็นส่วนตัวที่ระบุว่าแอปไม่ได้มุ่งให้เด็กต่ำกว่า 13 ปีใช้) |
| Could your store listing unintentionally appeal to children? | **No** — ภาพและข้อความเป็นเรื่องการฝึกด้วยน้ำหนักสำหรับผู้ใหญ่ ไม่มีตัวการ์ตูน |

**กฎผู้อายุต่ำกว่า 18 ปี (SPEC H2):** แอปไม่แสดงเป้าหมายลดน้ำหนักให้ผู้ใช้อายุต่ำกว่า 18 ปี — ถ้าเลือกเป้าหมาย "ลดไขมัน" จะใช้แคลอรี่แบบคงที่แทน (D28, `src/domain/nutrition.ts`) จึงปลอดภัยถ้าเจ้าของเลือกรวมกลุ่ม 16–17 ด้วย แต่การรวมกลุ่มวัยรุ่นอาจทำให้ Play ตรวจละเอียดขึ้น (เช่น เนื้อหาเรื่องน้ำหนักตัวและการซื้อในแอป)

## 3. Content rating (แบบสอบถาม IARC)

ที่ไหน: App content → **Content rating** → Start questionnaire (HUMAN_TASKS ข้อ 75)

| คำถาม | คำตอบ |
|---|---|
| Email address | `<CONTACT_EMAIL>` |
| Category | เลือกหมวด "ไม่ใช่เกม" ที่ใกล้ที่สุด (เช่น Utility, Productivity, Communication, or Other) |
| Violence / Fear / Sexuality / Language / Controlled substances (ยาเสพติด แอลกอฮอล์ ยาสูบ) / Crude humor | **No** ทั้งหมด |
| Gambling / simulated gambling | **No** |
| Users can interact or exchange content with each other | **No** (ไม่มีแชท โปรไฟล์สาธารณะ หรือการแชร์เนื้อหาระหว่างผู้ใช้ — การส่งออก CSV เป็นการแชร์ไฟล์ของตัวเองผ่านระบบ) |
| Shares user's current physical location with other users | **No** |
| Allows users to purchase digital goods | **Yes** (สมาชิกรายเดือนและซื้อขาด) |
| Unrestricted internet access (เช่น เบราว์เซอร์) | **No** — เปิดเฉพาะลิงก์ที่กำหนด (หน้าแหล่งอ้างอิง หน้า Privacy/Terms หน้าจัดการสมาชิกของสโตร์) |
| ผลที่คาด | เรตสำหรับทุกวัย (เช่น Everyone / PEGI 3) — คาดการณ์เท่านั้น ผลจริงขึ้นกับ IARC |

## 4. Ads และ Advertising ID

- **Ads:** No — `package.json` ไม่มี SDK โฆษณาใดๆ
- **Advertising ID:** ตอบ **No** (แอปไม่ใช้) แต่ **ต้องตรวจ** ว่า build production ไม่มีสิทธิ์ `com.google.android.gms.permission.AD_ID` ที่ไลบรารีอื่นแอบรวมเข้ามา:
  - ตรวจจาก Play Console → App bundle explorer → Permissions ของ `.aab` ที่อัปโหลด หรือ `bundletool dump manifest --bundle=app.aab`
  - ถ้าพบ AD_ID ให้ผู้พัฒนาเพิ่ม `com.google.android.gms.permission.AD_ID` ใน `android.blockedPermissions` ของ `app.config.ts` แล้ว build ใหม่ (ไม่อย่างนั้นคำตอบ "No" จะขัดกับ manifest)
  - สิทธิ์ที่คาดว่าจะเห็น: INTERNET, ACCESS_NETWORK_STATE, VIBRATE และ `com.android.vending.BILLING` (จาก RevenueCat — D46)

## 5. Account deletion (ข้อกำหนดของ Play)

- **ในแอป:** แท็บตั้งค่า → ส่วน "บัญชี" → **ลบบัญชีและข้อมูล** และสำหรับผู้ที่ไม่มีสิทธิ์ใช้งาน: ไอคอนเฟืองบน Paywall → "บัญชีและการตั้งค่า" → ส่วน "ข้อมูล" → ลบบัญชีและข้อมูล — เตือนว่าการลบบัญชีไม่ยกเลิกสมาชิกในสโตร์ พร้อมปุ่มไปหน้าจัดการสมาชิก (SPEC B12)
- **บนเว็บ:** `<DELETE_ACCOUNT_URL>` ใส่ในฟอร์ม Data safety (ดู [privacy-labels.md ข้อ 4.1](privacy-labels.md)) ต้องบอกชื่อแอป/ผู้พัฒนา ขั้นตอนลบในแอป วิธีขอลบทางอีเมล `<CONTACT_EMAIL>` และข้อมูลที่ถูกลบ/ระยะเวลาเก็บ

## 6. ข้อเสนอทดลองฟรี (free trial offer) ต้องตรงกับ Paywall ในแอป

SPEC B1, B5, B6, N2 — ตั้งใน Monetize with Play → Products → Subscriptions (HUMAN_TASKS ข้อ 51–54)

| ค่า | ต้องเป็น | ที่มาในแอป |
|---|---|---|
| Subscription product ID | **`fitnese_monthly`** | ต้องตรงกับ RevenueCat (`fitnese_monthly:monthly`) |
| Base plan ID | **`monthly`** | — |
| Base plan type / billing period | **Auto-renewing**, **1 month** | Paywall เขียนว่า "ต่ออายุอัตโนมัติทุกเดือน" |
| Offer ID | **`free-trial-7d`** (ชื่ออื่นได้ แต่ต้องจดไว้) | — |
| Offer eligibility | **New customer acquisition** → **Never had this subscription** | ผู้เคยใช้แล้วไม่ได้ทดลองซ้ำ — แอปตรวจสิทธิ์ก่อนแสดงข้อความทดลอง (B6) |
| Offer phase | **Free trial**, **7 days** (เฟสเดียว ไม่มีราคาแนะนำ/ส่วนลดต่อท้าย) | แอปอ่านจำนวนวันจากช่วงทดลองของ offer (`src/services/purchases/mapping.ts`) ถ้าตั้งเป็น 3 หรือ 14 วัน แอปจะแสดงตามนั้น แต่หน้าร้านเขียนว่า 7 วัน — **ต้องเป็น 7 วัน** |
| Offer tags | **ไม่ใส่** (โดยเฉพาะห้ามใส่ `rc-ignore-offer`) | ถ้าใส่ RevenueCat จะไม่ใช้ offer นี้ และ Paywall จะไม่แสดงทดลองฟรี |
| Offer อื่นบน base plan เดียวกัน | **ไม่มี** | RevenueCat เลือก offer ที่ผู้ใช้มีสิทธิ์ให้อัตโนมัติ ถ้าเพิ่ม offer อื่น (เช่น ส่วนลดเดือนแรก) ข้อความ Paywall อาจไม่ตรงกับหน้าร้าน — ต้องตรวจในเอกสาร RevenueCat และทดสอบก่อนเพิ่ม |
| Grace period / Account hold | ตามที่เจ้าของเลือก (แนะนำ grace 7 วัน + account hold ค่าเริ่มต้น — HUMAN_TASKS ข้อ 53) | ระหว่าง grace แอปยังให้ใช้ (`BILLING_GRACE`) พร้อมป้ายเตือน; เมื่อหมดสิทธิ์เพราะปัญหาการชำระเงิน Paywall แสดงข้อความและปุ่ม "Fix payment" ที่พาไปหน้าจัดการสมาชิกของสโตร์ |
| สินค้าซื้อขาด | **`fitnese_lifetime`**, One-time product, purchase option แบบ **Buy**, **ไม่มีช่วงทดลอง** | Paywall เขียนว่า "ซื้อขาดไม่มีช่วงทดลองฟรี" (B5) |
| ราคา | เป้า SPEC J2: รายเดือน 19 บาท / ซื้อขาด 99 บาท (ประเทศไทย) — **ราคาขั้นต่ำเงินบาทของ Google Play ต้องตรวจในคอนโซลจริง** แล้วจดในตาราง HUMAN_TASKS ข้อ 58 | แอปไม่ฮาร์ดโค้ดราคา แสดงราคาจากสโตร์ผ่าน RevenueCat และข้อความหน้าร้านไม่มีราคา จึงไม่ต้องแก้ข้อความเมื่อราคาเปลี่ยน |
| RevenueCat | Entitlement **`pro`** แนบทั้งสองสินค้า · Offering **`default`** (Current) · Packages `$rc_monthly` → `fitnese_monthly:monthly`, `$rc_lifetime` → `fitnese_lifetime` | `src/domain/entitlement/machine.ts` (`ENTITLEMENT_ID = 'pro'`), HUMAN_TASKS ข้อ 61 |

**ทดสอบให้ตรงกันก่อนส่ง:** ใช้บัญชี license tester ที่ยังไม่เคยสมัคร → Paywall ต้องแสดงทดลองฟรี 7 วันและราคาจาก Play → กดซื้อ → หน้าต่างของ Google Play ต้องแสดงทดลองฟรี 7 วันเช่นกัน → ยกเลิกแล้วลองใหม่ด้วยบัญชีเดิม → Paywall ต้องไม่โฆษณาทดลองฟรีอีก (TEST_PLAN / HUMAN_TASKS ข้อ 69)
