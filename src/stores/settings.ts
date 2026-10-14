import { create } from 'zustand';
import { settingsRepo } from '../db/repos/settingsRepo';
import { deviceLanguage, setLanguage, type Language } from '../i18n';
import { DEFAULT_ACCENT, type AccentSetting, type ThemePreference } from '../theme/tokens';

export type StatsMetric = 'sets' | 'volume' | 'sessions';

/** การตั้งค่าระดับเครื่อง (ไม่ผูกบัญชี ใช้ได้เสมอแม้ไม่มีสิทธิ์ SPEC B3) */
export interface DeviceSettings {
  language: Language;
  theme: ThemePreference;
  accent: AccentSetting;
  /** ผ่านขั้นตั้งค่าเริ่มต้นแล้ว (SPEC C) */
  onboardingDone: boolean;
  statsMetric: StatsMetric;
  /** สำรองข้อมูลเป็นไฟล์ครั้งล่าสุด (epoch ms) — ข้อมูลอยู่ในเครื่องนี้เท่านั้น (D82) */
  lastBackupAt: number | null;
}

const createDefaultSettings = (): DeviceSettings => ({
  language: deviceLanguage(),
  theme: 'dark',
  accent: DEFAULT_ACCENT,
  onboardingDone: false,
  statsMetric: 'sets',
  lastBackupAt: null,
});

interface SettingsStore extends DeviceSettings {
  loaded: boolean;
  load(): void;
  set<K extends keyof DeviceSettings>(key: K, value: DeviceSettings[K]): void;
}

export const useSettings = create<SettingsStore>((set) => ({
  ...createDefaultSettings(),
  loaded: false,
  load() {
    const stored = settingsRepo.all();
    const merged = { ...createDefaultSettings() };
    (Object.keys(merged) as (keyof DeviceSettings)[]).forEach((k) => {
      if (stored[k] !== undefined) (merged as Record<string, unknown>)[k] = stored[k];
    });
    setLanguage(merged.language);
    set({ ...merged, loaded: true });
  },
  set(key, value) {
    settingsRepo.set(key, value);
    if (key === 'language') setLanguage(value as Language);
    set({ [key]: value } as Partial<SettingsStore>);
  },
}));
