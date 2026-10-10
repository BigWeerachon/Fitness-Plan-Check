import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, ProgressBar } from '../../components';
import { restRemainingSec } from '../../domain/sessionSummary';
import { useRestTimer } from '../../stores/restTimer';
import { now } from '../../utils/clock';
import { radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** แถบตัวจับเวลาพักลอยด้านล่าง (SPEC G1) — นับจากเวลาสิ้นสุดจริง สั่นเมื่อครบ */
export function RestTimerBar() {
  const { t } = useTranslation();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const endsAt = useRestTimer((s) => s.endsAt);
  const total = useRestTimer((s) => s.totalSec);
  const [nowMs, setNowMs] = useState(now);
  const notified = useRef<number | null>(null);

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNowMs(now()), 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = restRemainingSec(endsAt, nowMs);
  useEffect(() => {
    if (endsAt !== null && remaining === 0 && notified.current !== endsAt) {
      notified.current = endsAt;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [endsAt, remaining]);

  if (endsAt === null) return null;
  const finished = remaining === 0;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
      <View
        style={[styles.bar, { backgroundColor: p.elevated, borderColor: p.separator }]}
        accessibilityLiveRegion="polite"
        testID="rest-timer"
      >
        <View style={styles.text}>
          <AppText variant="headline" accent>
            {finished ? t('session.restDone') : t('session.restRemaining', { time: mmss(remaining) })}
          </AppText>
          <ProgressBar value={total > 0 ? 1 - remaining / total : 1} label={t('session.rest')} />
        </View>
        {!finished ? (
          <Button
            title={t('session.restPlus')}
            kind="plain"
            onPress={() => useRestTimer.getState().extend(15)}
          />
        ) : null}
        <Button
          title={finished ? t('common.ok') : t('session.restSkip')}
          kind="secondary"
          onPress={() => useRestTimer.getState().stop()}
          testID="rest-skip"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  text: { flex: 1, gap: spacing.xs },
});
