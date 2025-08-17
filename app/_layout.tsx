// app/_layout.tsx
import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React from "react";
import "react-native-reanimated";

import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// --- THEME IMPORTS ---
import { CustomThemeProvider, useColorScheme } from "@/context/ThemeContext"; // Adjust path if needed

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

SplashScreen.preventAutoHideAsync();

// --- AppContent Component ---
// This component now lives inside the context and determines the navigation theme.
function AppContent() {
  const { colorScheme } = useColorScheme(); // Use our custom hook

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  React.useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ClerkLoaded>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* Wrap everything with your new CustomThemeProvider */}
            <CustomThemeProvider>
              <AppContent />
            </CustomThemeProvider>
          </GestureHandlerRootView>
        </ClerkLoaded>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
