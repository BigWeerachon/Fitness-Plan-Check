import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import type { SqlDriver } from './types';

/**
 * เปิดฐานข้อมูล SQLite บนเครื่อง (expo-sqlite) ผ่าน Drizzle
 * ในเทสต์ไฟล์นี้ถูก mock ให้ใช้ better-sqlite3 ในหน่วยความจำ (ดู jest.setup.js) ทั้ง SQL และ migration เป็นของจริง
 */
export function openDriver(name: string): SqlDriver {
  const sqlite = openDatabaseSync(name);
  const db = drizzle(sqlite, { schema });
  return {
    db,
    exec: (sql) => sqlite.execSync(sql),
    userVersion: () =>
      sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0,
    setUserVersion: (v) => sqlite.execSync(`PRAGMA user_version = ${Math.floor(v)}`),
    transaction: (fn) => {
      let result: ReturnType<typeof fn> | undefined;
      sqlite.withTransactionSync(() => {
        result = fn();
      });
      return result as ReturnType<typeof fn>;
    },
    close: () => sqlite.closeSync(),
  };
}
