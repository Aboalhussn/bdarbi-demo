import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CITIES, DRIVER_TRIP_ID, DRIVER_VEHICLE, GARAGES, addHours, fmt12, garageById, longDate, money, routeInfo, todayIso, tripById } from '../data';
import { CityPicker, DateField, GarageField, TimeField, addDays } from '../pickers';
import { Icon } from '../icons';
import { useStore, type Booking, type ScanOutcome } from '../store';
import { Sheet, TabBar, Time, TopBar } from '../ui';
import { AboutDemo } from './Booking';

const DRIVER_NAME = 'حسين كاظم';

export function DriverHome() {
  const { go, manifest, boardedAt, requests, driverTrips } = useStore();
  const trip = tripById(DRIVER_TRIP_ID)!;
  const list = manifest().filter((b) => b.status === 'confirmed');
  const seats = list.reduce((n, b) => n + b.seats.length, 0);
  const boarded = list.filter((b) => boardedAt(b)).reduce((n, b) => n + b.seats.length, 0);
  const earnings = list.reduce((n, b) => n + b.seats.length * trip.price, 0);
  const newReq = requests.filter((r) => r.status === 'new').length;

  return (
    <div className="screen gray">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(20px + var(--safe-top))', paddingBottom: 22 }}>
          <div className="pad row gap14">
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--lavender)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              <img src="./img/driver.png" alt="" style={{ position: 'absolute', top: 2, left: 2, width: 58 }} />
            </div>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 21 }}>هلا {DRIVER_NAME.split(' ')[0]}!</div>
              <div className="small" style={{ opacity: 0.8 }}>سائق موثّق · ★ <span className="num">4.9</span></div>
            </div>
            <span className="pill ok">متاح</span>
          </div>
          <div className="pad" style={{ marginTop: 18 }}>
            <button className="card stack gap10" style={{ width: '100%', textAlign: 'right', border: 0 }} onClick={() => go('driverTrip')}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small muted">رحلتك الحالية · اليوم</span>
                <span className="pill warn">قبل الحركة</span>
              </div>
              <div className="row gap10">
                <span className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--navy)' }}><Time v={trip.time} /></span>
                <span className="bold grow">{trip.from} ← {trip.to}</span>
              </div>
              <div className="small muted">{garageById(trip.garageId).name} · {trip.kind} {trip.capacity} مقعد · رصيف <span className="num">{trip.platform}</span></div>
              <div>
                <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>صعدوا <b className="num">{boarded}/{seats}</b></span>
                  <span className="muted">محجوز <span className="num">{seats}/{trip.capacity}</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--surface)', overflow: 'hidden' }}>
                  <div style={{ width: `${seats ? (boarded / seats) * 100 : 0}%`, height: '100%', background: 'var(--success)', borderRadius: 999 }} />
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="pad row gap10" style={{ marginTop: 16 }}>
          <button className="btn grow" style={{ height: 64 }} onClick={() => go('driverScan')}><Icon name="scan" size={24} /> امسح تذكرة</button>
          <button className="btn soft" style={{ width: 120, height: 64 }} onClick={() => go('driverAddTrip')}><Icon name="plus" size={22} /> رحلة</button>
        </div>

        <div className="pad row gap10" style={{ marginTop: 14 }}>
          {[[money(earnings), 'دخل اليوم (د.ع)'], [String(seats), 'مقعد محجوز'], [String(newReq), 'طلب جديد']].map(([v, l]) => (
            <div key={l} className="card grow center" style={{ padding: '12px 6px' }}>
              <div className="num" style={{ fontWeight: 800, fontSize: 19, color: 'var(--navy)' }}>{v}</div>
              <div className="tiny muted">{l}</div>
            </div>
          ))}
        </div>

        <div className="pad row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
          <h2 className="h3">رحلاتك الجاية</h2>
          <button className="link small" onClick={() => go('driverAddTrip')}>+ أضف رحلة</button>
        </div>
        <div className="pad stack gap10" style={{ marginTop: 8 }}>
          {driverTrips.length === 0 ? (
            <div className="card center small muted">ما عندك رحلات ثانية. أضف رحلة حتى تطلع للمسافرين.</div>
          ) : (
            [...driverTrips].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((t) => (
              <div key={t.id} className="card row gap12">
                <div className="num" style={{ fontWeight: 800, fontSize: 20, color: 'var(--navy)' }}><Time v={t.time} /></div>
                <div className="grow">
                  <div className="bold">{t.from} ← {t.to}</div>
                  <div className="small muted">{longDate(t.date)} · {t.garageId ? garageById(t.garageId).name + ' · ' : ''}يوصل {t.arrive ? fmt12(t.arrive) : ''} · {t.seats} مقعد · <span className="num">{money(t.price)}</span> د.ع</div>
                </div>
                <span className="pill ok">منشورة</span>
              </div>
            ))
          )}
        </div>
      </div>
      <TabBar active="driverHome" driver />
    </div>
  );
}

export function DriverTrip() {
  const { manifest, boardedAt, board, go, showToast } = useStore();
  const trip = tripById(DRIVER_TRIP_ID)!;
  const list = manifest();
  const bySeat = new Map<number, Booking>();
  list.filter((b) => b.status === 'confirmed').forEach((b) => b.seats.forEach((s) => bySeat.set(s, b)));
  const [sel, setSel] = useState<Booking | null>(null);
  const confirmed = list.filter((b) => b.status === 'confirmed');
  const seats = confirmed.reduce((n, b) => n + b.seats.length, 0);
  const boarded = confirmed.filter((b) => boardedAt(b)).reduce((n, b) => n + b.seats.length, 0);

  const seat = (n: number) => {
    const b = bySeat.get(n);
    const cls = b ? (boardedAt(b) ? 'boarded' : 'taken') : '';
    return (
      <span key={n} className={`seat seat-static ${cls}`} aria-label={`مقعد ${n}${b ? (boardedAt(b) ? ' صعد' : ' محجوز') : ' فارغ'}`}>
        {n}
      </span>
    );
  };

  const rows = [];
  for (let r = 0; r < trip.capacity / 4; r++) {
    const b = r * 4;
    rows.push(
      <div key={r} className="row gap8">
        {seat(b + 1)}{seat(b + 2)}<div className="grow" />{seat(b + 3)}{seat(b + 4)}
      </div>,
    );
  }

  return (
    <div className="screen">
      <TopBar title={`${trip.from} ← ${trip.to}`} sub={<>اليوم · <span className="num"><Time v={trip.time} /></span> · صعدوا <b className="num">{boarded}/{seats}</b></>} right={<button className="iconbtn" aria-label="مسح تذكرة" onClick={() => go('driverScan')} style={{ background: 'var(--navy)', color: '#fff' }}><Icon name="scan" size={22} /></button>} />
      <div className="legend" style={{ padding: '0 20px 10px' }}>
        <span><i style={{ background: '#DCDAE6' }} />محجوز</span>
        <span><i style={{ background: 'var(--success-bg)', border: '1.5px solid #9BD1B1' }} />صعد</span>
        <span><i style={{ border: '1.5px solid var(--mist)' }} />فارغ</span>
      </div>
      <div className="scroll with-tabs pad">
        <div className="bus" style={{ maxWidth: 280 }}><div className="stack gap6">{rows}</div></div>
        <h2 className="h3" style={{ margin: '18px 0 6px' }}>الركاب</h2>
        {list.map((b) => {
          const at = boardedAt(b);
          return (
            <button key={b.code} className="list-item" onClick={() => setSel(b)} style={{ opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
              <span className="ic" style={at ? { background: 'var(--success-bg)', color: 'var(--success)' } : undefined}><Icon name={at ? 'check' : 'user'} size={20} /></span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{b.name}</span>
                <span className="tiny muted">مقاعد {b.seats.join('، ')} · {b.pay} · <span className="code" style={{ letterSpacing: 1 }}>{b.code}</span></span>
              </span>
              <span className={`pill ${b.status === 'cancelled' ? 'bad' : at ? 'ok' : 'info'}`}>{b.status === 'cancelled' ? 'ملغي' : at ? `صعد ${fmt12(at)}` : 'ما صعد'}</span>
            </button>
          );
        })}
      </div>
      <TabBar active="driverTrip" driver />
      <Sheet open={sel !== null} onClose={() => setSel(null)} label="معلومات المسافر">
        {sel ? (
          <div className="stack gap10">
            <h2 className="h2">{sel.name}</h2>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              <span className="pill info">مقاعد {sel.seats.join('، ')}</span>
              <span className="pill info">{sel.pay}</span>
              <span className="pill info code" style={{ letterSpacing: 1 }}>{sel.code}</span>
            </div>
            {sel.status === 'cancelled' ? (
              <div className="pill bad" style={{ height: 40, justifyContent: 'center' }}>الحجز ملغي</div>
            ) : boardedAt(sel) ? (
              <div className="pill ok" style={{ height: 40, justifyContent: 'center' }}>صعد الساعة&nbsp;<span className="num"><Time v={boardedAt(sel)!} /></span></div>
            ) : (
              <button className="btn green" onClick={() => { board(sel.code); showToast(`${sel.name} صعد ✓`); setSel(null); }}><Icon name="check" size={20} stroke={3} /> صعد (بدون مسح)</button>
            )}
            <button className="btn soft" onClick={() => setSel(null)}>سدّ</button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

type CamState = 'starting' | 'on' | 'denied' | 'none';

export function DriverScan() {
  const { verify, go, back, reset, manifest, boardedAt } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [cam, setCam] = useState<CamState>('starting');
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const finish = (outcome: ScanOutcome) => {
    if (doneRef.current) return;
    doneRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (navigator.vibrate) navigator.vibrate(outcome.kind === 'ok' ? 60 : [60, 80, 60]);
    go('driverScanResult', { outcome });
  };

  useEffect(() => {
    let raf = 0;
    let alive = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (!alive) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && ctx && v.videoWidth) {
        const w = 480;
        const h = Math.round((v.videoHeight / v.videoWidth) * w);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(v, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const hit = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (hit?.data) {
          finish(verify(hit.data));
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam('none');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchOk(!!caps.torch);
        setCam('on');
        raf = requestAnimationFrame(tick);
      } catch (e) {
        const name = (e as DOMException)?.name;
        setCam(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'none');
      }
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorchOk(false);
    }
  };

  const submitCode = () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setErr('الرمز 6 أحرف وأرقام');
    finish(verify(c));
  };

  const demoTicket = () => {
    const next = manifest().find((b) => b.status === 'confirmed' && !boardedAt(b));
    finish(next ? verify(next.code) : verify('K7Q2XM'));
  };

  return (
    <div className="screen" style={{ background: '#000' }}>
      <div className="scanner">
        <video ref={videoRef} playsInline muted />
        {cam !== 'on' ? (
          <div className="empty" style={{ position: 'absolute', inset: 0, justifyContent: 'center', color: '#fff', background: 'var(--navy)' }}>
            <Icon name="scan" size={46} />
            <b style={{ fontSize: 18 }}>{cam === 'starting' ? 'جاري تشغيل الكاميرا…' : cam === 'denied' ? 'اسمح للتطبيق يستخدم الكاميرا' : 'الكاميرا مو متوفرة'}</b>
            <span className="small" style={{ opacity: 0.8 }}>{cam === 'denied' ? 'من إعدادات التلفون › التطبيقات › بدربي › الأذونات › الكاميرا. أو اكتب رمز الحجز يدوياً.' : 'تكدر تكتب رمز الحجز يدوياً.'}</span>
          </div>
        ) : (
          <>
            <div className="frame"><div className="laser" /></div>
            <div className="msg">وجّه الكاميرا على رمز QR بتذكرة المسافر</div>
          </>
        )}
        <div className="row" style={{ position: 'absolute', top: 'calc(16px + var(--safe-top))', left: 20, right: 20, justifyContent: 'space-between', zIndex: 3 }}>
          <button className="iconbtn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} aria-label="رجوع" onClick={() => { if (!back()) reset('driverHome'); }}><Icon name="back" size={20} /></button>
          <span style={{ color: '#fff', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>مسح التذكرة</span>
          <button className="iconbtn" disabled={!torchOk} aria-label="الفلاش" aria-pressed={torch} style={{ background: torch ? 'var(--gold)' : 'rgba(255,255,255,.16)', color: torch ? '#2A1A00' : '#fff', opacity: torchOk ? 1 : 0.4 }} onClick={() => void toggleTorch()}><Icon name="flash" size={20} /></button>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: '28px 28px 0 0', marginTop: -24, position: 'relative', padding: '18px 20px calc(20px + var(--safe-bottom))' }} className="stack gap10">
        {manual ? (
          <>
            <label className="label" htmlFor="mcode">اكتب رمز الحجز (6 خانات)</label>
            <div className="row gap8">
              <input id="mcode" className={`input grow code ${err ? 'bad' : ''}`} dir="ltr" maxLength={6} autoFocus placeholder="K7Q2XM" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErr(''); }} style={{ fontSize: 20, textAlign: 'center' }} />
              <button className="btn sm" style={{ width: 90, height: 54 }} onClick={submitCode}>تحقق</button>
            </div>
            <div className="err">{err}</div>
          </>
        ) : (
          <button className="btn soft" onClick={() => setManual(true)}>اكتب الرمز يدوياً</button>
        )}
        <button className="link small" onClick={demoTicket}>جرّب بتذكرة تجريبية</button>
      </div>
    </div>
  );
}

export function DriverScanResult() {
  const { route, board, back, reset, go, showToast } = useStore();
  const outcome = route.params?.outcome as ScanOutcome | undefined;
  const [done, setDone] = useState(false);
  if (!outcome) return null;

  const view = (() => {
    switch (outcome.kind) {
      case 'ok':
        return { color: 'var(--success)', bg: 'var(--success-bg)', icon: 'check', title: 'التذكرة صحيحة', sub: 'تأكد من الاسم وصعّد المسافر' };
      case 'already':
        return { color: '#7A5200', bg: '#FDF1D6', icon: 'info', title: 'صاعد من قبل', sub: `هذي التذكرة انمسحت الساعة ${fmt12(outcome.at)}` };
      case 'other':
        return { color: 'var(--alert)', bg: 'var(--alert-bg)', icon: 'x', title: 'التذكرة لرحلة ثانية', sub: outcome.tripLabel };
      case 'cancelled':
        return { color: 'var(--alert)', bg: 'var(--alert-bg)', icon: 'x', title: 'الحجز ملغي', sub: 'هذا الحجز انلغى، لا تصعّده' };
      case 'notToday':
        return { color: 'var(--alert)', bg: 'var(--alert-bg)', icon: 'calendar', title: 'التذكرة مو لليوم', sub: `موعدها ${longDate(outcome.date)}` };
      default:
        return { color: 'var(--alert)', bg: 'var(--alert-bg)', icon: 'x', title: 'التذكرة مو صحيحة', sub: 'الرمز مو من بدربي أو غلط' };
    }
  })();

  const b = 'booking' in outcome ? outcome.booking : null;

  return (
    <div className="screen">
      <TopBar title="نتيجة المسح" onBack={() => reset('driverTrip')} />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 20 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 10, padding: '18px 0 6px' }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: view.bg, color: view.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={done ? 'check' : view.icon} size={48} stroke={3} />
          </div>
          <h1 className="h1 center" style={{ color: view.color }}>{done ? 'صعد ✓' : view.title}</h1>
          <div className="muted center">{done ? 'انضاف للركاب' : view.sub}</div>
        </div>
        {b ? (
          <div className="card stack gap8">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="h3">{b.name}</span>
              <span className="code small muted" style={{ letterSpacing: 1 }}>{b.code}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">المقاعد</span><b style={{ fontSize: 20 }}>{b.seats.join('، ')}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">الدفع</span><b>{b.pay}</b></div>
            {b.total ? <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">المبلغ</span><b className="num">{money(b.total)} د.ع</b></div> : null}
          </div>
        ) : null}
      </div>
      <div className="bottombar stack gap10">
        {outcome.kind === 'ok' && !done ? (
          <button className="btn green" onClick={() => { board(outcome.booking.code); setDone(true); showToast('صعد ✓'); }}><Icon name="check" size={20} stroke={3} /> تأكيد الصعود</button>
        ) : null}
        <button className={outcome.kind === 'ok' && !done ? 'btn soft' : 'btn'} onClick={() => { back(); }}>
          <Icon name="scan" size={20} /> امسح التذكرة الجاية
        </button>
        <button className="link small" onClick={() => { reset('driverHome'); go('driverTrip'); }}>شوف قائمة الركاب</button>
      </div>
    </div>
  );
}

export function DriverRequests() {
  const { requests, set, showToast } = useStore();
  const decide = (id: string, status: 'accepted' | 'declined') => {
    set({ requests: requests.map((r) => (r.id === id ? { ...r, status } : r)) });
    showToast(status === 'accepted' ? 'قبلت الطلب، وصل إشعار للمسافر' : 'رفضت الطلب');
  };
  return (
    <div className="screen gray">
      <div className="topbar"><div className="title" style={{ fontSize: 24, fontWeight: 800 }}>الطلبات</div></div>
      <div className="scroll with-tabs pad stack gap10">
        {requests.map((r) => (
          <div key={r.id} className="card stack gap10">
            <div className="row gap12">
              <span className="ic" style={{ width: 44, height: 44, borderRadius: 14, background: '#EEEDF8', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="user" size={22} /></span>
              <div className="grow">
                <div className="bold">{r.name}</div>
                <div className="small muted">{r.route} · {r.when} · {r.seats} مقاعد</div>
              </div>
              {r.status !== 'new' ? <span className={`pill ${r.status === 'accepted' ? 'ok' : 'bad'}`}>{r.status === 'accepted' ? 'مقبول' : 'مرفوض'}</span> : null}
            </div>
            {r.status === 'new' ? (
              <div className="row gap10">
                <button className="btn sm green grow" onClick={() => decide(r.id, 'accepted')}>قبول</button>
                <button className="btn sm soft grow" onClick={() => decide(r.id, 'declined')}>رفض</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <TabBar active="driverRequests" driver />
    </div>
  );
}

function toAbs(date: string, time: string) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d) / 60000 + h * 60 + m;
}

/** Hours between two cities. Routes run through Baghdad, so two other cities add both legs. */
function hoursBetween(a: string, b: string) {
  if (a === 'بغداد') return routeInfo(b).hours;
  if (b === 'بغداد') return routeInfo(a).hours;
  return routeInfo(a).hours + routeInfo(b).hours;
}

function durLabel(hours: number) {
  const h = Math.floor(hours);
  const half = hours - h >= 0.5;
  return h === 0 ? 'نص ساعة' : `${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : 'ساعات'}${half ? ' ونص' : ''}`;
}

function garagesIn(city: string) {
  return GARAGES.filter((g) => g.city === city);
}

export function DriverAddTrip() {
  const { driverTrips, set, back, showToast } = useStore();
  const [from, setFrom] = useState('بغداد');
  const [to, setTo] = useState('البصرة');
  const [fromGarage, setFromGarage] = useState('');
  const [toGarage, setToGarage] = useState('');
  const [round, setRound] = useState(false);
  const [date, setDate] = useState(addDays(todayIso(), 1));
  const [time, setTime] = useState('08:00');
  const [backDate, setBackDate] = useState(addDays(todayIso(), 2));
  const [backTime, setBackTime] = useState('16:00');
  const [price, setPrice] = useState('25000');
  const [err, setErr] = useState('');
  const [step, setStep] = useState(1);
  const v = DRIVER_VEHICLE;
  const hours = hoursBetween(from, to);
  const mins = Math.round(hours * 60);
  const arrive = addHours(time, hours);
  const backArrive = addHours(backTime, hours);
  const crosses = (d: string, t: string) => toAbs(d, t) + mins >= toAbs(addDays(d, 1), '00:00');

  const changeFrom = (c: string) => {
    setFrom(c);
    setFromGarage(garagesIn(c).length === 1 ? garagesIn(c)[0].id : '');
    if (c === to) {
      const other = CITIES.find((x) => x !== c)!;
      setTo(other);
      setToGarage('');
    }
    setErr('');
  };
  const changeTo = (c: string) => {
    setTo(c);
    setToGarage(garagesIn(c).length === 1 ? garagesIn(c)[0].id : '');
    setErr('');
  };

  // Everything this driver already drives: today's trip plus trips he added.
  const current = tripById(DRIVER_TRIP_ID)!;
  const mine = [
    { label: `${current.from} ← ${current.to}`, date: todayIso(), time: current.time, mins: Math.round(routeInfo(current.to).hours * 60) },
    ...driverTrips.map((t) => ({ label: `${t.from} ← ${t.to}`, date: t.date, time: t.time, mins: Math.round(hoursBetween(t.from, t.to) * 60) })),
  ];

  const next = () => {
    if (step === 1 && !fromGarage) return setErr(`اختار كراج الانطلاق في ${from}`);
    if (step === 2) {
      const p = Number(price.replace(/[^0-9]/g, ''));
      if (!p || p < 1000) return setErr('اكتب سعر المقعد');
      if (round && !toGarage) return setErr(`اختار كراج الرجعة في ${to}`);
    }
    setErr('');
    if (step < 3) setStep(step + 1);
    else save();
  };

  const save = () => {
    const p = Number(price.replace(/[^0-9]/g, ''));
    const now = new Date();
    const nowAbs = toAbs(todayIso(), `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    const legs = [{ label: `${from} ← ${to}`, date, time, start: toAbs(date, time) }];
    if (round) legs.push({ label: `${to} ← ${from}`, date: backDate, time: backTime, start: toAbs(backDate, backTime) });
    if (legs[0].start < nowAbs + 30) return setErr('وقت الحركة لازم يكون بعد نص ساعة على الأقل من هسه');
    if (round && legs[1].start < legs[0].start + mins + 60) {
      return setErr(`الإياب لازم يكون بعد ما توصل ${to} بساعة على الأقل (توصل ${fmt12(arrive)} ${crosses(date, time) ? 'باليوم الثاني' : ''})`);
    }
    // A driver cannot be on two trips at once — keep an hour between trips.
    for (const leg of legs) {
      const clash = mine.find((t) => {
        const s0 = toAbs(t.date, t.time);
        return leg.start < s0 + t.mins + 60 && s0 < leg.start + mins + 60;
      });
      if (clash) return setErr(`${round ? (leg === legs[0] ? 'الذهاب: ' : 'الإياب: ') : ''}عندك رحلة بنفس الوقت — ${clash.label} · ${longDate(clash.date)} · ${fmt12(clash.time)}`);
    }
    const base = Date.now();
    const out = { id: 'd' + base, from, to, date, time, kind: v.kind, seats: v.seats, price: p, arrive, garageId: fromGarage };
    const ret = { id: 'd' + (base + 1), from: to, to: from, date: backDate, time: backTime, kind: v.kind, seats: v.seats, price: p, arrive: backArrive, garageId: toGarage };
    set({ driverTrips: [...driverTrips, out, ...(round ? [ret] : [])] });
    showToast(round ? 'انضافت رحلتين: الذهاب والإياب' : 'انضافت الرحلة وصارت تطلع للمسافرين');
    back();
  };

  const STEPS = ['الطريق والكراج', 'نوع الرحلة والسعر', 'الموعد'];
  const arriveCard = (city: string, at: string, d: string, t: string) => (
    <div className="card row gap12" style={{ borderStyle: 'dashed' }}>
      <span className="df-ic"><Icon name="pin" size={20} /></span>
      <div className="grow">
        <div className="tiny muted">الوصول المتوقع إلى {city}</div>
        <div className="bold"><span className="num" style={{ fontSize: 18 }}><Time v={at} /></span> {crosses(d, t) ? '· اليوم الثاني' : ''}</div>
      </div>
      <span className="pill info">{durLabel(hours)}</span>
    </div>
  );

  return (
    <div className="screen">
      <TopBar title="رحلة جديدة" sub={`الخطوة ${step} من 3 · ${STEPS[step - 1]}`} onBack={() => { setErr(''); if (step > 1) setStep(step - 1); else back(); }} />
      <div className="steps pad" aria-label={`الخطوة ${step} من 3`}>
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
            <div className="card row gap12" style={{ background: '#EEEDF8', border: 0 }}>
              <span className="df-ic" style={{ background: '#fff' }}><Icon name="bus" size={22} /></span>
              <div className="grow">
                <div className="tiny muted">مركبتك المسجّلة</div>
                <div className="bold">{v.kind} {v.model} · {v.seats} مقعد</div>
                <div className="tiny muted">{v.plate} · {v.color}</div>
              </div>
              <span className="pill ok">ثابتة</span>
            </div>
            <h3 className="h3">منين وين؟</h3>
            <div className="route-box">
              <div className="route-row">
                <span className="route-dot" />
                <div className="grow">
                  <CityPicker id="dfrom" label="الانطلاق من" value={from} onChange={changeFrom} />
                </div>
              </div>
              <div className="route-line" />
              <div className="route-row">
                <span className="route-dot gold" />
                <div className="grow">
                  <CityPicker id="dto" label="الوصول إلى" value={to} exclude={from} onChange={changeTo} />
                </div>
              </div>
            </div>
            <GarageField label={`كراج الانطلاق في ${from}`} city={from} value={fromGarage} onChange={(id) => { setFromGarage(id); setErr(''); }} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h3 className="h3">نوع الرحلة</h3>
            <div className="stack gap8">
              {[
                [false, 'روحة بس', `${from} ← ${to}`],
                [true, 'روحة ورجعة', `${from} ← ${to} ← ${from}`],
              ].map(([val, title, sub]) => (
                <button key={String(val)} role="radio" aria-checked={round === val} className={`radio ${round === val ? 'on' : ''}`} onClick={() => { setRound(val as boolean); setErr(''); }}>
                  <span className="dot" />
                  <span className="grow">
                    <span className="bold" style={{ display: 'block' }}>{title as string}</span>
                    <span className="tiny muted">{sub as string}</span>
                  </span>
                  <Icon name={val ? 'swap' : 'forward'} size={20} />
                </button>
              ))}
            </div>
            {round ? <GarageField label={`كراج الرجعة في ${to}`} city={to} value={toGarage} onChange={(id) => { setToGarage(id); setErr(''); }} /> : null}
            <h3 className="h3" style={{ marginTop: 6 }}>السعر</h3>
            <div className="price-box">
              <input id="dprice" className="num" inputMode="numeric" dir="ltr" value={price} onChange={(e) => { setPrice(e.target.value.replace(/[^0-9]/g, '')); setErr(''); }} aria-label="سعر المقعد" />
              <span>د.ع للمقعد{round ? ' · لكل طريق' : ''}</span>
            </div>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              {[15000, 20000, 25000, 30000, 40000].map((p) => (
                <button key={p} className={`chip ${Number(price) === p ? 'on' : ''}`} style={{ height: 36, fontSize: 13 }} onClick={() => { setPrice(String(p)); setErr(''); }}><span className="num">{money(p)}</span></button>
              ))}
            </div>
            <div className="tiny muted">بالكامل: <b className="num">{money(Number(price || 0) * v.seats)}</b> د.ع إذا امتلت {v.seats} مقعد</div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="card flat row gap10">
              <Icon name="bus" size={20} />
              <span className="grow small"><b>{from} ← {to}</b> · {garageById(fromGarage).name} · <span className="num">{money(Number(price))}</span> د.ع{round ? ' · روحة ورجعة' : ''}</span>
            </div>
            <h3 className="h3">{round ? 'موعد الروحة' : 'موعد الانطلاق'}</h3>
            <DateField label="يوم الحركة" value={date} min={todayIso()} onChange={(d) => { setDate(d); if (backDate < d) setBackDate(addDays(d, 1)); setErr(''); }} />
            <TimeField label="وقت الحركة" value={time} onChange={(t) => { setTime(t); setErr(''); }} />
            {arriveCard(to, arrive, date, time)}
            {round ? (
              <>
                <h3 className="h3" style={{ marginTop: 6 }}>موعد الرجعة ({to} ← {from})</h3>
                <DateField label="يوم الرجعة" value={backDate} min={date} onChange={(d) => { setBackDate(d); setErr(''); }} />
                <TimeField label="وقت الرجعة" value={backTime} onChange={(t) => { setBackTime(t); setErr(''); }} />
                {arriveCard(from, backArrive, backDate, backTime)}
              </>
            ) : null}
          </>
        ) : null}

        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar">
        <button className="btn" onClick={next}>
          {step < 3 ? <>التالي <Icon name="forward" size={18} /></> : round ? 'انشر الروحة والرجعة' : 'انشر الرحلة'}
        </button>
      </div>
    </div>
  );
}

export function DriverProfile() {
  const { set, reset, resetDemo } = useStore();
  const [about, setAbout] = useState(false);
  return (
    <div className="screen">
      <div className="scroll with-tabs">
        <div className="hero" style={{ paddingTop: 'calc(26px + var(--safe-top))', paddingBottom: 24 }}>
          <div className="pad row gap14">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--lavender)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              <img src="./img/driver.png" alt="" style={{ position: 'absolute', top: 2, left: 2, width: 70 }} />
            </div>
            <div className="grow">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{DRIVER_NAME}</div>
              <div className="small" style={{ opacity: 0.8 }}>سائق موثّق ✓ · من <span className="num">2024</span></div>
            </div>
          </div>
        </div>
        <div className="pad stack gap12" style={{ marginTop: 16 }}>
          <div className="card stack gap8">
            <div className="h3">المركبة</div>
            {[['النوع', `${DRIVER_VEHICLE.kind} ${DRIVER_VEHICLE.model} · ${DRIVER_VEHICLE.seats} مقعد`], ['الموديل', DRIVER_VEHICLE.year], ['الرقم', DRIVER_VEHICLE.plate], ['اللون', DRIVER_VEHICLE.color], ['الوثائق', 'إجازة السوق ✓ · السنوية ✓']].map(([k, v]) => (
              <div key={k} className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">{k}</span><b>{v}</b></div>
            ))}
          </div>
          <button className="list-item" onClick={() => setAbout(true)}>
            <span className="ic"><Icon name="info" size={22} /></span><span className="grow bold">عن النسخة التجريبية</span>
          </button>
          <button className="list-item" onClick={() => { set({ role: null }); reset('login'); }}>
            <span className="ic"><Icon name="swap" size={22} /></span><span className="grow bold">ارجع لتطبيق المسافر</span>
          </button>
          <button className="list-item" onClick={resetDemo}>
            <span className="ic"><Icon name="refresh" size={22} /></span><span className="grow bold">مسح بيانات التجربة</span>
          </button>
        </div>
      </div>
      <TabBar active="driverProfile" driver />
      <Sheet open={about} onClose={() => setAbout(false)} label="عن النسخة التجريبية">
        <AboutDemo onClose={() => setAbout(false)} />
      </Sheet>
    </div>
  );
}
