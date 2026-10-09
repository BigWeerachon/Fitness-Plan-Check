/** นาฬิกาที่สลับได้ในเทสต์ (ทุกโค้ดที่ต้องรู้เวลาปัจจุบันให้เรียก now()) */
let override: (() => number) | null = null;

export function now(): number {
  return override ? override() : Date.now();
}

export function setClockForTests(fn: (() => number) | null): void {
  override = fn;
}
