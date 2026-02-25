import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.famiapp.app",
  appName: "FamiApp",
  webDir: "out",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: "APK",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      showSpinner: false,
      androidSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#000000",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
  },
}

export default config
