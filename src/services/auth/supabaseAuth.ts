import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { env } from '../config';
import { getSupabase } from '../supabase';
import {
  AuthCancelledError,
  AuthUnavailableError,
  isPrivateRelayEmail,
  type AuthProvider,
  type AuthService,
  type AuthUser,
} from './types';

function toUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const provider = (session.user.app_metadata?.provider as AuthProvider | undefined) ?? 'google';
  const email = session.user.email ?? null;
  return { id: session.user.id, email, provider, isPrivateRelay: isPrivateRelayEmail(email) };
}

async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/**
 * ล็อกอินด้วย Google / Apple แล้วแลกเป็นเซสชัน Supabase (signInWithIdToken)
 * - iOS: Sign in with Apple แบบ native (expo-apple-authentication) พร้อม nonce
 * - Android: Apple ผ่าน OAuth ของ Supabase บนเบราว์เซอร์ระบบ (Apple ไม่มี SDK บน Android)
 * เซสชันถูกจำไว้ใน SecureStore จึงไม่ต้องล็อกอินซ้ำ (SPEC B10)
 */
export class SupabaseAuthService implements AuthService {
  private googleConfigured = false;

  private configureGoogle() {
    if (this.googleConfigured) return;
    GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId || undefined,
    });
    this.googleConfigured = true;
  }

  async init(): Promise<AuthUser | null> {
    const { data } = await getSupabase().auth.getSession();
    return toUser(data.session);
  }

  async isAppleAvailable(): Promise<boolean> {
    if (Platform.OS === 'ios') return AppleAuthentication.isAvailableAsync();
    return true;
  }

  async signIn(provider: AuthProvider): Promise<AuthUser> {
    return provider === 'google' ? this.signInWithGoogle() : this.signInWithApple();
  }

  private async signInWithGoogle(): Promise<AuthUser> {
    this.configureGoogle();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (res.type === 'cancelled') throw new AuthCancelledError();
      const idToken = res.data.idToken;
      if (!idToken) throw new AuthUnavailableError('Google did not return an ID token');
      const { data, error } = await getSupabase().auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      return toUser(data.session)!;
    } catch (e) {
      if (
        isErrorWithCode(e) &&
        (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)
      ) {
        throw new AuthCancelledError();
      }
      throw e;
    }
  }

  private async signInWithApple(): Promise<AuthUser> {
    if (Platform.OS !== 'ios') return this.signInWithAppleWeb();
    const rawNonce = Crypto.randomUUID();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: await sha256(rawNonce),
      });
      if (!credential.identityToken) throw new AuthUnavailableError('Apple did not return an identity token');
      const { data, error } = await getSupabase().auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
      return toUser(data.session)!;
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
      throw e;
    }
  }

  private async signInWithAppleWeb(): Promise<AuthUser> {
    const redirectTo = Linking.createURL('auth-callback');
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw error ?? new AuthUnavailableError();
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') throw new AuthCancelledError();
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new AuthUnavailableError('Missing auth code');
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) throw exchanged.error;
    return toUser(exchanged.data.session)!;
  }

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
    if (this.googleConfigured) await GoogleSignin.signOut().catch(() => null);
  }

  /**
   * ลบบัญชี: ถ้าล็อกอินด้วย Apple บน iOS ขอ authorization code ใหม่ เพื่อให้เซิร์ฟเวอร์เพิกถอนโทเค็นกับ Apple (SPEC B12)
   * จากนั้น Edge Function `delete-account` ลบข้อมูลทั้งหมดและผู้ใช้ใน Supabase
   */
  async deleteAccount(): Promise<void> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const user = toUser(data.session);
    if (!user) return;
    let appleAuthorizationCode: string | null = null;
    if (user.provider === 'apple' && Platform.OS === 'ios') {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      appleAuthorizationCode = credential.authorizationCode;
    }
    const { error } = await supabase.functions.invoke('delete-account', { body: { appleAuthorizationCode } });
    if (error) throw error;
    await supabase.auth.signOut();
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }

  onChange(listener: (user: AuthUser | null) => void): () => void {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => listener(toUser(session)));
    return () => data.subscription.unsubscribe();
  }
}
