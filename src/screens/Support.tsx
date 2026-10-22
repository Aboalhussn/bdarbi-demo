import { useEffect, useRef, useState } from 'react';
import { Icon, Logo } from '../icons';
import { useStore, type ChatMsg } from '../store';
import { shrinkImage } from './Account';

const TOPICS = {
  passenger: ['مشكلة بحجز', 'أريد أسترجع فلوسي', 'الباص تأخر', 'نسيت غرض بالباص', 'مشكلة بالدفع'],
  captain: ['سحب الرصيد', 'تحديث السنوية أو السيارة', 'مشكلة براكب', 'إلغاء رحلة', 'مشكلة بالتطبيق'],
};

/** Demo replies — in the real app a support agent answers. */
function replyTo(text: string, as: 'passenger' | 'captain', hasImage: boolean) {
  const t = text.replace(/[ًٌٍَُِّْ]/g, '');
  const ref = `#S-${String(Date.now()).slice(-5)}`;
  if (hasImage && !t.trim()) return 'وصلتنا الصورة، شكراً. اشرحلنا شنو المشكلة حتى نساعدك أسرع.';
  const code = text.toUpperCase().match(/\b[A-HJ-NP-Z2-9]{6}\b/);
  if (code) return `شكراً، لكينا الحجز ${code[0]} ✓ نتابع الموضوع هسه ونرجعلك برسالة هنا خلال دقائق.`;
  if (/استرج|فلوس|رجع/.test(t)) return as === 'passenger'
    ? 'إذا دفعت إلكترونياً وانلغى الحجز، المبلغ يرجع لنفس طريقة الدفع خلال 24–72 ساعة. اكتبلي رمز الحجز (6 خانات) حتى أتابعه.'
    : 'ترجيع فلوس الركاب يصير تلقائياً من بدربي، ما تحتاج تسوي شي.';
  if (/سحب|رصيد/.test(t)) return 'طلبات السحب تنحوّل خلال 24 ساعة بأيام الدوام. إذا مرت أكثر، اكتبلي رقم المحفظة اللي سحبت عليها.';
  if (/سنوية|سيارة|مركبة|اجازة|إجازة/.test(t)) return 'ارفعلي صورة السنوية أو الإجازة الجديدة هنا (زر 📎)، والإدارة تحدّثها وتبلغك.';
  if (/تأخر|تاخر|الباص|وين/.test(t)) return 'آسفين على التأخير 🙏 تكدر تتابع الباص من التذكرة ← «تتبع الباص». إذا الكابتن ما يرد، اكتبلي رمز الحجز ونتصل بيه.';
  if (/نسيت|غرض|جنطة|شنطة/.test(t)) return 'اكتبلي رمز الحجز ووصف الغرض، ونتواصل ويا الكابتن حتى يرجعه إلك.';
  if (/دفع|بطاقة|زين/.test(t)) return 'إذا انخصم المبلغ وما انحجز، يرجع تلقائياً خلال 24 ساعة. ابعثلي صورة من رسالة البنك أو زين كاش حتى نتأكد.';
  if (/حجز|الغي|إلغاء|الغاء/.test(t)) return as === 'passenger'
    ? 'تكدر تلغي من التذكرة ← «إلغاء الحجز» قبل ما تصعد. إذا عندك مشكلة ثانية بالحجز اكتبلي رمزه.'
    : 'إذا تحتاج تلغي رحلة، اضغط «إلغاء» بكارت الرحلة ويوصل إشعار لكل الركاب وترجعلهم فلوسهم.';
  if (/راكب|مسافر/.test(t)) return 'اكتبلي رمز حجز الراكب وشنو صار، ونتابع الموضوع فوراً.';
  if (/شكر|تسلم|مشكور/.test(t)) return 'العفو، بالخدمة دائماً 💙';
  return `استلمنا رسالتك (${ref}). موظف الدعم يرد عليك بأقرب وقت، عادةً خلال دقائق.`;
}

function clock(ms: number) {
  const d = new Date(ms);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'ص' : 'م'}`;
}

export function Support() {
  const { route, support, set, back, showToast } = useStore();
  const as: 'passenger' | 'captain' = route.params?.as === 'captain' ? 'captain' : 'passenger';
  const msgs = support[as];
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supportRef = useRef(support);
  supportRef.current = support;

  useEffect(() => {
    listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [msgs.length, typing]);

  const push = (m: Omit<ChatMsg, 'id' | 'at'>) => {
    const s = supportRef.current;
    const msg: ChatMsg = { ...m, id: 'm' + Date.now() + Math.random().toString(36).slice(2, 5), at: Date.now() };
    set({ support: { ...s, [as]: [...s[as], msg] } });
  };

  const send = (body: string, image?: string) => {
    const t = body.trim();
    if (!t && !image) return;
    push({ from: 'me', text: t, image });
    setText('');
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      push({ from: 'support', text: replyTo(t, as, !!image) });
    }, 1400);
  };

  return (
    <div className="screen chat">
      <header className="topbar chat-top">
        <button className="iconbtn" aria-label="رجوع" onClick={back}><Icon name="back" size={20} /></button>
        <span className="chat-avatar"><Logo size={26} /></span>
        <div className="grow">
          <div className="title" style={{ fontSize: 17 }}>دعم {as === 'captain' ? 'كابتن بدربي' : 'بدربي'}</div>
          <div className="sub row gap6"><span className="online-dot" /> {typing ? 'يكتب…' : 'متصل · نرد عادةً خلال دقائق'}</div>
        </div>
      </header>

      <div ref={listRef} className="chat-list scroll">
        <div className="chat-day">اليوم</div>
        <div className="bubble-row support">
          <div className="msg-b">
            هلا بيك 👋 هذا دعم {as === 'captain' ? 'كابتن بدربي' : 'بدربي'}. شلون نكدر نساعدك؟ اختار موضوع أو اكتب رسالتك.
            <span className="b-time">{clock(msgs[0]?.at ?? Date.now())}</span>
          </div>
        </div>
        {msgs.length === 0 ? (
          <div className="chat-topics">
            {TOPICS[as].map((t) => (
              <button key={t} className="chip" onClick={() => send(t)}>{t}</button>
            ))}
          </div>
        ) : null}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble-row ${m.from}`}>
            <div className="msg-b">
              {m.image ? <img src={m.image} alt="صورة مرفقة" /> : null}
              {m.text ? <span>{m.text}</span> : null}
              <span className="b-time">{clock(m.at)}{m.from === 'me' ? ' ✓✓' : ''}</span>
            </div>
          </div>
        ))}
        {typing ? (
          <div className="bubble-row support">
            <div className="msg-b typing"><i /><i /><i /></div>
          </div>
        ) : null}
      </div>

      <div className="chat-input">
        <button className="iconbtn" aria-label="أرفق صورة" onClick={() => fileRef.current?.click()}><Icon name="clip" size={20} /></button>
        <textarea
          rows={1}
          placeholder="اكتب رسالتك…"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
        />
        <button className="chat-send" aria-label="إرسال" disabled={!text.trim()} onClick={() => send(text)}><Icon name="send" size={20} /></button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              send(text, await shrinkImage(f, 480, 360));
            } catch {
              showToast('ما گدرنا نقرأ الصورة');
            }
          }}
        />
      </div>
    </div>
  );
}
