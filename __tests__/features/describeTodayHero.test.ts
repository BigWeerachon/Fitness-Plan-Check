import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { describeTodayHero } from '@/features/today/describeTodayHero';
import type { TodayModel, TodayRoutine } from '@/features/today/loadToday';
import { formatDateShort } from '@/i18n/format';
import { setLanguage, t } from '@/i18n';
import { setClockForTests } from '@/utils/clock';

const DAY = new Date(2026, 9, 9);
const DATE = formatDateShort(DAY);

const routine = (name: string, exerciseCount: number, estMinutes: number): TodayRoutine =>
  ({ routine: { name }, exerciseCount, estMinutes }) as TodayRoutine;

type HeroInput = Pick<TodayModel, 'hasAnyRoutine' | 'plan' | 'routines'>;
const input = (
  kind: TodayModel['plan']['kind'],
  routines: TodayRoutine[] = [],
  hasAnyRoutine = true,
): HeroInput => ({
  hasAnyRoutine,
  plan: { kind, routineIds: [], source: 'plan' },
  routines,
});

describe('describeTodayHero', () => {
  beforeAll(() => {
    setLanguage('en');
    setClockForTests(() => new Date(2026, 9, 9, 9).getTime());
  });
  afterAll(() => setClockForTests(null));

  it('asks to set up a plan when no routine exists, whatever the day plan says', () => {
    expect(describeTodayHero(input('rest', [], false), DAY, t)).toEqual({
      title: 'Let’s set up your plan',
      subtitle: DATE,
    });
  });

  it('describes a rest day', () => {
    expect(describeTodayHero(input('rest'), DAY, t)).toEqual({
      title: 'Rest day today',
      subtitle: `${DATE} · recovery matters too`,
    });
  });

  it('describes a free session', () => {
    expect(describeTodayHero(input('empty'), DAY, t)).toEqual({
      title: 'Today: free session',
      subtitle: DATE,
    });
  });

  it('joins routine names and sums exercises and minutes', () => {
    expect(
      describeTodayHero(input('routines', [routine('Push', 5, 40), routine('Core', 1, 5)]), DAY, t),
    ).toEqual({
      title: 'Today: Push + Core',
      subtitle: `${DATE} · 6 exercises · ~45 min`,
    });
  });
});
