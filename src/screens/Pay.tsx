import { useEffect, useRef, useState } from 'react';
import { money, newCode, tripById } from '../data';
import { Icon } from '../icons';
import { useStore, type Booking } from '../store';
import type { PkgBooking } from '../packages';
import { TopBar } from '../ui';
import { CardVisual } from './Account';
import { formatPhone, phoneError } from './Welcome';

type Stage = 'start' | 'otp' | 'processing' | 'done' | 'failed';

/** Demo payment: Zain Cash or card, confirmed with a one-time code before the seat is booked. */
export function Pay() {
  const { route, phone, card, addBooking, addPkgBooking, packages, set, usedCoupons, reset, go, back, showToast } = useStore();
  const draft = route.params?.draft as Omit<Booking, 'code' | 'createdAt'> | undefined;
  const method = route.params?.method === 'card' ? 'card' : 'zain';
  const coupon = route.params?.coupon as string | null | undefined;
  const trip = draft ? tripById(draft.tripId) : undefined;
  // A package booking pays through the same screen.
  const pkgDraft = route.params?.pkg as PkgBooking | undefined;
  const pkg = pkgDraft ? packages.find((p) => p.id === pkgDraft.pkgId) : undefined;
  const amount = pkgDraft ? pkgDraft.paid : draft?.total ?? 0;

  const [stage, setStage] = useState<Stage>('start');
  const [wallet, setWallet] = useState(formatPhone(phone || ''));
  const [cvv, setCvv] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState('');
  const [tries, setTries] = useState(0);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState('');
  const [ref] = useState(() => 'TX' + String(Date.now()).slice(-8));
  const [bookedCode, setBookedCode] = useState('');
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (stage === 'otp') window.setTimeout(() => otpRef.current?.focus(), 200);
  }, [stage]);

  if (!(draft && trip) && !(pkgDraft && pkg)) {
    return (
      <div className="screen">
        <TopBar title="الدفع" />
        <div className="empty"><Icon name="info" size={40} /><b>ما اكو عملية دفع</b><button className="btn sm" style={{ width: 200 }} onClick={() => reset('home')}>رجوع للرئيسية</button></div>
      </div>
    );
  }

  const sendCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSent(code);
    setOtp('');
    setLeft(30);
    setErr('');
    setStage('otp');
  };

  const start = () => {
    if (method === 'zain') {
      const e = phoneError(wallet);
      if (e) return setErr(e === 'اكتب رقم موبايلك' ? 'اكتب رقم محفظة زين كاش' : e);
    } else if (!/^\d{3,4}$/.test(cvv)) {
      return setErr('اكتب الـ CVV (3 أرقام ورا البطاقة)');
    }
    sendCode();
  };

  const verify = () => {
    if (otp.length !== 6) return setErr('الرمز 6 أرقام');
    if (otp !== sent) {
      const n = tries + 1;
      setTries(n);
      setOtp('');
      if (n >= 3) {
        setStage('failed');
        return;
      }
      return setErr(`الرمز غلط — باقي ${3 - n} ${3 - n === 1 ? 'محاولة' : 'محاولات'}`);
    }
    setErr('');
    setStage('processing');
    window.setTimeout(() => {
      let code = newCode();
      if (pkgDraft) {
        code = pkgDraft.code;
        addPkgBooking({ ...pkgDraft, createdAt: Date.now() });
      } else if (draft) {
        addBooking({ ...draft, code, createdAt: Date.now() });
      }
      if (coupon) set({ usedCoupons: [...usedCoupons, coupon] });
      setBookedCode(code);
      setStage('done');
    }, 1600);
  };

  const target = method === 'zain' ? `زين كاش · 0${wallet.replace(/\s/g, '')}` : card ? `${card.brand} ${card.first4} ••••` : 'البطاقة';

  if (stage === 'processing' || stage === 'done') {
    const done = stage === 'done';
    return (
      <div className="screen">
        <div className="pay-result">
          <div className={`pay-ring ${done ? 'ok' : ''}`}>{done ? <Icon name="check" size={44} stroke={3} /> : null}</div>
          <h1 className="h2" style={{ marginTop: 18 }}>{done ? 'تم الدفع ✓' : 'جاري تأكيد الدفع…'}</h1>
          <div className="muted small">{done ? 'انحجز مكانك وطلع رمز الحجز' : 'لا تسد التطبيق'}</div>
          {done ? (
            <div className="card stack gap8" style={{ width: '100%', marginTop: 22 }}>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المبلغ</span><b className="num">{money(amount)} د.ع</b></div>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">من</span><b>{target}</b></div>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">إلى</span><b>بدربي</b></div>
              <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">رقم العملية</span><b className="num" dir="ltr">{ref}</b></div>
            </div>
          ) : null}
        </div>
        {done ? (
          <div className="bottombar">
            <button className="btn" onClick={() => { reset('home'); go(pkgDraft ? 'pkgTicket' : 'ticket', { code: bookedCode, fresh: true }); }}><Icon name="ticket" size={20} /> شوف التذكرة</button>
          </div>
        ) : null}
      </div>
    );
  }

  if (stage === 'failed') {
    return (
      <div className="screen">
        <div className="pay-result">
          <div className="pay-ring bad"><Icon name="x" size={44} stroke={3} /></div>
          <h1 className="h2" style={{ marginTop: 18 }}>انلغت عملية الدفع</h1>
          <div className="muted small center" style={{ lineHeight: 1.8 }}>دخلت رمز غلط 3 مرات. ما انخصم منك شي، والمقاعد بعدها مو محجوزة.</div>
        </div>
        <div className="bottombar stack gap8">
          <button className="btn" onClick={() => { setTries(0); setStage('start'); setErr(''); }}>جرّب مرة ثانية</button>
          <button className="btn soft" onClick={() => { showToast('رجعت لتأكيد الحجز'); back(); }}>بدّل طريقة الدفع</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen gray">
      <TopBar title={method === 'zain' ? 'الدفع بزين كاش' : 'الدفع بالبطاقة'} sub={pkg ? pkg.title : `${trip!.from} ← ${trip!.to} · مقاعد ${draft!.seats.join('، ')}`} onBack={() => { if (stage === 'otp') { setStage('start'); setErr(''); } else back(); }} />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 24 }}>
        <div className="pay-amount">
          <div className="small" style={{ opacity: 0.8 }}>المبلغ المطلوب</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 800 }}>{money(amount)} <span style={{ fontSize: 15 }}>د.ع</span></div>
          <div className="tiny" style={{ opacity: 0.75 }}>إلى: بدربي · رقم العملية <span className="num" dir="ltr">{ref}</span></div>
        </div>

        {stage === 'start' ? (
          method === 'zain' ? (
            <div className="form-card" style={{ gap: 10 }}>
              <div className="row gap10">
                <span className="zc-badge">ZC</span>
                <div className="grow"><b>محفظة زين كاش</b><div className="tiny muted">نرسلك رمز تأكيد على رقم المحفظة</div></div>
              </div>
              <div className={`phone ${err ? 'bad' : ''}`}>
                <div className="cc">🇮🇶 +964</div>
                <input type="tel" inputMode="numeric" aria-label="رقم المحفظة" placeholder="7XX XXX XXXX" value={wallet} onChange={(e) => { setWallet(formatPhone(e.target.value)); setErr(''); }} />
              </div>
            </div>
          ) : (
            <div className="stack gap10">
              {card ? <CardVisual {...card} /> : null}
              <div className="field">
                <label htmlFor="pcvv">CVV</label>
                <input id="pcvv" type="password" className={`input num ${err ? 'bad' : ''}`} inputMode="numeric" dir="ltr" style={{ textAlign: 'left' }} placeholder="•••" maxLength={4} value={cvv} onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '')); setErr(''); }} />
              </div>
            </div>
          )
        ) : (
          <div className="form-card" style={{ gap: 12 }}>
            <div className="row gap10">
              <span className="zc-badge" style={{ background: '#E6F4EC', color: 'var(--success)' }}><Icon name="lock" size={18} /></span>
              <div className="grow"><b>رمز التأكيد</b><div className="tiny muted">دزينا رمز من 6 أرقام إلى {method === 'zain' ? <span className="num" dir="ltr">0{wallet.replace(/\s/g, '')}</span> : 'رقمك المسجّل بالبنك'}</div></div>
            </div>
            <input
              ref={otpRef}
              className={`input num otp-in ${err ? 'bad' : ''}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              aria-label="رمز التأكيد"
              placeholder="••••••"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
            />
            <div className="demo-code">
              <Icon name="info" size={16} /> نسخة تجريبية — الرمز: <b className="num" dir="ltr">{sent}</b>
              <button className="link small" onClick={() => { setOtp(sent); setErr(''); }}>اكتبه</button>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="muted">ما وصلك؟</span>
              {left > 0 ? <span className="muted">إعادة الإرسال بعد <span className="num">{left}</span> ث</span> : <button className="link small" onClick={sendCode}>ارسل الرمز مرة ثانية</button>}
            </div>
          </div>
        )}
        {err ? <div className="err" style={{ textAlign: 'center' }}>{err}</div> : null}
        <div className="tiny muted row gap6" style={{ justifyContent: 'center' }}><Icon name="lock" size={14} /> نسخة تجريبية: ما ينسحب مبلغ حقيقي.</div>
      </div>
      <div className="bottombar">
        {stage === 'start' ? (
          <button className="btn" onClick={start}>{method === 'zain' ? 'ارسل رمز التأكيد' : `ادفع ${money(amount)} د.ع`}</button>
        ) : (
          <button className="btn" disabled={otp.length !== 6} onClick={verify}>أكّد الدفع</button>
        )}
      </div>
    </div>
  );
}
