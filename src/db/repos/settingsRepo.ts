import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { appSettings } from '../schema';

/** การตั้งค่าระดับเครื่อง (key/value JSON) — ไม่ซิงก์ */
export const settingsRepo = {
  get<T>(key: string): T | undefined {
    const row = getDb().select().from(appSettings).where(eq(appSettings.key, key)).get();
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return undefined;
    }
  },
  set(key: string, value: unknown): void {
    const json = JSON.stringify(value);
    getDb()
      .insert(appSettings)
      .values({ key, value: json })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: json } })
      .run();
  },
  remove(key: string): void {
    getDb().delete(appSettings).where(eq(appSettings.key, key)).run();
  },
  all(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const row of getDb().select().from(appSettings).all()) {
      try {
        out[row.key] = JSON.parse(row.value);
      } catch {
        // ข้ามค่าที่อ่านไม่ได้
      }
    }
    return out;
  },
};
