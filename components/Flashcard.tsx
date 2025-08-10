import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

// --- Main Flashcard Component ---
export default function Flashcard() {
  // --- State Management ---
  const [cards, setCards] = useState<any[] | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));

  // --- Data Fetching ---
  const dueCards = useQuery(api.words.getDueCards);
  const randomWord = useQuery(api.words.getRandomWord);
  
  // --- Mutation ---
  const updateUserWord = useMutation(api.userWords.updateUserWord);

  // --- Effect to load the card queue ---
  useEffect(() => {
    if (cards === null && dueCards !== undefined && randomWord !== undefined) {
      if (dueCards && dueCards.length > 0) {
        setCards(dueCards);
      } else if (randomWord && randomWord.length > 0) {
        setCards(randomWord);
      } else {
        setCards([]);
      }
    }
  }, [dueCards, randomWord, cards]);

  const card = cards && cards.length > 0 ? cards[0] : null;

  // --- Animation Logic ---
  // Memoize the animation styles to prevent re-creation on every render
  // and to fix the initialization error.
  const { frontAnimatedStyle, backAnimatedStyle } = useMemo(() => {
    const frontInterpolate = flipAnimation.interpolate({
      inputRange: [0, 180],
      outputRange: ['0deg', '180deg'],
    });
    const backInterpolate = flipAnimation.interpolate({
      inputRange: [0, 180],
      outputRange: ['180deg', '360deg'],
    });
    return {
      frontAnimatedStyle: { transform: [{ rotateY: frontInterpolate }] },
      backAnimatedStyle: { transform: [{ rotateY: backInterpolate }] },
    };
  }, [flipAnimation]);


  // --- Handlers ---
  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.timing(flipAnimation, {
      toValue,
      duration: 600,
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const handleFeedback = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!card) return;
    await updateUserWord({ wordId: card._id, rating });
    setCards(currentCards => (currentCards ? currentCards.slice(1) : []));
    setIsFlipped(false);
    flipAnimation.setValue(0);
  };

  // --- Render Logic ---
  if (cards === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
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
        <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
          <Text style={styles.cardText}>{card.english}</Text>
          {card.sampleUsage && <Text style={styles.sampleText}>{card.sampleUsage}</Text>}
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
        <Text style={styles.flipButtonText}>{isFlipped ? 'Show Question' : 'Show Answer'}</Text>
      </TouchableOpacity>

      {isFlipped && card.intervals && (
        <View style={styles.feedbackContainer}>
          <TouchableOpacity style={[styles.feedbackButton, styles.againButton]} onPress={() => handleFeedback('again')}>
            <Text style={styles.feedbackButtonText}>Again</Text>
            <Text style={styles.intervalText}>{card.intervals.again}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackButton, styles.hardButton]} onPress={() => handleFeedback('hard')}>
            <Text style={styles.feedbackButtonText}>Hard</Text>
            <Text style={styles.intervalText}>{card.intervals.hard}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackButton, styles.goodButton]} onPress={() => handleFeedback('good')}>
            <Text style={styles.feedbackButtonText}>Good</Text>
            <Text style={styles.intervalText}>{card.intervals.good}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackButton, styles.easyButton]} onPress={() => handleFeedback('easy')}>
            <Text style={styles.feedbackButtonText}>Easy</Text>
            <Text style={styles.intervalText}>{card.intervals.easy}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
  },
  card: {
    width: 320,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
  },
  cardText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  sampleText: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  flipButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#007bff',
  },
  flipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  feedbackButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  intervalText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 2,
  },
  againButton: { backgroundColor: '#dc3545' },
  hardButton: { backgroundColor: '#ffc107' },
  goodButton: { backgroundColor: '#28a745' },
  easyButton: { backgroundColor: '#17a2b8' },
});
