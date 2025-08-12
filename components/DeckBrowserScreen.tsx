// components/DeckBrowserScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { FlashList } from "@shopify/flash-list";

// A memoized component to render a single word's stats card
const WordCard = React.memo(({ item }: { item: any }) => {
  const styles = getStyles(useColorScheme());

  const stateColor =
    item.state === "Learning"
      ? "#17a2b8"
      : item.state === "Relearning"
        ? "#ffc107"
        : item.due === "Due"
          ? "#dc3545"
          : "#28a745";

  return (
    <View style={styles.card}>
      <View style={styles.wordHeader}>
        <Text style={styles.wordText}>{item.esperanto}</Text>
        <Text style={styles.wordTranslation}>{item.english}</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Due</Text>
          <Text style={[styles.statValue, { color: stateColor }]}>
            {item.due}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>State</Text>
          <Text style={styles.statValue}>{item.state}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Reps</Text>
          <Text style={styles.statValue}>{item.reps}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Stability</Text>
          <Text style={styles.statValue}>{item.stability}</Text>
        </View>
      </View>
    </View>
  );
});

export default function DeckBrowserScreen() {
  const deckWords = useQuery(api.deck.getDeckWords);
  const styles = getStyles(useColorScheme());

  if (deckWords === undefined) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📖 Deck Browser</Text>
      <FlashList
        data={deckWords}
        renderItem={({ item }) => <WordCard item={item} />}
        estimatedItemSize={135} // Helps with performance
        keyExtractor={(item) => item._id}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>
            Your deck is empty. Start learning words to see them here!
          </Text>
        )}
      />
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const cardBackgroundColor = isDark ? "#2a2a2a" : "#fff";
  const textColor = isDark ? "#eee" : "#111";
  const secondaryTextColor = isDark ? "#aaa" : "#666";

  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDark ? "#121212" : "#f0f4f8",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: textColor,
      marginBottom: 20,
    },
    card: {
      backgroundColor: cardBackgroundColor,
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    wordHeader: {
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#444" : "#eee",
      paddingBottom: 15,
    },
    wordText: {
      fontSize: 22,
      fontWeight: "600",
      color: textColor,
    },
    wordTranslation: {
      fontSize: 16,
      color: secondaryTextColor,
      fontStyle: "italic",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statItem: {
      width: "48%", // Two items per row
      alignItems: "center",
      paddingVertical: 8,
    },
    statLabel: {
      fontSize: 14,
      color: secondaryTextColor,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "500",
      color: textColor,
    },
    emptyText: {
      marginTop: 50,
      textAlign: "center",
      fontSize: 16,
      color: secondaryTextColor,
    },
  });
};