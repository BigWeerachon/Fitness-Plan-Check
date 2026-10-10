import { create } from 'zustand';

/** ตัวจับเวลาพัก (SPEC G1) อิงเวลาสิ้นสุดจริง จึงนับต่อถูกต้องแม้สลับแอป/ออกจากหน้า */
interface RestTimerStore {
  endsAt: number | null;
  totalSec: number;
  sessionId: string | null;
  start(sessionId: string, seconds: number, now: number): void;
  extend(seconds: number): void;
  stop(): void;
}

export const useRestTimer = create<RestTimerStore>((set, get) => ({
  endsAt: null,
  totalSec: 0,
  sessionId: null,
  start(sessionId, seconds, now) {
    if (seconds <= 0) return set({ endsAt: null, totalSec: 0, sessionId: null });
    set({ endsAt: now + seconds * 1000, totalSec: seconds, sessionId });
  },
  extend(seconds) {
    const { endsAt, totalSec } = get();
    if (endsAt !== null) set({ endsAt: endsAt + seconds * 1000, totalSec: totalSec + seconds });
  },
  stop() {
    set({ endsAt: null, totalSec: 0, sessionId: null });
  },
}));
