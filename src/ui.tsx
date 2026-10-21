import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Icon } from './icons';
import { fmt12 } from './data';
import { useStore } from './store';

export function TopBar({ title, sub, right, onBack }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; onBack?: () => void }) {
  const { back } = useStore();
  return (
    <header className="topbar">
      <button className="iconbtn" aria-label="رجوع" onClick={() => (onBack ? onBack() : back())}>
        <Icon name="back" size={20} stroke={2.2} />
      </button>
      <div className="grow">
        <div className="title">{title}</div>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {right}
    </header>
  );
}

const PASSENGER_TABS = [
  { key: 'home', icon: 'home', label: 'الرئيسية' },
  { key: 'search', icon: 'search', label: 'البحث' },
  { key: 'trips', icon: 'bus', label: 'رحلة جديدة' },
  { key: 'myTrips', icon: 'ticket', label: 'رحلاتي' },
  { key: 'profile', icon: 'user', label: 'حسابي' },
];

const DRIVER_TABS = [
  { key: 'driverHome', icon: 'home', label: 'الرئيسية' },
  { key: 'driverRequests', icon: 'inbox', label: 'الطلبات' },
  { key: 'driverScan', icon: 'scan', label: 'مسح التذكرة' },
  { key: 'driverTrip', icon: 'list', label: 'رحلتي' },
  { key: 'driverProfile', icon: 'user', label: 'ملفي' },
];

export function TabBar({ active, driver = false }: { active: string; driver?: boolean }) {
  const { reset, go, requests } = useStore();
  const tabs = driver ? DRIVER_TABS : PASSENGER_TABS;
  const home = driver ? 'driverHome' : 'home';
  const newReq = requests.filter((r) => r.status === 'new').length;
  return (
    <div className="tabbar">
      <nav aria-label="التنقل">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={active === t.key ? 'on' : ''}
            aria-label={t.label}
            aria-current={active === t.key ? 'page' : undefined}
            onClick={() => {
              if (t.key === active) return;
              if (t.key === home) reset(home);
              else if (t.key === 'driverScan') go(t.key);
              else {
                reset(home);
                go(t.key);
              }
            }}
          >
            <Icon name={t.icon} size={22} />
            {driver && t.key === 'driverRequests' && newReq > 0 ? <span className="badge">{newReq}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  if (!open) return null;
  return (
    <div className="sheet-back" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function QR({ text }: { text: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B0558', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [text]);
  return <div className="qr" role="img" aria-label="رمز QR للتذكرة" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Opens an outside link (maps, WhatsApp, phone). Inside the app Android hands it to the right app. */
export function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export function Stars({ rate }: { rate: string }) {
  return (
    <span className="row gap6" style={{ display: 'inline-flex' }}>
      <span style={{ color: '#F5B83D', display: 'inline-flex' }}>
        <Icon name="star" size={13} fill="#F5B83D" stroke={0} />
      </span>
      <span className="num" style={{ fontSize: 13 }}>{rate}</span>
    </span>
  );
}

/**
 * A time on the 12-hour clock: big digits with a small ص / م on their left, the way it reads in Arabic.
 * Always used inside a `.num` element, which is laid out left-to-right.
 */
export function Time({ v }: { v: string }) {
  const f = fmt12(v);
  const i = f.lastIndexOf(' ');
  return (
    <>
      <small style={{ fontSize: '0.55em', fontWeight: 700, marginInlineEnd: 4, fontFamily: 'var(--text)', unicodeBidi: 'isolate', display: 'inline-block' }}>{f.slice(i + 1)}</small>
      {f.slice(0, i)}
    </>
  );
}
