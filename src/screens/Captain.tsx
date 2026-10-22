import { useEffect, useRef, useState } from 'react';
import type { VehicleKind } from '../data';
import { Icon } from '../icons';
import { useStore } from '../store';
import { Sheet, TopBar, openExternal } from '../ui';
import { PASS_RULES, PasswordMeter, shrinkImage } from './Account';
import { PhoneField, phoneError } from './Welcome';

// ---------------------------------------------------------------------------
// Documents are scanned one after the other, front then back.
// ---------------------------------------------------------------------------
type DocId = 'licenseFront' | 'licenseBack' | 'annualFront' | 'annualBack';
const DOCS: { id: DocId; title: string; short: string; aim: string }[] = [
  { id: 'licenseFront', title: 'إجازة السوق — الوجه', short: 'الإجازة · وجه', aim: 'حط وجه إجازة السوق (الجهة اللي بيها صورتك) داخل الإطار' },
  { id: 'licenseBack', title: 'إجازة السوق — الظهر', short: 'الإجازة · ظهر', aim: 'هسه اقلب الإجازة وصوّر الظهر' },
  { id: 'annualFront', title: 'السنوية — الوجه', short: 'السنوية · وجه', aim: 'هسه حط وجه سنوية السيارة داخل الإطار' },
  { id: 'annualBack', title: 'السنوية — الظهر', short: 'السنوية · ظهر', aim: 'آخر وحدة: اقلب السنوية وصوّر الظهر' },
];

const KINDS: { kind: VehicleKind; seats: number; max: number }[] = [
  { kind: 'سيارة', seats: 4, max: 4 },
  { kind: 'GMC', seats: 7, max: 7 },
  { kind: 'كوستر', seats: 14, max: 18 },
  { kind: 'باص', seats: 40, max: 50 },
];
const COLORS: [string, string][] = [['أبيض', '#FFFFFF'], ['أسود', '#1A1A1A'], ['فضي', '#C3C6CC'], ['أحمر', '#B8323F'], ['أزرق', '#2A4FA0'], ['ذهبي', '#C9A24A']];
const PROVINCES = ['بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'بابل', 'السليمانية', 'ديالى', 'الأنبار', 'كركوك', 'ذي قار', 'واسط', 'ميسان', 'القادسية', 'المثنى', 'صلاح الدين', 'دهوك'];
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر'];
const YEAR_MIN = 1990;
const YEAR_MAX = new Date().getFullYear() + 1;

interface Draft {
  name: string;
  phone: string;
  kind: VehicleKind;
  model: string;
  year: string;
  color: string;
  province: string;
  letter: string;
  number: string;
  seats: number;
}

/** What the app "reads" off each document. In this demo it is filled from what the captain typed. */
function readDoc(id: DocId, d: Draft): [string, string][] {
  const seed = (d.phone.replace(/\D/g, '') || '7700000000').slice(-6);
  const exp = (y: number) => `${String((Number(seed.slice(0, 2)) % 12) + 1).padStart(2, '0')}/${new Date().getFullYear() + y}`;
  switch (id) {
    case 'licenseFront':
      return [['الاسم', d.name || '—'], ['رقم الإجازة', `IQ-${seed}`], ['الصنف', d.kind === 'سيارة' ? 'خصوصي / أجرة' : 'عمومي'], ['تنتهي', exp(4)]];
    case 'licenseBack':
      return [['جهة الإصدار', 'مديرية المرور العامة'], ['الفئات المسموحة', d.kind === 'باص' || d.kind === 'كوستر' ? 'حافلات ركاب' : 'سيارات صالون'], ['فصيلة الدم', 'O+']];
    case 'annualFront':
      return [['رقم اللوحة', `${d.province} ${d.number} ${d.letter}`], ['المركبة', d.model || '—'], ['سنة الصنع', d.year || '—'], ['اللون', d.color]];
    default:
      return [['رقم الشاصي', `JTD${seed}${d.year.slice(-2) || '20'}K${seed.slice(0, 3)}`], ['تنتهي السنوية', exp(1)], ['عدد الركاب', String(d.seats)]];
  }
}

/** Full-screen document scanner: live camera with a card-shaped frame, or a photo from the gallery. */
function DocScanner({ doc, index, onShot, onClose }: { doc: (typeof DOCS)[number]; index: number; onShot: (img: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<'starting' | 'on' | 'off'>('starting');
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setCam('off');
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => undefined);
        }
        setCam('on');
      } catch {
        setCam('off');
      }
    })();
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [doc.id]);

  const capture = () => {
    const v = videoRef.current;
    const f = frameRef.current;
    if (!v || !f || !v.videoWidth) return;
    // Crop the video to the frame the user lined the card up with.
    const vb = v.getBoundingClientRect();
    const fb = f.getBoundingClientRect();
    const scale = Math.max(vb.width / v.videoWidth, vb.height / v.videoHeight);
    const offX = (v.videoWidth * scale - vb.width) / 2;
    const offY = (v.videoHeight * scale - vb.height) / 2;
    const sx = (fb.left - vb.left + offX) / scale;
    const sy = (fb.top - vb.top + offY) / scale;
    const sw = fb.width / scale;
    const sh = fb.height / scale;
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = Math.round((640 * sh) / sw);
    c.getContext('2d')!.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
    if (navigator.vibrate) navigator.vibrate(40);
    onShot(c.toDataURL('image/jpeg', 0.82));
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    try {
      await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      /* no torch on this camera */
    }
  };

  return (
    <div className="doc-scan">
      <video ref={videoRef} playsInline muted />
      <div className="ds-top">
        <button className="iconbtn" aria-label="سدّ" onClick={onClose} style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}><Icon name="x" size={20} /></button>
        <div className="ds-count num">{index + 1} / {DOCS.length}</div>
        <button className="iconbtn" aria-label="الفلاش" onClick={() => void toggleTorch()} style={{ background: torch ? 'var(--gold)' : 'rgba(255,255,255,.16)', color: torch ? '#2A1A00' : '#fff' }}><Icon name="flash" size={20} /></button>
      </div>
      <div className="ds-title">
        <b>{doc.title}</b>
        <span>{doc.aim}</span>
      </div>
      <div ref={frameRef} className="ds-frame">
        <i className="c1" /><i className="c2" /><i className="c3" /><i className="c4" />
        {cam !== 'on' ? <div className="ds-nocam">{cam === 'starting' ? 'جاري تشغيل الكاميرا…' : 'الكاميرا مو متوفرة — اختار صورة من المعرض'}</div> : <div className="ds-laser" />}
      </div>
      <div className="ds-tip">خلي الإجازة على سطح غامق، بمكان منوّر، وبدون لمعة</div>
      <div className="ds-bottom">
        <button className="ds-side" onClick={() => fileRef.current?.click()}><Icon name="list" size={20} /><span>المعرض</span></button>
        <button className="ds-shutter" aria-label="صوّر" disabled={cam !== 'on'} onClick={capture}><span /></button>
        <span className="ds-side" />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onShot(await shrinkImage(file, 640, 404));
          }}
        />
      </div>
    </div>
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
  // step 2 (same as the design board "سجّل سيارتك")
  const [kind, setKind] = useState<VehicleKind>('كوستر');
  const [seats, setSeats] = useState(14);
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('أبيض');
  const [province, setProvince] = useState('بغداد');
  const [letter, setLetter] = useState('أ');
  const [number, setNumber] = useState('');
  const [plateSheet, setPlateSheet] = useState<'' | 'province' | 'letter'>('');
  // step 3
  const [docs, setDocs] = useState<Partial<Record<DocId, string>>>({});
  const [info, setInfo] = useState<Partial<Record<DocId, [string, string][]>>>({});
  const [scanning, setScanning] = useState<number | null>(null);
  const [reading, setReading] = useState<{ index: number; img: string } | null>(null);
  const [result, setResult] = useState<{ index: number; img: string; fields: [string, string][] } | null>(null);
  const [agree, setAgree] = useState(false);

  const STEPS = ['معلوماتك', 'سيارتك', 'المستمسكات'];
  const strong = PASS_RULES.every(([, f]) => f(pass));
  const max = KINDS.find((k) => k.kind === kind)!.max;
  const yearDone = year.length === 4;
  const yearOk = yearDone && Number(year) >= YEAR_MIN && Number(year) <= YEAR_MAX;
  const draft: Draft = { name: name.trim(), phone, kind, model: model.trim(), year, color, province, letter, number, seats };
  const nextDoc = DOCS.findIndex((d) => !docs[d.id]);
  const allDocs = nextDoc === -1;

  // "Reading" a document after it is captured.
  useEffect(() => {
    if (!reading) return;
    const t = window.setTimeout(() => {
      setResult({ index: reading.index, img: reading.img, fields: readDoc(DOCS[reading.index].id, draft) });
      setReading(null);
    }, 1600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading]);

  const acceptResult = () => {
    if (!result) return;
    const id = DOCS[result.index].id;
    setDocs((d) => ({ ...d, [id]: result.img }));
    setInfo((x) => ({ ...x, [id]: result.fields }));
    const following = DOCS.findIndex((d, i) => i > result.index && !docs[d.id]);
    setResult(null);
    setErr('');
    if (following !== -1) setScanning(following); // straight on to the next side
  };

  const next = () => {
    if (step === 1) {
      if (name.trim().split(/\s+/).length < 3) return setErr('اكتب اسمك الثلاثي');
      const pe = phoneError(phone);
      if (pe) return setErr(pe);
      if (!strong) return setErr('الرمز لازم يكون قوي (4 خطوط خضر)');
      if (pass !== pass2) return setErr('الرمزين مو نفس الشي');
    }
    if (step === 2) {
      if (model.trim().length < 2) return setErr('اكتب اسم السيارة والموديل');
      if (!yearOk) return setErr(`سنة الإصدار لازم تكون بين ${YEAR_MIN} و ${YEAR_MAX}`);
      if (number.length < 3) return setErr('اكتب رقم اللوحة');
    }
    if (step === 3) {
      if (!allDocs) return setErr(`باقي تصوّر: ${DOCS.filter((d) => !docs[d.id]).map((d) => d.title).join('، ')}`);
      if (!agree) return setErr('لازم تأكد إن المعلومات صحيحة');
      set({
        captain: {
          name: name.trim(),
          phone,
          status: 'pending',
          submittedAt: Date.now(),
          vehicle: { kind, seats, model: model.trim(), year, plate: `${province} ${number} ${letter}`, color },
          docs: docs as Record<string, string>,
          docInfo: info as Record<string, [string, string][]>,
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

  return (
    <div className="screen gray">
      <TopBar title={step === 2 ? 'سجّل سيارتك' : 'سجّل ككابتن'} sub={`الخطوة ${step} من 3 · ${STEPS[step - 1]}`} onBack={() => { setErr(''); if (step > 1) setStep(step - 1); else back(); }} />
      <div className="steps pad">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''}`}>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="scroll pad stack gap14" style={{ paddingTop: 14, paddingBottom: 20 }}>
        {step === 1 ? (
          <>
            <div className="card row gap12" style={{ background: '#EEEDF8', border: 0 }}>
              <img src="./img/driver.png" alt="" style={{ height: 70 }} />
              <div className="small" style={{ lineHeight: 1.7 }}>اشتغل ويا <b>كابتن بدربي</b>: انشر رحلاتك، واستلم حجوزات، وامسح تذاكر الركاب من تلفونك.</div>
            </div>
            <div className="field">
              <label htmlFor="cname">الاسم الثلاثي</label>
              <input id="cname" className="input" style={{ background: '#fff' }} value={name} placeholder="مثل ما مكتوب بإجازة السوق" onChange={(e) => { setName(e.target.value); setErr(''); }} />
            </div>
            <PhoneField value={phone} onChange={(v) => { setPhone(v); setErr(''); }} />
            <div className="field">
              <label htmlFor="cpass">الرمز</label>
              <input id="cpass" type="password" dir="ltr" className="input" style={{ background: '#fff' }} value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} />
            </div>
            <PasswordMeter value={pass} />
            <div className="field">
              <label htmlFor="cpass2">أكّد الرمز</label>
              <input id="cpass2" type="password" dir="ltr" className={`input ${pass2 && pass2 !== pass ? 'bad' : ''}`} style={{ background: '#fff' }} value={pass2} onChange={(e) => { setPass2(e.target.value); setErr(''); }} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="small muted" style={{ margin: 0 }}>تنكتب مرة وحدة بس وتتثبت بحسابك، حتى الركاب يعرفون شنو راح يركبون.</p>
            <section>
              <div className="label" style={{ marginBottom: 8 }}>نوع المركبة</div>
              <div className="vk-grid" role="radiogroup" aria-label="نوع المركبة">
                {KINDS.map((k) => (
                  <button key={k.kind} role="radio" aria-checked={kind === k.kind} className={kind === k.kind ? 'on' : ''} onClick={() => { setKind(k.kind); setSeats(k.seats); }}>{k.kind}</button>
                ))}
              </div>
            </section>
            <div className="field">
              <label htmlFor="cmodel">اسم السيارة والموديل</label>
              <input id="cmodel" className="input" style={{ background: '#fff', height: 50, borderRadius: 14 }} value={model} placeholder="مثلاً: تويوتا كوستر" onChange={(e) => { setModel(e.target.value); setErr(''); }} />
            </div>
            <div className="field">
              <label htmlFor="cyear">سنة الإصدار</label>
              <div className={`year-box ${yearDone ? (yearOk ? 'ok' : 'bad') : ''}`}>
                <input
                  id="cyear"
                  inputMode="numeric"
                  maxLength={4}
                  dir="ltr"
                  placeholder="2019"
                  value={year}
                  onChange={(e) => { setYear(e.target.value.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g, '').slice(0, 4)); setErr(''); }}
                />
                <span><Icon name={yearOk ? 'check' : yearDone ? 'info' : 'calendar'} size={20} stroke={yearOk ? 3 : 2} /></span>
              </div>
              <div className="tiny bold" style={{ color: !yearDone ? 'var(--slate)' : yearOk ? 'var(--success)' : '#B23A4C' }}>
                {!year ? 'اكتب السنة بأربع أرقام، مثل 2019' : !yearDone ? 'كمّل السنة (4 أرقام)' : yearOk ? 'تمام' : `السنة لازم تكون بين ${YEAR_MIN} و ${YEAR_MAX}`}
              </div>
            </div>
            <section>
              <div className="label" style={{ marginBottom: 8 }}>اللون · <span className="muted" style={{ fontWeight: 600 }}>{color}</span></div>
              <div className="row gap10" role="radiogroup" aria-label="لون السيارة">
                {COLORS.map(([c, hex]) => (
                  <button key={c} role="radio" aria-checked={color === c} aria-label={c} className={`swatch ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>
                    <span style={{ background: hex }} />
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="label" style={{ marginBottom: 8 }}>رقم اللوحة</div>
              <div className="plate">
                <button className="plate-prov" onClick={() => setPlateSheet('province')} aria-label={`محافظة اللوحة: ${province}`}>{province}<Icon name="arrowDown" size={14} /></button>
                <button className="plate-letter" onClick={() => setPlateSheet('letter')} aria-label={`حرف اللوحة: ${letter}`}>{letter}<Icon name="arrowDown" size={12} /></button>
                <input id="pnum" dir="ltr" inputMode="numeric" maxLength={6} placeholder="12345" aria-label="رقم اللوحة" value={number} onChange={(e) => { setNumber(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }} />
              </div>
            </section>
            <div className="seats-card">
              <div className="grow">
                <div className="bold">عدد مقاعد الركاب</div>
                <div className="tiny muted">بدون مقعد السائق</div>
              </div>
              <button aria-label="أقل" onClick={() => setSeats(Math.max(1, seats - 1))}>−</button>
              <b className="num">{seats}</b>
              <button aria-label="أكثر" className="plus" onClick={() => setSeats(Math.min(max, seats + 1))}>+</button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="card row gap12" style={{ background: '#EEEDF8', border: 0 }}>
              <span className="df-ic" style={{ background: '#fff' }}><Icon name="scan" size={22} /></span>
              <div className="small" style={{ lineHeight: 1.7 }}>راح نصوّر <b>4 صور</b> وحدة ورا الثانية: وجه الإجازة وظهرها، وبعدها وجه السنوية وظهرها. التطبيق يقرأ المعلومات منها وانت تأكدها.</div>
            </div>
            <div className="doc-list">
              {DOCS.map((d, i) => (
                <button key={d.id} className={`doc-row ${docs[d.id] ? 'done' : i === nextDoc ? 'cur' : ''}`} onClick={() => setScanning(i)}>
                  {docs[d.id] ? <img src={docs[d.id]} alt={d.title} /> : <span className="doc-num num">{i + 1}</span>}
                  <span className="grow">
                    <b>{d.title}</b>
                    <span className="tiny" style={{ display: 'block' }}>
                      {docs[d.id] ? `✓ ${(info[d.id] ?? [])[0]?.[1] ?? 'انقرت'} — اضغط حتى تعيدها` : i === nextDoc ? 'الجاية' : 'بالانتظار'}
                    </span>
                  </span>
                  <Icon name={docs[d.id] ? 'refresh' : 'scan'} size={18} />
                </button>
              ))}
            </div>
            {allDocs ? (
              <button className="row gap10" style={{ textAlign: 'right', padding: '6px 0' }} onClick={() => { setAgree(!agree); setErr(''); }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid var(--navy)', background: agree ? 'var(--navy)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {agree && <Icon name="check" size={16} stroke={3} />}
                </span>
                <span className="small">أأكد إن المعلومات صحيحة. بعد التثبيت ما أكدر أغيّر السيارة إلا عن طريق الدعم.</span>
              </button>
            ) : null}
          </>
        ) : null}

        {err ? <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 600, fontSize: 14 }}>{err}</div> : null}
      </div>
      <div className="bottombar">
        {step === 3 && !allDocs ? (
          <button className="btn" onClick={() => setScanning(nextDoc)}>
            <Icon name="scan" size={20} /> {nextDoc === 0 ? 'ابدأ تصوير المستمسكات' : `كمّل: صوّر ${DOCS[nextDoc].title}`}
          </button>
        ) : (
          <button className="btn" onClick={next}>
            {step < 3 ? <>التالي <Icon name="forward" size={18} /></> : 'تثبيت وإرسال للمراجعة'}
          </button>
        )}
      </div>

      {/* Province and letter pickers for the plate */}
      <Sheet open={plateSheet !== ''} onClose={() => setPlateSheet('')} label={plateSheet === 'province' ? 'محافظة اللوحة' : 'حرف اللوحة'}>
        <h2 className="h3" style={{ marginBottom: 10 }}>{plateSheet === 'province' ? 'محافظة اللوحة' : 'حرف اللوحة'}</h2>
        {plateSheet === 'province' ? (
          <div className="city-grid">
            {PROVINCES.map((p) => (
              <button key={p} className={`city-opt ${p === province ? 'on' : ''}`} style={{ minHeight: 50 }} onClick={() => { setProvince(p); setPlateSheet(''); }}>
                <span className="grow bold" style={{ textAlign: 'right' }}>{p}</span>
                {p === province ? <Icon name="check" size={16} stroke={3} /> : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="letter-grid">
            {LETTERS.map((l) => (
              <button key={l} className={l === letter ? 'on' : ''} onClick={() => { setLetter(l); setPlateSheet(''); }}>{l}</button>
            ))}
          </div>
        )}
      </Sheet>

      {/* Scanner → reading → result, then on to the next side automatically */}
      {scanning !== null && !reading && !result ? (
        <DocScanner
          doc={DOCS[scanning]}
          index={scanning}
          onClose={() => setScanning(null)}
          onShot={(img) => {
            setReading({ index: scanning, img });
            setScanning(null);
          }}
        />
      ) : null}
      {reading ? (
        <div className="doc-read">
          <div className="dr-photo">
            <img src={reading.img} alt="" />
            {/* A gold line runs round the photo's rounded edge while it is being read. */}
            <svg className="dr-trace" viewBox="0 0 100 63" preserveAspectRatio="none" aria-hidden="true">
              <rect x="1" y="1" width="98" height="61" rx="6" ry="6" pathLength="100" />
            </svg>
          </div>
          <b>جاري قراءة {DOCS[reading.index].title}…</b>
          <span className="small muted">لا تسد التطبيق</span>
        </div>
      ) : null}
      <Sheet open={!!result} onClose={() => setResult(null)} label="المعلومات اللي قريناها">
        {result ? (
          <div className="stack gap12">
            <div className="row gap8">
              <span className="pick-check" style={{ background: 'var(--success)' }}><Icon name="check" size={16} stroke={3} /></span>
              <h2 className="h3">قرينا {DOCS[result.index].title}</h2>
            </div>
            <img src={result.img} alt="" className="dr-preview" />
            <div className="read-fields">
              {result.fields.map(([k, v], i) => (
                <label key={k} className="rf-edit">
                  <span className="tiny muted">{k}</span>
                  <input
                    value={v}
                    dir={/^[\x00-\x7F]*$/.test(v) ? 'ltr' : 'rtl'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResult((r) => (r ? { ...r, fields: r.fields.map((f, j) => (j === i ? [f[0], val] : f)) } : r));
                    }}
                  />
                  <Icon name="edit" size={14} />
                </label>
              ))}
            </div>
            <div className="tiny muted">إذا اكو معلومة غلط اضغط عليها وصحّحها. وإذا الصورة مو واضحة صوّرها مرة ثانية.</div>
            <button className="btn" onClick={acceptResult}>
              {result.index < DOCS.length - 1 && !docs[DOCS[result.index + 1].id] ? <>صحيحة — هسه صوّر {DOCS[result.index + 1].title.replace('إجازة السوق', 'الإجازة')}</> : 'صحيحة ✓'}
            </button>
            <button className="btn soft" onClick={() => { const i = result.index; setResult(null); setScanning(i); }}><Icon name="refresh" size={18} /> صوّرها مرة ثانية</button>
          </div>
        ) : null}
      </Sheet>
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
    ['مراجعة المستمسكات', 'الإدارة تتأكد من الإجازة والسنوية', 'cur'],
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
          <div className="small muted">{captain.vehicle.kind} · {captain.vehicle.model} · {captain.vehicle.year} · {captain.vehicle.seats} مقعد · {captain.vehicle.plate}</div>
          <div className="doc-thumbs">
            {DOCS.map((d) => (
              <div key={d.id} className="doc-thumb">
                {captain.docs[d.id] ? <img src={captain.docs[d.id]} alt={d.title} /> : null}
                <span>{d.short}</span>
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
