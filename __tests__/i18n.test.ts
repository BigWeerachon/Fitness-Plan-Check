import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import en from '@/i18n/locales/en';
import th from '@/i18n/locales/th';

type Tree = { [k: string]: string | readonly string[] | Tree };

function flatten(obj: Tree, prefix = ''): Record<string, string | readonly string[]> {
  const out: Record<string, string | readonly string[]> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || Array.isArray(v)) out[key] = v as string | readonly string[];
    else Object.assign(out, flatten(v as Tree, key));
  }
  return out;
}

const enFlat = flatten(en as unknown as Tree);
const thFlat = flatten(th as unknown as Tree);

describe('translations (SPEC ฌ)', () => {
  it('Thai and English have exactly the same keys', () => {
    expect(Object.keys(thFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('no translation is empty', () => {
    for (const [k, v] of [...Object.entries(enFlat), ...Object.entries(thFlat)]) {
      if (Array.isArray(v)) expect(v.every((s) => String(s).trim().length > 0)).toBe(true);
      else expect([k, String(v).trim().length > 0]).toEqual([k, true]);
    }
  });

  it('interpolation placeholders match between languages', () => {
    const vars = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).map((x) => x.replace(/\s/g, '')).sort();
    for (const [k, v] of Object.entries(enFlat)) {
      if (typeof v !== 'string') continue;
      expect([k, vars(thFlat[k] as string)]).toEqual([k, vars(v)]);
    }
  });

  it('every t("…") key used in the source exists', () => {
    const root = path.join(__dirname, '..', 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f)) files.push(p);
      }
    };
    walk(root);
    const missing: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        const key = m[1];
        const exists = key in enFlat || `${key}_one` in enFlat || `${key}_other` in enFlat;
        if (!exists) missing.push(`${path.relative(root, file)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
