import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord, GradeKey } from "./GradedWord";
import { Id } from "../convex/_generated/dataModel";

interface SentenceState {
  grades: { [cleanedWord: string]: GradeKey };
}

export default function SentencesScreen() {
  // --- ALL HOOKS MUST BE CALLED AT THE TOP, UNCONDITIONALLY ---
  const [seenSentenceIds, setSeenSentenceIds] = useState<Id<"sentences">[]>([]);
  const [sentenceState, setSentenceState] = useState<SentenceState>({
    grades: {},
  });
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});

  const sentenceQuery = useQuery(api.sentences.getSentenceForReview, {
    seenSentenceIds,
  });
  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);
  const convex = useConvex();
  const colorScheme = useColorScheme();

  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});
  const styles = getStyles(colorScheme);
  const currentSentence = sentenceQuery;

  // This hook, which depends on 'currentSentence', is now also at the top level.
  const wordsInCurrentSentence = useMemo(
    () => currentSentence?.sentence.split(/(\s+|[.,!?;"'’“”])/) || [],
    [currentSentence]
  );

  useEffect(() => {
    if (currentSentence) {
      const uniqueWords = Array.from(
        new Set(
          currentSentence.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
        )
      );
      const prefetchTranslations = async () => {
        try {
          const translationsArray = await convex.query(
            api.userWords.getTranslationsForStory,
            { words: uniqueWords }
          );
          setTranslationCache((prev) => ({
            ...prev,
            ...translationsArray.reduce(
              (acc, item) => {
                acc[item.esperanto] = item.english;
                return acc;
              },
              {} as { [key: string]: string }
            ),
          }));
        } catch (error) {
          console.error("Failed to prefetch sentence translations:", error);
        }
      };
      prefetchTranslations();
    }
  }, [currentSentence, convex]);

  const handleWordClick = useCallback(
    (cleanedWord: string, index: number) => {
      const wordKey = `${currentSentence?._id}-${index}`;
      const translation =
        translationCache[cleanedWord] ||
        translationCache[cleanedWord.slice(0, -1)];
      if (translation) {
        wordRefs.current[wordKey]?.measure((fx, fy, width, height, px, py) => {
          setPopup({
            visible: true,
            text: translation,
            x: px + width / 2,
            y: py - height - 15,
          });
        });
      }

      const currentGrade = sentenceState.grades[cleanedWord] || "default";
      const nextGrade =
        currentGrade === "default"
          ? "again"
          : currentGrade === "again"
            ? "hard"
            : currentGrade === "hard"
              ? "good"
              : currentGrade === "good"
                ? "easy"
                : "again";

      setSentenceState((prev) => ({
        ...prev,
        grades: { ...prev.grades, [cleanedWord]: nextGrade },
      }));
    },
    [sentenceState, translationCache, currentSentence]
  );

  const handleMarkAllGood = useCallback(() => {
    if (!currentSentence) return;
    const wordsInSentence =
      currentSentence.sentence.match(/[a-zĉĝĥĵŝŭ'’]+/gi) || [];
    const newGrades = {};
    for (const word of wordsInSentence) {
      newGrades[word.toLowerCase()] = "good";
    }
    setSentenceState({ grades: newGrades });
  }, [currentSentence]);

  const handleSubmitAndNext = useCallback(() => {
    if (!settings || !currentSentence) return;
    const wordsInSentence = new Set(
      currentSentence.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
    );

    for (const word of wordsInSentence) {
      const rating = sentenceState.grades[word] || "good";
      gradeWord({ wordText: word, rating, settings }).catch((err) =>
        console.error(`Failed to grade word '${word}':`, err)
      );
    }

    setSeenSentenceIds((prev) => [...prev, currentSentence._id]);
    setSentenceState({ grades: {} });
  }, [currentSentence, sentenceState, settings, gradeWord]);

  const handlePressOutside = useCallback(() => {
    if (popup.visible) {
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [popup.visible]);

  // The conditional return for the loading state now comes AFTER all hooks.
  if (sentenceQuery === undefined) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  return (
    <View style={styles.container} onTouchStart={handlePressOutside}>
      <Text style={styles.title}>Sentences Practice</Text>
      <View style={styles.content}>
        {currentSentence ? (
          <View style={styles.card}>
            <View style={styles.sentenceContainer}>
              {wordsInCurrentSentence.map((word, index) => {
                const cleanedWord = word.trim().toLowerCase();
                const wordKey = `${currentSentence._id}-${index}`;
                if (
                  cleanedWord.length > 0 &&
                  /^[a-zĉĝĥĵŝŭ'’]+$/.test(cleanedWord)
                ) {
                  const grade = sentenceState.grades[cleanedWord] || "default";
                  return (
                    <GradedWord
                      key={wordKey}
                      ref={(el) =>
                        (wordRefs.current[wordKey] = el as Pressable)
                      }
                      word={word}
                      onPress={() => handleWordClick(cleanedWord, index)}
                      grade={grade}
                      fontSize={20}
                    />
                  );
                }
                return (
                  <Text key={wordKey} style={styles.sentenceText}>
                    {word}
                  </Text>
                );
              })}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllGood}
              >
                <Text style={styles.buttonText}>Mark All Good</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleSubmitAndNext}
              >
                <Text style={styles.buttonText}>Submit & Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              🎉 No more sentences for now. Well done!
            </Text>
          </View>
        )}
      </View>
      {popup.visible && (
        <View
          style={[styles.popup, { top: popup.y, left: popup.x }]}
          pointerEvents="none"
        >
          <Text style={styles.popupText}>{popup.text}</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#eee" : "#111";
  const popupBgColor = isDark
    ? "rgba(50, 50, 50, 0.9)"
    : "rgba(30, 30, 30, 0.9)";
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDark ? "#121212" : "#f0f4f8",
    },
    content: { flex: 1, justifyContent: "center" },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: textColor,
      marginBottom: 20,
      textAlign: "center",
    },
    card: {
      backgroundColor: isDark ? "#2a2a2a" : "#fff",
      borderRadius: 12,
      padding: 20,
      minHeight: 200,
      justifyContent: "space-between",
    },
    sentenceContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    sentenceText: { fontSize: 20, color: textColor, lineHeight: 32 },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      paddingTop: 20,
    },
    actionButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: isDark ? "#444" : "#ddd",
    },
    submitButton: { backgroundColor: "#28a745" },
    buttonText: { color: isDark ? "#eee" : "#111", fontWeight: "600" },
    emptyText: {
      textAlign: "center",
      fontSize: 18,
      color: isDark ? "#aaa" : "#666",
    },
    popup: {
      position: "absolute",
      backgroundColor: popupBgColor,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      zIndex: 10,
      transform: [{ translateX: "-50%" }],
    },
    popupText: { color: "#fff", fontSize: 16, textAlign: "center" },
  });
};
