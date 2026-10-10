import { getTableColumns } from 'drizzle-orm';
import { LOCAL_OWNER } from '../../db/owner';
import { SYNCED_TABLES, type SyncedTableName } from '../../db/schema';
import type { RemoteRow } from '../../services/sync/types';

/**
 * แปลงแถวในเครื่อง (ชื่อฟิลด์ camelCase ของ Drizzle) ↔ แถวบนคลาวด์ (ชื่อคอลัมน์ SQL เดียวกัน)
 * ต่างกันแค่ owner_id ↔ user_id และคลาวด์มี server_updated_at เพิ่ม
 */

interface ColumnInfo {
  key: string;
  sqlName: string;
  dataType: string;
}

const cache = new Map<SyncedTableName, ColumnInfo[]>();

export function columnsOf(table: SyncedTableName): ColumnInfo[] {
  let cols = cache.get(table);
  if (!cols) {
    const raw = getTableColumns(SYNCED_TABLES[table]) as Record<string, { name: string; dataType: string }>;
    cols = Object.entries(raw).map(([key, c]) => ({ key, sqlName: c.name, dataType: c.dataType }));
    cache.set(table, cols);
  }
  return cols;
}

export function toRemote(table: SyncedTableName, row: Record<string, unknown>, userId: string): RemoteRow {
  const out: Record<string, unknown> = {};
  for (const c of columnsOf(table)) {
    if (c.key === 'ownerId') continue;
    out[c.sqlName] = row[c.key] ?? null;
  }
  out.user_id = userId;
  return out as RemoteRow;
}

function coerce(value: unknown, dataType: string): unknown {
  if (value === undefined || value === null) return null;
  // PostgREST อาจส่ง bigint เป็น string และ boolean จาก SQLite เป็นตัวเลข
  if (dataType === 'number' && typeof value === 'string' && value.trim() !== '') return Number(value);
  if (dataType === 'boolean' && typeof value !== 'boolean')
    return value === 1 || value === '1' || value === 'true';
  if (dataType === 'json' && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function fromRemote(table: SyncedTableName, remote: RemoteRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columnsOf(table)) {
    if (c.key === 'ownerId') out.ownerId = (remote.user_id as string | undefined) ?? LOCAL_OWNER;
    else out[c.key] = coerce(remote[c.sqlName], c.dataType);
  }
  return out;
}
