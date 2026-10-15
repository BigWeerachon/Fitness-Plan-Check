import { create } from 'zustand';

/** ตัวนับการเปลี่ยนแปลงข้อมูลในเครื่อง — หน้าจอที่อ่านจาก repository ใช้เพื่อรีเฟรชอัตโนมัติ */
interface DataVersionStore {
  version: number;
  bump(): void;
}

export const useDataVersion = create<DataVersionStore>((set) => ({
  version: 0,
  bump() {
    set((s) => ({ version: s.version + 1 }));
  },
}));

export function notifyDataChanged(): void {
  useDataVersion.getState().bump();
}
