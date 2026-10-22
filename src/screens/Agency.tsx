import { useRef, useState } from 'react';
import { agencyManifest, findVehicle, span, vLabel, type AgencyTrip, type AgencyVehicle } from '../agency';
import { addHours, fmt12, garageById, longDate, money, todayIso } from '../data';
import { Icon, Logo } from '../icons';
import { addDays } from '../pickers';
import { useStore } from '../store';
import { Sheet, TabBar, Time, TopBar, openExternal } from '../ui';
import { shrinkImage } from './Account';
import { AboutDemo } from './Booking';
import { OfficePackages } from './Packages';
import { VehicleFields, emptyVehicle, vehicleError, type VehicleDraft } from './Captain';
import { PhoneField, formatPhone, phoneError } from './Welcome';

type Shown = 'scheduled' | 'moving' | 'arrived' | 'cancelled';

/** What a trip looks like right now: the driver's buttons win, otherwise the clock decides. */
function liveStatus(t: AgencyTrip): Shown {
  if (t.status === 'cancelled') return 'cancelled';
  if (t.status === 'arrived') return 'arrived';
  if (t.status === 'started') return 'moving';
  const [a, b] = span(t.date, t.time, t.hours);
  const now = Date.now() / 60000;
  if (now >= b) return 'arrived';
  if (now >= a) return 'moving';
  return 'scheduled';
}

function untilLabel(t: AgencyTrip) {
  const mins = Math.round(span(t.date, t.time, t.hours)[0] - Date.now() / 60000);
  if (mins <= 0) return '';
  if (mins < 60) return `تطلع بعد ${mins} د`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `تطلع بعد ${h} س${mins % 60 >= 30 ? ' ونص' : ''}` : '';
}

const vehicleIcon = (v?: AgencyVehicle) => (!v ? 'bus' : v.kind === 'GMC' || v.kind === 'سيارة' ? 'car' : v.kind === 'كوستر' ? 'van' : 'bus');

function OfficeLogo({ size = 54 }: { size?: number }) {
  const { agencyInfo } = useStore();
  return (
    <span className="agency-logo" style={{ width: size, height: size, borderRadius: size * 0.32 }}>
      {agencyInfo.logo ? <img src={agencyInfo.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <Logo size={Math.round(size * 0.55)} />}
    </span>
  );
}

function TripCard({ t, onClick }: { t: AgencyTrip; onClick: () => void }) {
  const { agencyVehicles, agencyDrivers } = useStore();
  const v = findVehicle(agencyVehicles, t.vehicleId);
  const d = agencyDrivers.find((x) => x.id === t.driverId);
  const seats = v?.seats ?? 1;
  const empty = seats - t.booked;
  const full = empty <= 0;
  const st = liveStatus(t);
  const today = todayIso();
  const pill = st === 'cancelled' ? ['bad', 'ملغية'] : st === 'moving' ? ['info', 'بالطريق'] : st === 'arrived' ? ['ok', 'وصلت'] : full ? ['ok', 'ممتلئة'] : t.date === today ? ['warn', untilLabel(t) || 'اليوم'] : ['info', t.date === addDays(today, 1) ? 'باجر' : longDate(t.date)];
  return (
    <button className="ag-trip" onClick={onClick} style={{ opacity: st === 'cancelled' ? 0.55 : 1 }}>
      <div className="row gap10" style={{ width: '100%' }}>
        <span className="num" style={{ fontWeight: 800, fontSize: 21, color: 'var(--navy)' }}><Time v={t.time} /></span>
        <span className="grow" style={{ textAlign: 'right' }}>
          <b style={{ display: 'block' }}>{t.from} ← {t.to}</b>
          <span className="tiny muted">{v ? vLabel(v) : '—'} · السائق: {d?.name.split(' ')[0] ?? '—'}</span>
        </span>
        <span className={`pill ${pill[0]}`}>{pill[1]}</span>
      </div>
      <div className="ag-bar"><i style={{ width: `${Math.min(100, (t.booked / seats) * 100)}%` }} /></div>
      <div className="row small" style={{ justifyContent: 'space-between', width: '100%' }}>
        <b style={{ color: 'var(--navy)' }}><span className="num">{t.booked}</span> من <span className="num">{seats}</span> محجوز</b>
        <b style={{ color: full ? 'var(--success)' : '#B23A4C' }}>{full ? 'ممتلئة' : <><span className="num">{empty}</span> فارغ</>}</b>
      </div>
    </button>
  );
}

/** Office home: today's trips at a glance and the office's numbers. */
export function AgencyHome() {
  const { agencyTrips, agencyVehicles, agencyDrivers, agencyInfo, go } = useStore();
  const [p, setP] = useState<'day' | 'week' | 'month'>('day');
  const today = todayIso();
  const todays = agencyTrips.filter((t) => t.date === today && t.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
  const salesToday = todays.reduce((n, t) => n + t.booked * t.price, 0);
  const booked = todays.reduce((n, t) => n + t.booked, 0);
  const capacity = todays.reduce((n, t) => n + (findVehicle(agencyVehicles, t.vehicleId)?.seats ?? 0), 0);
  const sales = p === 'day' ? salesToday : p === 'week' ? salesToday + 3_850_000 : salesToday + 17_200_000;
  const online = Math.round(sales * 0.6);
  const commission = Math.round(online * 0.05);
  const moving = todays.filter((t) => liveStatus(t) === 'moving');
  const next = todays.filter((t) => liveStatus(t) === 'scheduled').slice(0, 3);

  return (
    <div className="screen gray">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(22px + var(--safe-top))', paddingBottom: 22 }}>
          <div className="pad row gap12">
            <OfficeLogo />
            <div className="grow">
              <div className="small" style={{ opacity: 0.75 }}>حساب مكتب سياحي</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)' }}>{agencyInfo.name}</h1>
            </div>
          </div>
          <div className="pad stat3" style={{ marginTop: 18 }}>
            {[[String(todays.length), 'رحلات اليوم'], [String(booked), 'حجز اليوم'], [`${capacity ? Math.round((booked / capacity) * 100) : 0}%`, 'نسبة الإشغال']].map(([v, l]) => (
              <div key={l} className="stat-chip"><b className="num">{v}</b><span>{l}</span></div>
            ))}
          </div>
        </div>

        <div className="pad stack gap12" style={{ marginTop: 16 }}>
          <div className="form-card" style={{ gap: 12 }}>
            <div className="seg" role="tablist" aria-label="الفترة">
              {([['day', 'اليوم'], ['week', 'الأسبوع'], ['month', 'الشهر']] as const).map(([id, l]) => (
                <button key={id} role="tab" aria-selected={p === id} className={p === id ? 'on' : ''} onClick={() => setP(id)}>{l}</button>
              ))}
            </div>
            <div>
              <div className="tiny muted">مبيعات المكتب</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3 }}>{money(sales)} <span style={{ fontSize: 13 }}>د.ع</span></div>
            </div>
            <div className="split-bar" aria-hidden="true"><i style={{ width: `${sales ? (online / sales) * 100 : 50}%` }} /></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="row gap6"><span className="dot-k navy" /> إلكتروني <b className="num">{money(online)}</b></span>
              <span className="row gap6"><span className="dot-k gold" /> نقدي <b className="num">{money(sales - online)}</b></span>
            </div>
            <div className="divider" />
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">عمولة بدربي 5% (على الإلكتروني)</span><b className="num">−{money(commission)}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><b>صافي المكتب</b><b className="num" style={{ color: 'var(--success)', fontSize: 17 }}>{money(sales - commission)} د.ع</b></div>
          </div>

          <div className="row gap10">
            {[[String(agencyVehicles.length), 'مركبات', 'agencyFleet'], [String(agencyDrivers.length), 'سواق', 'agencyDrivers'], [String(moving.length), 'بالطريق هسه', 'agencyTrips']].map(([v, l, to]) => (
              <button key={l} className="card grow center" style={{ padding: '12px 6px' }} onClick={() => go(to)}>
                <div className="num" style={{ fontWeight: 800, fontSize: 19, color: 'var(--navy)' }}>{v}</div>
                <div className="tiny muted">{l}</div>
              </button>
            ))}
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <h2 className="h3">الرحلات الجاية اليوم</h2>
            <button className="link small" onClick={() => go('agencyTrips')}>كل رحلات اليوم</button>
          </div>
          {next.length === 0 ? <div className="card center small muted">ما بقت رحلات اليوم. اضغط + حتى تضيف رحلة.</div> : next.map((t) => <TripCard key={t.id} t={t} onClick={() => go('agencyTrip', { id: t.id })} />)}
        </div>
      </div>
      <TabBar active="agencyHome" agency />
    </div>
  );
}

/** Trips leaving today (or tomorrow) and when; tap one to see who's booked on it. */
export function AgencyTrips() {
  const { agencyTrips, go, route } = useStore();
  const [day, setDay] = useState<'today' | 'tomorrow' | 'all' | 'pkg'>(route.params?.tab === 'pkg' ? 'pkg' : 'today');
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const list = agencyTrips
    .filter((t) => (day === 'today' ? t.date === today : day === 'tomorrow' ? t.date === tomorrow : t.date >= today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <div className="screen gray">
      <div className="topbar"><div className="title" style={{ fontSize: 24, fontWeight: 800 }}>الرحلات</div></div>
      <div className="pad row gap8" role="tablist" aria-label="اليوم" style={{ paddingBottom: 10 }}>
        {([['today', 'اليوم'], ['tomorrow', 'باجر'], ['all', 'كل الجاية'], ['pkg', 'السفرات']] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={day === id} className={`chip ag-chip ${day === id ? 'on' : ''}`} onClick={() => setDay(id)}>{l}</button>
        ))}
      </div>
      <div className="scroll with-tabs pad stack gap10">
        {day === 'pkg' ? <OfficePackages /> : <>
        {list.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>ما اكو رحلات. اضغط + بالشريط الجوة حتى تضيف.</div> : null}
        {list.map((t) => <TripCard key={t.id} t={t} onClick={() => go('agencyTrip', { id: t.id })} />)}
        </>}
      </div>
      <TabBar active="agencyTrips" agency />
    </div>
  );
}

/** One trip: its details and every passenger booked on it. */
export function AgencyTripDetail() {
  const { route, agencyTrips, agencyVehicles, agencyDrivers, boardedAt, set, showToast } = useStore();
  const t = agencyTrips.find((x) => x.id === route.params?.id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!t) {
    return (
      <div className="screen"><TopBar title="الرحلة" /><div className="empty"><Icon name="info" size={40} /><b>ما لكينا الرحلة</b></div></div>
    );
  }
  const v = findVehicle(agencyVehicles, t.vehicleId);
  const d = agencyDrivers.find((x) => x.id === t.driverId);
  const pax = agencyManifest(t);
  const boarded = pax.filter((b) => boardedAt(b)).reduce((n, b) => n + b.seats.length, 0);
  const st = liveStatus(t);
  const cancel = () => {
    set({ agencyTrips: agencyTrips.map((x) => (x.id === t.id ? { ...x, status: 'cancelled' } : x)) });
    showToast('انلغت الرحلة ووصل إشعار للسائق والمسافرين');
    setConfirmCancel(false);
  };
  return (
    <div className="screen gray">
      <TopBar title={`${t.from} ← ${t.to}`} sub={<>{t.date === todayIso() ? 'اليوم' : longDate(t.date)} · <span className="num"><Time v={t.time} /></span> ← <span className="num"><Time v={addHours(t.time, t.hours)} /></span></>} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <div className="form-card" style={{ gap: 8 }}>
          <div className="row gap12">
            <span className="df-ic"><Icon name={vehicleIcon(v)} size={22} /></span>
            <div className="grow">
              <b>{v ? `${vLabel(v)} · ${v.model}` : '—'}</b>
              <div className="tiny muted">{v?.plate} · السائق: {d?.name ?? '—'}</div>
            </div>
            {d ? <button className="iconbtn" aria-label="اتصل بالسائق" onClick={() => openExternal(`tel:+964${d.phone}`)}><Icon name="phone" size={18} /></button> : null}
          </div>
          {t.garageId ? <div className="small muted">{garageById(t.garageId).name}{t.endGarageId ? ` ← ${garageById(t.endGarageId).name}` : ''}</div> : null}
          <div className="divider" />
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">محجوز</span><b className="num">{t.booked}/{v?.seats ?? '—'}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">صعدوا</span><b className="num">{boarded}/{t.booked}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المبيعات</span><b className="num" style={{ color: 'var(--success)' }}>{money(t.booked * t.price)} د.ع</b></div>
        </div>

        <h2 className="h3">المسافرين ({pax.length} حجز)</h2>
        {pax.length === 0 ? <div className="card center small muted">بعد ما حجز أحد.</div> : (
          <div className="card" style={{ padding: '4px 14px' }}>
            {pax.map((b) => {
              const at = boardedAt(b);
              return (
                <div key={b.code} className="list-item">
                  <span className="ic" style={at ? { background: 'var(--success-bg)', color: 'var(--success)' } : undefined}><Icon name={at ? 'check' : 'user'} size={20} /></span>
                  <span className="grow">
                    <span className="bold" style={{ display: 'block' }}>{b.name}</span>
                    <span className="tiny muted">مقاعد {b.seats.join('، ')} · {b.pay} · <span className="num" dir="ltr">0{b.phone}</span></span>
                  </span>
                  <span className={`pill ${b.status === 'cancelled' ? 'bad' : at ? 'ok' : 'info'}`}>{b.status === 'cancelled' ? 'ملغي' : at ? `صعد ${fmt12(at)}` : 'ما صعد'}</span>
                </div>
              );
            })}
          </div>
        )}
        {st === 'scheduled' ? <button className="btn soft" style={{ color: 'var(--alert)' }} onClick={() => setConfirmCancel(true)}><Icon name="x" size={18} /> الغي الرحلة</button> : null}
      </div>
      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} label="إلغاء الرحلة">
        <div className="stack gap12">
          <h2 className="h2">نلغي رحلة {t.from} ← {t.to}؟</h2>
          <p className="muted" style={{ margin: 0 }}>يوصل إشعار للسائق ولـ <b className="num">{t.booked}</b> مسافر، وفلوسهم ترجعلهم كاملة.</p>
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={cancel}>إي، الغي الرحلة</button>
          <button className="btn soft" onClick={() => setConfirmCancel(false)}>لا</button>
        </div>
      </Sheet>
    </div>
  );
}

export function AgencyFleet() {
  const { agencyTrips, agencyVehicles, agencyDrivers, go } = useStore();
  const today = todayIso();
  return (
    <div className="screen gray">
      <div className="topbar">
        <div className="title grow" style={{ fontSize: 24, fontWeight: 800 }}>الأسطول</div>
        <button className="btn sm" style={{ width: 'auto', padding: '0 16px' }} onClick={() => go('agencyAddVehicle')}><Icon name="plus" size={18} stroke={2.6} /> أضف سيارة</button>
      </div>
      <div className="scroll with-tabs pad stack gap10">
        {agencyVehicles.map((v) => {
          const d = agencyDrivers.find((x) => x.vehicleId === v.id);
          const trips = agencyTrips.filter((t) => t.vehicleId === v.id && t.date === today && t.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
          const moving = trips.find((t) => liveStatus(t) === 'moving');
          const upcoming = trips.find((t) => liveStatus(t) === 'scheduled');
          return (
            <div key={v.id} className="form-card" style={{ gap: 10 }}>
              <div className="row gap12">
                <span className="df-ic"><Icon name={vehicleIcon(v)} size={22} /></span>
                <div className="grow">
                  <b>{vLabel(v)} · {v.model}</b>
                  <div className="tiny muted">{v.color} · {v.year} · السائق: {d ? d.name : 'ما محدد'}</div>
                </div>
                <span className={`pill ${moving ? 'info' : upcoming ? 'warn' : 'ok'}`}>{moving ? 'بالطريق' : upcoming ? `رحلة ${fmt12(upcoming.time)}` : 'متاحة'}</span>
              </div>
              <div className="plate plate-static" aria-label={`رقم اللوحة ${v.plate}`}>
                <span className="plate-prov">{v.plate.split(' ')[0]}</span>
                <span className="plate-letter">{v.plate.split(' ').slice(-1)[0]}</span>
                <span className="plate-num num">{v.plate.split(' ').slice(1, -1).join(' ')}</span>
              </div>
            </div>
          );
        })}
      </div>
      <TabBar active="agencyFleet" agency />
    </div>
  );
}

export function AgencyAddVehicle() {
  const { agencyVehicles, set, back, showToast } = useStore();
  const [v, setV] = useState<VehicleDraft>(emptyVehicle);
  const [err, setErr] = useState('');
  const save = () => {
    const e = vehicleError(v);
    if (e) return setErr(e);
    const plate = `${v.province} ${v.number} ${v.letter}`;
    if (agencyVehicles.some((x) => x.plate === plate)) return setErr('هذي اللوحة مضافة قبل');
    set({ agencyVehicles: [...agencyVehicles, { id: 'v' + Date.now(), kind: v.kind, model: v.model.trim(), plate, seats: v.seats, color: v.color, year: v.year }] });
    showToast('انضافت السيارة للأسطول ✓');
    back();
  };
  return (
    <div className="screen gray">
      <TopBar title="أضف سيارة للأسطول" />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }} onChange={() => setErr('')}>
        <VehicleFields value={v} onChange={(x) => { setV(x); setErr(''); }} />
        <div className="tiny muted">بعدها تگدر تربطها بسائق من «حسابي ← السواق».</div>
        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar"><button className="btn" onClick={save}>أضف السيارة</button></div>
    </div>
  );
}

/** The office's drivers. Adding one makes his account: he signs in to «كابتن بدربي» with this number. */
export function AgencyDrivers() {
  const { agencyDrivers, agencyVehicles, set, showToast } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [vid, setVid] = useState('');
  const [err, setErr] = useState('');

  const add = () => {
    if (name.trim().split(/\s+/).length < 2) return setErr('اكتب اسم السائق الثنائي');
    const pe = phoneError(phone);
    if (pe) return setErr(pe);
    if (pass.length < 4) return setErr('رمز الدخول 4 أحرف أو أكثر');
    if (!vid) return setErr('اختار السيارة اللي يسوقها');
    const digits = phone.replace(/\s/g, '');
    if (agencyDrivers.some((x) => x.phone === digits)) return setErr('هذا الرقم مضاف قبل');
    // One driver per vehicle: whoever drove it before is left without one.
    set({ agencyDrivers: [...agencyDrivers.map((x) => (x.vehicleId === vid ? { ...x, vehicleId: '' } : x)), { id: 'd' + Date.now(), name: name.trim(), phone: digits, rating: '—', vehicleId: vid, status: 'active', password: pass }] });
    showToast(`انسوى حساب ${name.trim().split(' ')[0]} — يدخل برقمه`);
    setAdding(false);
    setName('');
    setPhone('');
    setPass('');
    setVid('');
    setErr('');
  };

  return (
    <div className="screen gray">
      <TopBar title="السواق" sub={`${agencyDrivers.length} سائق`} />
      <div className="scroll pad stack gap10" style={{ paddingBottom: 24 }}>
        {agencyDrivers.map((d) => {
          const v = findVehicle(agencyVehicles, d.vehicleId);
          return (
            <div key={d.id} className="list-item" style={{ background: '#fff', borderRadius: 18, padding: '10px 12px' }}>
              <span className="ic"><Icon name="user" size={20} /></span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{d.name}</span>
                <span className="tiny muted">{v ? `${vLabel(v)} · ${v.plate.split(' ').slice(1).join(' ')}` : 'بلا سيارة'} · <span className="num" dir="ltr">0{d.phone}</span></span>
              </span>
              <span className="pill info">★ <span className="num">{d.rating}</span></span>
              <button className="iconbtn" aria-label={`اتصل بـ ${d.name}`} onClick={() => openExternal(`tel:+964${d.phone}`)}><Icon name="phone" size={18} /></button>
            </div>
          );
        })}
        <button className="btn soft" onClick={() => setAdding(true)}><Icon name="plus" size={20} /> أضف سائق وحسابه</button>
        <div className="demo-note" style={{ margin: 0 }}>السائق يدخل لتطبيق «كابتن بدربي» بالرقم والرمز اللي تحطهم، ويشوف سيارته والرحلات اللي تعطيها إله. ما يگدر ينشئ رحلة.</div>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} label="أضف سائق">
        <div className="stack gap10">
          <h2 className="h3">سائق جديد</h2>
          <div className="field">
            <label htmlFor="dname">اسم السائق</label>
            <input id="dname" className="input" placeholder="الاسم الثلاثي" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} />
          </div>
          <PhoneField value={phone} onChange={(v) => { setPhone(formatPhone(v)); setErr(''); }} />
          <div className="field">
            <label htmlFor="dpass">رمز الدخول</label>
            <input id="dpass" className="input" dir="ltr" style={{ textAlign: 'left' }} placeholder="مثلاً 4821" value={pass} onChange={(e) => { setPass(e.target.value.slice(0, 20)); setErr(''); }} />
          </div>
          <span className="label">يسوق سيارة</span>
          <div className="veh-grid">
            {agencyVehicles.map((v) => (
              <button key={v.id} className={`veh sm ${vid === v.id ? 'on' : ''}`} onClick={() => { setVid(v.id); setErr(''); }}>
                <b>{vLabel(v)}</b>
                <span className="tiny num">{v.plate.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
          {err ? <div className="err">{err}</div> : null}
          <button className="btn" onClick={add}>سوّي الحساب</button>
        </div>
      </Sheet>
    </div>
  );
}

export function AgencyInfo() {
  const { agencyInfo, set, back, showToast } = useStore();
  const [f, setF] = useState(agencyInfo);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const save = () => {
    if (f.name.trim().length < 3) return setErr('اكتب اسم المكتب');
    const pe = phoneError(f.phone);
    if (pe) return setErr(pe);
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('الإيميل مو صحيح');
    set({ agencyInfo: { ...f, name: f.name.trim() } });
    showToast('انحفظت معلومات المكتب ✓');
    back();
  };
  return (
    <div className="screen gray">
      <TopBar title="معلومات المكتب" />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <button className="center stack gap6" style={{ alignItems: 'center' }} onClick={() => fileRef.current?.click()}>
          <span className="agency-logo" style={{ width: 88, height: 88, borderRadius: 26, background: 'var(--navy)' }}>
            {f.logo ? <img src={f.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <Logo size={46} />}
          </span>
          <span className="link small">بدّل شعار المكتب</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { const logo = await shrinkImage(file); setF({ ...f, logo }); } catch { showToast('ما گدرنا نقرأ الصورة'); } }} />
        <div className="field"><label htmlFor="aname">اسم المكتب</label><input id="aname" className="input" style={{ background: '#fff' }} value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(''); }} /></div>
        <PhoneField value={f.phone} onChange={(v) => { setF({ ...f, phone: formatPhone(v) }); setErr(''); }} />
        <div className="field"><label htmlFor="aemail">الإيميل</label><input id="aemail" className="input" dir="ltr" style={{ background: '#fff', textAlign: 'left' }} value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value.trim() }); setErr(''); }} /></div>
        <div className="field"><label htmlFor="aaddr">العنوان</label><input id="aaddr" className="input" style={{ background: '#fff' }} value={f.address} onChange={(e) => { setF({ ...f, address: e.target.value }); setErr(''); }} /></div>
        {err ? <div className="err">{err}</div> : null}
      </div>
      <div className="bottombar"><button className="btn" onClick={save}>حفظ</button></div>
    </div>
  );
}

export function AgencyProfile() {
  const { set, reset, go, resetDemo, agencyInfo, agencyVehicles, agencyDrivers } = useStore();
  const [about, setAbout] = useState(false);
  const [wipe, setWipe] = useState(false);
  const items: [string, string, () => void][] = [
    ['user', 'معلومات المكتب', () => go('agencyInfo')],
    ['users', `السواق وحساباتهم · ${agencyDrivers.length}`, () => go('agencyDrivers')],
    ['shield', 'سياسة الخصوصية والاستخدام', () => go('policy')],
    ['info', 'عن النسخة التجريبية', () => setAbout(true)],
    ['refresh', 'مسح بيانات التجربة', () => setWipe(true)],
    ['chat', 'الدعم', () => go('support', { as: 'agency' })],
  ];
  return (
    <div className="screen">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(26px + var(--safe-top))', paddingBottom: 26 }}>
          <div className="pad row gap14">
            <button onClick={() => go('agencyInfo')} aria-label="معلومات المكتب"><OfficeLogo size={72} /></button>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{agencyInfo.name}</div>
              <div className="num small" style={{ opacity: 0.8, textAlign: 'right' }}>+964 {agencyInfo.phone}</div>
              <div className="tiny" style={{ opacity: 0.75 }}>مكتب موثّق ✓ · {agencyInfo.address}</div>
            </div>
          </div>
          <div className="pad row gap10" style={{ marginTop: 20 }}>
            {[[String(agencyVehicles.length), 'مركبات'], [String(agencyDrivers.length), 'سواق'], ['4.8 ★', 'تقييم المكتب']].map(([v, l]) => (
              <div key={l} className="grow center" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '10px 0' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 18 }}>{v}</div>
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
      <TabBar active="agencyProfile" agency />
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
