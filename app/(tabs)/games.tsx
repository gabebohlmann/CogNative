// app/(tabs)/games.tsx
import { StyleSheet, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GameSelectionScreen from "@/components/GameSelectionScreen"; // Import the new component
import { useColorScheme } from "@/context/ThemeContext"; // Import the theme hook

export default function GamesTabScreen() {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView
        style={[
          styles.container,
          { backgroundColor: colorScheme === "dark" ? "#121212" : "#FFFFFF" }
        ]}
      >
        {/* <ThemedView style={styles.titleContainer}> */}
          {/* <ThemedText type="title">Games</ThemedText> */}
        {/* </ThemedView> */}
        <GameSelectionScreen />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    // backgroundColor will be set inline based on colorScheme
  },
  titleContainer: {
    paddingVertical: 16,
  },
});
