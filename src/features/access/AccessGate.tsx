import { Redirect, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { LoadingState } from '../../components';
import { Screen } from '../../components/Screen';
import { resumeEntitledOnboarding, type EntitledResume } from '../onboarding/resume';
import { useEntitlement } from '../../stores/entitlement';
import { useSettings } from '../../stores/settings';
import { useAccess } from './useAccess';

/** รอผลตรวจเซสชันตอนเปิดแอปได้นานสุดเท่านี้ก่อนยอมให้เริ่มตั้งค่าเริ่มต้นตามปกติ (กันค้างตอนเครือข่ายช้า) */
const SESSION_WAIT_MS = 3_000;

const RESUME_HREF: Record<Exclude<EntitledResume, 'done'>, Href> = {
  profile: '/onboarding/profile',
  program: '/onboarding/program',
  unknown: '/onboarding',
};

function FullScreenLoading() {
  return (
    <Screen scroll={false}>
      <LoadingState />
    </Screen>
  );
}

/**
 * เครื่องนี้ยังไม่เคยผ่านตั้งค่าเริ่มต้น: ผู้ใช้ใหม่ → ขั้น 1
 * แต่ถ้าล็อกอินและมีสิทธิ์อยู่แล้ว (ติดตั้งใหม่ แล้วเซสชันกลับมา) → ดึงข้อมูลคลาวด์แล้วข้ามขั้นที่ทำไว้แล้ว (SPEC C)
 */
function BeforeOnboarding() {
  const access = useAccess();
  // ล็อกอินแล้วแต่ยังไม่มีแคชสิทธิ์ (ติดตั้งใหม่) → รอผลตรวจกับ RevenueCat ก่อน ไม่งั้นเด้งไปขั้น 1 ทั้งที่มีสิทธิ์อยู่
  const checking = useEntitlement((s) => s.checking);
  const [graceOver, setGraceOver] = useState(false);
  const [resume, setResume] = useState<EntitledResume | null>(null);
  const resumable = access.allowed && !!access.userId;
  const userId = access.userId;

  useEffect(() => {
    const id = setTimeout(() => setGraceOver(true), SESSION_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!resumable || !userId) return;
    let alive = true;
    void resumeEntitledOnboarding(userId).then((r) => alive && setResume(r));
    return () => {
      alive = false;
    };
  }, [resumable, userId]);

  if (!resumable) {
    const waitingForSession = access.pending || (!!userId && checking);
    return waitingForSession && !graceOver ? <FullScreenLoading /> : <Redirect href="/onboarding" />;
  }
  // 'done' → resumeEntitledOnboarding ตั้ง onboardingDone แล้ว AccessGate จะผ่านเอง
  if (resume === null || resume === 'done') return <FullScreenLoading />;
  return <Redirect href={RESUME_HREF[resume]} />;
}

/**
 * ตัวกั้นสิทธิ์ที่ทุกหน้าในกลุ่ม (app) ใช้ร่วมกัน (SPEC B3/B8)
 * - ยังไม่ผ่านตั้งค่าเริ่มต้น → onboarding
 * - กำลังตรวจสิทธิ์ครั้งแรก → loading (ไม่เด้ง Paywall วูบ)
 * - ไม่มีสิทธิ์ → Paywall (ข้อมูลที่บันทึกไว้ไม่ถูกลบ แค่เข้าถึงไม่ได้จนกว่าจะสมัครใหม่)
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const onboardingDone = useSettings((s) => s.onboardingDone);
  const access = useAccess();
  if (!onboardingDone) return <BeforeOnboarding />;
  if (access.pending) return <FullScreenLoading />;
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
