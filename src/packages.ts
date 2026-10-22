/** Office trip packages (سفرات المكاتب): a trip with a hotel, meals and a day-by-day plan. */

export type PkgArt = 'mountain' | 'shrine' | 'river';

export interface PlanItem {
  time: string; // HH:MM
  title: string;
  note: string;
}

export interface PlanDay {
  title: string;
  items: PlanItem[];
}

export const INCLUDES = [
  { id: 'transport', name: 'النقل', icon: 'bus' },
  { id: 'hotel', name: 'الفندق', icon: 'hotel' },
  { id: 'breakfast', name: 'الفطور', icon: 'cup' },
  { id: 'lunch', name: 'الغدا', icon: 'plate' },
  { id: 'dinner', name: 'العشا', icon: 'moon' },
  { id: 'guide', name: 'مرشد', icon: 'flag' },
  { id: 'tickets', name: 'تذاكر الدخول', icon: 'ticket' },
  { id: 'insurance', name: 'التأمين', icon: 'shield' },
] as const;

export type IncludeId = (typeof INCLUDES)[number]['id'];

export const PKG_TYPES = ['سياحية', 'زيارة دينية', 'عائلية', 'شبابية', 'نسائية'] as const;

export interface Package {
  id: string;
  office: string;
  officeRating: string;
  mine: boolean; // made by the signed-in demo office
  title: string;
  type: string;
  photos: string[]; // uploaded (small JPEG data URLs)
  art: PkgArt; // drawn cover when there are no photos
  from: string;
  to: string;
  meetGarageId: string;
  meetNote: string;
  desc: string;
  date: string;
  time: string;
  backDate: string;
  backTime: string;
  vehicleId: string;
  vehicleLabel: string;
  seats: number;
  booked: number;
  deadline: 'day' | 'hours12' | 'none';
  includes: IncludeId[];
  details: Partial<Record<IncludeId, string>>; // the short line under each included service
  hotel?: { name: string; stars: number; nights: number };
  plan: PlanDay[];
  priceAdult: number;
  priceChild: number;
  priceSingle: number;
  payMode: 'deposit' | 'full';
  deposit: number;
  cancelDays: number; // free cancellation until N days before
  docs: string[];
  createdAt: number;
}

export interface PkgBooking {
  code: string;
  pkgId: string;
  name: string;
  phone: string;
  adults: number;
  children: number;
  single: boolean;
  total: number;
  paid: number; // what was paid in the app (deposit or all)
  pay: string;
  status: 'confirmed' | 'cancelled';
  createdAt: number;
}

export function nightsOf(p: Pick<Package, 'date' | 'backDate'>) {
  const a = new Date(`${p.date}T12:00:00`).getTime();
  const b = new Date(`${p.backDate}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function durationLabel(p: Pick<Package, 'date' | 'backDate'>) {
  const n = nightsOf(p);
  const days = n + 1;
  const d = days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : `${days} أيام`;
  const nights = n === 0 ? '' : n === 1 ? ' · ليلة' : n === 2 ? ' · ليلتين' : ` · ${n} ليالي`;
  return d + nights;
}

export function pkgTotal(p: Package, adults: number, children: number, single: boolean) {
  return adults * p.priceAdult + children * p.priceChild + (single ? p.priceSingle : 0);
}

function addDaysIso(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedPackages(today: string): Package[] {
  const base = { photos: [], meetNote: '', deadline: 'day' as const, createdAt: 0, docs: ['البطاقة الوطنية'] };
  const d1 = addDaysIso(today, 7);
  const d2 = addDaysIso(today, 8);
  const d3 = addDaysIso(today, 14);
  return [
    {
      ...base,
      id: 'p1',
      office: 'مكتب دجلة للسفر والسياحة',
      officeRating: '4.8',
      mine: true,
      title: 'سفرة شقلاوة وجنديان',
      type: 'سياحية',
      art: 'mountain',
      from: 'بغداد',
      to: 'أربيل',
      meetGarageId: 'nahda',
      meetNote: 'البوابة الرئيسية',
      desc: '3 أيام بين جبال شقلاوة وشلالات جنديان، مع سهرة بسوق أربيل والقلعة.',
      date: d1,
      time: '06:00',
      backDate: addDaysIso(d1, 2),
      backTime: '16:00',
      vehicleId: 'v2',
      vehicleLabel: 'كوستر 14',
      seats: 14,
      booked: 10,
      includes: ['transport', 'hotel', 'breakfast', 'dinner', 'guide'],
      details: { transport: 'كوستر 14 مقعد ذهاب وإياب', hotel: 'شقلاوة الجبلي 4★ · ليلتين', breakfast: 'كل يوم بالفندق', dinner: 'ليلتين بالفندق', guide: 'وياكم طول الرحلة' },
      hotel: { name: 'فندق شقلاوة الجبلي', stars: 4, nights: 2 },
      plan: [
        { title: 'الطريق إلى شقلاوة', items: [
          { time: '06:00', title: 'التجمع والانطلاق', note: 'كراج النهضة · البوابة الرئيسية' },
          { time: '09:30', title: 'استراحة وفطور', note: 'مطعم على طريق كركوك' },
          { time: '14:00', title: 'الوصول والتسكين', note: 'استلام الغرف وراحة' },
          { time: '19:00', title: 'سهرة بسوق شقلاوة', note: 'وعشا بالفندق' },
        ] },
        { title: 'جنديان وكلي علي بيك', items: [
          { time: '08:00', title: 'فطور بالفندق', note: '' },
          { time: '09:30', title: 'شلالات جنديان', note: 'ساعتين تمشي وتصوير' },
          { time: '13:00', title: 'غدا حر', note: 'على حسابك · المرشد يدلّك على مطاعم' },
          { time: '15:00', title: 'شلال كلي علي بيك', note: 'ورجعة للفندق وعشا' },
        ] },
        { title: 'أربيل والرجعة', items: [
          { time: '08:00', title: 'فطور وتسليم الغرف', note: '' },
          { time: '10:30', title: 'قلعة أربيل والسوق القديم', note: 'وقت حر للتسوق' },
          { time: '16:00', title: 'انطلاق الرجعة', note: 'الوصول لبغداد حوالي 9 بالليل' },
        ] },
      ],
      priceAdult: 175000,
      priceChild: 100000,
      priceSingle: 40000,
      payMode: 'deposit',
      deposit: 50000,
      cancelDays: 3,
    },
    {
      ...base,
      id: 'p2',
      office: 'سفريات الحسين',
      officeRating: '4.8',
      mine: false,
      title: 'زيارة كربلاء والنجف',
      type: 'زيارة دينية',
      art: 'shrine',
      from: 'بغداد',
      to: 'كربلاء المقدسة',
      meetGarageId: 'allawi',
      desc: 'زيارة يوم واحد للعتبات بكربلاء والنجف، ويا غدا ورجعة بالليل.',
      date: d2,
      time: '05:30',
      backDate: d2,
      backTime: '21:00',
      vehicleId: '',
      vehicleLabel: 'باص 40',
      seats: 40,
      booked: 29,
      includes: ['transport', 'lunch'],
      details: { transport: 'باص 40 مقعد ذهاب وإياب', lunch: 'وجبة غدا بكربلاء' },
      plan: [
        { title: 'كربلاء والنجف', items: [
          { time: '05:30', title: 'التجمع والانطلاق', note: 'كراج العلاوي' },
          { time: '08:00', title: 'زيارة الإمام الحسين والعباس (ع)', note: 'ساعتين ونص' },
          { time: '12:30', title: 'غدا', note: 'مطعم قرب الحرم' },
          { time: '15:00', title: 'زيارة الإمام علي (ع) بالنجف', note: '' },
          { time: '19:00', title: 'انطلاق الرجعة', note: 'الوصول لبغداد حوالي 9 بالليل' },
        ] },
      ],
      priceAdult: 35000,
      priceChild: 25000,
      priceSingle: 0,
      payMode: 'full',
      deposit: 0,
      cancelDays: 1,
    },
    {
      ...base,
      id: 'p3',
      office: 'الخطوط الذهبية',
      officeRating: '4.7',
      mine: false,
      title: 'عائلية: البصرة وشط العرب',
      type: 'عائلية',
      art: 'river',
      from: 'بغداد',
      to: 'البصرة',
      meetGarageId: 'nahda',
      desc: 'يومين بالبصرة: جولة بشط العرب بالبلم، والكورنيش، وسوق العشار.',
      date: d3,
      time: '07:00',
      backDate: addDaysIso(d3, 1),
      backTime: '15:00',
      vehicleId: '',
      vehicleLabel: 'باص 40',
      seats: 40,
      booked: 18,
      includes: ['transport', 'hotel', 'breakfast', 'tickets'],
      details: { transport: 'باص VIP ذهاب وإياب', hotel: 'فندق شط العرب 4★ · ليلة', breakfast: 'بالفندق', tickets: 'جولة البلم بشط العرب' },
      hotel: { name: 'فندق شط العرب', stars: 4, nights: 1 },
      plan: [
        { title: 'الطريق والكورنيش', items: [
          { time: '07:00', title: 'الانطلاق', note: 'كراج النهضة' },
          { time: '14:00', title: 'الوصول والتسكين', note: '' },
          { time: '18:00', title: 'كورنيش شط العرب وجولة البلم', note: '' },
        ] },
        { title: 'سوق العشار والرجعة', items: [
          { time: '09:00', title: 'سوق العشار', note: 'وقت حر' },
          { time: '15:00', title: 'انطلاق الرجعة', note: '' },
        ] },
      ],
      priceAdult: 120000,
      priceChild: 70000,
      priceSingle: 30000,
      payMode: 'deposit',
      deposit: 40000,
      cancelDays: 3,
    },
  ];
}
