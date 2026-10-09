import React from 'react';
import { EmptyState, HeroTitle, Screen, StackHeader } from '.';

/** หน้าโครง (เฟส 1) ในธีมจริง — ถูกแทนที่ด้วยหน้าจริงในเฟส 2 */
export function PlaceholderScreen({
  title,
  stack,
  withTabBar,
}: {
  title: string;
  stack?: boolean;
  withTabBar?: boolean;
}) {
  return (
    <Screen withTabBar={withTabBar} header={stack ? <StackHeader /> : undefined}>
      <HeroTitle title={title} />
      <EmptyState />
    </Screen>
  );
}
