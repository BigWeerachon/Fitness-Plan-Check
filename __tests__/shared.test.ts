import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('shared modules between app and Edge Functions', () => {
  it('the webhook uses an identical copy of the entitlement state machine', () => {
    const root = path.join(__dirname, '..');
    const src = fs.readFileSync(path.join(root, 'src/domain/entitlement/machine.ts'), 'utf8');
    const copy = fs.readFileSync(
      path.join(root, 'supabase/functions/_shared/entitlement-machine.ts'),
      'utf8',
    );
    // ถ้าเทสต์นี้ล้ม ให้รัน `node scripts/sync-shared.js`
    expect(copy).toBe(src);
  });
});
