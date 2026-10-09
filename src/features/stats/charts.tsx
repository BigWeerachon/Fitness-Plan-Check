import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { AppText } from '../../components';
import { formatNumber } from '../../i18n/format';
import { spacing } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { usePalette } from '../../theme/useTheme';

export interface ShareItem {
  key: string;
  label: string;
  value: number;
  /** เปอร์เซ็นต์ที่ปัดแล้ว (ผลรวม = 100) */
  percent: number;
  /** ค่าที่แสดงประกอบ เช่น "12 เซ็ต" */
  valueLabel: string;
  color: string;
}

/** ความกว้างจริงของพื้นที่กราฟ (กราฟ svg ต้องรู้ความกว้างเป็นตัวเลข) */
function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (e) => setWidth(Math.round(e.nativeEvent.layout.width))];
}

/** กราฟโดนัท + ตัวเลขรวมตรงกลาง (I2) — โปรแกรมอ่านหน้าจออ่านสรุปเป็นข้อความแทนรูป */
export function DonutChart({
  items,
  centerValue,
  centerCaption,
  a11yLabel,
}: {
  items: ShareItem[];
  centerValue: string;
  centerCaption: string;
  a11yLabel: string;
}) {
  const p = usePalette();
  return (
    <View
      style={styles.donut}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      testID="stats-donut"
    >
      <PieChart
        data={items.map((i) => ({ value: i.value, color: i.color }))}
        donut
        radius={96}
        innerRadius={66}
        innerCircleColor={p.card}
        strokeWidth={items.length > 1 ? 2 : 0}
        strokeColor={p.card}
        centerLabelComponent={() => (
          <View style={styles.center}>
            <AppText variant="mediumNumber" align="center" numberOfLines={1} adjustsFontSizeToFit>
              {centerValue}
            </AppText>
            <AppText variant="caption" secondary align="center" numberOfLines={2}>
              {centerCaption}
            </AppText>
          </View>
        )}
      />
    </View>
  );
}

/** แท่งแนวนอน + ชื่อ + เปอร์เซ็นต์ + ค่าจริง (I2 "แท่ง + ตัวเลข") */
export function ShareBars({ items }: { items: ShareItem[] }) {
  const p = usePalette();
  return (
    <View style={styles.bars}>
      {items.map((i) => (
        <View
          key={i.key}
          accessible
          accessibilityLabel={`${i.label}, ${i.percent}%, ${i.valueLabel}`}
          testID={`share-${i.key}`}
        >
          <View style={styles.barHead}>
            <View style={[styles.swatch, { backgroundColor: i.color }]} />
            <AppText style={styles.flex} numberOfLines={2}>
              {i.label}
            </AppText>
            <AppText variant="headline" testID={`share-percent-${i.key}`}>{`${i.percent}%`}</AppText>
          </View>
          <View style={[styles.track, { backgroundColor: p.switchOff }]}>
            <View style={[styles.fill, { width: `${i.percent}%`, backgroundColor: i.color }]} />
          </View>
          <AppText variant="caption" secondary>
            {i.valueLabel}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export interface TrendPoint {
  label: string;
  value: number;
}

/** กราฟเส้นแนวโน้ม (น้ำหนักตัว / 1RM) */
export function TrendChart({ points, a11yLabel }: { points: TrendPoint[]; a11yLabel: string }) {
  const p = usePalette();
  const [width, onLayout] = useWidth();
  const values = points.map((x) => x.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // เริ่มแกน y ใกล้ค่าต่ำสุด เพื่อให้เห็นการเปลี่ยนแปลงเล็กๆ ของน้ำหนัก
  const pad = Math.max(1, (max - min) * 0.2);
  const offset = Math.max(0, Math.floor(min - pad));
  const chartWidth = Math.max(0, width - 48);
  const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const showEvery = Math.max(1, Math.ceil(points.length / 5));
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {width > 0 ? (
        <LineChart
          data={points.map((x, i) => ({
            value: x.value - offset,
            label: i % showEvery === 0 ? x.label : '',
          }))}
          width={chartWidth}
          height={160}
          spacing={Math.max(8, step)}
          initialSpacing={8}
          endSpacing={8}
          color={p.accentFill}
          thickness={3}
          curved
          areaChart
          startFillColor={p.accentFill}
          endFillColor={p.card}
          startOpacity={0.35}
          endOpacity={0}
          dataPointsColor={p.accentFill}
          hideRules={false}
          rulesColor={p.separator}
          xAxisColor={p.separator}
          yAxisColor="transparent"
          yAxisOffset={0}
          noOfSections={4}
          maxValue={Math.ceil(max + pad - offset)}
          formatYLabel={(l) => formatNumber(Number(l) + offset)}
          yAxisTextStyle={[styles.axis, { color: p.textSecondary }]}
          xAxisLabelTextStyle={[styles.axis, { color: p.textSecondary }]}
          disableScroll
        />
      ) : null}
    </View>
  );
}

/** กราฟแท่งแคลอรี่ตามช่วง (I3) */
export function KcalBars({ points, a11yLabel }: { points: TrendPoint[]; a11yLabel: string }) {
  const p = usePalette();
  const [width, onLayout] = useWidth();
  const chartWidth = Math.max(0, width - 48);
  const n = Math.max(1, points.length);
  const barWidth = Math.max(4, Math.min(28, (chartWidth / n) * 0.6));
  const gap = Math.max(2, chartWidth / n - barWidth);
  const showEvery = Math.max(1, Math.ceil(points.length / 7));
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {width > 0 ? (
        <BarChart
          data={points.map((x, i) => ({
            value: x.value,
            label: i % showEvery === 0 ? x.label : '',
            frontColor: p.accentFill,
          }))}
          width={chartWidth}
          height={140}
          barWidth={barWidth}
          spacing={gap}
          initialSpacing={4}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          noOfSections={3}
          rulesColor={p.separator}
          xAxisColor={p.separator}
          yAxisColor="transparent"
          yAxisTextStyle={[styles.axis, { color: p.textSecondary }]}
          xAxisLabelTextStyle={[styles.axis, { color: p.textSecondary }]}
          formatYLabel={(l) => formatNumber(Number(l))}
          disableScroll
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  donut: { alignItems: 'center', paddingVertical: spacing.md },
  center: { alignItems: 'center', width: 120 },
  bars: { gap: spacing.md },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  axis: { fontFamily: fonts.regular, fontSize: 11 },
});
