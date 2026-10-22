// Demo data. Everything lives on the phone — there is no server in this demo.

export type VehicleKind = 'باص' | 'VIP' | 'كوستر' | 'سيارة' | 'GMC';

export interface Garage {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
}

export interface Trip {
  id: string;
  from: string;
  to: string;
  garageId: string;
  endGarageId: string; // where the trip ends — shown to passengers as the drop-off point
  time: string; // HH:MM, 24h
  arrive: string;
  duration: string;
  company: string;
  rating: string;
  kind: VehicleKind;
  price: number;
  capacity: number;
  booked: number[]; // seat numbers already taken by other passengers
  ladies: number[];
  platform: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  near: string;
  rating: string;
  from: number;
  tint: string;
  rooms: { name: string; note: string; price: number }[];
  amenities: string[];
}

export const CITIES = ['بغداد', 'البصرة', 'أربيل', 'كربلاء المقدسة', 'النجف الأشرف', 'السليمانية'];

export const GARAGES: Garage[] = [
  { id: 'nahda', name: 'كراج النهضة', city: 'بغداد', address: 'ساحة النهضة، الرصافة', lat: 33.3412, lng: 44.4199, hours: '24 ساعة' },
  { id: 'allawi', name: 'كراج العلاوي', city: 'بغداد', address: 'العلاوي، قرب ساحة المتحف', lat: 33.3268, lng: 44.3806, hours: '5 ص - 11 م' },
  { id: 'bayaa', name: 'كراج البياع', city: 'بغداد', address: 'البياع، طريق المطار القديم', lat: 33.2669, lng: 44.3488, hours: '5 ص - 10 م' },
  { id: 'najaf', name: 'كراج النجف الموحد', city: 'النجف الأشرف', address: 'طريق كربلاء - النجف', lat: 32.0207, lng: 44.3412, hours: '24 ساعة' },
  { id: 'karbala', name: 'كراج كربلاء الموحد', city: 'كربلاء المقدسة', address: 'حي الحسين، مدخل المدينة', lat: 32.6026, lng: 44.0371, hours: '24 ساعة' },
  { id: 'basra', name: 'كراج البصرة الموحد', city: 'البصرة', address: 'طريق سفوان، الزبير', lat: 30.4853, lng: 47.7609, hours: '5 ص - 11 م' },
  { id: 'erbil', name: 'كراج أربيل', city: 'أربيل', address: 'شارع 100، قرب دوار عنكاوة', lat: 36.2081, lng: 44.0089, hours: '5 ص - 11 م' },
  { id: 'suli', name: 'كراج السليمانية', city: 'السليمانية', address: 'طريق كركوك، مدخل المدينة', lat: 35.5435, lng: 45.4021, hours: '5 ص - 10 م' },
];

const base: Record<string, { dur: string; hours: number; price: number }> = {
  'البصرة': { dur: '6 س ونص', hours: 6.5, price: 25000 },
  'أربيل': { dur: '5 ساعات', hours: 5, price: 30000 },
  'كربلاء المقدسة': { dur: 'ساعتين', hours: 2, price: 10000 },
  'النجف الأشرف': { dur: '3 ساعات', hours: 3, price: 12000 },
  'السليمانية': { dur: '5 س ونص', hours: 5.5, price: 32000 },
};

type Row = [string, string, string, VehicleKind, number, string];
const rows: Record<string, Row[]> = {
  'البصرة': [['07:30', 'نقل الرافدين', '4.9', 'باص', 14, 'nahda'], ['09:00', 'سفريات دجلة', '4.7', 'باص', 28, 'nahda'], ['11:15', 'الخطوط الذهبية', '4.8', 'VIP', 26, 'allawi'], ['14:00', 'حسين كاظم', '4.9', 'سيارة', 1, 'nahda']],
  'أربيل': [['06:45', 'الخطوط الذهبية', '4.8', 'VIP', 20, 'nahda'], ['10:30', 'سفريات كردستان', '4.6', 'باص', 25, 'nahda'], ['15:00', 'آزاد كريم', '4.7', 'سيارة', 1, 'allawi'], ['22:00', 'الخطوط الذهبية', '4.8', 'باص', 20, 'nahda']],
  'كربلاء المقدسة': [['07:00', 'نقل الفرات', '4.7', 'كوستر', 12, 'allawi'], ['08:30', 'سفريات الحسين', '4.8', 'باص', 33, 'allawi'], ['12:00', 'علي جبار', '4.8', 'سيارة', 2, 'bayaa'], ['17:30', 'سفريات الحسين', '4.8', 'باص', 18, 'allawi']],
  'النجف الأشرف': [['06:30', 'نقل الكوفة', '4.6', 'باص', 22, 'bayaa'], ['09:45', 'سفريات الغري', '4.7', 'كوستر', 20, 'bayaa'], ['13:15', 'نقل الكوفة', '4.6', 'باص', 14, 'nahda'], ['19:00', 'كرار عباس', '4.9', 'سيارة', 0, 'bayaa']],
  'السليمانية': [['07:15', 'سفريات آزادي', '4.6', 'VIP', 19, 'nahda'], ['11:00', 'نقل السليمانية', '4.5', 'باص', 16, 'nahda'], ['16:30', 'سفريات آزادي', '4.6', 'سيارة', 1, 'allawi'], ['23:00', 'نقل السليمانية', '4.5', 'باص', 12, 'nahda']],
};

export const DESTINATIONS = Object.keys(rows);

function capacityOf(kind: VehicleKind) {
  return kind === 'سيارة' ? 4 : kind === 'GMC' ? 7 : kind === 'كوستر' ? 24 : kind === 'VIP' ? 32 : 40;
}

function priceOf(kind: VehicleKind, p: number) {
  const m = kind === 'VIP' ? 1.4 : kind === 'سيارة' ? 1.6 : kind === 'كوستر' ? 0.9 : 1;
  return Math.round((p * m) / 500) * 500;
}

function seeded(seed: number, count: number, max: number, avoid: number[] = []) {
  const out: number[] = [];
  let s = seed;
  while (out.length < count && out.length < max - avoid.length) {
    s = (s * 9301 + 49297) % 233280;
    const n = 1 + Math.floor((s / 233280) * max);
    if (!out.includes(n) && !avoid.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

function addHours(time: string, h: number) {
  const [hh, mm] = time.split(':').map(Number);
  const total = (hh * 60 + mm + Math.round(h * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Default drop-off garage in each destination city.
const END_GARAGE: Record<string, string> = { 'البصرة': 'basra', 'أربيل': 'erbil', 'كربلاء المقدسة': 'karbala', 'النجف الأشرف': 'najaf', 'السليمانية': 'suli', 'بغداد': 'nahda' };

export const TRIPS: Trip[] = DESTINATIONS.flatMap((to, di) =>
  rows[to].map(([time, company, rating, kind, taken, garageId], i) => {
    const capacity = capacityOf(kind);
    const ladies = kind === 'سيارة' ? [] : [3, 4];
    return {
      id: `t${di}${i}`,
      from: 'بغداد',
      to,
      garageId,
      endGarageId: END_GARAGE[to],
      time,
      arrive: addHours(time, base[to].hours),
      duration: base[to].dur,
      company,
      rating,
      kind,
      price: priceOf(kind, base[to].price),
      capacity,
      booked: seeded(di * 97 + i * 13 + 7, Math.min(taken, capacity - 1), capacity, ladies),
      ladies,
      platform: `${'ABCD'[i]} · ${i + 2}`,
    };
  }),
);

// Trips back to Baghdad from each city (used by search).
const RETURN_GARAGE: Record<string, string> = { 'البصرة': 'basra', 'أربيل': 'erbil', 'كربلاء المقدسة': 'karbala', 'النجف الأشرف': 'najaf', 'السليمانية': 'suli' };
const RETURN_TIMES = ['06:00', '10:00', '15:30', '21:00'];
DESTINATIONS.forEach((from, di) => {
  rows[from].forEach(([, company, rating, kind, taken], i) => {
    const capacity = capacityOf(kind);
    const ladies = kind === 'سيارة' ? [] : [3, 4];
    const time = RETURN_TIMES[i];
    TRIPS.push({
      id: `r${di}${i}`,
      from,
      to: 'بغداد',
      garageId: RETURN_GARAGE[from],
      endGarageId: i % 2 === 0 ? 'nahda' : 'allawi',
      time,
      arrive: addHours(time, base[from].hours),
      duration: base[from].dur,
      company,
      rating,
      kind,
      price: priceOf(kind, base[from].price),
      capacity,
      booked: seeded(di * 53 + i * 29 + 3, Math.min(Math.max(taken - 3, 0), capacity - 1), capacity, ladies),
      ladies,
      platform: `${'ABCD'[i]} · ${i + 1}`,
    });
  });
});

// The driver signed in to the demo drives this trip (Baghdad → Basra). Its departure is
// always set a little ahead of "now" so a passenger can still book it and the driver can scan it.
export const DRIVER_TRIP_ID = 't00';
(() => {
  const t = TRIPS.find((x) => x.id === DRIVER_TRIP_ID)!;
  const now = new Date();
  let mins = now.getHours() * 60 + now.getMinutes() + 90;
  mins = Math.min(Math.ceil(mins / 30) * 30, 23 * 60 + 30);
  t.time = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  t.arrive = addHours(t.time, base[t.to].hours);
})();

export const HOTELS: Hotel[] = [
  {
    id: 'h1', name: 'فندق دار السلام', city: 'كربلاء المقدسة', near: '300 م عن الحرم', rating: '4.7', from: 40000, tint: '#DCD8EE',
    amenities: ['واي فاي', 'فطور', 'تكييف', 'موقف'],
    rooms: [
      { name: 'غرفة مفردة', note: 'سرير واحد · 18 م²', price: 40000 },
      { name: 'غرفة مزدوجة', note: 'سريرين · فطور مشمول', price: 55000 },
      { name: 'جناح عائلي', note: '4 أشخاص · إطلالة على الحرم', price: 90000 },
    ],
  },
  {
    id: 'h2', name: 'فندق قصر الغري', city: 'النجف الأشرف', near: '450 م عن الحرم', rating: '4.6', from: 35000, tint: '#FDF1D6',
    amenities: ['واي فاي', 'فطور', 'تكييف', 'مصعد'],
    rooms: [
      { name: 'غرفة مزدوجة', note: 'سريرين · 22 م²', price: 45000 },
      { name: 'غرفة ثلاثية', note: '3 أسرّة · فطور مشمول', price: 60000 },
      { name: 'جناح عائلي', note: '5 أشخاص · مطبخ صغير', price: 95000 },
    ],
  },
  {
    id: 'h3', name: 'فندق شط العرب', city: 'البصرة', near: 'على الكورنيش', rating: '4.5', from: 60000, tint: '#E6F4EC',
    amenities: ['واي فاي', 'مسبح', 'تكييف', 'موقف'],
    rooms: [
      { name: 'غرفة مفردة', note: 'إطلالة على الشط', price: 60000 },
      { name: 'غرفة مزدوجة', note: 'سرير كبير · فطور', price: 80000 },
      { name: 'جناح', note: 'صالة + غرفة نوم', price: 140000 },
    ],
  },
  {
    id: 'h4', name: 'فندق قلعة أربيل', city: 'أربيل', near: 'قرب القلعة والسوق', rating: '4.8', from: 70000, tint: '#EEEDF8',
    amenities: ['واي فاي', 'فطور', 'تدفئة', 'موقف'],
    rooms: [
      { name: 'غرفة مزدوجة', note: 'سريرين · 24 م²', price: 70000 },
      { name: 'غرفة عائلية', note: '4 أشخاص', price: 110000 },
      { name: 'جناح ملكي', note: 'إطلالة على القلعة', price: 180000 },
    ],
  },
];

export const COUPONS: Record<string, { label: string; apply: (total: number) => number }> = {
  WELCOME: { label: 'خصم 20% لأول حجز (أعلى شي 10,000)', apply: (t) => Math.min(Math.round(t * 0.2), 10000) },
  EID2026: { label: 'خصم 5,000 د.ع', apply: (t) => Math.min(5000, t) },
};

export const DEMO_PASSENGERS = ['علي حسن', 'فاطمة كريم', 'مصطفى جاسم', 'زينب علي', 'حيدر سعد', 'سجاد ناظم', 'نور الهدى', 'أحمد عماد', 'مريم صالح', 'كرار عباس', 'رقية محمد', 'حسن فلاح', 'آية قاسم', 'منتظر رعد'];

export function garageById(id: string) {
  return GARAGES.find((g) => g.id === id) ?? GARAGES[0];
}

export function tripById(id: string) {
  return TRIPS.find((t) => t.id === id);
}

export const money = (n: number) => n.toLocaleString('en-US');

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function dayList(count = 5) {
  const out: { iso: string; label: string; num: string; long: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label = i === 0 ? 'اليوم' : i === 1 ? 'باچر' : AR_DAYS[d.getDay()];
    out.push({ iso: isoDate(d), label, num: String(d.getDate()), long: `${AR_DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` });
  }
  return out;
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${AR_DAYS[date.getDay()]} ${d}/${m}`;
}

export function todayIso() {
  return isoDate(new Date());
}

// 6-character booking code without look-alike characters (no 0/O/1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** True when a trip leaving today has already gone (10 minutes of grace). */
export function departedToday(t: Trip) {
  const [h, m] = t.time.split(':').map(Number);
  const now = new Date();
  return h * 60 + m < now.getHours() * 60 + now.getMinutes() - 10;
}

/** Travel time between Baghdad and a city (either direction). */
export function routeInfo(city: string) {
  return base[city] ?? { dur: '—', hours: 4, price: 20000 };
}

export { addHours };

/** The vehicle registered to the demo driver. It is fixed: every new trip uses it. */
export const DRIVER_VEHICLE = { kind: 'باص' as VehicleKind, model: 'كيا جرانبيرد', seats: 40, plate: 'بغداد 48213 أ', color: 'أبيض', year: '2019' };

/** "19:30" → "7:30 م" (12-hour clock, ص before noon, م after). */
export function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
}

// Road waypoints from Baghdad to each city (the main highways), used to draw the route on the map.
const WAYPOINTS: Record<string, [number, number][]> = {
  'البصرة': [[33.06, 44.36], [32.48, 44.42], [31.99, 44.93], [31.31, 45.28], [31.05, 46.26], [30.75, 47.1]],
  'كربلاء المقدسة': [[33.06, 44.36], [32.78, 44.29]],
  'النجف الأشرف': [[33.06, 44.36], [32.48, 44.42], [32.05, 44.4]],
  'أربيل': [[33.81, 44.53], [34.89, 44.63], [35.47, 44.39], [35.75, 44.14]],
  'السليمانية': [[33.81, 44.53], [34.89, 44.63], [35.47, 44.39], [35.53, 44.83]],
};

/** The road between two garages as a list of [lat, lng] points. */
export function routePath(fromGarageId: string, toGarageId: string): [number, number][] {
  const a = garageById(fromGarageId);
  const b = garageById(toGarageId);
  let mid: [number, number][] = [];
  if (a.city === 'بغداد' && WAYPOINTS[b.city]) mid = WAYPOINTS[b.city];
  else if (b.city === 'بغداد' && WAYPOINTS[a.city]) mid = [...WAYPOINTS[a.city]].reverse();
  else if (WAYPOINTS[a.city] && WAYPOINTS[b.city]) mid = [...[...WAYPOINTS[a.city]].reverse(), [33.31, 44.37], ...WAYPOINTS[b.city]];
  return [[a.lat, a.lng], ...mid, [b.lat, b.lng]];
}

/** The point a fraction (0..1) of the way along a path, plus its total length in km. */
export function pointAlong(path: [number, number][], f: number): { pos: [number, number]; km: number } {
  const seg = path.slice(1).map((p, i) => distanceKm(path[i][0], path[i][1], p[0], p[1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, left / seg[i]) : 0;
      return { pos: [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t], km: total };
    }
    left -= seg[i];
  }
  return { pos: path[path.length - 1], km: total };
}
