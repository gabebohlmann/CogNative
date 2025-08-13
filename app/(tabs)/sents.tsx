// app/(tabs)/sents.tsx
import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import SentencesScreen from "@/components/SentencesScreen";
// import { ScrollView } from "react-native-gesture-handler";  
import { ScrollView } from "react-native";            

export default function SentencesTabScreen() {
  return (
    <ScrollView>
      <ThemedView style={styles.stepContainer}>
        <SentencesScreen />
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
  