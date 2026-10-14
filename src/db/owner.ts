/**
 * เจ้าของข้อมูล: แอปออฟไลน์ล้วน ไม่มีบัญชี (D81) ทุกแถวจึงเป็นของ 'local' เสมอ
 * คงคอลัมน์ owner_id และการกรองไว้เพื่อไม่ต้องรื้อ schema — แถวเก่าที่เคยผูก id ผู้ใช้
 * ถูก migration 0005 ย้ายมาเป็น 'local' แล้ว
 */
export const LOCAL_OWNER = 'local';

export function getOwner(): string {
  return LOCAL_OWNER;
}
