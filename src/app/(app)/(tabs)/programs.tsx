import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  ActionBar,
  AppText,
  Badge,
  BigRow,
  Button,
  CardGroup,
  EmptyState,
  HeroTitle,
  Icon,
  IconButton,
  ListRow,
  Screen,
  SectionTitle,
  Sheet,
  TextField,
  WeekdayDots,
} from '../../../components';
import { profileRepo } from '../../../db/repos/profileRepo';
import { programRepo } from '../../../db/repos/programRepo';
import { weekPlanRepo } from '../../../db/repos/weekPlanRepo';
import { parseLocalDate, toLocalDate } from '../../../domain/dates';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { loadPrograms } from '../../../features/programs/usePrograms';
import { formatRelativeDay } from '../../../i18n/format';
import { now } from '../../../utils/clock';
import { spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

/** หน้าโปรแกรม (SPEC F2): ตารางประจำสัปดาห์ + รายการกรุ๊ป (ชื่อ, จำนวน routine, สถิติสั้น) */
export default function ProgramsScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const data = useRepoQuery(loadPrograms);
  const weekStart = useRepoQuery(() => profileRepo.get()?.weekStart ?? 1);
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState('');
  const active = data.cards.find((c) => c.isActive);
  const today = parseLocalDate(toLocalDate(now()));

  const create = () => {
    if (!name.trim()) return;
    const program = programRepo.create(name);
    if (!data.activeId) weekPlanRepo.setActiveProgram(program.id);
    setCreating(false);
    setName('');
    router.push({ pathname: '/program/[id]', params: { id: program.id } });
  };

  return (
    <Screen withTabBar testID="programs">
      <HeroTitle
        title={t('programs.title')}
        subtitle={active ? t('programs.activeSub', { name: active.program.name }) : t('programs.noActive')}
      />
      <ActionBar>
        <IconButton
          icon="add"
          label={t('programs.newProgram')}
          onPress={() => setCreating(true)}
          testID="programs-add"
        />
        <IconButton
          icon="ellipsis-vertical"
          label={t('a11y.menu')}
          onPress={() => setMenu(true)}
          testID="programs-menu"
        />
      </ActionBar>

      <CardGroup>
        <BigRow
          title={t('programs.weekCard')}
          below={
            <WeekdayDots active={data.activeDays} weekStart={weekStart} label={t('programs.weekCard')} />
          }
          right={<Icon name="chevron-forward" size={22} color={p.textSecondary} />}
          onPress={() => router.push('/week')}
          accessibilityHint={t('programs.weekCardSub')}
          testID="programs-week"
        />
      </CardGroup>

      <SectionTitle>{t('programs.groups')}</SectionTitle>
      {data.cards.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title={t('programs.emptyPrograms')}
          body={t('programs.emptyProgramsBody')}
          actionLabel={t('programs.fromTemplate')}
          onAction={() => router.push('/program/templates')}
        />
      ) : (
        <CardGroup>
          {data.cards.map((c) => (
            <BigRow
              key={c.program.id}
              title={c.program.name}
              below={
                <View style={styles.below}>
                  <AppText variant="callout" secondary>
                    {[
                      t('programs.routineCount', { count: c.routineCount }),
                      t('programs.sessionsCount', { count: c.sessionCount }),
                      c.lastDate
                        ? t('programs.lastWorkout', {
                            when: formatRelativeDay(parseLocalDate(c.lastDate), today),
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                  {c.isActive ? (
                    <View style={styles.badge}>
                      <Badge label={t('programs.active')} />
                    </View>
                  ) : null}
                </View>
              }
              right={<Icon name="chevron-forward" size={22} color={p.textSecondary} />}
              onPress={() => router.push({ pathname: '/program/[id]', params: { id: c.program.id } })}
              testID={`program-${c.program.id}`}
            />
          ))}
        </CardGroup>
      )}

      <View style={styles.links}>
        <Button
          title={t('programs.fromTemplate')}
          kind="secondary"
          icon="copy-outline"
          onPress={() => router.push('/program/templates')}
        />
        <Button
          title={t('programs.library')}
          kind="plain"
          icon="library-outline"
          onPress={() => router.push('/exercises')}
        />
      </View>

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('programs.newProgram')}>
        <TextField
          label={t('programs.newProgramName')}
          placeholder={t('programs.newProgramPlaceholder')}
          value={name}
          onChangeText={setName}
          autoFocus
          testID="new-program-name"
        />
        <Button
          title={t('common.create')}
          onPress={create}
          disabled={!name.trim()}
          testID="new-program-create"
        />
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={t('today.menu.title')}>
        <CardGroup>
          <ListRow
            title={t('programs.fromTemplate')}
            icon="copy-outline"
            onPress={() => {
              setMenu(false);
              router.push('/program/templates');
            }}
          />
          <ListRow
            title={t('programs.library')}
            icon="library-outline"
            onPress={() => {
              setMenu(false);
              router.push('/exercises');
            }}
          />
          <ListRow
            title={t('programs.weekCard')}
            icon="calendar-outline"
            onPress={() => {
              setMenu(false);
              router.push('/week');
            }}
          />
        </CardGroup>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  below: { gap: spacing.xs, alignItems: 'flex-start' },
  badge: { alignSelf: 'flex-start' },
  links: { marginTop: spacing.lg, gap: spacing.sm },
});
