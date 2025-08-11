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
  useColorScheme,
  View,
  Text as RNText,
  Pressable,
  TouchableOpacity, // Import TouchableOpacity for buttons
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord } from "./GradedWord";

// --- Constants for font size control ---
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 36;
const DEFAULT_FONT_SIZE = 20;

export default function ReadingScreen() {
  const colorScheme = useColorScheme();
  const convex = useConvex();
  const [popup, setPopup] = useState<{
    visible: boolean;
    text: string;
    x: number;
    y: number;
  }>({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: string;
  }>({});
  const [isPrefetching, setIsPrefetching] = useState(true);
  // --- State for dynamic font size ---
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const lastGradedWordRef = useRef<{
    word: string;
    rating: string;
    key: string;
  } | null>(null);
  const wordRefs = useRef<{ [key: string]: Pressable | null }>({});

  const story = useQuery(api.stories.getFirstStory);
  const gradeWord = useMutation(api.userWords.gradeWord);

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
          const cacheObject = translationsArray.reduce(
            (acc, item) => {
              acc[item.esperanto] = item.english;
              return acc;
            },
            {} as { [key: string]: string }
          );
          setTranslationCache(cacheObject);
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

  const hidePopup = useCallback(() => {
    if (popup.visible) {
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [popup.visible]);

  const submitLastWordGrade = useCallback(async () => {
    hidePopup();
    if (lastGradedWordRef.current) {
      const { word, rating } = lastGradedWordRef.current;
      try {
        await gradeWord({ wordText: word, rating });
      } catch (error) {
        console.error("Failed to submit word grade:", error);
      }
      lastGradedWordRef.current = null;
    }
  }, [gradeWord, hidePopup]);

  const handleWordPressParent = useCallback(
    async (word: string, rating: string, wordKey: string) => {
      if (
        lastGradedWordRef.current &&
        lastGradedWordRef.current.key !== wordKey
      ) {
        await submitLastWordGrade();
      }
      lastGradedWordRef.current = { word, rating, key: wordKey };

      let translation = translationCache[word];
      if (!translation && word.endsWith("n") && word.length > 1) {
        translation = translationCache[word.slice(0, -1)];
      }

      if (translation) {
        const targetWord = wordRefs.current[wordKey];
        targetWord?.measure((fx, fy, width, height, px, py) => {
          const centerX = px + width / 2;
          setPopup({
            visible: true,
            text: translation,
            x: centerX,
            y: py - height - 15,
          });
        });
      }
    },
    [submitLastWordGrade, translationCache]
  );

  // --- Functions to handle zooming ---
  const zoomIn = useCallback(() => {
    setFontSize((prevSize) => Math.min(prevSize + 2, MAX_FONT_SIZE));
  }, []);

  const zoomOut = useCallback(() => {
    setFontSize((prevSize) => Math.max(prevSize - 2, MIN_FONT_SIZE));
  }, []);

  // Pass dynamic font size to styles
  const styles = getStyles(colorScheme, fontSize);

  if (!story || isPrefetching) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        onScrollBeginDrag={submitLastWordGrade}
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
              return (
                <GradedWord
                  key={segmentKey}
                  ref={(el) => (wordRefs.current[segmentKey] = el as Pressable)}
                  word={segment}
                  cleanedWord={cleanedWord}
                  wordKey={segmentKey}
                  onPressWord={handleWordPressParent}
                  fontSize={fontSize} // Pass font size down
                />
              );
            }
            // Apply dynamic font size to non-word segments
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

      {/* --- Zoom Controls UI --- */}
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

// Update getStyles to accept fontSize
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
    ? "rgba(50, 50, 50, 0.8)"
    : "rgba(240, 240, 240, 0.8)";

  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: backgroundColor,
    },
    scrollContentContainer: { padding: 15, paddingBottom: 80 }, // Add padding to bottom for zoom controls
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 15,
      color: textColor,
    },
    contentContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      lineHeight: fontSize * 1.7, // Dynamic line height
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
    popupText: {
      color: "#fff",
      fontSize: fontSize,
      textAlign: "center",
    },
    // --- Styles for Zoom Controls ---
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
    zoomButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: textColor,
    },
  });
};
