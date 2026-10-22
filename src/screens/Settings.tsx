import { useState } from 'react';
import { longDate, tripById } from '../data';
import { Icon } from '../icons';
import { IS_PARTNER } from '../mode';
import { phoneNotify } from '../phoneNotify';
import { useStore, type ChatMsg } from '../store';
import { Sheet, TopBar } from '../ui';

/* ---------- settings ---------- */

const T = {
  ar: { title: 'الإعدادات', lang: 'اللغة', notif: 'الإشعارات', notifSub: 'الحجوزات، تغيير موعد الرحلة، والعروض', test: 'جرّب إشعار على التلفون', testSub: 'يوصلك إشعار بعد ثانية', dark: 'الوضع الليلي', darkSub: 'ألوان غامقة تريّح العين بالليل', danger: 'الحساب', del: 'حذف الحساب', delSub: 'يمسح حسابك وكل حجوزاتك', note: '' },
  en: { title: 'Settings', lang: 'Language', notif: 'Notifications', notifSub: 'Bookings, trip changes and offers', test: 'Send a test notification', testSub: 'Arrives in a second', dark: 'Dark mode', darkSub: 'Easier on the eyes at night', danger: 'Account', del: 'Delete account', delSub: 'Removes your account and bookings', note: 'Demo: this page is translated; the full app translation comes with the real version.' },
  ku: { title: 'ڕێکخستنەکان', lang: 'زمان', notif: 'ئاگادارکردنەوەکان', notifSub: 'حجزەکان، گۆڕینی کاتی گەشت و پێشکەشکراوەکان', test: 'ئاگادارکردنەوەیەکی تاقیکاری بنێرە', testSub: 'دوای چرکەیەک دێت', dark: 'دۆخی شەو', darkSub: 'ڕەنگی تاریک بۆ شەو', danger: 'هەژمار', del: 'سڕینەوەی هەژمار', delSub: 'هەژمار و حجزەکانت دەسڕێتەوە', note: 'نموونە: ئەم پەڕەیە وەرگێڕدراوە؛ وەرگێڕانی تەواو لە وەشانی ڕاستەقینەدا دێت.' },
};

export function Settings() {
  const { lang, notifOn, dark, set, showToast, resetDemo, notify, role, go, bookings } = useStore();
  const t = T[lang];
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState('');
  const test = async () => {
    const r = await phoneNotify('بدربي 🚌', 'هذا إشعار تجريبي. الإشعارات شغّالة ✓');
    notify({ icon: 'bell', tone: 'info', title: 'إشعار تجريبي', body: 'هذا إشعار تجريبي. الإشعارات شغّالة ✓' }, role === 'driver' ? 'captain' : 'passenger');
    showToast(r === 'ok' ? 'انبعث الإشعار — شوف أعلى الشاشة' : r === 'denied' ? 'لازم تسمح بالإشعارات من إعدادات التلفون' : 'هذا الجهاز ما يدعم الإشعارات');
  };
  const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={onClick}><i /></button>
  );
  return (
    <div className="screen gray" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <TopBar title={t.title} />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 30 }}>
        <span className="label">{t.lang}</span>
        <div className="seg">
          {([['ar', 'عربي'], ['en', 'English'], ['ku', 'کوردی']] as const).map(([k, l]) => (
            <button key={k} className={lang === k ? 'on' : ''} onClick={() => set({ lang: k })}>{l}</button>
          ))}
        </div>
        {t.note ? <div className="demo-note" style={{ margin: 0 }}>{t.note}</div> : null}

        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="set-row">
            <span className="ic"><Icon name="bell" size={20} /></span>
            <span className="grow"><b>{t.notif}</b><span>{t.notifSub}</span></span>
            <Toggle label={t.notif} on={notifOn} onClick={() => set({ notifOn: !notifOn })} />
          </div>
          <button className="set-row" disabled={!notifOn} style={{ opacity: notifOn ? 1 : 0.45 }} onClick={() => void test()}>
            <span className="ic"><Icon name="send" size={20} /></span>
            <span className="grow"><b>{t.test}</b><span>{t.testSub}</span></span>
            <Icon name="forward" size={18} />
          </button>
          <div className="set-row" style={{ borderBottom: 0 }}>
            <span className="ic"><Icon name="moon" size={20} /></span>
            <span className="grow"><b>{t.dark}</b><span>{t.darkSub}</span></span>
            <Toggle label={t.dark} on={dark} onClick={() => set({ dark: !dark })} />
          </div>
        </div>

        <span className="label">{t.danger}</span>
        <div className="card" style={{ padding: '4px 14px' }}>
          <button className="set-row" style={{ borderBottom: 0, color: 'var(--alert)' }} onClick={() => setDel(true)}>
            <span className="ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}><Icon name="trash" size={20} /></span>
            <span className="grow"><b>{t.del}</b><span>{t.delSub}</span></span>
            <Icon name="forward" size={18} />
          </button>
        </div>
        {!IS_PARTNER ? (
          <>
            <span className="label">شاشات الأخطاء (للتجربة)</span>
            <div className="card" style={{ padding: '4px 14px' }}>
              {([['wifiOff', 'ما اكو إنترنت', () => window.dispatchEvent(new Event('bdarbi-offline-demo'))], ['x', 'الرحلة انلغت', () => go('tripCancelled', { code: bookings[0]?.code })], ['chair', 'المقعد انحجز هسه', () => go('seatTaken', { tripId: 't00', seats: [7] })]] as [string, string, () => void][]).map(([icon, label, fn], i) => (
                <button key={label} className="set-row" style={i === 2 ? { borderBottom: 0 } : undefined} onClick={fn}>
                  <span className="ic"><Icon name={icon} size={20} /></span>
                  <span className="grow"><b>{label}</b></span>
                  <Icon name="forward" size={18} />
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className="tiny muted center">{IS_PARTNER ? 'كابتن بدربي' : 'بدربي'} · نسخة تجريبية</div>
      </div>

      <Sheet open={del} onClose={() => { setDel(false); setConfirm(''); }} label="حذف الحساب">
        <div className="stack gap12" dir="rtl">
          <span className="forgot-ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)', alignSelf: 'center' }}><Icon name="trash" size={30} /></span>
          <h2 className="h2 center" style={{ margin: 0 }}>متأكد تريد تحذف حسابك؟</h2>
          <p className="muted center" style={{ margin: 0, lineHeight: 1.8 }}>ينمسح حسابك وحجوزاتك ونقاطك ومحفظتك، وما تگدر ترجعهم. الحجوزات الجاية تنلغي وفلوسها ترجعلك.</p>
          <label className="field">
            <span className="small">حتى تأكد، اكتب كلمة <b>احذف</b></span>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="احذف" />
          </label>
          <button className="btn" style={{ background: 'var(--alert)' }} disabled={confirm.trim() !== 'احذف'} onClick={() => { resetDemo(); }}>احذف حسابي نهائياً</button>
          <button className="btn soft" onClick={() => { setDel(false); setConfirm(''); }}>لا، رجّعني</button>
        </div>
      </Sheet>
    </div>
  );
}

/* ---------- help & support ---------- */

const FAQ_PASSENGER: [string, string][] = [
  ['شلون ألغي حجزي وأسترجع فلوسي؟', 'من التذكرة اضغط «إلغاء الحجز» قبل الحركة. إذا دفعت إلكترونياً المبلغ يرجع لنفس طريقة الدفع خلال 24–72 ساعة.'],
  ['الكابتن تأخر، شسوي؟', 'تابع الباص من التذكرة ← «تتبع الباص». إذا التأخير أكثر من نص ساعة، بلّغ عن مشكلة من هنا ونتواصل ويا الكابتن.'],
  ['أگدر أحجز لعائلتي؟', 'إي، اختار «عائلة» بصفحة المقاعد واحجز أكثر من مقعد، واكتب اسم كل مسافر.'],
  ['شنو مقاعد النساء؟', 'المقاعد الوردية للنساء. المسافر الرجل وحده ما يگدر يحجزها، وبحجز العائلة تنحجز لامرأة.'],
  ['نسيت غرض بالباص', 'بلّغ عن مشكلة واختار «نسيت غرض»، ونوصلك ويا الكابتن.'],
  ['شلون تشتغل النقاط والكوبونات؟', 'كل حجز يعطيك نقاط تبدّلها بخصومات من «المكافآت». الكوبون تكتبه بصفحة تأكيد الحجز.'],
];
const FAQ_PARTNER: [string, string][] = [
  ['شوكت توصلني فلوس الرحلة؟', 'الدفع الإلكتروني ينضاف لمحفظتك بعد ما توصل، وتسحبه لبطاقتك. العمولة 5% على الإلكتروني بس.'],
  ['شلون أجدد السنوية أو أبدّل السيارة؟', 'راسل الدعم وارفع صورة السنوية الجديدة، والإدارة تحدّثها.'],
  ['راكب ما عنده تذكرة', 'اطلب منه يفتح التذكرة بالتطبيق، أو دوّر باسمه بقائمة الركاب واضغط «صعد».'],
  ['أگدر ألغي رحلة؟', 'إي من الرئيسية ← «إلغاء». يوصل إشعار للركاب وترجعلهم فلوسهم، وهذا يأثر على تقييمك.'],
];
const PROBLEMS = ['الكابتن تأخر', 'الكابتن ما إجا', 'نسيت غرض', 'مشكلة بالدفع', 'تعامل مو زين', 'شي ثاني'];

export function Help() {
  const { go, bookings, support, set, showToast, role } = useStore();
  const as = IS_PARTNER ? (role === 'agency' ? 'agency' : 'captain') : 'passenger';
  const faq = IS_PARTNER ? FAQ_PARTNER : FAQ_PASSENGER;
  const [open, setOpen] = useState(0);
  const [report, setReport] = useState(false);
  const [code, setCode] = useState(bookings[0]?.code ?? '');
  const [kind, setKind] = useState(PROBLEMS[0]);
  const [text, setText] = useState('');

  const sendReport = () => {
    const b = bookings.find((x) => x.code === code);
    const t = b ? tripById(b.tripId) : undefined;
    const body = `بلاغ عن رحلة: ${kind}${b ? `\nالحجز ${b.code} · ${t ? `${t.from} ← ${t.to}` : ''} · ${longDate(b.date)}` : ''}${text.trim() ? `\n${text.trim()}` : ''}`;
    const msg: ChatMsg = { id: 'm' + Date.now(), from: 'me', text: body, at: Date.now() };
    const reply: ChatMsg = { id: 'm' + (Date.now() + 1), from: 'support', text: 'وصلنا بلاغك ✓ موظف الدعم يتابعه هسه ويرد عليك هنا.', at: Date.now() + 1500 };
    set({ support: { ...support, [as]: [...support[as], msg, reply] } });
    setReport(false);
    setText('');
    showToast('انرسل البلاغ للدعم');
    go('support', { as });
  };

  return (
    <div className="screen gray">
      <TopBar title="المساعدة والدعم" />
      <div className="scroll pad stack gap12" style={{ paddingBottom: 110 }}>
        <div className="help-hero">
          <b>شلون نگدر نساعدك؟</b>
          <span>دوّر بالأسئلة الشائعة، أو بلّغ عن مشكلة، أو راسلنا من الزر الدائري.</span>
        </div>
        {!IS_PARTNER ? (
          <button className="list-item" style={{ background: 'var(--card)', borderRadius: 18, padding: '10px 12px' }} onClick={() => setReport(true)}>
            <span className="ic" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}><Icon name="flag" size={20} /></span>
            <span className="grow"><b style={{ display: 'block' }}>بلّغ عن مشكلة بالرحلة</b><span className="tiny muted">تأخير، غرض ضايع، دفع، أو تعامل</span></span>
            <Icon name="forward" size={18} />
          </button>
        ) : null}
        <h2 className="h3">الأسئلة الشائعة</h2>
        <div className="card" style={{ padding: '2px 14px' }}>
          {faq.map(([q, a], i) => (
            <div key={q} className="faq">
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <b className="grow">{q}</b>
                <span className="faq-sign">{open === i ? '−' : '+'}</span>
              </button>
              {open === i ? <p>{a}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <button className="chat-fab" aria-label="راسل الدعم" onClick={() => go('support', { as })}>
        <Icon name="chat" size={26} />
      </button>

      <Sheet open={report} onClose={() => setReport(false)} label="بلّغ عن مشكلة">
        <div className="stack gap10">
          <h2 className="h3">بلّغ عن مشكلة بالرحلة</h2>
          {bookings.length ? (
            <>
              <span className="label">الحجز</span>
              <div className="row gap6" style={{ flexWrap: 'wrap' }}>
                {bookings.slice(0, 4).map((b) => {
                  const t = tripById(b.tripId);
                  return <button key={b.code} className={`chip ag-chip ${code === b.code ? 'on' : ''}`} style={{ height: 38 }} onClick={() => setCode(b.code)}>{t ? `${t.to}` : ''} · <span className="code">{b.code}</span></button>;
                })}
              </div>
            </>
          ) : <div className="tiny muted">ما عندك حجوزات، بس تگدر تبلّغ عن مشكلة عامة.</div>}
          <span className="label">شنو صار؟</span>
          <div className="row gap6" style={{ flexWrap: 'wrap' }}>
            {PROBLEMS.map((p) => <button key={p} className={`chip ag-chip ${kind === p ? 'on' : ''}`} style={{ height: 36 }} onClick={() => setKind(p)}>{p}</button>)}
          </div>
          <textarea className="input" rows={3} style={{ height: 'auto', padding: 12, resize: 'none' }} placeholder="اشرحلنا بسطرين (اختياري)" value={text} onChange={(e) => setText(e.target.value.slice(0, 400))} />
          <button className="btn" onClick={sendReport}>ارسل البلاغ</button>
        </div>
      </Sheet>
    </div>
  );
}
