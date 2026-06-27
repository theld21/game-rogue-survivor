import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theld21.neon_transporter_gravity_rush',
  appName: 'Neon Transporter Gravity Rush',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false
    }
  }
};

export default config;
