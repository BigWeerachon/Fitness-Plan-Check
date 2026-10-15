/**
 * บนมือถือเปิดฐานข้อมูลแบบ synchronous ได้ทันที จึงไม่ต้องเตรียมอะไร
 * (เวอร์ชันเว็บอยู่ที่ warmup.web.ts — ใช้เฉพาะพรีวิวสำหรับตรวจภาพ)
 */
export const warmUpDatabase: (() => Promise<void>) | null = null;
