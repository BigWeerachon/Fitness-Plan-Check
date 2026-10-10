import React, { useEffect, useId, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePalette } from '../theme/useTheme';

interface Layer {
  key: string;
  color: string;
  opacity: number;
}

function GlowLayer({ layer, width, height }: { layer: Layer; width: number; height: number }) {
  // id ต้องไม่ซ้ำกันทั้งเอกสาร (บนเว็บทุกหน้าอยู่ใน DOM เดียว ถ้าซ้ำจะไปอ้างไล่สีของหน้าที่ซ่อนอยู่)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = `glow-${uid}-${layer.key.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="22%" rx="62%" ry="48%" fx="50%" fy="22%">
          <Stop offset="0" stopColor={layer.color} stopOpacity={layer.opacity} />
          <Stop offset="0.5" stopColor={layer.color} stopOpacity={layer.opacity * 0.45} />
          <Stop offset="1" stopColor={layer.color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * พื้นหลังดำสนิท + แสงเรืองรัศมีกลมสีหลักที่ส่วนบนของจอ ค่อยๆ จางลงสู่ดำ (SPEC DS, ภาพอ้างอิง)
 * เปลี่ยนสีหลัก/โหมดแล้วแสงใหม่ค่อยๆ ซ้อนทับแสงเดิม (crossfade) แบบสด
 */
export function GlowBackground() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const height = width * 1.25;
  const key = `${p.glow}|${p.mode}`;
  const [current, setCurrent] = useState<Layer>({ key, color: p.glow, opacity: p.glowOpacity });
  const [previous, setPrevious] = useState<Layer | null>(null);
  const [fade] = useState(() => new Animated.Value(1));

  // ปรับ state ตาม props ระหว่าง render (รูปแบบที่ React แนะนำสำหรับ derived state)
  if (current.key !== key) {
    setPrevious(current);
    setCurrent({ key, color: p.glow, opacity: p.glowOpacity });
  }

  useEffect(() => {
    if (!previous) return;
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true });
    anim.start(() => setPrevious(null));
    return () => anim.stop();
  }, [previous, fade]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: p.background }]}
      pointerEvents="none"
      testID="glow-background"
    >
      {previous ? (
        <View style={styles.glow}>
          <GlowLayer layer={previous} width={width} height={height} />
        </View>
      ) : null}
      <Animated.View style={[styles.glow, { opacity: previous ? fade : 1 }]}>
        <GlowLayer layer={current} width={width} height={height} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0 },
});
