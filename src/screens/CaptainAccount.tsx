import { useState } from 'react';
import { DRIVER_TRIP_ID, money, tripById } from '../data';
import { Icon } from '../icons';
import { useCaptainInfo } from '../captain';
import { useStore } from '../store';
import { claimedRewards, useGoals } from '../goals';
import { Sheet, TabBar, TopBar } from '../ui';
import { AboutDemo } from './Booking';
import { CardSheet, CardVisual } from './Account';
import { captainRating } from './Driver';

const COMMISSION = 0.05; // بدربي keeps 5% of electronic payments; cash has no commission

/** The captain's money: earlier trips (demo) + today's trip, less commission and withdrawals. */
function useEarnings() {
  const { manifest, withdrawals, trip, goalsClaimed } = useStore();
  const t = tripById(DRIVER_TRIP_ID)!;
  const today = manifest().filter((b) => b.status === 'confirmed');
  const online = today.filter((b) => !b.pay.startsWith('نقد')).reduce((n, b) => n + b.seats.length * t.price, 0);
  const cash = today.filter((b) => b.pay.startsWith('نقد')).reduce((n, b) => n + b.seats.length * t.price, 0);
  const commission = Math.round(online * COMMISSION);
  const EARLIER = 245000;
  const out = withdrawals.reduce((n, w) => n + w.amount, 0);
  const rewards = claimedRewards(goalsClaimed);
  const balance = EARLIER + online - commission - out + rewards.reduce((n, r) => n + r.amount, 0);
  const ops = [
    ...rewards.map((r, i) => ({ id: 'rw-' + r.id, title: `مكافأة تحدي: ${r.title}`, sub: 'من الإنجازات 🏆', amount: r.amount, at: Date.now() + i })),
    ...withdrawals.map((w) => ({ id: w.id, title: `سحب إلى ${w.method}`, sub: w.status === 'pending' ? 'قيد التحويل' : 'انحوّل', amount: -w.amount, at: w.at })),
    ...(online ? [
      { id: 'today-online', title: `رحلة ${t.from} ← ${t.to} · دفع إلكتروني`, sub: trip.status === 'arrived' ? 'وصلت ✓' : 'اليوم', amount: online, at: Date.now() - 1 },
      { id: 'today-comm', title: 'عمولة بدربي 5%', sub: `على الدفع الإلكتروني ${money(online)} د.ع`, amount: -commission, at: Date.now() - 2 },
    ] : []),
    { id: 's1', title: 'رحلة بغداد ← كربلاء', sub: 'الاثنين · دفع إلكتروني', amount: 120000, at: 3 },
    { id: 's2', title: 'رحلة بغداد ← النجف', sub: 'السبت · دفع إلكتروني', amount: 95000, at: 2 },
    { id: 's3', title: 'رحلة البصرة ← بغداد', sub: 'الخميس · دفع إلكتروني', amount: 30000, at: 1 },
  ].sort((a, b) => b.at - a.at);
  return { balance, cash, online, commission, ops };
}

type Period = 'day' | 'week' | 'month';

/** Earnings by period. Today is live; the rest of the week and month is demo history. */
function EarningsCard({ online, cash }: { online: number; cash: number }) {
  const { trip } = useStore();
  const [p, setP] = useState<Period>('day');
  const todayTrips = trip.status === 'arrived' || online + cash > 0 ? 1 : 0;
  const days = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
  const wd = (new Date().getDay() + 1) % 7; // Saturday = 0
  const weekHist: [number, number][] = [[120000, 60000], [95000, 40000], [0, 0], [150000, 80000], [60000, 30000], [130000, 70000], [90000, 45000]];
  const week = weekHist.map((v, i) => (i === wd ? [online, cash] as [number, number] : i < wd ? v : [0, 0] as [number, number]));
  const monthWeeks: [number, number][] = [[520000, 260000], [610000, 300000], [480000, 240000], week.reduce<[number, number]>((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0])];
  const sum = (list: [number, number][]) => list.reduce<[number, number]>((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
  const [on, ca] = p === 'day' ? [online, cash] : p === 'week' ? sum(week) : sum(monthWeeks);
  const trips = p === 'day' ? todayTrips : p === 'week' ? week.filter((v) => v[0] + v[1] > 0).length : 3 * 6 + week.filter((v) => v[0] + v[1] > 0).length;
  const total = on + ca;
  const commission = Math.round(on * COMMISSION);
  const bars = p === 'week' ? week.map((v, i) => ({ label: days[i], v: v[0] + v[1], on: v[0], now: i === wd })) : p === 'month' ? monthWeeks.map((v, i) => ({ label: `أسبوع ${i + 1}`, v: v[0] + v[1], on: v[0], now: i === 3 })) : [];
  const max = Math.max(1, ...bars.map((b) => b.v));
  return (
    <div className="form-card" style={{ gap: 12 }}>
      <div className="seg" role="tablist" aria-label="الفترة">
        {([['day', 'اليوم'], ['week', 'الأسبوع'], ['month', 'الشهر']] as [Period, string][]).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={p === id} className={p === id ? 'on' : ''} onClick={() => setP(id)}>{l}</button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="tiny muted">دخلك {p === 'day' ? 'اليوم' : p === 'week' ? 'هالأسبوع' : 'هالشهر'}</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3 }}>{money(total)} <span style={{ fontSize: 13 }}>د.ع</span></div>
        </div>
        <span className="pill info"><span className="num">{trips}</span>&nbsp;{trips === 1 ? 'رحلة' : 'رحلات'}</span>
      </div>
      <div className="split-bar" aria-hidden="true">
        <i style={{ width: `${total ? (on / total) * 100 : 50}%` }} />
      </div>
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <span className="row gap6"><span className="dot-k navy" /> إلكتروني <b className="num">{money(on)}</b></span>
        <span className="row gap6"><span className="dot-k gold" /> نقدي <b className="num">{money(ca)}</b></span>
      </div>
      {bars.length ? (
        <div className="bars" role="img" aria-label="الدخل حسب الأيام">
          {bars.map((b) => (
            <div key={b.label} className={`bar-col ${b.now ? 'now' : ''}`}>
              <div className="bar-stack" style={{ height: `${(b.v / max) * 100}%` }}>
                <i className="cash" style={{ flex: b.v - b.on }} />
                <i className="online" style={{ flex: b.on }} />
              </div>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="divider" />
      <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">عمولة بدربي 5% (على الإلكتروني)</span><b className="num">−{money(commission)}</b></div>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>صافي ربحك</b><b className="num" style={{ color: 'var(--success)', fontSize: 17 }}>{money(total - commission)} د.ع</b></div>
    </div>
  );
}

export function CaptainWallet() {
  const { withdrawals, set, showToast, captainCard: card } = useStore();
  const e = useEarnings();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState(false);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  const withdraw = () => {
    const a = Number(amount.replace(/\D/g, ''));
    if (!a || a < 10000) return setErr('أقل مبلغ للسحب 10,000 د.ع');
    if (a > e.balance) return setErr('المبلغ أكثر من رصيدك');
    set({ withdrawals: [{ id: 'w' + Date.now(), amount: a, method: `بطاقتك ${card!.first4} ••••`, at: Date.now(), status: 'pending' }, ...withdrawals] });
    showToast('انرسل طلب السحب — يوصل لبطاقتك خلال 24 ساعة');
    setOpen(false);
    setAmount('');
    setErr('');
  };

  return (
    <div className="screen">
      <TopBar title="المحفظة والأرباح" />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 30 }}>
        {card ? (
          <>
            <CardVisual {...card} balance={e.balance} />
            <div className="row gap10">
              <button className="btn soft sm grow" onClick={() => setAdding(true)}><Icon name="edit" size={18} /> بدّل البطاقة</button>
              <button className="btn soft sm grow" style={{ color: 'var(--alert)' }} onClick={() => setRemove(true)}><Icon name="x" size={18} /> احذف</button>
            </div>
          </>
        ) : (
          <button className="add-card" onClick={() => setAdding(true)}>
            <span className="df-ic" style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name="plus" size={26} /></span>
            <b style={{ fontSize: 17 }}>ضيف بطاقتك</b>
            <span className="small muted center">أرباحك تنسحب على هذي البطاقة — ماستر كارد، فيزا أو كي كارد</span>
          </button>
        )}

        <EarningsCard online={e.online} cash={e.cash} />

        <h2 className="h3">العمليات</h2>
        <div className="card" style={{ padding: '4px 14px' }}>
          {e.ops.map((o) => (
            <div key={o.id} className="list-item">
              <span className="ic" style={o.amount > 0 ? { background: 'var(--success-bg)', color: 'var(--success)' } : undefined}><Icon name={o.amount > 0 ? 'arrowDown' : 'arrowUp'} size={20} /></span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{o.title}</span>
                <span className="tiny muted">{o.sub}</span>
              </span>
              <span className="num bold" style={{ color: o.amount > 0 ? 'var(--success)' : 'var(--ink)' }}>{o.amount > 0 ? '+' : '−'}{money(Math.abs(o.amount))}</span>
            </div>
          ))}
        </div>
      </div>

      {card ? (
        <div className="bottombar">
          <button className="btn" onClick={() => { setOpen(true); setAmount(String(Math.max(0, e.balance))); setErr(''); }}><Icon name="arrowUp" size={20} /> اسحب الرصيد</button>
        </div>
      ) : null}

      <CardSheet open={adding} onClose={() => setAdding(false)} replacing={!!card} note="هذي البطاقة تنسحب عليها أرباحك." onSave={(c) => { set({ captainCard: c }); setAdding(false); showToast('انضافت البطاقة ✓'); }} />

      <Sheet open={open} onClose={() => setOpen(false)} label="سحب الرصيد">
        <div className="stack gap12">
          <h2 className="h3">سحب الرصيد</h2>
          <div className="price-box">
            <input className="num" inputMode="numeric" dir="ltr" value={amount} onChange={(ev) => { setAmount(ev.target.value.replace(/\D/g, '')); setErr(''); }} aria-label="المبلغ" />
            <span>د.ع · رصيدك {money(e.balance)}</span>
          </div>
          {card ? <div className="row gap10 small"><Icon name="card" size={20} /> <span className="grow">يوصل لبطاقتك <b className="num" dir="ltr">{card.first4} ••••</b></span><span className="muted">{card.brand}</span></div> : null}
          {err ? <div className="err">{err}</div> : null}
          <button className="btn" onClick={withdraw}>اطلب السحب</button>
          <div className="tiny muted center">نسخة تجريبية: ما ينحوّل مبلغ حقيقي.</div>
        </div>
      </Sheet>

      <Sheet open={remove} onClose={() => setRemove(false)} label="حذف البطاقة">
        <div className="stack gap12">
          <h2 className="h2">نحذف البطاقة؟</h2>
          <p className="muted" style={{ margin: 0 }}>ما تگدر تسحب أرباحك إلا تضيف بطاقة ثانية.</p>
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={() => { set({ captainCard: null }); setRemove(false); showToast('انحذفت البطاقة'); }}>إي، احذفها</button>
          <button className="btn soft" onClick={() => setRemove(false)}>لا</button>
        </div>
      </Sheet>
    </div>
  );
}

const DOC_NAMES: [string, string][] = [['licenseFront', 'الإجازة · وجه'], ['licenseBack', 'الإجازة · ظهر'], ['annualFront', 'السنوية · وجه'], ['annualBack', 'السنوية · ظهر']];

export function CaptainVehicle() {
  const { go, agencyDriverId } = useStore();
  const me = useCaptainInfo();
  const v = me.vehicle;
  return (
    <div className="screen gray">
      <TopBar title={agencyDriverId ? "مركبتي" : "مركبتي والمستمسكات"} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <div className="form-card" style={{ gap: 10 }}>
          <div className="row gap12">
            <span className="df-ic"><Icon name="bus" size={22} /></span>
            <div className="grow">
              <b>{v.model}</b>
              <div className="tiny muted">{v.kind} · {v.seats} مقعد · {v.year}</div>
            </div>
            <span className="pill ok">{agencyDriverId ? 'من المكتب' : 'موثّقة'}</span>
          </div>
          <div className="plate plate-static" aria-label={`رقم اللوحة ${v.plate}`}>
            <span className="plate-prov">{v.plate.split(' ')[0]}</span>
            <span className="plate-letter">{v.plate.split(' ').slice(-1)[0]}</span>
            <span className="plate-num num">{v.plate.split(' ').slice(1, -1).join(' ')}</span>
          </div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">اللون</span><b>{v.color}</b></div>
        </div>
        {agencyDriverId ? (
          <div className="demo-note" style={{ margin: 0 }}>هذي المركبة حددها إلك <b>{me.agency}</b>. إذا أكو غلط بمعلوماتها راجع المكتب.</div>
        ) : null}
        {agencyDriverId ? null : <>
        <div className="form-card" style={{ gap: 10 }}>
          <b>المستمسكات</b>
          <div className="doc-thumbs">
            {DOC_NAMES.map(([id, label]) => (
              <div key={id} className="doc-thumb">
                {me.docs[id] ? <img src={me.docs[id]} alt={label} /> : <div className="doc-ph"><Icon name="check" size={18} stroke={3} /></div>}
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="row small gap6" style={{ color: 'var(--success)', fontWeight: 700 }}><Icon name="shield" size={16} /> وافقت عليها الإدارة</div>
        </div>
        <div className="demo-note" style={{ margin: 0 }}>المركبة تتثبت بحسابك. إذا بدّلت سيارتك أو جددت السنوية، راسل الدعم حتى نحدّثها.</div>
        <button className="btn soft" onClick={() => go('support', { as: 'captain' })}><Icon name="chat" size={20} /> راسل الدعم</button>
        </>}
      </div>
    </div>
  );
}

/** Captain profile — same look as the passenger's, with the captain's own items. */
export function DriverProfile() {
  const { set, reset, go, resetDemo, bookings, driverTrips, agencyDriverId } = useStore();
  const [about, setAbout] = useState(false);
  const [wipe, setWipe] = useState(false);
  const me = useCaptainInfo();
  const rating = captainRating(bookings);
  const earn = useEarnings();
  const office = !!agencyDriverId;
  const items: [string, string, () => void][] = [
    ['user', 'معلوماتك الشخصية', () => go('personalInfo', { captain: true })],
    ...(office ? [] : [['wallet', `المحفظة والأرباح · ${money(earn.balance)} د.ع`, () => go('captainWallet')] as [string, string, () => void]]),
    ['bus', office ? 'مركبتي' : 'مركبتي والمستمسكات', () => go('captainVehicle')],
    ['shield', 'سياسة الخصوصية والاستخدام', () => go('policy')],
    ['info', 'عن النسخة التجريبية', () => setAbout(true)],
    ['refresh', 'مسح بيانات التجربة', () => setWipe(true)],
    ['gear', 'الإعدادات', () => go('settings')],
    ['chat', 'المساعدة والدعم', () => go('help')],
  ];
  return (
    <div className="screen">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(26px + var(--safe-top))', paddingBottom: 26 }}>
          <div className="pad row gap14">
            <button onClick={() => go('personalInfo', { captain: true })} aria-label="معلوماتك الشخصية" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--lavender)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              {me.avatar ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src="./img/driver.png" alt="" style={{ position: 'absolute', top: 2, left: 2, width: 70 }} />}
            </button>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{me.name}</div>
              <div className="num small" style={{ opacity: 0.8, textAlign: 'right' }}>+964 {me.phone}</div>
              <div className="tiny" style={{ opacity: 0.75 }}>{office ? `سائق لدى ${me.agency}` : <>كابتن موثّق ✓ · من <span className="num">{me.since}</span></>}</div>
            </div>
          </div>
          <div className="pad row gap10" style={{ marginTop: 20 }}>
            {[[`★ ${rating.avg}`, 'تقييمك'], [String(128 + driverTrips.length), 'رحلة'], [String(rating.count), 'تقييم']].map(([v, l]) => (
              <div key={l} className="grow center" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '10px 0' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 20 }}>{v}</div>
                <div className="tiny" style={{ opacity: 0.8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {office ? null : <div className="pad" style={{ marginTop: 14 }}>
          <div className="rank-note">
            <span className="rank-star">★</span>
            <div className="grow">
              <b>تقييمك الكلي <span className="num">{rating.avg}</span> من 5</b>
              <div className="tiny muted" style={{ lineHeight: 1.7 }}>
                {Number(rating.avg) >= 4.5 ? 'تقييمك عالي، فرحلاتك تطلع بأول نتائج البحث للمسافرين.' : 'تقييمك نازل، فرحلاتك تطلع ورا رحلات الكباتن الأعلى تقييماً.'} التقييم ينحسب من كل الركاب، وما تنعرض التقييمات وحدة وحدة.
              </div>
            </div>
          </div>
        </div>}
        <div className="pad" style={{ marginTop: office ? 14 : 6 }}>
          {items.map(([icon, label, fn]) => (
            <button key={label} className="list-item" onClick={fn}>
              <span className="ic"><Icon name={icon} size={22} /></span>
              <span className="grow bold">{label}</span>
              <Icon name="forward" size={18} />
            </button>
          ))}
          <button className="list-item" onClick={() => { set({ role: null, agencyDriverId: null }); reset('login'); }} style={{ color: 'var(--alert)' }}>
            <span className="ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}><Icon name="logout" size={22} /></span>
            <span className="grow bold">تسجيل خروج</span>
          </button>
        </div>
      </div>
      <TabBar active="driverProfile" driver />
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

const fmtK = (n: number) => money(n);

/** Captain achievements: challenges with a cash reward that lands in the wallet. */
export function DriverGoals() {
  const { goalsClaimed, set, notify, showToast, go } = useStore();
  const { goals, ready, won } = useGoals();
  const open = goals.filter((g) => !g.claimed);
  const total = won.reduce((n, g) => n + g.reward, 0) + 50000;

  const claim = (id: string) => {
    const g = goals.find((x) => x.id === id)!;
    set({ goalsClaimed: [...goalsClaimed, id] });
    showToast(`انضافت ${fmtK(g.reward)} د.ع لمحفظتك 🎉`);
    if (id === 'g3in2') {
      window.setTimeout(() => notify({ icon: 'trophy', tone: 'ok', title: 'تحدي جديد 🏆', body: 'سوّي 4 رحلات بالويكند (خميس وجمعة) واربح 40,000 د.ع.', link: { name: 'driverGoals' } }, 'captain'), 600);
    }
  };

  return (
    <div className="screen gray">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(22px + var(--safe-top))', paddingBottom: 24 }}>
          <div className="pad row gap14">
            <span className="goal-hero-ic"><Icon name="trophy" size={30} /></span>
            <div className="grow">
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>الإنجازات</h1>
              <div className="small" style={{ opacity: 0.8 }}>خلّص التحديات واربح فلوس تنضاف لمحفظتك</div>
            </div>
          </div>
          <div className="pad row gap10" style={{ marginTop: 18 }}>
            {[[money(total), 'ربحت لحد هسه (د.ع)'], [String(ready.length), 'جاهزة تستلمها'], [String(open.length), 'تحدي شغّال']].map(([v, l]) => (
              <div key={l} className="grow center" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '10px 0' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 19 }}>{v}</div>
                <div className="tiny" style={{ opacity: 0.8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pad stack gap10" style={{ marginTop: 16 }}>
          <h2 className="h3">التحديات</h2>
          {open.map((g) => {
            const full = g.progress >= g.target;
            const pct = Math.min(100, (g.progress / g.target) * 100);
            return (
              <div key={g.id} className={`goal ${full ? 'ready' : ''}`}>
                <div className="row gap12">
                  <span className="goal-ic"><Icon name={g.icon} size={22} /></span>
                  <div className="grow">
                    <div className="row gap6"><b>{g.title}</b>{g.isNew ? <span className="pill ok" style={{ height: 20, fontSize: 10 }}>جديد</span> : null}</div>
                    <div className="tiny muted">{g.hint}</div>
                  </div>
                  <span className="goal-reward"><span className="num">{money(g.reward)}</span><small>د.ع</small></span>
                </div>
                <div className="goal-bar"><i style={{ width: `${pct}%` }} /></div>
                <div className="row small" style={{ justifyContent: 'space-between' }}>
                  <span className="muted"><b className="num" style={{ color: 'var(--ink)' }}>{Math.min(g.progress, g.target)}/{g.target}</b> {g.unit}</span>
                  {g.extra ? <span className="tiny" style={{ color: 'var(--navy)', fontWeight: 700 }}>+ {g.extra}</span> : null}
                </div>
                {full ? <button className="btn green sm" onClick={() => claim(g.id)}><Icon name="gift" size={18} /> استلم {money(g.reward)} د.ع</button> : null}
              </div>
            );
          })}

          <h2 className="h3" style={{ marginTop: 8 }}>اللي ربحتها</h2>
          {[...won.map((g) => ({ id: g.id, title: g.title, reward: g.reward, when: 'هسه' })), { id: 'g100', title: 'أول 100 رحلة', reward: 50000, when: 'الشهر الماضي' }].map((g) => (
            <div key={g.id} className="list-item" style={{ background: 'var(--card)', borderRadius: 16, padding: '10px 12px' }}>
              <span className="ic" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Icon name="check" size={20} stroke={3} /></span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{g.title}</span>
                <span className="tiny muted">انضافت لمحفظتك · {g.when}</span>
              </span>
              <span className="num bold" style={{ color: 'var(--success)' }}>+{money(g.reward)}</span>
            </div>
          ))}
          <button className="link small" style={{ margin: '4px auto 0' }} onClick={() => go('captainWallet')}>شوف المحفظة</button>
        </div>
      </div>
      <TabBar active="driverGoals" driver />
    </div>
  );
}
