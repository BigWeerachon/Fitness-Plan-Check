import type { WeightUnit } from '../db/schema';

/**
 * แปลงหน่วยและปัดเศษ (SPEC H1, G2) — ฟังก์ชันล้วน
 * น้ำหนักในฐานข้อมูลเป็น kg เสมอ หน่วย lb / ft-in ใช้ตอนแสดงผลและรับค่าที่ผู้ใช้กรอกเท่านั้น
 */

/** 1 lb = 0.45359237 kg (นิยามสากล) */
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

/**
 * ปัดเป็นทศนิยม n ตำแหน่งแบบ "ปัดครึ่งออกจากศูนย์"
 * คูณ (1 + EPSILON) กันปัญหาเลขทศนิยมฐานสอง เช่น 1.005 × 100 = 100.49999… ต้องได้ 1.01
 */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor * (1 + Number.EPSILON)) / factor;
  return value < 0 ? -rounded : rounded;
}

/** ปัดให้ลงก้าวที่ใกล้ที่สุด เช่น ก้าว 2.5 → …, 60, 62.5, 65 (ก้าว ≤ 0 = ไม่ปัด) */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(value)) return value;
  // ปัดผลหารก่อน (9 ตำแหน่ง) เพื่อตัดเศษลอยตัว เช่น 24.4999999999 → 24.5 แล้วค่อยปัดเป็นจำนวนเต็ม
  const steps = roundTo(roundTo(value / step, 9), 0);
  return roundTo(steps * step, 6);
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export interface FeetInches {
  ft: number;
  in: number;
}

/** cm → ฟุต/นิ้ว ปัดเป็นนิ้วเต็ม (ปัดแล้วได้ 12 นิ้วจะทดเป็นฟุต เช่น 5'12" → 6'0") */
export function cmToFtIn(cm: number): FeetInches {
  const totalInches = roundTo(cm / CM_PER_INCH, 0);
  return { ft: Math.floor(totalInches / INCHES_PER_FOOT), in: totalInches % INCHES_PER_FOOT };
}

export function ftInToCm(ft: number, inches: number): number {
  return (ft * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

/** น้ำหนัก kg → ตัวเลขในหน่วยของผู้ใช้ ปัดทศนิยม 1 ตำแหน่ง (สำหรับแสดงผล) */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return roundTo(unit === 'lb' ? kgToLb(kg) : kg, 1);
}

/** ค่าที่ผู้ใช้กรอกในหน่วยของตน → kg (ไม่ปัด เพื่อให้แสดงกลับเป็นตัวเลขเดิมเป๊ะ) */
export function weightToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

/** ตัวเลขน้ำหนักเป็นข้อความ ปัด 0.1 และตัด .0 ท้าย เช่น "100", "45.4" (ป้ายหน่วยมาจาก i18n `common.units`) */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return String(displayWeight(kg, unit));
}

/**
 * ปัดน้ำหนัก (kg) ให้ลงก้าวในหน่วยของผู้ใช้ แล้วคืนเป็น kg
 * - kg: ปัดตามก้าวตรงๆ เช่น 72 → 72.5 (ก้าว 2.5)
 * - lb: แปลงก้าวเป็น lb (ปัด 3 ตำแหน่ง ให้ 2.26796185 kg = 5 lb พอดี) ปัดน้ำหนักเป็น lb ตามก้าว แล้วแปลงกลับเป็น kg
 *   ผลจึงแสดงเป็นเลขกลมใน lb เช่น 105 lb ไม่ใช่ 104.7 lb
 */
export function roundWeightToStep(kg: number, stepKg: number, unit: WeightUnit): number {
  if (unit === 'lb') {
    const stepLb = roundTo(kgToLb(stepKg), 3);
    return roundTo(lbToKg(roundToStep(kgToLb(kg), stepLb)), 6);
  }
  return roundToStep(kg, stepKg);
}
