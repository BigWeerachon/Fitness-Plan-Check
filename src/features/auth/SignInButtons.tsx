import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText, Icon } from '../../components';
import { BRAND, radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

const BUTTON_HEIGHT = 52;

type SignInButtonProps = { label: string; onPress: () => void; busy?: boolean };

type ProviderColors = { background: string; text: string; border?: string };

/** โลโก้ "G" สี่สีตามแนวทางแบรนด์ Google */
function GoogleLogo() {
  const c = BRAND.google.logo;
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill={c.red}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill={c.blue}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill={c.yellow}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill={c.green}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** ปุ่มแบบวาดเอง (ไอคอนผู้ให้บริการ + ข้อความ) — Google ทุกแพลตฟอร์ม และ Apple บน Android */
function ProviderButton({
  label,
  onPress,
  busy,
  colors,
  icon,
  testID,
}: SignInButtonProps & { colors: ProviderColors; icon: React.ReactNode; testID: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
        colors.border ? { borderColor: colors.border, borderWidth: 1 } : null,
      ]}
    >
      {busy ? <ActivityIndicator color={colors.text} /> : icon}
      <AppText variant="button" color={colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function GoogleButton({ label, onPress, busy }: SignInButtonProps) {
  const p = usePalette();
  // เด่นเท่ากับปุ่ม Apple (Guideline 4.8): พื้นมืดใช้ปุ่ม Google แบบสว่าง พื้นสว่างใช้แบบมืด — ทั้งสองแบบเป็นสไตล์ทางการของ Google
  const buttonTone = p.mode === 'dark' ? 'light' : 'dark';
  const brandColors = BRAND.google[buttonTone];
  return (
    <ProviderButton
      label={label}
      onPress={onPress}
      busy={busy}
      colors={brandColors}
      icon={<GoogleLogo />}
      testID="signin-google"
    />
  );
}

/**
 * ปุ่ม Sign in with Apple — iOS ใช้ปุ่มทางการของระบบ (AppleAuthenticationButton) ตาม Guideline 4.8
 * Android วาดปุ่มตามแนวทางเดียวกัน (ขาวบนพื้นมืด / ดำบนพื้นสว่าง) ขนาดเท่าปุ่ม Google
 */
export function AppleButton({ label, onPress, busy }: SignInButtonProps) {
  const p = usePalette();
  if (Platform.OS === 'ios' && !busy) {
    return (
      <View accessible accessibilityRole="button" accessibilityLabel={label} testID="signin-apple">
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            p.mode === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.pill}
          style={styles.appleNative}
          onPress={onPress}
        />
      </View>
    );
  }
  const brandColors = BRAND.apple[p.mode];
  return (
    <ProviderButton
      label={label}
      onPress={onPress}
      busy={busy}
      colors={brandColors}
      icon={<Icon name="logo-apple" size={20} color={brandColors.text} />}
      testID="signin-apple"
    />
  );
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  appleNative: { height: BUTTON_HEIGHT, width: '100%' },
});
