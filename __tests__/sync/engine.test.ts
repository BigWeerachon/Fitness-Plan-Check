import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { resetDbForTests } from '@/db/client';
import { createRow, getRow, listRows, softDeleteRow, updateRow } from '@/db/mutations';
import { setOwner } from '@/db/owner';
import {
  BACKOFF_MS,
  claimLocalRows,
  configureSync,
  pendingCount,
  resetSyncForTests,
  syncNow,
  wipeLocalData,
} from '@/features/sync/engine';
import { fromRemote, toRemote } from '@/features/sync/mapping';
import { SyncNetworkError } from '@/services/sync/types';
import { useSync } from '@/stores/sync';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';

const USER = '11111111-1111-4111-8111-111111111111';

describe('sync engine (SPEC L, J6, B11)', () => {
  let s: TestServices;
  let canSync = true;
  let t = Date.parse('2026-10-09T08:00:00Z');

  beforeEach(() => {
    s = freshEnv();
    canSync = true;
    t = Date.parse('2026-10-09T08:00:00Z');
    setClockForTests(() => t);
    setOwner(USER);
    configureSync({ userId: () => USER, canSync: () => canSync });
  });

  afterEach(() => {
    resetSyncForTests();
    setClockForTests(null);
  });

  /** จำลองเครื่องใหม่: ฐานข้อมูลในเครื่องว่าง แต่คลาวด์เดิม */
  function newDevice() {
    resetSyncForTests();
    resetDbForTests();
    setOwner(USER);
    configureSync({ userId: () => USER, canSync: () => canSync });
  }

  it('maps local rows to remote rows and back without loss', () => {
    const row = createRow('week_plan', { programId: 'p1', routineId: 'r1', days: [1, 3, 5], enabled: true });
    const remote = toRemote('week_plan', row as unknown as Record<string, unknown>, USER);
    expect(remote).toMatchObject({
      id: row.id,
      user_id: USER,
      program_id: 'p1',
      days: [1, 3, 5],
      enabled: true,
    });
    expect(remote).not.toHaveProperty('owner_id');
    expect(
      fromRemote('week_plan', { ...remote, enabled: 1 as unknown as boolean, server_updated_at: 5 }),
    ).toEqual(row);
  });

  it('pushes queued rows and clears the outbox only after success', async () => {
    createRow('program', { name: 'PPL' });
    createRow('program', { name: 'Upper/Lower' });
    expect(pendingCount(USER)).toBe(2);
    expect(await syncNow()).toBe('synced');
    expect(pendingCount(USER)).toBe(0);
    expect(
      s.sync
        .rowsOf('program', USER)
        .map((r) => r.name)
        .sort(),
    ).toEqual(['PPL', 'Upper/Lower']);
    expect(useSync.getState()).toMatchObject({ status: 'idle', pending: 0 });
  });

  it('offline: nothing is lost, status shows offline, retry succeeds later', async () => {
    const p = createRow('program', { name: 'Full Body' });
    s.sync.offline = true;
    expect(await syncNow()).toBe('offline');
    expect(useSync.getState().status).toBe('offline');
    expect(useSync.getState().nextRetryAt).toBe(t + BACKOFF_MS[0]);
    expect(pendingCount(USER)).toBe(1);
    expect(getRow('program', p.id)?.name).toBe('Full Body');
    s.sync.offline = false;
    expect(await syncNow()).toBe('synced');
    expect(pendingCount(USER)).toBe(0);
  });

  it('a server error keeps the queue and backs off progressively', async () => {
    createRow('program', { name: 'A' });
    s.sync.failNext = new Error('500');
    expect(await syncNow()).toBe('error');
    s.sync.failNext = new SyncNetworkError();
    expect(await syncNow()).toBe('offline');
    expect(useSync.getState().nextRetryAt).toBe(t + BACKOFF_MS[1]);
    expect(pendingCount(USER)).toBe(1);
  });

  it('when the server refuses (no entitlement / RLS) data stays local and status is waiting', async () => {
    createRow('program', { name: 'A' });
    s.sync.entitledUsers = new Set();
    expect(await syncNow()).toBe('denied');
    expect(useSync.getState().status).toBe('waiting');
    expect(listRows('program')).toHaveLength(1);
    expect(pendingCount(USER)).toBe(1);
  });

  it('does not sync at all without an entitlement (J6)', async () => {
    canSync = false;
    createRow('program', { name: 'A' });
    expect(await syncNow()).toBe('disabled');
    expect(s.sync.pushCount).toBe(0);
    expect(useSync.getState()).toMatchObject({ status: 'disabled', pending: 1 });
  });

  it('a fresh install pulls everything from the cloud (B11)', async () => {
    const p = createRow('program', { name: 'PPL' });
    const r = createRow('routine', { programId: p.id, name: 'Push A', type: 'push' });
    softDeleteRow('routine', r.id);
    await syncNow();
    newDevice();
    expect(listRows('program')).toHaveLength(0);
    expect(await syncNow()).toBe('synced');
    expect(listRows('program').map((x) => x.name)).toEqual(['PPL']);
    // การลบซิงก์ไปด้วย (soft delete)
    expect(listRows('routine')).toHaveLength(0);
    expect(getRow('routine', r.id, { includeDeleted: true })?.deletedAt).not.toBeNull();
  });

  it('last write wins per record across two devices', async () => {
    const p = createRow('program', { name: 'v1' });
    await syncNow();
    // เครื่อง B แก้ทีหลัง (เวลาใหม่กว่า)
    newDevice();
    await syncNow();
    t += 60_000;
    updateRow('program', p.id, { name: 'from B' });
    await syncNow();
    // เครื่อง A (ฐานข้อมูลเดิมหายไปแล้วในเทสต์นี้ → จำลองด้วยการ push ฉบับเก่าตรงๆ)
    await s.sync.push('program', USER, [
      { ...s.sync.rowsOf('program', USER)[0], name: 'stale A', updated_at: t - 120_000 },
    ]);
    expect(s.sync.rowsOf('program', USER)[0].name).toBe('from B');
    newDevice();
    await syncNow();
    expect(getRow('program', p.id)?.name).toBe('from B');
  });

  it('a newer local edit is not overwritten by an older cloud copy', async () => {
    const p = createRow('program', { name: 'cloud' });
    await syncNow();
    t += 1000;
    updateRow('program', p.id, { name: 'local newer' });
    // pull ก่อน push ไม่ได้ทับของใหม่ในเครื่อง
    s.sync.offline = true;
    await syncNow();
    s.sync.offline = false;
    expect(await syncNow()).toBe('synced');
    expect(getRow('program', p.id)?.name).toBe('local newer');
    expect(s.sync.rowsOf('program', USER)[0].name).toBe('local newer');
  });

  it('re-reading an overlap window is harmless and the stored cursor never drifts backwards', async () => {
    // จำลอง backend ที่ย้อนเคอร์เซอร์ 2 ลำดับทุกครั้งที่เริ่มดึง (เหมือน PULL_OVERLAP_MS ของ Supabase)
    const starts: (string | null)[] = [];
    s.sync.startCursor = (stored) => {
      starts.push(stored);
      return stored === null ? null : String(Math.max(0, Number(stored) - 2));
    };
    const a = createRow('program', { name: 'A', templateKey: null, sortOrder: 0 });
    createRow('program', { name: 'B', templateKey: null, sortOrder: 1 });
    expect(await syncNow()).toBe('synced');
    newDevice();
    expect(await syncNow()).toBe('synced');
    expect(
      listRows('program')
        .map((r) => r.name)
        .sort(),
    ).toEqual(['A', 'B']);
    t += 1000;
    updateRow('program', a.id, { name: 'A2' });
    // ซิงก์ซ้ำหลายรอบโดยไม่มีอะไรใหม่ → เคอร์เซอร์ไม่ถอยลงเรื่อยๆ และไม่มีแถวซ้ำ
    expect(await syncNow()).toBe('synced');
    const runs: (string | null)[][] = [];
    for (let i = 0; i < 3; i++) {
      starts.length = 0;
      expect(await syncNow()).toBe('synced');
      runs.push([...starts]);
    }
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
    expect(listRows('program')).toHaveLength(2);
    expect(getRow('program', a.id)?.name).toBe('A2');
    delete s.sync.startCursor;
  });

  it('claims rows created before sign-in and wipes a deleted account locally', () => {
    setOwner(null);
    createRow('program', { name: 'draft' });
    setOwner(USER);
    expect(listRows('program')).toHaveLength(0);
    expect(claimLocalRows(USER)).toBe(1);
    expect(listRows('program')).toHaveLength(1);
    wipeLocalData(USER);
    expect(listRows('program')).toHaveLength(0);
    expect(pendingCount(USER)).toBe(0);
  });
});
