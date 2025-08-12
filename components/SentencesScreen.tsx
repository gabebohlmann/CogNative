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

interface SentenceState {
  grades: { [cleanedWord: string]: GradeKey };
}

// --- Sub-component for the Flashcard View ---
const SentenceFlashcard = ({
  sentence,
  onGrade,
}: {
  sentence: any;
  onGrade: (rating: string) => void;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const styles = getStyles(useColorScheme());

  useEffect(() => {
    // Reset the flip state whenever a new sentence is loaded
    setIsFlipped(false);
  }, [sentence]);

  if (!sentence) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          🎉 You've reviewed all available sentence flashcards for now. Well
          done!
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.card, styles.flashcardCard]}>
        <Text style={styles.sentenceText}>{sentence.sentence}</Text>
      </View>
      {!isFlipped && (
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setIsFlipped(true)}
        >
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      )}
      {isFlipped && (
        <View style={styles.feedbackContainer}>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.againButton]}
            onPress={() => onGrade("again")}
          >
            <Text style={styles.feedbackButtonText}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.hardButton]}
            onPress={() => onGrade("hard")}
          >
            <Text style={styles.feedbackButtonText}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.goodButton]}
            onPress={() => onGrade("good")}
          >
            <Text style={styles.feedbackButtonText}>Good</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.easyButton]}
            onPress={() => onGrade("easy")}
          >
            <Text style={styles.feedbackButtonText}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// --- Sub-component for the Reading Mode View ---
const SentenceReadingView = ({
  sentence,
  sentenceState,
  onWordClick,
  onMarkAllGood,
  onSubmit,
}) => {
  const styles = getStyles(useColorScheme());
  const wordsInSentence = useMemo(
    () => sentence?.sentence.split(/(\s+|[.,!?;"'’“”])/) || [],
    [sentence]
  );
  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});

  if (!sentence) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          🎉 No more sentences for now. Well done!
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

export default function SentencesScreen() {
  const [mode, setMode] = useState("reading");
  const [seenSentenceIds, setSeenSentenceIds] = useState<Id<"sentences">[]>([]);
  const [sentenceState, setSentenceState] = useState<SentenceState>({
    grades: {},
  });
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});

  const readingSentence = useQuery(
    api.sentences.getSentenceForReview,
    mode === "reading" ? { seenSentenceIds } : "skip"
  );
  const flashcardSentence = useQuery(
    api.sentences.getSentenceFlashcard,
    mode === "flashcard" ? {} : "skip"
  );
  const settings = useQuery(api.users.getSettings);

  const gradeSentence = useMutation(api.sentences.gradeSentence);
  const markSentenceAsSeen = useMutation(api.sentences.markSentenceAsSeen);

  const convex = useConvex();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  const currentSentence =
    mode === "reading" ? readingSentence : flashcardSentence;

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
          console.error("Failed to prefetch translations:", error);
        }
      };
      prefetchTranslations();
    }
  }, [currentSentence, convex]);

  const handleWordClickReading = useCallback(
    (cleanedWord: string, wordKey: string) => {
      const translation =
        translationCache[cleanedWord] ||
        translationCache[cleanedWord.slice(0, -1)];
      // This ref is local to the SentenceReadingView, so we can't access it here.
      // For simplicity, the popup will be disabled in reading view for now.

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
    if (!readingSentence) return;
    const wordsInSentence =
      readingSentence.sentence.match(/[a-zĉĝĥĵŝŭ'’]+/gi) || [];
    const newGrades = {};
    for (const word of wordsInSentence) {
      newGrades[word.toLowerCase()] = "good";
    }
    setSentenceState({ grades: newGrades });
  }, [readingSentence]);

  const handleSubmitReading = useCallback(() => {
    if (!settings || !readingSentence) return;
    markSentenceAsSeen({ sentenceId: readingSentence._id });
    setSeenSentenceIds((prev) => [...prev, readingSentence._id]);
    setSentenceState({ grades: {} });
  }, [readingSentence, sentenceState, settings, markSentenceAsSeen]);

  const handleGradeFlashcard = useCallback(
    (rating: string) => {
      if (!flashcardSentence) return;
      gradeSentence({ sentenceId: flashcardSentence._id, rating });
    },
    [flashcardSentence, gradeSentence]
  );

  const handlePressOutside = useCallback(() => {
    if (popup.visible) {
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [popup.visible]);

  const renderContent = () => {
    if (
      (mode === "reading" && readingSentence === undefined) ||
      (mode === "flashcard" && flashcardSentence === undefined)
    ) {
      return <ActivityIndicator style={{ flex: 1 }} size="large" />;
    }

    if (mode === "reading") {
      return (
        <SentenceReadingView
          sentence={readingSentence}
          sentenceState={sentenceState}
          onWordClick={handleWordClickReading}
          onMarkAllGood={handleMarkAllGood}
          onSubmit={handleSubmitReading}
        />
      );
    }

    if (mode === "flashcard") {
      return (
        <SentenceFlashcard
          sentence={flashcardSentence}
          onGrade={handleGradeFlashcard}
        />
      );
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
            Reading
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
            Flashcards
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
    },
    flashcardCard: { minHeight: 250, justifyContent: "center" },
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
    flipButton: {
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 25,
      backgroundColor: "#007bff",
      alignSelf: "center",
    },
    feedbackContainer: {
      flexDirection: "row",
      marginTop: 20,
      justifyContent: "space-around",
      width: "100%",
    },
    feedbackButton: {
      padding: 15,
      borderRadius: 8,
      minWidth: 70,
      alignItems: "center",
    },
    feedbackButtonText: { color: "white", fontWeight: "bold" },
    againButton: { backgroundColor: "#dc3545" },
    hardButton: { backgroundColor: "#ffc107" },
    goodButton: { backgroundColor: "#28a745" },
    easyButton: { backgroundColor: "#17a2b8" },
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
