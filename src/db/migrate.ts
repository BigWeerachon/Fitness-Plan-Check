import { MIGRATIONS, type EmbeddedMigration } from './migrations.generated';
import type { SqlDriver } from './types';

/**
 * ตัวรัน migration แบบเรียบง่ายและตรวจสอบได้:
 * - PRAGMA user_version = จำนวน migration ที่รันแล้ว
 * - แต่ละ migration รันใน transaction เดียว ล้มเหลว = rollback ทั้งก้อน ข้อมูลเดิมไม่เสียหาย
 * - ฐานข้อมูลที่ใหม่กว่าแอป (เช่น ย้อนเวอร์ชันแอป) จะไม่ถูกแตะต้อง
 */
export function runMigrations(driver: SqlDriver, migrations: EmbeddedMigration[] = MIGRATIONS): number {
  driver.exec('PRAGMA journal_mode = WAL');
  driver.exec('PRAGMA foreign_keys = ON');
  const current = driver.userVersion();
  if (current > migrations.length) {
    throw new Error(`Database version ${current} is newer than this app (${migrations.length})`);
  }
  let applied = 0;
  for (let i = current; i < migrations.length; i++) {
    const m = migrations[i];
    driver.transaction(() => {
      for (const statement of m.statements) driver.exec(statement);
      driver.setUserVersion(i + 1);
    });
    applied++;
  }
  return applied;
}
