// app/(tabs)/reading.tsx
// app/(tabs)/index.tsx
import { StyleSheet } from "react-native";
import ReadingScreen from "@/components/ReadingScreen";
import { ScrollView } from "react-native";

export default function ReadingTabScreen() {
  return (
    <ScrollView style={styles.stepContainer}>
      <ReadingScreen />
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
