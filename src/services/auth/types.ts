export type AuthProvider = 'google' | 'apple';

export interface AuthUser {
  /** id ผู้ใช้ (Supabase auth.uid) ใช้เป็น RevenueCat app user id ด้วย (SPEC J3) */
  id: string;
  email: string | null;
  provider: AuthProvider;
  /** Apple "ซ่อนอีเมลของฉัน" (private relay) — รองรับตาม SPEC B12 */
  isPrivateRelay: boolean;
}

export class AuthCancelledError extends Error {
  constructor() {
    super('Sign-in cancelled');
    this.name = 'AuthCancelledError';
  }
}

export class AuthUnavailableError extends Error {
  constructor(message = 'Sign-in provider unavailable') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

/** ล็อกอินด้วย Google / Apple เท่านั้น (SPEC B10) และจำเซสชันไว้ ไม่ต้องล็อกอินซ้ำ */
export interface AuthService {
  /** โหลดเซสชันที่จำไว้ (ทำงานได้แม้ออฟไลน์) */
  init(): Promise<AuthUser | null>;
  isAppleAvailable(): Promise<boolean>;
  signIn(provider: AuthProvider): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** ลบบัญชีและข้อมูลบนเซิร์ฟเวอร์ (เพิกถอนโทเค็น Apple ด้วย) SPEC B12 */
  deleteAccount(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  onChange(listener: (user: AuthUser | null) => void): () => void;
}

export function isPrivateRelayEmail(email: string | null | undefined): boolean {
  return !!email && /@privaterelay\.appleid\.com$/i.test(email);
}
