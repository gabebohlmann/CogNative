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
import { FlashList } from "@shopify/flash-list";
import { GradedWord, GradeKey } from "./GradedWord";

interface SentenceState {
  grades: { [cleanedWord: string]: GradeKey };
}

export default function SentencesScreen() {
  // --- (Existing Hooks) ---
  const sentences = useQuery(api.sentences.getSentences);
  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);
  const userWords = useQuery(api.deck.getDeckWords);
  const convex = useConvex(); // Need convex client for prefetching
  const colorScheme = useColorScheme();

  // --- NEW: State and Refs for Popup ---
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});
  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});

  // --- (Existing State) ---
  const [sentenceStates, setSentenceStates] = useState<{
    [sentenceId: string]: SentenceState;
  }>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const styles = getStyles(colorScheme);

  const userWordMap = useMemo(() => {
    if (!userWords) return new Map();
    return new Map(userWords.map((word) => [word.esperanto, word]));
  }, [userWords]);

  const currentSentence = sentences ? sentences[currentIndex] : null;
  const wordsInCurrentSentence = useMemo(
    () => currentSentence?.sentence.split(/(\s+|[.,!?;"'’“”])/) || [],
    [currentSentence]
  );

  // --- NEW: useEffect to prefetch all translations for all sentences ---
  useEffect(() => {
    if (sentences && Object.keys(translationCache).length === 0) {
      const allText = sentences.map((s) => s.sentence).join(" ");
      const uniqueWords = Array.from(
        new Set(allText.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || [])
      );

      const prefetchTranslations = async () => {
        try {
          const translationsArray = await convex.query(
            api.userWords.getTranslationsForStory,
            { words: uniqueWords }
          );
          setTranslationCache(
            translationsArray.reduce(
              (acc, item) => {
                acc[item.esperanto] = item.english;
                return acc;
              },
              {} as { [key: string]: string }
            )
          );
        } catch (error) {
          console.error("Failed to prefetch sentence translations:", error);
        }
      };
      prefetchTranslations();
    }
  }, [sentences, convex, translationCache]);

  useEffect(() => {
    if (sentences) {
      const initialStates = {};
      for (const sentence of sentences) {
        initialStates[sentence._id] = { grades: {} };
      }
      setSentenceStates(initialStates);
    }
  }, [sentences]);

  const handleWordClick = useCallback(
    (sentenceId: string, cleanedWord: string, index: number) => {
      // --- NEW: Popup display logic ---
      const wordKey = `${sentenceId}-${index}`;
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

      // --- (Existing Grading Logic) ---
      const wordData = userWordMap.get(cleanedWord);
      const dueDateString = wordData?.due;

      if (dueDateString && dueDateString !== "Due") {
        console.log(`Word '${cleanedWord}' is blocked.`);
        return;
      }

      setSentenceStates((prev) => {
        const currentGrades = prev[sentenceId]?.grades || {};
        const currentGrade = currentGrades[cleanedWord] || "default";
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

        return {
          ...prev,
          [sentenceId]: {
            ...prev[sentenceId],
            grades: { ...currentGrades, [cleanedWord]: nextGrade },
          },
        };
      });
    },
    [userWordMap, translationCache]
  );

  const handleSubmit = useCallback(
    (sentenceId: string) => {
      if (!settings || !sentences) return;
      const state = sentenceStates[sentenceId];
      if (!state) return;

      const wordsInSentence = new Set(
        sentences
          .find((s) => s._id === sentenceId)
          ?.sentence.toLowerCase()
          .match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
      );
      for (const word of wordsInSentence) {
        const rating = state.grades[word] || "good";
        gradeWord({ wordText: word, rating, settings }).catch((err) =>
          console.error(`Failed to grade word '${word}':`, err)
        );
      }

      if (currentIndex < sentences.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    [sentenceStates, sentences, settings, gradeWord, currentIndex]
  );

  // --- NEW: Handler to dismiss the popup ---
  const handlePressOutside = useCallback(() => {
    if (popup.visible) {
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [popup.visible]);

  const handleMarkAllGood = useCallback(
    (sentenceId: string) => {
      if (!sentences) return;
      setSentenceStates((prev) => {
        const wordsInSentence =
          sentences
            .find((s) => s._id === sentenceId)
            ?.sentence.match(/[a-zĉĝĥĵŝŭ'’]+/gi) || [];
        const newGrades = {};
        for (const word of wordsInSentence) {
          newGrades[word.toLowerCase()] = "good";
        }
        return {
          ...prev,
          [sentenceId]: { ...prev[sentenceId], grades: newGrades },
        };
      });
    },
    [sentences]
  );

  if (sentences === undefined || userWords === undefined) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  const currentSentenceState = currentSentence
    ? sentenceStates[currentSentence._id]
    : null;

  return (
    <View style={styles.container} onTouchStart={handlePressOutside}>
      <Text style={styles.title}>Sentences Practice</Text>
      <View style={styles.content}>
        {currentSentence && currentSentenceState ? (
          <View style={styles.card}>
            <View style={styles.sentenceContainer}>
              {wordsInCurrentSentence.map((word, index) => {
                const cleanedWord = word.trim().toLowerCase();
                const wordKey = `${currentSentence._id}-${index}`; // Unique key for the ref
                if (
                  cleanedWord.length > 0 &&
                  /^[a-zĉĝĥĵŝŭ'’]+$/.test(cleanedWord)
                ) {
                  const grade =
                    currentSentenceState.grades[cleanedWord] || "default";
                  return (
                    <GradedWord
                      key={wordKey}
                      // NEW: Attach the ref to the component
                      ref={(el) =>
                        (wordRefs.current[wordKey] = el as Pressable)
                      }
                      word={word}
                      onPress={() =>
                        handleWordClick(currentSentence._id, cleanedWord, index)
                      }
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
                onPress={() => handleMarkAllGood(currentSentence._id)}
              >
                <Text style={styles.buttonText}>Mark All Good</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={() => handleSubmit(currentSentence._id)}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No sentences found.</Text>
        )}

        {sentences && sentences.length > 0 && (
          <View style={styles.navContainer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === 0 && styles.disabledButton,
              ]}
              onPress={() => setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <Text style={styles.buttonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.navText}>
              {currentIndex + 1} / {sentences.length}
            </Text>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex >= sentences.length - 1 && styles.disabledButton,
              ]}
              onPress={() => setCurrentIndex(currentIndex + 1)}
              disabled={currentIndex >= sentences.length - 1}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* --- NEW: Render the popup --- */}
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
      minHeight: 150,
    },
    sentenceContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 20,
      alignItems: "center",
    },
    sentenceText: { fontSize: 20, color: textColor, lineHeight: 32 },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: "auto",
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
      fontSize: 16,
      color: isDark ? "#aaa" : "#666",
    },
    navContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
    },
    navButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: "#007bff", // Kept blue for both themes
      borderRadius: 8,
    },
    disabledButton: {
      backgroundColor: isDark ? "#333" : "#ccc",
    },
    navText: {
      fontSize: 16,
      fontWeight: "600",
      color: textColor,
    },
    // --- NEW: Styles for the popup ---
    popup: {
      position: "absolute",
      backgroundColor: popupBgColor,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      maxWidth: 250,
      zIndex: 10,
      transform: [{ translateX: "-50%" }],
    },
    popupText: {
      color: "#fff",
      fontSize: 16,
      textAlign: "center",
    },
  });
};