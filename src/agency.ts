export const AGENCY_NAME = 'مكتب دجلة للسفر والسياحة';

export interface AgencyVehicle {
  id: string;
  label: string; // e.g. باص 40
  kind: 'باص' | 'كوستر' | 'GMC';
  model: string;
  plate: string;
  seats: number;
}

export interface AgencyDriver {
  id: string;
  name: string;
  phone: string;
  rating: string;
  vehicleId: string;
  status: 'active' | 'invited';
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
}

export const AGENCY_VEHICLES: AgencyVehicle[] = [
  { id: 'v1', label: 'باص 40', kind: 'باص', model: 'مرسيدس ترافيغو', plate: 'بغداد 48213 أ', seats: 40 },
  { id: 'v2', label: 'كوستر 14', kind: 'كوستر', model: 'تويوتا كوستر', plate: 'بغداد 33790 ب', seats: 14 },
  { id: 'v3', label: 'GMC 7', kind: 'GMC', model: 'جي إم سي يوكن', plate: 'بغداد 61025 ج', seats: 7 },
  { id: 'v4', label: 'كوستر 14', kind: 'كوستر', model: 'تويوتا كوستر', plate: 'بغداد 27401 د', seats: 14 },
  { id: 'v5', label: 'باص 40', kind: 'باص', model: 'كينغ لونغ', plate: 'بغداد 55118 هـ', seats: 40 },
  { id: 'v6', label: 'GMC 7', kind: 'GMC', model: 'جي إم سي سييرا', plate: 'بغداد 70342 و', seats: 7 },
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

export const vehicleById = (id: string) => AGENCY_VEHICLES.find((v) => v.id === id) ?? AGENCY_VEHICLES[0];

/** Minutes since the start of the trip's day, so two trips can be compared. */
export function span(date: string, time: string, hours: number) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(`${date}T00:00:00`).getTime() / 60000 + h * 60 + m;
  return [start, start + Math.round(hours * 60)] as const;
}
