import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PillTabBar } from '../../../components/PillTabBar';
import { usePalette } from '../../../theme/useTheme';

/** 4 แท็บ: วันนี้ / โปรแกรม / สถิติ / ตั้งค่า บนแถบแคปซูลลอย (SPEC DS) */
export default function TabsLayout() {
  const { t } = useTranslation();
  const p = usePalette();
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: p.background },
        animation: 'shift',
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="programs" options={{ title: t('tabs.programs') }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
