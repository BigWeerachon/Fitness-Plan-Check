import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { count } from 'drizzle-orm';
import { getDb, getDriver } from '@/db/client';
import { customExerciseRepo } from '@/db/repos/customExerciseRepo';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { routineRepo } from '@/db/repos/programRepo';
import { settingsRepo } from '@/db/repos/settingsRepo';
import { dayOverrideRepo, weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { getOwner } from '@/db/owner';
import { softDeleteRow } from '@/db/mutations';
import { USER_TABLE_NAMES, USER_TABLES } from '@/db/schema';
import { bootstrapEntitlement } from '@/features/access/accountFlow';
import { getAccess } from '@/features/access/useAccess';
import { deleteAllLocalData, USER_SETTING_KEYS } from '@/features/data/deleteAllData';
import { draftRepo } from '@/features/onboarding/draft';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { finishSession } from '@/features/session/finish';
import { startSession } from '@/features/session/sessionFlow';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';

function rowCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of USER_TABLE_NAMES) {
    out[name] = getDb().select({ n: count() }).from(USER_TABLES[name]).get()!.n;
  }
  return out;
}

/** มีข้อมูลครบทุกตารางผู้ใช้ (รวมแถวที่ soft delete แล้ว) + ร่าง + แคชสิทธิ์ + ค่าตั้งค่า */
function populateEverything(): void {
  profileRepo.update({ age: 30, weightKg: 70 });
  const program = instantiateTemplate('ppl3', 'en', { activate: true })!;
  const [push] = routineRepo.listByProgram(program.id);
  weekPlanRepo.ensureEntry(program.id, push.id, [1]);
  dayOverrideRepo.set('2026-10-10', 'rest');
  const custom = customExerciseRepo.create({ name: 'Sled push', primaryMuscle: 'quads' });
  softDeleteRow('custom_exercise', custom.id);
  customExerciseRepo.create({ name: 'Farmer carry', primaryMuscle: 'forearms' });
  const { session } = startSession({ routineId: push.id });
  finishSession(session.id, 'moderate', 3600);
  dailyLogRepo.upsert('2026-10-09', { kcalIntake: 2100, bodyWeightKg: 70 });
  draftRepo.save({ sex: 'male', age: 30 });
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'th');
  useSettings.getState().set('accent', 'mint');
}

describe('deleteAllLocalData (D81 "delete all data on this device")', () => {
  let s: TestServices;
  beforeEach(() => {
    setClockForTests(() => new Date('2026-10-09T09:00:00').getTime());
    s = freshEnv('lifetime');
  });
  afterEach(() => setClockForTests(null));

  it('wipes every user table, the onboarding draft, the entitlement cache and user settings', async () => {
    await bootstrapEntitlement();
    populateEverything();
    const before = rowCounts();
    for (const name of USER_TABLE_NAMES) expect([name, before[name]]).toEqual([name, expect.any(Number)]);
    expect(Object.entries(before).filter(([, n]) => n === 0)).toEqual([]);
    expect(entitlementRepo.get(getOwner())).not.toBeNull();

    s.purchases.offline = true; // ตรวจสิทธิ์ใหม่ไม่ได้ → เห็นผลการลบแคชตรงๆ
    await deleteAllLocalData();

    expect(Object.values(rowCounts()).every((n) => n === 0)).toBe(true);
    expect(draftRepo.get()).toBeNull();
    expect(entitlementRepo.get(getOwner())).toBeNull();
    for (const key of USER_SETTING_KEYS) expect(settingsRepo.get(key)).toBeUndefined();
    expect(useSettings.getState().onboardingDone).toBe(false);
    // ค่าของเครื่อง (ภาษา/สีหลัก) ไม่ใช่ข้อมูลส่วนตัว — เก็บไว้
    expect(useSettings.getState()).toMatchObject({ language: 'th', accent: 'mint' });
    expect(settingsRepo.get('language')).toBe('th');
  });

  it('does not cancel the store subscription: access comes back from the store right away', async () => {
    await bootstrapEntitlement();
    populateEverything();
    await deleteAllLocalData();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    expect(getAccess()).toMatchObject({ allowed: true, state: 'LIFETIME' });
    expect(entitlementRepo.get(getOwner())?.state).toBe('LIFETIME');
  });

  it('changes nothing when the wipe fails part-way (one transaction)', async () => {
    populateEverything();
    const before = rowCounts();
    getDriver().exec(
      "CREATE TRIGGER block_wipe BEFORE DELETE ON daily_log BEGIN SELECT RAISE(ABORT, 'blocked'); END;",
    );
    await expect(deleteAllLocalData()).rejects.toThrow(/blocked/);
    expect(rowCounts()).toEqual(before);
    expect(draftRepo.get()).not.toBeNull();
    expect(settingsRepo.get('onboardingDone')).toBe(true);
  });
});
