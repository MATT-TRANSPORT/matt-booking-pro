import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "MATT Driver",
  slug: "matt-driver",
  version: "5.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  scheme: "mattdriver",
  android: {
    package: "pl.matttransport.driver",
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.NFC"
    ]
  },
  ios: {
    bundleIdentifier: "pl.matttransport.driver",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "MATT Driver używa lokalizacji do bezpiecznego działania Stripe Tap to Pay i funkcji kierowcy."
    }
  },
  plugins: [
    [
      "@stripe/stripe-terminal-react-native",
      {
        tapToPayCheck: true
      }
    ]
  ],
  extra: {
    appUrl: process.env.EXPO_PUBLIC_APP_URL || "https://booking.matt-transport.pl/kierowca",
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://booking.matt-transport.pl",
    stripeTerminalLocationId:
      process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID || null
  }
};

export default config;
