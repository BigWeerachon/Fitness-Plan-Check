import { openDriver } from './driver';
import { runMigrations } from './migrate';
import type { AppDb, SqlDriver } from './types';

export const DB_NAME = 'fitnese.db';

let driver: SqlDriver | null = null;

/** เปิดฐานข้อมูลและรัน migration ครั้งแรกที่เรียก (synchronous — SQLite ในเครื่องเร็วพอสำหรับ bootstrap) */
export function getDriver(): SqlDriver {
  if (!driver) {
    driver = openDriver(DB_NAME);
    runMigrations(driver);
  }
  return driver;
}

export function getDb(): AppDb {
  return getDriver().db;
}

export function transaction<T>(fn: () => T): T {
  return getDriver().transaction(fn);
}

/** สำหรับเทสต์: ปิดและเริ่มฐานข้อมูลใหม่ */
export function resetDbForTests(): void {
  driver?.close();
  driver = null;
}
