/**
 * transaction ที่ซ้อนกันได้ (SQLite ไม่รองรับ BEGIN ซ้อน):
 * ชั้นนอกสุดใช้ BEGIN/COMMIT, ชั้นในใช้ SAVEPOINT — ชั้นในล้มเหลวแล้วชั้นนอกจับ error ได้ ข้อมูลของชั้นในถูกย้อนคืนเท่านั้น
 * ใช้ร่วมกันทั้งไดรเวอร์บนเครื่อง (expo-sqlite), พรีวิวเว็บ (sql.js) และเทสต์ (better-sqlite3) ให้พฤติกรรมเหมือนกันทุกที่
 */
export interface TxState {
  depth: number;
}

export function createTxState(): TxState {
  return { depth: 0 };
}

export function runTransaction<T>(exec: (sql: string) => void, state: TxState, fn: () => T): T {
  const level = state.depth;
  const savepoint = `tx_${level}`;
  exec(level === 0 ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
  state.depth++;
  try {
    const result = fn();
    state.depth--;
    exec(level === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
    return result;
  } catch (e) {
    state.depth--;
    exec(level === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
    throw e;
  }
}
