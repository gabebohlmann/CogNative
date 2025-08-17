// components/FlashcardPlayer.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  GestureDetector,
  Gesture,
  TouchableOpacity,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useColorScheme } from "@/context/ThemeContext";

export const FlashcardPlayer = ({ card, onGrade, isLoading, isDone }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { colorScheme } = useColorScheme();
  const styles = getStyles(colorScheme);

  // useEffect(() => {
  //   setIsFlipped(false);
  // }, [card]);

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleFlip)();
  });

  const panGesture = Gesture.Pan()
    .enabled(isFlipped)
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const swipeThreshold = 50;

      if (
        Math.abs(translationX) > Math.abs(translationY) &&
        Math.abs(translationX) > swipeThreshold
      ) {
        if (translationX > 0) {
          runOnJS(onGrade)("good");
        } else {
          runOnJS(onGrade)("again");
        }
      } else if (
        Math.abs(translationY) > Math.abs(translationX) &&
        Math.abs(translationY) > swipeThreshold
      ) {
        if (translationY > 0) {
          runOnJS(onGrade)("hard");
        } else {
          runOnJS(onGrade)("easy");
        }
      }
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "#fff" : "#000"}
        />
      </View>
    );
  }

  if (isDone || !card) {
    return (
      <View style={styles.container}>
        <Text style={styles.cardText}>🎉</Text>
        <Text style={styles.loadingText}>You're all done for now!</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container}>
        <View style={styles.card}>
          {isFlipped ? (
            <>
              <Text style={[styles.cardText, styles.flippedFrontText]}>
                {card.front}
              </Text>
              <View style={styles.divider} />
              <Text style={[styles.cardText, styles.cardBackText]}>
                {card.back}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.cardText,
                card.front?.length > 80 && styles.cardTextSmall,
              ]}
            >
              {card.front}
            </Text>
          )}
        </View>

        <GestureDetector gesture={Gesture.Tap()}>
          <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
            <Text style={styles.flipButtonText}>
              {isFlipped ? "Hide Answer" : "Show Answer"}
            </Text>
          </TouchableOpacity>
        </GestureDetector>

        {isFlipped && card.intervals && (
          <View style={styles.feedbackContainer}>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.againButton]}
              onPress={() => onGrade("again")}
            >
              <Text style={styles.feedbackButtonText}>Again</Text>
              <Text style={styles.intervalText}>{card.intervals.again}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.hardButton]}
              onPress={() => onGrade("hard")}
            >
              <Text style={styles.feedbackButtonText}>Hard</Text>
              <Text style={styles.intervalText}>{card.intervals.hard}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.goodButton]}
              onPress={() => onGrade("good")}
            >
              <Text style={styles.feedbackButtonText}>Good</Text>
              <Text style={styles.intervalText}>{card.intervals.good}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.easyButton]}
              onPress={() => onGrade("easy")}
            >
              <Text style={styles.feedbackButtonText}>Easy</Text>
              <Text style={styles.intervalText}>{card.intervals.easy}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

const getStyles = (colorScheme) => {
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";

  // --- Theme Colors ---
  const backgroundColor = isDark ? "#000" : "#f0f4f8";
  const textColor = isDark ? "#fff" : "#000";
  const cardBackgroundColor = isDark ? "#1e1e1e" : "#fff";
  const mutedTextColor = isDark ? "#a0a0a0" : "#666";
  const dividerColor = isDark ? "#333" : "#e0e0e0";

  // --- Platform-Specific Layout Variables ---
  const platformStyles = {
    web: {
      card: {
        width: 500,
        height: 400,
      },
      feedbackContainer: {
        position: "relative",
        marginTop: 20,
        maxWidth: 800,
      },
      feedbackButton: {
        paddingVertical: 50,
        paddingHorizontal: 50,
        marginHorizontal: 30,
        flex: 0, // Let buttons size naturally
      },
    },
    mobile: {
      card: {
        width: "85%",
        height: 450, // Taller card on mobile
        marginTop: 20,
      },
      feedbackContainer: {
        position: "relative",
        bottom: -20,
        paddingHorizontal: 10,
      },
      feedbackButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        flex: 1, // Make buttons fill the space
      },
    },
  };

  const specificStyles = isWeb ? platformStyles.web : platformStyles.mobile;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: backgroundColor,
      width: "100%",
      paddingTop: isWeb ? 40 : 0,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 18,
      color: textColor,
    },
    card: {
      // Common card styles
      backgroundColor: cardBackgroundColor,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      padding: 20,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#333" : "transparent",
      // Platform-specific size
      ...specificStyles.card,
    },
    cardText: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: textColor,
    },
    cardTextSmall: {
      fontSize: 20,
    },
    flippedFrontText: {
      fontSize: 20,
      fontWeight: "500",
      color: mutedTextColor,
    },
    cardBackText: {
      fontSize: 32,
      fontWeight: "bold",
      color: textColor,
    },
    divider: {
      height: 1,
      backgroundColor: dividerColor,
      width: "80%",
      marginVertical: 15,
    },
    flipButton: {
      marginTop: 30,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 25,
      backgroundColor: "#007bff",
    },
    flipButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    feedbackContainer: {
      // Common feedback container styles
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
      // Platform-specific positioning
      ...specificStyles.feedbackContainer,
    },
    feedbackButton: {
      // Common feedback button styles
      borderRadius: 8,
      minWidth: 70,
      alignItems: "center",
      // *** FIX: Add justifyContent to fully center the content ***
      justifyContent: "center",
      // Platform-specific size
      ...specificStyles.feedbackButton,
    },
    feedbackButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    intervalText: {
      color: "white",
      fontSize: 12,
      marginTop: 2,
    },
    againButton: { backgroundColor: "#dc3545" },
    hardButton: { backgroundColor: "#ffc107" },
    goodButton: { backgroundColor: "#28a745" },
    easyButton: { backgroundColor: "#17a2b8" },
  });
};
