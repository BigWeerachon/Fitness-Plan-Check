import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListRow } from '../../components';
import type { AuthUser } from '../../services/auth/types';

/** แถว "เข้าสู่ระบบเป็น …" พร้อมไอคอนผู้ให้บริการและป้ายอีเมลรีเลย์ของ Apple */
export function SignedInAsRow({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  return (
    <ListRow
      title={t('account.signedInAs')}
      value={user.isPrivateRelay ? `${user.email ?? ''} · ${t('auth.privateRelay')}` : user.email}
      icon={user.provider === 'apple' ? 'logo-apple' : 'logo-google'}
    />
  );
}
