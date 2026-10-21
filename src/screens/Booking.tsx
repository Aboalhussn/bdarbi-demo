import { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { COUPONS, garageById, longDate, money, newCode, todayIso, tripById, type Trip } from '../data';
import { Icon } from '../icons';
import { ticketPayload, tripOf, useStore, type Booking } from '../store';
import { QR, Sheet, TabBar, TopBar } from '../ui';
import { Avatar } from './Account';

const FAMILY_MAX = 12;

function takenSeats(trip: Trip, date: string, bookings: Booking[]) {
  const mine = bookings.filter((b) => b.tripId === trip.id && b.date === date && b.status === 'confirmed').flatMap((b) => b.seats);
  return new Set([...trip.booked, ...mine]);
}

export function Seats() {
  const { route, go, bookings } = useStore();
  const trip = tripById(String(route.params?.tripId)) ?? null;
  const date = String(route.params?.date ?? todayIso());
  const [sel, setSel] = useState<number[]>([]);
  const wanted = Number(route.params?.count ?? 0);
  const [family, setFamily] = useState(route.params?.family === true || wanted > 1);
  const [warn, setWarn] = useState('');
  const taken = useMemo(() => (trip ? takenSeats(trip, date, bookings) : new Set<number>()), [trip, date, bookings]);

  if (!trip) return <Missing />;
  // A family books several seats together; someone travelling alone books one seat.
  const limit = family ? Math.min(wanted > 1 ? wanted : FAMILY_MAX, trip.capacity) : 1;
  const exact = family && wanted > 1;

  const pick = (n: number) => {
    if (taken.has(n)) return;
    if (sel.includes(n)) {
      setSel(sel.filter((x) => x !== n));
      setWarn('');
      return;
    }
    if (!family) {
      setSel([n]);
      setWarn('');
      return;
    }
    if (sel.length >= limit) {
      setWarn(exact ? `اخترت ${limit} مقاعد، عدد أفراد العائلة. شيل مقعد إذا تريد تبدّل.` : `أكثر شي ${limit} مقاعد بالحجز الواحد.`);
      return;
    }
    setSel([...sel, n].sort((a, b) => a - b));
    setWarn('');
  };

  const seatBtn = (n: number) => {
    const isTaken = taken.has(n);
    const on = sel.includes(n);
    const lady = trip.ladies.includes(n);
    return (
      <button key={n} className={`seat ${on ? 'on' : isTaken ? 'taken' : lady ? 'lady' : ''}`} disabled={isTaken} aria-pressed={on} aria-label={`مقعد ${n}${isTaken ? ' محجوز' : ''}`} onClick={() => pick(n)}>
        {n}
      </button>
    );
  };

  const rows = [];
  if (trip.kind !== 'سيارة') {
    for (let r = 0; r < trip.capacity / 4; r++) {
      const b = r * 4;
      rows.push(
        <div key={r} className="row gap8">
          {seatBtn(b + 1)}
          {seatBtn(b + 2)}
          <div className="grow center tiny" style={{ color: '#B0ADC2' }}>{r + 1}</div>
          {seatBtn(b + 3)}
          {seatBtn(b + 4)}
        </div>,
      );
    }
  }

  const hint = warn || (family ? (exact ? `اختار ${limit} مقاعد لأفراد العائلة، يفضّل جنب بعض.` : 'عائلة: تكدر تحجز أكثر من مقعد بنفس الحجز.') : 'مسافر وحده: مقعد واحد. مقاعد النساء باللون الوردي.');

  return (
    <div className="screen">
      <TopBar title="اختار المقعد اللي تريده" sub={<>{trip.company} · {trip.kind} {trip.capacity} مقعد · <span className="num">{trip.time}</span> · {longDate(date)}</>} />
      <div className="legend" style={{ padding: '0 20px 10px' }}>
        <span><i style={{ border: '1.5px solid var(--mist)' }} />متوفر</span>
        <span><i style={{ background: 'var(--navy)' }} />اختيارك</span>
        <span><i style={{ background: '#DCDAE6' }} />محجوز</span>
        {trip.ladies.length ? <span><i style={{ background: '#F7D9DE' }} />نساء</span> : null}
      </div>
      <div className="scroll pad" style={{ paddingBottom: 20 }}>
        {trip.kind === 'سيارة' ? (
          <div className="bus" style={{ maxWidth: 230, borderRadius: '70px 70px 34px 34px', padding: '34px 30px 30px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div aria-label="السائق" role="img" style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>
                <Icon name="wheel" size={24} />
              </div>
              {seatBtn(1)}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 34 }}>
              {seatBtn(2)}
              {seatBtn(3)}
              {seatBtn(4)}
            </div>
          </div>
        ) : (
          <div className="bus">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
              <div aria-label="السائق" role="img" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>
                <Icon name="wheel" size={22} />
              </div>
              <div className="tiny muted">الباب</div>
            </div>
            <div className="stack gap6">{rows}</div>
          </div>
        )}
      </div>
      <div className="bottombar stack gap10" style={{ borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 30px rgba(11,5,88,.08)', borderTop: 0 }}>
        <div className="seg" role="radiogroup" aria-label="نوع المسافرين">
          <button role="radio" aria-checked={!family} className={!family ? 'on' : ''} onClick={() => { setFamily(false); setSel(sel.slice(0, 1)); setWarn(''); }}>مسافر وحده</button>
          <button role="radio" aria-checked={family} className={family ? 'on' : ''} onClick={() => { setFamily(true); setWarn(''); }}>عائلة</button>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="small muted">المقاعد المختارة <b style={{ color: 'var(--navy)' }}>(<span className="num">{sel.length}/{limit}</span>)</b></div>
            <div className="bold">{sel.length ? sel.map((n) => `رقم ${n}`).join('، ') : 'ما اخترت بعد'}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="small muted">المجموع</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 21, color: 'var(--navy)' }}>{money(sel.length * trip.price)} <span style={{ fontSize: 12 }}>د.ع</span></div>
          </div>
        </div>
        <div className="tiny bold" style={{ color: warn ? '#B23A4C' : 'var(--slate)', minHeight: 18 }}>{hint}</div>
        <button className="btn" disabled={!sel.length || (exact && sel.length !== limit)} onClick={() => go('checkout', { tripId: trip.id, date, seats: sel, family })}>
          {exact && sel.length !== limit ? `باقي تختار ${limit - sel.length}` : sel.length > 1 ? `حجز ${sel.length} مقاعد` : 'حجز المقعد'}
        </button>
      </div>
    </div>
  );
}

function Missing() {
  const { reset } = useStore();
  return (
    <div className="screen">
      <TopBar title="" />
      <div className="empty">
        <Icon name="info" size={40} />
        <b>ما لكينا هالرحلة</b>
        <button className="btn sm" style={{ width: 200 }} onClick={() => reset('home')}>رجوع للرئيسية</button>
      </div>
    </div>
  );
}

const BASE_PAYMENTS = [
  { id: 'cash', label: 'نقداً بالكراج', note: 'ادفع للسائق قبل الحركة', icon: 'cash' },
  { id: 'zain', label: 'زين كاش', note: 'تحويل من محفظتك', icon: 'wallet' },
];

export function Checkout() {
  const { route, name, phone, addBooking, reset, go, usedCoupons, set, bookings, card } = useStore();
  const PAYMENTS = [
    ...BASE_PAYMENTS,
    card
      ? { id: 'card', label: `${card.brand} ${card.first4} ••••`, note: 'بطاقتك المحفوظة', icon: 'card' }
      : { id: 'card', label: 'بطاقة (ماستر / كي كارد)', note: 'ضيف بطاقة بالمحفظة أول', icon: 'card' },
  ];
  const trip = tripById(String(route.params?.tripId));
  const date = String(route.params?.date ?? todayIso());
  const seats = (route.params?.seats as number[] | undefined) ?? [];
  const [fullName, setFullName] = useState(name && name !== 'ضيف' ? name : '');
  const [pay, setPay] = useState('cash');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | null>(null);
  const [cErr, setCErr] = useState('');
  const [nErr, setNErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!trip || !seats.length) return <Missing />;
  const garage = garageById(trip.garageId);
  const subtotal = trip.price * seats.length;
  const discount = applied ? COUPONS[applied].apply(subtotal) : 0;
  const total = subtotal - discount;

  const apply = () => {
    const c = coupon.trim().toUpperCase();
    if (!c) return;
    if (!COUPONS[c]) return setCErr('هذا الكوبون مو صحيح');
    if (usedCoupons.includes(c)) return setCErr('استخدمت هذا الكوبون قبل');
    if (c === 'WELCOME' && bookings.length > 0) return setCErr('WELCOME بس لأول حجز');
    setApplied(c);
    setCErr('');
  };

  const confirm = () => {
    if (fullName.trim().length < 2) {
      setNErr('اكتب اسم المسافر');
      return;
    }
    // Seats could have been taken meanwhile — check again before booking.
    const taken = takenSeats(trip, date, bookings);
    if (seats.some((s) => taken.has(s))) {
      setNErr('واحد من المقاعد انحجز هسه، ارجع واختار غيره.');
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      const code = newCode();
      addBooking({
        code,
        tripId: trip.id,
        date,
        seats,
        name: fullName.trim(),
        phone,
        total,
        discount,
        pay: PAYMENTS.find((p) => p.id === pay)!.label,
        status: 'confirmed',
        createdAt: Date.now(),
      });
      if (applied) set({ usedCoupons: [...usedCoupons, applied] });
      reset('home');
      go('ticket', { code, fresh: true });
    }, 900);
  };

  return (
    <div className="screen">
      <TopBar title="تأكيد الحجز" />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 20 }}>
        <div className="card stack gap10">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="bold">{trip.company}</span>
            <span className="pill info">{trip.kind}</span>
          </div>
          <div className="row gap12">
            <div>
              <div className="num" style={{ fontWeight: 800, fontSize: 24, color: 'var(--navy)' }}>{trip.time}</div>
              <div className="small muted">{trip.from}</div>
            </div>
            <span className="dash" />
            <span className="tiny muted">{trip.duration}</span>
            <span className="dash" />
            <div style={{ textAlign: 'left' }}>
              <div className="num" style={{ fontWeight: 800, fontSize: 24, color: 'var(--navy)' }}>{trip.arrive}</div>
              <div className="small muted">{trip.to}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">التاريخ</span><b>{longDate(date)}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">الكراج</span><b>{garage.name}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المقاعد</span><b>{seats.join('، ')}</b></div>
        </div>

        <div className="field">
          <label htmlFor="pname">اسم المسافر</label>
          <input id="pname" className={`input ${nErr ? 'bad' : ''}`} placeholder="الاسم الثلاثي" value={fullName} onChange={(e) => { setFullName(e.target.value); setNErr(''); }} />
          <div className="err">{nErr}</div>
        </div>

        <div className="stack gap8">
          <span className="label">طريقة الدفع</span>
          {PAYMENTS.map((p) => (
            <button key={p.id} role="radio" aria-checked={pay === p.id} className={`radio ${pay === p.id ? 'on' : ''}`} onClick={() => (p.id === 'card' && !card ? go('wallet') : setPay(p.id))}>
              <span className="dot" />
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{p.label}</span>
                <span className="tiny muted">{p.note}</span>
              </span>
              <span style={{ color: 'var(--navy)' }}><Icon name={p.icon} size={22} /></span>
            </button>
          ))}
          {pay !== 'cash' ? <div className="demo-note" style={{ margin: 0 }}>نسخة تجريبية: الدفع الإلكتروني ما يسحب فلوس حقيقية.</div> : null}
        </div>

        <div className="stack gap8">
          <span className="label">عندك كوبون؟</span>
          <div className="row gap8">
            <input className={`input grow ${cErr ? 'bad' : ''}`} dir="ltr" style={{ textTransform: 'uppercase', fontFamily: 'var(--display)', letterSpacing: 2 }} placeholder="WELCOME" value={coupon} disabled={!!applied} onChange={(e) => { setCoupon(e.target.value); setCErr(''); }} />
            {applied ? (
              <button className="btn soft sm" style={{ width: 96 }} onClick={() => { setApplied(null); setCoupon(''); }}>إلغاء</button>
            ) : (
              <button className="btn sm" style={{ width: 96 }} onClick={apply}>تطبيق</button>
            )}
          </div>
          <div className={cErr ? 'err' : 'small'} style={{ color: applied ? 'var(--success)' : undefined, fontWeight: 600 }}>{cErr || (applied ? `✓ ${COUPONS[applied].label}` : 'جرّب: WELCOME أو EID2026')}</div>
        </div>

        <div className="card flat stack gap6">
          <div className="row small" style={{ justifyContent: 'space-between' }}><span>{seats.length} × {money(trip.price)}</span><span className="num">{money(subtotal)}</span></div>
          {discount ? <div className="row small" style={{ justifyContent: 'space-between', color: 'var(--success)' }}><span>الخصم</span><span className="num">-{money(discount)}</span></div> : null}
          <div className="row" style={{ justifyContent: 'space-between' }}><b>المجموع</b><b className="num" style={{ fontSize: 20, color: 'var(--navy)' }}>{money(total)} د.ع</b></div>
        </div>
      </div>
      <div className="bottombar">
        <button className="btn" disabled={busy} onClick={confirm}>{busy ? 'جاري الحجز…' : `ثبّت الحجز · ${money(total)} د.ع`}</button>
      </div>
    </div>
  );
}

export function Ticket() {
  const { route, bookings, reset, boardedAt, cancelBooking, showToast, name } = useStore();
  const code = String(route.params?.code);
  const fresh = route.params?.fresh === true;
  const b = bookings.find((x) => x.code === code);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!b) return <Missing />;
  const trip = tripOf(b);
  const garage = garageById(trip.garageId);
  const boarded = boardedAt(b);
  const cancelled = b.status === 'cancelled';
  const past = b.date < todayIso();

  const share = async () => {
    const text = `تذكرتي ببدربي 🎫\n${trip.from} ← ${trip.to}\n${longDate(b.date)} · ${trip.time}\n${garage.name} · مقاعد ${b.seats.join('، ')}\nرمز الحجز: ${b.code}`;
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title: 'تذكرة بدربي', text, dialogTitle: 'مشاركة التذكرة' });
      else if (navigator.share) await navigator.share({ title: 'تذكرة بدربي', text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('انسخت تفاصيل التذكرة');
      }
    } catch {
      /* closed */
    }
  };

  return (
    <div className="screen navy hero" style={{ borderRadius: 0 }}>
      <div className="scroll" style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
        <div className="row gap14" style={{ padding: '14px 20px 0', alignItems: 'center' }}>
          <img src="./img/mascot.png" alt="" style={{ height: 180, width: 'auto', flexShrink: 0 }} />
          <div className="grow">
            {fresh ? (
              <>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#2FB36B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={24} stroke={3} /></div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>تم الحجز!</h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,.8)', fontSize: 14 }}>رحلة سعيدة يا {name && name !== 'ضيف' ? name : b.name.split(' ')[0]}، تذكرتك هنا وبـ «رحلاتي».</p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 30, fontWeight: 800 }}>تذكرتك</h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,.8)', fontSize: 14 }}>{trip.from} ← {trip.to} · {longDate(b.date)}</p>
              </>
            )}
          </div>
        </div>

        <div className="ticket" style={{ margin: '6px 20px 0' }}>
          {boarded ? <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 20px', fontWeight: 700 }}>صعدت ✓ <span className="num" style={{ fontWeight: 600 }}>{boarded}</span> — رحلة سعيدة!</div> : null}
          {cancelled ? <div style={{ background: 'var(--alert-bg)', color: 'var(--alert)', padding: '10px 20px', fontWeight: 700 }}>هذا الحجز ملغي</div> : null}
          <div style={{ padding: '18px 20px 14px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="bold">{trip.company}</span>
              <span className="code small muted" style={{ letterSpacing: 1 }}>#{b.code}</span>
            </div>
            <div className="row gap12" style={{ marginTop: 14 }}>
              <div>
                <div className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--navy)' }}>{trip.time}</div>
                <div className="small muted">{trip.from} · {garage.name.replace('كراج ', '')}</div>
              </div>
              <span className="dash" />
              <span style={{ color: 'var(--mist)' }}><Icon name="bus" size={20} /></span>
              <span className="dash" />
              <div style={{ textAlign: 'left' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--navy)' }}>{trip.arrive}</div>
                <div className="small muted">{trip.to}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, marginTop: 16 }}>
              <div><div className="tiny muted">التاريخ</div><div className="bold small">{longDate(b.date)}</div></div>
              <div><div className="tiny muted">المقاعد</div><div className="bold small">{b.seats.join('، ')}</div></div>
              <div><div className="tiny muted">الرصيف</div><div className="bold small num" style={{ direction: 'ltr', textAlign: 'right' }}>{trip.platform}</div></div>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="muted">{b.name} · {b.pay}</span>
              <b className="num">{money(b.total)} د.ع</b>
            </div>
          </div>
          <div className="cut"><i /></div>
          <div className="row gap14" style={{ padding: '12px 20px 22px' }}>
            <div style={{ opacity: cancelled ? 0.25 : 1 }}><QR text={ticketPayload(b)} /></div>
            <div className="grow">
              <div className="bold">اعرض الرمز للسائق</div>
              <div className="small muted" style={{ marginTop: 4 }}>إذا ما اشتغل المسح، السائق يكتب هذا الرمز:</div>
              <div className="code" style={{ fontSize: 22, color: 'var(--navy)', marginTop: 4 }}>{b.code}</div>
            </div>
          </div>
        </div>

        <div className="row gap10" style={{ margin: '16px 20px 0' }}>
          <button className="btn sm" style={{ background: 'rgba(255,255,255,.12)' }} onClick={() => void share()}><Icon name="share" size={18} /> مشاركة</button>
          {!cancelled && !boarded && !past ? (
            <button className="btn sm" style={{ background: 'rgba(255,255,255,.12)' }} onClick={() => setConfirmCancel(true)}><Icon name="x" size={18} /> إلغاء الحجز</button>
          ) : null}
        </div>
        <div style={{ margin: '12px 20px 0' }}>
          <button className="btn light" onClick={() => reset('home')}>رجوع للرئيسية</button>
        </div>
      </div>
      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} label="إلغاء الحجز">
        <div className="stack gap12" style={{ color: 'var(--ink)' }}>
          <h2 className="h2">متأكد تلغي الحجز؟</h2>
          <p className="muted" style={{ margin: 0 }}>المقاعد {b.seats.join('، ')} ترجع متاحة لغيرك.</p>
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={() => { cancelBooking(b.code); setConfirmCancel(false); showToast('انلغى الحجز'); }}>إي، الغي الحجز</button>
          <button className="btn soft" onClick={() => setConfirmCancel(false)}>لا، خلّيه</button>
        </div>
      </Sheet>
    </div>
  );
}

export function MyTrips() {
  const { bookings, go, boardedAt } = useStore();
  const [tab, setTab] = useState<'up' | 'past' | 'cancel'>('up');
  const today = todayIso();
  const list = bookings.filter((b) => (tab === 'cancel' ? b.status === 'cancelled' : b.status === 'confirmed' && (tab === 'up' ? b.date >= today : b.date < today)));
  return (
    <div className="screen">
      <div className="topbar"><div className="title" style={{ fontSize: 24, fontWeight: 800 }}>رحلاتي</div></div>
      <div className="pad">
        <div className="seg">
          <button className={tab === 'up' ? 'on' : ''} onClick={() => setTab('up')}>القادمة</button>
          <button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>السابقة</button>
          <button className={tab === 'cancel' ? 'on' : ''} onClick={() => setTab('cancel')}>الملغية</button>
        </div>
      </div>
      <div className="scroll with-tabs pad stack gap10" style={{ paddingTop: 14 }}>
        {list.length === 0 ? (
          <div className="empty">
            <img src="./img/mascot.png" alt="" style={{ height: 160 }} />
            <b style={{ color: 'var(--ink)' }}>{tab === 'up' ? 'ما عندك رحلات جاية' : tab === 'past' ? 'بعد ما سافرت ويانا' : 'ما عندك حجوزات ملغية'}</b>
            {tab === 'up' ? <button className="btn sm" style={{ width: 200 }} onClick={() => go('trips')}>احجز رحلة</button> : null}
          </div>
        ) : (
          list.map((b) => {
            const t = tripOf(b);
            const boarded = boardedAt(b);
            return (
              <button key={b.code} className="card stack gap8" style={{ textAlign: 'right' }} onClick={() => go('ticket', { code: b.code })}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="bold">{t.from} ← {t.to}</span>
                  <span className={`pill ${b.status === 'cancelled' ? 'bad' : boarded ? 'info' : 'ok'}`}>{b.status === 'cancelled' ? 'ملغية' : boarded ? 'صعدت ✓' : 'مؤكدة'}</span>
                </div>
                <div className="row gap10 small muted">
                  <span>{longDate(b.date)}</span>·<span className="num">{t.time}</span>·<span>مقاعد {b.seats.join('، ')}</span>
                  <span className="grow" />
                  <span className="code" style={{ letterSpacing: 1 }}>{b.code}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <TabBar active="myTrips" />
    </div>
  );
}

export function Profile() {
  const { name, phone, points, bookings, go, reset, set, resetDemo, avatar, card } = useStore();
  const [about, setAbout] = useState(false);
  const [wipe, setWipe] = useState(false);
  const items: [string, string, () => void][] = [
    ['user', 'معلوماتك الشخصية', () => go('personalInfo')],
    ['wallet', card ? `المحفظة · بطاقة ${card.first4} ••••` : 'المحفظة', () => go('wallet')],
    ['ticket', 'رحلاتي', () => go('myTrips')],
    ['gift', 'المكافآت والكوبونات', () => go('rewards')],
    ['hotel', 'الفنادق', () => go('hotels')],
    ['van', 'كوستر خاص', () => go('coaster')],
    ['pin', 'الكراجات', () => go('garages')],
    ['wheel', 'جرّب تطبيق السائق', () => { set({ role: null }); reset('login'); go('login', { driver: true }); }],
    ['info', 'عن النسخة التجريبية', () => setAbout(true)],
    ['refresh', 'مسح بيانات التجربة', () => setWipe(true)],
  ];
  return (
    <div className="screen">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(26px + var(--safe-top))', paddingBottom: 26 }}>
          <div className="pad row gap14">
            <button onClick={() => go('personalInfo')} aria-label="معلوماتك الشخصية"><Avatar size={72} src={avatar} /></button>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{name || 'ضيف'}</div>
              <div className="num small" style={{ opacity: 0.8, textAlign: 'right' }}>{phone ? `+964 ${phone}` : 'ما مسجّل رقم'}</div>
            </div>
          </div>
          <div className="pad row gap10" style={{ marginTop: 20 }}>
            {[[String(bookings.filter((b) => b.status === 'confirmed').length), 'حجوزات'], [String(points), 'نقطة'], ['4.9', 'تقييمك']].map(([v, l]) => (
              <div key={l} className="grow center" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '10px 0' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 20 }}>{v}</div>
                <div className="tiny" style={{ opacity: 0.8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="pad" style={{ marginTop: 10 }}>
          {items.map(([icon, label, fn]) => (
            <button key={label} className="list-item" onClick={fn}>
              <span className="ic"><Icon name={icon} size={22} /></span>
              <span className="grow bold">{label}</span>
              <Icon name="forward" size={18} />
            </button>
          ))}
          <button className="list-item" onClick={() => { set({ role: null }); reset('login'); }} style={{ color: 'var(--alert)' }}>
            <span className="ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}><Icon name="logout" size={22} /></span>
            <span className="grow bold">تسجيل خروج</span>
          </button>
        </div>
      </div>
      <TabBar active="profile" />
      <Sheet open={about} onClose={() => setAbout(false)} label="عن النسخة التجريبية">
        <AboutDemo onClose={() => setAbout(false)} />
      </Sheet>
      <Sheet open={wipe} onClose={() => setWipe(false)} label="مسح البيانات">
        <div className="stack gap12">
          <h2 className="h2">نمسح بيانات التجربة؟</h2>
          <p className="muted" style={{ margin: 0 }}>كل الحجوزات والإعدادات بهذا التلفون ترجع مثل أول مرة.</p>
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={resetDemo}>إي، امسح</button>
          <button className="btn soft" onClick={() => setWipe(false)}>لا</button>
        </div>
      </Sheet>
    </div>
  );
}

export function AboutDemo({ onClose }: { onClose: () => void }) {
  return (
    <div className="stack gap10">
      <h2 className="h2">نسخة بدربي التجريبية</h2>
      <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>
        هذي نسخة عرض (Demo) حتى تشوف فكرة التطبيق. كل البيانات تجريبية ومحفوظة بتلفونك بس، وما اكو دفع حقيقي.
        بالنسخة النهائية راح يكون تطبيقين منفصلين: «بدربي» للمسافر و«بدربي سائق» للسائق ومكاتب السفر.
      </p>
      <ul className="small" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.9 }}>
        <li>احجز رحلة، وتذكرتك تطلع بيها QR.</li>
        <li>ادخل كسائق وامسح التذكرة من تلفون ثاني، أو اكتب رمز الحجز.</li>
        <li>الفنادق: الحجز يكون مباشرة ويا الفندق بالواتساب أو الاتصال.</li>
      </ul>
      <button className="btn" onClick={onClose}>تمام</button>
    </div>
  );
}
