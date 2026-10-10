import type { LocaleShape } from '../../types';
import type en from '../en/tabs';

const tabs: LocaleShape<typeof en> = {
  today: 'วันนี้',
  programs: 'โปรแกรม',
  stats: 'สถิติ',
  settings: 'ตั้งค่า',
};

export default tabs;
