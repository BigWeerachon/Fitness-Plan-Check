import { describe, expect, it } from '@jest/globals';
import { applyKey, type NumberEntryOptions } from '@/domain/numberEntry';

const decimal: NumberEntryOptions = { allowDecimal: true, max: 9999 };

describe('applyKey', () => {
  it('appends digits', () => {
    expect(applyKey('', '1', decimal)).toBe('1');
    expect(applyKey('12', '3', decimal)).toBe('123');
  });

  it('replaces a lone zero instead of building leading zeros', () => {
    expect(applyKey('0', '5', decimal)).toBe('5');
    expect(applyKey('0', '0', decimal)).toBe('0');
  });

  it('deletes the last character and tolerates empty input', () => {
    expect(applyKey('12.5', '⌫', decimal)).toBe('12.');
    expect(applyKey('', '⌫', decimal)).toBe('');
  });

  it('starts a decimal with a leading zero when empty', () => {
    expect(applyKey('', '.', decimal)).toBe('0.');
    expect(applyKey('7', '.', decimal)).toBe('7.');
  });

  it('ignores a second decimal point', () => {
    expect(applyKey('7.5', '.', decimal)).toBe('7.5');
  });

  it('ignores the decimal point when decimals are not allowed', () => {
    expect(applyKey('7', '.', { allowDecimal: false, max: 9999 })).toBe('7');
    expect(applyKey('', '.', { allowDecimal: false, max: 9999 })).toBe('');
  });

  it('limits to two decimal places', () => {
    expect(applyKey('1.25', '3', decimal)).toBe('1.25');
    expect(applyKey('1.2', '5', decimal)).toBe('1.25');
  });

  it('rejects values above max', () => {
    expect(applyKey('999', '9', { allowDecimal: true, max: 1000 })).toBe('999');
    expect(applyKey('100', '0', { allowDecimal: true, max: 1000 })).toBe('1000');
    expect(applyKey('1000', '0', { allowDecimal: true, max: 1000 })).toBe('1000');
  });
});
