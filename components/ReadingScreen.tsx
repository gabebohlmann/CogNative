import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  View,
  Text as RNText,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord, GradeKey } from "./GradedWord";

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 36;
const DEFAULT_FONT_SIZE = 20;

const GRADING_CYCLE_MAP: Record<GradeKey, GradeKey> = {
  default: "again",
  again: "hard",
  hard: "good",
  good: "easy",
  easy: "again",
};

// The state for each word now tracks everything needed for the new logic
interface WordState {
  grade: GradeKey;
  due: number | null;
  sourceIndex: number | null;
}

// A performant manager for all expiration timers.
class WordTimerManager {
  private timers: Map<string, number> = new Map();
  private subscribers: ((baseWord: string) => void)[] = [];

  subscribe(callback: (baseWord: string) => void) {
    this.subscribers.push(callback);
  }
  unsubscribe(callback: (baseWord: string) => void) {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }

  startTimer(baseWord: string, dueDate: number) {
    this.clearTimer(baseWord);
    const delay = dueDate - Date.now();
    if (delay > 0) {
      const timerId = setTimeout(() => {
        this.subscribers.forEach((cb) => cb(baseWord));
        this.timers.delete(baseWord);
      }, delay);
      this.timers.set(baseWord, timerId as any);
    }
  }

  clearTimer(baseWord: string) {
    if (this.timers.has(baseWord)) {
      clearTimeout(this.timers.get(baseWord));
      this.timers.delete(baseWord);
    }
  }

  clearAll() {
    this.timers.forEach((timerId) => clearTimeout(timerId));
    this.timers.clear();
  }
}

export default function ReadingScreen() {
  const colorScheme = useColorScheme();
  const convex = useConvex();
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});
  const [isPrefetching, setIsPrefetching] = useState(true);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const [wordStates, setWordStates] = useState<{
    [cleanedWord: string]: WordState;
  }>({});
  const [, forceUpdate] = useState(0); // Dummy state to force re-render on expiration

  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});
  const lastSubmittedWordRef = useRef<{
    word: string;
    rating: GradeKey;
    sourceIndex: number;
  } | null>(null);

  const wordTimerManager = useMemo(() => new WordTimerManager(), []);

  const story = useQuery(api.stories.getFirstStory);
  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);

  const storyBaseWords = useMemo(() => {
    if (!story) return [];
    const words = story.content.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || [];
    return Array.from(
      new Set(
        words.map((w) => (w.endsWith("n") && w.length > 1 ? w.slice(0, -1) : w))
      )
    );
  }, [story]);

  const initialUserWords = useQuery(
    api.userWords.getUserWordsByText,
    storyBaseWords.length > 0 ? { words: storyBaseWords } : "skip"
  );

  useEffect(() => {
    // When a timer expires, this function forces a re-render.
    // The render logic will then know the word's block has expired.
    const handleExpire = () => forceUpdate((c) => c + 1);

    wordTimerManager.subscribe(handleExpire);
    return () => {
      wordTimerManager.unsubscribe(handleExpire);
      wordTimerManager.clearAll();
    };
  }, [wordTimerManager]);

  useEffect(() => {
    if (initialUserWords) {
      setWordStates((prevStates) => {
        const newStates = { ...prevStates };
        for (const item of initialUserWords) {
          if (!newStates[item.word]) {
            newStates[item.word] = {
              grade: "good",
              due: item.data.due,
              sourceIndex: -1,
            };
          }
          if (item.data.due > Date.now()) {
            wordTimerManager.startTimer(item.word, item.data.due);
          }
        }
        return newStates;
      });
    }
  }, [initialUserWords, wordTimerManager]);

  const storySegments = useMemo(() => {
    if (!story) return [];
    return story.content.split(/(\s+|[.,!?;"'’“”])/);
  }, [story]);

  useEffect(() => {
    if (story && Object.keys(translationCache).length === 0) {
      const uniqueWords = Array.from(
        new Set(story.content.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || [])
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
          console.error("Failed to prefetch translations:", error);
        } finally {
          setIsPrefetching(false);
        }
      };
      prefetchTranslations();
    } else if (story) {
      setIsPrefetching(false);
    }
  }, [story, convex, translationCache]);

  const commitGrade = useCallback(async () => {
    if (lastSubmittedWordRef.current && settings) {
      const sessionToCommit = { ...lastSubmittedWordRef.current };
      try {
        const result = await gradeWord({
          wordText: sessionToCommit.word,
          rating: sessionToCommit.rating,
          settings,
        });

        if (result && result.due) {
          setWordStates((prev) => ({
            ...prev,
            [sessionToCommit.word]: {
              grade: sessionToCommit.rating,
              due: result.due,
              sourceIndex: sessionToCommit.sourceIndex,
            },
          }));
          wordTimerManager.startTimer(sessionToCommit.word, result.due);
        }
      } catch (error) {
        console.error("Failed to submit word grade:", error);
      }
    }
    lastSubmittedWordRef.current = null;
  }, [gradeWord, settings, wordTimerManager]);

  const handleWordClick = useCallback(
    (cleanedWord: string, wordKey: string, index: number) => {
      const currentState = wordStates[cleanedWord];
      if (currentState && currentState.due && currentState.due > Date.now()) {
        const translation =
          translationCache[cleanedWord] ||
          translationCache[cleanedWord.slice(0, -1)];
        if (translation) {
          wordRefs.current[wordKey]?.measure(
            (fx, fy, width, height, px, py) => {
              setPopup({
                visible: true,
                text: translation,
                x: px + width / 2,
                y: py - height - 15,
              });
            }
          );
        }
        return;
      }

      if (
        lastSubmittedWordRef.current &&
        lastSubmittedWordRef.current.word !== cleanedWord
      ) {
        commitGrade();
      }

      const currentGrade = wordStates[cleanedWord]?.grade || "default";
      const nextGrade = GRADING_CYCLE_MAP[currentGrade];

      setWordStates((prev) => ({
        ...prev,
        [cleanedWord]: { ...prev[cleanedWord], grade: nextGrade },
      }));
      lastSubmittedWordRef.current = {
        word: cleanedWord,
        rating: nextGrade,
        sourceIndex: index,
      };

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
    },
    [wordStates, translationCache, commitGrade, wordTimerManager]
  );

  const handlePressOutside = useCallback(() => {
    setPopup((p) => ({ ...p, visible: false }));
    commitGrade();
  }, [commitGrade]);

  const zoomIn = useCallback(
    () => setFontSize((s) => Math.min(s + 2, MAX_FONT_SIZE)),
    []
  );
  const zoomOut = useCallback(
    () => setFontSize((s) => Math.max(s - 2, MIN_FONT_SIZE)),
    []
  );

  const styles = getStyles(colorScheme, fontSize);

  if (!story || isPrefetching || !settings) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <View style={{ flex: 1 }} onTouchStart={handlePressOutside}>
      <ScrollView
        onScrollBeginDrag={handlePressOutside}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <RNText style={styles.title}>{story.title}</RNText>
        <View style={styles.contentContainer}>
          {storySegments.map((segment, index) => {
            const segmentKey = `seg-${index}`;
            const cleanedWord = segment.trim().toLowerCase();

            if (
              cleanedWord.length > 0 &&
              /^[a-zĉĝĥĵŝŭ'’]+$/.test(cleanedWord)
            ) {
              let finalGrade: GradeKey = "default";
              const state = wordStates[cleanedWord];

              if (state) {
                const isExpired = state.due && state.due <= Date.now();
                const isAfterSource =
                  state.sourceIndex !== null && index > state.sourceIndex;

                if (isExpired && isAfterSource) {
                  // If block expired and this word is a future duplicate, revert its color
                  finalGrade = "default";
                } else {
                  // Otherwise, show its current grade color
                  finalGrade = state.grade;
                }
              }

              return (
                <GradedWord
                  key={segmentKey}
                  ref={(el) => (wordRefs.current[segmentKey] = el as Pressable)}
                  word={segment}
                  onPress={() =>
                    handleWordClick(cleanedWord, segmentKey, index)
                  }
                  grade={finalGrade}
                  fontSize={fontSize}
                />
              );
            }
            return (
              <RNText
                key={index}
                style={{ fontSize, color: styles.contentContainer.color }}
              >
                {segment}
              </RNText>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.zoomControls}>
        <TouchableOpacity onPress={zoomOut} style={styles.zoomButton}>
          <RNText style={styles.zoomButtonText}>A-</RNText>
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomIn} style={styles.zoomButton}>
          <RNText style={styles.zoomButtonText}>A+</RNText>
        </TouchableOpacity>
      </View>

      {popup.visible && (
        <View
          style={[styles.popup, { top: popup.y, left: popup.x }]}
          pointerEvents="none"
        >
          <RNText style={styles.popupText}>{popup.text}</RNText>
        </View>
      )}
    </View>
  );
}

const getStyles = (
  colorScheme: "light" | "dark" | null | undefined,
  fontSize: number
) => {
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const popupBgColor = isDark
    ? "rgba(50, 50, 50, 0.9)"
    : "rgba(30, 30, 30, 0.9)";
  const controlBgColor = isDark
    ? "rgba(240, 240, 240, 0.8)"
    : "rgba(240, 240, 240, 0.8)";
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor,
    },
    scrollContentContainer: { padding: 15, paddingBottom: 80 },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 15,
      color: textColor,
    },
    contentContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      lineHeight: fontSize * 1.7,
      color: textColor,
    },
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
    popupText: { color: "#fff", fontSize: 16, textAlign: "center" },
    zoomControls: {
      position: "absolute",
      top: 10,
      right: 20,
      flexDirection: "row",
      backgroundColor: controlBgColor,
      borderRadius: 25,
      padding: 2,
    },
    zoomButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
    },
    zoomButtonText: { fontSize: 18, fontWeight: "bold", color: textColor },
  });
};
