import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { BIG_TEXT_MAX_SCALE } from '../theme/typography';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

/**
 * แป้นตัวเลขใหญ่ใช้ระหว่างฝึก (SPEC G1) — ปุ่มใหญ่กดง่ายมือเดียว
 * allowDecimal=false สำหรับจำนวนครั้ง
 */
export interface NumberPadProps {
  visible: boolean;
  title: string;
  initial: number | null;
  allowDecimal?: boolean;
  suffix?: string;
  onSubmit: (value: number | null) => void;
  onClose: () => void;
  max?: number;
}

export function NumberPad(props: NumberPadProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.title} testID="number-pad">
      {/* เนื้อหาถูกสร้างใหม่ทุกครั้งที่เปิด จึงเริ่มจากค่าปัจจุบันเสมอ */}
      {props.visible ? <PadContent {...props} /> : null}
    </Sheet>
  );
}

function PadContent({ initial, allowDecimal = true, suffix, onSubmit, max = 9999 }: NumberPadProps) {
  const p = usePalette();
  const { t } = useTranslation();
  const [text, setText] = useState(initial === null || initial === undefined ? '' : String(initial));

  const press = (key: (typeof KEYS)[number]) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setText((prev) => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.') return !allowDecimal || prev.includes('.') ? prev : (prev || '0') + '.';
      const next = prev === '0' ? key : prev + key;
      const decimals = next.split('.')[1];
      if (decimals && decimals.length > 2) return prev;
      return Number(next) > max ? prev : next;
    });
  };

  const value = text === '' ? null : Number(text);

  return (
    <>
      <View style={styles.display} accessibilityLiveRegion="polite">
        <AppText
          variant="bigNumber"
          accent
          maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE}
          testID="number-pad-value"
        >
          {text === '' ? '–' : text}
        </AppText>
        {suffix ? <AppText secondary>{suffix}</AppText> : null}
      </View>
      <View style={styles.grid}>
        {KEYS.map((k) => {
          const disabled = k === '.' && !allowDecimal;
          return (
            <Pressable
              key={k}
              onPress={() => press(k)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={k === '⌫' ? t('session.keypadDelete') : k}
              testID={`key-${k}`}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? p.cardPressed : p.elevated, opacity: disabled ? 0.3 : 1 },
              ]}
            >
              <AppText variant="mediumNumber" maxFontSizeMultiplier={1.3}>
                {k}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <Button title={t('common.done')} onPress={() => onSubmit(value)} testID="number-pad-done" />
    </>
  );
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  key: {
    width: '31.5%',
    minHeight: MIN_TOUCH + 16,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
