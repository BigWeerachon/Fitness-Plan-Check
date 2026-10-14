import { describe, expect, it } from '@jest/globals';
import { openDriver } from '@/db/driver';
import { runMigrations } from '@/db/migrate';
import { MIGRATIONS } from '@/db/migrations.generated';
import { appSettings, program, workoutSession } from '@/db/schema';

describe('migration runner', () => {
  it('applies every migration once and records the version', () => {
    const d = openDriver('t1');
    expect(runMigrations(d)).toBe(MIGRATIONS.length);
    expect(d.userVersion()).toBe(MIGRATIONS.length);
    // ครั้งที่สองไม่ทำซ้ำ
    expect(runMigrations(d)).toBe(0);
  });

  it('rolls back a failing migration without touching earlier data', () => {
    const d = openDriver('t2');
    runMigrations(d);
    d.exec("INSERT INTO app_settings (key, value) VALUES ('k', '\"v\"')");
    const broken = [
      ...MIGRATIONS,
      { tag: 'broken', statements: ['CREATE TABLE ok_table (id text)', 'THIS IS NOT SQL'] },
    ];
    expect(() => runMigrations(d, broken)).toThrow();
    expect(d.userVersion()).toBe(MIGRATIONS.length);
    // ตาราง ok_table ต้องไม่ถูกสร้าง (rollback ทั้งก้อน) และข้อมูลเดิมอยู่ครบ
    expect(() => d.exec('SELECT * FROM ok_table')).toThrow();
    expect(d.db.select().from(appSettings).all()).toEqual([{ key: 'k', value: '"v"' }]);
  });

  it('refuses to run against a database newer than the app', () => {
    const d = openDriver('t3');
    runMigrations(d);
    d.setUserVersion(MIGRATIONS.length + 5);
    expect(() => runMigrations(d)).toThrow(/newer/);
  });

  it('upgrades a sync-era database: drops the outbox/cursor tables and re-owns every row to local (D81)', () => {
    const d = openDriver('t4');
    const syncEra = MIGRATIONS.findIndex((m) => m.tag === '0004_drop_sync_tables');
    expect(syncEra).toBeGreaterThan(0);
    runMigrations(d, MIGRATIONS.slice(0, syncEra));
    d.exec(
      "INSERT INTO program (id, owner_id, created_at, updated_at, name, sort_order) VALUES ('p1', 'user-a', 1, 2, 'Mine', 0), ('p2', 'local', 1, 2, 'Local', 1)",
    );
    d.exec(
      "INSERT INTO workout_session (id, owner_id, created_at, updated_at, date, started_at, status) VALUES ('s1', 'user-a', 1, 2, '2026-10-01', 1, 'completed')",
    );
    d.exec(
      "INSERT INTO sync_outbox (table_name, row_id, owner_id, queued_at) VALUES ('program', 'p1', 'user-a', 1)",
    );
    d.exec("INSERT INTO sync_state (key, value) VALUES ('cursor:user-a:program', 'x')");

    expect(runMigrations(d)).toBe(MIGRATIONS.length - syncEra);
    const programs = d.db.select().from(program).all();
    expect(programs.map((p) => [p.id, p.ownerId, p.name, p.updatedAt])).toEqual([
      ['p1', 'local', 'Mine', 2],
      ['p2', 'local', 'Local', 2],
    ]);
    expect(
      d.db
        .select()
        .from(workoutSession)
        .all()
        .map((w) => w.ownerId),
    ).toEqual(['local']);
    expect(() => d.exec('SELECT * FROM sync_outbox')).toThrow(/no such table/);
    expect(() => d.exec('SELECT * FROM sync_state')).toThrow(/no such table/);
  });
});
