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
  ActivityIndicator,
  useColorScheme,
  View,
  Text as RNText,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord } from "./GradedWord";
// --- FIX: Import FlashList for virtualization ---
import { FlashList } from "@shopify/flash-list";

// A type for a line of text, which contains multiple word/space segments
type LineItem = {
  id: string;
  segments: { type: "word" | "space"; content: string; key: string }[];
};

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

  const lastGradedWordRef = useRef<{
    word: string;
    rating: string;
    key: string;
  } | null>(null);

  const story = useQuery(api.stories.getFirstStory);
  const gradeWord = useMutation(api.userWords.gradeWord);

  // --- FIX: Process the story into lines for FlashList ---
  const storyLines = useMemo(() => {
    if (!story) return [];
    const lines: LineItem[] = [];
    let currentLine: LineItem["segments"] = [];
    let segmentCounter = 0;

    story.content.split(/(\n)/).forEach((lineText, lineIndex) => {
      if (lineText === "\n") {
        if (currentLine.length > 0) {
          lines.push({ id: `line-${lineIndex}`, segments: currentLine });
          currentLine = [];
        }
      } else {
        lineText.split(/(\s+|[.,!?;"'’“”])/).forEach((segment) => {
          if (segment) {
            currentLine.push({
              type: /^[a-zĉĝĥĵŝŭ'’]+$/.test(segment.trim().toLowerCase())
                ? "word"
                : "space",
              content: segment,
              key: `seg-${segmentCounter++}`,
            });
          }
        });
      }
    });
    if (currentLine.length > 0) {
      lines.push({ id: `line-last`, segments: currentLine });
    }
    return lines;
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
    async (
      event: NativeSyntheticEvent<NativeTouchEvent>,
      word: string,
      rating: string,
      wordKey: string
    ) => {
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
        const { pageX, pageY } = event.nativeEvent;
        setPopup({ visible: true, text: translation, x: pageX, y: pageY - 45 });
      }
    },
    [submitLastWordGrade, translationCache]
  );

  const styles = getStyles(colorScheme);

  // --- FIX: renderItem function for FlashList ---
  const renderLine = useCallback(
    ({ item }: { item: LineItem }) => (
      <View style={styles.lineContainer}>
        {item.segments.map((segment) => {
          if (segment.type === "word") {
            return (
              <GradedWord
                key={segment.key}
                word={segment.content}
                cleanedWord={segment.content.trim().toLowerCase()}
                wordKey={segment.key}
                onPressWord={handleWordPressParent}
              />
            );
          }
          return <RNText key={segment.key}>{segment.content}</RNText>;
        })}
      </View>
    ),
    [handleWordPressParent]
  );

  if (!story || isPrefetching) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <RNText style={styles.title}>{story.title}</RNText>
      {/* --- FIX: Use FlashList instead of ScrollView --- */}
      <FlashList
        data={storyLines}
        renderItem={renderLine}
        estimatedItemSize={40} // Adjust based on your average line height
        onScrollBeginDrag={submitLastWordGrade}
        contentContainerStyle={styles.listContentContainer}
      />

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

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const popupBgColor = isDark ? "#424242" : "#333333";

  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: backgroundColor,
    },
    title: { fontSize: 28, fontWeight: "bold", margin: 15, color: textColor },
    listContentContainer: { paddingHorizontal: 15 },
    lineContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      fontSize: 20,
      lineHeight: 40,
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
      transform: [{ translateX: -75 }],
    },
    popupText: {
      color: "#fff",
      fontSize: 16,
      textAlign: "center",
    },
  });
};