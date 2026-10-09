import type { SqlJsStatic } from 'sql.js';

/** sql.js ที่โหลดแล้ว (เตรียมใน warmup.web.ts ก่อนเปิดฐานข้อมูลครั้งแรก) */
let loaded: SqlJsStatic | null = null;

export function setSqlJs(sql: SqlJsStatic): void {
  loaded = sql;
}

export function getSqlJs(): SqlJsStatic {
  if (!loaded) throw new Error('sql.js is not loaded yet');
  return loaded;
}
