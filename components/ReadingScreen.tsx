// components/ReadingScreen.tsx
import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  View,
  Text as RNText,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Modal,
  Pressable,
} from "react-native";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { GradedWord } from "./GradedWord";

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
  // This ref now tracks the last graded word's details AND its unique key
  const lastGradedWordRef = useRef<{
    word: string;
    rating: string;
    key: string;
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const story = useQuery(api.stories.getFirstStory);
  const gradeWord = useMutation(api.userWords.gradeWord);

  const storySegments = useMemo(() => {
    if (!story) return [];
    return story.content.split(/(\s+|[.,!?;"'’“”])/);
  }, [story]);

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

  // This function is now passed to each GradedWord.
  // It's called when a word is pressed.
  const handleWordPressParent = useCallback(
    async (
      event: NativeSyntheticEvent<NativeTouchEvent>,
      word: string,
      rating: string,
      wordKey: string
    ) => {
      // If the user clicks a different word, submit the grade for the previous one.
      if (
        lastGradedWordRef.current &&
        lastGradedWordRef.current.key !== wordKey
      ) {
        await submitLastWordGrade();
      }

      // Store the current word's details for the next interaction.
      lastGradedWordRef.current = { word, rating, key: wordKey };

      // Fetch translation and show popup
      try {
        const details = await convex.query(api.userWords.getByText, {
          wordText: word,
        });
        if (details?.english) {
          const { pageX, pageY } = event.nativeEvent;
          setPopup({
            visible: true,
            text: details.english,
            x: pageX,
            y: pageY - 40,
          });
        }
      } catch (error) {
        console.error("Failed to fetch word details:", error);
      }
    },
    [submitLastWordGrade, convex]
  );

  const styles = getStyles(colorScheme);

  if (!story) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        onScrollBeginDrag={submitLastWordGrade}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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
                  word={segment}
                  cleanedWord={cleanedWord}
                  wordKey={segmentKey}
                  onPressWord={handleWordPressParent}
                />
              );
            }
            return <RNText key={index}>{segment}</RNText>;
          })}
        </View>
      </ScrollView>

      <Modal
        transparent={true}
        visible={popup.visible}
        animationType="none"
        onRequestClose={hidePopup}
      >
        <Pressable style={styles.modalOverlay} onPress={hidePopup}>
          <View style={[styles.popup, { top: popup.y, left: popup.x }]}>
            <RNText style={styles.popupText}>{popup.text}</RNText>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (colorScheme: "light" | "dark" | null | undefined) => {
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const popupBgColor = isDark ? "#424242" : "#333333";

  return StyleSheet.create({
    loading: { flex: 1, backgroundColor: backgroundColor },
    container: { flex: 1, padding: 15, backgroundColor: backgroundColor },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 15,
      color: textColor,
    },
    contentContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      fontSize: 20,
      lineHeight: 40,
      color: textColor,
    },
    modalOverlay: {
      flex: 1,
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
    },
    popupText: {
      color: "#fff",
      fontSize: 16,
      textAlign: "center",
    },
  });
};
  