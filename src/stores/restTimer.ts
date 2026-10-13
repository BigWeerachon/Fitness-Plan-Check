import { create } from 'zustand';

/** ตัวจับเวลาพัก (SPEC G1) อิงเวลาสิ้นสุดจริง จึงนับต่อถูกต้องแม้สลับแอป/ออกจากหน้า */
interface RestTimerStore {
  endsAt: number | null;
  totalSec: number;
  sessionId: string | null;
  start(sessionId: string, seconds: number, startedAtMs: number): void;
  extend(seconds: number): void;
  stop(): void;
}

const IDLE_TIMER = { endsAt: null, totalSec: 0, sessionId: null } as const;

export const useRestTimer = create<RestTimerStore>((set, get) => ({
  ...IDLE_TIMER,
  start(sessionId, seconds, startedAtMs) {
    if (seconds <= 0) {
      set(IDLE_TIMER);
      return;
    }
    set({ endsAt: startedAtMs + seconds * 1000, totalSec: seconds, sessionId });
  },
  extend(seconds) {
    const { endsAt, totalSec } = get();
    if (endsAt !== null) set({ endsAt: endsAt + seconds * 1000, totalSec: totalSec + seconds });
  },
  stop() {
    set(IDLE_TIMER);
  },
}));
