import { useEffect, useState, type ReactNode } from 'react';
import { agencyManifest, findVehicle, span, vLabel } from '../agency';
import { COUPONS, GARAGES, HOTELS, fmt12, longDate, money, todayIso, tripById } from '../data';
import { Icon, Logo } from '../icons';
import { durationLabel } from '../packages';
import { PkgArtSvg } from './Packages';
import { seededManifest, useStore, type AdminRequest, type ChatMsg } from '../store';
import { Sheet, Time } from '../ui';

/** iPad (and any wide screen) gets the website layout; a phone gets the app layout. */
function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 820);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 820);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return wide;
}

type Section = 'overview' | 'reqs' | 'offices' | 'bookings' | 'packages' | 'support' | 'finance' | 'goals' | 'garages' | 'hotels' | 'coupons' | 'more';

const NAV: [Section, string, string][] = [
  ['overview', 'نظرة عامة', 'home'],
  ['reqs', 'طلبات الانضمام', 'user'],
  ['offices', 'المكاتب', 'hotel'],
  ['bookings', 'الرحلات والحجوزات', 'ticket'],
  ['packages', 'السفرات', 'flag'],
  ['support', 'الدعم', 'chat'],
  ['finance', 'السحوبات والأرباح', 'wallet'],
  ['goals', 'التحديات', 'trophy'],
  ['garages', 'الكراجات', 'pin'],
  ['hotels', 'الفنادق', 'hotel'],
  ['coupons', 'الكوبونات', 'tag'],
];

const PHONE_TABS: [Section, string, string][] = [
  ['overview', 'الرئيسية', 'home'],
  ['reqs', 'الطلبات', 'user'],
  ['support', 'الدعم', 'chat'],
  ['finance', 'المالية', 'wallet'],
  ['more', 'المزيد', 'list'],
];

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 60) return `قبل ${Math.max(1, m)} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.round(h / 24)} يوم`;
}

/** Everything that waits for the admin, with live data from this phone. */
function useAdminData() {
  const s = useStore();
  const deviceReq: AdminRequest[] = s.captain && s.captain.status === 'pending'
    ? [{ id: 'device', name: s.captain.name, phone: s.captain.phone.replace(/\s/g, ''), kind: 'captain', detail: `${s.captain.vehicle.kind} ${s.captain.vehicle.seats}`, at: s.captain.submittedAt, status: 'pending', fromDevice: true,
        info: [['السيارة', `${s.captain.vehicle.model} ${s.captain.vehicle.year} · ${s.captain.vehicle.color}`], ['اللوحة', s.captain.vehicle.plate], ...Object.values(s.captain.docInfo ?? {}).flat().slice(0, 4)] }]
    : [];
  const requests = [...deviceReq, ...s.adminRequests];
  const pendingReqs = requests.filter((r) => r.status === 'pending');
  // Live support chats from this phone's captain / office, plus the seeded passenger chats.
  const live = ([['captain', 'الكابتن (هذا التلفون)', 'كابتن'], ['agency', s.agencyInfo.name, 'مكتب']] as const)
    .filter(([k]) => s.support[k].length)
    .map(([k, name, who]) => {
      const msgs = s.support[k];
      return { id: `live-${k}`, name, who, phone: '', msgs, read: msgs[msgs.length - 1]?.from === 'support' };
    });
  const threads = [...live, ...s.adminThreads].sort((a, b) => (b.msgs[b.msgs.length - 1]?.at ?? 0) - (a.msgs[a.msgs.length - 1]?.at ?? 0));
  const unread = threads.filter((t) => !t.read).length;
  const deviceOuts = s.withdrawals.map((w) => ({ id: w.id, name: 'الكابتن (هذا التلفون)', who: 'كابتن', amount: w.amount, method: w.method, at: w.at, status: w.status }));
  const payouts = [...deviceOuts, ...s.payouts].sort((a, b) => b.at - a.at);
  const pendingPay = payouts.filter((p) => p.status === 'pending');
  const pendingPkgs = s.packages.filter((p) => p.status === 'pending');
  return { requests, pendingReqs, threads, unread, payouts, pendingPay, pendingPkgs };
}

/* ------------------------------------------------------------------ */

export function AdminApp() {
  const { route, replace, go, set, reset } = useStore();
  const wide = useWide();
  const section = (route.params?.section as Section) ?? 'overview';
  const id = route.params?.id as string | undefined;
  const d = useAdminData();
  const badge: Partial<Record<Section, number>> = { reqs: d.pendingReqs.length, support: d.unread, finance: d.pendingPay.length, packages: d.pendingPkgs.length };
  const open = (s: Section, sub?: string) => (wide || !sub ? replace('admin', { section: s, id: sub }) : go('admin', { section: s, id: sub }));
  const logout = () => { set({ role: null }); reset('login'); };
  const content = <Content section={section} id={id} wide={wide} open={open} />;

  if (wide) {
    return (
      <div className="adm">
        <nav className="adm-side" aria-label="القائمة الرئيسية">
          <div className="row gap10" style={{ padding: '0 8px 18px' }}>
            <Logo size={40} />
            <span><b style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 20 }}>بدربي</b><span className="tiny" style={{ color: '#B9B5D3' }}>تطبيق الإدارة</span></span>
          </div>
          {NAV.map(([k, label, icon]) => (
            <button key={k} className={`adm-nav ${section === k ? 'on' : ''}`} aria-current={section === k ? 'page' : undefined} onClick={() => open(k)}>
              <Icon name={icon} size={20} />
              <span className="grow">{label}</span>
              {badge[k] ? <span className="adm-badge num">{badge[k]}</span> : null}
            </button>
          ))}
          <div className="grow" />
          <div className="adm-me">
            <span className="adm-av">أ</span>
            <span className="grow"><b style={{ display: 'block', fontSize: 14 }}>أبو الحسن</b><span className="tiny" style={{ color: '#B9B5D3' }}>مدير النظام</span></span>
            <button className="iconbtn" aria-label="تسجيل خروج" style={{ background: 'transparent', color: '#B9B5D3' }} onClick={logout}><Icon name="logout" size={18} /></button>
          </div>
        </nav>
        <main className="adm-main">{content}</main>
      </div>
    );
  }

  if (section === 'support' && id) return <div className="screen gray">{content}</div>;
  const tab = section === 'overview' || section === 'reqs' || section === 'support' || section === 'finance' ? section : 'more';
  return (
    <div className="screen gray">
      <div className="scroll with-tabs">{content}</div>
      <div className="tabbar">
        <nav aria-label="التنقل">
          {PHONE_TABS.map(([k, label, icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} aria-label={label} aria-current={tab === k ? 'page' : undefined} onClick={() => { if (k !== section) reset('admin', { section: k }); }}>
              <Icon name={icon} size={22} />
              {badge[k] && tab !== k ? <span className="badge">{badge[k]}</span> : null}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Head({ title, sub, wide, back, right }: { title: string; sub?: ReactNode; wide: boolean; back?: boolean; right?: ReactNode }) {
  const { back: goBack, stackDepth } = useStore();
  return (
    <header className={wide ? 'adm-head' : 'adm-phead'}>
      {(back || stackDepth > 1) && !wide ? <button className="iconbtn" aria-label="رجوع" onClick={() => goBack()}><Icon name="back" size={20} /></button> : null}
      <div className="grow">
        <h1>{title}</h1>
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
      {right}
    </header>
  );
}

function Content({ section, id, wide, open }: { section: Section; id?: string; wide: boolean; open: (s: Section, sub?: string) => void }) {
  switch (section) {
    case 'reqs': return <Requests id={id} wide={wide} open={open} />;
    case 'support': return <Support id={id} wide={wide} open={open} />;
    case 'finance': return <Finance wide={wide} />;
    case 'offices': return <Offices wide={wide} />;
    case 'bookings': return <Bookings wide={wide} />;
    case 'packages': return <Packages wide={wide} />;
    case 'goals': return <Goals wide={wide} />;
    case 'garages': return <SimpleList wide={wide} title="الكراجات" rows={GARAGES.map((g) => [g.name, `${g.city} · ${g.address}`, g.hours])} />;
    case 'hotels': return <SimpleList wide={wide} title="الفنادق" rows={HOTELS.map((h) => [h.name, `${h.city} · ${h.near}`, `★ ${h.rating} · من ${money(h.from)}`])} />;
    case 'coupons': return <SimpleList wide={wide} title="الكوبونات" rows={Object.entries(COUPONS).map(([k, c]) => [k, c.label, 'فعّال'])} />;
    case 'more': return <More />;
    default: return <Overview wide={wide} open={open} />;
  }
}

/* ---------------- overview ---------------- */

function Overview({ wide, open }: { wide: boolean; open: (s: Section, sub?: string) => void }) {
  const { agencyTrips, agencyVehicles, packages } = useStore();
  const d = useAdminData();
  const today = todayIso();
  const todays = agencyTrips.filter((t) => t.date === today && t.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
  const seededToday = 96;
  const bookingsToday = seededToday + todays.reduce((n, t) => n + agencyManifest(t).length, 0);
  const commission = 486500;
  const stats: [string, string, string][] = [
    ['حجوزات اليوم', String(bookingsToday), '+18% عن أمس'],
    ['رحلات فعالة', String(28 + todays.length), 'كباتن ومكاتب'],
    ['سفرات منشورة', String(packages.filter((p) => p.status !== 'pending').length), `${d.pendingPkgs.length} بانتظار المراجعة`],
    ['عمولة اليوم', money(commission), 'د.ع · 5% من الإلكتروني'],
  ];
  const attention: [string, string, string, Section][] = [
    ['bad', `${d.pendingReqs.length} طلبات انضمام`, d.pendingReqs[0] ? `أقدمها ${ago(Math.min(...d.pendingReqs.map((r) => r.at)))}` : 'ما اكو طلبات', 'reqs'],
    ['warn', `${d.pendingPay.length} طلبات سحب`, `${money(d.pendingPay.reduce((n, p) => n + p.amount, 0))} د.ع`, 'finance'],
    ['info', `${d.unread} محادثات دعم جديدة`, 'رد عليها من الدعم', 'support'],
    ['', `${d.pendingPkgs.length} سفرات تحتاج مراجعة`, 'قبل ما تطلع للمسافرين', 'packages'],
  ];
  const bars = [52, 64, 48, 80, 71, 92, 60];
  const days = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

  const attentionList = (
    <div className="stack gap10">
      {attention.map(([tone, a, b, s]) => (
        <button key={s} className={`adm-att ${tone}`} onClick={() => open(s)}>
          <span className="grow"><b style={{ display: 'block' }}>{a}</b><span className="small" style={{ opacity: 0.85 }}>{b}</span></span>
          <Icon name="forward" size={18} />
        </button>
      ))}
    </div>
  );

  if (!wide) {
    return (
      <>
        <div className="hero" style={{ paddingTop: 'calc(22px + var(--safe-top))', paddingBottom: 22 }}>
          <div className="pad row gap12">
            <Logo size={44} />
            <div className="grow"><div className="small" style={{ opacity: 0.75 }}>تطبيق الإدارة</div><div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 21 }}>هلا أبو الحسن!</div></div>
          </div>
          <div className="pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            {stats.map(([l, v], i) => (
              <div key={l} style={{ borderRadius: 16, background: i === 0 ? '#fff' : '#1C1488', color: i === 0 ? 'var(--navy)' : '#fff', padding: '12px 14px' }}>
                <div className="tiny" style={{ opacity: 0.8 }}>{l}</div>
                <div className="num" style={{ fontWeight: 800, fontSize: 22 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="pad stack gap10" style={{ marginTop: 16 }}>
          <h2 className="h3">يحتاج انتباهك</h2>
          {attentionList}
          <AdminLogout />
        </div>
      </>
    );
  }

  return (
    <>
      <Head wide title="نظرة عامة" sub={`${longDate(today)} · كلشي ماشي زين`} />
      <div className="adm-stats">
        {stats.map(([l, v, n], i) => (
          <div key={l} className={`adm-stat ${i === 0 ? 'navy' : ''}`}><span>{l}</span><b className="num">{v}</b><em>{n}</em></div>
        ))}
      </div>
      <div className="adm-grid2">
        <div className="stack gap16">
          <section className="adm-card">
            <div className="row" style={{ marginBottom: 6 }}><h2 className="h3 grow">رحلات المكاتب اليوم</h2><button className="link small" onClick={() => open('bookings')}>كل الرحلات</button></div>
            <table className="adm-table">
              <thead><tr><th>الرحلة</th><th>الانطلاق</th><th>المركبة</th><th>المقاعد</th><th>الحالة</th></tr></thead>
              <tbody>
                {todays.map((t) => {
                  const v = findVehicle(agencyVehicles, t.vehicleId);
                  const [a, b] = span(t.date, t.time, t.hours);
                  const now = Date.now() / 60000;
                  const st = t.status === 'arrived' || now >= b ? ['ok', 'وصلت'] : t.status === 'started' || now >= a ? ['warn', 'بالطريق'] : ['info', 'مفتوحة'];
                  return (
                    <tr key={t.id}><td><b>{t.from} ← {t.to}</b></td><td className="num"><Time v={t.time} /></td><td>{v ? vLabel(v) : '—'}</td><td className="num">{t.booked} / {v?.seats ?? '—'}</td><td><span className={`pill ${st[0]}`}>{st[1]}</span></td></tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="adm-card">
            <div className="row" style={{ marginBottom: 10 }}><h2 className="h3 grow">الحجوزات هالأسبوع</h2><span className="small muted">812 حجز</span></div>
            <div className="bars" style={{ height: 150 }}>
              {bars.map((v, i) => (
                <div key={i} className={`bar-col ${i === 5 ? 'now' : ''}`}><div className="bar-stack" style={{ height: `${v}%`, maxWidth: 36 }}><i className="online" style={{ flex: 1 }} /></div><span>{days[i]}</span></div>
              ))}
            </div>
          </section>
        </div>
        <section className="adm-card stack gap10"><h2 className="h3">يحتاج انتباهك</h2>{attentionList}</section>
      </div>
    </>
  );
}

function AdminLogout() {
  const { set, reset } = useStore();
  return (
    <button className="list-item" style={{ color: 'var(--alert)', marginTop: 8 }} onClick={() => { set({ role: null }); reset('login'); }}>
      <span className="ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}><Icon name="logout" size={22} /></span>
      <span className="grow bold">تسجيل خروج</span>
    </button>
  );
}

/* ---------------- join requests ---------------- */

function Requests({ id, wide, open }: { id?: string; wide: boolean; open: (s: Section, sub?: string) => void }) {
  const { set, adminRequests, captain, notify, showToast } = useStore();
  const { requests } = useAdminData();
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('صورة السنوية مو واضحة');
  const list = requests.filter((r) => (tab === 'pending' ? r.status === 'pending' : r.status !== 'pending'));
  const sel = requests.find((r) => r.id === id) ?? (wide ? list[0] : undefined);

  const decide = (r: AdminRequest, status: 'approved' | 'rejected') => {
    if (r.fromDevice && captain) {
      // The captain on this phone: approval opens his account.
      if (status === 'approved') {
        set({ captain: { ...captain, status: 'approved' } });
        notify({ icon: 'check', tone: 'ok', title: 'انقبل حسابك 🎉', body: 'الإدارة وافقت على مستمسكاتك. سجّل دخول وابدأ رحلاتك.' }, 'captain');
      } else {
        set({ captain: null });
      }
    } else {
      set({ adminRequests: adminRequests.map((x) => (x.id === r.id ? { ...x, status, reason: status === 'rejected' ? reason : undefined } : x)) });
    }
    showToast(status === 'approved' ? `انفعّل حساب ${r.name.split(' ')[0]} ✓` : `انرفض الطلب ووصل السبب لـ ${r.name.split(' ')[0]}`);
    setRejecting(false);
    if (!wide) open('reqs');
  };

  const listView = (
    <div className="stack gap8">
      <div className="seg">
        <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>بالانتظار · <span className="num">{requests.filter((r) => r.status === 'pending').length}</span></button>
        <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>اللي انحسمت</button>
      </div>
      {list.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>ما اكو طلبات هنا.</div> : null}
      {list.map((r) => (
        <button key={r.id} className={`adm-item ${sel?.id === r.id && wide ? 'on' : ''}`} onClick={() => open('reqs', r.id)}>
          <span className="adm-av light">{r.name[0]}</span>
          <span className="grow"><b style={{ display: 'block' }}>{r.name}</b><span className="tiny muted">{r.kind === 'office' ? 'مكتب سفر' : 'كابتن'} · {r.detail}{r.fromDevice ? ' · من هذا التلفون' : ''}</span></span>
          {r.status === 'pending' ? <span className="tiny muted">{ago(r.at)}</span> : <span className={`pill ${r.status === 'approved' ? 'ok' : 'bad'}`}>{r.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>}
        </button>
      ))}
    </div>
  );

  const docs = sel?.fromDevice ? captain?.docs ?? {} : {};
  const detail = sel ? (
    <div className="stack gap14">
      <div className="row gap12">
        <span className="adm-av big">{sel.name[0]}</span>
        <div className="grow"><h2 className="h2" style={{ margin: 0 }}>{sel.name}</h2><div className="small muted">{sel.kind === 'office' ? 'مكتب سفر' : 'كابتن'} · <span className="num" dir="ltr">0{sel.phone}</span> · قدّم {ago(sel.at)}</div></div>
      </div>
      <section className="adm-card">
        <h3 className="h3" style={{ marginBottom: 10 }}>المستمسكات</h3>
        <div className="adm-docs">
          {(sel.kind === 'office' ? ['إجازة الشركة', 'هوية المدير', 'عقد الإيجار', 'سنويات المركبات'] : ['الإجازة · وجه', 'الإجازة · ظهر', 'السنوية · وجه', 'السنوية · ظهر']).map((l, i) => {
            const key = ['licenseFront', 'licenseBack', 'annualFront', 'annualBack'][i];
            return (
              <div key={l} className="adm-doc">
                {docs[key] ? <img src={docs[key]} alt={l} /> : <div className="adm-doc-ph"><i /><em /><em style={{ width: '50%' }} /></div>}
                <span>{l}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="adm-card">
        <h3 className="h3">اللي قرأه التطبيق</h3>
        {sel.info.map(([k, v], i) => (
          <div key={i} className="row small" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EFF5' }}><span className="muted">{k}</span><b>{v}</b></div>
        ))}
      </section>
      {sel.status === 'pending' ? (
        <div className="row gap10">
          <button className="btn green grow" style={{ flex: 2 }} onClick={() => decide(sel, 'approved')}><Icon name="check" size={20} stroke={3} /> وافق وفعّل الحساب</button>
          <button className="btn soft grow" style={{ color: 'var(--alert)' }} onClick={() => setRejecting(true)}>ارفض</button>
        </div>
      ) : (
        <div className={`pill ${sel.status === 'approved' ? 'ok' : 'bad'}`} style={{ height: 44, justifyContent: 'center' }}>{sel.status === 'approved' ? 'الحساب مفعّل' : `مرفوض: ${sel.reason ?? ''}`}</div>
      )}
      <Sheet open={rejecting} onClose={() => setRejecting(false)} label="سبب الرفض">
        <div className="stack gap10">
          <h2 className="h3">ليش ترفض الطلب؟</h2>
          {['صورة السنوية مو واضحة', 'الإجازة منتهية', 'معلومات السيارة ما تطابق', 'ناقص مستمسك'].map((x) => (
            <button key={x} role="radio" aria-checked={reason === x} className={`radio ${reason === x ? 'on' : ''}`} onClick={() => setReason(x)}><span className="dot" /><span className="grow bold">{x}</span></button>
          ))}
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={() => decide(sel, 'rejected')}>ارفض وابعث السبب</button>
        </div>
      </Sheet>
    </div>
  ) : null;

  if (wide) {
    return (
      <div className="adm-split">
        <aside className="adm-pane"><Head wide title="طلبات الانضمام" />{listView}</aside>
        <div className="adm-detail">{detail ?? <div className="empty"><Icon name="user" size={40} /><b>اختار طلب</b></div>}</div>
      </div>
    );
  }
  if (id && sel) return <><Head wide={false} back title="طلب انضمام" /><div className="pad" style={{ paddingTop: 4 }}>{detail}</div></>;
  return <><Head wide={false} title="طلبات الانضمام" /><div className="pad">{listView}</div></>;
}

/* ---------------- support ---------------- */

const QUICK = ['هلا بيك، شلون نگدر نساعدك؟', 'المبلغ يرجعلك خلال 24 ساعة ✓', 'اكتبلي رمز الحجز من فضلك', 'حوّلنا الموضوع للكابتن', 'انحلت المشكلة ✓'];

function Support({ id, wide, open }: { id?: string; wide: boolean; open: (s: Section, sub?: string) => void }) {
  const { set, support, adminThreads } = useStore();
  const { threads } = useAdminData();
  const [text, setText] = useState('');
  const [who, setWho] = useState('الكل');
  const list = threads.filter((t) => who === 'الكل' || t.who.startsWith(who === 'مسافرين' ? 'مسافر' : who === 'كباتن' ? 'كابتن' : who === 'مكاتب' ? 'مكتب' : 'سائق'));
  const sel = threads.find((t) => t.id === id) ?? (wide ? list[0] : undefined);

  // Opening a chat marks it read.
  useEffect(() => {
    if (sel && !sel.read && !sel.id.startsWith('live-')) set({ adminThreads: adminThreads.map((t) => (t.id === sel.id ? { ...t, read: true } : t)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id]);

  const send = (body: string) => {
    const t = body.trim();
    if (!t || !sel) return;
    const msg: ChatMsg = { id: 'r' + Date.now(), from: 'support', text: t, at: Date.now() };
    if (sel.id.startsWith('live-')) {
      // The reply lands in that person's own support chat on this phone.
      const k = sel.id.slice(5) as 'captain' | 'agency';
      set({ support: { ...support, [k]: [...support[k], msg] } });
    } else {
      set({ adminThreads: adminThreads.map((x) => (x.id === sel.id ? { ...x, msgs: [...x.msgs, msg], read: true } : x)) });
    }
    setText('');
  };

  const listView = (
    <div className="stack gap8">
      <div className="row gap6" style={{ flexWrap: 'wrap' }}>
        {['الكل', 'مسافرين', 'كباتن', 'مكاتب'].map((w) => <button key={w} className={`chip ag-chip ${who === w ? 'on' : ''}`} style={{ height: 36 }} onClick={() => setWho(w)}>{w}</button>)}
      </div>
      {list.map((t) => {
        const last = t.msgs[t.msgs.length - 1];
        return (
          <button key={t.id} className={`adm-item ${sel?.id === t.id && wide ? 'on' : ''}`} onClick={() => open('support', t.id)}>
            <span className="adm-av light round">{t.name[0]}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row gap6"><b>{t.name}</b><span className="pill info" style={{ height: 20, fontSize: 10 }}>{t.who}</span><span className="grow" /><span className="tiny muted">{last ? ago(last.at) : ''}</span></span>
              <span className="tiny muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last?.from === 'support' ? 'انت: ' : ''}{last?.text || 'صورة'}</span>
            </span>
            {!t.read ? <span className="adm-badge num" style={{ background: 'var(--alert)', color: '#fff' }}>•</span> : null}
          </button>
        );
      })}
    </div>
  );

  const thread = sel ? (
    <div className="adm-chat">
      <div className="adm-chat-head">
        <span className="adm-av light round">{sel.name[0]}</span>
        <div className="grow"><b>{sel.name}</b><div className="tiny muted">{sel.who}{sel.phone ? <> · <span className="num" dir="ltr">0{sel.phone}</span></> : ' · يرد بنفس التطبيق'}</div></div>
      </div>
      <div className="adm-chat-list">
        {sel.msgs.map((m) => (
          <div key={m.id} className={`bubble-row ${m.from === 'me' ? 'support' : 'me'}`}>
            <div className="msg-b">{m.image ? <img src={m.image} alt="صورة مرفقة" /> : null}{m.text ? <span>{m.text}</span> : null}<span className="b-time">{fmt12(new Date(m.at).toTimeString().slice(0, 5))}</span></div>
          </div>
        ))}
      </div>
      <div className="adm-quick">{QUICK.map((q) => <button key={q} className="chip ag-chip" style={{ height: 34, fontSize: 12 }} onClick={() => send(q)}>{q}</button>)}</div>
      <div className="chat-input">
        <textarea rows={1} placeholder="اكتب ردك…" value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <button className="chat-send" aria-label="إرسال" disabled={!text.trim()} onClick={() => send(text)}><Icon name="send" size={20} /></button>
      </div>
    </div>
  ) : null;

  if (wide) {
    return (
      <div className="adm-split">
        <aside className="adm-pane"><Head wide title="الدعم" />{listView}</aside>
        <div className="adm-detail" style={{ padding: 0 }}>{thread ?? <div className="empty"><Icon name="chat" size={40} /><b>اختار محادثة</b></div>}</div>
      </div>
    );
  }
  if (id && sel) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><Head wide={false} back title={sel.name} /><div style={{ flex: 1, minHeight: 0 }}>{thread}</div></div>;
  return <><Head wide={false} title="الدعم" /><div className="pad">{listView}</div></>;
}

/* ---------------- finance ---------------- */

function Finance({ wide }: { wide: boolean }) {
  const { set, payouts, withdrawals, showToast } = useStore();
  const d = useAdminData();
  const pay = (id: string) => {
    if (withdrawals.some((w) => w.id === id)) set({ withdrawals: withdrawals.map((w) => (w.id === id ? { ...w, status: 'paid' } : w)) });
    else set({ payouts: payouts.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)) });
    showToast('انحوّل المبلغ ✓');
  };
  return (
    <>
      <Head wide={wide} title="السحوبات والأرباح" sub="عمولة بدربي 5% على الدفع الإلكتروني" />
      <div className={wide ? '' : 'pad'}>
        <div className="adm-stats" style={{ gridTemplateColumns: wide ? 'repeat(3, 1fr)' : '1fr 1fr' }}>
          <div className="adm-stat navy"><span>عمولة الشهر</span><b className="num">{money(14250000)}</b><em>د.ع</em></div>
          <div className="adm-stat"><span>طلبات سحب</span><b className="num">{d.pendingPay.length}</b><em>{money(d.pendingPay.reduce((n, p) => n + p.amount, 0))} د.ع</em></div>
          {wide ? <div className="adm-stat"><span>انحوّل هالأسبوع</span><b className="num">{money(3180000)}</b><em>د.ع</em></div> : null}
        </div>
        <div className="stack gap8" style={{ marginTop: 14 }}>
          {d.payouts.map((p) => (
            <div key={p.id} className="adm-item" style={{ cursor: 'default' }}>
              <span className="adm-av light"><Icon name="wallet" size={18} /></span>
              <span className="grow"><b style={{ display: 'block' }}>{p.name}</b><span className="tiny muted">{p.who} · {p.method} · {ago(p.at)}</span></span>
              <b className="num">{money(p.amount)}</b>
              {p.status === 'pending' ? <button className="btn sm green" style={{ width: 'auto', padding: '0 14px' }} onClick={() => pay(p.id)}>حوّل</button> : <span className="pill ok">انحوّل</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- offices, bookings, packages ---------------- */

function Offices({ wide }: { wide: boolean }) {
  const { agencyInfo, agencyVehicles, agencyDrivers, agencyTrips } = useStore();
  const rows: [string, string, string][] = [
    [agencyInfo.name, `${agencyVehicles.length} مركبات · ${agencyDrivers.length} سواق`, `${agencyTrips.length} رحلات`],
    ['سفريات الحسين', '9 مركبات · 11 سائق', '14 رحلة'],
    ['الخطوط الذهبية', '12 مركبة · 15 سائق', '21 رحلة'],
    ['سفريات آزادي', '5 مركبات · 6 سواق', '8 رحلات'],
  ];
  return <SimpleList wide={wide} title="المكاتب" rows={rows} />;
}

function Bookings({ wide }: { wide: boolean }) {
  const { agencyTrips, bookings } = useStore();
  const [q, setQ] = useState('');
  const all = [...bookings, ...seededManifest(), ...agencyTrips.flatMap(agencyManifest)];
  const label = (tid: string) => { const t = tripById(tid) ?? agencyTrips.find((x) => x.id === tid); return t ? `${t.from} ← ${t.to}` : '—'; };
  const list = all.filter((b) => !q || b.code.includes(q.toUpperCase()) || b.name.includes(q)).slice(0, 60);
  return (
    <>
      <Head wide={wide} title="الرحلات والحجوزات" sub={`${all.length} حجز`} />
      <div className={wide ? 'stack gap10' : 'pad stack gap10'}>
        <input className="input" style={{ background: '#fff' }} placeholder="دوّر برمز الحجز أو الاسم" value={q} onChange={(e) => setQ(e.target.value)} />
        {wide ? (
          <section className="adm-card">
            <table className="adm-table">
              <thead><tr><th>الرمز</th><th>المسافر</th><th>الرحلة</th><th>اليوم</th><th>المقاعد</th><th>الدفع</th><th>الحالة</th></tr></thead>
              <tbody>{list.map((b) => <tr key={b.code + b.tripId}><td className="code">{b.code}</td><td><b>{b.name}</b></td><td>{label(b.tripId)}</td><td>{longDate(b.date)}</td><td className="num">{b.seats.join('، ')}</td><td>{b.pay}</td><td><span className={`pill ${b.status === 'cancelled' ? 'bad' : 'ok'}`}>{b.status === 'cancelled' ? 'ملغي' : 'مؤكد'}</span></td></tr>)}</tbody>
            </table>
          </section>
        ) : list.map((b) => (
          <div key={b.code + b.tripId} className="adm-item" style={{ cursor: 'default' }}>
            <span className="grow"><b style={{ display: 'block' }}>{b.name}</b><span className="tiny muted">{label(b.tripId)} · مقاعد {b.seats.join('، ')} · {b.pay}</span></span>
            <span className="code" style={{ letterSpacing: 1 }}>{b.code}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Packages({ wide }: { wide: boolean }) {
  const { packages, set, showToast } = useStore();
  const [tab, setTab] = useState<'pending' | 'live'>('pending');
  const list = packages.filter((p) => (tab === 'pending' ? p.status === 'pending' : p.status !== 'pending'));
  const decide = (id: string, ok: boolean) => {
    set({ packages: ok ? packages.map((p) => (p.id === id ? { ...p, status: 'published' } : p)) : packages.filter((p) => p.id !== id) });
    showToast(ok ? 'انتشرت السفرة للمسافرين ✓' : 'انرفضت السفرة ووصل خبر للمكتب');
  };
  return (
    <>
      <Head wide={wide} title="سفرات المكاتب" sub="كل سفرة تنراجع قبل ما تطلع للمسافرين" />
      <div className={wide ? 'stack gap12' : 'pad stack gap12'}>
        <div className="seg" style={{ maxWidth: 420 }}>
          <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>بالانتظار · <span className="num">{packages.filter((p) => p.status === 'pending').length}</span></button>
          <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>منشورة</button>
        </div>
        {list.length === 0 ? <div className="card center small muted" style={{ padding: 22 }}>{tab === 'pending' ? 'ما اكو سفرات تنتظر. لما مكتب ينشر سفرة تطلع هنا.' : 'ما اكو سفرات منشورة.'}</div> : null}
        <div className={wide ? 'adm-cards3' : 'stack gap12'}>
          {list.map((p) => (
            <div key={p.id} className="pkg-card" style={{ cursor: 'default' }}>
              <div className="pkg-cover" style={{ height: 130 }}>{p.photos[0] ? <img src={p.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PkgArtSvg kind={p.art} />}</div>
              <div className="stack gap6" style={{ padding: '12px 14px 14px' }}>
                <b style={{ fontFamily: 'var(--display)' }}>{p.title}</b>
                <span className="tiny muted">{p.office} · {longDate(p.date)} · {durationLabel(p)}</span>
                <b className="num" style={{ color: 'var(--navy)' }}>{money(p.priceAdult)} د.ع</b>
                {p.status === 'pending' ? (
                  <div className="row gap8">
                    <button className="btn sm green grow" onClick={() => decide(p.id, true)}>انشر</button>
                    <button className="btn sm soft grow" style={{ color: 'var(--alert)' }} onClick={() => decide(p.id, false)}>ارفض</button>
                  </div>
                ) : <span className="tiny muted"><b className="num">{p.booked}/{p.seats}</b> محجوز</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- goals ---------------- */

function Goals({ wide }: { wide: boolean }) {
  const { adminGoals, set, notify, showToast } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('30000');
  const [target, setTarget] = useState('5');
  const base: [string, number, string][] = [['خلّص 3 رحلات خلال يومين', 25000, 'كل الكباتن'], ['امسح 15 تذكرة بالتطبيق', 10000, 'كل الكباتن'], ['10 رحلات هالأسبوع', 60000, 'كل الكباتن'], ['حافظ على تقييم ★ 4.8 لآخر الشهر', 40000, 'كل الكباتن'], ['أسبوعين بدون إلغاء', 15000, 'كل الكباتن']];
  const add = () => {
    if (title.trim().length < 4) return;
    const g = { id: 'ag' + Date.now(), title: title.trim(), reward: Number(reward) || 0, target: Number(target) || 1, unit: 'رحلة' };
    set({ adminGoals: [...adminGoals, g] });
    notify({ icon: 'trophy', tone: 'ok', title: 'تحدي جديد 🏆', body: `${g.title} واربح ${money(g.reward)} د.ع.`, link: { name: 'driverGoals' } }, 'captain');
    showToast('انضاف التحدي ووصل إشعار للكباتن');
    setOpen(false);
    setTitle('');
  };
  return (
    <>
      <Head wide={wide} title="التحديات" sub="مكافآت تنضاف لمحفظة الكابتن" right={<button className="btn sm" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setOpen(true)}><Icon name="plus" size={18} /> تحدي جديد</button>} />
      <div className={wide ? 'stack gap8' : 'pad stack gap8'}>
        {[...base, ...adminGoals.map((g) => [g.title, g.reward, 'جديد'] as [string, number, string])].map(([t, r, w], i) => (
          <div key={i} className="adm-item" style={{ cursor: 'default' }}>
            <span className="adm-av light"><Icon name="trophy" size={18} /></span>
            <span className="grow"><b style={{ display: 'block' }}>{t}</b><span className="tiny muted">{w}</span></span>
            <span className="goal-reward"><span className="num">{money(r)}</span><small>د.ع</small></span>
          </div>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} label="تحدي جديد">
        <div className="stack gap10">
          <h2 className="h3">تحدي جديد للكباتن</h2>
          <input className="input" placeholder="مثلاً: 5 رحلات للبصرة هالأسبوع" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 50))} />
          <div className="row gap8">
            <label className="grow field"><span className="tiny muted">المكافأة (د.ع)</span><input className="input num" inputMode="numeric" dir="ltr" value={reward} onChange={(e) => setReward(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="grow field"><span className="tiny muted">عدد الرحلات</span><input className="input num" inputMode="numeric" dir="ltr" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} /></label>
          </div>
          <button className="btn" disabled={title.trim().length < 4} onClick={add}>انشر التحدي</button>
        </div>
      </Sheet>
    </>
  );
}

/* ---------------- simple lists & more ---------------- */

function SimpleList({ wide, title, rows }: { wide: boolean; title: string; rows: [string, string, string][] }) {
  return (
    <>
      <Head wide={wide} title={title} />
      <div className={wide ? 'stack gap8' : 'pad stack gap8'}>
        {rows.map(([a, b, c], i) => (
          <div key={i} className="adm-item" style={{ cursor: 'default' }}>
            <span className="grow"><b style={{ display: 'block' }}>{a}</b><span className="tiny muted">{b}</span></span>
            <span className="pill info">{c}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function More() {
  const { go } = useStore();
  const items = NAV.filter(([k]) => !['overview', 'reqs', 'support', 'finance'].includes(k));
  return (
    <>
      <header className="adm-phead"><div className="grow"><h1>كل الأقسام</h1><div className="small muted">نفس أقسام الموقع، بشكل التطبيق</div></div></header>
      <div className="pad">
        {items.map(([k, label, icon]) => (
          <button key={k} className="list-item" onClick={() => go('admin', { section: k })}>
            <span className="ic"><Icon name={icon} size={22} /></span>
            <span className="grow bold">{label}</span>
            <Icon name="forward" size={18} />
          </button>
        ))}
        <AdminLogout />
      </div>
    </>
  );
}
