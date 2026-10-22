import { DRIVER_VEHICLE } from './data';
import { findVehicle } from './agency';
import { useStore, type CaptainAccount, type CaptainProfile } from './store';

/** The ready-made demo captain. */
export const DRIVER_NAME = 'حسين كاظم';

/** The signed-in captain: one who registered in this demo, or the demo captain — with any edits from his profile. */
export function captainInfo(captain: CaptainAccount | null, profile?: CaptainProfile) {
  const base = captain?.status === 'approved'
    ? { name: captain.name, phone: captain.phone, vehicle: captain.vehicle, since: String(new Date(captain.submittedAt).getFullYear()), docs: captain.docs }
    : { name: DRIVER_NAME, phone: '780 111 2222', vehicle: DRIVER_VEHICLE, since: '2024', docs: {} as Record<string, string> };
  return { ...base, name: profile?.name || base.name, phone: profile?.phone || base.phone, avatar: profile?.avatar || '', agency: '' };
}

/** Same as captainInfo, but an office driver gets the name, phone and vehicle his office set. */
export function useCaptainInfo() {
  const { captain, captainProfile, agencyDriverId, agencyDrivers, agencyVehicles, agencyInfo } = useStore();
  const d = agencyDriverId ? agencyDrivers.find((x) => x.id === agencyDriverId) : undefined;
  if (!d) return captainInfo(captain, captainProfile);
  const v = findVehicle(agencyVehicles, d.vehicleId);
  const p = d.phone;
  return {
    name: d.name,
    phone: `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`,
    vehicle: v ? { kind: v.kind, model: v.model, seats: v.seats, plate: v.plate, color: v.color, year: v.year } : { ...DRIVER_VEHICLE, model: 'ما محددة', plate: '—' },
    since: '2025',
    docs: {} as Record<string, string>,
    avatar: captainProfile.avatar || '',
    agency: agencyInfo.name,
  };
}
