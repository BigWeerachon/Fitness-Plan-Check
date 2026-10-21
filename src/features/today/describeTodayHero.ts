import type { TFunction } from 'i18next';
import { formatDateShort } from '../../i18n/format';
import type { TodayModel } from './loadToday';

/** หัวข้อใหญ่กับบรรทัดรองของหน้าแรก ตามแผนของวันนี้ (ไม่มีโปรแกรม / พัก / ฝึกอิสระ / routine) */
export function describeTodayHero(
  model: Pick<TodayModel, 'hasAnyRoutine' | 'plan' | 'routines'>,
  today: Date,
  t: TFunction,
): { title: string; subtitle: string } {
  const date = formatDateShort(today);
  if (!model.hasAnyRoutine) return { title: t('today.heroNoProgram'), subtitle: date };
  if (model.plan.kind === 'rest') {
    return { title: t('today.heroRest'), subtitle: t('today.subtitleRest', { date }) };
  }
  if (model.plan.kind === 'empty') return { title: t('today.heroEmpty'), subtitle: date };
  return {
    title: t('today.heroRoutine', { name: model.routines.map((r) => r.routine.name).join(' + ') }),
    subtitle: t('today.subtitle', {
      date,
      exercises: t('today.exercisesCount', {
        count: model.routines.reduce((n, r) => n + r.exerciseCount, 0),
      }),
      minutes: model.routines.reduce((n, r) => n + r.estMinutes, 0),
    }),
  };
}
