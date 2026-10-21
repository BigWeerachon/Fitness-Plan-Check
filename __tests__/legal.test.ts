import { describe, expect, it } from '@jest/globals';
import {
  LEGAL,
  LEGAL_KEYS,
  MARKERS,
  PLACEHOLDERS,
  docText,
  hasPlaceholders,
  type LegalDoc,
} from '@/legal/content';

// เอกสารสังเคราะห์จากข้อความตัวแทนต้นฉบับ (MARKERS) เพื่อให้เทสต์ไม่ขึ้นกับว่าเจ้าของกรอก PLACEHOLDERS ไปแล้วหรือยัง
const templateDoc = (): LegalDoc => ({
  title: 'T',
  updated: 'Effective date',
  sections: [{ heading: 'H', body: Object.values(MARKERS).join(' · ') }],
});

describe('legal documents (SPEC N4)', () => {
  it('detects remaining placeholders so the "template" notice disappears once they are filled', () => {
    const doc = templateDoc();
    expect(hasPlaceholders(doc)).toBe(true);
    const fill = (text: string) =>
      Object.values(MARKERS).reduce((acc, m) => acc.split(m).join('Acme Co.'), text);
    expect(
      hasPlaceholders({
        title: fill(doc.title),
        updated: fill(doc.updated),
        sections: doc.sections.map((x) => ({ heading: fill(x.heading), body: fill(x.body) })),
      }),
    ).toBe(false);
  });

  it('every document uses all three placeholders somewhere (so a filled value reaches the text)', () => {
    const text = LEGAL_KEYS.flatMap((k) =>
      (['en', 'th'] as const).map((l) => JSON.stringify(LEGAL[k][l])),
    ).join('\n');
    for (const value of Object.values(PLACEHOLDERS)) expect(text).toContain(value);
  });

  it('Thai and English versions have the same structure', () => {
    for (const key of LEGAL_KEYS) {
      expect(LEGAL[key].th.sections).toHaveLength(LEGAL[key].en.sections.length);
    }
  });

  it('describes the local-only app (D81): no accounts, cloud sync or sign-in providers', () => {
    const all = LEGAL_KEYS.flatMap((k) => [docText(LEGAL[k].en), docText(LEGAL[k].th)]).join('\n');
    for (const gone of [
      /supabase/i,
      /sign in with apple/i,
      /google sign/i,
      /\bsync/i,
      /ซิงก์/,
      /ล็อกอินด้วย/,
    ]) {
      expect(all).not.toMatch(gone);
    }
    const privacyEn = docText(LEGAL.privacy.en);
    expect(privacyEn).toMatch(/stays on your device only/);
    expect(privacyEn).toMatch(/RevenueCat/);
    expect(privacyEn).toMatch(/anonymous/i);
    expect(privacyEn).toMatch(/Delete all data on this device/);
    expect(privacyEn).toMatch(/Back up data/);
    expect(docText(LEGAL.privacy.th)).toMatch(/ลบข้อมูลทั้งหมดในเครื่องนี้/);
  });

  it('terms make the user responsible for backups (D83)', () => {
    expect(docText(LEGAL.terms.en)).toMatch(/You are responsible for backing up your data/);
    expect(docText(LEGAL.terms.th)).toMatch(/คุณเป็นผู้รับผิดชอบการสำรองข้อมูลของตนเอง/);
  });

  it('keeps the owner details, Thai law / Bangkok courts and the effective date', () => {
    expect(LEGAL.privacy.en.updated).toBe('Effective 15 October 2026');
    expect(LEGAL.terms.th.updated).toBe('มีผลตั้งแต่ 15 ตุลาคม 2569');
    expect(docText(LEGAL.terms.en)).toMatch(/laws of Thailand[\s\S]*courts in Bangkok/);
    expect(docText(LEGAL.privacy.en)).toContain(PLACEHOLDERS.contact);
  });

  /**
   * Release guard: รัน `RELEASE=1 npx jest __tests__/legal.test.ts` ก่อนส่งสโตร์
   * ล้มเหลวจนกว่าเจ้าของโปรเจกต์จะกรอก PLACEHOLDERS ใน src/legal/content.ts ครบทุกเอกสาร/ทุกภาษา
   * (ปกติถูกข้ามเพื่อไม่ให้ `npm test` ล้มระหว่างพัฒนา)
   */
  const releaseIt = process.env.RELEASE === '1' ? it : it.skip;
  releaseIt('has no placeholders left in any legal document', () => {
    const remaining = LEGAL_KEYS.flatMap((key) =>
      (['en', 'th'] as const)
        .filter((lang) => hasPlaceholders(LEGAL[key][lang]))
        .map((lang) => `${key}/${lang}`),
    );
    expect(remaining).toEqual([]);
  });
});
