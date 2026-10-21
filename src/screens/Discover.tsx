import { useEffect, useMemo, useState } from 'react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { DESTINATIONS, GARAGES, TRIPS, dayList, departedToday, distanceKm, garageById, longDate, money, todayIso, type Garage, type Trip } from '../data';
import { Icon } from '../icons';
import { tripOf, useStore, type Booking } from '../store';
import { Sheet, Stars, TabBar, Time, TopBar, openExternal } from '../ui';
import { CityPicker, DateField, prettyDate } from '../pickers';
import { Avatar } from './Account';

function seatsLeft(t: Trip, mine = 0) {
  return t.capacity - t.booked.length - mine;
}

function seatTag(t: Trip, mine = 0) {
  const left = seatsLeft(t, mine);
  if (left <= 0) return { text: 'مكتملة', cls: 'bad' };
  if (t.kind === 'سيارة') return { text: `باقي ${left} من 4`, cls: left <= 2 ? 'bad' : 'ok' };
  return left <= 4 ? { text: `باقي ${left}`, cls: 'bad' } : { text: `${left} مقعد`, cls: 'ok' };
}

export function Home() {
  const { name, garageId, go, bookings, points, avatar } = useStore();
  const garage = garageById(garageId);
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && b.date >= todayIso()).sort((a, b) => (a.date + tripOf(a).time).localeCompare(b.date + tripOf(b).time))[0];
  const today = TRIPS.filter((t) => t.garageId === garageId && !departedToday(t)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
  const [dest, setDest] = useState(DESTINATIONS[0]);
  const progress = Math.min(100, Math.round((points / 1000) * 100));

  return (
    <div className="screen">
      <div className="scroll with-tabs" style={{ paddingTop: 'calc(18px + var(--safe-top))' }}>
        <header className="pad row gap14">
          <button aria-label="حسابي" onClick={() => go('profile')}>
            <Avatar size={60} src={avatar} />
          </button>
          <div className="grow">
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 21, lineHeight: 1.4 }}>هلاو، {name || 'ضيف'}!</div>
            <div className="small muted">وين ناوي تروح اليوم؟</div>
          </div>
          <button className="chip" style={{ height: 36, padding: '0 12px', fontSize: 13, color: 'var(--navy)' }} onClick={() => go('garages')}>
            <Icon name="pin" size={14} stroke={2.4} /> {garage.name.replace('كراج ', '')}
          </button>
        </header>

        <button onClick={() => go('rewards')} style={{ display: 'block', position: 'relative', height: 214, margin: '22px 20px 0', width: 'calc(100% - 40px)', textAlign: 'right' }}>
          <div style={{ position: 'absolute', top: 0, right: 34, left: 34, height: 40, borderRadius: 18, background: 'var(--mist)' }} />
          <div style={{ position: 'absolute', top: 14, right: 16, left: 16, height: 40, borderRadius: 18, background: 'var(--lavender)' }} />
          <div style={{ position: 'absolute', top: 28, right: 0, left: 0, bottom: 0, borderRadius: 24, background: 'var(--navy)', color: '#fff', padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>المكافأة بالطريق!!</div>
              <span className="pill gold"><span className="num">{points}</span>&nbsp;نقطة</span>
            </div>
            <div className="row gap10" style={{ alignItems: 'flex-end' }}>
              <div className="grow stack" style={{ alignItems: 'center', gap: 4 }}>
                <div className="small" style={{ color: 'rgba(255,255,255,.8)' }}>رصيدك</div>
                <div className="num" style={{ width: '100%', height: 44, borderRadius: 14, background: 'var(--lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 21 }}>{points}</div>
              </div>
              <Icon name="bus" size={34} />
              <div className="grow stack" style={{ alignItems: 'center', gap: 4 }}>
                <div className="small" style={{ color: 'rgba(255,255,255,.8)' }}>رحلة مجانية</div>
                <div className="num" style={{ width: '100%', height: 44, borderRadius: 14, background: 'var(--lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 21 }}>1000</div>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'var(--gold)' }} />
            </div>
          </div>
        </button>

        <section style={{ marginTop: 24 }}>
          <div className="pad row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="h2">اختار الرحلة</h2>
            <button className="link small" onClick={() => go('trips', { dest })}>كل الرحلات</button>
          </div>
          <div className="hscroll">
            {DESTINATIONS.map((d) => (
              <button key={d} className={`chip ${d === dest ? 'on' : ''}`} onClick={() => setDest(d)}>{d}</button>
            ))}
          </div>
          <div className="hscroll" style={{ paddingTop: 10 }}>
            {TRIPS.filter((t) => t.to === dest && !departedToday(t)).sort((a, b) => a.time.localeCompare(b.time)).map((t) => (
              <TripMini key={t.id} trip={t} />
            ))}
            {TRIPS.every((t) => t.to !== dest || departedToday(t)) ? (
              <button className="card small muted" style={{ flexShrink: 0, width: 210, height: 146 }} onClick={() => go('trips', { dest, date: dayList(2)[1].iso })}>خلصت رحلات اليوم لـ{dest}. شوف رحلات باچر ←</button>
            ) : null}
          </div>
        </section>

        {upcoming ? (
          <button className="card row gap14" style={{ margin: '22px 20px 0', width: 'calc(100% - 40px)', textAlign: 'right' }} onClick={() => go('ticket', { code: upcoming.code })}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: '#EEEDF8', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="ticket" size={26} />
            </div>
            <div className="grow">
              <div className="small muted">رحلتك الجاية · {longDate(upcoming.date)}</div>
              <div className="bold" style={{ fontSize: 16 }}>{tripOf(upcoming).from} ← {tripOf(upcoming).to} · <span className="num"><Time v={tripOf(upcoming).time} /></span></div>
            </div>
            <span className={`pill ${upcoming.boardedAt ? 'info' : 'ok'}`}>{upcoming.boardedAt ? 'صعدت ✓' : 'مؤكدة'}</span>
          </button>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <div className="pad row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="h2">رحلات اليوم</h2>
            <span className="small muted">من {garage.name}</span>
          </div>
          {today.length ? (
            <div className="hscroll">
              {today.map((t) => <TripMini key={t.id} trip={t} />)}
            </div>
          ) : (
            <div className="pad small muted" style={{ marginTop: 10 }}>خلصت رحلات اليوم من هالكراج — شوف رحلات باچر من «كل الرحلات».</div>
          )}
        </section>

        <div className="pad row gap10" style={{ marginTop: 22 }}>
          <button className="card flat grow stack gap6" style={{ alignItems: 'flex-start', textAlign: 'right' }} onClick={() => go('coaster')}>
            <span style={{ color: 'var(--navy)' }}><Icon name="van" size={26} /></span>
            <span className="bold">كوستر خاص</span>
            <span className="tiny muted">للعوائل والمجاميع والزيارات</span>
          </button>
          <button className="card flat grow stack gap6" style={{ alignItems: 'flex-start', textAlign: 'right' }} onClick={() => go('garages')}>
            <span style={{ color: 'var(--navy)' }}><Icon name="pin" size={26} /></span>
            <span className="bold">الكراجات</span>
            <span className="tiny muted">مواقعها على الخريطة</span>
          </button>
        </div>

        <div style={{ margin: '22px 20px 0', minHeight: 190, borderRadius: 24, background: 'var(--navy)', overflow: 'hidden', color: '#fff', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 24, right: 22, width: '52%', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1.5 }}>تكدر تحجز الفندق وانت بعدك بالبيت!!</div>
          <button className="btn light sm" style={{ position: 'absolute', bottom: 22, right: 22, width: 120 }} onClick={() => go('hotels')}>أحجز</button>
          <img src="./img/hotel.png" alt="" style={{ position: 'absolute', left: 6, bottom: 0, width: '40%', maxWidth: 180 }} />
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

function myCount(bookings: Booking[], tripId: string, date: string) {
  return bookings.filter((b) => b.tripId === tripId && b.date === date && b.status === 'confirmed').reduce((n, b) => n + b.seats.length, 0);
}

function TripMini({ trip }: { trip: Trip }) {
  const { go, bookings } = useStore();
  const tag = seatTag(trip, myCount(bookings, trip.id, todayIso()));
  return (
    <button className="card stack" onClick={() => go('seats', { tripId: trip.id, date: todayIso() })} style={{ flexShrink: 0, width: 210, height: 146, justifyContent: 'space-between', textAlign: 'right' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold" style={{ fontSize: 15 }}>{trip.from} ← {trip.to.split(' ')[0]}</span>
        <span className={`pill ${tag.cls}`} style={{ height: 24, fontSize: 11 }}>{tag.text}</span>
      </div>
      <div className="row gap8">
        <span className="num" style={{ fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}><Time v={trip.time} /></span>
        <span className="dash" />
        <span className="tiny muted">{trip.duration}</span>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="tiny muted">{trip.company} · {trip.kind}</span>
        <span><span className="num bold">{money(trip.price)}</span> <span className="tiny">د.ع</span></span>
      </div>
    </button>
  );
}

export function Trips() {
  const { route, go, back, reset, garageId, bookings } = useStore();
  const days = dayList(5);
  const [dest, setDest] = useState(String(route.params?.dest ?? DESTINATIONS[0]));
  const [day, setDay] = useState(String(route.params?.date ?? days[0].iso));
  const garage = garageById(garageId);
  const list = TRIPS.filter((t) => t.to === dest).sort((a, b) => a.time.localeCompare(b.time));
  const isToday = day === todayIso();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="screen gray">
      <div className="hero" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="topbar" style={{ paddingTop: 16 }}>
          <button className="iconbtn" aria-label="رجوع" onClick={() => { if (!back()) reset('home'); }}>
            <Icon name="back" size={20} />
          </button>
          <div className="title">اختار رحلتك</div>
          <button className="chip" style={{ height: 36, padding: '0 12px', fontSize: 13 }} onClick={() => go('garages')}>
            <Icon name="pin" size={14} /> من: {garage.name.replace('كراج ', '')}
          </button>
        </div>
        <div className="small" style={{ padding: '0 20px', color: 'rgba(255,255,255,.72)' }}>وين رايح؟</div>
        <div className="hscroll" role="tablist" style={{ paddingTop: 8 }}>
          {DESTINATIONS.map((d) => (
            <button key={d} role="tab" aria-selected={d === dest} className={`chip ${d === dest ? 'on' : ''}`} onClick={() => setDest(d)}>{d}</button>
          ))}
        </div>
        <div className="row gap8 pad" style={{ marginTop: 10 }}>
          {days.map((d) => (
            <button key={d.iso} onClick={() => setDay(d.iso)} aria-pressed={d.iso === day} style={{ flex: 1, height: 54, borderRadius: 14, background: d.iso === day ? '#fff' : 'rgba(255,255,255,.12)', color: d.iso === day ? 'var(--navy)' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.25 }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{d.label}</span>
              <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{d.num}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="scroll with-tabs">
        <div className="pad row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 }}>
          <h2 className="h3">بغداد ← {dest}</h2>
          <span className="small muted">{list.length} رحلات · {list[0]?.duration}</span>
        </div>
        <div className="pad stack gap10" style={{ marginTop: 10 }}>
          {list.map((t) => {
            const [h, m] = t.time.split(':').map(Number);
            const gone = isToday && h * 60 + m < nowMin - 10;
            const mine = myCount(bookings, t.id, day);
            const tag = seatTag(t, mine);
            const morning = h < 12;
            const full = seatsLeft(t, mine) <= 0;
            return (
              <button key={t.id} className="card stack gap8" disabled={gone || full} style={{ textAlign: 'right', opacity: gone || full ? 0.5 : 1 }} onClick={() => go('seats', { tripId: t.id, date: day })}>
                <div className="row gap10">
                  <span className="num" style={{ fontWeight: 800, fontSize: 24, color: 'var(--navy)' }}><Time v={t.time} /></span>
                  <span className={`pill ${morning ? 'warn' : 'info'}`} style={{ height: 24, fontSize: 11 }}>{h >= 20 ? 'ليلية' : morning ? 'صباحية' : 'مسائية'}</span>
                  <span className="grow" />
                  <div style={{ textAlign: 'left' }}>
                    <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{money(t.price)}</div>
                    <div className="tiny muted">دينار للشخص</div>
                  </div>
                </div>
                <div className="row gap6 small muted" style={{ flexWrap: 'wrap' }}>
                  <span className="bold" style={{ color: 'var(--ink)' }}>{t.company}</span>
                  <span>·</span><Stars rate={t.rating} />
                  <span>·</span><span>{t.kind}</span>
                  <span>·</span><span>{garageById(t.garageId).name}</span>
                  <span className="grow" />
                  <span className="bold" style={{ color: gone ? 'var(--slate)' : tag.cls === 'bad' ? '#B23A4C' : 'var(--success)' }}>{gone ? 'انطلقت' : tag.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <TabBar active="trips" />
    </div>
  );
}

export function Search() {
  const { go, bookings } = useStore();
  const [from, setFrom] = useState('بغداد');
  const [to, setTo] = useState('البصرة');
  const [date, setDate] = useState(todayIso());
  const [family, setFamily] = useState(false);
  const [count, setCount] = useState(2);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<Trip[] | null>(null);
  const passengers = family ? count : 1;

  const run = () => {
    if (from === to) {
      setErr('اختار مدينتين مختلفات');
      setResults(null);
      return;
    }
    setErr('');
    const isToday = date === todayIso();
    const list = TRIPS.filter((t) => t.from === from && t.to === to)
      .filter((t) => !(isToday && departedToday(t)))
      .filter((t) => seatsLeft(t, myCount(bookings, t.id, date)) >= passengers)
      .sort((a, b) => a.time.localeCompare(b.time));
    setResults(list);
    window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const touch = () => setResults(null);

  return (
    <div className="screen gray">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(22px + var(--safe-top))', paddingBottom: 70 }}>
          <div className="pad">
            <div className="small" style={{ opacity: 0.75 }}>وين ناوي تروح؟</div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>دوّر على رحلتك</h1>
          </div>
        </div>
        <div className="pad" style={{ marginTop: -54 }}>
          <div className="card stack gap12" style={{ padding: 16, border: 0, boxShadow: '0 12px 30px rgba(11,5,88,.12)' }}>
            <div className="route-box">
              <div className="route-row">
                <span className="route-dot" />
                <div className="grow">
                  <CityPicker id="from" label="من" value={from} exclude={to} onChange={(c) => { setFrom(c); touch(); }} />
                </div>
              </div>
              <div className="route-line" />
              <div className="route-row">
                <span className="route-dot gold" />
                <div className="grow">
                  <CityPicker id="to" label="إلى" value={to} exclude={from} onChange={(c) => { setTo(c); touch(); }} />
                </div>
              </div>
              <button className="route-swap" aria-label="بدّل الاتجاه" onClick={() => { setFrom(to); setTo(from); touch(); }}>
                <Icon name="swap" size={20} />
              </button>
            </div>

            <DateField label="تاريخ السفر" value={date} min={todayIso()} onChange={(d) => { setDate(d); touch(); }} />

            <div className="stack gap8">
              <span className="label">المسافرين</span>
              <div className="seg">
                <button className={!family ? 'on' : ''} onClick={() => { setFamily(false); touch(); }}><Icon name="user" size={16} /> مسافر وحده</button>
                <button className={family ? 'on' : ''} onClick={() => { setFamily(true); touch(); }}><Icon name="users" size={16} /> عائلة</button>
              </div>
              {family ? (
                <div className="row" style={{ justifyContent: 'space-between', padding: '4px 2px' }}>
                  <div>
                    <div className="bold">عدد أفراد العائلة</div>
                    <div className="tiny muted">كلكم بنفس الحجز وتكعدون سوة</div>
                  </div>
                  <div className="row gap12">
                    <button className="iconbtn" aria-label="أقل" onClick={() => { setCount(Math.max(2, count - 1)); touch(); }}>−</button>
                    <span className="num bold" style={{ fontSize: 22, minWidth: 24, textAlign: 'center' }}>{count}</span>
                    <button className="iconbtn" aria-label="أكثر" onClick={() => { setCount(Math.min(12, count + 1)); touch(); }}>+</button>
                  </div>
                </div>
              ) : (
                <div className="tiny muted" style={{ padding: '0 2px' }}>مقعد واحد. إذا ويّاك عائلتك اختار «عائلة» حتى تحجزون سوة.</div>
              )}
            </div>
            {err ? <div className="err">{err}</div> : null}
            <button className="btn" onClick={run}><Icon name="search" size={20} /> دوّر</button>
          </div>
        </div>

        {results ? (
          <section id="results" className="pad" style={{ marginTop: 22, scrollMarginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="h3">{from} ← {to}</h2>
              <span className="small muted">{prettyDate(date)} · {passengers} {passengers === 1 ? 'مسافر' : 'مسافرين'}</span>
            </div>
            <div className="stack gap10" style={{ marginTop: 10 }}>
              {results.length === 0 ? (
                <div className="card empty" style={{ padding: 22 }}>
                  <Icon name="bus" size={34} />
                  <b style={{ color: 'var(--ink)' }}>ما لكينا رحلات بهالطلب</b>
                  <span className="small">جرّب يوم ثاني أو عدد مسافرين أقل.</span>
                </div>
              ) : (
                results.map((t) => {
                  const left = seatsLeft(t, myCount(bookings, t.id, date));
                  return (
                    <button key={t.id} className="card stack gap8" style={{ textAlign: 'right' }} onClick={() => go('seats', { tripId: t.id, date, count: passengers, family })}>
                      <div className="row gap12">
                        <div>
                          <div className="num" style={{ fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}><Time v={t.time} /></div>
                          <div className="tiny muted">{t.from}</div>
                        </div>
                        <span className="dash" />
                        <span className="tiny muted center" style={{ lineHeight: 1.3 }}>{t.duration}</span>
                        <span className="dash" />
                        <div style={{ textAlign: 'left' }}>
                          <div className="num" style={{ fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}><Time v={t.arrive} /></div>
                          <div className="tiny muted">{t.to}</div>
                        </div>
                      </div>
                      <div className="row gap6 small muted" style={{ flexWrap: 'wrap' }}>
                        <span className="bold" style={{ color: 'var(--ink)' }}>{t.company}</span>
                        <span>·</span><Stars rate={t.rating} />
                        <span>·</span><span>{t.kind}</span>
                        <span>·</span><span>{garageById(t.garageId).name}</span>
                      </div>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className={`pill ${left <= 4 ? 'bad' : 'ok'}`}>باقي {left}</span>
                        <span><span className="num bold" style={{ fontSize: 17 }}>{money(t.price * passengers)}</span> <span className="tiny muted">د.ع{passengers > 1 ? ` · ${passengers} مقاعد` : ''}</span></span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ) : null}
      </div>
      <TabBar active="search" />
    </div>
  );
}

export function Garages() {
  const { garageId, set, back, showToast } = useStore();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [open, setOpen] = useState<Garage | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined,
      { timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const list = useMemo(() => {
    const withD = GARAGES.map((g) => ({ g, d: pos ? distanceKm(pos.lat, pos.lng, g.lat, g.lng) : null }));
    if (pos) withD.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return withD;
  }, [pos]);

  return (
    <div className="screen">
      <TopBar title="اختار الكراج" sub={pos ? 'مرتّبة حسب الأقرب لك' : 'فعّل الموقع حتى نرتّبها حسب الأقرب'} />
      <div className="scroll pad stack gap10" style={{ paddingBottom: 30 }}>
        {list.map(({ g, d }) => (
          <button key={g.id} className="card row gap12" style={{ textAlign: 'right', borderColor: g.id === garageId ? 'var(--navy)' : undefined }} onClick={() => setOpen(g)}>
            <div style={{ width: 48, height: 48, borderRadius: 15, background: g.id === garageId ? 'var(--navy)' : '#EEEDF8', color: g.id === garageId ? '#fff' : 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="pin" size={24} />
            </div>
            <div className="grow">
              <div className="bold">{g.name}</div>
              <div className="small muted">{g.city} · {g.address}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              {d !== null ? <div className="num bold small">{d < 10 ? d.toFixed(1) : Math.round(d)} كم</div> : null}
              {g.id === garageId ? <span className="pill ok" style={{ height: 22, fontSize: 11 }}>مختار</span> : null}
            </div>
          </button>
        ))}
      </div>
      <Sheet open={open !== null} onClose={() => setOpen(null)} label="تفاصيل الكراج">
        {open ? (
          <GarageSheet
            g={open}
            onPick={() => {
              set({ garageId: open.id });
              setOpen(null);
              showToast(`اخترت ${open.name}`);
              back();
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function GarageSheet({ g, onPick }: { g: Garage; onPick: () => void }) {
  const [failed, setFailed] = useState(!navigator.onLine);
  const [ready, setReady] = useState(false);
  const mapUrl = `https://maps.google.com/maps?q=${g.lat},${g.lng}&z=15&hl=ar&output=embed`;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
  const share = async () => {
    const text = `${g.name} — ${g.address}\nhttps://maps.google.com/?q=${g.lat},${g.lng}`;
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title: g.name, text, dialogTitle: 'مشاركة الموقع' });
      else if (navigator.share) await navigator.share({ title: g.name, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user closed the share sheet */
    }
  };
  return (
    <div className="stack gap12">
      <div className="row gap10">
        <div className="grow">
          <h2 className="h2">{g.name}</h2>
          <div className="small muted">{g.city} · {g.address}</div>
        </div>
        <span className="pill info"><Icon name="clock" size={13} />&nbsp;{g.hours}</span>
      </div>
      <div className="map">
        <div className="fallback">
          <Icon name="pin" size={28} />
          <b>{failed ? 'الخريطة تحتاج إنترنت' : 'جاري تحميل الخريطة…'}</b>
          <span className="small">{failed ? 'اضغط «الاتجاهات» تفتح الموقع بخرائط Google.' : g.address}</span>
        </div>
        {!failed ? (
          <iframe title={`خريطة ${g.name}`} src={mapUrl} className={ready ? 'ready' : ''} referrerPolicy="no-referrer-when-downgrade" onLoad={() => setReady(true)} onError={() => setFailed(true)} />
        ) : null}
      </div>
      <div className="row gap10">
        <button className="btn soft sm grow" onClick={() => openExternal(dirUrl)}><Icon name="directions" size={18} /> الاتجاهات</button>
        <button className="btn soft sm grow" onClick={() => void share()}><Icon name="share" size={18} /> مشاركة الموقع</button>
      </div>
      <button className="btn" onClick={onPick}>اختار هذا الكراج</button>
    </div>
  );
}

export function Rewards() {
  const { points, go } = useStore();
  const items = [
    { t: 'خصم 5,000 د.ع', p: 300, note: 'على أي رحلة' },
    { t: 'مقعد VIP بنفس السعر', p: 600, note: 'ترقية مجانية' },
    { t: 'رحلة مجانية', p: 1000, note: 'لحد 30,000 د.ع' },
  ];
  return (
    <div className="screen">
      <TopBar title="المكافآت" />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 30 }}>
        <div className="card" style={{ background: 'var(--navy)', color: '#fff', border: 0, padding: 20 }}>
          <div className="small" style={{ opacity: 0.8 }}>نقاطك</div>
          <div className="num" style={{ fontSize: 40, fontWeight: 800 }}>{points}</div>
          <div className="small" style={{ opacity: 0.8 }}>كل 1,000 دينار تدفعها = نقطة. النقاط تنضاف بعد كل حجز.</div>
        </div>
        <h2 className="h3">بدّل نقاطك</h2>
        {items.map((i) => (
          <div key={i.t} className="card row gap12">
            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#FDF1D6', color: '#7A5200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="gift" size={24} /></div>
            <div className="grow">
              <div className="bold">{i.t}</div>
              <div className="small muted">{i.note}</div>
            </div>
            <span className={`pill ${points >= i.p ? 'ok' : 'info'}`}><span className="num">{i.p}</span>&nbsp;نقطة</span>
          </div>
        ))}
        <h2 className="h3">كوبونات فعّالة</h2>
        {[['WELCOME', 'خصم 20% لأول حجز'], ['EID2026', 'خصم 5,000 د.ع']].map(([c, d]) => (
          <div key={c} className="card row gap12" style={{ borderStyle: 'dashed', borderColor: 'var(--mist)' }}>
            <Icon name="tag" size={22} />
            <div className="grow">
              <div className="code" style={{ fontSize: 18, color: 'var(--navy)' }}>{c}</div>
              <div className="small muted">{d}</div>
            </div>
          </div>
        ))}
        <button className="btn" onClick={() => go('trips')}>احجز واكسب نقاط</button>
      </div>
    </div>
  );
}

