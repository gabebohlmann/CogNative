// components/DeckBrowserScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { FlashList } from "@shopify/flash-list";

const WordHeader = ({
  sortConfig,
  requestSort,
}: {
  sortConfig: any;
  requestSort: (key: string) => void;
}) => {
  const styles = getStyles(useColorScheme());

  const getDirectionIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ▲" : " ▼";
  };

  return (
    <View style={[styles.tableRow, styles.tableHeader]}>
      <Text style={[styles.headerText, { flex: 3 }]}>Word</Text>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => requestSort("due")}>
        <Text style={styles.headerTextClickable}>
          Due{getDirectionIndicator("due")}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        State
      </Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
        Reps
      </Text>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => requestSort("rangeIndex")}
      >
        <Text style={styles.headerTextClickable}>
          Range{getDirectionIndicator("rangeIndex")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => requestSort("freqIndex")}
      >
        <Text style={styles.headerTextClickable}>
          Freq{getDirectionIndicator("freqIndex")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

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
      <View style={[styles.tableCell, { flex: 3, alignItems: "flex-start" }]}>
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

const SentencesView = () => {
  const seenSentences = useQuery(api.deck.getSeenSentences);
  const styles = getStyles(useColorScheme());

  if (seenSentences === undefined) {
    return (
      <ActivityIndicator style={{ flex: 1, marginTop: 20 }} size="large" />
    );
  }

  return (
    <ScrollView>
      {seenSentences.length > 0 ? (
        seenSentences.map((sentence) => (
          <View key={sentence._id} style={styles.sentenceCard}>
            <Text style={styles.sentenceText}>{sentence.sentence}</Text>
            <View style={styles.repsContainer}>
              <Text style={styles.repsText}>Reps: {sentence.reps}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          You haven't reviewed any sentences yet.
        </Text>
      )}
    </ScrollView>
  );
};

export default function DeckBrowserScreen() {
  const [activeView, setActiveView] = useState("words");
  const [sortConfig, setSortConfig] = useState({
    key: "default",
    direction: "ascending",
  });

  const deckWords = useQuery(api.deck.getDeckWords, {
    sortBy: sortConfig.key,
    sortDirection: sortConfig.direction,
  });

  const styles = getStyles(useColorScheme());

  const handleSort = useCallback((key: string) => {
    setSortConfig((currentConfig) => {
      const isAscending =
        currentConfig.key === key && currentConfig.direction === "ascending";
      return {
        key: key,
        direction: isAscending ? "descending" : "ascending",
      };
    });
  }, []);

  const renderWordsView = () => {
    if (deckWords === undefined) {
      return (
        <ActivityIndicator style={{ flex: 1, marginTop: 20 }} size="large" />
      );
    }
    return (
      <>
        <WordHeader sortConfig={sortConfig} requestSort={handleSort} />
        <FlashList
          data={deckWords}
          renderItem={({ item, index }) => (
            <WordRow item={item} index={index} />
          )}
          estimatedItemSize={60}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Your deck is empty.</Text>
          )}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📖 Deck Browser</Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeView === "words" && styles.activeButton,
          ]}
          onPress={() => setActiveView("words")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeView === "words" && styles.activeButtonText,
            ]}
          >
            Words
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeView === "sentences" && styles.activeButton,
          ]}
          onPress={() => setActiveView("sentences")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeView === "sentences" && styles.activeButtonText,
            ]}
          >
            Sentences
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === "words" ? renderWordsView() : <SentencesView />}
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#eee" : "#111";
  const secondaryTextColor = isDark ? "#aaa" : "#666";
  const borderColor = isDark ? "#444" : "#ddd";
  const evenRowBg = isDark ? "#2a2a2a" : "#f9f9f9";
  const inactiveToggleBg = isDark ? "#2a2a2a" : "#e9ecef";
  const activeToggleBg = "#007bff";

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
    toggleContainer: {
      flexDirection: "row",
      marginBottom: 20,
      borderRadius: 8,
      overflow: "hidden",
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: inactiveToggleBg,
    },
    activeButton: {
      backgroundColor: activeToggleBg,
    },
    toggleButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: textColor,
    },
    activeButtonText: {
      color: "#fff",
    },
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
    headerTextClickable: {
      fontWeight: "bold",
      color: textColor,
      fontSize: 14,
      textAlign: "center",
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
      alignItems: "center",
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
    sentenceCard: {
      backgroundColor: isDark ? "#2a2a2a" : "#fff",
      borderRadius: 8,
      padding: 15,
      marginBottom: 10,
    },
    sentenceText: {
      fontSize: 16,
      color: textColor,
      lineHeight: 24,
      paddingBottom: 10,
    },
    repsContainer: {
      alignSelf: "flex-end",
      marginTop: 5,
    },
    repsText: {
      fontSize: 12,
      fontWeight: "600",
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
