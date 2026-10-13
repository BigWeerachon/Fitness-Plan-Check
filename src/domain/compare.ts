/** เทียบสตริงตามรหัสอักขระ (ไม่ขึ้นกับ locale) — ใช้เป็นตัวตัดสินเสมอกันให้ลำดับคงที่ทุกเครื่อง */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
