import type { MuscleGroup } from '../db/schema';

/**
 * ไอคอนกลุ่มกล้ามเนื้อ (SPEC F9: ไม่ใช้รูป/วิดีโอที่มีลิขสิทธิ์) — วาดเองด้วยรูปทรงเรขาคณิตบนผืน 32×32
 * ทุกกลุ่มใช้ร่างคนเส้นเดียวกัน (BODY_OUTLINE) แล้วเติมสีเฉพาะบริเวณของกล้ามเนื้อนั้น
 */
export type MuscleShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

export const MUSCLE_ICON_SIZE = 32;

const rect = (x: number, y: number, w: number, h: number, r = 1.5): MuscleShape => ({
  kind: 'rect',
  x,
  y,
  w,
  h,
  r,
});
const circle = (cx: number, cy: number, r: number): MuscleShape => ({ kind: 'circle', cx, cy, r });

/** เส้นขอบร่างกาย: หัว ลำตัว แขนสองข้าง ขาสองข้าง */
export const BODY_OUTLINE: MuscleShape[] = [
  circle(16, 4.5, 3),
  rect(10, 9, 12, 10, 3),
  rect(5.5, 9.5, 3.5, 11, 1.75),
  rect(23, 9.5, 3.5, 11, 1.75),
  rect(10.5, 20, 5, 10.5, 2),
  rect(16.5, 20, 5, 10.5, 2),
];

export const MUSCLE_ICON: Record<MuscleGroup, MuscleShape[]> = {
  chest: [rect(10.5, 10, 11, 4.5, 2)],
  back: [rect(10, 9, 12, 10, 3)],
  shoulders: [circle(7.25, 10.5, 2.4), circle(24.75, 10.5, 2.4)],
  biceps: [rect(5.5, 12.5, 3.5, 4, 1.5), rect(23, 12.5, 3.5, 4, 1.5)],
  triceps: [rect(5.5, 10, 3.5, 5, 1.5), rect(23, 10, 3.5, 5, 1.5)],
  forearms: [rect(5.5, 16.5, 3.5, 4.5, 1.5), rect(23, 16.5, 3.5, 4.5, 1.5)],
  quads: [rect(10.5, 20.5, 5, 5, 2), rect(16.5, 20.5, 5, 5, 2)],
  hamstrings: [rect(11, 22, 4, 5.5, 2), rect(17, 22, 4, 5.5, 2)],
  glutes: [rect(10.5, 18, 11, 4, 2)],
  calves: [rect(10.5, 26, 5, 4.5, 2), rect(16.5, 26, 5, 4.5, 2)],
  core: [rect(13, 14.5, 6, 4.5, 2)],
};
