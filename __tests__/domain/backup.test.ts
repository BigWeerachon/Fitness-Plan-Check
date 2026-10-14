import { describe, expect, it } from '@jest/globals';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  backupFilename,
  buildBackup,
  parseBackup,
  serializeBackup,
  summarize,
  type BackupProblem,
  type BackupSpec,
} from '@/domain/backup';

const SPEC: BackupSpec = {
  schemaVersion: 3,
  tables: {
    program: {
      columns: {
        id: { kind: 'text', nullable: false },
        createdAt: { kind: 'number', nullable: false },
        deletedAt: { kind: 'number', nullable: true },
        name: { kind: 'text', nullable: false },
        sortOrder: { kind: 'number', nullable: false, default: 0 },
      },
    },
    week_plan: {
      columns: {
        id: { kind: 'text', nullable: false },
        deletedAt: { kind: 'number', nullable: true },
        days: { kind: 'json', nullable: false, default: [] },
        enabled: { kind: 'boolean', nullable: false, default: true },
        note: { kind: 'text', nullable: true },
      },
    },
    /** ตารางที่เพิ่มใน schema 3 — ไฟล์เก่ากว่าไม่มีได้ */
    daily_log: {
      introducedIn: 3,
      columns: { id: { kind: 'text', nullable: false }, deletedAt: { kind: 'number', nullable: true } },
    },
  },
  settings: { onboardingDone: 'boolean' },
};

const META = { schemaVersion: 3, appVersion: '1.2.0', exportedAt: Date.UTC(2026, 9, 9, 2) };

function validFile(overrides: Record<string, unknown> = {}) {
  return {
    ...buildBackup(
      {
        program: [{ id: 'p1', createdAt: 1, deletedAt: null, name: 'PPL', sortOrder: 0 }],
        week_plan: [{ id: 'w1', deletedAt: null, days: [1, 3], enabled: false, note: null }],
        daily_log: [{ id: 'd1', deletedAt: null }],
      },
      { ...META, settings: { onboardingDone: true } },
    ),
    ...overrides,
  };
}

const text = (v: unknown) => JSON.stringify(v);

describe('buildBackup / serializeBackup', () => {
  it('stamps the app id, format version and meta, and round-trips through parseBackup', () => {
    const b = validFile();
    expect(b).toMatchObject({
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      ...META,
      settings: { onboardingDone: true },
    });
    const r = parseBackup(serializeBackup(b), SPEC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup).toEqual(b);
    expect(r.summary).toEqual({
      exportedAt: META.exportedAt,
      appVersion: '1.2.0',
      schemaVersion: 3,
      counts: { program: 1, week_plan: 1, daily_log: 1 },
      totalRows: 3,
    });
  });

  it('names the file by local date', () => {
    expect(backupFilename('2026-10-09')).toBe('fitnese-backup-2026-10-09.json');
  });

  it('summarize counts rows per table', () => {
    expect(summarize(buildBackup({ a: [{}, {}], b: [] }, META)).counts).toEqual({ a: 2, b: 0 });
  });
});

describe('parseBackup rejects files it cannot restore', () => {
  it.each<[BackupProblem, string, { maxLength?: number }]>([
    ['tooLarge', 'x'.repeat(101), { maxLength: 100 }],
    ['notJson', '{not json', {}],
    ['notJson', '', {}],
    ['notBackup', text([1, 2]), {}],
    ['notBackup', text({ ...validFile(), format: 'other-app-backup' }), {}],
    ['notBackup', text({ ...validFile(), formatVersion: 'one' }), {}],
    ['notBackup', text({ ...validFile(), exportedAt: 'yesterday' }), {}],
    ['notBackup', text({ ...validFile(), appVersion: 1 }), {}],
    ['notBackup', text({ ...validFile(), tables: [] }), {}],
    ['notBackup', text({ ...validFile(), schemaVersion: 0 }), {}],
    ['newerFormat', text({ ...validFile(), formatVersion: BACKUP_FORMAT_VERSION + 1 }), {}],
    ['newerSchema', text({ ...validFile(), schemaVersion: 4 }), {}],
  ])('%s', (reason, input, opts) => {
    expect(parseBackup(input, SPEC, opts)).toMatchObject({ ok: false, reason });
  });

  it('missing table', () => {
    const f = validFile();
    delete (f.tables as Record<string, unknown>).week_plan;
    expect(parseBackup(text(f), SPEC)).toEqual({ ok: false, reason: 'missingTable', detail: 'week_plan' });
  });

  it.each([
    ['rows not an array', { week_plan: { w1: {} } }, 'week_plan'],
    ['row not an object', { week_plan: ['w1'] }, 'week_plan[0].(row)'],
    ['wrong type', { week_plan: [{ id: 'w1', days: [1], enabled: 'yes' }] }, 'week_plan[0].enabled'],
    ['json column holds a string', { week_plan: [{ id: 'w1', days: '1,3' }] }, 'week_plan[0].days'],
    ['null in required column', { week_plan: [{ id: 'w1', days: null }] }, 'week_plan[0].days'],
    ['unknown column', { week_plan: [{ id: 'w1', colour: 'red' }] }, 'week_plan[0].colour'],
    ['missing required column', { program: [{ id: 'p1', createdAt: 1 }] }, 'program[0].name'],
    ['NaN-ish number', { program: [{ id: 'p1', createdAt: 'now', name: 'A' }] }, 'program[0].createdAt'],
    ['empty id', { week_plan: [{ id: '' }] }, 'week_plan[0].id'],
    ['duplicate id', { week_plan: [{ id: 'w1' }, { id: 'w1' }] }, 'week_plan[1].id'],
  ])('bad rows: %s', (_label, tables, detail) => {
    const f = validFile();
    const input = text({ ...f, tables: { ...f.tables, ...tables } });
    expect(parseBackup(input, SPEC)).toEqual({ ok: false, reason: 'badRows', detail });
  });
});

describe('parseBackup accepts older or equal schema versions', () => {
  it('fills defaults (or null) for columns an older file does not have', () => {
    const f = validFile({ schemaVersion: 2 });
    const input = text({
      ...f,
      tables: { program: [{ id: 'p1', createdAt: 5, name: 'Old' }], week_plan: [{ id: 'w1' }] },
    });
    const r = parseBackup(input, SPEC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables).toEqual({
      program: [{ id: 'p1', createdAt: 5, deletedAt: null, name: 'Old', sortOrder: 0 }],
      week_plan: [{ id: 'w1', deletedAt: null, days: [], enabled: true, note: null }],
      // daily_log มาใน schema 3 → ไฟล์ schema 2 ไม่มีได้ ถือว่าว่าง
      daily_log: [],
    });
    expect(r.summary.schemaVersion).toBe(2);
  });

  it('a table introduced in the file’s own schema version is still required', () => {
    const f = validFile();
    delete (f.tables as Record<string, unknown>).daily_log;
    expect(parseBackup(text(f), SPEC)).toMatchObject({ ok: false, reason: 'missingTable' });
  });

  it('drops soft-deleted rows, unknown tables and unknown or mistyped settings', () => {
    const f = validFile();
    const input = text({
      ...f,
      settings: { onboardingDone: 'yes', language: 'th' },
      tables: {
        ...f.tables,
        program: [...f.tables.program, { id: 'gone', createdAt: 2, deletedAt: 9, name: 'Deleted' }],
        retired_table: [{ id: 'x' }],
      },
    });
    const r = parseBackup(input, SPEC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.tables.program.map((p) => p.id)).toEqual(['p1']);
    expect(r.backup.tables).not.toHaveProperty('retired_table');
    expect(r.backup.settings).toEqual({});
    expect(r.summary.counts.program).toBe(1);
  });

  it('a missing settings object is fine', () => {
    const f = validFile();
    const { settings: _drop, ...rest } = f;
    const r = parseBackup(text(rest), SPEC);
    expect(r.ok && r.backup.settings).toEqual({});
  });
});
