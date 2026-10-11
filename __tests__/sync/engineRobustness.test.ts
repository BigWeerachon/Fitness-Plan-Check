import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { resetDbForTests } from '@/db/client';
import { createRow, listRows, updateRow } from '@/db/mutations';
import { setOwner } from '@/db/owner';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import {
  configureSync,
  MAX_ATTEMPTS,
  pendingCount,
  resetSyncForTests,
  syncNow,
} from '@/features/sync/engine';
import type { RemoteRow } from '@/services/sync/types';
import { useSync } from '@/stores/sync';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';

const USER = '11111111-1111-4111-8111-111111111111';

describe('sync engine robustness (SPEC L)', () => {
  let s: TestServices;
  let t = Date.parse('2026-10-09T08:00:00Z');

  beforeEach(() => {
    s = freshEnv();
    t = Date.parse('2026-10-09T08:00:00Z');
    setClockForTests(() => t);
    setOwner(USER);
    configureSync({ userId: () => USER, canSync: () => true });
  });

  afterEach(() => {
    resetSyncForTests();
    setClockForTests(null);
  });

  function newDevice() {
    resetSyncForTests();
    resetDbForTests();
    setOwner(USER);
    configureSync({ userId: () => USER, canSync: () => true });
  }

  it('an edit made while its push is in flight is never dropped, even with the same clock tick', async () => {
    const p = createRow('program', { name: 'v1' });
    const realPush = s.sync.push.bind(s.sync);
    let edited = false;
    s.sync.push = async (table, userId, rows) => {
      if (!edited) {
        edited = true;
        // นาฬิกาไม่ขยับ (ms เดียวกัน) — queuedAt เท่าเดิมแต่ version ต้องเพิ่ม
        updateRow('program', p.id, { name: 'v2' });
      }
      return realPush(table, userId, rows);
    };
    expect(await syncNow()).toBe('synced');
    expect(pendingCount(USER)).toBe(0);
    expect(s.sync.rowsOf('program', USER)[0].name).toBe('v2');
  });

  it('an edit during an in-flight push stays queued if the edit lands after the last read', async () => {
    const p = createRow('program', { name: 'v1' });
    const realPush = s.sync.push.bind(s.sync);
    let edited = false;
    s.sync.push = async (table, userId, rows) => {
      await realPush(table, userId, rows);
      if (edited) return;
      edited = true;
      // แก้หลังเซิร์ฟเวอร์รับแล้วแต่ก่อนล้างคิว — ห้ามถูกล้าง
      t -= 5_000; // นาฬิกาถอย
      updateRow('program', p.id, { name: 'v2' });
    };
    expect(await syncNow()).toBe('synced');
    expect(s.sync.rowsOf('program', USER)[0].name).toBe('v2');
    expect(pendingCount(USER)).toBe(0);
  });

  describe('a rejected row does not hold back the rest', () => {
    function rejectOnly(name: string) {
      const realPush = s.sync.push.bind(s.sync);
      s.sync.push = async (table, userId, rows: RemoteRow[]) => {
        if (rows.some((r) => r.name === name)) throw new Error('constraint violation');
        return realPush(table, userId, rows);
      };
    }

    it('uploads the healthy rows, keeps the bad one pending and reports error', async () => {
      createRow('program', { name: 'ok 1' });
      createRow('program', { name: 'bad' });
      createRow('program', { name: 'ok 2' });
      rejectOnly('bad');
      expect(await syncNow()).toBe('error');
      expect(
        s.sync
          .rowsOf('program', USER)
          .map((r) => r.name)
          .sort(),
      ).toEqual(['ok 1', 'ok 2']);
      expect(pendingCount(USER)).toBe(1);
      expect(useSync.getState()).toMatchObject({ status: 'error', pending: 1 });
      expect(useSync.getState().lastError).toBe('constraint violation');
    });

    it('stops retrying a row that keeps failing but keeps it pending; editing it queues it again', async () => {
      createRow('program', { name: 'ok' });
      const bad = createRow('program', { name: 'bad' });
      rejectOnly('bad');
      for (let i = 0; i < MAX_ATTEMPTS + 2; i++) expect(await syncNow()).toBe('error');
      const before = s.sync.pushCount;
      expect(await syncNow()).toBe('error');
      // แถวเสียถูกข้าม ไม่ถูกส่งซ้ำ แต่ยังนับเป็นรอส่งและสถานะยังเป็น error
      expect(s.sync.pushCount).toBe(before);
      expect(pendingCount(USER)).toBe(1);
      expect(useSync.getState().status).toBe('error');
      // ผู้ใช้แก้แถวนั้น → คิวใหม่ และส่งได้เมื่อไม่ผิดแล้ว
      updateRow('program', bad.id, { name: 'fixed' });
      expect(await syncNow()).toBe('synced');
      expect(pendingCount(USER)).toBe(0);
      expect(s.sync.rowsOf('program', USER).map((r) => r.name)).toContain('fixed');
    });

    it('being offline for a long time never marks rows as poisoned', async () => {
      createRow('program', { name: 'A' });
      s.sync.offline = true;
      for (let i = 0; i < MAX_ATTEMPTS + 3; i++) expect(await syncNow()).toBe('offline');
      s.sync.offline = false;
      expect(await syncNow()).toBe('synced');
      expect(pendingCount(USER)).toBe(0);
    });
  });

  describe('logically unique rows created on two devices', () => {
    it('merges two profiles into one, keeping edits made before the first pull', async () => {
      const a = profileRepo.update({ age: 30, goal: 'lose', weightUnit: 'lb' });
      expect(await syncNow()).toBe('synced');
      newDevice();
      t += 60_000;
      // เครื่องใหม่แก้ก่อนดึงครั้งแรก
      profileRepo.update({ heightCm: 180, weightUnit: 'kg' });
      expect(await syncNow()).toBe('synced');
      const live = listRows('profile');
      expect(live).toHaveLength(1);
      expect(live[0].id).toBe(a.id);
      expect(profileRepo.get()).toMatchObject({
        age: 30,
        goal: 'lose',
        heightCm: 180,
        weightUnit: 'kg',
      });
      // อีกเครื่องดึงผลที่รวมแล้วได้ค่าเดียวกัน
      expect(await syncNow()).toBe('synced');
      newDevice();
      expect(await syncNow()).toBe('synced');
      expect(listRows('profile')).toHaveLength(1);
      expect(profileRepo.get()).toMatchObject({ age: 30, goal: 'lose', heightCm: 180 });
    });

    it('profileRepo.get shows the most recently edited profile while duplicates exist', () => {
      const old = createRow('profile', { age: 20 });
      t += 1000;
      const newer = createRow('profile', { age: 21 });
      expect(profileRepo.get()?.id).toBe(newer.id);
      t += 1000;
      updateRow('profile', old.id, { age: 22 });
      expect(profileRepo.get()?.id).toBe(old.id);
    });

    it('dailyLogRepo.get returns the latest-edited row and writes target it', () => {
      const a = createRow('daily_log', { date: '2026-10-09', kcalIntake: 1800 });
      t += 1000;
      const b = createRow('daily_log', { date: '2026-10-09', kcalIntake: 2000 });
      expect(dailyLogRepo.get('2026-10-09')?.id).toBe(b.id);
      t += 1000;
      updateRow('daily_log', a.id, { bodyWeightKg: 70 });
      expect(dailyLogRepo.get('2026-10-09')?.id).toBe(a.id);
      dailyLogRepo.upsert('2026-10-09', { kcalIntake: 2100 });
      expect(listRows('daily_log')).toHaveLength(2);
      expect(dailyLogRepo.get('2026-10-09')).toMatchObject({ id: a.id, kcalIntake: 2100 });
    });

    it('merges two daily logs of the same date into one after sync', async () => {
      createRow('daily_log', { date: '2026-10-09', kcalIntake: 1800 });
      expect(await syncNow()).toBe('synced');
      newDevice();
      t += 60_000;
      createRow('daily_log', { date: '2026-10-09', bodyWeightKg: 70 });
      createRow('daily_log', { date: '2026-10-10', kcalIntake: 1500 });
      expect(await syncNow()).toBe('synced');
      const logs = listRows('daily_log');
      expect(logs).toHaveLength(2);
      expect(dailyLogRepo.get('2026-10-09')).toMatchObject({ kcalIntake: 1800, bodyWeightKg: 70 });
      expect(dailyLogRepo.get('2026-10-10')?.kcalIntake).toBe(1500);
    });
  });
});
