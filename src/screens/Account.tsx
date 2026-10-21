import { useRef, useState } from 'react';
import { longDate, money } from '../data';
import { Icon, Logo } from '../icons';
import { tripOf, useStore } from '../store';
import { Sheet, TopBar } from '../ui';
import { PhoneField, phoneError } from './Welcome';

/** Round profile picture: the user's photo, or the mascot when there is none. */
export function Avatar({ size = 60, src }: { size?: number; src?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--lavender)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      {src ? (
        <img src={src} alt="صورتك" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <img src="./img/mascot.png" alt="" style={{ position: 'absolute', top: size * 0.06, left: size * 0.12, width: size * 0.76 }} />
      )}
    </div>
  );
}

function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const size = 320;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PersonalInfo() {
  const store = useStore();
  const { set, back, showToast } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(store.avatar);
  const [name, setName] = useState(store.name === 'ضيف' ? '' : store.name);
  const [phone, setPhone] = useState(store.phone);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [photoSheet, setPhotoSheet] = useState(false);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    try {
      setAvatar(await shrinkImage(f));
    } catch {
      showToast('ما گدرنا نقرأ الصورة، جرّب صورة ثانية');
    }
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'اكتب اسمك';
    const pe = phoneError(phone);
    if (pe) e.phone = pe;
    if (pass || pass2) {
      if (pass.length < 4) e.pass = 'الرمز 4 أحرف أو أكثر';
      else if (pass !== pass2) e.pass2 = 'الرمزين مو نفس الشي';
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    set({ avatar, name: name.trim(), phone, ...(pass ? { password: pass } : {}) });
    showToast('انحفظت معلوماتك ✓');
    back();
  };

  return (
    <div className="screen">
      <TopBar title="معلوماتك الشخصية" />
      <div className="scroll pad stack gap6" style={{ paddingBottom: 20 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 10, margin: '6px 0 14px' }}>
          <button onClick={() => setPhotoSheet(true)} aria-label="غيّر الصورة" style={{ position: 'relative' }}>
            <Avatar size={112} src={avatar} />
            <span style={{ position: 'absolute', bottom: 2, left: 2, width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', color: '#fff', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={17} />
            </span>
          </button>
          <button className="link small" onClick={() => setPhotoSheet(true)}>{avatar ? 'غيّر الصورة' : 'أضف صورة'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <div className="field">
          <label htmlFor="iname">الاسم</label>
          <input id="iname" className={`input ${errs.name ? 'bad' : ''}`} value={name} placeholder="اسمك الكامل" onChange={(e) => setName(e.target.value)} />
          <div className="err">{errs.name}</div>
        </div>
        <PhoneField value={phone} onChange={setPhone} error={errs.phone} />

        <div className="card flat stack gap6" style={{ marginTop: 4 }}>
          <div className="row gap8"><Icon name="lock" size={18} /><b>تغيير الرمز</b></div>
          <div className="tiny muted">اتركه فارغ إذا ما تريد تغيّره.</div>
          <div className="field" style={{ marginTop: 6 }}>
            <label htmlFor="ipass">الرمز الجديد</label>
            <input id="ipass" type="password" className={`input ${errs.pass ? 'bad' : ''}`} style={{ background: '#fff' }} value={pass} placeholder="••••••" onChange={(e) => setPass(e.target.value)} />
            <div className="err">{errs.pass}</div>
          </div>
          <div className="field">
            <label htmlFor="ipass2">أكّد الرمز</label>
            <input id="ipass2" type="password" className={`input ${errs.pass2 ? 'bad' : ''}`} style={{ background: '#fff' }} value={pass2} placeholder="••••••" onChange={(e) => setPass2(e.target.value)} />
            <div className="err">{errs.pass2}</div>
          </div>
        </div>
      </div>
      <div className="bottombar">
        <button className="btn" onClick={save}>حفظ</button>
      </div>
      <Sheet open={photoSheet} onClose={() => setPhotoSheet(false)} label="الصورة الشخصية">
        <div className="stack gap10">
          <h2 className="h3">الصورة الشخصية</h2>
          <button className="btn soft" onClick={() => { setPhotoSheet(false); fileRef.current?.click(); }}><Icon name="camera" size={20} /> اختار صورة</button>
          {avatar ? <button className="btn soft" style={{ color: 'var(--alert)' }} onClick={() => { setAvatar(''); setPhotoSheet(false); }}><Icon name="x" size={20} /> شيل الصورة</button> : null}
        </div>
      </Sheet>
    </div>
  );
}

function cardBrand(digits: string) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^6/.test(digits)) return 'Qi Card';
  return 'بطاقة';
}

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function CardVisual({ first4, holder, expiry, brand }: { first4: string; holder: string; expiry: string; brand: string }) {
  return (
    <div className="bank-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row gap8"><Logo size={30} /><b style={{ fontFamily: 'var(--display)' }}>بدربي</b></div>
        <span className="bold" style={{ fontSize: 14, opacity: 0.9 }}>{brand}</span>
      </div>
      <div className="chip-gold" />
      <div className="card-num num">{first4} •••• •••• ••••</div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="tiny" style={{ opacity: 0.7 }}>اسم حامل البطاقة</div>
          <div className="bold" dir="ltr" style={{ textAlign: 'right' }}>{holder || 'YOUR NAME'}</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div className="tiny" style={{ opacity: 0.7 }}>تنتهي</div>
          <div className="num bold">{expiry || 'MM/YY'}</div>
        </div>
      </div>
    </div>
  );
}

export function Wallet() {
  const { card, set, bookings, go, showToast } = useStore();
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState(false);
  const [num, setNum] = useState('');
  const [holder, setHolder] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  const digits = num.replace(/\D/g, '');
  const fmtNum = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (digits.length !== 16 || !luhn(digits)) e.num = 'رقم البطاقة مو صحيح (16 رقم)';
    if (holder.trim().length < 3) e.holder = 'اكتب الاسم مثل ما مكتوب على البطاقة';
    const [mm, yy] = exp.split('/').map(Number);
    const now = new Date();
    const expired = !mm || !yy || mm < 1 || mm > 12 || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1);
    if (expired) e.exp = 'تاريخ الانتهاء مو صحيح';
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = 'CVV من 3 أرقام';
    setErrs(e);
    if (Object.keys(e).length) return;
    set({ card: { first4: digits.slice(0, 4), holder: holder.trim().toUpperCase(), expiry: exp, brand: cardBrand(digits), addedAt: Date.now() } });
    setAdding(false);
    setNum('');
    setCvv('');
    showToast('انضافت البطاقة ✓');
  };

  // Every booking is a payment; a cancelled one also shows its refund.
  const ops = bookings
    .flatMap((b) => {
      const t = tripOf(b);
      const pay = { id: b.code + 'p', title: `حجز ${t.from} ← ${t.to}`, sub: `${longDate(b.date)} · ${b.pay}`, amount: -b.total, at: b.createdAt };
      if (b.status !== 'cancelled') return [pay];
      return [pay, { id: b.code + 'r', title: `استرجاع ${t.from} ← ${t.to}`, sub: b.pay.startsWith('نقد') ? 'ما انخصم شي (نقداً)' : `رجع لـ ${b.pay}`, amount: b.pay.startsWith('نقد') ? 0 : b.total, at: b.createdAt + 1 }];
    })
    .sort((a, b) => b.at - a.at);
  const spent = bookings.filter((b) => b.status === 'confirmed').reduce((n, b) => n + b.total, 0);

  return (
    <div className="screen">
      <TopBar title="المحفظة" />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 30 }}>
        {card ? (
          <>
            <CardVisual {...card} />
            <div className="row gap10">
              <button className="btn soft sm grow" onClick={() => setAdding(true)}><Icon name="edit" size={18} /> بدّل البطاقة</button>
              <button className="btn soft sm grow" style={{ color: 'var(--alert)' }} onClick={() => setRemove(true)}><Icon name="x" size={18} /> احذف</button>
            </div>
          </>
        ) : (
          <button className="add-card" onClick={() => setAdding(true)}>
            <span className="df-ic" style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name="plus" size={26} /></span>
            <b style={{ fontSize: 17 }}>ضيف بطاقة</b>
            <span className="small muted">ماستر كارد، فيزا أو كي كارد — حتى تدفع أسرع</span>
          </button>
        )}

        <div className="row gap10">
          <div className="card grow center" style={{ padding: '12px 6px' }}>
            <div className="num bold" style={{ fontSize: 18, color: 'var(--navy)' }}>{money(spent)}</div>
            <div className="tiny muted">مجموع اللي دفعته (د.ع)</div>
          </div>
          <div className="card grow center" style={{ padding: '12px 6px' }}>
            <div className="num bold" style={{ fontSize: 18, color: 'var(--navy)' }}>{bookings.length}</div>
            <div className="tiny muted">عملية</div>
          </div>
        </div>

        <h2 className="h3">العمليات</h2>
        {ops.length === 0 ? (
          <div className="card empty">
            <Icon name="wallet" size={34} />
            <b style={{ color: 'var(--ink)' }}>بعد ما سويت أي عملية</b>
            <button className="btn sm" style={{ width: 180 }} onClick={() => go('search')}>احجز رحلة</button>
          </div>
        ) : (
          <div className="card" style={{ padding: '4px 14px' }}>
            {ops.map((o) => (
              <div key={o.id} className="list-item">
                <span className="ic" style={o.amount > 0 ? { background: 'var(--success-bg)', color: 'var(--success)' } : undefined}>
                  <Icon name={o.amount > 0 ? 'arrowDown' : 'arrowUp'} size={20} />
                </span>
                <span className="grow">
                  <span className="bold" style={{ display: 'block' }}>{o.title}</span>
                  <span className="tiny muted">{o.sub}</span>
                </span>
                <span className="num bold" style={{ color: o.amount > 0 ? 'var(--success)' : 'var(--ink)' }}>{o.amount > 0 ? '+' : o.amount < 0 ? '−' : ''}{money(Math.abs(o.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} label="إضافة بطاقة">
        <div className="stack gap6">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 className="h3">{card ? 'بدّل البطاقة' : 'ضيف بطاقة'}</h2>
            <button
              className="pill gold"
              style={{ height: 34, padding: '0 14px' }}
              onClick={() => {
                const y = (new Date().getFullYear() + 3) % 100;
                setNum('4111 1111 1111 1111');
                setHolder('ALI HASSAN');
                setExp(`12/${String(y).padStart(2, '0')}`);
                setCvv('123');
                setErrs({});
              }}
            >
              <Icon name="card" size={16} />&nbsp;بطاقة تجريبية
            </button>
          </div>
          <CardVisual first4={digits.slice(0, 4).padEnd(4, '•')} holder={holder.toUpperCase()} expiry={exp} brand={cardBrand(digits)} />
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="cnum">رقم البطاقة</label>
            <input id="cnum" className={`input num ${errs.num ? 'bad' : ''}`} inputMode="numeric" dir="ltr" style={{ textAlign: 'left', letterSpacing: 1.5 }} placeholder="0000 0000 0000 0000" value={num} onChange={(e) => setNum(fmtNum(e.target.value))} />
            <div className="err">{errs.num}</div>
          </div>
          <div className="field">
            <label htmlFor="chold">الاسم على البطاقة</label>
            <input id="chold" className={`input ${errs.holder ? 'bad' : ''}`} dir="ltr" style={{ textAlign: 'left', textTransform: 'uppercase' }} placeholder="ALI HASSAN" value={holder} onChange={(e) => setHolder(e.target.value.replace(/[^A-Za-z ]/g, ''))} />
            <div className="err">{errs.holder}</div>
          </div>
          <div className="row gap10" style={{ alignItems: 'flex-start' }}>
            <div className="field grow">
              <label htmlFor="cexp">تنتهي</label>
              <input id="cexp" className={`input num ${errs.exp ? 'bad' : ''}`} inputMode="numeric" dir="ltr" style={{ textAlign: 'left' }} placeholder="MM/YY" value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} />
              <div className="err">{errs.exp}</div>
            </div>
            <div className="field grow">
              <label htmlFor="ccvv">CVV</label>
              <input id="ccvv" type="password" className={`input num ${errs.cvv ? 'bad' : ''}`} inputMode="numeric" dir="ltr" style={{ textAlign: 'left' }} placeholder="•••" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} />
              <div className="err">{errs.cvv}</div>
            </div>
          </div>
          <div className="tiny muted row gap6"><Icon name="lock" size={14} /> نحفظ أول 4 أرقام بس. ما نحفظ باقي الرقم ولا الـ CVV.</div>
          <button className="btn" style={{ marginTop: 8 }} onClick={save}>حفظ البطاقة</button>
        </div>
      </Sheet>

      <Sheet open={remove} onClose={() => setRemove(false)} label="حذف البطاقة">
        <div className="stack gap12">
          <h2 className="h2">نحذف البطاقة؟</h2>
          <button className="btn" style={{ background: 'var(--alert)' }} onClick={() => { set({ card: null }); setRemove(false); showToast('انحذفت البطاقة'); }}>إي، احذفها</button>
          <button className="btn soft" onClick={() => setRemove(false)}>لا</button>
        </div>
      </Sheet>
    </div>
  );
}
