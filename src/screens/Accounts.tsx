import { useRef, useState } from 'react';
import { CITIES } from '../data';
import { Icon } from '../icons';
import { CityPicker } from '../pickers';
import { useStore } from '../store';
import { TopBar } from '../ui';
import { PASS_RULES, PasswordMeter, shrinkImage } from './Account';
import { OtpOverlay, PhoneField, formatPhone, phoneError } from './Welcome';
import { IS_PARTNER } from '../mode';

/* ---------- forgot password: number → code → new password ---------- */

export function ForgotPassword() {
  const { go } = useStore();
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const send = () => {
    const e = phoneError(phone);
    if (e) return setErr(e);
    go('otp', { phone, purpose: 'reset' });
  };
  return (
    <div className="screen">
      <TopBar title="نسيت كلمة السر" />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 24 }}>
        <div className="center" style={{ padding: '10px 0 4px' }}>
          <span className="forgot-ic"><Icon name="lock" size={34} /></span>
        </div>
        <h1 className="h2 center" style={{ margin: 0 }}>نرجّعلك حسابك</h1>
        <p className="muted center" style={{ margin: 0, lineHeight: 1.8 }}>اكتب رقمك ونبعثلك رمز من 4 أرقام، وبعدها تختار كلمة سر جديدة.</p>
        <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr(''); }} error={err} />
        <button className="btn" onClick={send}>ابعث الرمز</button>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const { route, set, reset, showToast, phone: myPhone } = useStore();
  const phone = String(route.params?.phone ?? '');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const strong = PASS_RULES.every(([, f]) => f(pass));
  const save = () => {
    if (!strong) return setErr('كلمة السر لازم تكون قوية (4 خطوط خضر)');
    if (pass !== pass2) return setErr('كلمتين السر مو نفس الشي');
    // The passenger app keeps the password with the account on this phone.
    if (!IS_PARTNER && (!myPhone || formatPhone(myPhone) === phone)) set({ password: pass, phone });
    showToast('تغيّرت كلمة السر ✓ سجّل دخول بيها');
    reset('login');
  };
  return (
    <div className="screen">
      <TopBar title="كلمة سر جديدة" sub={<>للرقم <span className="num" dir="ltr">+964 {phone}</span></>} />
      <div className="scroll pad stack gap10" style={{ paddingBottom: 24 }}>
        <div className="field">
          <label htmlFor="np1">كلمة السر الجديدة</label>
          <div className="phone" style={{ direction: 'rtl' }}>
            <input id="np1" type={show ? 'text' : 'password'} value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} style={{ textAlign: 'right', fontFamily: 'var(--text)' }} />
            <button aria-label="إظهار كلمة السر" onClick={() => setShow(!show)} style={{ width: 52, color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="eye" size={20} /></button>
          </div>
        </div>
        <PasswordMeter value={pass} />
        <div className="field">
          <label htmlFor="np2">أكّد كلمة السر</label>
          <input id="np2" type={show ? 'text' : 'password'} className={`input ${pass2 && pass2 !== pass ? 'bad' : ''}`} value={pass2} onChange={(e) => { setPass2(e.target.value); setErr(''); }} />
        </div>
        {err ? <div className="err">{err}</div> : null}
        <button className="btn" onClick={save}>احفظ كلمة السر</button>
      </div>
    </div>
  );
}

/* ---------- a new travel office signs up ---------- */

const OFFICE_DOCS: [string, string][] = [['license', 'إجازة الشركة'], ['managerId', 'هوية المدير'], ['lease', 'عقد المكتب أو الإيجار'], ['annuals', 'سنويات المركبات']];

export function OfficeRegister() {
  const { set, reset, back, showToast } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [address, setAddress] = useState('');
  const [fleet, setFleet] = useState('');
  const [pass, setPass] = useState('');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState('');
  const strong = PASS_RULES.every(([, f]) => f(pass));

  const next = () => {
    if (step === 1) {
      if (name.trim().length < 4) return setErr('اكتب اسم المكتب');
      if (manager.trim().split(/\s+/).length < 2) return setErr('اكتب اسم المدير');
      const pe = phoneError(phone);
      if (pe) return setErr(pe);
      if (address.trim().length < 4) return setErr('اكتب عنوان المكتب');
      if (!strong) return setErr('كلمة السر لازم تكون قوية (4 خطوط خضر)');
      if (verified !== phone) { setErr(''); setVerifying(true); return; }
      setErr('');
      setStep(2);
      return;
    }
    const missing = OFFICE_DOCS.filter(([k]) => !docs[k]);
    if (missing.length) return setErr(`باقي ترفع: ${missing.map(([, l]) => l).join('، ')}`);
    set({ officeSignup: { name: name.trim(), manager: manager.trim(), phone, city, address: address.trim(), fleet: fleet.trim() || '—', docs, submittedAt: Date.now(), status: 'pending' } });
    showToast('انرسل طلب المكتب للإدارة ✓');
    reset('officePending');
  };

  if (verifying) {
    return <OtpOverlay phone={phone} note="نتأكد إن رقم المكتب إلكم." onBack={() => setVerifying(false)} onDone={() => { setVerified(phone); setVerifying(false); setStep(2); showToast('تأكد الرقم ✓'); }} />;
  }

  return (
    <div className="screen gray">
      <TopBar title="سجّل مكتبك" sub={`الخطوة ${step} من 2 · ${step === 1 ? 'معلومات المكتب' : 'المستمسكات'}`} onBack={() => { setErr(''); if (step > 1) setStep(1); else back(); }} />
      <div className="scroll pad stack gap10" style={{ paddingBottom: 24 }}>
        {step === 1 ? (
          <>
            <div className="field"><label htmlFor="oname">اسم المكتب</label><input id="oname" className="input" style={{ background: 'var(--card)' }} placeholder="مثلاً: مكتب الرافدين للسفر" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} /></div>
            <div className="field"><label htmlFor="oman">اسم المدير</label><input id="oman" className="input" style={{ background: 'var(--card)' }} value={manager} onChange={(e) => { setManager(e.target.value); setErr(''); }} /></div>
            <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr(''); }} />
            <div className="field"><span className="label">المحافظة</span><CityPicker label="المحافظة" value={city} onChange={setCity} variant="field" /></div>
            <div className="field"><label htmlFor="oaddr">العنوان</label><input id="oaddr" className="input" style={{ background: 'var(--card)' }} placeholder="المنطقة، أقرب نقطة دالة" value={address} onChange={(e) => { setAddress(e.target.value); setErr(''); }} /></div>
            <div className="field"><label htmlFor="ofleet">المركبات (اختياري)</label><input id="ofleet" className="input" style={{ background: 'var(--card)' }} placeholder="مثلاً: 2 باص · 3 كوستر" value={fleet} onChange={(e) => setFleet(e.target.value)} /></div>
            <div className="field"><label htmlFor="opass">كلمة السر</label><input id="opass" type="password" className="input" style={{ background: 'var(--card)' }} value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} /></div>
            <PasswordMeter value={pass} />
          </>
        ) : (
          <>
            <p className="small muted" style={{ margin: 0 }}>صوّر أو ارفع كل مستمسك. الإدارة تراجعها وتفعّل حساب المكتب.</p>
            {OFFICE_DOCS.map(([k, l], i) => (
              <button key={k} className={`doc-row ${docs[k] ? 'done' : ''}`} onClick={() => { setPicking(k); fileRef.current?.click(); }}>
                {docs[k] ? <img src={docs[k]} alt={l} /> : <span className="doc-num num">{i + 1}</span>}
                <span className="grow"><b>{l}</b><span className="tiny" style={{ display: 'block' }}>{docs[k] ? '✓ انرفعت — اضغط حتى تبدّلها' : 'اضغط حتى تصوّر أو ترفع'}</span></span>
                <Icon name={docs[k] ? 'refresh' : 'camera'} size={18} />
              </button>
            ))}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f || !picking) return;
              try { const img = await shrinkImage(f, 480, 300); setDocs((d) => ({ ...d, [picking]: img })); setErr(''); } catch { showToast('ما گدرنا نقرأ الصورة'); }
            }} />
          </>
        )}
        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar"><button className="btn" onClick={next}>{step === 1 ? <>التالي <Icon name="forward" size={18} /></> : 'ارسل الطلب للإدارة'}</button></div>
    </div>
  );
}

export function OfficePending() {
  const { officeSignup, set, reset, go, showToast } = useStore();
  if (!officeSignup) return null;
  const approve = () => {
    set({ officeSignup: { ...officeSignup, status: 'approved' }, agencyInfo: { name: officeSignup.name, phone: formatPhone(officeSignup.phone), email: '', address: `${officeSignup.city}، ${officeSignup.address}`, logo: '' }, role: 'agency' });
    showToast('انفعّل حساب المكتب 🎉');
    reset('agencyHome');
  };
  return (
    <div className="screen">
      <div className="scroll pad stack gap14" style={{ paddingTop: 'calc(28px + var(--safe-top))', paddingBottom: 24 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <span className="forgot-ic" style={{ width: 96, height: 96 }}><Icon name="hotel" size={42} /></span>
          <h1 className="h2">طلب المكتب بانتظار الإدارة</h1>
          <p className="muted" style={{ margin: 0 }}>{officeSignup.name} · نراجع المستمسكات عادةً خلال 24 ساعة، ويوصلكم إشعار.</p>
        </div>
        <div className="card stack gap8">
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">المدير</span><b>{officeSignup.manager}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">الرقم</span><b className="num" dir="ltr">+964 {officeSignup.phone}</b></div>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">العنوان</span><b>{officeSignup.city}، {officeSignup.address}</b></div>
          <div className="doc-thumbs">
            {OFFICE_DOCS.map(([k, l]) => <div key={k} className="doc-thumb">{officeSignup.docs[k] ? <img src={officeSignup.docs[k]} alt={l} /> : null}<span>{l}</span></div>)}
          </div>
        </div>
        <button className="btn soft" onClick={() => go('support', { as: 'agency' })}><Icon name="chat" size={20} /> راسل الدعم</button>
        <div className="demo-note" style={{ margin: 0 }}>
          الإدارة تگدر توافق من تطبيق الإدارة (رقم 0711 111 1111)، أو جرّب الموافقة من هنا.
          <button className="btn sm" style={{ marginTop: 10 }} onClick={approve}>محاكاة: الإدارة وافقت</button>
        </div>
        <button className="link small" onClick={() => { set({ role: null }); reset('login'); }}>تسجيل خروج</button>
      </div>
    </div>
  );
}
