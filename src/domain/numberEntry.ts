/** ปุ่มบนแป้นตัวเลข: เลข 0–9, จุดทศนิยม และลบ */
export type NumberKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | '⌫';

export const MAX_DECIMAL_PLACES = 2;

export interface NumberEntryOptions {
  allowDecimal: boolean;
  max: number;
}

function decimalPlaces(text: string): number {
  return text.split('.')[1]?.length ?? 0;
}

/** ข้อความตัวเลขที่กำลังพิมพ์หลังกดปุ่ม key (กดแล้วไม่ถูกต้องจะคืนข้อความเดิม) */
export function applyKey(prev: string, key: NumberKey, opts: NumberEntryOptions): string {
  if (key === '⌫') return prev.slice(0, -1);
  if (key === '.') {
    const canAddPoint = opts.allowDecimal && !prev.includes('.');
    return canAddPoint ? (prev || '0') + '.' : prev;
  }
  const next = prev === '0' ? key : prev + key;
  if (decimalPlaces(next) > MAX_DECIMAL_PLACES) return prev;
  return Number(next) > opts.max ? prev : next;
}
