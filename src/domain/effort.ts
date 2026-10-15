/** ช่วงที่ยอมรับของ RIR (ครั้งที่เหลือในถัง) และ RPE (ความหนักที่รู้สึก) — SPEC G2 */
export const RIR_RANGE = { min: 0, max: 10 } as const;
export const RPE_RANGE = { min: 1, max: 10 } as const;

export type EffortKind = 'rir' | 'rpe';

export type EffortParse = { ok: true; value: number | null } | { ok: false };

/**
 * แปลงข้อความที่ผู้ใช้พิมพ์เป็นค่า RIR/RPE (ว่าง = ไม่ระบุ = null)
 * RIR: จำนวนเต็ม 0–10 · RPE: 1–10 เพิ่มทีละครึ่ง (เช่น 7.5) รับทั้งจุดและจุลภาคเป็นทศนิยม
 */
export function parseEffort(text: string, kind: EffortKind): EffortParse {
  const raw = text.trim().replace(',', '.');
  if (raw === '') return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false };
  const n = Number(raw);
  const range = kind === 'rir' ? RIR_RANGE : RPE_RANGE;
  if (n < range.min || n > range.max) return { ok: false };
  const step = kind === 'rir' ? 1 : 0.5;
  if (Math.abs(n / step - Math.round(n / step)) > 1e-9) return { ok: false };
  return { ok: true, value: n };
}
