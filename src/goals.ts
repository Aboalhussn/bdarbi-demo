import { useStore } from './store';
import { captainRating } from './screens/Driver';

export interface Goal {
  id: string;
  icon: string;
  title: string;
  hint: string; // how long is left, or what counts
  reward: number; // د.ع added to the wallet
  extra?: string; // a non-cash reward that comes with it
  progress: number;
  target: number;
  unit: string;
  isNew?: boolean;
  claimed: boolean;
}

/** Captain challenges. Earlier progress is demo data; today's trip and scans count live. */
export function useGoals() {
  const { trip, manifest, boardedAt, bookings, goalsClaimed, adminGoals } = useStore();
  const today = manifest().filter((b) => b.status === 'confirmed');
  const scanned = today.filter((b) => boardedAt(b)).length;
  const done = trip.status === 'arrived' ? 1 : 0;
  const cancelled = trip.status === 'cancelled';
  const rating = Number(captainRating(bookings).avg);
  const c = (id: string) => goalsClaimed.includes(id);

  const goals: Goal[] = [
    { id: 'g3in2', icon: 'bus', title: 'خلّص 3 رحلات خلال يومين', hint: 'باقي يوم واحد', reward: 25000, progress: 2 + done, target: 3, unit: 'رحلة', claimed: c('g3in2') },
    ...(c('g3in2')
      ? [{ id: 'gWeekend', icon: 'calendar', title: '4 رحلات بالويكند (خميس وجمعة)', hint: 'يبدي الخميس الجاي', reward: 40000, progress: 0, target: 4, unit: 'رحلة', isNew: true, claimed: c('gWeekend') }]
      : []),
    { id: 'gScan', icon: 'scan', title: 'امسح 15 تذكرة بالتطبيق', hint: 'كل راكب تمسح تذكرته ينحسب', reward: 10000, progress: 12 + scanned, target: 15, unit: 'تذكرة', claimed: c('gScan') },
    { id: 'gWeek', icon: 'trophy', title: '10 رحلات هالأسبوع', hint: 'ينتهي الجمعة', reward: 60000, progress: 7 + done, target: 10, unit: 'رحلة', claimed: c('gWeek') },
    { id: 'gRate', icon: 'star', title: 'حافظ على تقييم ★ 4.8 لآخر الشهر', hint: rating >= 4.8 ? `تقييمك هسه ★ ${rating.toFixed(1)} — ماشي صح` : `تقييمك نزل لـ ★ ${rating.toFixed(1)}`, reward: 40000, extra: 'شارة «كابتن مميّز»', progress: 18, target: 30, unit: 'يوم', claimed: c('gRate') },
    { id: 'gNoCancel', icon: 'shield', title: 'أسبوعين بدون ما تلغي رحلة', hint: cancelled ? 'ألغيت رحلة اليوم، فالعداد رجع من الصفر' : 'كل يوم بدون إلغاء ينحسب', reward: 15000, progress: cancelled ? 0 : 9, target: 14, unit: 'يوم', claimed: c('gNoCancel') },
    ...adminGoals.map((g) => ({ id: g.id, icon: 'trophy', title: g.title, hint: 'تحدي جديد من الإدارة', reward: g.reward, progress: 0, target: g.target, unit: g.unit, isNew: true, claimed: c(g.id) })),
  ];
  const ready = goals.filter((g) => g.progress >= g.target && !g.claimed);
  const won = goals.filter((g) => g.claimed);
  return { goals, ready, won };
}

/** Rewards already collected — they count as wallet money. */
export function claimedRewards(ids: string[]) {
  const all: Record<string, [string, number]> = {
    g3in2: ['3 رحلات خلال يومين', 25000],
    gWeekend: ['4 رحلات بالويكند', 40000],
    gScan: ['امسح 15 تذكرة', 10000],
    gWeek: ['10 رحلات هالأسبوع', 60000],
    gRate: ['تقييم ★ 4.8 لآخر الشهر', 40000],
    gNoCancel: ['أسبوعين بدون إلغاء', 15000],
  };
  return ids.filter((id) => all[id]).map((id) => ({ id, title: all[id][0], amount: all[id][1] }));
}
