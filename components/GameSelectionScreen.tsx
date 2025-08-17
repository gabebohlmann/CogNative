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
import { WordcircleGame } from "./WordcircleGame"; // Corrected component name
import { useColorScheme } from "@/context/ThemeContext"; // Import the theme hook

// --- Game Configuration ---
const gamesList = [
  { id: "wordcircle", name: "Wordcircle", component: WordcircleGame, icon: "📝" },
  { id: "placeholder1", name: "Coming Soon", component: null, icon: "❓" },
  { id: "placeholder2", name: "Coming Soon", component: null, icon: "❓" },
  { id: "placeholder3", name: "Coming Soon", component: null, icon: "❓" },
];

// --- Game Card Component ---
const GameCard = ({ game, onSelect, colorScheme }) => {
  const styles = getStyles(colorScheme); // Use dynamic styles
  return (
    <TouchableOpacity
      style={[styles.card, !game.component && styles.disabledCard]}
      onPress={() => onSelect(game)}
      disabled={!game.component}
    >
      <Text style={styles.cardIcon}>{game.icon}</Text>
      <Text style={styles.cardText}>{game.name}</Text>
    </TouchableOpacity>
  );
};

// --- Main Selection Screen Component ---
export default function GameSelectionScreen() {
  const [selectedGame, setSelectedGame] = useState(null);
  const { colorScheme } = useColorScheme(); // Get the current theme
  const styles = getStyles(colorScheme); // Get dynamic styles

  // If a game is selected, render it and a back button
  if (selectedGame && selectedGame.component) {
    const GameComponent = selectedGame.component;
    return (
      <View
        style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}
      >
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
  // **FIX**: Wrap the ScrollView in a View that has the primary container style.
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {gamesList.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelect={setSelectedGame}
            colorScheme={colorScheme} // Pass theme down
          />
        ))}
      </ScrollView>
    </View>
  );
}

// --- Dynamic Styles Function ---
const getStyles = (colorScheme) => {
  const isDark = colorScheme === "dark";

  const backgroundColor = isDark ? "#000" : "#f0f4f8";
  const cardBackgroundColor = isDark ? "#1e1e1e" : "#fff";
  const textColor = isDark ? "#fff" : "#000";
  const disabledBackgroundColor = isDark ? "#1c1c1e" : "#f0f0f0";
  const backButtonTextColor = isDark ? "#0a84ff" : "#007bff";

  const cardMargin = 10;
  const numColumns = 2;
  const screenWidth = Dimensions.get("window").width;
  // Adjust width calculation to account for container padding
  const cardWidth = (screenWidth - cardMargin * (numColumns + 2)) / numColumns;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: backgroundColor,
    },
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
      backgroundColor: cardBackgroundColor,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    disabledCard: {
      backgroundColor: disabledBackgroundColor,
      opacity: 0.6,
    },
    cardIcon: {
      fontSize: 48,
    },
    cardText: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: "600",
      color: textColor,
    },
    backButton: {
      padding: 15,
      backgroundColor: backgroundColor,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: backButtonTextColor,
    },
  });
};
