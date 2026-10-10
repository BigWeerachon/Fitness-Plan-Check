// รุ่นสำหรับเบราว์เซอร์ของ sql.js (ไม่มี require ของ Node) ใช้ชนิดเดียวกับแพ็กเกจหลัก
declare module 'sql.js/dist/sql-wasm-browser.js' {
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}

// ไฟล์ .wasm เป็น asset ของ Metro (ดู metro.config.js)
declare module '*.wasm' {
  const asset: number;
  export default asset;
}
