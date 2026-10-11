import { describe, expect, it } from '@jest/globals';
import { LEGAL, LEGAL_KEYS, PLACEHOLDERS, hasPlaceholders, type LegalDoc } from '@/legal/content';

const filled = (doc: LegalDoc): LegalDoc => {
  const fill = (text: string) =>
    Object.values(PLACEHOLDERS).reduce((acc, value) => acc.split(value).join('Acme Co.'), text);
  return {
    title: fill(doc.title),
    updated: fill(doc.updated),
    sections: doc.sections.map((s) => ({ heading: fill(s.heading), body: fill(s.body) })),
  };
};

describe('legal documents (SPEC N4)', () => {
  it('detects remaining placeholders so the "template" notice disappears once they are filled', () => {
    for (const key of LEGAL_KEYS) {
      for (const lang of ['en', 'th'] as const) {
        const doc = LEGAL[key][lang];
        expect(hasPlaceholders(doc)).toBe(true);
        expect(hasPlaceholders(filled(doc))).toBe(false);
      }
    }
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
