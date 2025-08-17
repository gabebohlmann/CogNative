// components/GameSelectionScreen.tsx
// components/GameSelectionScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { WordcircleGame } from "./WordcircleGame"; // Assuming WordscapeGame is in the same directory

// --- Game Configuration ---
// When you create new games, add them to this array.
const gamesList = [
  { id: "wordcircle", name: "Wordcircle", component: WordcircleGame, icon: "📝" },
  { id: "placeholder1", name: "Coming Soon", component: null, icon: "❓" },
  { id: "placeholder2", name: "Coming Soon", component: null, icon: "❓" },
  { id: "placeholder3", name: "Coming Soon", component: null, icon: "❓" },
];

// --- Game Card Component ---
const GameCard = ({ game, onSelect }) => (
  <TouchableOpacity
    style={[styles.card, !game.component && styles.disabledCard]}
    onPress={() => onSelect(game)}
    disabled={!game.component}
  >
    <Text style={styles.cardIcon}>{game.icon}</Text>
    <Text style={styles.cardText}>{game.name}</Text>
  </TouchableOpacity>
);

// --- Main Selection Screen Component ---
export default function GameSelectionScreen() {
  const [selectedGame, setSelectedGame] = useState(null);

  // If a game is selected, render it and a back button
  if (selectedGame && selectedGame.component) {
    const GameComponent = selectedGame.component;
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => setSelectedGame(null)}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back to Games</Text>
        </TouchableOpacity>
        <GameComponent />
      </View>
    );
  }

  // Otherwise, render the grid of game cards
  return (
    <ScrollView contentContainerStyle={styles.gridContainer}>
      {gamesList.map((game) => (
        <GameCard key={game.id} game={game} onSelect={setSelectedGame} />
      ))}
    </ScrollView>
  );
}

// --- Styles ---
const cardMargin = 10;
const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - cardMargin * (numColumns + 1);

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    padding: cardMargin,
  },
  card: {
    width: cardWidth,
    height: cardWidth,
    margin: cardMargin / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    backgroundColor: "#f0f0f0",
    opacity: 0.6,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 15,
    backgroundColor: "#f0f4f8",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
  },
});
