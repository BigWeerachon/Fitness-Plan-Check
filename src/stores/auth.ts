import { create } from 'zustand';
import type { AuthUser } from '../services/auth/types';

export type AuthStatus = 'unknown' | 'signedOut' | 'signedIn';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  setUser(user: AuthUser | null): void;
}

/** สถานะล็อกอินปัจจุบัน (การกระทำอยู่ใน src/features/access/accountFlow.ts) */
export const useAuth = create<AuthStore>((set) => ({
  status: 'unknown',
  user: null,
  setUser(user) {
    set({ user, status: user ? 'signedIn' : 'signedOut' });
  },
}));
