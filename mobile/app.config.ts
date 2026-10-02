import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  owner: "matt-transportpls-team",
  name: "MATT Driver",
  slug: "matt-driver",
  version: "5.0.1",
  icon: "../public/pwa/icon-192.png",
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
    ],
    [
      "expo-notifications",
      {
        icon: "../public/pwa/icon-192.png",
        color: "#d4af37",
        defaultChannel: "driver-events"
      }
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "MATT Driver używa lokalizacji do bezpiecznego działania Stripe Tap to Pay."
      }
    ]
  ],
  extra: {
    appUrl: process.env.EXPO_PUBLIC_APP_URL || "https://booking.matt-transport.pl/kierowca",
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://booking.matt-transport.pl",
    stripeTerminalLocationId:
      process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID || null,
    expoProjectId:
      process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || null,
    eas: {
      projectId: "8477a087-c84f-424c-bf09-0695aae0903e"
    }
  }
};

export default config;
