// app/(tabs)/games.tsx
import { StyleSheet, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GameSelectionScreen from "@/components/GameSelectionScreen"; // Import the new component

export default function GamesTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          {/* <ThemedText type="title">Games</ThemedText> */}
        </ThemedView>
        <GameSelectionScreen />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleContainer: {
    paddingVertical: 16,
  },
});
