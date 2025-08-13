import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { FlashList } from "@shopify/flash-list";

// --- Custom hook to debounce user input for performance ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- COLUMN CONFIGURATIONS ---
const wordColumns = [
  {
    key: "word",
    title: "Word",
    flex: 2.5,
    isSortable: false,
    render: WordCell,
  },
  { key: "due", title: "Due", flex: 1, isSortable: true },
  { key: "state", title: "State", flex: 1.2, isSortable: false },
  { key: "reps", title: "Reps", flex: 0.8, isSortable: false },
  { key: "rangeIndex", title: "Range", flex: 1, isSortable: true },
  { key: "freqIndex", title: "Freq", flex: 1, isSortable: true },
];

const sentenceColumns = [
  { key: "text", title: "Sentence", flex: 3, isSortable: false },
  { key: "due", title: "Due", flex: 1, isSortable: false },
  { key: "state", title: "State", flex: 1.2, isSortable: false },
  { key: "reps", title: "Reps", flex: 0.8, isSortable: false },
  { key: "avg_rank", title: "Avg Rank", flex: 1.2, isSortable: false },
];

function WordCell({ item }) {
  const styles = getStyles(useColorScheme());
  return (
    <View>
      <Text style={styles.wordText}>{item.esperanto}</Text>
      <Text style={styles.wordTranslation}>{item.english}</Text>
    </View>
  );
}

// --- REUSABLE TABLE COMPONENT ---
const TableView = ({
  columns,
  data,
  sortConfig,
  requestSort,
  estimatedItemSize = 60,
}) => {
  const styles = getStyles(useColorScheme());
  const getDirectionIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ▲" : " ▼";
  };
  const TableRow = React.memo(({ item, index }) => {
    const isEvenRow = index % 2 === 0;
    return (
      <View style={[styles.tableRow, isEvenRow && styles.evenRow]}>
        {columns.map((column) => {
          const CellRenderer = column.render;
          const cellStyle = [styles.tableCell, { flex: column.flex }];
          if (CellRenderer) {
            return (
              <View key={column.key} style={cellStyle}>
                <CellRenderer item={item} />
              </View>
            );
          }
          return (
            <Text key={column.key} style={cellStyle}>
              {item[column.key]}
            </Text>
          );
        })}
      </View>
    );
  });
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        {columns.map((column) => (
          <TouchableOpacity
            key={column.key}
            style={{ flex: column.flex }}
            onPress={() => column.isSortable && requestSort(column.key)}
            disabled={!column.isSortable}
          >
            <Text style={styles.headerText}>
              {column.title}
              {column.isSortable && getDirectionIndicator(column.key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlashList
        data={data}
        renderItem={({ item, index }) => <TableRow item={item} index={index} />}
        estimatedItemSize={estimatedItemSize}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No data available.</Text>
        )}
      />
    </View>
  );
};

export default function DeckBrowserScreen() {
  const [activeView, setActiveView] = useState("words");
  const [sortConfig, setSortConfig] = useState({
    key: "default",
    direction: "ascending",
  });
  const [filterText, setFilterText] = useState("");
  const debouncedFilter = useDebounce(filterText, 300);

  const deckWords = useQuery(api.deck.getDeckWords, {
    sortBy: sortConfig.key,
    sortDirection: sortConfig.direction,
    filter: debouncedFilter || undefined,
  });
  const seenSentences = useQuery(api.deck.getSeenSentences, {
    filter: debouncedFilter || undefined,
  });
  const styles = getStyles(useColorScheme());

  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => ({
      key: key,
      direction:
        current.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }, []);

  const renderContent = () => {
    if (activeView === "words") {
      if (deckWords === undefined)
        return <ActivityIndicator style={{ flex: 1 }} size="large" />;
      return (
        <TableView
          columns={wordColumns}
          data={deckWords}
          sortConfig={sortConfig}
          requestSort={handleSort}
        />
      );
    } else {
      if (seenSentences === undefined)
        return <ActivityIndicator style={{ flex: 1 }} size="large" />;
      return <TableView columns={sentenceColumns} data={seenSentences} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📖 Deck Browser</Text>
      <TextInput
        style={styles.filterInput}
        placeholder={
          activeView === "words" ? "Filter words..." : "Filter sentences..."
        }
        placeholderTextColor={styles.secondaryText.color}
        value={filterText}
        onChangeText={setFilterText}
      />
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeView === "words" && styles.activeButton,
          ]}
          // MODIFICATION: Added setFilterText('') to clear the filter on view change.
          onPress={() => {
            setActiveView("words");
            setFilterText("");
          }}
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
          // MODIFICATION: Added setFilterText('') to clear the filter on view change.
          onPress={() => {
            setActiveView("sentences");
            setFilterText("");
          }}
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
      {renderContent()}
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#eee" : "#222";
  const secondaryTextColor = isDark ? "#aaa" : "#555";
  const borderColor = isDark ? "#444" : "#ddd";
  const evenRowBg = isDark ? "#2a2a2a" : "#f9f9f9";
  const inactiveToggleBg = isDark ? "#2a2a2a" : "#e9ecef";
  const activeToggleBg = "#007bff";
  const inputBg = isDark ? "#2a2a2a" : "#fff";

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
      marginBottom: 15,
      borderRadius: 8,
      overflow: "hidden",
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: inactiveToggleBg,
    },
    activeButton: { backgroundColor: activeToggleBg },
    toggleButtonText: { fontSize: 16, fontWeight: "600", color: textColor },
    activeButtonText: { color: "#fff" },
    tableHeader: {
      borderBottomWidth: 2,
      borderColor: isDark ? "#666" : "#bbb",
      paddingBottom: 10,
    },
    headerText: {
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
    evenRow: { backgroundColor: evenRowBg },
    tableCell: {
      textAlign: "center",
      color: textColor,
      fontSize: 15,
      alignItems: "flex-start",
    },
    wordText: { fontSize: 16, fontWeight: "500", color: textColor },
    wordTranslation: { fontSize: 12, color: secondaryTextColor },
    emptyText: {
      marginTop: 50,
      textAlign: "center",
      fontSize: 16,
      color: secondaryTextColor,
    },
    secondaryText: { color: secondaryTextColor },
    filterInput: {
      backgroundColor: inputBg,
      color: textColor,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 8,
      fontSize: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: borderColor,
    },
  });
};
