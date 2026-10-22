import { DRIVER_TRIP_ID, todayIso, tripById } from './data';
import type { Booking, TripState } from './store';

export interface Live {
  status: 'scheduled' | 'started' | 'arrived' | 'cancelled';
  delay: number; // minutes the departure was pushed back
  startedAt?: number; // ms
  isCaptainTrip: boolean; // the captain in this demo drives it, so his buttons control it
  cancelledBy?: 'me' | 'captain';
}

function at(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).getTime();
}

/** Departure and arrival times (ms) of a booking, with any delay applied. */
export function times(b: Booking, delay = 0) {
  const t = tripById(b.tripId)!;
  const dep = at(b.date, t.time) + delay * 60000;
  let arr = at(b.date, t.arrive) + delay * 60000;
  if (arr <= dep) arr += 86400000;
  return { dep, arr };
}

/** Where a booking's trip is right now. The captain's own trip follows his buttons; others follow the clock. */
export function liveOf(b: Booking, trip: TripState): Live {
  const isCaptainTrip = b.tripId === DRIVER_TRIP_ID && b.date === todayIso();
  if (b.status === 'cancelled') return { status: 'cancelled', delay: 0, isCaptainTrip, cancelledBy: b.cancelledBy };
  if (isCaptainTrip) {
    return { status: trip.status, delay: trip.delay, startedAt: trip.startedAt, isCaptainTrip };
  }
  const { dep, arr } = times(b);
  const now = Date.now();
  return { status: now >= arr ? 'arrived' : now >= dep ? 'started' : 'scheduled', delay: 0, startedAt: dep, isCaptainTrip };
}
