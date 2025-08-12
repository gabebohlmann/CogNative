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

// --- NEW: Table Header Component ---
const TableHeader = () => {
  const styles = getStyles(useColorScheme());
  return (
    <View style={[styles.tableRow, styles.tableHeader]}>
      <Text style={[styles.headerText, { flex: 3 }]}>Word</Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        Due
      </Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        State
      </Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        Reps
      </Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        Range
      </Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        Freq
      </Text>
    </View>
  );
};

// --- NEW: Table Row Component ---
const WordRow = React.memo(({ item, index }: { item: any; index: number }) => {
  const styles = getStyles(useColorScheme());
  const isEvenRow = index % 2 === 0;

  const stateColor =
    item.state === "Learning"
      ? "#17a2b8"
      : item.state === "Relearning"
        ? "#ffc107"
        : item.due === "Due"
          ? "#dc3545"
          : "#28a745";

  return (
    <View style={[styles.tableRow, isEvenRow ? styles.evenRow : {}]}>
      <View style={[styles.tableCell, { flex: 3 }]}>
        <Text style={styles.wordText}>{item.esperanto}</Text>
        <Text style={styles.wordTranslation}>{item.english}</Text>
      </View>
      <Text
        style={[
          styles.tableCell,
          styles.cellText,
          { flex: 1, color: stateColor },
        ]}
      >
        {item.due}
      </Text>
      <Text style={[styles.tableCell, styles.cellText, { flex: 1 }]}>
        {item.state}
      </Text>
      <Text style={[styles.tableCell, styles.cellText, { flex: 1 }]}>
        {item.reps}
      </Text>
      <Text style={[styles.tableCell, styles.cellText, { flex: 1 }]}>
        {item.rangeIndex}
      </Text>
      <Text style={[styles.tableCell, styles.cellText, { flex: 1 }]}>
        {item.freqIndex}
      </Text>
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
      <TableHeader />
      <FlashList
        data={deckWords}
        renderItem={({ item, index }) => <WordRow item={item} index={index} />}
        estimatedItemSize={60} // Adjusted for compact row height
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
  const textColor = isDark ? "#eee" : "#111";
  const secondaryTextColor = isDark ? "#aaa" : "#666";
  const borderColor = isDark ? "#444" : "#ddd";
  const evenRowBg = isDark ? "#2a2a2a" : "#f9f9f9";

  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: isDark ? "#121212" : "#f0f4f8",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: textColor,
      marginBottom: 15,
      paddingHorizontal: 10,
    },
    // --- Table Styles ---
    tableHeader: {
      borderBottomWidth: 2,
      borderColor: borderColor,
      paddingBottom: 10,
    },
    headerText: {
      fontWeight: "bold",
      color: textColor,
      fontSize: 14,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: borderColor,
    },
    evenRow: {
      backgroundColor: evenRowBg,
    },
    tableCell: {
      textAlign: "center",
      color: textColor,
    },
    cellText: {
      fontSize: 16,
    },
    wordText: {
      fontSize: 16,
      fontWeight: "500",
      color: textColor,
    },
    wordTranslation: {
      fontSize: 12,
      color: secondaryTextColor,
    },
    emptyText: {
      marginTop: 50,
      textAlign: "center",
      fontSize: 16,
      color: secondaryTextColor,
    },
  });
};            