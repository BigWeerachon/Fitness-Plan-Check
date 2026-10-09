/**
 * เคอร์เซอร์ดึงข้อมูลจาก Supabase: (server_updated_at, id) — ใส่ id ด้วยเพื่อไม่ให้แถวที่เวลาเท่ากันตกหล่นตรงรอยต่อหน้า
 * รูปแบบสตริง "<เวลา ISO>|<id>" (เคอร์เซอร์รุ่นเก่าที่มีแต่เวลาก็อ่านได้)
 */
export interface PullCursor {
  ts: string;
  /** '' = ทุกแถวตั้งแต่เวลานี้ (รวมเวลาเท่ากัน) */
  id: string;
}

/**
 * ย้อนเคอร์เซอร์ทุกครั้งที่เริ่มซิงก์ เผื่อธุรกรรมที่ได้เวลาไว้ก่อนแต่ commit ทีหลังผู้อ่าน
 * การได้แถวซ้ำไม่มีผลเสีย เพราะการ merge เป็นแบบ last-write-wins (แถวที่ไม่ใหม่กว่าถูกข้าม)
 */
export const PULL_OVERLAP_MS = 2 * 60 * 1000;

export function encodeCursor(c: PullCursor): string {
  return `${c.ts}|${c.id}`;
}

export function decodeCursor(value: string | null | undefined): PullCursor | null {
  if (!value) return null;
  const i = value.lastIndexOf('|');
  if (i < 0) return { ts: value, id: '' };
  return { ts: value.slice(0, i), id: value.slice(i + 1) };
}

export function rewindCursor(value: string | null, ms = PULL_OVERLAP_MS): string | null {
  const c = decodeCursor(value);
  if (!c) return null;
  const t = Date.parse(c.ts);
  if (!Number.isFinite(t)) return value;
  return encodeCursor({ ts: new Date(t - ms).toISOString(), id: '' });
}

/** ตัวกรอง PostgREST แบบ or=(…) สำหรับ "แถวหลังเคอร์เซอร์" (ครอบค่าด้วย " เพราะเวลามี : และ .) */
export function afterCursorFilter(c: PullCursor): string {
  if (!c.id) return `server_updated_at.gte."${c.ts}"`;
  return `server_updated_at.gt."${c.ts}",and(server_updated_at.eq."${c.ts}",id.gt."${c.id}")`;
}
