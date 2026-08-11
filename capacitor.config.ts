import type { CapacitorConfig } from '@capacitor/cli';

// The Android shell wraps exactly the same dist/ the web and desktop builds
// produce — there is no Android-specific source anywhere in this repo.
//
// Capacitor copies dist/ into the APK's assets and serves it from
// https://localhost, which is a real secure origin. That matters for the same
// reason the desktop shell registers app://: localStorage is keyed to an
// origin, and every scenario and price revision in this app lives there.
const config: CapacitorConfig = {
  appId: 'es.movingout.app',
  appName: 'MovingOut',
  webDir: 'dist',
  android: {
    // --bg from the Independencia token block, same exception as the PWA
    // manifest in vite.config.ts: this is painted by Android before any
    // stylesheet has loaded, so it cannot read tokens.css.
    backgroundColor: '#EFEDE7',
  },
};

export default config;
