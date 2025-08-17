// components/ReadingScreen.tsx
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
  View,
  Text as RNText,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord, GradeKey } from "./GradedWord";
// import { useTheme } from "../context/ThemeContext";
import { useColorScheme } from "@/context/ThemeContext"; 

const getBaseWord = (word: string): string => {
  if (word.endsWith("jn")) return word.slice(0, -2);
  if (word.endsWith("j")) return word.slice(0, -1);
  if (word.endsWith("n")) return word.slice(0, -1);
  return word;
};

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

interface WordInfo {
  grade: GradeKey;
  due: number | null;
}

export default function ReadingScreen() {
  const { colorScheme } = useColorScheme(); // CORRECTED HOOK USAGE
  const convex = useConvex();
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});
  const [isPrefetching, setIsPrefetching] = useState(true);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [wordStates, setWordStates] = useState<{
    [cleanedWord: string]: WordInfo;
  }>({});
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});
  const lastSubmittedWordRef = useRef<{
    word: string;
    rating: GradeKey;
  } | null>(null);
  const lastInteractionIndexRef = useRef<number>(0);

  const story = useQuery(api.stories.getFirstStory);
  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);
  const gradeWordsAsGood = useMutation(api.userWords.gradeWordsAsGood);

  const storySegments = useMemo(() => {
    if (!story) return [];
    return story.content.split(/(\s+|[.,!?;"'’“”])/);
  }, [story]);

  const storyBaseWords = useMemo(() => {
    if (!story) return [];
    const words = story.content.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || [];
    return Array.from(new Set(words.map((w) => getBaseWord(w))));
  }, [story]);

  const initialUserWords = useQuery(
    api.userWords.getUserWordsByText,
    storyBaseWords.length > 0 ? { words: storyBaseWords } : "skip"
  );

  useEffect(() => {
    if (initialUserWords) {
      setWordStates((prevStates) => {
        const newStates = { ...prevStates };
        for (const item of initialUserWords) {
          if (!newStates[item.word]) {
            newStates[item.word] = { grade: "good", due: item.data.due };
          }
        }
        return newStates;
      });
    }
  }, [initialUserWords]);

  useEffect(() => {
    if (story && !fetchAttempted) {
      setFetchAttempted(true);
      const uniqueWords = Array.from(
        new Set(story.content.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || [])
      );
      const prefetchTranslations = async () => {
        try {
          const baseWordsToFetch = Array.from(
            new Set(uniqueWords.map((w) => getBaseWord(w)))
          );
          const translationsArray = await convex.query(
            api.userWords.getTranslationsForStory,
            { words: baseWordsToFetch }
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
    } else if (story && fetchAttempted) {
      setIsPrefetching(false);
    }
  }, [story, fetchAttempted, convex]);

  const commitGrade = useCallback(async () => {
    const sessionToCommit = lastSubmittedWordRef.current;
    lastSubmittedWordRef.current = null;
    if (sessionToCommit && settings) {
      try {
        console.log(
          `[COMMIT GRADE] Word: "${sessionToCommit.word}", Rating: "${sessionToCommit.rating}"`
        );
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
            },
          }));
        }
      } catch (error) {
        console.error("Failed to submit word grade:", error);
      }
    }
  }, [gradeWord, settings]);

  const processImpliedGoodGrades = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (!settings || startIndex >= endIndex) return;
      const wordsToGrade: string[] = [];
      const batchUIUpdates: { [key: string]: WordInfo } = {};
      for (let i = startIndex; i < endIndex; i++) {
        const segment = storySegments[i];
        if (!segment) continue;
        const impliedCleanedWord = segment.trim().toLowerCase();
        const impliedBaseWord = getBaseWord(impliedCleanedWord);
        if (
          impliedBaseWord.length > 0 &&
          /^[a-zĉĝĥĵŝŭ'’]+$/.test(impliedBaseWord)
        ) {
          const impliedWordState = wordStates[impliedBaseWord];
          if (
            !impliedWordState ||
            impliedWordState.grade === "default" ||
            impliedWordState.grade === "good"
          ) {
            batchUIUpdates[impliedBaseWord] = { grade: "good", due: null };
            wordsToGrade.push(impliedBaseWord);
          }
        }
      }
      if (wordsToGrade.length > 0) {
        console.log(
          `[IMPLIED GOOD] Grading ${wordsToGrade.length} words:`,
          wordsToGrade
        );
        setWordStates((prev) => ({ ...prev, ...batchUIUpdates }));
        await gradeWordsAsGood({ wordTexts: wordsToGrade, settings });
      }
    },
    [storySegments, wordStates, settings, gradeWordsAsGood]
  );

  const handleWordClick = useCallback(
    (cleanedWord: string, wordKey: string, clickedIndex: number) => {
      const baseWord = getBaseWord(cleanedWord);

      if (
        lastSubmittedWordRef.current &&
        lastSubmittedWordRef.current.word !== baseWord
      ) {
        commitGrade();
      }

      processImpliedGoodGrades(lastInteractionIndexRef.current, clickedIndex);

      setWordStates((prevWordStates) => {
        const currentState = prevWordStates[baseWord];
        if (currentState && currentState.due && currentState.due > Date.now()) {
          const translation = translationCache[baseWord];
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
          return prevWordStates;
        }

        const currentGrade = currentState?.grade || "default";
        const nextGrade = GRADING_CYCLE_MAP[currentGrade];

        lastSubmittedWordRef.current = { word: baseWord, rating: nextGrade };
        lastInteractionIndexRef.current = clickedIndex + 1;

        const translation = translationCache[baseWord];
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

        return {
          ...prevWordStates,
          [baseWord]: { ...currentState, grade: nextGrade },
        };
      });
    },
    [translationCache, commitGrade, processImpliedGoodGrades]
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
            const baseWord = getBaseWord(cleanedWord);

            if (
              cleanedWord.length > 0 &&
              /^[a-zĉĝĥĵŝŭ'’]+$/.test(cleanedWord)
            ) {
              const grade = wordStates[baseWord]?.grade || "default";
              return (
                <GradedWord
                  key={segmentKey}
                  ref={(el) => (wordRefs.current[segmentKey] = el as Pressable)}
                  word={segment}
                  onPress={() =>
                    handleWordClick(cleanedWord, segmentKey, index)
                  }
                  grade={grade}
                  fontSize={fontSize}
                  colorScheme={colorScheme} // PASS THE PROP
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
    ? "rgba(40, 40, 40, 0.8)"
    : "rgba(240, 240, 240, 0.8)";
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: backgroundColor,
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
    popupText: { color: "#fff", fontSize: fontSize, textAlign: "center" },
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
