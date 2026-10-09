/**
 * เจ้าของข้อมูลปัจจุบัน: 'local' ก่อนล็อกอิน หรือ id ผู้ใช้หลังล็อกอิน
 * ทุก query ของ repository กรองด้วย owner นี้ ข้อมูลของบัญชีอื่นบนเครื่องเดียวกันจึงไม่ปนกันและไม่หาย (SPEC จ)
 */
export const LOCAL_OWNER = 'local';

let currentOwner = LOCAL_OWNER;
const listeners = new Set<(owner: string) => void>();

export function getOwner(): string {
  return currentOwner;
}

export function setOwner(owner: string | null): void {
  const next = owner ?? LOCAL_OWNER;
  if (next === currentOwner) return;
  currentOwner = next;
  listeners.forEach((l) => l(next));
}

export function onOwnerChange(listener: (owner: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
