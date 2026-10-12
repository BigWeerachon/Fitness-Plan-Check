import { describe, expect, it } from '@jest/globals';
import { LEGAL, LEGAL_KEYS, MARKERS, PLACEHOLDERS, hasPlaceholders, type LegalDoc } from '@/legal/content';

// เอกสารสังเคราะห์จากข้อความตัวแทนต้นฉบับ (MARKERS) เพื่อให้เทสต์ไม่ขึ้นกับว่าเจ้าของกรอก PLACEHOLDERS ไปแล้วหรือยัง
const templateDoc = (): LegalDoc => ({
  title: 'T',
  updated: `Effective ${MARKERS.effective}`,
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

  it('every document uses all of the placeholders somewhere (so a filled value reaches the text)', () => {
    const text = LEGAL_KEYS.flatMap((k) =>
      (['en', 'th'] as const).map((l) => JSON.stringify(LEGAL[k][l])),
    ).join('\n');
    for (const value of Object.values(PLACEHOLDERS)) expect(text).toContain(value);
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
