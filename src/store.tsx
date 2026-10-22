import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { agencyManifest, seedAgencyTrips, span, SEED_DRIVERS, SEED_VEHICLES, AGENCY_NAME, type AgencyDriver, type AgencyTrip, type AgencyVehicle } from './agency';
import { seedPackages, type Package, type PkgBooking } from './packages';
import { DEMO_PASSENGERS, DRIVER_TRIP_ID, TRIPS, fmt12, todayIso, tripById, type VehicleKind } from './data';

export type Role = 'passenger' | 'driver' | 'agency';

export interface Passenger {
  seat: number;
  name: string;
  gender: 'male' | 'female';
}

export interface Booking {
  code: string;
  tripId: string;
  date: string;
  seats: number[];
  name: string;
  phone: string;
  total: number;
  discount: number;
  pay: string;
  status: 'confirmed' | 'cancelled';
  cancelledBy?: 'me' | 'captain';
  boardedAt?: string;
  createdAt: number;
  rating?: Rating;
  passengers?: Passenger[]; // one per seat
}

export interface Rating {
  stars: number;
  tags: string[];
  comment: string;
  at: number;
}

/** Live state of the captain's trip today — drives what passengers see on the map. */
export interface TripState {
  date: string;
  status: 'scheduled' | 'started' | 'arrived' | 'cancelled';
  delay: number; // minutes
  startedAt?: number; // ms
  arrivedAt?: number; // ms
}

export interface Notif {
  id: string;
  at: number;
  icon: string;
  title: string;
  body: string;
  read: boolean;
  tone?: 'ok' | 'warn' | 'bad' | 'info';
  link?: Route;
}

export interface CaptainVehicle {
  kind: VehicleKind;
  model: string;
  plate: string;
  seats: number;
  color: string;
  year: string;
}

/** A captain who signed up in this demo. Document photos are kept as small thumbnails. */
export interface CaptainAccount {
  name: string;
  phone: string;
  status: 'pending' | 'approved';
  submittedAt: number;
  vehicle: CaptainVehicle;
  docs: Record<string, string>;
  docInfo?: Record<string, [string, string][]>; // what the app read from each document
}

export interface DriverTripDraft {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  kind: VehicleKind;
  seats: number;
  price: number;
  arrive: string;
  garageId?: string;
  endGarageId?: string;
}

export interface SeatRequest {
  id: string;
  name: string;
  route: string;
  seats: number;
  when: string;
  status: 'new' | 'accepted' | 'declined';
}

interface Persisted {
  onboarded: boolean;
  role: Role | null;
  name: string;
  phone: string;
  garageId: string;
  bookings: Booking[];
  boarded: Record<string, string>; // booking code -> time boarded (for the driver demo passengers)
  driverTrips: DriverTripDraft[];
  requests: SeatRequest[];
  points: number;
  usedCoupons: string[];
  avatar: string; // small JPEG data URL, '' when none
  password: string;
  email: string;
  gender: '' | 'male' | 'female';
  card: SavedCard | null;
  tripState: TripState;
  notifications: Notif[];
  captain: CaptainAccount | null;
  captainProfile: CaptainProfile;
  withdrawals: Withdrawal[];
  support: { passenger: ChatMsg[]; captain: ChatMsg[]; agency: ChatMsg[] };
  agencyTrips: AgencyTrip[];
  agencyDrivers: AgencyDriver[];
  agencyVehicles: AgencyVehicle[];
  agencyInfo: { name: string; phone: string; email: string; address: string; logo: string };
  agencyDriverId: string | null; // set when the signed-in captain is an office driver
  packages: Package[];
  pkgBookings: PkgBooking[];
  captainNotifs: Notif[];
  captainCard: SavedCard | null; // where the captain's earnings are paid out
  goalsClaimed: string[]; // ids of captain challenges whose reward was collected
}

/** The captain's own details, edited from his profile (empty = use the account's). */
export interface CaptainProfile {
  name: string;
  phone: string;
  email: string;
  gender: '' | 'male' | 'female';
  avatar: string;
  password: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  at: number;
  status: 'pending' | 'paid';
}

export interface ChatMsg {
  id: string;
  from: 'me' | 'support';
  text: string;
  image?: string;
  at: number;
}

/** Only the first four digits are kept — the rest of the number and the CVV are never stored. */
export interface SavedCard {
  first4: string;
  holder: string;
  expiry: string; // MM/YY
  brand: string;
  addedAt: number;
}

export interface Route {
  name: string;
  params?: Record<string, unknown>;
}

const KEY = 'bdarbi-demo-v1';

const initial: Persisted = {
  onboarded: false,
  role: null,
  name: 'علي',
  phone: '',
  garageId: 'nahda',
  bookings: [],
  boarded: {},
  driverTrips: [],
  requests: [
    { id: 'r1', name: 'مرتضى سالم', route: 'بغداد ← البصرة', seats: 2, when: 'اليوم', status: 'new' },
    { id: 'r2', name: 'هدى جاسم', route: 'بغداد ← البصرة', seats: 1, when: 'اليوم', status: 'new' },
    { id: 'r3', name: 'عباس فاضل', route: 'البصرة ← بغداد', seats: 3, when: 'باچر 4:00 م', status: 'new' },
  ],
  points: 320,
  usedCoupons: [],
  avatar: '',
  password: '',
  email: '',
  gender: '',
  card: null,
  tripState: { date: '', status: 'scheduled', delay: 0 },
  notifications: [
    { id: 'n0', at: 0, icon: 'gift', title: 'هلا بيك ببدربي!', body: 'استخدم كوبون WELCOME وخذ خصم 20% على أول حجز.', read: false, tone: 'info', link: { name: 'rewards' } },
  ],
  captain: null,
  captainProfile: { name: '', phone: '', email: '', gender: '', avatar: '', password: '' },
  withdrawals: [],
  support: { passenger: [], captain: [], agency: [] },
  agencyTrips: seedAgencyTrips(),
  agencyDrivers: SEED_DRIVERS,
  agencyVehicles: SEED_VEHICLES,
  agencyInfo: { name: AGENCY_NAME, phone: '770 555 1234', email: 'info@dijla-travel.iq', address: 'بغداد، الكرادة داخل', logo: '' },
  agencyDriverId: null,
  packages: seedPackages(todayIso()),
  pkgBookings: [],
  captainNotifs: [
    { id: 'cn1', at: 0, icon: 'trophy', title: 'تحدي جديد 🏆', body: 'خلّص 3 رحلات خلال يومين واربح 25,000 د.ع تنضاف لمحفظتك.', read: false, tone: 'ok', link: { name: 'driverGoals' } },
    { id: 'cn0', at: 0, icon: 'star', title: 'تقييمك ★ 4.9', body: 'تقييمك عالي، فرحلاتك تطلع بأول نتائج البحث للمسافرين. كمّل هيج!', read: true, tone: 'info' },
  ],
  goalsClaimed: [],
  captainCard: null,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Persisted>;
      const merged = { ...initial, ...saved, support: { ...initial.support, ...(saved.support ?? {}) } };
      // Demo agency trips are placed around the first run — refresh them once every one has finished.
      if (!merged.agencyTrips.some((t) => span(t.date, t.time, t.hours)[1] > Date.now() / 60000)) merged.agencyTrips = seedAgencyTrips();
      // Keep the demo packages in the future: refresh the seeded ones once they've passed.
      if (merged.packages.filter((p) => p.createdAt === 0).every((p) => p.date < todayIso())) {
        merged.packages = [...seedPackages(todayIso()), ...merged.packages.filter((p) => p.createdAt !== 0)];
      }
      return merged;
    }
  } catch {
    /* storage not available — start fresh */
  }
  return initial;
}

/** Passengers already booked on the driver's trip (other people, seeded for the demo). */
export function seededManifest(): Booking[] {
  const trip = tripById(DRIVER_TRIP_ID)!;
  const codes = ['K7Q2XM', 'P3RW8A', 'H9TZ4C', 'B2MX7N', 'W5KJ3E', 'Q8LV2D', 'M4NC6T', 'R6YH2P'];
  const out: Booking[] = [];
  const seats = trip.booked;
  let i = 0;
  let k = 0;
  while (i < seats.length) {
    const size = k % 3 === 0 ? 2 : 1;
    const group = seats.slice(i, i + size);
    out.push({
      code: codes[k % codes.length],
      tripId: trip.id,
      date: todayIso(),
      seats: group,
      name: DEMO_PASSENGERS[k % DEMO_PASSENGERS.length],
      phone: '',
      total: trip.price * group.length,
      discount: 0,
      pay: k % 2 === 0 ? 'نقداً' : 'زين كاش',
      status: k === 5 ? 'cancelled' : 'confirmed',
      createdAt: 0,
    });
    i += size;
    k++;
  }
  return out;
}

const DEFAULT_BOARDED: Record<string, string> = { K7Q2XM: '07:05' };

// ---- QR payload: BDARBI1|code|tripId|date|seats|check ----------------------------
function check(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1679616;
  return h.toString(36).toUpperCase().padStart(4, '0');
}

export function ticketPayload(b: Booking) {
  const body = `BDARBI1|${b.code}|${b.tripId}|${b.date}|${b.seats.join('.')}`;
  return `${body}|${check(body)}`;
}

export function parsePayload(text: string): { code: string; tripId: string; date: string; seats: number[] } | null {
  const parts = text.trim().split('|');
  if (parts.length !== 6 || parts[0] !== 'BDARBI1') return null;
  const body = parts.slice(0, 5).join('|');
  if (check(body) !== parts[5]) return null;
  return { code: parts[1], tripId: parts[2], date: parts[3], seats: parts[4].split('.').map(Number).filter(Boolean) };
}

export type ScanOutcome =
  | { kind: 'ok'; booking: Booking }
  | { kind: 'already'; booking: Booking; at: string }
  | { kind: 'other'; tripLabel: string }
  | { kind: 'cancelled'; booking: Booking }
  | { kind: 'notToday'; date: string }
  | { kind: 'invalid' };

interface Store extends Persisted {
  route: Route;
  stackDepth: number;
  go: (name: string, params?: Record<string, unknown>) => void;
  replace: (name: string, params?: Record<string, unknown>) => void;
  reset: (name: string, params?: Record<string, unknown>) => void;
  back: () => boolean;
  set: (patch: Partial<Persisted>) => void;
  addBooking: (b: Booking) => void;
  cancelBooking: (code: string) => void;
  manifest: () => Booking[];
  boardedAt: (b: Booking) => string | undefined;
  verify: (input: string) => ScanOutcome;
  board: (code: string) => void;
  toast: string;
  showToast: (msg: string) => void;
  resetDemo: () => void;
  notify: (n: Omit<Notif, 'id' | 'at' | 'read'>, to?: 'passenger' | 'captain') => void;
  markAllRead: (as?: 'passenger' | 'captain') => void;
  trip: TripState; // today's state of the captain's trip
  myAgencyTrip: () => AgencyTrip | undefined; // the office driver's current trip
  addPkgBooking: (b: PkgBooking) => void;
  setTrip: (patch: Partial<TripState>) => void;
  rate: (code: string, r: Rating) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(load);
  const [stack, setStack] = useState<Route[]>([{ name: 'splash' }]);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data]);

  const set = useCallback((patch: Partial<Persisted>) => setData((d) => ({ ...d, ...patch })), []);
  const go = useCallback((name: string, params?: Record<string, unknown>) => setStack((s) => [...s, { name, params }]), []);
  const replace = useCallback((name: string, params?: Record<string, unknown>) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);
  const reset = useCallback((name: string, params?: Record<string, unknown>) => setStack([{ name, params }]), []);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
    setStack((s) => s.slice(0, -1));
    return true;
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  const store = useMemo<Store>(() => {
    const boardedMap = { ...DEFAULT_BOARDED, ...data.boarded };
    // An office driver works the trip the office gave him: today's, not yet finished.
    const myAgencyTrip = () => {
      if (!data.agencyDriverId) return undefined;
      const mine = data.agencyTrips
        .filter((t) => t.driverId === data.agencyDriverId && t.status !== 'cancelled' && t.status !== 'arrived' && t.date >= todayIso())
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return mine[0];
    };
    const manifest = () => {
      if (data.agencyDriverId) {
        const t = myAgencyTrip();
        return t ? agencyManifest(t) : [];
      }
      const mine = data.bookings.filter((b) => b.tripId === DRIVER_TRIP_ID && b.date === todayIso());
      return [...seededManifest(), ...mine];
    };
    const allBookings = () => [...seededManifest(), ...data.agencyTrips.flatMap(agencyManifest), ...data.bookings];
    const currentTripId = () => (data.agencyDriverId ? myAgencyTrip()?.id ?? '' : DRIVER_TRIP_ID);
    const boardedAt = (b: Booking) => b.boardedAt ?? boardedMap[b.code];

    const verify = (input: string): ScanOutcome => {
      const raw = input.trim().toUpperCase().replace(/\s+/g, '');
      let code = raw;
      let parsed: ReturnType<typeof parsePayload> = null;
      if (input.trim().startsWith('BDARBI1|')) {
        parsed = parsePayload(input);
        if (!parsed) return { kind: 'invalid' };
        code = parsed.code;
      }
      const found = allBookings().find((b) => b.code === code);
      if (!found && !parsed) return { kind: 'invalid' };
      const tripId = found?.tripId ?? parsed!.tripId;
      const date = found?.date ?? parsed!.date;
      if (tripId !== currentTripId()) {
        const t = tripById(tripId) ?? data.agencyTrips.find((x) => x.id === tripId);
        return { kind: 'other', tripLabel: t ? `${t.from} ← ${t.to} · ${fmt12(t.time)}` : 'رحلة ثانية' };
      }
      if (date !== todayIso()) return { kind: 'notToday', date };
      const booking: Booking = found ?? {
        code,
        tripId,
        date,
        seats: parsed!.seats,
        name: 'مسافر (من تلفون ثاني)',
        phone: '',
        total: 0,
        discount: 0,
        pay: '—',
        status: 'confirmed',
        createdAt: Date.now(),
      };
      if (booking.status === 'cancelled') return { kind: 'cancelled', booking };
      const at = boardedAt(booking);
      if (at) return { kind: 'already', booking, at };
      return { kind: 'ok', booking };
    };

    const board = (code: string) => {
      const now = new Date();
      const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setData((d) => ({
        ...d,
        boarded: { ...d.boarded, [code]: at },
        bookings: d.bookings.map((b) => (b.code === code ? { ...b, boardedAt: at } : b)),
      }));
    };

    return {
      ...data,
      myAgencyTrip,
      addPkgBooking: (b) =>
        setData((d) => {
          const p = d.packages.find((x) => x.id === b.pkgId);
          const n: Notif = { id: 'n' + Date.now(), at: Date.now(), read: false, icon: 'ticket', tone: 'ok', title: 'تأكد حجز السفرة ✓', body: `${p?.title ?? 'السفرة'} · ${b.adults + b.children} أشخاص. رمز الحجز ${b.code}.`, link: { name: 'pkgTicket', params: { code: b.code } } };
          return {
            ...d,
            pkgBookings: [b, ...d.pkgBookings],
            packages: d.packages.map((x) => (x.id === b.pkgId ? { ...x, booked: x.booked + b.adults + b.children } : x)),
            notifications: [n, ...d.notifications],
          };
        }),
      route: stack[stack.length - 1],
      stackDepth: stack.length,
      go,
      replace,
      reset,
      back,
      set,
      addBooking: (b) =>
        setData((d) => {
          const t = tripById(b.tripId);
          const n: Notif = { id: 'n' + Date.now(), at: Date.now(), read: false, icon: 'ticket', tone: 'ok', title: 'تأكد حجزك ✓', body: `${t ? `${t.from} ← ${t.to} · ${fmt12(t.time)}` : ''} · مقاعد ${b.seats.join('، ')}. رمز الحجز ${b.code}.`, link: { name: 'ticket', params: { code: b.code } } };
          return { ...d, bookings: [b, ...d.bookings], points: d.points + Math.round(b.total / 1000), notifications: [n, ...d.notifications] };
        }),
      cancelBooking: (code) => setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.code === code ? { ...b, status: 'cancelled', cancelledBy: 'me' } : b)) })),
      notify: (n, to = 'passenger') =>
        setData((d) => {
          const item: Notif = { ...n, id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), read: false };
          return to === 'captain'
            ? { ...d, captainNotifs: [item, ...d.captainNotifs].slice(0, 60) }
            : { ...d, notifications: [item, ...d.notifications].slice(0, 60) };
        }),
      markAllRead: (as = 'passenger') =>
        setData((d) => (as === 'captain'
          ? { ...d, captainNotifs: d.captainNotifs.map((x) => ({ ...x, read: true })) }
          : { ...d, notifications: d.notifications.map((x) => ({ ...x, read: true })) })),
      trip: data.tripState.date === todayIso() ? data.tripState : { date: todayIso(), status: 'scheduled', delay: 0 },
      setTrip: (patch) =>
        setData((d) => {
          const cur = d.tripState.date === todayIso() ? d.tripState : { date: todayIso(), status: 'scheduled' as const, delay: 0 };
          const next = { ...cur, ...patch };
          // A trip the captain cancels is cancelled for every passenger on it.
          const bookings = next.status === 'cancelled'
            ? d.bookings.map((b) => (b.tripId === DRIVER_TRIP_ID && b.date === todayIso() && b.status === 'confirmed' ? { ...b, status: 'cancelled' as const, cancelledBy: 'captain' as const } : b))
            : d.bookings;
          return { ...d, tripState: next, bookings };
        }),
      rate: (code, r) =>
        setData((d) => {
          const first = !d.bookings.find((b) => b.code === code)?.rating;
          return { ...d, points: d.points + (first ? 20 : 0), bookings: d.bookings.map((b) => (b.code === code ? { ...b, rating: r } : b)) };
        }),
      manifest,
      boardedAt,
      verify,
      board,
      toast,
      showToast,
      resetDemo: () => {
        setData({ ...initial });
        setStack([{ name: 'splash' }]);
      },
    };
  }, [data, stack, go, replace, reset, back, set, toast, showToast]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function tripOf(b: Booking) {
  return tripById(b.tripId) ?? TRIPS[0];
}
