import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Shows a real notification on the phone (or the browser). */
export async function phoneNotify(title: string, body: string, delayMs = 1200, ask = true): Promise<'ok' | 'denied' | 'unsupported'> {
  try {
    if (Capacitor.isNativePlatform()) {
      let p = await LocalNotifications.checkPermissions();
      if (p.display !== 'granted' && ask) p = await LocalNotifications.requestPermissions();
      if (p.display !== 'granted') return 'denied';
      await LocalNotifications.schedule({
        notifications: [{ id: Math.floor(Date.now() % 2000000000), title, body, schedule: { at: new Date(Date.now() + delayMs) }, smallIcon: 'ic_stat_bdarbi', iconColor: '#0B0558' }],
      });
      return 'ok';
    }
    if (!('Notification' in window)) return 'unsupported';
    let perm = Notification.permission;
    if (perm === 'default' && ask) perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    window.setTimeout(() => new Notification(title, { body }), delayMs);
    return 'ok';
  } catch {
    return 'unsupported';
  }
}
