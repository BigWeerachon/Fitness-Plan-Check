import { describe, expect, it } from '@jest/globals';
import {
  BUILT_IN_EXERCISES,
  EQUIPMENT,
  MUSCLE_GROUPS,
  mergeExercises,
  normalizeSearch,
  searchExercises,
} from '@/data/exerciseLibrary';

describe('exercise library (SPEC F7–F9)', () => {
  it('has 120–150 exercises with unique slug ids', () => {
    expect(BUILT_IN_EXERCISES.length).toBeGreaterThanOrEqual(120);
    expect(BUILT_IN_EXERCISES.length).toBeLessThanOrEqual(150);
    const ids = BUILT_IN_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
  });

  it('every exercise has exactly one valid primary muscle and valid secondaries', () => {
    for (const e of BUILT_IN_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(e.primary);
      expect(e.secondary).not.toContain(e.primary);
      for (const m of e.secondary) expect(MUSCLE_GROUPS).toContain(m);
      expect(EQUIPMENT).toContain(e.equipment);
    }
  });

  it('has Thai and English names and self-written descriptions for every exercise', () => {
    for (const e of BUILT_IN_EXERCISES) {
      expect(e.name.en.trim().length).toBeGreaterThan(2);
      expect(e.name.th.trim().length).toBeGreaterThan(2);
      expect(e.description.en.trim().length).toBeGreaterThan(10);
      expect(e.description.th.trim().length).toBeGreaterThan(10);
      // ไม่มีสื่อภายนอก (F9)
      expect(JSON.stringify(e)).not.toMatch(/https?:|\.gif|\.mp4|\.png|\.jpg/i);
    }
  });

  it('covers all 11 standard muscle groups with at least 4 exercises each', () => {
    for (const m of MUSCLE_GROUPS) {
      expect([m, BUILT_IN_EXERCISES.filter((e) => e.primary === m).length >= 4]).toEqual([m, true]);
    }
  });

  it('includes a complete bodyweight set', () => {
    const bw = BUILT_IN_EXERCISES.filter((e) => e.equipment === 'bodyweight').map((e) => e.id);
    expect(bw.length).toBeGreaterThanOrEqual(15);
    for (const id of [
      'push_up',
      'pull_up',
      'chin_up',
      'chest_dip',
      'triceps_dip',
      'bodyweight_squat',
      'lunge',
      'plank',
      'glute_bridge',
      'inverted_row',
    ]) {
      expect(bw).toContain(id);
    }
  });

  it('searches in both languages, case- and tone-mark-insensitively', () => {
    const all = mergeExercises([]);
    expect(
      searchExercises(all, 'BENCH', {}, 'en')
        .slice(0, 6)
        .map((e) => e.id),
    ).toContain('barbell_bench_press');
    expect(searchExercises(all, 'สควอต', {}, 'th').map((e) => e.id)).toContain('back_squat');
    // พิมพ์ไม่มีวรรณยุกต์ก็เจอ
    expect(normalizeSearch('วิดพื้น')).toBe('วิดพืน');
    expect(searchExercises(all, 'วิดพืน', {}, 'th').map((e) => e.id)).toContain('push_up');
    expect(searchExercises(all, 'push-up', {}, 'en').map((e) => e.id)).toContain('push_up');
  });

  it('filters by muscle (optionally secondary) and equipment, and merges custom exercises first', () => {
    const all = mergeExercises([
      {
        id: 'c1',
        name: 'Sled push',
        primaryMuscle: 'quads',
        secondaryMuscles: ['glutes'],
        equipment: 'other',
        notes: null,
      },
    ]);
    expect(all[0]).toMatchObject({ id: 'c1', isCustom: true });
    const quadsOnly = searchExercises(all, '', { muscle: 'quads' }, 'en');
    expect(quadsOnly.every((e) => e.primary === 'quads')).toBe(true);
    const withSecondary = searchExercises(all, '', { muscle: 'glutes', includeSecondary: true }, 'en');
    expect(withSecondary.some((e) => e.primary !== 'glutes')).toBe(true);
    const cable = searchExercises(all, '', { equipment: 'cable' }, 'en');
    expect(cable.length).toBeGreaterThan(5);
    expect(cable.every((e) => e.equipment === 'cable')).toBe(true);
  });
});
