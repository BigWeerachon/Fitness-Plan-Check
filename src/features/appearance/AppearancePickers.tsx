import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  BigRow,
  Button,
  CardGroup,
  Chip,
  Icon,
  SegmentedControl,
  Sheet,
  TextField,
  Toggle,
  WeekdayDots,
} from '../../components';
import { LANGUAGES, type Language } from '../../i18n';
import { useSettings } from '../../stores/settings';
import { hslToHex, isHexColor, normalizeHex } from '../../theme/color';
import {
  ACCENT_PRESETS,
  buildPalette,
  resolveAccentBase,
  type AccentSetting,
  type ThemePreference,
} from '../../theme/tokens';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

/** ตัวเลือกภาษา (ไทย/English) เปลี่ยนแล้วทั้งแอปเปลี่ยนทันที */
export function LanguagePicker() {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('appearance.language')}>
      {LANGUAGES.map((lng: Language) => (
        <Chip
          key={lng}
          label={t(`appearance.languages.${lng}`)}
          selected={language === lng}
          onPress={() => useSettings.getState().set('language', lng)}
          testID={`lang-${lng}`}
        />
      ))}
    </View>
  );
}

const THEMES: ThemePreference[] = ['dark', 'light', 'system'];

export function ThemePicker() {
  const { t } = useTranslation();
  const theme = useSettings((s) => s.theme);
  return (
    <SegmentedControl
      label={t('appearance.theme')}
      value={theme}
      onChange={(v) => useSettings.getState().set('theme', v)}
      options={THEMES.map((v) => ({ value: v, label: t(`appearance.themes.${v}`) }))}
    />
  );
}

/** สีตัวอย่างสำหรับตารางเลือกสีเอง: 12 โทน × 3 ระดับความสว่าง */
const HUES = Array.from({ length: 12 }, (_, i) => i * 30);
const LIGHTNESS = [0.82, 0.72, 0.6];
export const CUSTOM_SWATCHES = LIGHTNESS.flatMap((l) => HUES.map((h) => hslToHex({ h, s: 0.65, l })));

/** พาเลต 8 สี + เลือกเอง พร้อม preview สด (SPEC DS, C ขั้น 1) */
export function AccentPicker() {
  const { t } = useTranslation();
  const p = usePalette();
  const accent = useSettings((s) => s.accent);
  const [open, setOpen] = useState(false);
  const isCustom = !ACCENT_PRESETS.some((a) => a.id === accent);

  const select = (value: AccentSetting) => useSettings.getState().set('accent', value);

  return (
    <View>
      <View
        style={styles.swatches}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('appearance.accent')}
      >
        {ACCENT_PRESETS.map((a) => {
          const selected = accent === a.id;
          const color = buildPalette(p.mode, a.id).accentFill;
          return (
            <Pressable
              key={a.id}
              onPress={() => select(a.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`appearance.accents.${a.id}`)}
              testID={`accent-${a.id}`}
              style={[styles.swatchTouch, selected && { borderColor: p.text }]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="radio"
          accessibilityState={{ selected: isCustom }}
          accessibilityLabel={t('appearance.accents.custom')}
          testID="accent-custom"
          style={[styles.swatchTouch, isCustom && { borderColor: p.text }]}
        >
          <View
            style={[
              styles.swatch,
              styles.customSwatch,
              { borderColor: p.textSecondary, backgroundColor: isCustom ? p.accentFill : 'transparent' },
            ]}
          >
            <Icon name="color-palette-outline" size={20} color={isCustom ? p.onAccent : p.text} />
          </View>
        </Pressable>
      </View>
      <CustomColorSheet
        visible={open}
        initial={resolveAccentBase(accent)}
        onClose={() => setOpen(false)}
        onApply={(hex) => {
          select(hex as AccentSetting);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CustomColorSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onApply: (hex: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('appearance.customTitle')}
      testID="custom-color-sheet"
    >
      {visible ? <CustomColorBody initial={initial} onApply={onApply} /> : null}
    </Sheet>
  );
}

function CustomColorBody({ initial, onApply }: { initial: string; onApply: (hex: string) => void }) {
  const { t } = useTranslation();
  const p = usePalette();
  const [hex, setHex] = useState(initial);
  const valid = isHexColor(hex);
  const preview = valid ? buildPalette(p.mode, normalizeHex(hex)) : null;
  const adjusted = !!preview && preview.accent.toUpperCase() !== normalizeHex(hex);
  return (
    <>
      <View style={styles.grid}>
        {CUSTOM_SWATCHES.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setHex(c)}
            accessibilityRole="button"
            accessibilityLabel={t('appearance.hue', { index: i + 1 })}
            style={[
              styles.gridCell,
              { backgroundColor: c },
              valid && normalizeHex(hex) === c && { borderColor: p.text },
            ]}
          />
        ))}
      </View>
      <TextField
        label={t('appearance.customHex')}
        value={hex}
        onChangeText={setHex}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={t('appearance.customHexPlaceholder')}
        error={valid ? null : t('appearance.customInvalid')}
        testID="custom-hex"
      />
      {preview ? (
        <View style={[styles.previewBox, { backgroundColor: p.background }]}>
          <AppText variant="headline" color={preview.accent} align="center">
            {t('appearance.previewTitle')}
          </AppText>
          {adjusted ? (
            <AppText variant="caption" secondary align="center">
              {t('appearance.customAdjusted')}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <Button
        title={t('appearance.apply')}
        onPress={() => valid && onApply(normalizeHex(hex))}
        disabled={!valid}
      />
    </>
  );
}

/** ตัวอย่างหน้าจอแบบสด ใช้ในขั้นตั้งค่าเริ่มต้น (แสดงภาษาภาพจริง: หัวข้อสีหลัก + แถวการ์ด + จุดวัน + สวิตช์) */
export function AppearancePreview() {
  const { t } = useTranslation();
  const [on, setOn] = useState(true);
  return (
    <View accessibilityLabel={t('appearance.preview')}>
      <AppText variant="headline" accent align="center">
        {t('appearance.previewTitle')}
      </AppText>
      <AppText variant="caption" secondary align="center" style={styles.previewSub}>
        {t('appearance.previewSub')}
      </AppText>
      <CardGroup>
        <BigRow
          title={t('appearance.previewRow')}
          below={<WeekdayDots active={[1, 4]} />}
          right={<Toggle value={on} onValueChange={setOn} label={t('appearance.previewRow')} />}
        />
      </CardGroup>
    </View>
  );
}

const SWATCH = 36;

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  swatchTouch: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
  customSwatch: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  gridCell: {
    width: 40,
    height: 40,
    borderRadius: radius.button / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  previewBox: { borderRadius: radius.button, padding: spacing.lg, gap: spacing.xs },
  previewSub: { marginBottom: spacing.md },
});
