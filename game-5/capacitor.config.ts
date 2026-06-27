import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theld21.cosmic_miner_star_horizon',
  appName: 'CosmicMiner',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false
    }
  }
};

export default config;
