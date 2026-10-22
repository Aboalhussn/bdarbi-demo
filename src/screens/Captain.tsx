import { useRef, useState } from 'react';
import type { VehicleKind } from '../data';
import { Icon } from '../icons';
import { useStore } from '../store';
import { TopBar, openExternal } from '../ui';
import { PASS_RULES, PasswordMeter, shrinkImage } from './Account';
import { PhoneField, phoneError } from './Welcome';

const DOCS: { id: string; title: string; hint: string }[] = [
  { id: 'licenseFront', title: 'إجازة السوق — الوجه', hint: 'الجهة اللي بيها صورتك' },
  { id: 'licenseBack', title: 'إجازة السوق — الظهر', hint: 'الجهة الثانية' },
  { id: 'annual', title: 'سنوية السيارة', hint: 'إجازة تسيير المركبة' },
];

const KINDS: { kind: VehicleKind; seats: number }[] = [
  { kind: 'سيارة', seats: 4 },
  { kind: 'كوستر', seats: 24 },
  { kind: 'باص', seats: 40 },
  { kind: 'VIP', seats: 32 },
];
const COLORS = ['أبيض', 'أسود', 'فضي', 'رمادي', 'أزرق', 'أحمر'];

function DocTile({ title, hint, value, onPick }: { title: string; hint: string; value?: string; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button className={`doc-tile ${value ? 'done' : ''}`} onClick={() => ref.current?.click()}>
      {value ? <img src={value} alt={title} /> : <span className="doc-ic"><Icon name="camera" size={26} /></span>}
      <span className="doc-text">
        <b>{title}</b>
        <span className="tiny">{value ? 'انرفعت ✓ — اضغط حتى تبدّلها' : hint}</span>
      </span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
    </button>
  );
}

export function CaptainRegister() {
  const { set, reset, back, showToast } = useStore();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  // step 1
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  // step 2
  const [kind, setKind] = useState<VehicleKind>('سيارة');
  const [seats, setSeats] = useState(4);
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('أبيض');
  // step 3
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);

  const STEPS = ['معلوماتك', 'المركبة', 'المستمسكات'];
  const strong = PASS_RULES.every(([, f]) => f(pass));

  const next = () => {
    if (step === 1) {
      if (name.trim().split(/\s+/).length < 2) return setErr('اكتب اسمك الثلاثي');
      const pe = phoneError(phone);
      if (pe) return setErr(pe);
      if (!strong) return setErr('الرمز لازم يكون قوي (4 خطوط خضر)');
      if (pass !== pass2) return setErr('الرمزين مو نفس الشي');
    }
    if (step === 2) {
      if (model.trim().length < 2) return setErr('اكتب نوع وموديل المركبة');
      if (!/^(19|20)\d{2}$/.test(year) || Number(year) > new Date().getFullYear() + 1) return setErr('سنة الصنع مو صحيحة');
      if (plate.trim().length < 4) return setErr('اكتب رقم اللوحة');
    }
    if (step === 3) {
      const missing = DOCS.filter((d) => !docs[d.id]);
      if (missing.length) return setErr(`باقي: ${missing.map((d) => d.title).join('، ')}`);
      if (!agree) return setErr('لازم تأكد إن المعلومات والمستمسكات صحيحة');
      set({
        captain: {
          name: name.trim(),
          phone,
          status: 'pending',
          submittedAt: Date.now(),
          vehicle: { kind, seats, model: model.trim(), year, plate: plate.trim(), color },
          docs,
        },
        role: null,
      });
      showToast('انرسل طلبك للإدارة ✓');
      reset('captainPending');
      return;
    }
    setErr('');
    setStep(step + 1);
  };

  const pick = async (id: string, f: File) => {
    try {
      const img = await shrinkImage(f);
      setDocs((d) => ({ ...d, [id]: img }));
      setErr('');
    } catch {
      showToast('ما گدرنا نقرأ الصورة، جرّب مرة ثانية');
    }
  };

  return (
    <div className="screen">
      <TopBar title="سجّل ككابتن" sub={`الخطوة ${step} من 3 · ${STEPS[step - 1]}`} onBack={() => { setErr(''); if (step > 1) setStep(step - 1); else back(); }} />
      <div className="steps pad">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''}`}>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="scroll pad stack gap12" style={{ paddingTop: 14, paddingBottom: 20 }}>
        {step === 1 ? (
          <>
            <div className="card row gap12" style={{ background: '#EEEDF8', border: 0 }}>
              <img src="./img/driver.png" alt="" style={{ height: 70 }} />
              <div className="small" style={{ lineHeight: 1.7 }}>اشتغل ويا <b>كابتن بدربي</b>: انشر رحلاتك، واستلم حجوزات، وامسح تذاكر الركاب من تلفونك.</div>
            </div>
            <div className="field">
              <label htmlFor="cname">الاسم الثلاثي</label>
              <input id="cname" className="input" value={name} placeholder="مثل ما مكتوب بإجازة السوق" onChange={(e) => { setName(e.target.value); setErr(''); }} />
            </div>
            <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr(''); }} />
            <div className="field">
              <label htmlFor="cpass">الرمز</label>
              <input id="cpass" type="password" dir="ltr" className="input" value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} />
            </div>
            <PasswordMeter value={pass} />
            <div className="field">
              <label htmlFor="cpass2">أكّد الرمز</label>
              <input id="cpass2" type="password" dir="ltr" className={`input ${pass2 && pass2 !== pass ? 'bad' : ''}`} value={pass2} onChange={(e) => { setPass2(e.target.value); setErr(''); }} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <span className="label">نوع المركبة</span>
            <div className="seg">
              {KINDS.map((k) => (
                <button key={k.kind} className={kind === k.kind ? 'on' : ''} onClick={() => { setKind(k.kind); setSeats(k.seats); }}>{k.kind}</button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label">عدد مقاعد الركاب</span>
              <div className="row gap12">
                <button className="iconbtn" aria-label="أقل" onClick={() => setSeats(Math.max(1, seats - 1))}>−</button>
                <span className="num bold" style={{ fontSize: 20, minWidth: 26, textAlign: 'center' }}>{seats}</span>
                <button className="iconbtn" aria-label="أكثر" onClick={() => setSeats(Math.min(50, seats + 1))}>+</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="cmodel">النوع والموديل</label>
              <input id="cmodel" className="input" value={model} placeholder="مثلاً: تويوتا كامري" onChange={(e) => { setModel(e.target.value); setErr(''); }} />
            </div>
            <div className="row gap10">
              <div className="field grow">
                <label htmlFor="cyear">سنة الصنع</label>
                <input id="cyear" className="input num" inputMode="numeric" dir="ltr" maxLength={4} value={year} placeholder="2020" onChange={(e) => { setYear(e.target.value.replace(/\D/g, '')); setErr(''); }} />
              </div>
              <div className="field grow">
                <label htmlFor="cplate">رقم اللوحة</label>
                <input id="cplate" className="input" value={plate} placeholder="بغداد 12345 أ" onChange={(e) => { setPlate(e.target.value); setErr(''); }} />
              </div>
            </div>
            <span className="label">اللون</span>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button key={c} className={`chip ${color === c ? 'on' : ''}`} style={{ height: 38, fontSize: 13 }} onClick={() => setColor(c)}>{c}</button>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="small muted" style={{ margin: 0, lineHeight: 1.8 }}>صوّر المستمسكات بمكان منوّر، وخلي كل الكتابة واضحة. الإدارة تراجعها قبل ما يتفعّل حسابك.</p>
            {DOCS.map((d) => (
              <DocTile key={d.id} title={d.title} hint={d.hint} value={docs[d.id]} onPick={(f) => void pick(d.id, f)} />
            ))}
            <button className="row gap10" style={{ textAlign: 'right', padding: '6px 0' }} onClick={() => { setAgree(!agree); setErr(''); }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid var(--navy)', background: agree ? 'var(--navy)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {agree && <Icon name="check" size={16} stroke={3} />}
              </span>
              <span className="small">أأكد إن المعلومات والمستمسكات صحيحة وتعود إلي</span>
            </button>
          </>
        ) : null}

        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar">
        <button className="btn" onClick={next}>
          {step < 3 ? <>التالي <Icon name="forward" size={18} /></> : 'إرسال الطلب للإدارة'}
        </button>
      </div>
    </div>
  );
}

export function CaptainPending() {
  const { captain, set, reset, showToast } = useStore();
  if (!captain) return null;
  const sent = new Date(captain.submittedAt);
  const sentAt = `${sent.getDate()}/${sent.getMonth() + 1} · ${sent.getHours() % 12 || 12}:${String(sent.getMinutes()).padStart(2, '0')} ${sent.getHours() < 12 ? 'ص' : 'م'}`;
  const steps: [string, string, 'done' | 'cur' | 'next'][] = [
    ['انرسل الطلب', sentAt, 'done'],
    ['مراجعة المستمسكات', 'الإدارة تتأكد من إجازة السوق والسنوية', 'cur'],
    ['تفعيل الحساب', 'يوصلك إشعار أول ما ينقبل طلبك', 'next'],
  ];
  return (
    <div className="screen">
      <div className="scroll pad stack gap14" style={{ paddingTop: 'calc(28px + var(--safe-top))', paddingBottom: 24 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <div className="pending-ring"><img src="./img/driver.png" alt="" /></div>
          <h1 className="h2">طلبك بانتظار موافقة الإدارة</h1>
          <p className="muted" style={{ margin: 0 }}>هلا {captain.name.split(' ')[0]}! نراجع طلبك عادةً خلال 24 ساعة.</p>
        </div>
        <div className="card stack" style={{ gap: 0 }}>
          {steps.map(([t, sub, st], i) => (
            <div key={t} className={`tl ${st}`}>
              <span className="tl-dot">{st === 'done' ? <Icon name="check" size={14} stroke={3} /> : st === 'cur' ? <span className="tl-spin" /> : null}</span>
              <div className="grow" style={{ paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                <b>{t}</b>
                <div className="tiny muted">{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card stack gap8">
          <b>اللي رفعته</b>
          <div className="small muted">{captain.vehicle.kind} {captain.vehicle.model} · {captain.vehicle.year} · {captain.vehicle.seats} مقعد · {captain.vehicle.plate}</div>
          <div className="row gap8">
            {DOCS.map((d) => (
              <div key={d.id} className="doc-thumb">
                {captain.docs[d.id] ? <img src={captain.docs[d.id]} alt={d.title} /> : null}
                <span>{d.title.replace('إجازة السوق — ', 'الإجازة ')}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn soft" onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent('هلا، سجّلت ككابتن ببدربي وأريد أستفسر عن طلبي.')}`)}>
          <Icon name="whatsapp" size={20} /> تواصل ويا الدعم
        </button>
        <div className="demo-note" style={{ margin: 0 }}>
          نسخة تجريبية: ما اكو إدارة حقيقية، فتكدر تجرّب الموافقة من هنا.
          <button
            className="btn sm"
            style={{ marginTop: 10 }}
            onClick={() => {
              set({ captain: { ...captain, status: 'approved' }, role: 'driver' });
              showToast('انقبل طلبك! هلا بيك كابتن 🎉');
              reset('driverHome');
            }}
          >
            محاكاة: الإدارة وافقت
          </button>
        </div>
        <button className="link small" onClick={() => { set({ role: null }); reset('login'); }}>تسجيل خروج</button>
      </div>
    </div>
  );
}
