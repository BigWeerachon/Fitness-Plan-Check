import type { LocaleShape } from '../../types';
import type en from '../en';
import common from './common';
import date from './date';
import tabs from './tabs';
import a11y from './a11y';
import errors from './errors';
import onboarding from './onboarding';
import paywall from './paywall';
import auth from './auth';
import account from './account';
import today from './today';
import week from './week';
import programs from './programs';
import exercises from './exercises';
import session from './session';
import stats from './stats';
import nutrition from './nutrition';
import settings from './settings';
import sync from './sync';
import legal from './legal';

// แต่ละหมวดอยู่คนละไฟล์ เพิ่ม key ในไฟล์ของหมวดนั้นๆ
const th: LocaleShape<typeof en> = {
  common,
  date,
  tabs,
  a11y,
  errors,
  onboarding,
  paywall,
  auth,
  account,
  today,
  week,
  programs,
  exercises,
  session,
  stats,
  nutrition,
  settings,
  sync,
  legal,
};

export default th;
