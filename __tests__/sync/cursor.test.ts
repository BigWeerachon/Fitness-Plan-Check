import { describe, expect, it } from '@jest/globals';
import {
  PULL_OVERLAP_MS,
  afterCursorFilter,
  decodeCursor,
  encodeCursor,
  rewindCursor,
} from '@/services/sync/cursor';

const TS = '2026-10-09T09:00:00.123456+00:00';

describe('pull cursor', () => {
  it('round-trips (timestamp, id)', () => {
    const c = { ts: TS, id: 'abc' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('reads legacy timestamp-only cursors', () => {
    expect(decodeCursor(TS)).toEqual({ ts: TS, id: '' });
  });

  it('rewinds by the overlap window and drops the id tie-breaker', () => {
    const rewound = rewindCursor(encodeCursor({ ts: TS, id: 'abc' }))!;
    const c = decodeCursor(rewound)!;
    expect(c.id).toBe('');
    expect(Date.parse(TS) - Date.parse(c.ts)).toBe(PULL_OVERLAP_MS);
    expect(rewindCursor(null)).toBeNull();
    expect(rewindCursor('not-a-date|x')).toBe('not-a-date|x');
  });

  it('builds a PostgREST filter that never skips rows sharing a timestamp', () => {
    expect(afterCursorFilter({ ts: TS, id: 'abc' })).toBe(
      `server_updated_at.gt."${TS}",and(server_updated_at.eq."${TS}",id.gt."abc")`,
    );
    expect(afterCursorFilter({ ts: TS, id: '' })).toBe(`server_updated_at.gte."${TS}"`);
  });
});
