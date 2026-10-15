import { drizzle } from 'drizzle-orm/sql-js';
import * as schema from './schema';
import { getSqlJs } from './sqljs.web';
import { createTxState, runTransaction } from './transaction';
import type { AppDb, SqlDriver } from './types';

/**
 * ไดรเวอร์สำหรับพรีวิวบนเว็บ (ใช้ตรวจภาพเท่านั้น ไม่ใช่แพลตฟอร์มที่ส่งสโตร์):
 * sql.js = SQLite ใน WebAssembly แบบ synchronous บน main thread ฐานข้อมูลอยู่ในหน่วยความจำ
 * ใช้ schema/migration/Drizzle ชุดเดียวกับบนเครื่อง
 */
export function openDriver(_name: string): SqlDriver {
  const sqlite = new (getSqlJs().Database)();
  const db = drizzle(sqlite, { schema }) as unknown as AppDb;
  const exec = (sql: string) => {
    sqlite.exec(sql);
  };
  const tx = createTxState();
  return {
    db,
    exec,
    userVersion: () => Number(sqlite.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0),
    setUserVersion: (v) => exec(`PRAGMA user_version = ${Math.floor(v)}`),
    transaction: (fn) => runTransaction(exec, tx, fn),
    close: () => sqlite.close(),
  };
}
