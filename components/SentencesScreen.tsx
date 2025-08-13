// components/SentencesScreen.tsx
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
import { FlashcardPlayer } from "./FlashcardPlayer";

interface SentenceState {
  grades: { [cleanedWord: string]: GradeKey };
}

// --- Sub-component for the Reading Mode View ---
const SentenceReadingView = ({
  sentence,
  sentenceState,
  onWordClick,
  onMarkAllGood,
  onSubmit,
  wordRefs,
}) => {
  const styles = getStyles(useColorScheme());
  const wordsInSentence = useMemo(
    () => sentence?.sentence.split(/(\s+|[.,!?;"'’“”])/) || [],
    [sentence]
  );

  if (!sentence) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          🎉 No more sentences to review in this mode. Well done!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.sentenceContainer}>
        {wordsInSentence.map((word, index) => {
          const cleanedWord = word.trim().toLowerCase();
          const wordKey = `${sentence._id}-${index}`;
          if (cleanedWord.length > 0 && /^[a-zĉĝĥĵŝŭ'’]+$/.test(cleanedWord)) {
            const grade = sentenceState.grades[cleanedWord] || "default";
            return (
              <GradedWord
                key={wordKey}
                ref={(el) => (wordRefs.current[wordKey] = el as Pressable)}
                word={word}
                onPress={() => onWordClick(cleanedWord, wordKey)}
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
        <TouchableOpacity style={styles.actionButton} onPress={onMarkAllGood}>
          <Text style={styles.buttonText}>Mark All Good</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.submitButton]}
          onPress={onSubmit}
        >
          <Text style={styles.buttonText}>Submit & Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Sub-component for the Flashcard View ---
const SentenceFlashcard = ({ onGrade }) => {
  const [sentenceQueue, setSentenceQueue] = useState<any[] | null>(null);
  const sentenceCardData = useQuery(api.sentences.getSentenceFlashcardQueue, {
    limit: 15,
  });

  useEffect(() => {
    if (sentenceCardData) {
      setSentenceQueue(sentenceCardData);
    }
  }, [sentenceCardData]);

  const handleGrade = (rating: string) => {
    if (!sentenceQueue || sentenceQueue.length === 0) return;
    const currentCard = sentenceQueue[0];

    // Optimistic update: remove card from local queue instantly for a fast UI
    setSentenceQueue((q) => (q ? q.slice(1) : []));

    onGrade(currentCard._id, rating);
  };

  const isLoading = sentenceQueue === null;
  const isDone = !isLoading && sentenceQueue.length === 0;
  const currentCard = !isLoading && !isDone ? sentenceQueue[0] : null;

  return (
    <FlashcardPlayer
      isLoading={isLoading}
      isDone={isDone}
      card={currentCard}
      onGrade={handleGrade}
    />
  );
};

export default function SentencesScreen() {
  const [mode, setMode] = useState("reading");
  const [sentenceState, setSentenceState] = useState<SentenceState>({
    grades: {},
  });
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});

  // --- State and Query for Reading Mode Queue ---
  const [readingQueue, setReadingQueue] = useState<any[] | null>(null);
  const readingSentenceData = useQuery(
    api.sentences.getReadingSentenceQueue,
    mode === "reading" ? { limit: 15 } : "skip"
  );

  useEffect(() => {
    if (readingSentenceData) {
      setReadingQueue(readingSentenceData);
    }
  }, [readingSentenceData]);

  const settings = useQuery(api.users.getSettings);
  const gradeSentence = useMutation(api.sentences.gradeSentence);
  const markSentenceAsSeen = useMutation(api.sentences.markSentenceAsSeen);
  const convex = useConvex();
  const colorScheme = useColorScheme();

  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});
  const styles = getStyles(colorScheme);

  const currentReadingSentence = readingQueue ? readingQueue[0] : null;

  useEffect(() => {
    if (currentReadingSentence && currentReadingSentence.sentence) {
      const uniqueWords = Array.from(
        new Set(
          currentReadingSentence.sentence
            .toLowerCase()
            .match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
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
            ...translationsArray.reduce((acc, item) => {
              acc[item.esperanto] = item.english;
              return acc;
            }, {}),
          }));
        } catch (error) {
          console.error("Failed to prefetch translations:", error);
        }
      };
      prefetchTranslations();
    }
  }, [currentReadingSentence, convex]);

  const handleWordClickReading = useCallback(
    (cleanedWord: string, wordKey: string) => {
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
    [sentenceState, translationCache]
  );

  const handleMarkAllGood = useCallback(() => {
    if (!currentReadingSentence) return;
    const wordsInSentence =
      currentReadingSentence.sentence.match(/[a-zĉĝĥĵŝŭ'’]+/gi) || [];
    const newGrades = {};
    for (const word of wordsInSentence) {
      newGrades[word.toLowerCase()] = "good";
    }
    setSentenceState({ grades: newGrades });
  }, [currentReadingSentence]);

  const handleSubmitReading = useCallback(() => {
    if (!settings || !currentReadingSentence) return;
    markSentenceAsSeen({ sentenceId: currentReadingSentence._id });
    setReadingQueue((q) => (q ? q.slice(1) : []));
    setSentenceState({ grades: {} });
  }, [currentReadingSentence, sentenceState, settings, markSentenceAsSeen]);

  const handleGradeFlashcard = useCallback(
    (sentenceId: Id<"sentences">, rating: string) => {
      gradeSentence({ sentenceId, rating }).catch((err) => {
        console.error("Failed to save sentence grade:", err);
      });
    },
    [gradeSentence]
  );

  const handlePressOutside = useCallback(() => {
    if (popup.visible) {
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [popup.visible]);

  const renderContent = () => {
    if (mode === "reading") {
      const isLoading = readingQueue === null;
      if (isLoading)
        return <ActivityIndicator style={{ flex: 1 }} size="large" />;
      return (
        <SentenceReadingView
          sentence={currentReadingSentence}
          sentenceState={sentenceState}
          onWordClick={handleWordClickReading}
          onMarkAllGood={handleMarkAllGood}
          onSubmit={handleSubmitReading}
          wordRefs={wordRefs}
        />
      );
    }
    if (mode === "flashcard") {
      return <SentenceFlashcard onGrade={handleGradeFlashcard} />;
    }
    return null;
  };

  return (
    <View style={styles.container} onTouchStart={handlePressOutside}>
      <Text style={styles.title}>Sentences Practice</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          onPress={() => setMode("reading")}
          style={[
            styles.toggleButton,
            mode === "reading" && styles.activeButton,
          ]}
        >
          <Text
            style={[
              styles.toggleButtonText,
              mode === "reading" && styles.activeButtonText,
            ]}
          >
            Dynamic Practice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("flashcard")}
          style={[
            styles.toggleButton,
            mode === "flashcard" && styles.activeButton,
          ]}
        >
          <Text
            style={[
              styles.toggleButtonText,
              mode === "flashcard" && styles.activeButtonText,
            ]}
          >
            Common Phrases
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>{renderContent()}</View>
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
  const inactiveToggleBg = isDark ? "#2a2a2a" : "#e9ecef";
  const activeToggleBg = "#007bff";
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
      justifyContent: "space-between",
      minHeight: 250,
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
    activeButton: { backgroundColor: activeToggleBg },
    toggleButtonText: { fontSize: 16, fontWeight: "600", color: textColor },
    activeButtonText: { color: "#fff" },
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
            