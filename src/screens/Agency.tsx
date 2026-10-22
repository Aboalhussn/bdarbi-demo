import { useState } from 'react';
import { AGENCY_NAME, AGENCY_VEHICLES, span, vehicleById, type AgencyTrip } from '../agency';
import { addHours, fmt12, longDate, money, routeInfo, todayIso } from '../data';
import { Icon, Logo } from '../icons';
import { CityPicker, DateField, GarageField, TimeField, addDays } from '../pickers';
import { useStore } from '../store';
import { Sheet, TabBar, Time, TopBar, openExternal } from '../ui';
import { AboutDemo } from './Booking';
import { PhoneField, formatPhone, phoneError } from './Welcome';

type Shown = 'scheduled' | 'moving' | 'arrived' | 'cancelled';

/** What a trip looks like right now: a scheduled trip whose time has come is on the road. */
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

const routeHours = (from: string, to: string) => routeInfo(from === 'بغداد' ? to : from).hours;

export function AgencyHome() {
  const { agencyTrips, agencyDrivers, go, set, showToast } = useStore();
  const [filter, setFilter] = useState<'all' | 'today' | 'full'>('all');
  const [sel, setSel] = useState<AgencyTrip | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const today = todayIso();
  const upcoming = agencyTrips.filter((t) => t.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const todays = upcoming.filter((t) => t.date === today && t.status !== 'cancelled');
  const list = upcoming.filter((t) => (filter === 'all' ? true : filter === 'today' ? t.date === today : t.booked >= vehicleById(t.vehicleId).seats));
  const income = todays.reduce((n, t) => n + t.booked * t.price, 0);
  const driverOf = (id: string) => agencyDrivers.find((d) => d.id === id);

  const cancel = () => {
    if (!sel) return;
    set({ agencyTrips: agencyTrips.map((t) => (t.id === sel.id ? { ...t, status: 'cancelled' } : t)) });
    showToast('انلغت الرحلة ووصل إشعار للسائق والمسافرين');
    setConfirmCancel(false);
    setSel(null);
  };

  return (
    <div className="screen gray">
      <div className="scroll with-tabs" style={{ paddingBottom: 'calc(180px + var(--safe-bottom))' }}>
        <div className="hero" style={{ paddingTop: 'calc(22px + var(--safe-top))', paddingBottom: 22 }}>
          <div className="pad row gap12">
            <span className="agency-logo"><Logo size={30} /></span>
            <div className="grow">
              <div className="small" style={{ opacity: 0.75 }}>حساب مكتب سياحي</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)' }}>{AGENCY_NAME}</h1>
            </div>
          </div>
          <div className="pad stat3" style={{ marginTop: 18 }}>
            {[[String(todays.length), 'رحلات اليوم'], [String(AGENCY_VEHICLES.length), 'مركبات'], [String(todays.reduce((n, t) => n + t.booked, 0)), 'حجز اليوم']].map(([v, l]) => (
              <div key={l} className="stat-chip"><b className="num">{v}</b><span>{l}</span></div>
            ))}
          </div>
          <div className="pad small" style={{ marginTop: 12, opacity: 0.85 }}>مبيعات اليوم: <b className="num">{money(income)}</b> د.ع</div>
        </div>

        <div className="pad row gap8" role="tablist" aria-label="فلترة الرحلات" style={{ marginTop: 16 }}>
          {([['all', 'الكل'], ['today', 'تتحرك اليوم'], ['full', 'ممتلئة']] as const).map(([id, l]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{l}</button>
          ))}
        </div>

        <div className="pad stack gap10" style={{ marginTop: 12 }}>
          {list.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>ما اكو رحلات بهالفلتر.</div> : null}
          {list.map((t) => {
            const v = vehicleById(t.vehicleId);
            const d = driverOf(t.driverId);
            const empty = v.seats - t.booked;
            const full = empty <= 0;
            const st = liveStatus(t);
            const pill = st === 'cancelled' ? ['bad', 'ملغية'] : st === 'moving' ? ['info', 'بالطريق'] : st === 'arrived' ? ['ok', 'وصلت'] : full ? ['ok', 'ممتلئة'] : t.date === today ? ['warn', 'اليوم'] : ['info', t.date === addDays(today, 1) ? 'باجر' : longDate(t.date)];
            return (
              <button key={t.id} className="ag-trip" onClick={() => setSel(t)} style={{ opacity: st === 'cancelled' ? 0.55 : 1 }}>
                <div className="row gap10" style={{ width: '100%' }}>
                  <span className="num" style={{ fontWeight: 800, fontSize: 21, color: 'var(--navy)' }}><Time v={t.time} /></span>
                  <span className="grow" style={{ textAlign: 'right' }}>
                    <b style={{ display: 'block' }}>{t.from} ← {t.to}</b>
                    <span className="tiny muted">{v.label} · السائق: {d?.name.split(' ')[0] ?? '—'}</span>
                  </span>
                  <span className={`pill ${pill[0]}`}>{pill[1]}</span>
                </div>
                <div className="ag-bar"><i style={{ width: `${Math.min(100, (t.booked / v.seats) * 100)}%` }} /></div>
                <div className="row small" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <b style={{ color: 'var(--navy)' }}><span className="num">{t.booked}</span> من <span className="num">{v.seats}</span> محجوز</b>
                  <b style={{ color: full ? 'var(--success)' : '#B23A4C' }}>{full ? 'ممتلئة' : <><span className="num">{empty}</span> فارغ</>}</b>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ag-cta">
        <button className="btn" onClick={() => go('agencyAddTrip')}><Icon name="plus" size={20} stroke={2.6} /> أضف رحلة لأي مركبة</button>
      </div>
      <TabBar active="agencyHome" agency />

      <Sheet open={sel !== null} onClose={() => { setSel(null); setConfirmCancel(false); }} label="تفاصيل الرحلة">
        {sel ? (() => {
          const v = vehicleById(sel.vehicleId);
          const d = driverOf(sel.driverId);
          const st = liveStatus(sel);
          return confirmCancel ? (
            <div className="stack gap12">
              <h2 className="h2">نلغي رحلة {sel.from} ← {sel.to}؟</h2>
              <p className="muted" style={{ margin: 0 }}>يوصل إشعار للسائق ولـ <b className="num">{sel.booked}</b> مسافر، وفلوسهم ترجعلهم كاملة.</p>
              <button className="btn" style={{ background: 'var(--alert)' }} onClick={cancel}>إي، الغي الرحلة</button>
              <button className="btn soft" onClick={() => setConfirmCancel(false)}>لا</button>
            </div>
          ) : (
            <div className="stack gap10">
              <h2 className="h2">{sel.from} ← {sel.to}</h2>
              <div className="small muted">{longDate(sel.date)} · <span className="num"><Time v={sel.time} /></span> ← يوصل <span className="num"><Time v={addHours(sel.time, sel.hours)} /></span></div>
              <div className="card flat stack gap8">
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المركبة</span><b>{v.label} · {v.model}</b></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">اللوحة</span><b>{v.plate}</b></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">السائق</span><b>{d?.name ?? '—'}</b></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المحجوز</span><b className="num">{sel.booked}/{v.seats}</b></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">سعر المقعد</span><b className="num">{money(sel.price)} د.ع</b></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المبيعات</span><b className="num" style={{ color: 'var(--success)' }}>{money(sel.booked * sel.price)} د.ع</b></div>
              </div>
              {d ? <button className="btn soft" onClick={() => openExternal(`tel:+964${d.phone}`)}><Icon name="phone" size={20} /> اتصل بالسائق</button> : null}
              {st === 'scheduled' ? <button className="btn soft" style={{ color: 'var(--alert)' }} onClick={() => setConfirmCancel(true)}><Icon name="x" size={18} /> الغي الرحلة</button> : null}
            </div>
          );
        })() : null}
      </Sheet>
    </div>
  );
}

export function AgencyAddTrip() {
  const { agencyTrips, agencyDrivers, set, back, showToast } = useStore();
  const active = agencyDrivers.filter((d) => d.status === 'active');
  const [vehicleId, setVehicleId] = useState('');
  const [from, setFrom] = useState('بغداد');
  const [to, setTo] = useState('البصرة');
  const [garage, setGarage] = useState('');
  const [date, setDate] = useState(addDays(todayIso(), 1));
  const [time, setTime] = useState('08:00');
  const [price, setPrice] = useState('25000');
  const [err, setErr] = useState('');
  const hours = routeHours(from, to);

  // A vehicle that already has a trip overlapping this one can't take it.
  const busy = (vid: string) => {
    const [a, b] = span(date, time, hours);
    return agencyTrips.find((t) => t.vehicleId === vid && t.status !== 'cancelled' && (() => { const [c, d] = span(t.date, t.time, t.hours); return a < d && c < b; })());
  };

  const save = () => {
    if (!vehicleId) return setErr('اختار المركبة');
    if (busy(vehicleId)) return setErr('هذي المركبة عندها رحلة بنفس الوقت. بدّل الوقت أو المركبة.');
    if (!garage) return setErr('اختار كراج الانطلاق');
    const p = Number(price);
    if (!p || p < 5000) return setErr('السعر لازم يكون 5,000 د.ع أو أكثر');
    const driver = active.find((d) => d.vehicleId === vehicleId);
    if (!driver) return setErr('هذي المركبة ما إلها سائق مفعّل');
    set({ agencyTrips: [...agencyTrips, { id: 'a' + Date.now(), from, to, date, time, hours, vehicleId, driverId: driver.id, booked: 0, price: p, status: 'scheduled' }] });
    showToast(`انضافت الرحلة ووصل إشعار للسائق ${driver.name.split(' ')[0]}`);
    back();
  };

  return (
    <div className="screen">
      <TopBar title="رحلة جديدة" sub={AGENCY_NAME} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <h3 className="h3">المركبة</h3>
        <div className="veh-grid">
          {AGENCY_VEHICLES.map((v) => {
            const d = active.find((x) => x.vehicleId === v.id);
            const clash = busy(v.id);
            return (
              <button key={v.id} className={`veh ${vehicleId === v.id ? 'on' : ''}`} disabled={!!clash || !d} onClick={() => { setVehicleId(v.id); setErr(''); }}>
                <Icon name={v.kind === 'GMC' ? 'car' : v.kind === 'كوستر' ? 'van' : 'bus'} size={22} />
                <b>{v.label}</b>
                <span className="tiny">{d ? d.name.split(' ')[0] : 'بلا سائق'}</span>
                <span className="tiny num" style={{ opacity: 0.7 }}>{v.plate.split(' ').slice(1).join(' ')}</span>
                {clash ? <span className="veh-busy">عندها رحلة <span className="num">{fmt12(clash.time)}</span></span> : null}
              </button>
            );
          })}
        </div>

        <h3 className="h3">منين وين؟</h3>
        <div className="route-box">
          <div className="route-row">
            <span className="route-dot" />
            <div className="grow"><CityPicker id="afrom" label="الانطلاق من" value={from} onChange={(c) => { setFrom(c); setGarage(''); if (c === to) setTo(c === 'بغداد' ? 'البصرة' : 'بغداد'); setErr(''); }} /></div>
          </div>
          <div className="route-line" />
          <div className="route-row">
            <span className="route-dot gold" />
            <div className="grow"><CityPicker id="ato" label="الوصول إلى" value={to} exclude={from} onChange={(c) => { setTo(c); setErr(''); }} /></div>
          </div>
        </div>
        <GarageField label={`كراج الانطلاق في ${from}`} city={from} value={garage} onChange={(id) => { setGarage(id); setErr(''); }} />

        <h3 className="h3">الموعد والسعر</h3>
        <DateField label="يوم الحركة" value={date} min={todayIso()} onChange={(d) => { setDate(d); setErr(''); }} />
        <TimeField label="وقت الحركة" value={time} onChange={(t) => { setTime(t); setErr(''); }} />
        <div className="small muted">يوصل تقريباً <b className="num"><Time v={addHours(time, hours)} /></b> · {routeInfo(from === 'بغداد' ? to : from).dur}</div>
        <div className="price-box">
          <input className="num" inputMode="numeric" dir="ltr" value={price} onChange={(e) => { setPrice(e.target.value.replace(/\D/g, '')); setErr(''); }} aria-label="سعر المقعد" />
          <span>د.ع للمقعد</span>
        </div>
        {err ? <div className="err">{err}</div> : null}
      </div>
      <div className="bottombar">
        <button className="btn" onClick={save}>انشر الرحلة</button>
      </div>
    </div>
  );
}

export function AgencyFleet() {
  const { agencyTrips, agencyDrivers, set, showToast } = useStore();
  const [tab, setTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vid, setVid] = useState('');
  const [err, setErr] = useState('');
  const today = todayIso();
  const tripToday = (vehicleId: string) => agencyTrips.filter((t) => t.vehicleId === vehicleId && t.date === today && t.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));

  const invite = () => {
    if (name.trim().split(/\s+/).length < 2) return setErr('اكتب اسم السائق الثنائي');
    const pe = phoneError(phone);
    if (pe) return setErr(pe);
    if (!vid) return setErr('اختار المركبة اللي يسوقها');
    const d = phone.replace(/\s/g, '');
    if (agencyDrivers.some((x) => x.phone === d)) return setErr('هذا الرقم مضاف قبل');
    set({ agencyDrivers: [...agencyDrivers.map((x) => (x.vehicleId === vid ? { ...x, vehicleId: '' } : x)), { id: 'd' + Date.now(), name: name.trim(), phone: d, rating: '—', vehicleId: vid, status: 'invited' }] });
    showToast('انرسلت دعوة للسائق برسالة SMS');
    setAdding(false);
    setName('');
    setPhone('');
    setVid('');
    setErr('');
    setTab('drivers');
  };

  return (
    <div className="screen gray">
      <div className="topbar"><div className="title" style={{ fontSize: 24, fontWeight: 800 }}>الأسطول</div></div>
      <div className="pad" style={{ paddingBottom: 10 }}>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'vehicles'} className={tab === 'vehicles' ? 'on' : ''} onClick={() => setTab('vehicles')}>المركبات ({AGENCY_VEHICLES.length})</button>
          <button role="tab" aria-selected={tab === 'drivers'} className={tab === 'drivers' ? 'on' : ''} onClick={() => setTab('drivers')}>السواق ({agencyDrivers.length})</button>
        </div>
      </div>
      <div className="scroll with-tabs pad stack gap10">
        {tab === 'vehicles' ? (
          AGENCY_VEHICLES.map((v) => {
            const d = agencyDrivers.find((x) => x.vehicleId === v.id);
            const trips = tripToday(v.id);
            const moving = trips.find((t) => liveStatus(t) === 'moving');
            return (
              <div key={v.id} className="form-card" style={{ gap: 10 }}>
                <div className="row gap12">
                  <span className="df-ic"><Icon name={v.kind === 'GMC' ? 'car' : v.kind === 'كوستر' ? 'van' : 'bus'} size={22} /></span>
                  <div className="grow">
                    <b>{v.label} · {v.model}</b>
                    <div className="tiny muted">السائق: {d ? `${d.name}${d.status === 'invited' ? ' (بانتظار التفعيل)' : ''}` : 'ما محدد'}</div>
                  </div>
                  <span className={`pill ${moving ? 'info' : trips.length ? 'warn' : 'ok'}`}>{moving ? 'بالطريق' : trips.length ? `رحلة ${fmt12(trips[0].time)}` : 'متاحة'}</span>
                </div>
                <div className="plate plate-static" aria-label={`رقم اللوحة ${v.plate}`}>
                  <span className="plate-prov">{v.plate.split(' ')[0]}</span>
                  <span className="plate-letter">{v.plate.split(' ').slice(-1)[0]}</span>
                  <span className="plate-num num">{v.plate.split(' ').slice(1, -1).join(' ')}</span>
                </div>
              </div>
            );
          })
        ) : (
          <>
            {agencyDrivers.map((d) => (
              <div key={d.id} className="list-item" style={{ background: '#fff', borderRadius: 18, padding: '10px 12px' }}>
                <span className="ic"><Icon name="user" size={20} /></span>
                <span className="grow">
                  <span className="bold" style={{ display: 'block' }}>{d.name}</span>
                  <span className="tiny muted">{d.vehicleId ? vehicleById(d.vehicleId).label : 'بلا مركبة'} · <span className="num" dir="ltr">0{d.phone}</span></span>
                </span>
                {d.status === 'invited' ? <span className="pill warn">بانتظار التفعيل</span> : <span className="pill info">★ <span className="num">{d.rating}</span></span>}
                <button className="iconbtn" aria-label={`اتصل بـ ${d.name}`} onClick={() => openExternal(`tel:+964${d.phone}`)}><Icon name="phone" size={18} /></button>
              </div>
            ))}
            <button className="btn soft" onClick={() => setAdding(true)}><Icon name="plus" size={20} /> أضف سائق</button>
          </>
        )}
        {tab === 'vehicles' ? <div className="demo-note" style={{ margin: 0 }}>المركبة الجديدة تنضاف بعد ما الإدارة تراجع سنويتها. راسل الدعم من «حسابي».</div> : null}
      </div>
      <TabBar active="agencyFleet" agency />
      <Sheet open={adding} onClose={() => setAdding(false)} label="أضف سائق">
        <div className="stack gap10">
          <h2 className="h3">أضف سائق لمكتبك</h2>
          <div className="field">
            <label htmlFor="dname">اسم السائق</label>
            <input id="dname" className="input" placeholder="الاسم الثلاثي" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} />
          </div>
          <PhoneField value={phone} onChange={(v) => { setPhone(formatPhone(v)); setErr(''); }} />
          <span className="label">يسوق مركبة</span>
          <div className="veh-grid">
            {AGENCY_VEHICLES.map((v) => (
              <button key={v.id} className={`veh sm ${vid === v.id ? 'on' : ''}`} onClick={() => { setVid(v.id); setErr(''); }}>
                <b>{v.label}</b>
                <span className="tiny num">{v.plate.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
          {err ? <div className="err">{err}</div> : null}
          <button className="btn" onClick={invite}>ارسل دعوة</button>
          <div className="tiny muted center">يوصل للسائق رابط يحمّل بيه «كابتن بدربي» ويدخل برقمه.</div>
        </div>
      </Sheet>
    </div>
  );
}

export function AgencyProfile() {
  const { set, reset, go, resetDemo, agencyTrips } = useStore();
  const [about, setAbout] = useState(false);
  const [wipe, setWipe] = useState(false);
  const month = agencyTrips.filter((t) => t.status !== 'cancelled').reduce((n, t) => n + t.booked * t.price, 0) + 18_400_000;
  const items: [string, string, () => void][] = [
    ['bus', 'الأسطول والسواق', () => { reset('agencyHome'); go('agencyFleet'); }],
    ['shield', 'سياسة الخصوصية والاستخدام', () => go('policy')],
    ['swap', 'ارجع لتطبيق المسافر', () => { set({ role: null }); reset('login'); }],
    ['info', 'عن النسخة التجريبية', () => setAbout(true)],
    ['refresh', 'مسح بيانات التجربة', () => setWipe(true)],
    ['chat', 'الدعم', () => go('support', { as: 'agency' })],
  ];
  return (
    <div className="screen">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(26px + var(--safe-top))', paddingBottom: 26 }}>
          <div className="pad row gap14">
            <span className="agency-logo" style={{ width: 72, height: 72, borderRadius: 22 }}><Logo size={40} /></span>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{AGENCY_NAME}</div>
              <div className="tiny" style={{ opacity: 0.8 }}>مكتب موثّق ✓ · بغداد، الكرادة</div>
            </div>
          </div>
          <div className="pad row gap10" style={{ marginTop: 20 }}>
            {[[money(month), 'مبيعات الشهر (د.ع)'], [String(AGENCY_VEHICLES.length), 'مركبات'], ['4.8 ★', 'تقييم المكتب']].map(([v, l]) => (
              <div key={l} className="grow center" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '10px 0' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 17 }}>{v}</div>
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
          <button className="list-item" onClick={() => { set({ role: null }); reset('login'); go('login', { agency: true }); }} style={{ color: 'var(--alert)' }}>
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
