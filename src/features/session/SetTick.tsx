import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../../components';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { MIN_TOUCH } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

const SIZE = MIN_TOUCH;

/** วงกลมติ๊กเซ็ต (SPEC G1/DS): สีหลักเมื่อเสร็จ + haptic + animation เด้ง (ปิดเมื่อผู้ใช้เลือกลดการเคลื่อนไหว) */
export function SetTick({
  done,
  onToggle,
  label,
  testID,
}: {
  done: boolean;
  onToggle: () => void;
  label: string;
  testID?: string;
}) {
  const p = usePalette();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const press = () => {
    void (
      done ? Haptics.selectionAsync() : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => undefined);
    if (!done && !reduceMotion) {
      scale.set(withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 160 })));
    }
    onToggle();
  };

  return (
    <Pressable
      onPress={press}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      hitSlop={4}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            borderColor: done ? p.accentFill : p.textSecondary,
            backgroundColor: done ? p.accentFill : 'transparent',
          },
          style,
        ]}
      >
        {done ? <Icon name="checkmark" size={24} color={p.onAccent} /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
