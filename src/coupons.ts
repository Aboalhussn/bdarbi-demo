import { COUPONS, money } from './data';
import type { Booking } from './store';

/** A coupon the admin made: for everyone, or only for some users. */
export interface AdminCoupon {
  code: string;
  kind: 'percent' | 'amount';
  value: number; // % or د.ع
  max: number; // most a percent coupon can take off (0 = no cap)
  audience: 'all' | 'new' | 'trips' | 'phones';
  minTrips: number; // for 'trips'
  phones: string[]; // for 'phones' (10 digits, no leading 0)
  expires: string; // ISO date
  active: boolean;
  createdAt: number;
}

export function couponLabel(c: AdminCoupon) {
  const v = c.kind === 'percent' ? `خصم ${c.value}%${c.max ? ` (أعلى شي ${money(c.max)})` : ''}` : `خصم ${money(c.value)} د.ع`;
  return v;
}

export function audienceLabel(c: AdminCoupon) {
  return c.audience === 'all' ? 'لكل المستخدمين' : c.audience === 'new' ? 'المستخدمين الجدد' : c.audience === 'trips' ? `اللي كمّلوا ${c.minTrips} رحلات` : `${c.phones.length} أرقام محددة`;
}

/** Works out whether this user can use the code, and how much it takes off. */
export function resolveCoupon(code: string, ctx: { bookings: Booking[]; phone: string; used: string[]; admin: AdminCoupon[]; today: string }):
  | { ok: true; label: string; apply: (t: number) => number }
  | { ok: false; error: string } {
  const c = code.trim().toUpperCase();
  if (ctx.used.includes(c)) return { ok: false, error: 'استخدمت هذا الكوبون قبل' };
  const a = ctx.admin.find((x) => x.code === c);
  if (a) {
    if (!a.active) return { ok: false, error: 'هذا الكوبون موقّف' };
    if (a.expires && a.expires < ctx.today) return { ok: false, error: 'هذا الكوبون منتهي' };
    const done = ctx.bookings.filter((b) => b.status === 'confirmed').length;
    if (a.audience === 'new' && done > 0) return { ok: false, error: 'هذا الكوبون بس للمستخدمين الجدد' };
    if (a.audience === 'trips' && done < a.minTrips) return { ok: false, error: `هذا الكوبون للي كمّلوا ${a.minTrips} رحلات (انت ${done})` };
    if (a.audience === 'phones' && !a.phones.includes(ctx.phone.replace(/\s/g, ''))) return { ok: false, error: 'هذا الكوبون مو إلك' };
    return { ok: true, label: couponLabel(a), apply: (t) => (a.kind === 'percent' ? Math.min(Math.round((t * a.value) / 100), a.max || Infinity) : Math.min(a.value, t)) };
  }
  if (COUPONS[c]) {
    if (c === 'WELCOME' && ctx.bookings.length > 0) return { ok: false, error: 'WELCOME بس لأول حجز' };
    return { ok: true, label: COUPONS[c].label, apply: COUPONS[c].apply };
  }
  return { ok: false, error: 'هذا الكوبون مو صحيح' };
}
