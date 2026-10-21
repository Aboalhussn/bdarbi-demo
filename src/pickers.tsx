import { useState } from 'react';
import { isoDate } from './data';
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

/** A tappable field that opens a themed time picker (24h, 15-minute steps). */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (hhmm: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(Number(value.split(':')[0]));
  const [m, setM] = useState(Number(value.split(':')[1]));
  const fmt = (hh: number, mm: number) => `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const period = (hh: number) => (hh < 5 ? 'فجراً' : hh < 12 ? 'صباحاً' : hh < 17 ? 'ظهراً' : hh < 20 ? 'مساءً' : 'ليلاً');
  return (
    <>
      <button className="datefield" onClick={() => { setH(Number(value.split(':')[0])); setM(Number(value.split(':')[1])); setOpen(true); }}>
        <span className="df-ic"><Icon name="clock" size={20} /></span>
        <span className="grow">
          <span className="df-label">{label}</span>
          <span className="df-value"><span className="num">{value}</span> {period(Number(value.split(':')[0]))}</span>
        </span>
        <Icon name="forward" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={label}>
        <div className="time-big num">{fmt(h, m)}</div>
        <div className="center small muted" style={{ marginTop: -4 }}>{period(h)}</div>
        <div className="label" style={{ margin: '12px 0 8px' }}>الساعة</div>
        <div className="time-grid">
          {HOURS.map((x) => (
            <button key={x} className={x === h ? 'on' : ''} onClick={() => setH(x)}><span className="num">{String(x).padStart(2, '0')}</span></button>
          ))}
        </div>
        <div className="label" style={{ margin: '14px 0 8px' }}>الدقيقة</div>
        <div className="time-grid four">
          {MINUTES.map((x) => (
            <button key={x} className={x === m ? 'on' : ''} onClick={() => setM(x)}><span className="num">{String(x).padStart(2, '0')}</span></button>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => { onChange(fmt(h, m)); setOpen(false); }}>تم</button>
      </Sheet>
    </>
  );
}
