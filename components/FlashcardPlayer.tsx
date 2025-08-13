// components/FlashcardPlayer.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
} from "react-native";

export const FlashcardPlayer = ({ card, onGrade, isLoading, isDone }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Use refs to give the PanResponder access to the latest state and props
  const isFlippedRef = useRef(isFlipped);
  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  // --- NEW: Create a ref to hold the latest onGrade function ---
  const onGradeRef = useRef(onGrade);
  useEffect(() => {
    onGradeRef.current = onGrade;
  }, [onGrade]);

  useEffect(() => {
    setIsFlipped(false);
  }, [card]);

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isFlippedRef.current,
      onMoveShouldSetPanResponder: () => isFlippedRef.current,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const swipeThreshold = 50;

        // A helper to call the grade function from the ref
        const grade = (rating) => {
          if (onGradeRef.current) {
            onGradeRef.current(rating);
          }
        };

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
          if (dx > 0) {
            grade("good");
          } else {
            grade("again");
          }
        } else if (
          Math.abs(dy) > Math.abs(dx) &&
          Math.abs(dy) > swipeThreshold
        ) {
          if (dy > 0) {
            grade("hard");
          } else {
            grade("easy");
          }
        }
      },
    })
  ).current;

  if (isLoading) {
    return <ActivityIndicator style={styles.container} size="large" />;
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
    <View style={styles.container}>
      <View style={styles.card} {...panResponder.panHandlers}>
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

      <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
        <Text style={styles.flipButtonText}>
          {isFlipped ? "Hide Answer" : "Show Answer"}
        </Text>
      </TouchableOpacity>

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
  loadingText: { marginTop: 10, fontSize: 18, color: "#333" },
  card: {
    width: 320,
    minHeight: 450,
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 20,
  },
  cardText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  cardTextSmall: {
    fontSize: 20,
  },
  flippedFrontText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#666",
  },
  cardBackText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
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
  flipButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  feedbackContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  feedbackButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  feedbackButtonText: { color: "white", fontWeight: "bold" },
  intervalText: { color: "white", fontSize: 12, marginTop: 2 },
  againButton: { backgroundColor: "#dc3545" },
  hardButton: { backgroundColor: "#ffc107" },
  goodButton: { backgroundColor: "#28a745" },
  easyButton: { backgroundColor: "#17a2b8" },
});