import type { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_PRESS = 'tabPress' as const;

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'today', off: 'today-outline' },
  programs: { on: 'barbell', off: 'barbell-outline' },
  stats: { on: 'stats-chart', off: 'stats-chart-outline' },
  settings: { on: 'settings', off: 'settings-outline' },
};

/** ระยะที่เนื้อหาต้องเว้นด้านล่าง ไม่ให้แถบลอยบัง */
export const TAB_BAR_SPACE = 112;

/**
 * แถบเมนูล่างแบบแคปซูลลอย มุมโค้งเต็ม พื้นเทาเข้มโปร่งแสง 4 ไอคอนเส้นบาง (SPEC DS)
 * แท็บที่เลือกมีพื้นวงรีสีหลักเข้มโปร่งแสงและไอคอนสีหลักอ่อน
 */
export function PillTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const p = usePalette();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View
        style={[styles.pill, { backgroundColor: p.tabBar, borderColor: p.separator }]}
        accessibilityRole="tablist"
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const icon = ICONS[route.name] ?? ICONS.index;
          const onPress = () => {
            const event = navigation.emit({ type: TAB_PRESS, target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync().catch(() => undefined);
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              testID={`tab-${route.name}`}
              style={[styles.tab, focused && { backgroundColor: p.accentSoft }]}
            >
              <Icon
                name={focused ? icon.on : icon.off}
                size={24}
                color={focused ? p.accent : p.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 6,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  tab: { width: 72, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
