import {
  IBMPlexSansThai_300Light,
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_500Medium,
  IBMPlexSansThai_600SemiBold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-thai';
import * as Network from 'expo-network';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { bootstrapAccount, refreshEntitlement } from '../features/access/accountFlow';
import { registerAppHooks } from '../features/bootstrap';
import '../i18n';
import { useEntitlement } from '../stores/entitlement';
import { useSettings } from '../stores/settings';
import { usePalette } from '../theme/useTheme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** เตรียมข้อมูลแบบ synchronous ก่อน render ครั้งแรก (SQLite ในเครื่องเร็วพอ) */
function bootstrap(): boolean {
  getDb();
  useSettings.getState().load();
  registerAppHooks();
  void bootstrapAccount();
  return true;
}

export default function RootLayout() {
  const [ready] = useState(bootstrap);
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansThai_300Light,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
    IBMPlexSansThai_600SemiBold,
  });
  const p = usePalette();

  useEffect(() => {
    // กลับเข้าแอป → ตรวจสิทธิ์กับ RevenueCat ใหม่ (สิทธิ์อาจหมด/ต่ออายุระหว่างที่ปิดแอป)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshEntitlement();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // ออฟไลน์/ออนไลน์: ใช้แคชสิทธิ์ตอนออฟไลน์ และตรวจใหม่เมื่อกลับมาออนไลน์ (SPEC B9)
    const sub = Network.addNetworkStateListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      const wasOnline = useEntitlement.getState().online;
      useEntitlement.getState().set({ online });
      if (online && !wasOnline) void refreshEntitlement();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(p.background).catch(() => undefined);
  }, [p.background]);

  const fontsReady = fontsLoaded || !!fontError;
  useEffect(() => {
    if (fontsReady && ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady, ready]);

  const navTheme = useMemo(() => {
    const base = p.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: p.background,
        card: p.card,
        text: p.text,
        primary: p.accent,
        border: p.separator,
      },
    };
  }, [p]);

  if (!fontsReady || !ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={p.mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.background } }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="paywall" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account" />
          <Stack.Screen name="legal/[doc]" />
          <Stack.Screen name="references" />
          <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
