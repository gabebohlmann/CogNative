// components/Flashcard.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Flashcard() {
  const [cards, setCards] = useState<any[] | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));
  const [isSessionReady, setIsSessionReady] = useState(false);

  // --- Mutations and Queries ---
  const resetCounters = useMutation(api.users.resetDailyCountersIfNeeded);
  const settings = useQuery(api.users.getSettings);
  const dueCards = useQuery(
    api.words.getDueCards,
    !isSessionReady || !settings ? "skip" : { settings }
  );
  const newCards = useQuery(
    api.words.getRandomWord,
    !isSessionReady || !settings ? "skip" : { settings }
  );

  const gradeWord = useMutation(api.userWords.gradeWord);

  useEffect(() => {
    const prepareSession = async () => {
      await resetCounters();
      setIsSessionReady(true);
    };
    prepareSession();
  }, [resetCounters]);

  useEffect(() => {
    if (
      isSessionReady &&
      settings &&
      dueCards !== undefined &&
      newCards !== undefined
    ) {
      const sessionQueue = [...(dueCards || []), ...(newCards || [])];
      setCards(sessionQueue);
    }
  }, [isSessionReady, dueCards, newCards, settings]);

  const card = cards && cards.length > 0 ? cards[0] : null;

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
    const toValue = isFlipped ? 0 : 180;
    // --- FIX ---
    // The native driver for animations is not initialized on mobile, causing a crash.
    // Setting `useNativeDriver: false` makes the animation run on the JS thread, avoiding the error.
    Animated.timing(flipAnimation, {
      toValue,
      duration: 600,
      useNativeDriver: false,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const handleFeedback = async (rating: "again" | "hard" | "good" | "easy") => {
    if (!card) return;

    // The mutation now expects 'wordText' instead of 'wordId'.
    // We get this from the 'esperanto' field of the current card.
    await gradeWord({ wordText: card.esperanto, rating });

    setCards((currentCards) => (currentCards ? currentCards.slice(1) : []));
    setIsFlipped(false);
    flipAnimation.setValue(0);
  };

  if (!isSessionReady || cards === null) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  if (!card) {
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
          <Text style={styles.cardText}>{card.esperanto}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.card, styles.cardBack, backAnimatedStyle]}
        >
          <Text style={styles.cardText}>{card.english}</Text>
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
            onPress={() => handleFeedback("again")}
          >
            <Text style={styles.feedbackButtonText}>Again</Text>
            <Text style={styles.intervalText}>{card.intervals.again}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.hardButton]}
            onPress={() => handleFeedback("hard")}
          >
            <Text style={styles.feedbackButtonText}>Hard</Text>
            <Text style={styles.intervalText}>{card.intervals.hard}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.goodButton]}
            onPress={() => handleFeedback("good")}
          >
            <Text style={styles.feedbackButtonText}>Good</Text>
            <Text style={styles.intervalText}>{card.intervals.good}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, styles.easyButton]}
            onPress={() => handleFeedback("easy")}
          >
            <Text style={styles.feedbackButtonText}>Easy</Text>
            <Text style={styles.intervalText}>{card.intervals.easy}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

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
  intervalText: { color: "#ffffff", fontSize: 12, marginTop: 2 },
  againButton: { backgroundColor: "#dc3545" },
  hardButton: { backgroundColor: "#ffc107" },
  goodButton: { backgroundColor: "#28a745" },
  easyButton: { backgroundColor: "#17a2b8" },
});
  