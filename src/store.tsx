import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_PASSENGERS, DRIVER_TRIP_ID, TRIPS, fmt12, todayIso, tripById, type VehicleKind } from './data';

export type Role = 'passenger' | 'driver';

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
  boardedAt?: string;
  createdAt: number;
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
  card: SavedCard | null;
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
  card: null,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...(JSON.parse(raw) as Partial<Persisted>) };
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
    const manifest = () => {
      const mine = data.bookings.filter((b) => b.tripId === DRIVER_TRIP_ID && b.date === todayIso());
      return [...seededManifest(), ...mine];
    };
    const allBookings = () => [...seededManifest(), ...data.bookings];
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
      if (tripId !== DRIVER_TRIP_ID) {
        const t = tripById(tripId);
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
      route: stack[stack.length - 1],
      stackDepth: stack.length,
      go,
      replace,
      reset,
      back,
      set,
      addBooking: (b) => setData((d) => ({ ...d, bookings: [b, ...d.bookings], points: d.points + Math.round(b.total / 1000) })),
      cancelBooking: (code) => setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.code === code ? { ...b, status: 'cancelled' } : b)) })),
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
