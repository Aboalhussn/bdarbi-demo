import { DRIVER_VEHICLE } from './data';
import type { CaptainAccount, CaptainProfile } from './store';

/** The ready-made demo captain. */
export const DRIVER_NAME = 'حسين كاظم';

/** The signed-in captain: one who registered in this demo, or the demo captain — with any edits from his profile. */
export function captainInfo(captain: CaptainAccount | null, profile?: CaptainProfile) {
  const base = captain?.status === 'approved'
    ? { name: captain.name, phone: captain.phone, vehicle: captain.vehicle, since: String(new Date(captain.submittedAt).getFullYear()), docs: captain.docs }
    : { name: DRIVER_NAME, phone: '780 111 2222', vehicle: DRIVER_VEHICLE, since: '2024', docs: {} as Record<string, string> };
  return { ...base, name: profile?.name || base.name, phone: profile?.phone || base.phone, avatar: profile?.avatar || '' };
}
