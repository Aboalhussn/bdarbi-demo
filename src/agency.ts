import { DEMO_PASSENGERS, type VehicleKind } from './data';
import type { Booking } from './store';

export const AGENCY_NAME = 'مكتب دجلة للسفر والسياحة';

export interface AgencyVehicle {
  id: string;
  kind: VehicleKind;
  model: string;
  plate: string; // "بغداد 48213 أ"
  seats: number;
  color: string;
  year: string;
}

export const vLabel = (v: AgencyVehicle) => `${v.kind} ${v.seats}`;

export interface AgencyDriver {
  id: string;
  name: string;
  phone: string;
  rating: string;
  vehicleId: string;
  status: 'active' | 'invited';
  password?: string; // set by the office; the driver signs in with phone + this
}

export interface AgencyTrip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string; // HH:MM
  hours: number; // trip length, for overlap checks
  vehicleId: string;
  driverId: string;
  booked: number;
  price: number;
  status: 'scheduled' | 'started' | 'arrived' | 'cancelled';
  garageId?: string;
  endGarageId?: string;
}

export const SEED_VEHICLES: AgencyVehicle[] = [
  { id: 'v1', kind: 'باص', model: 'مرسيدس ترافيغو', plate: 'بغداد 48213 أ', seats: 40, color: 'أبيض', year: '2021' },
  { id: 'v2', kind: 'كوستر', model: 'تويوتا كوستر', plate: 'بغداد 33790 ب', seats: 14, color: 'فضي', year: '2019' },
  { id: 'v3', kind: 'GMC', model: 'جي إم سي يوكن', plate: 'بغداد 61025 ج', seats: 7, color: 'أسود', year: '2022' },
  { id: 'v4', kind: 'كوستر', model: 'تويوتا كوستر', plate: 'بغداد 27401 د', seats: 14, color: 'أبيض', year: '2018' },
  { id: 'v5', kind: 'باص', model: 'كينغ لونغ', plate: 'بغداد 55118 هـ', seats: 40, color: 'أبيض', year: '2020' },
  { id: 'v6', kind: 'GMC', model: 'جي إم سي سييرا', plate: 'بغداد 70342 و', seats: 7, color: 'فضي', year: '2023' },
];

export const SEED_DRIVERS: AgencyDriver[] = [
  { id: 'd1', name: 'كريم عبد الله', phone: '7701110001', rating: '4.9', vehicleId: 'v1', status: 'active' },
  { id: 'd2', name: 'سلام حميد', phone: '7801110002', rating: '4.8', vehicleId: 'v2', status: 'active' },
  { id: 'd3', name: 'عباس جبار', phone: '7501110003', rating: '4.7', vehicleId: 'v3', status: 'active' },
  { id: 'd4', name: 'مهدي صالح', phone: '7701110004', rating: '4.9', vehicleId: 'v4', status: 'active' },
  { id: 'd5', name: 'رعد ناصر', phone: '7801110005', rating: '4.6', vehicleId: 'v5', status: 'active' },
  { id: 'd6', name: 'ليث كامل', phone: '7501110006', rating: '4.8', vehicleId: 'v6', status: 'active' },
];

/** Demo trips placed around the current time, so some are on the road and some are still to come. */
export function seedAgencyTrips(): AgencyTrip[] {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // `offset` is in minutes from now, rounded to the half hour.
  const at = (offset: number) => {
    const d = new Date(Date.now() + offset * 60000);
    d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
    return { date: iso(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
  };
  return [
    { id: 'a1', from: 'بغداد', to: 'البصرة', ...at(-90), hours: 6.5, vehicleId: 'v1', driverId: 'd1', booked: 31, price: 25000, status: 'scheduled' },
    { id: 'a2', from: 'بغداد', to: 'أربيل', ...at(60), hours: 5, vehicleId: 'v2', driverId: 'd2', booked: 14, price: 30000, status: 'scheduled' },
    { id: 'a3', from: 'بغداد', to: 'كربلاء المقدسة', ...at(150), hours: 2, vehicleId: 'v3', driverId: 'd3', booked: 4, price: 20000, status: 'scheduled' },
    { id: 'a4', from: 'بغداد', to: 'النجف الأشرف', ...at(210), hours: 2.5, vehicleId: 'v4', driverId: 'd4', booked: 9, price: 15000, status: 'scheduled' },
    { id: 'a5', from: 'بغداد', to: 'السليمانية', ...at(24 * 60 - 120), hours: 5.5, vehicleId: 'v5', driverId: 'd5', booked: 12, price: 30000, status: 'scheduled' },
  ];
}

export const findVehicle = (list: AgencyVehicle[], id: string) => list.find((v) => v.id === id);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function codeFor(seed: string, k: number) {
  let h = 2166136261;
  for (const ch of `${seed}#${k}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_CHARS[h % CODE_CHARS.length];
    h = Math.imul(h ^ (h >>> 13), 2246822519) >>> 0;
  }
  return out;
}

/** The passengers booked on an agency trip (demo): seats 1..booked in small groups. */
export function agencyManifest(t: AgencyTrip): Booking[] {
  const out: Booking[] = [];
  let seat = 1;
  let k = 0;
  const offset = t.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  while (seat <= t.booked) {
    const size = Math.min(k % 4 === 0 ? 2 : 1, t.booked - seat + 1);
    const seats = Array.from({ length: size }, (_, i) => seat + i);
    out.push({
      code: codeFor(t.id, k),
      tripId: t.id,
      date: t.date,
      seats,
      name: DEMO_PASSENGERS[(offset + k) % DEMO_PASSENGERS.length],
      phone: `77${String(10000000 + ((offset * 7919 + k * 104729) % 89999999)).slice(0, 8)}`,
      total: t.price * size,
      discount: 0,
      pay: k % 3 === 0 ? 'نقداً' : k % 3 === 1 ? 'زين كاش' : 'بطاقة',
      status: t.status === 'cancelled' ? 'cancelled' : 'confirmed',
      createdAt: 0,
    });
    seat += size;
    k++;
  }
  return out;
}

/** Minutes since the start of the trip's day, so two trips can be compared. */
export function span(date: string, time: string, hours: number) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(`${date}T00:00:00`).getTime() / 60000 + h * 60 + m;
  return [start, start + Math.round(hours * 60)] as const;
}
