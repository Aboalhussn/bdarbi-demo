import { useState } from 'react';
import { fmt12, isoDate } from './data';
import { Icon } from './icons';
import { Sheet } from './ui';

const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
// Week starts on Saturday, as in Iraq.
const WEEK = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function prettyDate(iso: string, withYear = false) {
  const d = parse(iso);
  return `${AR_DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
}

export function shortDate(iso: string) {
  const d = parse(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function nightsBetween(a: string, b: string) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

export function addDays(iso: string, n: number) {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

interface CalendarProps {
  mode: 'single' | 'range';
  start: string | null;
  end?: string | null;
  min: string;
  maxDays?: number;
  onPick: (start: string | null, end: string | null) => void;
}

export function Calendar({ mode, start, end = null, min, maxDays = 120, onPick }: CalendarProps) {
  const first = parse(start ?? min);
  const [view, setView] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const minD = parse(min);
  const maxD = parse(addDays(min, maxDays));
  const canPrev = view > new Date(minD.getFullYear(), minD.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= maxD;

  const lead = (view.getDay() + 1) % 7; // empty cells before day 1 (Saturday-first week)
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(isoDate(new Date(view.getFullYear(), view.getMonth(), d)));
  while (cells.length % 7) cells.push(null);

  const tap = (iso: string) => {
    if (mode === 'single') return onPick(iso, null);
    if (!start || end || iso <= start) return onPick(iso, null);
    onPick(start, iso);
  };

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="iconbtn" aria-label="الشهر السابق" disabled={!canPrev} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
          <Icon name="back" size={18} />
        </button>
        <div className="cal-title">{MONTHS[view.getMonth()]} <span className="num">{view.getFullYear()}</span></div>
        <button className="iconbtn" aria-label="الشهر الجاي" disabled={!canNext} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
          <Icon name="forward" size={18} />
        </button>
      </div>
      <div className="cal-grid cal-week">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} />;
          const d = parse(iso);
          const off = d < minD || d > maxD;
          const isStart = iso === start;
          const isEnd = iso === end;
          const inRange = mode === 'range' && start && end && iso > start && iso < end;
          const col = i % 7;
          const cls = ['cal-day'];
          if (isStart || isEnd) cls.push('sel');
          if (inRange) cls.push('mid');
          if (mode === 'range' && start && end && isStart) cls.push('from');
          if (mode === 'range' && start && end && isEnd) cls.push('to');
          if (inRange && col === 0) cls.push('row-start');
          if (inRange && col === 6) cls.push('row-end');
          if (iso === min) cls.push('today');
          return (
            <button key={iso} className={cls.join(' ')} disabled={off} onClick={() => tap(iso)} aria-pressed={isStart || isEnd || !!inRange}>
              <span className="num">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A tappable field that opens a themed calendar sheet for one date. */
export function DateField({ label, value, min, onChange, light = false }: { label: string; value: string; min: string; onChange: (iso: string) => void; light?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`datefield ${light ? 'light' : ''}`} onClick={() => setOpen(true)}>
        <span className="df-ic"><Icon name="calendar" size={20} /></span>
        <span className="grow">
          <span className="df-label">{label}</span>
          <span className="df-value">{prettyDate(value)}</span>
        </span>
        <Icon name="forward" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={label}>
        <h2 className="h3" style={{ marginBottom: 6 }}>{label}</h2>
        <Calendar mode="single" start={value} min={min} onPick={(s) => { if (s) { onChange(s); setOpen(false); } }} />
      </Sheet>
    </>
  );
}

/** Check-in / check-out fields that open one range calendar. */
export function RangeField({ start, end, min, onChange }: { start: string; end: string; min: string; onChange: (s: string, e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<string | null>(start);
  const [e, setE] = useState<string | null>(end);
  const show = () => {
    setS(start);
    setE(end);
    setOpen(true);
  };
  const nights = s && e ? nightsBetween(s, e) : 0;
  return (
    <>
      <button className="rangefield" onClick={show}>
        <span className="rf-part">
          <span className="df-label">الوصول</span>
          <span className="df-value">{shortDate(start)}</span>
        </span>
        <span className="rf-mid"><span className="num">{nightsBetween(start, end)}</span> ليالي</span>
        <span className="rf-part" style={{ textAlign: 'left' }}>
          <span className="df-label">المغادرة</span>
          <span className="df-value">{shortDate(end)}</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="تاريخ الإقامة">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 className="h3">{!s ? 'اختار يوم الوصول' : !e ? 'هسه اختار يوم المغادرة' : 'تمام! تكدر تبدّل أو اضغط تم'}</h2>
          {nights > 0 ? <span className="pill info"><span className="num">{nights}</span>&nbsp;ليالي</span> : null}
        </div>
        <div className="row gap8" style={{ marginBottom: 6 }}>
          <div className={`rf-chip ${!s || e ? 'on' : ''}`}>الوصول: <b>{s ? shortDate(s) : '—'}</b></div>
          <div className={`rf-chip ${s && !e ? 'next' : e ? 'on' : ''}`}>المغادرة: <b>{e ? shortDate(e) : '—'}</b></div>
        </div>
        <Calendar mode="range" start={s} end={e} min={min} maxDays={180} onPick={(a, b) => { setS(a); setE(b); }} />
        <button className="btn" style={{ marginTop: 10 }} disabled={!s || !e} onClick={() => { if (s && e) { onChange(s, e); setOpen(false); } }}>
          {s && e ? `تم · ${nights} ليالي` : 'اختار يومين'}
        </button>
      </Sheet>
    </>
  );
}

/** A tappable field that opens a themed 12-hour clock: pick the hour, then the minutes, then ص / م. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (hhmm: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h12, setH12] = useState(12);
  const [m, setM] = useState(0);
  const [pm, setPm] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const show = () => {
    const [h, mm] = value.split(':').map(Number);
    setH12(h % 12 === 0 ? 12 : h % 12);
    setM(mm - (mm % 5));
    setPm(h >= 12);
    setMode('hour');
    setOpen(true);
  };
  const to24 = () => {
    const h = (h12 % 12) + (pm ? 12 : 0);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const R = 104; // dial radius for the numbers
  const items = mode === 'hour' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);
  const selected = mode === 'hour' ? h12 : m;
  const angleOf = (n: number) => ((mode === 'hour' ? (n % 12) / 12 : n / 60) * 360 - 90) * (Math.PI / 180);
  const a = angleOf(selected);

  return (
    <>
      <button className="datefield" onClick={show}>
        <span className="df-ic"><Icon name="clock" size={20} /></span>
        <span className="grow">
          <span className="df-label">{label}</span>
          <span className="df-value num" style={{ textAlign: 'right' }}>{fmt12(value)}</span>
        </span>
        <Icon name="forward" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={label}>
        <h2 className="h3">{label}</h2>
        <div className="clock-top">
          <div className="clock-read num">
            <button className={mode === 'hour' ? 'on' : ''} onClick={() => setMode('hour')}>{h12}</button>
            <span>:</span>
            <button className={mode === 'minute' ? 'on' : ''} onClick={() => setMode('minute')}>{String(m).padStart(2, '0')}</button>
          </div>
          <div className="ampm">
            <button className={!pm ? 'on' : ''} onClick={() => setPm(false)}>ص</button>
            <button className={pm ? 'on' : ''} onClick={() => setPm(true)}>م</button>
          </div>
        </div>
        <div className="small muted center" style={{ marginTop: 2 }}>{mode === 'hour' ? 'اختار الساعة' : 'اختار الدقائق'}</div>
        <div className="dial">
          <div className="dial-hand" style={{ width: R, transform: `rotate(${(a * 180) / Math.PI}deg)` }} />
          <div className="dial-center" />
          {items.map((n) => {
            const an = angleOf(n);
            const x = Math.cos(an) * R;
            const y = Math.sin(an) * R;
            return (
              <button
                key={n}
                className={`dial-num num ${n === selected ? 'on' : ''}`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onClick={() => {
                  if (mode === 'hour') {
                    setH12(n);
                    setMode('minute');
                  } else setM(n);
                }}
              >
                {mode === 'hour' ? n : String(n).padStart(2, '0')}
              </button>
            );
          })}
        </div>
        <button className="btn" onClick={() => { onChange(to24()); setOpen(false); }}>تم · {fmt12(to24())}</button>
      </Sheet>
    </>
  );
}
