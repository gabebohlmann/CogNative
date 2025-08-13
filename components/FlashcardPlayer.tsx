// components/FlashcardPlayer.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";

export const FlashcardPlayer = ({ card, onGrade, isLoading, isDone }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Reset flip animation when a new card is shown
    setIsFlipped(false);
    flipAnimation.setValue(0);
  }, [card]);

  const { frontAnimatedStyle, backAnimatedStyle } = useMemo(() => {
    const frontInterpolate = flipAnimation.interpolate({
      inputRange: [0, 180],
      outputRange: ["0deg", "180deg"],
    });
    const backInterpolate = flipAnimation.interpolate({
      inputRange: [0, 180],
      outputRange: ["180deg", "360deg"],
    });
    return {
      frontAnimatedStyle: { transform: [{ rotateY: frontInterpolate }] },
      backAnimatedStyle: { transform: [{ rotateY: backInterpolate }] },
    };
  }, [flipAnimation]);

  const handleFlip = () => {
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      duration: 600,
      useNativeDriver: false,
    }).start(() => setIsFlipped(!isFlipped));
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  if (isDone) {
    return (
      <View style={styles.container}>
        <Text style={styles.cardText}>🎉</Text>
        <Text style={styles.loadingText}>You're all done for now!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Animated.View style={[styles.card, frontAnimatedStyle]}>
          <Text style={styles.cardText}>{card.front}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.card, styles.cardBack, backAnimatedStyle]}
        >
          <Text style={styles.cardText}>{card.back}</Text>
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
        <Text style={styles.flipButtonText}>
          {isFlipped ? "Show Question" : "Show Answer"}
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
    height: 200,
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBack: { position: "absolute", top: 0 },
  cardText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    padding: 10,
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