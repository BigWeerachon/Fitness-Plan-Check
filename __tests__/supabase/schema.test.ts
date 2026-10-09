import { describe, expect, it } from '@jest/globals';
import { getTableColumns } from 'drizzle-orm';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { SYNCED_TABLES, type SyncedTableName } from '@/db/schema';

/**
 * ตรวจว่าตารางบน Supabase ตรงกับ schema ในเครื่องทุกคอลัมน์ (ชื่อ ชนิด และ not null)
 * กันกรณีเพิ่มคอลัมน์ในแอปแล้วลืม migration ฝั่งคลาวด์ → การซิงก์จะพังตอนใช้งานจริง
 */
const dir = join(__dirname, '../../supabase/migrations');
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n');

interface RemoteColumn {
  type: string;
  notNull: boolean;
}

function remoteTable(name: string): Map<string, RemoteColumn> | null {
  const m = new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
  if (!m) return null;
  const cols = new Map<string, RemoteColumn>();
  for (const raw of m[1].split('\n')) {
    const line = raw.trim().replace(/,$/, '');
    const c = /^([a-z_]+) (bigint|text|double precision|boolean|jsonb|uuid|timestamptz)(.*)$/.exec(line);
    if (!c) continue;
    cols.set(c[1], { type: c[2], notNull: /not null|primary key/.test(c[3]) });
  }
  return cols;
}

function expectedType(columnType: string): string {
  switch (columnType) {
    case 'SQLiteText':
      return 'text';
    case 'SQLiteInteger':
    case 'SQLiteTimestamp':
      return 'bigint';
    case 'SQLiteReal':
      return 'double precision';
    case 'SQLiteBoolean':
      return 'boolean';
    case 'SQLiteTextJson':
      return 'jsonb';
    default:
      throw new Error(`unmapped column type ${columnType}`);
  }
}

describe('Supabase schema mirrors the local schema (SPEC L, M)', () => {
  const names = Object.keys(SYNCED_TABLES) as SyncedTableName[];

  it.each(names)('%s has every local column with a matching type', (name) => {
    const remote = remoteTable(name);
    expect(remote).not.toBeNull();
    const local = getTableColumns(SYNCED_TABLES[name]) as Record<
      string,
      { name: string; columnType: string; notNull: boolean }
    >;
    const expected = new Set<string>();
    for (const col of Object.values(local)) {
      if (col.name === 'owner_id') continue;
      expected.add(col.name);
      const r = remote!.get(col.name);
      expect({ column: col.name, type: r?.type }).toEqual({
        column: col.name,
        type: expectedType(col.columnType),
      });
      expect({ column: col.name, notNull: r?.notNull }).toEqual({ column: col.name, notNull: col.notNull });
    }
    expect(remote!.get('user_id')).toEqual({ type: 'uuid', notNull: true });
    expect(remote!.get('server_updated_at')).toEqual({ type: 'timestamptz', notNull: true });
    // ไม่มีคอลัมน์เกินบนคลาวด์ที่แอปไม่รู้จัก
    expect([...remote!.keys()].filter((k) => !expected.has(k)).sort()).toEqual([
      'server_updated_at',
      'user_id',
    ]);
  });

  it('enables RLS, policies and the last-write-wins trigger for every synced table', () => {
    const loop = /foreach t in array array\[([\s\S]*?)\]/.exec(sql);
    expect(loop).not.toBeNull();
    const listed = loop![1].match(/'([a-z_]+)'/g)!.map((s) => s.replace(/'/g, ''));
    expect(listed.sort()).toEqual([...names].sort());
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/has_sync_access\(\(select auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/if new\.updated_at < old\.updated_at then\s+return null;/);
    // ไม่มี policy delete สำหรับผู้ใช้ (soft delete เท่านั้น)
    expect(sql).not.toMatch(/for delete to authenticated/);
  });

  it('grants sync access to the same states the app unlocks', () => {
    expect(sql).toMatch(/e\.state = 'LIFETIME'/);
    expect(sql).toMatch(/e\.state in \('TRIALING', 'SUBSCRIBED_MONTHLY', 'BILLING_GRACE'\)/);
  });
});
