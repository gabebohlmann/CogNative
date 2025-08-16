// components/MiniGamesScreen.tsx
// components/MinigamesScreen.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { WordscapeGame } from "./WordscapeGame";

export default function MinigamesScreen() {
  return (
    <View style={styles.container}>
      <WordscapeGame />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
});
