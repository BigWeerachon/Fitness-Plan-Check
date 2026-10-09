import { describe, expect, it } from '@jest/globals';
import { openDriver } from '@/db/driver';
import { runMigrations } from '@/db/migrate';
import { MIGRATIONS } from '@/db/migrations.generated';
import { appSettings } from '@/db/schema';

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
});
