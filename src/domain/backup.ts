/**
 * ไฟล์สำรองข้อมูล (D82): JSON ที่มีเวอร์ชัน เก็บข้อมูลผู้ใช้ทุกตาราง ใช้ย้ายข้อมูลข้ามเครื่องเอง (ไม่มีคลาวด์ D81)
 *
 * กฎความเข้ากันได้ (parseBackup):
 * - `format` ต้องเป็น BACKUP_FORMAT และ `formatVersion` ต้องไม่ใหม่กว่าที่แอปนี้รู้จัก
 * - `schemaVersion` (จำนวน migration ตอนส่งออก) ต้องไม่มากกว่าของแอปนี้ — ไฟล์จากแอปเวอร์ชันใหม่กว่าถูกปฏิเสธ
 * - ไฟล์จาก schema เก่ากว่าหรือเท่ากันรับได้ ถ้าคอลัมน์ในแต่ละแถวเป็น "ส่วนย่อย" ของคอลัมน์ปัจจุบัน:
 *   คอลัมน์ที่ขาดเติมค่าเริ่มต้นของคอลัมน์ (หรือ null ถ้าคอลัมน์ว่างได้) — ขาดคอลัมน์ที่บังคับและไม่มีค่าเริ่มต้น = ไฟล์เสีย
 *   คอลัมน์ที่ไม่รู้จัก = ไฟล์เสีย (schema ไม่ตรงกับที่ประกาศ)
 * - ต้องมีครบทุกตารางที่ schemaVersion ของไฟล์ควรมี (ตารางที่เพิ่มทีหลังประกาศ introducedIn) ตารางที่แอปไม่รู้จักถูกข้าม
 * - ชนิดค่าตรวจระดับคอลัมน์ (text/number/boolean/json) ไม่ตรวจค่า enum หรือความสัมพันธ์ข้ามตาราง
 *   ตัวเลขไม่บังคับจำนวนเต็ม เพราะ SQLite เก็บได้ทั้งสองแบบ และไม่อยากปฏิเสธไฟล์ที่แอปเองส่งออก
 * - แถวที่ถูกลบแล้ว (deletedAt ไม่ว่าง) ไม่ถูกส่งออก และถ้ามีในไฟล์ก็ถูกข้าม — การกู้คืนแทนที่ทั้งหมด ไม่ต้องใช้ tombstone
 */

export const BACKUP_FORMAT = 'fitnese-backup';
/** เวอร์ชันของโครงไฟล์ (meta + tables + settings) ไม่ใช่ schema ฐานข้อมูล */
export const BACKUP_FORMAT_VERSION = 1;
/**
 * กันไฟล์ใหญ่ผิดปกติ — ข้อมูลฝึกหลายปียังเล็กกว่านี้มาก
 * ตรวจขนาดไฟล์ (ไบต์) ก่อนอ่าน และความยาวข้อความ (ตัวอักษร ≤ ไบต์ของ UTF-8) ใน parseBackup
 */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export type ColumnKind = 'text' | 'number' | 'boolean' | 'json';

export interface ColumnSpec {
  kind: ColumnKind;
  nullable: boolean;
  /** มี key นี้ = คอลัมน์มีค่าเริ่มต้น */
  default?: unknown;
}

export interface TableSpec {
  columns: Record<string, ColumnSpec>;
  /** schemaVersion แรกที่มีตารางนี้ (ไม่ระบุ = มีตั้งแต่แรก) */
  introducedIn?: number;
}

export type SettingKind = 'boolean' | 'number' | 'string';

/** รูปแบบข้อมูลของแอปเวอร์ชันนี้ (สร้างจาก schema จริงในชั้นฐานข้อมูล) */
export interface BackupSpec {
  schemaVersion: number;
  tables: Record<string, TableSpec>;
  settings: Record<string, SettingKind>;
}

export type BackupRow = Record<string, unknown>;

export interface BackupMeta {
  schemaVersion: number;
  appVersion: string;
  /** epoch ms */
  exportedAt: number;
}

export interface BackupFile extends BackupMeta {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  settings: Record<string, unknown>;
  tables: Record<string, BackupRow[]>;
}

export interface BackupSummary {
  exportedAt: number;
  appVersion: string;
  schemaVersion: number;
  counts: Record<string, number>;
  totalRows: number;
}

export type BackupProblem =
  'tooLarge' | 'notJson' | 'notBackup' | 'newerFormat' | 'newerSchema' | 'missingTable' | 'badRows';

export type ParseResult =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; reason: BackupProblem; detail?: string };

export function buildBackup(
  tables: Record<string, BackupRow[]>,
  meta: BackupMeta & { settings?: Record<string, unknown> },
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: meta.schemaVersion,
    appVersion: meta.appVersion,
    exportedAt: meta.exportedAt,
    settings: meta.settings ?? {},
    tables,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup);
}

/** ชื่อไฟล์สำรอง ตามวันที่ท้องถิ่น YYYY-MM-DD */
export function backupFilename(localDate: string): string {
  return `${BACKUP_FORMAT}-${localDate}.json`;
}

export function summarize(backup: BackupFile): BackupSummary {
  const counts: Record<string, number> = {};
  let totalRows = 0;
  for (const [name, rows] of Object.entries(backup.tables)) {
    counts[name] = rows.length;
    totalRows += rows.length;
  }
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    schemaVersion: backup.schemaVersion,
    counts,
    totalRows,
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1;
}

function matchesKind(value: unknown, kind: ColumnKind): boolean {
  switch (kind) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'json':
      return typeof value === 'object' && value !== null;
  }
}

/** ตรวจและเติมค่าเริ่มต้นของแถวหนึ่ง คืนชื่อคอลัมน์ที่ผิดถ้าไม่ผ่าน */
function normalizeRow(raw: unknown, spec: TableSpec): { row: BackupRow } | { bad: string } {
  if (!isPlainObject(raw)) return { bad: '(row)' };
  for (const key of Object.keys(raw)) {
    if (!(key in spec.columns)) return { bad: key };
  }
  const row: BackupRow = {};
  for (const [col, c] of Object.entries(spec.columns)) {
    const present = col in raw && raw[col] !== undefined;
    const value = present ? raw[col] : 'default' in c ? c.default : null;
    if (value === null) {
      if (!c.nullable) return { bad: col };
    } else if (!matchesKind(value, c.kind)) {
      return { bad: col };
    }
    row[col] = value;
  }
  if (typeof row.id !== 'string' || row.id.length === 0) return { bad: 'id' };
  return { row };
}

function fail(reason: BackupProblem, detail?: string): ParseResult {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

/** settings ที่รู้จักและชนิดถูกต้องเท่านั้น (ค่าอื่นข้ามไปเงียบๆ — ไม่ใช่ข้อมูลการฝึก) */
function pickSettings(raw: unknown, spec: BackupSpec['settings']): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isPlainObject(raw)) return out;
  for (const [key, kind] of Object.entries(spec)) {
    if (typeof raw[key] === kind) out[key] = raw[key];
  }
  return out;
}

/** อ่านและตรวจไฟล์สำรอง — ไม่ throw คืนเหตุผลที่อ่านไม่ได้แทน */
export function parseBackup(text: string, spec: BackupSpec, opts: { maxLength?: number } = {}): ParseResult {
  if (text.length > (opts.maxLength ?? MAX_BACKUP_BYTES)) return fail('tooLarge');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('notJson');
  }
  if (!isPlainObject(data) || data.format !== BACKUP_FORMAT) return fail('notBackup');
  if (!isPositiveInt(data.formatVersion)) return fail('notBackup');
  if (data.formatVersion > BACKUP_FORMAT_VERSION) return fail('newerFormat');
  if (!isPositiveInt(data.schemaVersion)) return fail('notBackup');
  if (data.schemaVersion > spec.schemaVersion) return fail('newerSchema');
  const { exportedAt, appVersion, tables } = data;
  if (typeof exportedAt !== 'number' || !Number.isFinite(exportedAt)) return fail('notBackup');
  if (typeof appVersion !== 'string') return fail('notBackup');
  if (!isPlainObject(tables)) return fail('notBackup');

  const out: Record<string, BackupRow[]> = {};
  for (const [name, tableSpec] of Object.entries(spec.tables)) {
    const rawRows = tables[name];
    if (rawRows === undefined) {
      // ตารางที่เพิ่มหลังเวอร์ชันของไฟล์ → ถือว่าว่าง
      if ((tableSpec.introducedIn ?? 1) > data.schemaVersion) {
        out[name] = [];
        continue;
      }
      return fail('missingTable', name);
    }
    if (!Array.isArray(rawRows)) return fail('badRows', name);
    const rows: BackupRow[] = [];
    const ids = new Set<string>();
    for (let i = 0; i < rawRows.length; i++) {
      const r = normalizeRow(rawRows[i], tableSpec);
      if ('bad' in r) return fail('badRows', `${name}[${i}].${r.bad}`);
      const id = r.row.id as string;
      if (ids.has(id)) return fail('badRows', `${name}[${i}].id`);
      ids.add(id);
      if (r.row.deletedAt != null) continue;
      rows.push(r.row);
    }
    out[name] = rows;
  }

  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: data.formatVersion,
    schemaVersion: data.schemaVersion,
    appVersion,
    exportedAt,
    settings: pickSettings(data.settings, spec.settings),
    tables: out,
  };
  return { ok: true, backup, summary: summarize(backup) };
}
