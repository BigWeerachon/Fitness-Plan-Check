import { settingsRepo } from '../../db/repos/settingsRepo';
import { AuthCancelledError, type AuthProvider, type AuthService, type AuthUser } from './types';

const KEY = 'mock.authUser';

/**
 * Mock สำหรับ dev/test: ล็อกอินสำเร็จทันทีด้วยบัญชีจำลองตามผู้ให้บริการ และจำเซสชันไว้ในเครื่อง
 * ตั้ง nextSignInCancels = true เพื่อจำลองผู้ใช้กดยกเลิก
 */
export class MockAuthService implements AuthService {
  private user: AuthUser | null = null;
  private listeners = new Set<(u: AuthUser | null) => void>();
  nextSignInCancels = false;
  deletedUsers: string[] = [];

  async init(): Promise<AuthUser | null> {
    this.user = settingsRepo.get<AuthUser>(KEY) ?? null;
    return this.user;
  }

  async isAppleAvailable(): Promise<boolean> {
    return true;
  }

  async signIn(provider: AuthProvider): Promise<AuthUser> {
    if (this.nextSignInCancels) {
      this.nextSignInCancels = false;
      throw new AuthCancelledError();
    }
    const user: AuthUser = {
      id: `00000000-0000-4000-8000-00000000000${provider === 'google' ? '1' : '2'}`,
      email: provider === 'google' ? 'tester@example.com' : 'abc123@privaterelay.appleid.com',
      provider,
      isPrivateRelay: provider === 'apple',
    };
    this.setUser(user);
    return user;
  }

  async signOut(): Promise<void> {
    this.setUser(null);
  }

  async deleteAccount(): Promise<void> {
    if (this.user) this.deletedUsers.push(this.user.id);
    this.setUser(null);
  }

  async getAccessToken(): Promise<string | null> {
    return this.user ? `mock-token-${this.user.id}` : null;
  }

  onChange(listener: (u: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ───── ตัวช่วยเทสต์: จำลองเหตุการณ์จากเซิร์ฟเวอร์ ─────
  /** ต่ออายุโทเค็นสำเร็จหลังกลับมาออนไลน์ (ผู้ใช้เดิม) */
  simulateTokenRefreshed() {
    this.listeners.forEach((l) => l(this.user));
  }

  /** เซิร์ฟเวอร์เพิกถอนเซสชัน (เช่น refresh token ถูกยกเลิก) */
  simulateServerSignOut() {
    this.setUser(null);
  }

  private setUser(user: AuthUser | null) {
    this.user = user;
    if (user) settingsRepo.set(KEY, user);
    else settingsRepo.remove(KEY);
    this.listeners.forEach((l) => l(user));
  }
}
