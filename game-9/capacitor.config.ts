import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theld21.aetherdrift',
  appName: 'Aether Drift',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false
    }
  }
};

export default config;
