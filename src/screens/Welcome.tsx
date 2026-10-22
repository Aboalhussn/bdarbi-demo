import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, Logo } from '../icons';
import { useStore } from '../store';
import { ADMIN_PHONE, IS_PARTNER } from '../mode';

export function Splash() {
  const { reset, role, onboarded } = useStore();
  const groupRef = useRef<HTMLDivElement>(null);
  const [settle, setSettle] = useState(0);
  useLayoutEffect(() => {
    const h = groupRef.current?.offsetHeight ?? 0;
    setSettle(Math.max(0, h / 2 - 70));
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (IS_PARTNER) {
        // The partner app: captains, travel offices and the admin.
        if (role === 'driver') reset('driverHome');
        else if (role === 'agency') reset('agencyHome');
        else if (role === 'admin') reset('admin');
        else reset('login');
        return;
      }
      if (role === 'passenger') reset('home');
      else if (onboarded) reset('login');
      else reset('onboardLocation');
    }, 3000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="screen navy splash" aria-label="بدربي">
      <svg className="stars" aria-hidden="true" width="100%" height="100%">
        <defs>
          <pattern id="bdStars" width="88" height="88" patternUnits="userSpaceOnUse">
            <path d="M44 14 L52.5 26.5 L67 22.5 L63 37 L75.5 44 L63 51 L67 65.5 L52.5 61.5 L44 74 L35.5 61.5 L21 65.5 L25 51 L12.5 44 L25 37 L21 22.5 L35.5 26.5 Z" fill="none" stroke="#FFFFFF" strokeOpacity="0.09" strokeWidth="1.2" strokeLinejoin="round" />
          </pattern>
          <radialGradient id="bdVig" cx="50%" cy="44%" r="70%">
            <stop offset="0" stopColor="#0B0558" stopOpacity="0" />
            <stop offset="0.55" stopColor="#0B0558" stopOpacity="0.25" />
            <stop offset="1" stopColor="#06033A" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bdStars)" />
        <rect width="100%" height="100%" fill="url(#bdVig)" />
      </svg>
      <div className="glow" aria-hidden="true" />
      {/* The whole group is centred. The logo starts where the phone's launch screen drew it
          (dead centre) and glides up into place, so the two screens join up. */}
      <div className="splash-group" ref={groupRef} style={{ ['--settle' as string]: `${settle}px` }}>
        <Logo className="logo" size={140} />
        <div className="word">{IS_PARTNER ? 'كابتن بدربي' : 'بدربي'}</div>
        <div className="tag">{IS_PARTNER ? 'للكباتن ومكاتب السفر' : 'مقعدك محجوز... بدربك'}</div>
        <div className="road" role="progressbar" aria-label="جاري التحميل">
          <div className="line" />
          <div className="start" />
          <div className="car" />
        </div>
      </div>
      <div className="foot">رحلات بين المحافظات · العراق</div>
    </div>
  );
}

function Onboard({ step }: { step: 1 | 2 }) {
  const { go, reset, set } = useStore();
  const next = () => {
    if (step === 1) go('onboardNotify');
    else {
      set({ onboarded: true });
      reset('login');
    }
  };
  const enable = () => {
    if (step === 1 && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => undefined, () => undefined, { timeout: 8000 });
    }
    if (step === 2 && 'Notification' in window) {
      try {
        void Notification.requestPermission().catch(() => undefined);
      } catch {
        /* not supported here */
      }
    }
    next();
  };
  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between', padding: 'calc(18px + var(--safe-top)) 22px 0', position: 'relative', zIndex: 3 }}>
        <div className="row gap8">
          <Logo size={34} color="#0B0558" seat="#FFFFFF" />
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}>بدربي</span>
        </div>
        <button
          className="link muted"
          onClick={() => {
            set({ onboarded: true });
            reset('login');
          }}
        >
          تخطي
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 260 }}>
        <div className="bubble" style={{ top: 34 }}>{step === 1 ? 'هلو! سمعت بيك تريد تروح لغير محافظة؟' : 'لا يفوتك الباص! أخبرك أول ما يتحرك.'}</div>
        <img src="./img/mascot.png" alt="" style={{ position: 'absolute', right: 10, bottom: -40, height: '118%', maxHeight: 520, width: 'auto' }} />
      </div>
      <div className="panel">
        <div className="ic"><Icon name={step === 1 ? 'pin' : 'bell'} size={28} /></div>
        <h1 className="h2 center">{step === 1 ? 'فعّل الموقع حتى نلكالك أقرب كراج' : 'فعّل الإشعارات'}</h1>
        <p className="center" style={{ margin: 0, color: 'rgba(255,255,255,.78)', lineHeight: 1.7 }}>
          {step === 1 ? 'نستخدم موقعك بس حتى نعرض الكراجات والرحلات القريبة منك.' : 'تنبيه قبل الحركة، تغيير موعد، أو مكافأة جديدة — كلها توصلك أول بأول.'}
        </p>
        <div className="dots" aria-hidden="true">
          <i className={step === 1 ? 'on' : ''} />
          <i className={step === 2 ? 'on' : ''} />
        </div>
        <button className="btn light" onClick={enable}>تفعيل</button>
        <button className="link" style={{ color: 'rgba(255,255,255,.8)', fontWeight: 500 }} onClick={next}>مو هسه</button>
      </div>
    </div>
  );
}

export const OnboardLocation = () => <Onboard step={1} />;
export const OnboardNotify = () => <Onboard step={2} />;

/** Keeps only digits and formats an Iraqi mobile number as 7XX XXX XXXX. */
export function formatPhone(raw: string) {
  let d = raw.replace(/[^0-9٠-٩]/g, '').replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  if (d.startsWith('964')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(' ');
}

export function phoneError(formatted: string) {
  const d = formatted.replace(/\s/g, '');
  if (!d) return 'اكتب رقم موبايلك';
  if (!d.startsWith('7')) return 'رقم الموبايل العراقي يبدي بـ 7';
  if (d.length !== 10) return 'الرقم لازم يكون 10 أرقام بعد +964';
  return '';
}

export function PhoneField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="field">
      <label htmlFor="phone">رقم الموبايل</label>
      <div className={`phone ${error ? 'bad' : ''}`}>
        <div className="cc">🇮🇶 +964</div>
        <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="7XX XXX XXXX" value={value} onChange={(e) => onChange(formatPhone(e.target.value))} />
      </div>
      <div className="err">{error}</div>
    </div>
  );
}

export function Login() {
  const { go, reset, set, route, phone: savedPhone, password } = useStore();
  const agency = route.params?.agency === true;
  const driver = route.params?.driver === true || agency;
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [passErr, setPassErr] = useState('');

  const submit = () => {
    const e = phoneError(phone);
    setErr(e);
    const pe = pass.length < 4 ? 'كلمة السر 4 أحرف أو أكثر' : '';
    setPassErr(pe);
    if (e || pe) return;
    // Signing in needs no code: the number was confirmed when the account was made.
    if (savedPhone && formatPhone(savedPhone) === phone && password && pass !== password) {
      setPassErr('كلمة السر غلط. جرّب مرة ثانية أو اضغط «نسيت كلمة السر؟»');
      return;
    }
    set({ role: 'passenger', phone });
    reset('home');
  };

  return (
    <div className="screen">
      <div className="scroll">
        <div className="hero" style={{ position: 'relative', height: 300, overflow: 'hidden', paddingTop: 'var(--safe-top)' }}>
          <div style={{ position: 'absolute', top: 'calc(56px + var(--safe-top))', right: 26, width: 230 }}>
            {driver ? (
              <button className="iconbtn" aria-label="رجوع" style={{ marginBottom: 12 }} onClick={() => reset('login')}>
                <Icon name="back" size={20} />
              </button>
            ) : (
              <div className="row gap8" style={{ opacity: 0.85 }}>
                <Logo size={30} />
                <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }}>بدربي</span>
              </div>
            )}
            <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 8, lineHeight: 1.35 }}>{agency ? 'مكاتب السفر' : driver ? 'كابتن بدربي' : 'أهلاً بيك من جديد'}</h1>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.78)' }}>{agency ? 'أدر رحلات مكتبك وسواقك ومركباتك من مكان واحد.' : driver ? 'سجّل دخولك حتى تدير رحلاتك وتمسح تذاكر الركاب.' : 'سجّل دخولك برقم موبايلك وخلّي الرحلة علينا.'}</p>
          </div>
          <img src={driver ? './img/driver.png' : './img/mascot-flip.png'} alt="" style={{ position: 'absolute', left: 18, bottom: driver ? 0 : -60, height: driver ? 200 : 290, width: 'auto' }} />
        </div>
        <div className="pad stack gap6" style={{ marginTop: 22 }}>
          {!driver && (
            <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
              <button className="on" role="tab" aria-selected="true">تسجيل الدخول</button>
              <button role="tab" aria-selected="false" onClick={() => go('register')}>حساب جديد</button>
            </div>
          )}
          <PhoneField value={phone} onChange={(v) => { setPhone(v); if (err) setErr(''); }} error={err} />
          <div className="field">
            <label htmlFor="pass">كلمة السر</label>
            <div className={`phone ${passErr ? 'bad' : ''}`} style={{ direction: 'rtl' }}>
              <input id="pass" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={(e) => { setPass(e.target.value); setPassErr(''); }} style={{ textAlign: 'right', letterSpacing: show ? 0 : 2, fontFamily: 'var(--text)' }} />
              <button aria-label="إظهار كلمة السر" onClick={() => setShow(!show)} style={{ width: 52, color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="eye" size={20} />
              </button>
            </div>
            <div className="err">{passErr}</div>
          </div>
          <button className="link small" style={{ alignSelf: 'flex-start', margin: '-2px 0 8px' }} onClick={() => go('forgot')}>نسيت كلمة السر؟</button>
          <button className="btn" onClick={submit}>تسجيل الدخول</button>
          <div className="small muted center" style={{ marginTop: 6 }}>نسخة تجريبية: أي رقم صحيح وأي كلمة سر تشتغل</div>
          {driver && !agency ? (
            <div className="tiny muted center" style={{ lineHeight: 1.8 }}>سائق تابع لمكتب سفر؟ ادخل بالرقم اللي سجّله المكتب (جرّب <span className="num" dir="ltr">770 111 0001</span>)</div>
          ) : null}
          {driver && !agency ? (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => go('captainRegister')}>
              <Icon name="user" size={20} /> كابتن جديد؟ سجّل هنا
            </button>
          ) : null}
          {!driver && (
            <>
              <div className="row gap12" style={{ margin: '14px 0 4px', color: '#8F8CA3', fontSize: 14 }}>
                <div className="grow divider" />
                <span>ما عندك حساب؟</span>
                <div className="grow divider" />
              </div>
              <button className="btn ghost" onClick={() => go('register')}>
                <Icon name="user" size={20} /> إنشاء حساب جديد
              </button>
              <div className="row" style={{ justifyContent: 'center', gap: 18, margin: '10px 0 30px' }}>
                <button
                  className="link muted"
                  onClick={() => {
                    set({ role: 'passenger', name: 'ضيف' });
                    reset('home');
                  }}
                >
                  أكمل كضيف
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { go } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [agree, setAgree] = useState(true);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'اكتب اسمك';
    const pe = phoneError(phone);
    if (pe) e.phone = pe;
    if (pass.length < 4) e.pass = 'كلمة السر 4 أحرف أو أكثر';
    if (!agree) e.agree = 'لازم توافق على الشروط';
    setErrs(e);
    if (Object.keys(e).length) return;
    go('otp', { phone, name: name.trim(), pass, purpose: 'register' });
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" aria-label="رجوع" onClick={() => go('login')}>
          <Icon name="back" size={20} />
        </button>
        <div className="title">حساب جديد</div>
      </header>
      <div className="scroll pad stack gap6" style={{ paddingBottom: 30 }}>
        <p className="muted" style={{ margin: '0 0 12px' }}>دقيقة وحدة وتصير عندك حساب بدربي.</p>
        <div className="field">
          <label htmlFor="name">الاسم</label>
          <input id="name" className={`input ${errs.name ? 'bad' : ''}`} placeholder="مثلاً: علي حسن" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="err">{errs.name}</div>
        </div>
        <PhoneField value={phone} onChange={setPhone} error={errs.phone} />
        <div className="field">
          <label htmlFor="rpass">كلمة السر</label>
          <input id="rpass" type="password" className={`input ${errs.pass ? 'bad' : ''}`} placeholder="4 أحرف أو أكثر" value={pass} onChange={(e) => setPass(e.target.value)} />
          <div className="err">{errs.pass}</div>
        </div>
        <button className="row gap10" style={{ textAlign: 'right', padding: '6px 0' }} onClick={() => setAgree(!agree)}>
          <span style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid var(--primary)', background: agree ? 'var(--primary)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {agree && <Icon name="check" size={16} stroke={3} />}
          </span>
          <span className="small">أوافق على الشروط والأحكام وسياسة الخصوصية</span>
        </button>
        <div className="err">{errs.agree}</div>
        <button className="btn" onClick={submit}>إنشاء الحساب</button>
      </div>
    </div>
  );
}

/** The 4-digit code pad, used wherever a phone number has to be confirmed. */
export function OtpPad({ phone, onDone, title = 'دخّل الرمز', note }: { phone: string; onDone: () => void; title?: string; note?: string }) {
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(42);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (code.length !== 4) return;
    setChecking(true);
    const t = window.setTimeout(onDone, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const press = (d: string) => {
    if (checking) return;
    if (d === 'del') setCode((c) => c.slice(0, -1));
    else setCode((c) => (c.length < 4 ? c + d : c));
  };

  return (
    <>
      <div className="scroll pad stack" style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{title}</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {note ?? 'نتأكد إن الرقم إلك.'} دزّينا رمز من 4 أرقام على <span className="num bold" style={{ color: 'var(--ink)' }}>+964 {phone}</span>
        </p>
        <div className="otp-boxes" style={{ marginTop: 30 }} aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={code[i] ? 'filled' : i === code.length ? 'cur' : ''}>{code[i] ?? ''}</div>
          ))}
        </div>
        <div className="center small" style={{ marginTop: 18 }}>
          {checking ? (
            <span className="bold" style={{ color: 'var(--navy)' }}>جاري التحقق…</span>
          ) : left > 0 ? (
            <span className="muted">ما وصلك؟ <b style={{ color: 'var(--navy)' }}>إعادة الإرسال بعد <span className="num">00:{String(left).padStart(2, '0')}</span></b></span>
          ) : (
            <button className="link" onClick={() => setLeft(42)}>إعادة إرسال الرمز</button>
          )}
        </div>
        <div className="demo-note center" style={{ margin: '14px 0 0' }}>نسخة تجريبية: اكتب أي 4 أرقام</div>
        <div style={{ flex: 1, minHeight: 20 }} />
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)}>{d}</button>
          ))}
          <span />
          <button onClick={() => press('0')}>0</button>
          <button aria-label="حذف" onClick={() => press('del')} style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="forward" size={24} />
          </button>
        </div>
      </div>
    </>
  );
}

/** Full-screen code step on top of a sign-up form, so the form keeps what was typed. */
export function OtpOverlay({ phone, onDone, onBack, note }: { phone: string; onDone: () => void; onBack: () => void; note?: string }) {
  return (
    <div className="screen otp-overlay">
      <header className="topbar">
        <button className="iconbtn" aria-label="رجوع" onClick={onBack}><Icon name="back" size={20} /></button>
        <div className="title" />
      </header>
      <OtpPad phone={phone} onDone={onDone} title="أكّد رقمك" note={note} />
    </div>
  );
}

/** Code screen. Only sign-up and password reset come here; signing in goes straight in. */
export function Otp() {
  const { route, back, reset, set, go } = useStore();
  const phone = String(route.params?.phone ?? '');
  const purpose = String(route.params?.purpose ?? 'register');
  const name = route.params?.name ? String(route.params.name) : undefined;
  const pass = route.params?.pass ? String(route.params.pass) : undefined;
  const done = () => {
    if (purpose === 'reset') {
      reset('login');
      go('resetPassword', { phone });
      return;
    }
    set({ role: 'passenger', phone, ...(name ? { name } : {}), ...(pass ? { password: pass } : {}) });
    reset('home');
  };
  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" aria-label="رجوع" onClick={back}><Icon name="back" size={20} /></button>
        <div className="title" />
      </header>
      <OtpPad phone={phone} onDone={done} title={purpose === 'reset' ? 'رمز الاسترجاع' : 'أكّد رقمك'} note={purpose === 'reset' ? 'حتى تغيّر كلمة السر.' : undefined} />
    </div>
  );
}

/** Sign-in for the partner app «كابتن بدربي»: one form for captains, office drivers, travel offices and the admin. */
export function PartnerLogin() {
  const { go, agencyInfo, set, reset, captain, agencyDrivers, officeSignup } = useStore();
  // The number decides who signs in. No code here: numbers are confirmed when the account is made.
  const signIn = (p: string) => {
    const digits = p.replace(/\s/g, '');
    if (digits === ADMIN_PHONE) { set({ role: 'admin', agencyDriverId: null }); reset('admin'); return; }
    if (digits === agencyInfo.phone.replace(/\s/g, '')) { set({ role: 'agency', agencyDriverId: null }); reset('agencyHome'); return; }
    if (officeSignup && officeSignup.phone.replace(/\s/g, '') === digits) { reset('officePending'); return; }
    if (captain?.status === 'pending' && captain.phone.replace(/\s/g, '') === digits) { reset('captainPending'); return; }
    const officeDriver = agencyDrivers.find((d) => d.phone === digits);
    set({ role: 'driver', agencyDriverId: officeDriver?.id ?? null });
    reset('driverHome');
  };
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const submit = () => {
    const e = phoneError(phone);
    setErr(e);
    const pe = pass.length < 4 ? 'كلمة السر 4 أحرف أو أكثر' : '';
    setPassErr(pe);
    if (e || pe) return;
    signIn(phone);
  };
  const demo: [string, string][] = [
    ['كابتن', '780 111 2222'],
    ['سائق مكتب', '770 111 0001'],
    ['مكتب سفر', agencyInfo.phone],
    ['الإدارة', '711 111 1111'],
  ];
  return (
    <div className="screen">
      <div className="scroll">
        <div className="hero" style={{ position: 'relative', height: 280, overflow: 'hidden', paddingTop: 'var(--safe-top)' }}>
          <div style={{ position: 'absolute', top: 'calc(48px + var(--safe-top))', right: 26, width: 230 }}>
            <div className="row gap8" style={{ opacity: 0.9 }}>
              <Logo size={30} />
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20 }}>كابتن بدربي</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 10, lineHeight: 1.35 }}>أهلاً بيك</h1>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.78)' }}>للكباتن ومكاتب السفر والإدارة. ادخل برقمك وكل واحد يطلعله حسابه.</p>
          </div>
          <img src="./img/driver.png" alt="" style={{ position: 'absolute', left: 18, bottom: 0, height: 190, width: 'auto' }} />
        </div>
        <div className="pad stack gap6" style={{ marginTop: 22 }}>
          <PhoneField value={phone} onChange={(v) => { setPhone(v); if (err) setErr(''); }} error={err} />
          <div className="field">
            <label htmlFor="pass">كلمة السر</label>
            <div className={`phone ${passErr ? 'bad' : ''}`} style={{ direction: 'rtl' }}>
              <input id="pass" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={(e) => { setPass(e.target.value); setPassErr(''); }} style={{ textAlign: 'right', letterSpacing: show ? 0 : 2, fontFamily: 'var(--text)' }} />
              <button aria-label="إظهار كلمة السر" onClick={() => setShow(!show)} style={{ width: 52, color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="eye" size={20} />
              </button>
            </div>
            <div className="err">{passErr}</div>
          </div>
          <button className="link small" style={{ alignSelf: 'flex-start', margin: '-2px 0 8px' }} onClick={() => go('forgot')}>نسيت كلمة السر؟</button>
          <button className="btn" onClick={submit}>تسجيل الدخول</button>
          <div className="card flat stack gap6" style={{ marginTop: 12 }}>
            <b className="small">أرقام التجربة (أي كلمة سر):</b>
            {demo.map(([who, num]) => (
              <button key={who} className="row small" style={{ justifyContent: 'space-between', height: 34 }} onClick={() => { setPhone(formatPhone(num)); setPass('1234'); setErr(''); setPassErr(''); }}>
                <span className="muted">{who}</span>
                <b className="num" dir="ltr">0{num}</b>
              </button>
            ))}
          </div>
          <button className="btn ghost" style={{ margin: '14px 0 30px' }} onClick={() => go('captainRegister')}>
            <Icon name="user" size={20} /> كابتن جديد؟ سجّل هنا
          </button>
          <button className="btn ghost" style={{ margin: '-18px 0 30px' }} onClick={() => go('officeRegister')}>
            <Icon name="hotel" size={20} /> مكتب سفر جديد؟ سجّل مكتبك
          </button>
        </div>
      </div>
    </div>
  );
}
