import { useRef, useState } from 'react';
import { findVehicle, vLabel } from '../agency';
import { CITIES, garageById, longDate, money, newCode, todayIso } from '../data';
import { Icon } from '../icons';
import { CityPicker, DateField, GarageField, TimeField, addDays } from '../pickers';
import { INCLUDES, PKG_TYPES, durationLabel, nightsOf, pkgTotal, type IncludeId, type Package, type PkgArt, type PlanDay, type PkgBooking } from '../packages';
import { useStore } from '../store';
import { QR, Time, TopBar } from '../ui';
import { shrinkImage } from './Account';

/* ---------- covers ---------- */

export function PkgArtSvg({ kind }: { kind: PkgArt }) {
  if (kind === 'shrine') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="قبة ومنارتين">
        <rect width="400" height="220" fill="#F3D9A4" />
        <rect x="120" y="90" width="160" height="130" fill="#E7BE62" />
        <path d="M150 92 Q200 0 250 92Z" fill="#D4A23C" />
        <rect x="92" y="30" width="18" height="190" fill="#D4A23C" />
        <rect x="290" y="30" width="18" height="190" fill="#D4A23C" />
        <rect x="185" y="150" width="30" height="70" rx="15" fill="#B9862A" />
      </svg>
    );
  }
  if (kind === 'river') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="نهر ونخيل">
        <rect width="400" height="220" fill="#F6C98F" />
        <circle cx="90" cy="80" r="30" fill="#F49E4C" />
        <rect y="150" width="400" height="70" fill="#3A6E8F" />
        <path d="M300 150 L305 70 L310 150Z M335 150 L338 88 L341 150Z" fill="#4A3524" />
        <path d="M305 70 q-28 -8 -40 10 M305 70 q28 -8 40 10 M305 70 q-12 -24 -30 -20 M305 70 q12 -24 30 -20" stroke="#2F5540" strokeWidth="7" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="جبال وشلال">
      <rect width="400" height="220" fill="#8DBEDC" />
      <circle cx="310" cy="55" r="24" fill="#F8D27A" />
      <path d="M0 160 L95 60 L170 130 L245 50 L400 170 L400 220 L0 220Z" fill="#3E6B4E" />
      <path d="M0 190 L125 130 L225 180 L325 140 L400 180 L400 220 L0 220Z" fill="#2F5540" />
      <path d="M238 54 L250 54 L260 200 L228 200Z" fill="#E8F1F8" />
    </svg>
  );
}

function Cover({ p, index = 0 }: { p: Package; index?: number }) {
  const src = p.photos[index];
  return src ? <img src={src} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <PkgArtSvg kind={p.art} />;
}

const seatsLeft = (p: Package) => Math.max(0, p.seats - p.booked);

/* ---------- passenger: list ---------- */

export function PackageList() {
  const { packages, go } = useStore();
  const [cat, setCat] = useState('الكل');
  const today = todayIso();
  const list = packages
    .filter((p) => p.status !== 'pending' && p.date >= today && (cat === 'الكل' || p.type === cat))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="hscroll" role="tablist" aria-label="نوع السفرة" style={{ paddingTop: 14 }}>
        {['الكل', ...PKG_TYPES].map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className={`chip ag-chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="pad stack gap14" style={{ marginTop: 10 }}>
        {list.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>ما اكو سفرات بهالنوع هسه.</div> : null}
        {list.map((p) => {
          const left = seatsLeft(p);
          const tags = p.includes.slice(0, 3).map((id) => (id === 'hotel' && p.hotel ? `فندق ${p.hotel.stars}★` : INCLUDES.find((x) => x.id === id)!.name));
          return (
            <button key={p.id} className="pkg-card" onClick={() => go('package', { id: p.id })}>
              <div className="pkg-cover">
                <Cover p={p} />
                <span className="pkg-badge">{durationLabel(p)}</span>
                {left <= 5 ? <span className="pkg-badge hot">{left === 0 ? 'ممتلئة' : `باقي ${left} مقاعد`}</span> : null}
              </div>
              <div className="stack gap6" style={{ padding: '12px 14px 14px', width: '100%' }}>
                <div className="row gap10" style={{ alignItems: 'flex-start' }}>
                  <b className="grow" style={{ fontFamily: 'var(--display)', fontSize: 17, textAlign: 'right' }}>{p.title}</b>
                  <span style={{ textAlign: 'left', lineHeight: 1.2 }}><span className="tiny muted" style={{ display: 'block' }}>من</span><b className="num" style={{ fontSize: 18, color: 'var(--navy)' }}>{money(p.priceAdult)}</b></span>
                </div>
                <div className="small muted" style={{ textAlign: 'right' }}>{p.office} · ★ <span className="num">{p.officeRating}</span> · {longDate(p.date)}</div>
                <div className="row gap6" style={{ flexWrap: 'wrap' }}>
                  {tags.map((t) => <span key={t} className="pkg-tag">{t}</span>)}
                  <span className="pkg-tag gold">{p.type}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- passenger: package page ---------- */

function IncludesList({ p }: { p: Package }) {
  const no = INCLUDES.filter((x) => !p.includes.includes(x.id));
  return (
    <section className="inc-card">
      {INCLUDES.filter((x) => p.includes.includes(x.id)).map((x) => (
        <div key={x.id} className="inc-row">
          <span className="inc-ic"><Icon name={x.icon} size={20} /></span>
          <span className="grow" style={{ lineHeight: 1.45 }}>
            <b style={{ display: 'block', fontSize: 14 }}>{x.name}</b>
            {p.details[x.id] ? <span className="tiny muted">{p.details[x.id]}</span> : null}
          </span>
          <span className="inc-ok"><Icon name="check" size={14} stroke={3.2} /></span>
        </div>
      ))}
      {no.length ? (
        <div className="row gap8 small muted" style={{ paddingTop: 12 }}>
          <span className="inc-no"><Icon name="x" size={12} stroke={3.2} /></span>
          <span>على حسابك: <b style={{ color: 'var(--ink)' }}>{no.map((x) => x.name).join('، ')}</b></span>
        </div>
      ) : null}
    </section>
  );
}

export function PlanView({ plan, start }: { plan: PlanDay[]; start: string }) {
  const [day, setDay] = useState(0);
  const cur = plan[Math.min(day, plan.length - 1)];
  if (!cur) return null;
  const dayDate = (i: number) => new Intl.DateTimeFormat('ar-IQ', { weekday: 'long', day: 'numeric' }).format(new Date(`${addDays(start, i)}T12:00:00`));
  return (
    <section className="stack gap12">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="h3">خطة الرحلة</h2>
        <span className="tiny muted">من المكتب</span>
      </div>
      <div className="plan-tabs" role="tablist" aria-label="أيام الرحلة">
        {plan.map((_, i) => (
          <button key={i} role="tab" aria-selected={i === day} className={i === day ? 'on' : ''} onClick={() => setDay(i)}>
            <span>اليوم <span className="num">{i + 1}</span></span>
            <b>{dayDate(i)}</b>
          </button>
        ))}
      </div>
      <div className="plan-card">
        <b style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 16, marginBottom: 12 }}>{cur.title}</b>
        {cur.items.map((it, i) => (
          <div key={i} className="tl-row">
            <span className="tl-time num"><Time v={it.time} /></span>
            <span className="tl-rail"><i className={i === 0 ? 'first' : ''} />{i < cur.items.length - 1 ? <em /> : null}</span>
            <span className="tl-body"><b>{it.title}</b>{it.note ? <span>{it.note}</span> : null}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PackageDetail() {
  const { route, packages, role, go, back, reset, pkgBookings } = useStore();
  const p = packages.find((x) => x.id === route.params?.id);
  const [shot, setShot] = useState(0);
  if (!p) {
    return <div className="screen"><TopBar title="السفرة" /><div className="empty"><Icon name="info" size={40} /><b>ما لكينا السفرة</b></div></div>;
  }
  const office = role === 'agency';
  const left = seatsLeft(p);
  const shots = Math.max(1, p.photos.length);
  const mineBookings = pkgBookings.filter((b) => b.pkgId === p.id && b.status === 'confirmed');
  return (
    <div className="screen gray">
      <div className="scroll" style={{ paddingBottom: office ? 24 : 'calc(120px + var(--safe-bottom))' }}>
        <div className="pkg-hero">
          <div
            className="pkg-gallery"
            onScroll={(e) => {
              const el = e.currentTarget;
              setShot(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
            }}
          >
            {Array.from({ length: shots }, (_, i) => (
              <div key={i} className="pkg-slide"><Cover p={p} index={i} /></div>
            ))}
          </div>
          <button className="iconbtn pkg-float" style={{ right: 16 }} aria-label="رجوع" onClick={() => { if (!back()) reset(office ? 'agencyHome' : 'home'); }}><Icon name="back" size={20} /></button>
          {shots > 1 ? <span className="pkg-count num">{shot + 1} / {shots}</span> : null}
        </div>
        <div className="pkg-body stack gap14">
          <div>
            <span className="pkg-tag gold">{p.type}</span>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 23, fontWeight: 700, margin: '8px 0 4px' }}>{p.title}</h1>
            <div className="row gap8 small muted">
              <span className="pkg-office">{p.office.replace('مكتب ', '').slice(0, 1)}</span>
              <b style={{ color: 'var(--ink)' }}>{p.office}</b> · ★ <span className="num">{p.officeRating}</span>
            </div>
          </div>
          <div className="row gap8">
            {[[durationLabel(p).split(' · ')[0], durationLabel(p).split(' · ')[1] ?? 'بدون مبيت'], [longDate(p.date).split('،')[0], <Time key="t" v={p.time} />], [String(left), 'مقاعد باقية']].map(([a, b], i) => (
              <div key={i} className="card grow center" style={{ padding: '10px 4px' }}>
                <b className="num" style={{ display: 'block', fontSize: 15, color: i === 2 && left <= 5 ? '#B23A4C' : 'var(--navy)' }}>{a}</b>
                <span className="tiny muted">{b}</span>
              </div>
            ))}
          </div>
          {p.desc ? <p className="small" style={{ margin: 0, lineHeight: 1.8, color: '#3A3755' }}>{p.desc}</p> : null}
          <div className="card" style={{ padding: '4px 14px' }}>
            <div className="list-item" style={{ minHeight: 50 }}>
              <span className="ic"><Icon name="pin" size={18} /></span>
              <span className="grow small">التجمع: <b>{garageById(p.meetGarageId).name}</b>{p.meetNote ? ` · ${p.meetNote}` : ''}</span>
            </div>
            <div className="list-item" style={{ minHeight: 50 }}>
              <span className="ic"><Icon name="bus" size={18} /></span>
              <span className="grow small">{p.vehicleLabel} · الرجعة {longDate(p.backDate).split('،')[0]} <span className="num"><Time v={p.backTime} /></span></span>
            </div>
          </div>

          <section className="stack gap10">
            <h2 className="h3">شنو يشمل السعر</h2>
            <IncludesList p={p} />
          </section>

          <PlanView plan={p.plan} start={p.date} />

          <section className="card stack gap8 small">
            <b style={{ fontSize: 15 }}>قبل لا تحجز</b>
            <span>• الإلغاء مجاني لحد <span className="num">{p.cancelDays}</span> {p.cancelDays === 1 ? 'يوم' : 'أيام'} قبل الرحلة، بعدها يرجع 50%.</span>
            {p.docs.length ? <span>• جيب وياك: {p.docs.join('، ')}.</span> : null}
            {p.priceChild ? <span>• الطفل (تحت 10 سنين) بـ <span className="num">{money(p.priceChild)}</span> د.ع.</span> : null}
            {p.priceSingle ? <span>• الغرفة المنفردة تزيد <span className="num">{money(p.priceSingle)}</span> د.ع.</span> : null}
          </section>

          {office ? (
            <section className="card stack gap8">
              <div className="row" style={{ justifyContent: 'space-between' }}><b>الحجوزات</b><span className="pill info"><span className="num">{p.booked}/{p.seats}</span></span></div>
              <div className="ag-bar"><i style={{ width: `${Math.min(100, (p.booked / p.seats) * 100)}%` }} /></div>
              {mineBookings.map((b) => (
                <div key={b.code} className="row small gap8"><b className="grow">{b.name}</b><span className="muted">{b.adults + b.children} أشخاص · {b.pay}</span><span className="code" style={{ letterSpacing: 1 }}>{b.code}</span></div>
              ))}
              <div className="tiny muted">المبيعات: <b className="num">{money(p.booked * p.priceAdult)}</b> د.ع تقريباً</div>
            </section>
          ) : null}
        </div>
      </div>
      {office ? null : (
        <div className="pkg-bar">
          <div style={{ lineHeight: 1.25 }}>
            <span className="tiny muted">للشخص</span>
            <div className="num" style={{ fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}>{money(p.priceAdult)} <span style={{ fontSize: 12 }}>د.ع</span></div>
            {p.payMode === 'deposit' ? <span className="tiny muted">عربون <span className="num">{money(p.deposit)}</span> بالتطبيق</span> : null}
          </div>
          <button className="btn grow" disabled={left === 0} onClick={() => go('packageBook', { id: p.id })}>{left === 0 ? 'ممتلئة' : 'احجز مكانك'}</button>
        </div>
      )}
    </div>
  );
}

/* ---------- passenger: booking ---------- */

function Counter({ label, sub, value, min, max, onChange }: { label: string; sub?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="seats-card" style={{ background: '#fff' }}>
      <div className="grow">
        <div className="bold">{label}</div>
        {sub ? <div className="tiny muted">{sub}</div> : null}
      </div>
      <button aria-label={`أقل ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <b className="num">{value}</b>
      <button aria-label={`أكثر ${label}`} className="plus" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function PackageBook() {
  const { route, packages, name, phone, card, go, reset, addPkgBooking } = useStore();
  const p = packages.find((x) => x.id === route.params?.id);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [single, setSingle] = useState(false);
  const [lead, setLead] = useState(name && name !== 'ضيف' ? name : '');
  const [pay, setPay] = useState<'zain' | 'card' | 'cash'>('zain');
  const [err, setErr] = useState('');
  if (!p) return <div className="screen"><TopBar title="الحجز" /><div className="empty"><b>ما لكينا السفرة</b></div></div>;
  const left = seatsLeft(p);
  const people = adults + children;
  const total = pkgTotal(p, adults, children, single && adults === 1);
  const now = pay === 'cash' ? 0 : p.payMode === 'deposit' ? Math.min(total, p.deposit * people) : total;

  const confirm = () => {
    if (lead.trim().split(/\s+/).filter(Boolean).length < 2) return setErr('اكتب اسم صاحب الحجز الثنائي');
    if (people > left) return setErr(`باقي ${left} مقاعد بس`);
    if (pay === 'card' && !card) return setErr('ضيف بطاقة من المحفظة أول، أو اختار زين كاش');
    const draft: PkgBooking = {
      code: newCode(),
      pkgId: p.id,
      name: lead.trim(),
      phone,
      adults,
      children,
      single: single && adults === 1,
      total,
      paid: now,
      pay: pay === 'cash' ? 'نقداً بالكراج' : pay === 'zain' ? 'زين كاش' : `${card!.brand} ${card!.first4}`,
      status: 'confirmed',
      createdAt: Date.now(),
    };
    if (pay === 'cash') {
      addPkgBooking(draft);
      reset('home');
      go('pkgTicket', { code: draft.code, fresh: true });
      return;
    }
    go('pay', { pkg: draft, method: pay });
  };

  return (
    <div className="screen gray">
      <TopBar title="احجز السفرة" sub={p.title} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <Counter label="بالغين" value={adults} min={1} max={Math.max(1, left - children)} onChange={(n) => { setAdults(n); setErr(''); }} sub={`${money(p.priceAdult)} د.ع للشخص`} />
        {p.priceChild ? <Counter label="أطفال" sub={`تحت 10 سنين · ${money(p.priceChild)} د.ع`} value={children} min={0} max={Math.max(0, left - adults)} onChange={(n) => { setChildren(n); setErr(''); }} /> : null}
        {p.priceSingle && adults === 1 && children === 0 ? (
          <button className={`radio ${single ? 'on' : ''}`} role="checkbox" aria-checked={single} onClick={() => setSingle(!single)}>
            <span className="dot" />
            <span className="grow"><span className="bold" style={{ display: 'block' }}>غرفة منفردة</span><span className="tiny muted">تزيد {money(p.priceSingle)} د.ع</span></span>
          </button>
        ) : null}
        <div className="field">
          <label htmlFor="lead">اسم صاحب الحجز</label>
          <input id="lead" className="input" style={{ background: '#fff' }} placeholder="الاسم الثلاثي" value={lead} onChange={(e) => { setLead(e.target.value); setErr(''); }} />
        </div>
        <span className="label">طريقة الدفع</span>
        {([
          ['zain', 'زين كاش', p.payMode === 'deposit' ? 'تدفع العربون هسه والباقي بالكراج' : 'تدفع المبلغ كامل', 'wallet'],
          ['card', card ? `${card.brand} ${card.first4} ••••` : 'بطاقة', card ? 'بطاقتك المحفوظة' : 'ضيف بطاقة بالمحفظة أول', 'card'],
          ['cash', 'نقداً بالكراج', 'تدفع كلشي يوم الرحلة', 'cash'],
        ] as const).map(([id, l, note, icon]) => (
          <button key={id} role="radio" aria-checked={pay === id} className={`radio ${pay === id ? 'on' : ''}`} onClick={() => { setPay(id); setErr(''); }}>
            <span className="dot" />
            <span className="grow"><span className="bold" style={{ display: 'block' }}>{l}</span><span className="tiny muted">{note}</span></span>
            <span style={{ color: 'var(--navy)' }}><Icon name={icon} size={22} /></span>
          </button>
        ))}
        <div className="card flat stack gap6">
          <div className="row small" style={{ justifyContent: 'space-between' }}><span>{adults} بالغ × {money(p.priceAdult)}</span><span className="num">{money(adults * p.priceAdult)}</span></div>
          {children ? <div className="row small" style={{ justifyContent: 'space-between' }}><span>{children} طفل × {money(p.priceChild)}</span><span className="num">{money(children * p.priceChild)}</span></div> : null}
          {single && adults === 1 && children === 0 ? <div className="row small" style={{ justifyContent: 'space-between' }}><span>غرفة منفردة</span><span className="num">{money(p.priceSingle)}</span></div> : null}
          <div className="row" style={{ justifyContent: 'space-between' }}><b>المجموع</b><b className="num" style={{ color: 'var(--navy)', fontSize: 18 }}>{money(total)} د.ع</b></div>
          {now !== total ? <div className="row small" style={{ justifyContent: 'space-between', color: 'var(--slate)' }}><span>{now ? 'تدفع هسه' : 'تدفع هسه'}</span><b className="num">{money(now)}</b></div> : null}
          {now !== total ? <div className="row small" style={{ justifyContent: 'space-between', color: 'var(--slate)' }}><span>الباقي بالكراج</span><b className="num">{money(total - now)}</b></div> : null}
        </div>
        {err ? <div className="err">{err}</div> : null}
      </div>
      <div className="bottombar">
        <button className="btn" onClick={confirm}>{pay === 'cash' ? 'ثبّت الحجز' : `ادفع ${money(now)} د.ع`}</button>
      </div>
    </div>
  );
}

export function PkgTicket() {
  const { route, pkgBookings, packages, go, reset } = useStore();
  const b = pkgBookings.find((x) => x.code === route.params?.code);
  const p = b ? packages.find((x) => x.id === b.pkgId) : undefined;
  if (!b || !p) return <div className="screen"><TopBar title="الحجز" /><div className="empty"><b>ما لكينا الحجز</b></div></div>;
  return (
    <div className="screen gray">
      <TopBar title={route.params?.fresh ? 'تم الحجز! 🎉' : 'حجز السفرة'} onBack={() => reset('home')} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <div className="pkg-ticket">
          <div className="pkg-ticket-cover"><Cover p={p} /></div>
          <div className="stack gap8" style={{ padding: 16 }}>
            <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{p.title}</b>
            <div className="small muted">{p.office} · {durationLabel(p)}</div>
            <div className="row gap12" style={{ alignItems: 'center' }}>
              <div className="grow stack gap6 small">
                <span>الانطلاق: <b>{longDate(p.date)}</b> · <span className="num"><Time v={p.time} /></span></span>
                <span>التجمع: <b>{garageById(p.meetGarageId).name}</b></span>
                <span>الأشخاص: <b className="num">{b.adults}</b> بالغ{b.children ? <> · <b className="num">{b.children}</b> طفل</> : null}</span>
                <span>دفعت: <b className="num">{money(b.paid)}</b>{b.total > b.paid ? <> · الباقي بالكراج <b className="num">{money(b.total - b.paid)}</b></> : null}</span>
              </div>
              <div style={{ width: 110 }}><QR text={`BDARBIPKG|${b.code}|${p.id}`} /></div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tiny muted">رمز الحجز</span>
              <b className="code" style={{ letterSpacing: 2, fontSize: 18 }}>{b.code}</b>
            </div>
          </div>
        </div>
        <button className="btn soft" onClick={() => go('package', { id: p.id })}><Icon name="calendar" size={20} /> شوف خطة الرحلة</button>
        <button className="btn" onClick={() => reset('home')}>رجوع للرئيسية</button>
      </div>
    </div>
  );
}

/* ---------- office: what to add ---------- */

export function AgencyNew() {
  const { replace } = useStore();
  return (
    <div className="screen gray">
      <TopBar title="شنو تريد تضيف؟" />
      <div className="pad stack gap12" style={{ marginTop: 6 }}>
        <button className="new-opt" onClick={() => replace('driverAddTrip', { agency: true })}>
          <span className="new-ic"><Icon name="bus" size={28} /></span>
          <span className="grow"><b>رحلة نقل</b><span>من مدينة لمدينة بمقعد، مثل رحلات الكراج</span></span>
          <Icon name="forward" size={18} />
        </button>
        <button className="new-opt" onClick={() => replace('pkgCreate')}>
          <span className="new-ic gold"><Icon name="flag" size={28} /></span>
          <span className="grow"><b>سفرة سياحية أو زيارة</b><span>بيها صور، وفندق وأكل، وخطة يوم بيوم</span></span>
          <Icon name="forward" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ---------- office: create a package ---------- */

type Draft = Omit<Package, 'id' | 'office' | 'officeRating' | 'mine' | 'booked' | 'createdAt'>;

export function PkgCreate() {
  const { agencyVehicles, agencyDrivers, agencyTrips, agencyInfo, packages, set, back, reset, go, showToast } = useStore();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [day, setDay] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const start = addDays(todayIso(), 7);
  const [d, setD] = useState<Draft>({
    title: '', type: 'سياحية', photos: [], art: 'mountain', from: 'بغداد', to: 'أربيل', meetGarageId: '', meetNote: '', desc: '',
    date: start, time: '06:00', backDate: addDays(start, 2), backTime: '16:00', vehicleId: '', vehicleLabel: '', seats: 0, deadline: 'day',
    includes: ['transport', 'hotel', 'breakfast'], details: {}, hotel: { name: '', stars: 4, nights: 2 },
    plan: [{ title: '', items: [{ time: '06:00', title: 'التجمع والانطلاق', note: '' }] }],
    priceAdult: 0, priceChild: 0, priceSingle: 0, payMode: 'deposit', deposit: 50000, cancelDays: 3, docs: ['البطاقة الوطنية'],
  });
  const up = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setErr(''); };
  const nights = nightsOf(d);
  const STEPS = ['الرحلة', 'الموعد', 'يشمل والخطة', 'السعر'];

  const busy = (vid: string) => agencyTrips.some((t) => t.vehicleId === vid && t.status !== 'cancelled' && t.date >= d.date && t.date <= d.backDate)
    || packages.some((p) => p.vehicleId === vid && p.date <= d.backDate && p.backDate >= d.date);

  const setPlanDays = (n: number) => {
    const plan = [...d.plan];
    while (plan.length < n) plan.push({ title: '', items: [{ time: '09:00', title: '', note: '' }] });
    up({ plan: plan.slice(0, n) });
    setDay(Math.min(day, n - 1));
  };
  const editDay = (i: number, patch: Partial<PlanDay>) => up({ plan: d.plan.map((x, k) => (k === i ? { ...x, ...patch } : x)) });

  const next = () => {
    if (step === 1) {
      if (d.title.trim().length < 4) return setErr('اكتب اسم الرحلة');
      if (d.from === d.to) return setErr('الانطلاق والوجهة لازم يختلفون');
      if (!d.meetGarageId) return setErr('اختار نقطة التجمع');
    }
    if (step === 2) {
      if (d.backDate < d.date) return setErr('يوم الرجعة لازم يكون بعد يوم الانطلاق');
      if (!d.vehicleId) return setErr('اختار المركبة');
      if (d.plan.length !== nights + 1) setPlanDays(nights + 1);
    }
    if (step === 3) {
      if (!d.includes.length) return setErr('اختار شنو يشمل السعر');
      if (d.includes.includes('hotel') && (d.hotel?.name.trim().length ?? 0) < 3) return setErr('اكتب اسم الفندق');
      const empty = d.plan.findIndex((x) => !x.title.trim() || x.items.some((it) => !it.title.trim()));
      if (empty >= 0) { setDay(empty); return setErr(`كمّل خطة اليوم ${empty + 1}: العنوان وكل فقرة`); }
    }
    if (step === 4) {
      if (d.priceAdult < 5000) return setErr('اكتب سعر الشخص البالغ');
      if (d.payMode === 'deposit' && (d.deposit < 1000 || d.deposit >= d.priceAdult)) return setErr('العربون لازم يكون أقل من سعر الشخص');
      return publish();
    }
    setErr('');
    setStep(step + 1);
  };

  const publish = () => {
    const details: Partial<Record<IncludeId, string>> = { ...d.details };
    const v = findVehicle(agencyVehicles, d.vehicleId);
    if (d.includes.includes('transport') && !details.transport && v) details.transport = `${vLabel(v)} مقعد ذهاب وإياب`;
    if (d.includes.includes('hotel') && d.hotel) details.hotel = `${d.hotel.name} ${d.hotel.stars}★ · ${nights === 1 ? 'ليلة' : nights === 2 ? 'ليلتين' : `${nights} ليالي`}`;
    const pkg: Package = { ...d, details, hotel: d.includes.includes('hotel') ? { ...d.hotel!, nights } : undefined, id: 'p' + Date.now(), office: agencyInfo.name, officeRating: '4.8', mine: true, booked: 0, createdAt: Date.now(), title: d.title.trim(), status: 'pending' };
    set({ packages: [...packages, pkg] });
    const driver = agencyDrivers.find((x) => x.vehicleId === d.vehicleId);
    showToast(`انرسلت السفرة للإدارة — تنتشر بعد الموافقة${driver ? `، ووصلت للسائق ${driver.name.split(' ')[0]}` : ''}`);
    reset('agencyHome');
    go('agencyTrips', { tab: 'pkg' });
  };

  const onPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = 5 - d.photos.length;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      try { out.push(await shrinkImage(f, 720, 480)); } catch { showToast('ما گدرنا نقرأ وحدة من الصور'); }
    }
    up({ photos: [...d.photos, ...out] });
  };

  const cur = d.plan[day];

  return (
    <div className="screen">
      <TopBar title="سفرة جديدة" sub={`الخطوة ${step} من 4 · ${STEPS[step - 1]}`} onBack={() => { setErr(''); if (step > 1) setStep(step - 1); else back(); }} />
      <div className="steps pad" aria-label={`الخطوة ${step} من 4`}>
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''}`}>
            <span className="step-dot num">{i + 1 < step ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="scroll pad stack gap12" style={{ paddingTop: 14, paddingBottom: 20 }}>
        {step === 1 ? (
          <>
            <span className="label">صور الرحلة <span className="muted" style={{ fontWeight: 500 }}>(الأولى غلاف · لحد 5)</span></span>
            <div className="photo-grid">
              {d.photos.map((src, i) => (
                <div key={i} className={`photo ${i === 0 ? 'cover' : ''}`}>
                  <img src={src} alt={`صورة ${i + 1}`} />
                  {i === 0 ? <span className="photo-tag">غلاف</span> : null}
                  <button className="photo-x" aria-label={`احذف الصورة ${i + 1}`} onClick={() => up({ photos: d.photos.filter((_, k) => k !== i) })}><Icon name="x" size={14} stroke={3} /></button>
                </div>
              ))}
              {d.photos.length < 5 ? (
                <button className={`photo add ${d.photos.length === 0 ? 'cover' : ''}`} onClick={() => fileRef.current?.click()}>
                  <Icon name="image" size={24} />
                  <span>{d.photos.length ? 'صورة ثانية' : 'أضف صور'}</span>
                </button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void onPhotos(e.target.files); e.target.value = ''; }} />
            {d.photos.length === 0 ? <div className="tiny muted">بدون صور تطلع رسمة بدلها. الصور تخلي الناس تحجز أكثر.</div> : null}
            <div className="field">
              <label htmlFor="ptitle">اسم الرحلة</label>
              <input id="ptitle" className="input" placeholder="مثلاً: سفرة شقلاوة وجنديان" value={d.title} onChange={(e) => up({ title: e.target.value.slice(0, 50) })} />
            </div>
            <span className="label">نوع الرحلة</span>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              {PKG_TYPES.map((t) => (
                <button key={t} className={`chip ag-chip ${d.type === t ? 'on' : ''}`} style={{ height: 38 }} onClick={() => up({ type: t, art: t === 'زيارة دينية' ? 'shrine' : d.art })}>{t}</button>
              ))}
            </div>
            <div className="route-box">
              <div className="route-row">
                <span className="route-dot" />
                <div className="grow"><CityPicker id="pfrom" label="الانطلاق من" value={d.from} onChange={(c) => up({ from: c, meetGarageId: '', to: c === d.to ? CITIES.find((x) => x !== c)! : d.to })} /></div>
              </div>
              <div className="route-line" />
              <div className="route-row">
                <span className="route-dot gold" />
                <div className="grow"><CityPicker id="pto" label="الوجهة" value={d.to} exclude={d.from} onChange={(c) => up({ to: c, art: c === 'البصرة' ? 'river' : c.includes('كربلاء') || c.includes('النجف') ? 'shrine' : 'mountain' })} /></div>
              </div>
            </div>
            <GarageField label={`نقطة التجمع في ${d.from}`} placeholder="اختار نقطة التجمع" icon="pin" city={d.from} value={d.meetGarageId} onChange={(id) => up({ meetGarageId: id })} />
            <input className="input" placeholder="تفصيل المكان (اختياري): مثلاً قرب البوابة الرئيسية" value={d.meetNote} onChange={(e) => up({ meetNote: e.target.value.slice(0, 60) })} />
            <div className="field">
              <label htmlFor="pdesc">وصف قصير</label>
              <textarea id="pdesc" className="input" rows={3} style={{ height: 'auto', padding: 12, resize: 'none', lineHeight: 1.7 }} placeholder="شنو أحلى شي بهالسفرة؟" value={d.desc} onChange={(e) => up({ desc: e.target.value.slice(0, 220) })} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h3 className="h3">الذهاب</h3>
            <DateField label="يوم الانطلاق" value={d.date} min={addDays(todayIso(), 1)} onChange={(x) => up({ date: x, backDate: d.backDate < x ? x : d.backDate })} />
            <TimeField label="ساعة الانطلاق" value={d.time} onChange={(x) => up({ time: x })} />
            <h3 className="h3">الرجعة</h3>
            <DateField label="يوم الرجعة" value={d.backDate} min={d.date} onChange={(x) => up({ backDate: x })} />
            <TimeField label="ساعة الرجعة" value={d.backTime} onChange={(x) => up({ backTime: x })} />
            <div className="pill info" style={{ height: 44, justifyContent: 'center', fontSize: 14 }}><Icon name="clock" size={18} />&nbsp;المدة: {durationLabel(d)}</div>
            <h3 className="h3">المركبة والسائق</h3>
            <div className="veh-grid">
              {agencyVehicles.map((v) => {
                const drv = agencyDrivers.find((x) => x.vehicleId === v.id && x.status === 'active');
                const b = busy(v.id);
                return (
                  <button key={v.id} className={`veh ${d.vehicleId === v.id ? 'on' : ''}`} disabled={b || !drv} onClick={() => up({ vehicleId: v.id, vehicleLabel: vLabel(v), seats: v.seats })}>
                    <b>{vLabel(v)}</b>
                    <span className="tiny">{drv ? drv.name.split(' ')[0] : 'بلا سائق'}</span>
                    <span className="tiny muted">{b ? 'مشغولة' : `${v.seats} مقعد`}</span>
                  </button>
                );
              })}
            </div>
            <span className="label">آخر موعد للحجز</span>
            <div className="seg">
              {([['day', 'قبل يوم'], ['hours12', 'قبل 12 ساعة'], ['none', 'لحد الحركة']] as const).map(([id, l]) => (
                <button key={id} className={d.deadline === id ? 'on' : ''} onClick={() => up({ deadline: id })}>{l}</button>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="label">اضغط على اللي يشمله السعر</span>
              <span className="tiny muted"><span className="num">{d.includes.length}</span> من 8</span>
            </div>
            <div className="inc-grid">
              {INCLUDES.map((x) => {
                const on = d.includes.includes(x.id);
                return (
                  <button key={x.id} role="checkbox" aria-checked={on} className={`inc-tile ${on ? 'on' : ''}`} onClick={() => up({ includes: on ? d.includes.filter((k) => k !== x.id) : [...d.includes, x.id] })}>
                    <span className="inc-tile-ic"><Icon name={x.icon} size={20} /></span>
                    <span>{x.name}</span>
                    {on ? <i><Icon name="check" size={11} stroke={3.5} /></i> : null}
                  </button>
                );
              })}
            </div>
            {d.includes.filter((k) => k !== 'transport' && k !== 'hotel').map((k) => (
              <input key={k} className="input" style={{ height: 46 }} placeholder={`تفصيل ${INCLUDES.find((x) => x.id === k)!.name} (اختياري): مثلاً كل يوم بالفندق`} value={d.details[k] ?? ''} onChange={(e) => up({ details: { ...d.details, [k]: e.target.value.slice(0, 50) } })} />
            ))}
            {d.includes.includes('hotel') ? (
              <div className="form-card" style={{ gap: 10 }}>
                <b>الفندق</b>
                <input className="input" placeholder="اسم الفندق" value={d.hotel?.name ?? ''} onChange={(e) => up({ hotel: { ...d.hotel!, name: e.target.value.slice(0, 40) } })} />
                <div className="row gap6" role="radiogroup" aria-label="نجوم الفندق">
                  {[2, 3, 4, 5].map((n) => (
                    <button key={n} role="radio" aria-checked={d.hotel?.stars === n} className={`chip ag-chip ${d.hotel?.stars === n ? 'on' : ''}`} style={{ height: 38, flex: 1, justifyContent: 'center' }} onClick={() => up({ hotel: { ...d.hotel!, stars: n } })}><span className="num">{n}</span>★</button>
                  ))}
                </div>
                <div className="tiny muted">{nights ? `${nights === 1 ? 'ليلة' : nights === 2 ? 'ليلتين' : `${nights} ليالي`} حسب موعد الرجعة` : 'السفرة يوم واحد بدون مبيت'}</div>
              </div>
            ) : null}

            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <h3 className="h3">خطة الرحلة</h3>
              <span className="tiny muted">تطلع للمسافر يوم بيوم</span>
            </div>
            <div className="row gap8">
              {d.plan.map((_, i) => (
                <button key={i} className={`chip ag-chip ${i === day ? 'on' : ''}`} style={{ height: 40, flex: 1, justifyContent: 'center' }} onClick={() => setDay(i)}>اليوم <span className="num">{i + 1}</span></button>
              ))}
              <button className="iconbtn" aria-label="أضف يوم" style={{ border: '2px dashed #B9B5D3', background: 'transparent' }} onClick={() => { setPlanDays(d.plan.length + 1); setDay(d.plan.length); }}><Icon name="plus" size={18} /></button>
            </div>
            {cur ? (
              <div className="form-card" style={{ gap: 10 }}>
                <div className="row gap8">
                  <input className="input grow" aria-label="عنوان اليوم" placeholder={`عنوان اليوم ${day + 1}: مثلاً الطريق إلى شقلاوة`} value={cur.title} onChange={(e) => editDay(day, { title: e.target.value.slice(0, 40) })} style={{ fontWeight: 700 }} />
                  {d.plan.length > 1 ? <button className="iconbtn" aria-label="احذف اليوم" style={{ color: 'var(--alert)' }} onClick={() => { up({ plan: d.plan.filter((_, k) => k !== day) }); setDay(Math.max(0, day - 1)); }}><Icon name="trash" size={18} /></button> : null}
                </div>
                {cur.items.map((it, k) => (
                  <div key={k} className="plan-edit">
                    <TimeField compact label={`وقت الفقرة ${k + 1}`} value={it.time} onChange={(t) => editDay(day, { items: cur.items.map((x, j) => (j === k ? { ...x, time: t } : x)) })} />
                    <div className="grow stack gap6">
                      <input className="input" aria-label="الفقرة" placeholder="شنو يصير؟" value={it.title} onChange={(e) => editDay(day, { items: cur.items.map((x, j) => (j === k ? { ...x, title: e.target.value.slice(0, 50) } : x)) })} />
                      <input className="input small-input" aria-label="تفصيل" placeholder="تفصيل (اختياري)" value={it.note} onChange={(e) => editDay(day, { items: cur.items.map((x, j) => (j === k ? { ...x, note: e.target.value.slice(0, 60) } : x)) })} />
                    </div>
                    {cur.items.length > 1 ? <button className="plan-x" aria-label="احذف الفقرة" onClick={() => editDay(day, { items: cur.items.filter((_, j) => j !== k) })}><Icon name="x" size={16} stroke={2.6} /></button> : null}
                  </div>
                ))}
                <button className="btn soft sm" style={{ border: '2px dashed #B9B5D3', background: 'transparent' }} onClick={() => {
                  const last = cur.items[cur.items.length - 1];
                  const [h, m] = (last?.time ?? '08:00').split(':').map(Number);
                  const t = `${String(Math.min(23, h + 2)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  editDay(day, { items: [...cur.items, { time: t, title: '', note: '' }] });
                }}><Icon name="plus" size={16} /> أضف فقرة</button>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <span className="label">الأسعار (للشخص)</span>
            <div className="card" style={{ padding: '4px 14px' }}>
              {([['priceAdult', 'البالغ', ''], ['priceChild', 'الطفل', 'تحت 10 سنين · 0 = ما يقبل أطفال'], ['priceSingle', 'غرفة منفردة', 'زيادة · 0 = ماكو']] as const).map(([k, l, sub]) => (
                <div key={k} className="row gap10" style={{ minHeight: 60, borderBottom: k !== 'priceSingle' ? '1px solid #ECEBF3' : 0 }}>
                  <label htmlFor={k} className="grow"><b style={{ display: 'block' }}>{l}</b>{sub ? <span className="tiny muted">{sub}</span> : null}</label>
                  <input id={k} className="input num" inputMode="numeric" dir="ltr" style={{ width: 120, height: 42, textAlign: 'center', fontWeight: 700 }} value={d[k] ? money(d[k]) : ''} placeholder="0" onChange={(e) => up({ [k]: Number(e.target.value.replace(/\D/g, '')) } as Partial<Draft>)} />
                  <span className="tiny muted">د.ع</span>
                </div>
              ))}
            </div>
            <span className="label">الدفع</span>
            <div className="seg">
              <button className={d.payMode === 'deposit' ? 'on' : ''} onClick={() => up({ payMode: 'deposit' })}>عربون والباقي بالكراج</button>
              <button className={d.payMode === 'full' ? 'on' : ''} onClick={() => up({ payMode: 'full' })}>دفع كامل</button>
            </div>
            {d.payMode === 'deposit' ? (
              <div className="price-box">
                <input className="num" inputMode="numeric" dir="ltr" aria-label="العربون" value={d.deposit ? money(d.deposit) : ''} onChange={(e) => up({ deposit: Number(e.target.value.replace(/\D/g, '')) })} />
                <span>د.ع عربون للشخص</span>
              </div>
            ) : null}
            <span className="label">الإلغاء المجاني لحد</span>
            <div className="seg">
              {[1, 3, 7].map((n) => <button key={n} className={d.cancelDays === n ? 'on' : ''} onClick={() => up({ cancelDays: n })}><span className="num">{n}</span> {n === 1 ? 'يوم' : 'أيام'} قبل</button>)}
            </div>
            <span className="label">المستمسكات المطلوبة</span>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              {['البطاقة الوطنية', 'جواز سفر', 'صورة شخصية'].map((x) => {
                const on = d.docs.includes(x);
                return <button key={x} className={`chip ag-chip ${on ? 'on' : ''}`} style={{ height: 36 }} onClick={() => up({ docs: on ? d.docs.filter((y) => y !== x) : [...d.docs, x] })}>{x}</button>;
              })}
            </div>
          </>
        ) : null}

        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar">
        <button className="btn" onClick={next}>{step < 4 ? <>التالي <Icon name="forward" size={18} /></> : 'انشر السفرة'}</button>
      </div>
    </div>
  );
}

/** The office's packages (on its trips tab). */
export function OfficePackages() {
  const { packages, go } = useStore();
  const mine = packages.filter((p) => p.mine).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="stack gap10">
      {mine.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>ما عندك سفرات. اضغط + وبعدها «سفرة سياحية».</div> : null}
      {mine.map((p) => (
        <button key={p.id} className="ag-trip" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('package', { id: p.id })}>
          <span style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}><Cover p={p} /></span>
          <span className="grow stack gap6" style={{ textAlign: 'right' }}>
            <b>{p.title}</b>
            <span className="tiny muted">{longDate(p.date)} · {durationLabel(p)}</span>
            <span className="ag-bar"><i style={{ width: `${Math.min(100, (p.booked / Math.max(1, p.seats)) * 100)}%` }} /></span>
            <span className="tiny">{p.status === 'pending' ? <span className="pill warn" style={{ height: 22, fontSize: 11 }}>بانتظار موافقة الإدارة</span> : <><b className="num">{p.booked}/{p.seats}</b> محجوز</>}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
