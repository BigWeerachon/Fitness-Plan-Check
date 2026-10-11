import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Stepper } from '@/components/Stepper';

/** ปุ่มที่ซ่อนจากโปรแกรมอ่านหน้าจอต้องค้นด้วย includeHiddenElements */
const byId = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });

describe('Stepper accessibility', () => {
  it('exposes one adjustable element and hides the unlabeled -/+ buttons from screen readers', async () => {
    const onChange = jest.fn();
    render(<Stepper label="Sets" value={3} onChange={onChange} testID="sets" />);
    // ฟอนต์ไอคอนโหลดแบบ async — รอให้เสร็จก่อนตรวจ
    await act(async () => {});
    const row = screen.getByTestId('sets');
    expect(row.props.accessibilityRole).toBe('adjustable');
    expect(row.props.accessibilityLabel).toBe('Sets');
    for (const id of ['sets-dec', 'sets-inc']) {
      const btn = byId(id);
      expect(btn.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(btn.props.accessibilityElementsHidden).toBe(true);
    }
  });

  it('still works by touch and by the adjustable actions', async () => {
    const onChange = jest.fn();
    render(<Stepper label="Sets" value={3} onChange={onChange} testID="sets" />);
    // ฟอนต์ไอคอนโหลดแบบ async — รอให้เสร็จก่อนตรวจ
    await act(async () => {});
    fireEvent.press(byId('sets-inc'));
    fireEvent.press(byId('sets-dec'));
    fireEvent(screen.getByTestId('sets'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([4, 2, 4]);
  });
});
