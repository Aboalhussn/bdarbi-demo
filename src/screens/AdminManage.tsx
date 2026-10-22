import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, GARAGES, todayIso, type Garage } from '../data';
import { audienceLabel, couponLabel, type AdminCoupon } from '../coupons';
import { Icon } from '../icons';
import { CityPicker, DateField, TimeField, addDays, prettyDate } from '../pickers';
import { useStore } from '../store';
import { Sheet } from '../ui';
import { formatPhone } from './Welcome';

const CITY_CENTER: Record<string, [number, number]> = {
  'بغداد': [33.3152, 44.3661], 'البصرة': [30.5085, 47.7804], 'أربيل': [36.1901, 44.0091], 'كربلاء المقدسة': [32.616, 44.0249], 'النجف الأشرف': [31.9996, 44.3148], 'السليمانية': [35.5613, 45.4373],
};

/* ---------------- coupons ---------------- */

export function AdminCoupons({ wide, Head }: { wide: boolean; Head: (p: { wide: boolean; title: string; sub?: string; right?: ReactNode }) => ReactElement }) {
  const { adminCoupons, set, showToast } = useStore();
  const [open, setOpen] = useState(false);
  const blank: AdminCoupon = { code: '', kind: 'percent', value: 10, max: 10000, audience: 'all', minTrips: 10, phones: [], expires: addDays(todayIso(), 30), active: true, createdAt: 0 };
  const [c, setC] = useState<AdminCoupon>(blank);
  const [phones, setPhones] = useState('');
  const [err, setErr] = useState('');
  const up = (p: Partial<AdminCoupon>) => { setC((x) => ({ ...x, ...p })); setErr(''); };
  const save = () => {
    const code = c.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return setErr('الرمز من 4 لـ 12 حرف إنگليزي أو رقم');
    if (adminCoupons.some((x) => x.code === code) || code === 'WELCOME' || code === 'EID2026') return setErr('هذا الرمز موجود');
    if (!c.value || (c.kind === 'percent' && c.value > 90)) return setErr('اكتب قيمة الخصم صح');
    const list = phones.split(/[\s,،]+/).map((p) => formatPhone(p).replace(/\s/g, '')).filter((p) => p.length === 10);
    if (c.audience === 'phones' && !list.length) return setErr('اكتب رقم وحد على الأقل');
    set({ adminCoupons: [{ ...c, code, phones: list, createdAt: Date.now() }, ...adminCoupons] });
    showToast(`انضاف الكوبون ${code} ✓`);
    setOpen(false);
    setC(blank);
    setPhones('');
  };
  const builtIn: [string, string, string][] = [['WELCOME', 'خصم 20% لأول حجز (أعلى شي 10,000)', 'المستخدمين الجدد'], ['EID2026', 'خصم 5,000 د.ع', 'لكل المستخدمين']];
  return (
    <>
      <Head wide={wide} title="الكوبونات" sub="عامة لكل الناس، أو خاصة لمستخدمين محددين" right={<button className="btn sm" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setOpen(true)}><Icon name="plus" size={18} /> كوبون جديد</button>} />
      <div className={wide ? 'adm-cards3' : 'pad stack gap10'}>
        {adminCoupons.map((x) => (
          <div key={x.code} className="coupon-card" style={{ opacity: x.active ? 1 : 0.55 }}>
            <div className="row gap8">
              <b className="code grow" style={{ fontSize: 20, letterSpacing: 2 }}>{x.code}</b>
              <button role="switch" aria-checked={x.active} aria-label={`تفعيل ${x.code}`} className={`switch ${x.active ? 'on' : ''}`} onClick={() => set({ adminCoupons: adminCoupons.map((y) => (y.code === x.code ? { ...y, active: !y.active } : y)) })}><i /></button>
            </div>
            <span className="bold small">{couponLabel(x)}</span>
            <span className="pill info" style={{ alignSelf: 'flex-start' }}>{audienceLabel(x)}</span>
            <span className="tiny muted">{x.expires ? `ينتهي ${prettyDate(x.expires)}` : 'بدون انتهاء'}</span>
          </div>
        ))}
        {builtIn.map(([code, l, a]) => (
          <div key={code} className="coupon-card">
            <b className="code" style={{ fontSize: 20, letterSpacing: 2 }}>{code}</b>
            <span className="bold small">{l}</span>
            <span className="pill info" style={{ alignSelf: 'flex-start' }}>{a}</span>
            <span className="tiny muted">مدمج بالتطبيق</span>
          </div>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} label="كوبون جديد">
        <div className="stack gap10">
          <h2 className="h3">كوبون جديد</h2>
          <div className="row gap8">
            <input className="input grow code" dir="ltr" style={{ textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }} placeholder="CODE" value={c.code} onChange={(e) => up({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) })} />
            <button className="btn soft sm" style={{ width: 'auto', padding: '0 14px' }} onClick={() => up({ code: 'BD' + Math.random().toString(36).slice(2, 7).toUpperCase() })}>ولّد رمز</button>
          </div>
          <div className="seg">
            <button className={c.kind === 'percent' ? 'on' : ''} onClick={() => up({ kind: 'percent', value: 10 })}>نسبة %</button>
            <button className={c.kind === 'amount' ? 'on' : ''} onClick={() => up({ kind: 'amount', value: 5000 })}>مبلغ ثابت</button>
          </div>
          <div className="row gap8">
            <label className="field grow"><span className="tiny muted">{c.kind === 'percent' ? 'النسبة %' : 'المبلغ (د.ع)'}</span><input className="input num" dir="ltr" inputMode="numeric" value={c.value || ''} onChange={(e) => up({ value: Number(e.target.value.replace(/\D/g, '')) })} /></label>
            {c.kind === 'percent' ? <label className="field grow"><span className="tiny muted">أعلى خصم (د.ع)</span><input className="input num" dir="ltr" inputMode="numeric" value={c.max || ''} onChange={(e) => up({ max: Number(e.target.value.replace(/\D/g, '')) })} /></label> : null}
          </div>
          <span className="label">منو يگدر يستخدمه؟</span>
          <div className="stack gap6">
            {([['all', 'كل المستخدمين', 'كوبون عام'], ['new', 'المستخدمين الجدد', 'لأول حجز بس'], ['trips', 'اللي كمّلوا رحلات', 'مثلاً 10 رحلات أو أكثر'], ['phones', 'أرقام محددة', 'تكتب أرقامهم']] as const).map(([k, l, sub]) => (
              <button key={k} role="radio" aria-checked={c.audience === k} className={`radio ${c.audience === k ? 'on' : ''}`} onClick={() => up({ audience: k })}>
                <span className="dot" /><span className="grow"><span className="bold" style={{ display: 'block' }}>{l}</span><span className="tiny muted">{sub}</span></span>
              </button>
            ))}
          </div>
          {c.audience === 'trips' ? <label className="field"><span className="tiny muted">أقل عدد رحلات</span><input className="input num" dir="ltr" inputMode="numeric" value={c.minTrips || ''} onChange={(e) => up({ minTrips: Number(e.target.value.replace(/\D/g, '')) })} /></label> : null}
          {c.audience === 'phones' ? <textarea className="input" rows={3} style={{ height: 'auto', padding: 12 }} dir="ltr" placeholder="07701234567, 07809876543" value={phones} onChange={(e) => { setPhones(e.target.value); setErr(''); }} /> : null}
          <DateField label="ينتهي" value={c.expires} min={todayIso()} onChange={(d) => up({ expires: d })} />
          {err ? <div className="err">{err}</div> : null}
          <button className="btn" onClick={save}>احفظ الكوبون</button>
        </div>
      </Sheet>
    </>
  );
}

/* ---------------- garages ---------------- */

const SERVICES = ['مطعم', 'مصلى', 'حمامات', 'موقف سيارات', 'صراف', 'كافتيريا'];

function PinMap({ city, value, onChange }: { city: string; value: [number, number] | null; onChange: (p: [number, number]) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const icon = L.divIcon({ className: '', html: '<div class="map-pin"></div>', iconSize: [30, 40], iconAnchor: [15, 40] });
  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(CITY_CENTER[city] ?? CITY_CENTER['بغداد'], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 18, subdomains: 'abcd', attribution: '© OpenStreetMap © CARTO' }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChange([Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))]));
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { map.current?.setView(CITY_CENTER[city] ?? CITY_CENTER['بغداد'], 12); }, [city]);
  useEffect(() => {
    if (!map.current || !value) return;
    if (!marker.current) marker.current = L.marker(value, { icon }).addTo(map.current);
    else marker.current.setLatLng(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.[0], value?.[1]]);
  return <div ref={box} className="pin-map" />;
}

export function AdminGarages({ wide, Head }: { wide: boolean; Head: (p: { wide: boolean; title: string; sub?: string; right?: ReactNode }) => ReactElement }) {
  const { extraGarages, set, showToast } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [open, setOpen] = useState('06:00');
  const [close, setClose] = useState('22:00');
  const [services, setServices] = useState<string[]>(['حمامات', 'موقف سيارات']);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [err, setErr] = useState('');
  const save = () => {
    if (name.trim().length < 4) return setErr('اكتب اسم الكراج');
    if (address.trim().length < 4) return setErr('اكتب العنوان');
    if (!pos) return setErr('اضغط على الخريطة وحدد مكان الكراج');
    const g: Garage = { id: 'g' + Date.now(), name: name.trim().startsWith('كراج') ? name.trim() : `كراج ${name.trim()}`, city, address: `${address.trim()}${phone ? ` · ${phone}` : ''}${services.length ? ` · ${services.join('، ')}` : ''}`, lat: pos[0], lng: pos[1], hours: allDay ? '24 ساعة' : `${open} – ${close}` };
    GARAGES.push(g);
    set({ extraGarages: [...extraGarages, g] });
    showToast('انضاف الكراج ✓ يطلع بالتطبيق وبالخرائط');
    setAdding(false);
    setName(''); setAddress(''); setPhone(''); setPos(null);
  };
  if (adding) {
    return (
      <>
        <Head wide={wide} title="كراج جديد" sub="المعلومات تطلع للمسافرين والكباتن" right={wide ? <button className="btn soft sm" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setAdding(false)}>رجوع</button> : undefined} />
        <div className={wide ? 'adm-grid2' : 'pad stack gap10'} style={wide ? { alignItems: 'start' } : undefined}>
          <div className="stack gap10">
            <div className="field"><label htmlFor="gname">اسم الكراج</label><input id="gname" className="input" style={{ background: '#fff' }} placeholder="مثلاً: كراج الكاظمية" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} /></div>
            <div className="field"><span className="label">المحافظة</span><CityPicker label="المحافظة" value={city} onChange={(c) => { setCity(c); setPos(null); }} variant="field" /></div>
            <div className="field"><label htmlFor="gaddr">العنوان</label><input id="gaddr" className="input" style={{ background: '#fff' }} placeholder="المنطقة، أقرب نقطة دالة" value={address} onChange={(e) => { setAddress(e.target.value); setErr(''); }} /></div>
            <div className="field"><label htmlFor="gphone">رقم الكراج (اختياري)</label><input id="gphone" className="input num" dir="ltr" style={{ background: '#fff', textAlign: 'left' }} placeholder="0770 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <span className="label">الدوام</span>
            <div className="seg"><button className={allDay ? 'on' : ''} onClick={() => setAllDay(true)}>24 ساعة</button><button className={!allDay ? 'on' : ''} onClick={() => setAllDay(false)}>أوقات محددة</button></div>
            {!allDay ? <div className="row gap8"><div className="grow"><TimeField label="يفتح" value={open} onChange={setOpen} /></div><div className="grow"><TimeField label="يسد" value={close} onChange={setClose} /></div></div> : null}
            <span className="label">الخدمات</span>
            <div className="row gap6" style={{ flexWrap: 'wrap' }}>
              {SERVICES.map((x) => { const on = services.includes(x); return <button key={x} className={`chip ag-chip ${on ? 'on' : ''}`} style={{ height: 36 }} onClick={() => setServices(on ? services.filter((y) => y !== x) : [...services, x])}>{x}</button>; })}
            </div>
          </div>
          <div className="stack gap10">
            <span className="label">الموقع <span className="muted" style={{ fontWeight: 500 }}>— اضغط على الخريطة</span></span>
            <PinMap city={city} value={pos} onChange={(p) => { setPos(p); setErr(''); }} />
            <div className="tiny muted num" dir="ltr" style={{ textAlign: 'right' }}>{pos ? `${pos[0]}, ${pos[1]}` : 'ما محدد'}</div>
            {err ? <div className="err">{err}</div> : null}
            <button className="btn" onClick={save}>احفظ الكراج</button>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <Head wide={wide} title="الكراجات" sub={`${GARAGES.length} كراج`} right={<button className="btn sm" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setAdding(true)}><Icon name="plus" size={18} /> كراج جديد</button>} />
      <div className={wide ? 'adm-cards3' : 'pad stack gap8'}>
        {GARAGES.map((g) => (
          <div key={g.id} className="adm-item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
            <span className="adm-av light"><Icon name="pin" size={18} /></span>
            <span className="grow"><b style={{ display: 'block' }}>{g.name}</b><span className="tiny muted">{g.city} · {g.address}</span></span>
            <span className="pill info">{g.hours}</span>
          </div>
        ))}
      </div>
    </>
  );
}
