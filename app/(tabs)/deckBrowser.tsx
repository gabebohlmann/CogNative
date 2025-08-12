// app/(tabs)/deckBrowser.tsx
import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import DeckBrowser from "@/components/DeckBrowserScreen";
import { ScrollView } from "react-native-gesture-handler";            

export default function DeckBrowserTabScreen() {
  return (
    <ScrollView>
      <ThemedView style={styles.stepContainer}>
        <DeckBrowser />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
