import { useState } from 'react';
import { HOTELS, money, todayIso } from '../data';
import { CityPicker, DateField, RangeField, addDays, nightsBetween, prettyDate, shortDate } from '../pickers';
import { Icon } from '../icons';
import { useStore } from '../store';
import { Sheet, Stars, TopBar, openExternal } from '../ui';

export function Hotels() {
  const { go } = useStore();
  const cities = ['الكل', ...Array.from(new Set(HOTELS.map((h) => h.city)))];
  const [city, setCity] = useState('الكل');
  const list = HOTELS.filter((h) => city === 'الكل' || h.city === city);
  return (
    <div className="screen gray">
      <TopBar title="الفنادق" sub="احجز غرفتك قبل لا توصل" />
      <div className="hscroll" style={{ paddingTop: 0 }}>
        {cities.map((c) => (
          <button key={c} className={`chip ${c === city ? 'on' : ''}`} style={c === city ? undefined : { background: '#fff' }} onClick={() => setCity(c)}>{c}</button>
        ))}
      </div>
      <div className="scroll pad stack gap12" style={{ paddingTop: 12, paddingBottom: 30 }}>
        {list.map((h) => (
          <button key={h.id} className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'right' }} onClick={() => go('hotel', { id: h.id })}>
            <div style={{ height: 150, background: h.tint, position: 'relative' }}>
              <img src="./img/hotel.png" alt="" style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', height: 140, width: 'auto' }} />
              <span className="pill" style={{ position: 'absolute', top: 12, right: 12, background: 'var(--navy)', color: '#fff' }}>★ <span className="num">{h.rating}</span></span>
            </div>
            <div style={{ padding: '12px 16px 14px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="h3">{h.name}</span>
                <span className="small muted">من <b className="num" style={{ color: 'var(--navy)', fontSize: 16 }}>{money(h.from)}</b> د.ع</span>
              </div>
              <div className="small muted row gap6"><Icon name="pin" size={14} /> {h.city} · {h.near}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function HotelDetails() {
  const { route, back } = useStore();
  const h = HOTELS.find((x) => x.id === route.params?.id) ?? HOTELS[0];
  const [room, setRoom] = useState(1);
  const [fav, setFav] = useState(false);
  const [checkIn, setCheckIn] = useState(addDays(todayIso(), 1));
  const [checkOut, setCheckOut] = useState(addDays(todayIso(), 3));
  const [sheet, setSheet] = useState(false);
  const nights = nightsBetween(checkIn, checkOut);
  const total = h.rooms[room].price * nights;

  const msg = `هلا، أريد أحجز ${h.rooms[room].name} بـ${h.name} من ${prettyDate(checkIn)} إلى ${prettyDate(checkOut)} (${nights} ليالي). شنو المتوفر؟ (من تطبيق بدربي)`;

  return (
    <div className="screen">
      <div className="scroll" style={{ paddingBottom: 20 }}>
        <div style={{ height: 300, background: h.tint, position: 'relative', paddingTop: 'var(--safe-top)' }}>
          <img src="./img/hotel.png" alt={h.name} style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', width: 240, height: 'auto' }} />
          <button className="iconbtn" aria-label="رجوع" onClick={back} style={{ position: 'absolute', top: 'calc(16px + var(--safe-top))', right: 20, background: '#fff' }}>
            <Icon name="back" size={20} />
          </button>
          <button className="iconbtn" aria-label="أضف للمفضلة" onClick={() => setFav(!fav)} style={{ position: 'absolute', top: 'calc(16px + var(--safe-top))', left: 20, background: '#fff', color: '#C8455A' }}>
            <Icon name="heart" size={20} fill={fav ? '#C8455A' : 'none'} />
          </button>
        </div>
        <div style={{ marginTop: -28, position: 'relative', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 20px 0' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="h2" style={{ fontSize: 23 }}>{h.name}</h1>
              <div className="small muted row gap6"><Icon name="pin" size={14} /> {h.city} · {h.near}</div>
            </div>
            <span className="pill" style={{ background: 'var(--navy)', color: '#fff', height: 32 }}><Stars rate={h.rating} /></span>
          </div>
          <div className="row gap8" style={{ marginTop: 16 }}>
            {h.amenities.map((a) => (
              <div key={a} className="grow center small muted" style={{ height: 56, borderRadius: 16, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a}</div>
            ))}
          </div>
          <h2 className="h3" style={{ margin: '20px 0 10px' }}>اختار الغرفة</h2>
          <div className="stack gap8" role="radiogroup">
            {h.rooms.map((r, i) => (
              <button key={r.name} role="radio" aria-checked={room === i} className={`radio ${room === i ? 'on' : ''}`} onClick={() => setRoom(i)}>
                <span className="grow">
                  <span className="bold" style={{ display: 'block' }}>{r.name}</span>
                  <span className="tiny muted">{r.note}</span>
                </span>
                <span className="num bold" style={{ color: 'var(--navy)' }}>{money(r.price)}</span>
              </button>
            ))}
          </div>
          <h2 className="h3" style={{ margin: '18px 0 10px' }}>تاريخ الإقامة</h2>
          <RangeField start={checkIn} end={checkOut} min={todayIso()} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
        </div>
      </div>
      <div className="bottombar row gap14">
        <div className="grow">
          <div className="tiny muted"><span className="num">{nights}</span> ليالي · تقريباً</div>
          <div className="num" style={{ fontWeight: 800, fontSize: 21, color: 'var(--navy)' }}>{money(total)} د.ع</div>
        </div>
        <button className="btn" style={{ width: 180 }} onClick={() => setSheet(true)}>أحجز الغرفة</button>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} label="احجز مع الفندق مباشرة">
        <div className="stack gap12">
          <h2 className="h2">احجز مع الفندق مباشرة</h2>
          <p className="muted" style={{ margin: 0 }}>{h.rooms[room].name} · {nights} ليالي · {shortDate(checkIn)} ← {shortDate(checkOut)}</p>
          <button className="btn green" onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(msg)}`)}>
            <Icon name="whatsapp" size={22} /> واتساب
          </button>
          <button className="btn" onClick={() => openExternal('tel:')}>
            <Icon name="phone" size={20} /> اتصال
          </button>
          <div className="small muted center">الحجز والدفع يتم مباشرة ويا الفندق</div>
          <div className="demo-note" style={{ margin: 0 }}>نسخة تجريبية: ما مربوط رقم فندق حقيقي — الواتساب يفتح وتختار انت لمن ترسل الرسالة الجاهزة.</div>
        </div>
      </Sheet>
    </div>
  );
}

export function Coaster() {
  const { back, showToast } = useStore();
  const [to, setTo] = useState('كربلاء المقدسة');
  const [date, setDate] = useState(addDays(todayIso(), 2));
  const [people, setPeople] = useState(14);
  const [round, setRound] = useState(true);
  const [sent, setSent] = useState(false);
  const est = Math.round((to === 'البصرة' || to === 'السليمانية' || to === 'أربيل' ? 450000 : 250000) * (round ? 1.7 : 1) / 5000) * 5000;

  if (sent) {
    return (
      <div className="screen">
        <TopBar title="كوستر خاص" />
        <div className="empty" style={{ flex: 1, justifyContent: 'center' }}>
          <img src="./img/driver.png" alt="" style={{ height: 180 }} />
          <h2 className="h2" style={{ color: 'var(--ink)' }}>وصل طلبك!</h2>
          <p style={{ margin: 0 }}>راح يتصل بيك مكتب سفريات خلال ساعة حتى يأكد السعر والموعد.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={back}>تمام</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="كوستر خاص" sub="للعوائل والمجاميع والزيارات" />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 20 }}>
        <div className="card row gap12" style={{ background: '#EEEDF8', border: 0 }}>
          <img src="./img/driver.png" alt="" style={{ height: 84 }} />
          <div className="small" style={{ lineHeight: 1.7 }}>كوستر كامل الك ولجماعتك، يطلع من الوقت والمكان اللي تريده.</div>
        </div>
        <CityPicker id="cto" variant="field" label="الوجهة" value={to} exclude="بغداد" excludeNote="الكوستر يطلع منها" onChange={setTo} />
        <DateField label="تاريخ الرحلة" value={date} min={todayIso()} onChange={setDate} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label">عدد الأشخاص</span>
          <div className="row gap12">
            <button className="iconbtn" aria-label="أقل" onClick={() => setPeople(Math.max(5, people - 1))}>−</button>
            <span className="num bold" style={{ fontSize: 20, minWidth: 26, textAlign: 'center' }}>{people}</span>
            <button className="iconbtn" aria-label="أكثر" onClick={() => setPeople(Math.min(24, people + 1))}>+</button>
          </div>
        </div>
        <div className="seg">
          <button className={round ? 'on' : ''} onClick={() => setRound(true)}>ذهاب وإياب</button>
          <button className={!round ? 'on' : ''} onClick={() => setRound(false)}>ذهاب بس</button>
        </div>
        <div className="card flat row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">السعر التقريبي</span>
          <b className="num" style={{ fontSize: 20, color: 'var(--navy)' }}>{money(est)} د.ع</b>
        </div>
      </div>
      <div className="bottombar">
        <button className="btn" onClick={() => { setSent(true); showToast('انرسل الطلب'); }}>اطلب الكوستر</button>
      </div>
    </div>
  );
}
