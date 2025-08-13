// components/StatsScreen.tsx
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

const StatRow = ({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number | string;
  description?: string;
  color?: string;
}) => {
  const styles = getStyles(useColorScheme());
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelContainer}>
        <Text style={styles.statLabel}>{label}</Text>
        {description && (
          <Text style={styles.statDescription}>{description}</Text>
        )}
      </View>
      <Text
        style={[styles.statValue, { color: color || styles.statValue.color }]}
      >
        {value}
      </Text>
    </View>
  );
};

export default function StatsScreen() {
  const stats = useQuery(api.stats.getStats);
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  if (stats === undefined) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  if (stats === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.statLabel}>Log in to see your stats.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Progress 📊</Text>
      <View style={styles.card}>
        <StatRow
          label="New Words Today"
          value={stats.newToday}
          color="#17a2b8"
        />
        <StatRow
          label="Reviews Due Today"
          value={stats.dueToday}
          color="#28a745"
        />
      </View>

      <Text style={styles.subtitle}>Vocabulary Breakdown</Text>
      <View style={styles.card}>
        <StatRow
          label="Words: Learning"
          value={stats.learning}
          description="Words in short-term steps."
        />
        <StatRow
          label="Words: Learned"
          value={stats.learned}
          description="Words in long-term review."
        />
        <View style={styles.divider} />
        <StatRow label="Total Known Words" value={stats.totalKnown} />

        {/* --- MODIFICATION: Updated Sentence Stats --- */}
        <StatRow
          label="# of most common phrases learned"
          value={stats.sentencesLearnedFlashcard}
          description={`(Highest rank: ${stats.sentencesLearnedRank})`}
        />
        <StatRow
          label="Total Sentences Seen"
          value={stats.totalSentencesSeen}
          description="(Reading & Flashcard modes)"
        />
      </View>
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const cardBackgroundColor = isDark ? "#2a2a2a" : "#fff";
  const textColor = isDark ? "#eee" : "#111";
  const secondaryTextColor = isDark ? "#aaa" : "#666";
  const dividerColor = isDark ? "#444" : "#eee";

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
    subtitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: textColor,
      marginTop: 30,
      marginBottom: 10,
    },
    card: {
      backgroundColor: cardBackgroundColor,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 15,
    },
    statLabelContainer: {
      flex: 1,
      paddingRight: 10,
    },
    statLabel: {
      fontSize: 18,
      color: textColor,
    },
    statDescription: {
      fontSize: 14,
      color: secondaryTextColor,
      paddingTop: 4,
    },
    statValue: {
      fontSize: 22,
      fontWeight: "600",
      color: textColor,
      minWidth: 40,
      textAlign: "right",
    },
    divider: {
      height: 1,
      backgroundColor: dividerColor,
      marginHorizontal: -20,
      marginVertical: 5,
    },
  });
};
