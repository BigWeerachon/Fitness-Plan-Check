import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/** Drizzle แบบ synchronous (expo-sqlite บนเครื่อง / better-sqlite3 ในเทสต์) ใช้ query builder เดียวกัน */
export type AppDb = BaseSQLiteDatabase<'sync', any, typeof schema>;

export interface SqlDriver {
  db: AppDb;
  exec(sql: string): void;
  userVersion(): number;
  setUserVersion(version: number): void;
  transaction<T>(fn: () => T): T;
  close(): void;
}
