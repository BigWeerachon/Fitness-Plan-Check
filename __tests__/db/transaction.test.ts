import { describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { createTxState, runTransaction } from '@/db/transaction';

function setup() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE t (v INTEGER)');
  const exec = (sql: string) => sqlite.exec(sql);
  const state = createTxState();
  const tx = <T>(fn: () => T) => runTransaction(exec, state, fn);
  const values = () =>
    (sqlite.prepare('SELECT v FROM t ORDER BY v').all() as { v: number }[]).map((r) => r.v);
  return { exec, tx, values, state };
}

describe('nested transactions (BEGIN + SAVEPOINT)', () => {
  it('commits nested work together', () => {
    const { exec, tx, values, state } = setup();
    tx(() => {
      exec('INSERT INTO t VALUES (1)');
      tx(() => exec('INSERT INTO t VALUES (2)'));
    });
    expect(values()).toEqual([1, 2]);
    expect(state.depth).toBe(0);
  });

  it('rolls back only the inner level when its error is caught', () => {
    const { exec, tx, values } = setup();
    tx(() => {
      exec('INSERT INTO t VALUES (1)');
      try {
        tx(() => {
          exec('INSERT INTO t VALUES (2)');
          throw new Error('inner');
        });
      } catch {
        // ชั้นนอกตัดสินใจทำต่อ
      }
      exec('INSERT INTO t VALUES (3)');
    });
    expect(values()).toEqual([1, 3]);
  });

  it('rolls back everything when the outer level fails', () => {
    const { exec, tx, values, state } = setup();
    expect(() =>
      tx(() => {
        exec('INSERT INTO t VALUES (1)');
        tx(() => exec('INSERT INTO t VALUES (2)'));
        throw new Error('outer');
      }),
    ).toThrow('outer');
    expect(values()).toEqual([]);
    expect(state.depth).toBe(0);
    // ใช้ต่อได้หลังล้มเหลว
    tx(() => exec('INSERT INTO t VALUES (9)'));
    expect(values()).toEqual([9]);
  });

  it('supports three levels and returns values', () => {
    const { exec, tx, values } = setup();
    const r = tx(() => tx(() => tx(() => (exec('INSERT INTO t VALUES (5)'), 'ok'))));
    expect(r).toBe('ok');
    expect(values()).toEqual([5]);
  });
});
