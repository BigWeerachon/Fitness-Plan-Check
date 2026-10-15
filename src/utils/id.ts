import { randomUUID } from 'expo-crypto';

/** UUID v4 สำหรับ primary key ทุกตาราง (สร้างในเครื่องได้แม้ออฟไลน์) */
export function newId(): string {
  return randomUUID();
}
