import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { fmt12, garageById, longDate, money, type Trip } from './data';
import { ticketPayload, type Booking } from './store';

const W = 1080;
const NAVY = '#0B0558';
const GOLD = '#F5B83D';
const INK = '#15122E';
const SLATE = '#5D5A73';
const LINE = '#E4E2EE';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image ' + src));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'right') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.direction = 'rtl';
  ctx.fillText(s, x, y);
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string, dash = [18, 12], width = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/** Draws the whole ticket — every detail plus the QR — as a 1080×1920 PNG. */
export async function renderTicket(b: Booking, trip: Trip, boardedAt?: string): Promise<string> {
  const D = "'Alexandria', 'IBM Plex Sans Arabic', sans-serif";
  const T = "'IBM Plex Sans Arabic', sans-serif";
  try {
    await Promise.all([`800 60px ${D}`, `700 40px ${D}`, `700 36px ${T}`, `400 32px ${T}`].map((f) => document.fonts.load(f, 'بدربي 0123')));
  } catch {
    /* fall back to system fonts */
  }

  // Card height follows its content; the picture's height follows the card.
  const banner = boardedAt || b.status === 'cancelled' ? 96 : 0;
  const cy = 520;
  const ch = banner + 1240;
  const H = cy + ch + 130;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const garage = garageById(trip.garageId);

  // Background with the brand's diagonal pattern.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 2;
  for (let i = -H; i < W + H; i += 52) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H * 0.58, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, H);
    ctx.lineTo(i + H * 0.58, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Header: logo, name, title, mascot on the right.
  const [logo, mascot] = await Promise.all([loadImage('./img/logo-mark-white.png'), loadImage('./img/mascot.png')]);
  const mh = 410;
  const mw = (mascot.width / mascot.height) * mh;
  ctx.drawImage(mascot, W - 70 - mw, 70, mw, mh);
  ctx.drawImage(logo, 80, 90, 92, 92);
  text(ctx, 'بدربي', 190, 158, `800 54px ${D}`, '#FFFFFF', 'left');
  const titleX = W - 70 - mw - 40;
  text(ctx, 'تذكرة سفر', titleX, 290, `800 84px ${D}`, '#FFFFFF');
  text(ctx, `${trip.from} ← ${trip.to}`, titleX, 370, `700 42px ${T}`, 'rgba(255,255,255,0.85)');
  text(ctx, 'مقعدك محجوز... بدربك', titleX, 436, `700 34px ${D}`, GOLD);

  // White ticket card.
  const cx = 60;
  const cw = W - 120;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cx, cy, cw, ch, 48);
  ctx.fill();
  const R = cx + cw - 56; // right edge for RTL text
  const L = cx + 56;

  let y = cy;
  if (boardedAt || b.status === 'cancelled') {
    ctx.save();
    roundRect(ctx, cx, cy, cw, 96, 48);
    ctx.clip();
    ctx.fillStyle = b.status === 'cancelled' ? '#FBE3E7' : '#E6F4EC';
    ctx.fillRect(cx, cy, cw, 96);
    ctx.restore();
    text(ctx, b.status === 'cancelled' ? 'هذا الحجز ملغي' : `صعدت ✓ ${fmt12(boardedAt!)}`, R, cy + 62, `700 38px ${T}`, b.status === 'cancelled' ? '#9E2F41' : '#1C6B3E');
    y += 96;
  }

  y += 90;
  text(ctx, trip.company, R, y, `700 40px ${T}`, INK);
  text(ctx, `#${b.code}`, L, y, `700 36px ${D}`, SLATE, 'left');

  // Times and cities.
  y += 130;
  text(ctx, fmt12(trip.time), R, y, `800 76px ${D}`, NAVY);
  text(ctx, fmt12(trip.arrive), L, y, `800 76px ${D}`, NAVY, 'left');
  dashed(ctx, L + 330, R - 330, y - 26, '#B9B5D3');
  text(ctx, trip.duration, W / 2, y - 50, `500 30px ${T}`, SLATE, 'center');
  y += 62;
  text(ctx, `${trip.from} · ${garage.name}`, R, y, `500 34px ${T}`, SLATE);
  text(ctx, trip.to, L, y, `500 34px ${T}`, SLATE, 'left');

  // Date / seats / platform.
  y += 100;
  const col = (cw - 112) / 3;
  const cells: [string, string][] = [
    ['التاريخ', longDate(b.date)],
    ['المقاعد', b.seats.join('، ')],
    ['الرصيف', trip.platform],
  ];
  cells.forEach(([k, v], i) => {
    const x = R - i * col;
    text(ctx, k, x, y, `500 30px ${T}`, SLATE);
    text(ctx, v, x, y + 56, `700 40px ${T}`, INK);
  });

  y += 130;
  ctx.fillStyle = LINE;
  ctx.fillRect(L, y, cw - 112, 2);
  y += 70;
  text(ctx, 'المسافر', R, y, `500 30px ${T}`, SLATE);
  text(ctx, 'المبلغ', L, y, `500 30px ${T}`, SLATE, 'left');
  y += 56;
  text(ctx, b.name, R, y, `700 40px ${T}`, INK);
  text(ctx, `${money(b.total)} د.ع`, L, y, `800 42px ${D}`, NAVY, 'left');
  y += 52;
  text(ctx, `الدفع: ${b.pay}`, R, y, `500 30px ${T}`, SLATE);
  text(ctx, `${trip.kind} · ${trip.capacity} مقعد`, L, y, `500 30px ${T}`, SLATE, 'left');

  // Perforation.
  y += 70;
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.arc(cx, y, 28, 0, Math.PI * 2);
  ctx.arc(cx + cw, y, 28, 0, Math.PI * 2);
  ctx.fill();
  dashed(ctx, cx + 50, cx + cw - 50, y, LINE, [20, 14], 4);

  // QR and booking code.
  y += 50;
  const qrSize = 360;
  const qr = await QRCode.toDataURL(ticketPayload(b), { margin: 1, width: qrSize, errorCorrectionLevel: 'M', color: { dark: NAVY, light: '#FFFFFF' } });
  const qrImg = await loadImage(qr);
  const qx = R - qrSize;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  roundRect(ctx, qx - 14, y - 14, qrSize + 28, qrSize + 28, 26);
  ctx.stroke();
  ctx.drawImage(qrImg, qx, y, qrSize, qrSize);
  const tx = qx - 50;
  text(ctx, 'اعرض الرمز للسائق', tx, y + 70, `700 40px ${T}`, INK);
  text(ctx, 'إذا ما اشتغل المسح، السائق', tx, y + 130, `400 30px ${T}`, SLATE);
  text(ctx, 'يكتب رمز الحجز:', tx, y + 172, `400 30px ${T}`, SLATE);
  ctx.save();
  ctx.font = `800 64px ${D}`;
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'right';
  ctx.direction = 'ltr';
  ctx.letterSpacing = '8px';
  ctx.fillText(b.code, tx, y + 270);
  ctx.restore();

  text(ctx, 'كون بالكراج قبل الحركة بـ 30 دقيقة', W / 2, cy + ch + 74, `500 32px ${T}`, 'rgba(255,255,255,0.75)', 'center');
  return c.toDataURL('image/png');
}

/**
 * Saves the ticket picture. On the phone it goes to Pictures/Bdarbi (shows in the gallery);
 * if that is not allowed it opens the share sheet so the user can save it anywhere.
 */
export async function saveTicketImage(dataUrl: string, code: string): Promise<'saved' | 'shared' | 'downloaded'> {
  const fileName = `bdarbi-ticket-${code}.png`;
  if (!Capacitor.isNativePlatform()) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  }
  const data = dataUrl.split(',')[1];
  try {
    try {
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== 'granted') await Filesystem.requestPermissions();
    } catch {
      /* not needed on newer Android */
    }
    await Filesystem.writeFile({ path: `Pictures/Bdarbi/${fileName}`, data, directory: Directory.ExternalStorage, recursive: true });
    return 'saved';
  } catch {
    const tmp = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title: 'تذكرة بدربي', files: [tmp.uri], dialogTitle: 'احفظ صورة التذكرة' });
    return 'shared';
  }
}
