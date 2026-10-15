import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Platform, type AlertButton } from 'react-native';
import { t } from '@/i18n';
import { confirmDestructive } from '@/utils/confirmDestructive';

const OPTS = { title: 'Delete?', message: 'This cannot be undone.', confirmLabel: 'Delete' };
const originalOS = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  jest.restoreAllMocks();
});

describe('confirmDestructive', () => {
  it('native: cancel + destructive buttons; only the destructive one confirms', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onConfirm = jest.fn();
    confirmDestructive(t, { ...OPTS, onConfirm });
    const [title, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
    expect([title, message]).toEqual([OPTS.title, OPTS.message]);
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      [t('common.cancel'), 'cancel'],
      [OPTS.confirmLabel, 'destructive'],
    ]);
    expect(onConfirm).not.toHaveBeenCalled();
    buttons[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('web preview: uses the browser confirm (react-native-web Alert does nothing)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const confirm = jest.fn(() => true);
    const g = globalThis as unknown as { window: { confirm?: (m: string) => boolean } };
    const previous = g.window.confirm;
    g.window.confirm = confirm;
    try {
      const onConfirm = jest.fn();
      confirmDestructive(t, { ...OPTS, onConfirm });
      expect(confirm).toHaveBeenCalledWith(`${OPTS.title}\n\n${OPTS.message}`);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      confirm.mockReturnValueOnce(false);
      confirmDestructive(t, { ...OPTS, onConfirm });
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(alert).not.toHaveBeenCalled();
    } finally {
      g.window.confirm = previous;
    }
  });
});
