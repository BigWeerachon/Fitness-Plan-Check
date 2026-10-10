import { Asset } from 'expo-asset';
import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';
import wasmAsset from 'sql.js/dist/sql-wasm-browser.wasm';
import { setSqlJs } from './sqljs.web';

/** โหลด sql.js (WebAssembly) ก่อนเปิดฐานข้อมูลแบบ synchronous ครั้งแรก — ใช้เฉพาะพรีวิวบนเว็บ */
export const warmUpDatabase: (() => Promise<void>) | null = async () => {
  const wasm = Asset.fromModule(wasmAsset);
  setSqlJs(await initSqlJs({ locateFile: () => wasm.uri }));
};
