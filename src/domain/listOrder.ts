/**
 * ย้ายสมาชิกที่ตำแหน่ง index ไปข้างหน้า/ข้างหลัง 1 ช่อง (สลับกับเพื่อนบ้าน) — ฟังก์ชันล้วน ไม่แก้ list เดิม
 * คืน null เมื่อ index หรือปลายทางอยู่นอกขอบ (ไม่มีอะไรต้องย้าย)
 */
export function moveItem<T>(list: readonly T[], index: number, delta: -1 | 1): T[] | null {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
