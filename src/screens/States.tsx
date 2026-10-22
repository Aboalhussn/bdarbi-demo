import { DESTINATIONS, garageById, longDate, money, todayIso, tripById } from '../data';
import { Icon } from '../icons';
import { useStore } from '../store';
import { Time } from '../ui';

/** One layout for every "something went wrong" screen. */
function StateScreen({ art, tone, title, body, children }: { art: string; tone: 'bad' | 'warn' | 'info'; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="screen state-screen">
      <div className="state-body">
        <div className={`state-art ${tone}`}>{art === 'mascot' ? <img src="./img/mascot.png" alt="" /> : <Icon name={art} size={54} />}</div>
        <h1 className="h2" style={{ margin: '18px 0 6px' }}>{title}</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>{body}</p>
      </div>
      <div className="bottombar stack gap8">{children}</div>
    </div>
  );
}

/** Shown over everything when the phone loses the internet. */
export function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="offline-layer" role="alert">
      <StateScreen art="wifiOff" tone="warn" title="ما اكو إنترنت" body="تأكد من الواي فاي أو بيانات الهاتف، وبعدها جرّب مرة ثانية. تذاكرك المحفوظة تگدر تفتحها حتى بدون إنترنت.">
        <button className="btn" onClick={onRetry}><Icon name="refresh" size={20} /> جرّب مرة ثانية</button>
      </StateScreen>
    </div>
  );
}

export function TripCancelled() {
  const { route, bookings, go, reset } = useStore();
  const b = bookings.find((x) => x.code === route.params?.code);
  const t = b ? tripById(b.tripId) : tripById('t00');
  const online = b && !b.pay.startsWith('نقد');
  return (
    <StateScreen
      art="mascot"
      tone="bad"
      title="الرحلة انلغت"
      body={`${t ? `رحلة ${t.from} ← ${t.to}` : 'رحلتك'}${b ? ` يوم ${longDate(b.date)}` : ''} انلغت من الكابتن. ${online ? `فلوسك (${money(b!.total)} د.ع) ترجعلك كاملة خلال 24 ساعة.` : 'ما انخصم منك شي.'} آسفين على الإزعاج 🙏`}
    >
      <button className="btn" onClick={() => { reset('home'); go('trips', { dest: t?.to ?? DESTINATIONS[0], date: b?.date ?? todayIso() }); }}><Icon name="search" size={20} /> لگيلي رحلة ثانية بنفس اليوم</button>
      {b ? <button className="btn soft" onClick={() => go('ticket', { code: b.code })}>شوف التذكرة</button> : <button className="btn soft" onClick={() => reset('home')}>الرئيسية</button>}
    </StateScreen>
  );
}

export function SeatTaken() {
  const { route, replace, back } = useStore();
  const trip = tripById(String(route.params?.tripId ?? 't00'));
  const seats = (route.params?.seats as number[] | undefined) ?? [];
  return (
    <StateScreen
      art="chair"
      tone="warn"
      title="المقعد انحجز هسه"
      body={`${seats.length > 1 ? `واحد من المقاعد (${seats.join('، ')})` : `المقعد ${seats[0] ?? ''}`} حجزه شخص ثاني قبلك بلحظات. ما انخصم منك شي، اختار مقعد ثاني ويا نفس الرحلة.`}
    >
      {trip ? (
        <div className="card row gap10 small" style={{ marginBottom: 4 }}>
          <span className="num bold" style={{ fontSize: 18, color: 'var(--navy)' }}><Time v={trip.time} /></span>
          <span className="grow">{trip.from} ← {trip.to} · {garageById(trip.garageId).name}</span>
        </div>
      ) : null}
      <button className="btn" onClick={() => (trip ? replace('seats', { tripId: trip.id, date: route.params?.date ?? todayIso() }) : back())}>اختار مقعد ثاني</button>
    </StateScreen>
  );
}
