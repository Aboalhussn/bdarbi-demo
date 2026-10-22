import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { distanceKm, fmt12, garageById, longDate, pointAlong, routePath } from '../data';
import { Icon } from '../icons';
import { tripOf, useStore } from '../store';
import { TopBar } from '../ui';
import { liveOf } from '../live';

const APPROACH_MIN = 60; // the bus starts heading to the garage an hour before leaving
const AT_GARAGE_MIN = 15; // and waits at the garage for the last 15 minutes

type Phase = 'waiting' | 'approaching' | 'atGarage' | 'moving' | 'arrived';

function absMinutes(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).getTime() / 60000;
}

function durText(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hs = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
  return r ? `${hs} و${r} دقيقة` : hs;
}

function clock(minAbs: number) {
  const d = new Date(minAbs * 60000);
  return fmt12(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
}

function pin(color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin" style="--c:${color}"><i></i></div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
  });
}

const busIcon = L.divIcon({
  className: '',
  html: '<div class="map-bus"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/></svg></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export function Track() {
  const { route, bookings, trip: tripState, go } = useStore();
  const b = bookings.find((x) => x.code === route.params?.code);
  const trip = b ? tripOf(b) : null;
  const start = trip ? garageById(trip.garageId) : null;
  const end = trip ? garageById(trip.endGarageId) : null;
  const path = useMemo(() => (trip ? routePath(trip.garageId, trip.endGarageId) : []), [trip]);
  const live = b ? liveOf(b, tripState) : null;
  const delay = live?.delay ?? 0;
  const depMin = b && trip ? absMinutes(b.date, trip.time) + delay : 0;
  const total = path.length ? (() => {
    const [h, m] = trip!.arrive.split(':').map(Number);
    let arr = absMinutes(b!.date, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    if (arr <= depMin) arr += 24 * 60;
    return arr - depMin;
  })() : 0;

  // "Now" is the real clock, unless the demo playback is running.
  const [now, setNow] = useState(Date.now() / 60000);
  const [demo, setDemo] = useState<number | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() / 60000), 15000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (demo === null) return;
    const from = depMin - APPROACH_MIN;
    const span = APPROACH_MIN + total + 5;
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const f = (performance.now() - started) / 24000; // the whole trip in 24 seconds
      setDemo(from + Math.min(1, f) * span);
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo === null]);
  const t = demo ?? now;

  // Where the bus is right now.
  const approachFrom: [number, number] | null = start ? [start.lat + 0.045, start.lng - 0.06] : null;
  let phase: Phase = 'waiting';
  let busPos: [number, number] = approachFrom ?? [33.3, 44.4];
  let frac = 0;
  const captainOverride = demo === null && live?.isCaptainTrip && (live.status === 'started' || live.status === 'arrived');
  if (start && path.length) {
    if (captainOverride && live!.status === 'arrived') {
      phase = 'arrived';
      frac = 1;
      busPos = path[path.length - 1];
    } else if (captainOverride && live!.startedAt) {
      phase = 'moving';
      frac = Math.min(0.97, Math.max(0.01, (t - live!.startedAt / 60000) / total));
      busPos = pointAlong(path, frac).pos;
    } else if (t < depMin - APPROACH_MIN) phase = 'waiting';
    else if (t < depMin - AT_GARAGE_MIN) {
      phase = 'approaching';
      const f = (t - (depMin - APPROACH_MIN)) / (APPROACH_MIN - AT_GARAGE_MIN);
      busPos = [approachFrom![0] + (start.lat - approachFrom![0]) * f, approachFrom![1] + (start.lng - approachFrom![1]) * f];
    } else if (t < depMin) {
      phase = 'atGarage';
      busPos = [start.lat, start.lng];
    } else if (demo === null && live?.isCaptainTrip && live.status === 'scheduled') {
      // Departure time passed but the captain hasn't pressed "انطلقنا" yet.
      phase = 'atGarage';
      busPos = [start.lat, start.lng];
    } else if (demo === null && live?.isCaptainTrip && live.status === 'started' && live.startedAt) {
      phase = 'moving';
      frac = Math.min(0.97, Math.max(0, (t - live.startedAt / 60000) / total));
      busPos = pointAlong(path, frac).pos;
    } else if (demo === null && live?.isCaptainTrip && live.status === 'arrived') {
      phase = 'arrived';
      frac = 1;
      busPos = path[path.length - 1];
    } else if (t < depMin + total) {
      phase = 'moving';
      frac = (t - depMin) / total;
      busPos = pointAlong(path, frac).pos;
    } else {
      phase = 'arrived';
      frac = 1;
      busPos = path[path.length - 1];
    }
  }

  // ---- map ----
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ done?: L.Polyline; bus?: L.Marker; approach?: L.Polyline }>({});
  const [tilesOk, setTilesOk] = useState(true);
  useEffect(() => {
    if (!box.current || !start || !end || map.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true });
    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(m);
    tiles.on('tileerror', () => setTilesOk(false));
    L.polyline(path, { color: '#B9B5D3', weight: 6, opacity: 0.9, dashArray: '2 10', lineCap: 'round' }).addTo(m);
    layers.current.done = L.polyline([path[0]], { color: '#0B0558', weight: 6, lineCap: 'round' }).addTo(m);
    layers.current.approach = L.polyline([], { color: '#F5B83D', weight: 4, dashArray: '6 8' }).addTo(m);
    L.marker([start.lat, start.lng], { icon: pin('#0B0558') }).addTo(m).bindTooltip(start.name, { direction: 'top', offset: [0, -40] });
    L.marker([end.lat, end.lng], { icon: pin('#F5B83D') }).addTo(m).bindTooltip(end.name, { direction: 'top', offset: [0, -40] });
    layers.current.bus = L.marker(busPos, { icon: busIcon, zIndexOffset: 1000 }).addTo(m);
    m.fitBounds(L.latLngBounds([...path, ...(approachFrom ? [approachFrom] : [])]), { padding: [40, 40] });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.id, end?.id]);

  useEffect(() => {
    const { done, bus, approach } = layers.current;
    if (!done || !bus || !approach || !start) return;
    bus.setLatLng(busPos);
    if (phase === 'moving' || phase === 'arrived') {
      const pts: [number, number][] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) pts.push(pointAlong(path, (i / steps) * frac).pos);
      done.setLatLngs(pts);
      approach.setLatLngs([]);
    } else {
      done.setLatLngs([path[0]]);
      approach.setLatLngs(phase === 'approaching' ? [busPos, [start.lat, start.lng]] : []);
    }
  }, [busPos[0], busPos[1], phase, frac, path, start]);

  if (!b || !trip || !start || !end) return null;

  const kmLeft = phase === 'moving' ? pointAlong(path, 1).km * (1 - frac) : phase === 'approaching' ? distanceKm(busPos[0], busPos[1], start.lat, start.lng) : 0;
  const status = (() => {
    switch (phase) {
      case 'waiting':
        return { title: 'الباص بعده ما تحرك للكراج', line: `يوصل ${start.name} الساعة ${clock(depMin - AT_GARAGE_MIN)}`, pill: `ينطلق ${clock(depMin)}`, tone: 'info' };
      case 'approaching':
        return { title: `الباص جاي للكراج · بعد ${durText(depMin - AT_GARAGE_MIN - t)}`, line: `باقي ${kmLeft.toFixed(1)} كم على ${start.name}`, pill: 'بالطريق للكراج', tone: 'warn' };
      case 'atGarage':
        return t >= depMin
          ? { title: 'الباص واقف بالكراج', line: `ينتظر الكابتن يعلن الانطلاق · رصيف ${trip.platform}`, pill: 'اصعد هسه', tone: 'ok' }
          : { title: 'الباص واقف بالكراج', line: `يتحرك بعد ${durText(depMin - t)} · رصيف ${trip.platform}`, pill: 'اصعد هسه', tone: 'ok' };
      case 'moving': {
        const eta = captainOverride && live!.startedAt ? live!.startedAt / 60000 + total : depMin + total;
        return { title: `بالطريق إلى ${end.name.replace('كراج ', '')}`, line: `يوصل بعد ${durText(eta - t)} · باقي ${Math.round(kmLeft)} كم`, pill: `يوصل ${clock(eta)}`, tone: 'info' };
      }
      default:
        return { title: 'وصلت الرحلة', line: `نزلتوا بـ ${end.name}`, pill: 'وصلت ✓', tone: 'ok' };
    }
  })();

  return (
    <div className="screen">
      <TopBar title="تتبع الباص" sub={`${trip.from} ← ${trip.to} · ${longDate(b.date)}`} />
      <div className="track-map">
        <div ref={box} className="leaflet-box" />
        {!tilesOk ? <div className="map-offline">الخريطة تحتاج إنترنت — الطريق وموقع الباص يبينون بدونها</div> : null}
        {demo !== null ? <div className="demo-badge">عرض تجريبي · <span className="num">{clock(t)}</span></div> : null}
      </div>
      <div className="track-card">
        {live?.status === 'cancelled' ? (
          <div className="card" style={{ background: 'var(--alert-bg)', border: 0, color: 'var(--alert)', fontWeight: 700 }}>
            {live.cancelledBy === 'captain' ? 'الكابتن ألغى هذي الرحلة — فلوسك ترجعلك كاملة.' : 'ألغيت هذا الحجز.'}
          </div>
        ) : null}
        {delay > 0 && phase !== 'arrived' && live?.status !== 'cancelled' ? <div className="pill warn" style={{ alignSelf: 'flex-start' }}>تأخرت الرحلة {delay} دقيقة</div> : null}
        <div className="row gap10">
          <span className="track-ic"><Icon name="bus" size={22} /></span>
          <div className="grow">
            <div className="bold" style={{ fontSize: 16 }}>{status.title}</div>
            <div className="small muted">{status.line}</div>
          </div>
          <span className={`pill ${status.tone}`}>{status.pill}</span>
        </div>
        <div className="track-bar"><i style={{ width: `${Math.round((phase === 'moving' || phase === 'arrived' ? frac : 0) * 100)}%` }} /></div>
        <div className="track-stops">
          <div>
            <span className="stop-dot" />
            <div>
              <div className="tiny muted">الانطلاق · {fmt12(trip.time)}</div>
              <div className="bold small">{start.name}</div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div>
              <div className="tiny muted">نقطة الانتهاء · {fmt12(trip.arrive)}</div>
              <div className="bold small">{end.name}</div>
            </div>
            <span className="stop-dot gold" />
          </div>
        </div>
        {phase === 'arrived' && demo === null && !b.rating ? (
          <button className="btn" style={{ background: 'var(--gold)', color: '#2A1A00' }} onClick={() => go('rate', { code: b.code })}><Icon name="star" size={20} /> قيّم رحلتك</button>
        ) : null}
        <button className="btn soft sm" onClick={() => setDemo(demo === null ? depMin - APPROACH_MIN : null)}>
          <Icon name={demo === null ? 'bus' : 'refresh'} size={18} /> {demo === null ? 'شوف عرض تجريبي للرحلة' : 'رجوع للوقت الحقيقي'}
        </button>
      </div>
    </div>
  );
}
