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

/** ระยะขอบซ้าย-ขวารวมที่เว้นไว้ให้ป้ายแกน y (px) */
const CHART_SIDE_PADDING = 48;
const MAX_TREND_LABELS = 5;
const MAX_BAR_LABELS = 7;
/** เว้นช่องว่างบนของแกน y เป็นสัดส่วนของช่วงค่า */
const Y_AXIS_PADDING_RATIO = 0.2;

/** ความกว้างจริงของพื้นที่กราฟ (กราฟ svg ต้องรู้ความกว้างเป็นตัวเลข); measured = วัดได้แล้ว */
function useChartWidth(): {
  measured: boolean;
  chartWidth: number;
  onLayout: (e: LayoutChangeEvent) => void;
} {
  const [width, setWidth] = useState(0);
  return {
    measured: width > 0,
    chartWidth: Math.max(0, width - CHART_SIDE_PADDING),
    onLayout: (e) => setWidth(Math.round(e.nativeEvent.layout.width)),
  };
}

/** แสดงป้ายแกน x เฉพาะบางจุดให้ไม่ทับกัน (ไม่เกิน maxLabels ป้าย) จุดอื่นเป็นข้อความว่าง */
function labelOrBlank(label: string, index: number, count: number, maxLabels: number): string {
  const showEvery = Math.max(1, Math.ceil(count / maxLabels));
  return index % showEvery === 0 ? label : '';
}

/** สีและฟอนต์ของแกน/เส้นกริดที่กราฟทุกแบบใช้ร่วมกัน */
function useAxisProps() {
  const p = usePalette();
  return {
    rulesColor: p.separator,
    xAxisColor: p.separator,
    yAxisColor: 'transparent',
    yAxisTextStyle: [styles.axis, { color: p.textSecondary }],
    xAxisLabelTextStyle: [styles.axis, { color: p.textSecondary }],
  };
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
  const axisProps = useAxisProps();
  const { measured, chartWidth, onLayout } = useChartWidth();
  const values = points.map((x) => x.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // เริ่มแกน y ใกล้ค่าต่ำสุด เพื่อให้เห็นการเปลี่ยนแปลงเล็กๆ ของน้ำหนัก
  const pad = Math.max(1, (max - min) * Y_AXIS_PADDING_RATIO);
  const offset = Math.max(0, Math.floor(min - pad));
  const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {measured ? (
        <LineChart
          data={points.map((x, i) => ({
            value: x.value - offset,
            label: labelOrBlank(x.label, i, points.length, MAX_TREND_LABELS),
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
          {...axisProps}
          yAxisOffset={0}
          noOfSections={4}
          maxValue={Math.ceil(max + pad - offset)}
          formatYLabel={(l) => formatNumber(Number(l) + offset)}
          disableScroll
        />
      ) : null}
    </View>
  );
}

/** กราฟแท่งแคลอรี่ตามช่วง (I3) */
export function KcalBars({ points, a11yLabel }: { points: TrendPoint[]; a11yLabel: string }) {
  const p = usePalette();
  const axisProps = useAxisProps();
  const { measured, chartWidth, onLayout } = useChartWidth();
  const n = Math.max(1, points.length);
  const barWidth = Math.max(4, Math.min(28, (chartWidth / n) * 0.6));
  const gap = Math.max(2, chartWidth / n - barWidth);
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {measured ? (
        <BarChart
          data={points.map((x, i) => ({
            value: x.value,
            label: labelOrBlank(x.label, i, points.length, MAX_BAR_LABELS),
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
          {...axisProps}
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
