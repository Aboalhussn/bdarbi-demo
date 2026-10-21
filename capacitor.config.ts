import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'iq.bdarbi.demo',
  appName: 'بدربي',
  webDir: 'dist',
  backgroundColor: '#0B0558',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0B0558',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
    StatusBar: { overlaysWebView: false, backgroundColor: '#0B0558', style: 'DARK' },
  },
};

export default config;
