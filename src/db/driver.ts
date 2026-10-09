import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import { createTxState, runTransaction } from './transaction';
import type { SqlDriver } from './types';

/**
 * เปิดฐานข้อมูล SQLite บนเครื่อง (expo-sqlite) ผ่าน Drizzle
 * ในเทสต์ไฟล์นี้ถูก mock ให้ใช้ better-sqlite3 ในหน่วยความจำ (ดู jest.setup.js) ทั้ง SQL และ migration เป็นของจริง
 */
export function openDriver(name: string): SqlDriver {
  const sqlite = openDatabaseSync(name);
  const db = drizzle(sqlite, { schema });
  const exec = (sql: string) => sqlite.execSync(sql);
  const tx = createTxState();
  return {
    db,
    exec,
    userVersion: () =>
      sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0,
    setUserVersion: (v) => sqlite.execSync(`PRAGMA user_version = ${Math.floor(v)}`),
    // ไม่ใช้ withTransactionSync ของ expo-sqlite เพราะเรียกซ้อนกันไม่ได้ (BEGIN ซ้อน = error)
    transaction: (fn) => runTransaction(exec, tx, fn),
    close: () => sqlite.closeSync(),
  };
}
