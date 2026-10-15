import { router } from 'expo-router';
import type { LegalKey } from '../../legal/content';

/** เปิดหน้า Privacy Policy / Terms */
export function openLegal(doc: LegalKey): void {
  router.push({ pathname: '/legal/[doc]', params: { doc } });
}
