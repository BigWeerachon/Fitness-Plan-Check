import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { useNow } from '@/hooks/useNow';
import { setClockForTests } from '@/utils/clock';

describe('useNow', () => {
  let clockMs = 1_000;
  beforeEach(() => {
    jest.useFakeTimers();
    clockMs = 1_000;
    setClockForTests(() => clockMs);
  });
  afterEach(() => {
    setClockForTests(null);
    jest.useRealTimers();
  });

  it('starts at the current time and refreshes every interval', () => {
    const { result } = renderHook(() => useNow(500));
    expect(result.current).toBe(1_000);
    clockMs = 1_700;
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(1_700);
  });

  it('does not tick while disabled and resumes when enabled', () => {
    const { result, rerender } = renderHook((props: { enabled: boolean }) => useNow(500, props.enabled), {
      initialProps: { enabled: false },
    });
    clockMs = 5_000;
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(1_000);
    rerender({ enabled: true });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(5_000);
  });

  it('stops the timer on unmount', () => {
    const { unmount } = renderHook(() => useNow(500));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
