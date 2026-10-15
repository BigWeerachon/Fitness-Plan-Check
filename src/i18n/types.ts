/**
 * โครงสร้างคำแปลภาษาอังกฤษเป็นต้นแบบ ภาษาไทยต้องมี key ครบทุกตัว (ตรวจตอน typecheck)
 * และมีเทสต์ตรวจซ้ำตอนรันไทม์ (__tests__/i18n.test.ts)
 */
export type LocaleShape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : LocaleShape<T[K]>;
};
