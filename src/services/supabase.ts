import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from './config';
import { chunkedSecureStorage } from './secureStorage';

let client: SupabaseClient | null = null;

/** Supabase client ตัวเดียวของแอป (โหลดเฉพาะเมื่อไม่ใช้ mock) */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!env.supabaseUrl || !env.supabaseAnonKey) throw new Error('Supabase is not configured');
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: chunkedSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
    // ต่ออายุโทเค็นเฉพาะตอนแอปอยู่หน้าจอ (แนวทางของ Supabase สำหรับ React Native)
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
