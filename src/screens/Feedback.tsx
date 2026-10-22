import { useState } from 'react';
import { garageById } from '../data';
import { Icon } from '../icons';
import { tripOf, useStore } from '../store';
import { TopBar } from '../ui';

const TAGS = ['التزام بالوقت', 'سياقة آمنة', 'نظافة', 'تعامل محترم', 'تكييف زين', 'مكان مريح'];
const WORDS = ['', 'سيئة', 'مو زينة', 'عادية', 'حلوة', 'ممتازة!'];

export function Rate() {
  const { route, bookings, rate, reset, go, showToast } = useStore();
  const b = bookings.find((x) => x.code === route.params?.code);
  const [stars, setStars] = useState(b?.rating?.stars ?? 0);
  const [tags, setTags] = useState<string[]>(b?.rating?.tags ?? []);
  const [comment, setComment] = useState(b?.rating?.comment ?? '');
  const [done, setDone] = useState(false);
  if (!b) return null;
  const trip = tripOf(b);

  if (done) {
    return (
      <div className="screen">
        <div className="empty" style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <img src="./img/mascot.png" alt="" style={{ height: 220 }} />
          <h1 className="h2" style={{ color: 'var(--ink)' }}>شكراً على تقييمك!</h1>
          <p style={{ margin: 0 }}>تقييمك يساعد الكباتن يحسّنون الخدمة، وانضافتلك <b>20 نقطة</b>.</p>
          <button className="btn" style={{ maxWidth: 320 }} onClick={() => reset('home')}>رجوع للرئيسية</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="قيّم رحلتك" sub={`${trip.from} ← ${trip.to} · ${trip.company}`} />
      <div className="scroll pad stack gap14" style={{ paddingBottom: 20 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--lavender)', overflow: 'hidden', position: 'relative' }}>
            <img src="./img/driver.png" alt="" style={{ position: 'absolute', top: 3, left: 3, width: 80 }} />
          </div>
          <b>شلون جانت رحلتك؟</b>
          <span className="small muted">نزلت بـ {garageById(trip.endGarageId).name}</span>
        </div>
        <div className="rate-stars" role="radiogroup" aria-label="التقييم">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} نجوم`} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}>
              <Icon name="star" size={40} fill={n <= stars ? '#F5B83D' : 'none'} stroke={1.6} />
            </button>
          ))}
        </div>
        <div className="center bold" style={{ color: stars >= 4 ? 'var(--success)' : stars ? '#7A5200' : 'var(--slate)', minHeight: 24 }}>{stars ? WORDS[stars] : 'اضغط على النجوم'}</div>
        {stars ? (
          <>
            <div className="label">{stars >= 4 ? 'شنو عجبك؟' : 'شنو اللي ما عجبك؟'}</div>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              {TAGS.map((t) => (
                <button key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} style={{ height: 38, fontSize: 13 }} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{t}</button>
              ))}
            </div>
            <textarea className="input" rows={3} style={{ height: 'auto', padding: 14, resize: 'none' }} placeholder="اكتب ملاحظتك للكابتن (اختياري)" value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))} />
          </>
        ) : null}
      </div>
      <div className="bottombar stack gap8">
        <button
          className="btn"
          disabled={!stars}
          onClick={() => {
            rate(b.code, { stars, tags, comment: comment.trim(), at: Date.now() });
            showToast('وصل تقييمك ✓');
            setDone(true);
          }}
        >
          إرسال التقييم
        </button>
        <button className="link small" onClick={() => go('ticket', { code: b.code })}>مو هسه</button>
      </div>
    </div>
  );
}

function ago(ms: number) {
  if (!ms) return 'من قبل';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'هسه';
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.round(h / 24)} يوم`;
}

export function Notifications() {
  const { notifications: mine, captainNotifs, markAllRead: markAll, go, route } = useStore();
  const as: 'passenger' | 'captain' = route.params?.as === 'captain' ? 'captain' : 'passenger';
  const notifications = as === 'captain' ? captainNotifs : mine;
  const markAllRead = () => markAll(as);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="screen gray">
      <TopBar title="الإشعارات" sub={unread ? `${unread} جديدة` : 'كلها مقروءة'} right={unread ? <button className="link small" onClick={markAllRead}>قريتها كلها</button> : undefined} />
      <div className="scroll pad stack gap8" style={{ paddingBottom: 24 }}>
        {notifications.length === 0 ? (
          <div className="empty"><Icon name="bell" size={40} /><b style={{ color: 'var(--ink)' }}>ما عندك إشعارات</b></div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              className={`notif ${n.read ? '' : 'new'}`}
              onClick={() => {
                markAllRead();
                if (n.link) go(n.link.name, n.link.params);
              }}
            >
              <span className={`notif-ic ${n.tone ?? 'info'}`}><Icon name={n.icon} size={20} /></span>
              <span className="grow">
                <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <b>{n.title}</b>
                  <span className="tiny muted" style={{ flexShrink: 0 }}>{ago(n.at)}</span>
                </span>
                <span className="small muted" style={{ display: 'block', lineHeight: 1.6 }}>{n.body}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
