import { Redirect } from 'expo-router';
import React from 'react';
import { LoadingState } from '../../components';
import { Screen } from '../../components/Screen';
import { useSettings } from '../../stores/settings';
import { useAccess } from './useAccess';

/**
 * ตัวกั้นสิทธิ์ที่ทุกหน้าในกลุ่ม (app) ใช้ร่วมกัน (SPEC B3/B8)
 * - ยังไม่ผ่านตั้งค่าเริ่มต้น → onboarding
 * - กำลังตรวจสิทธิ์ครั้งแรก → loading (ไม่เด้ง Paywall วูบ)
 * - ไม่มีสิทธิ์ → Paywall (ข้อมูลที่บันทึกไว้ไม่ถูกลบ แค่เข้าถึงไม่ได้จนกว่าจะสมัครใหม่)
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const onboardingDone = useSettings((s) => s.onboardingDone);
  const access = useAccess();
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (access.pending) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (!access.allowed) return <Redirect href="/paywall" />;
  return <>{children}</>;
}

/**
 * เส้นทางที่เข้าถึงได้เสมอแม้ไม่มีสิทธิ์ (SPEC B3) — มีเทสต์ตรวจว่าทุกหน้านอกกลุ่ม (app) อยู่ในรายการนี้
 */
export const ALWAYS_ACCESSIBLE_ROUTES = [
  'onboarding/index', // ตั้งค่าเริ่มต้น ขั้น 1: ภาษา/ธีม/สีหลัก
  'onboarding/profile', // ขั้น 2: โปรไฟล์
  'onboarding/program', // ขั้น 3: เลือกโปรแกรมเริ่มต้น
  'paywall',
  'login',
  'account', // Restore Purchases, จัดการสมาชิก, ล็อกเอาต์, ภาษา/ธีม/สีหลัก
  'legal/[doc]', // Privacy Policy, Terms
  'references', // แหล่งอ้างอิง
  'delete-account', // ลบบัญชีและข้อมูล
] as const;
