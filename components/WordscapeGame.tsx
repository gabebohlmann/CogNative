// components/WordscapeGame.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";  
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

// Simple shuffle utility
const shuffleArray = (array) => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

const LetterCircle = ({ letters, onWordChange, onWordSubmit }) => {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [currentWord, setCurrentWord] = useState("");
  const letterCircleRadius = 25; // Radius of the touchable area for each letter

  const letterPositions = useMemo(() => {
    if (letters.length === 0) return [];
    const angle = 360 / letters.length;
    const radius = 100; // a suitable radius for the circle
    return letters.map((_, i) => ({
      x: radius * Math.cos((angle * i - 90) * (Math.PI / 180)),
      y: radius * Math.sin((angle * i - 90) * (Math.PI / 180)),
    }));
  }, [letters]);

  // Helper function for hit detection during a drag gesture
  const checkHit = (x, y) => {
    // The gesture's coordinates are relative to the top-left of the circle's container.
    // We adjust by the container's center (150, 150) to match the letter positions.
    const adjustedX = x - 150;
    const adjustedY = y - 150;

    for (let i = 0; i < letterPositions.length; i++) {
      const pos = letterPositions[i];
      const distance = Math.sqrt(
        Math.pow(adjustedX - pos.x, 2) + Math.pow(adjustedY - pos.y, 2)
      );
      if (distance < letterCircleRadius && !selectedIndices.includes(i)) {
        return i; // Return the index of the hit letter
      }
    }
    return -1; // No new letter was hit
  };

  // These functions are wrapped in runOnJS to be called from the gesture handler's worklet
  const startWord = (index) => {
    const newWord = letters[index];
    setSelectedIndices([index]);
    setCurrentWord(newWord);
    onWordChange(newWord);
  };

  const updateWord = (index) => {
    const newWord = currentWord + letters[index];
    setSelectedIndices((prev) => [...prev, index]);
    setCurrentWord(newWord);
    onWordChange(newWord);
  };

  const endWord = () => {
    if (currentWord) {
      onWordSubmit(currentWord);
    }
    setSelectedIndices([]);
    setCurrentWord("");
    onWordChange("");
  };

  // This Pan gesture handler allows for dragging across the letters to form a word.
  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const hitIndex = checkHit(e.x, e.y);
      if (hitIndex > -1) {
        runOnJS(startWord)(hitIndex);
      }
    })
    .onUpdate((e) => {
      const hitIndex = checkHit(e.x, e.y);
      if (hitIndex > -1) {
        runOnJS(updateWord)(hitIndex);
      }
    })
    .onEnd(() => {
      runOnJS(endWord)();
    })
    .minDistance(1);

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.circleContainer}>
        <View style={styles.letterWrapper}>
          {letters.map((letter, index) => {
            const pos = letterPositions[index];
            return (
              <View
                key={index}
                style={[
                  styles.letter,
                  {
                    transform: [{ translateX: pos.x }, { translateY: pos.y }],
                  },
                  selectedIndices.includes(index) && styles.selectedLetter,
                ]}
              >
                <Text style={styles.letterText}>{letter.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
};

export const WordscapeGame = () => {
  // Store found words as an object to track their correctness status
  const [foundWords, setFoundWords] = useState({});
  const [currentGuess, setCurrentGuess] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [wordToTranslate, setWordToTranslate] = useState(null);
  const [translationInput, setTranslationInput] = useState("");

  // State to hold the words for the current level, preventing reloads on grade.
  const [levelWords, setLevelWords] = useState(null);
  const [gameId, setGameId] = useState(1);
  const loadedGameIdRef = useRef(0); // Ref to track which gameId's words are loaded.

  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);

  // This query will refetch data in the background, but we'll control when the UI updates.
  const fetchedWords = useQuery(
    api.words.getWordsForGame,
    settings ? { settings, gameId } : "skip"
  );

  // This effect ensures the level's words are only set when a new game starts.
  useEffect(() => {
    // Only update the level's words if the fetch is for a new gameId.
    if (fetchedWords && gameId !== loadedGameIdRef.current) {
      setLevelWords(fetchedWords);
      loadedGameIdRef.current = gameId; // Mark this gameId as loaded.
      console.log(
        "Loaded words for game ID:",
        gameId,
        fetchedWords.map((w) => w.esperanto)
      );
    }
  }, [fetchedWords, gameId]);

  const allLetters = useMemo(() => {
    if (!levelWords || levelWords.length === 0) return [];

    const maxFrequencies = {};

    // Determine the maximum required frequency for each letter across all words
    levelWords.forEach((word) => {
      const wordFrequencies = {};
      for (const letter of word.esperanto) {
        wordFrequencies[letter] = (wordFrequencies[letter] || 0) + 1;
      }

      for (const letter in wordFrequencies) {
        if (
          !maxFrequencies[letter] ||
          wordFrequencies[letter] > maxFrequencies[letter]
        ) {
          maxFrequencies[letter] = wordFrequencies[letter];
        }
      }
    });

    // Build the final letter array based on the calculated maximum frequencies
    const scapeLetters = [];
    for (const letter in maxFrequencies) {
      for (let i = 0; i < maxFrequencies[letter]; i++) {
        scapeLetters.push(letter);
      }
    }

    return shuffleArray(scapeLetters);
  }, [levelWords]);

  const handleWordSubmit = (word) => {
    // Check if the word is already found using the new state structure
    if (word.length > 1 && !foundWords.hasOwnProperty(word)) {
      const matchedWord = levelWords.find(
        (w) => w.esperanto.toLowerCase() === word.toLowerCase()
      );
      if (matchedWord) {
        setWordToTranslate(matchedWord);
        setModalVisible(true);
      }
    }
    setCurrentGuess("");
  };

  const handleTranslationSubmit = async () => {
    if (!wordToTranslate || !settings) return;

    const isCorrect =
      translationInput.trim().toLowerCase() ===
      wordToTranslate.english.toLowerCase();
    const rating = isCorrect ? "good" : "again";

    console.log(
      `[DB SEND] Submitting grade for "${wordToTranslate.esperanto}": ${rating}`
    );
    try {
      // Await the mutation to ensure it completes before proceeding
      const result = await gradeWord({
        wordText: wordToTranslate.esperanto,
        rating,
        settings,
      });
      console.log("[DB RECEIVE] Grading successful, result:", result);
    } catch (error) {
      console.error("[DB ERROR] Failed to submit grade:", error);
      Alert.alert("Error", "Could not save your progress. Please try again.");
    }

    // Add the word to the found list with its correctness status.
    setFoundWords((prev) => ({
      ...prev,
      [wordToTranslate.esperanto]: isCorrect ? "correct" : "incorrect",
    }));

    // Close modal and reset input BEFORE showing the alert.
    // This allows the UI to update in the background.
    setTranslationInput("");
    setModalVisible(false);
    setWordToTranslate(null);

    // Show the confirmation alert last.
    Alert.alert(
      isCorrect ? "Correct!" : "Incorrect",
      `The correct translation for "${wordToTranslate.esperanto}" is "${wordToTranslate.english}". Your card has been updated.`
    );
  };

  const startNewGame = () => {
    // Reset foundWords to an empty object for the new game
    setFoundWords({});
    setGameId((prevId) => prevId + 1);
  };

  // The loading state now depends on `levelWords` instead of the direct query result.
  if (!levelWords || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading game...</Text>
      </View>
    );
  }

  // Check if all words are found using the new state structure
  const allWordsFound =
    levelWords.length > 0 &&
    Object.keys(foundWords).length === levelWords.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Game</Text>
      <View style={styles.foundWordsContainer}>
        {levelWords.map((word, index) => {
          const wordStatus = foundWords[word.esperanto];
          const isFound = !!wordStatus;

          return (
            <View
              key={index}
              style={[
                styles.wordBox,
                isFound &&
                  (wordStatus === "correct"
                    ? styles.correctWordBox
                    : styles.incorrectWordBox),
              ]}
            >
              <Text style={styles.wordBoxText}>
                {isFound
                  ? word.esperanto
                  : "_ ".repeat(word.esperanto.length).trim()}
              </Text>
            </View>
          );
        })}
      </View>

      {allWordsFound ? (
        <View style={styles.centered}>
          <Text style={styles.congratsText}>🎉 Level Complete! 🎉</Text>
          <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
            <Text style={styles.newGameButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.currentGuess}>{currentGuess.toUpperCase()}</Text>
          <LetterCircle
            letters={allLetters}
            onWordChange={setCurrentGuess}
            onWordSubmit={handleWordSubmit}
          />
        </>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              What is the English translation for "{wordToTranslate?.esperanto}
              "?
            </Text>
            <TextInput
              style={styles.input}
              onChangeText={setTranslationInput}
              value={translationInput}
              placeholder="Type translation here"
              autoCapitalize="none"
              onSubmitEditing={handleTranslationSubmit}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleTranslationSubmit}
            >
              <Text style={styles.textStyle}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f4f8",
    paddingVertical: 40,
    paddingHorizontal: 10,
    width: "100%",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  foundWordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 10,
    maxHeight: "30%",
  },
  wordBox: {
    margin: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
  },
  wordBoxText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    letterSpacing: 2,
  },
  correctWordBox: {
    backgroundColor: "#4CAF50", // Green for correct
  },
  incorrectWordBox: {
    backgroundColor: "#dc3545", // Red for incorrect
  },
  currentGuess: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 4,
    height: 40,
    color: "#333",
    borderBottomWidth: 2,
    borderColor: "#ccc",
    textAlign: "center",
    minWidth: 200,
  },
  circleContainer: {
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 20,
  },
  letterWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  letter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    margin: -25, // center the circle
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    // The gesture handler now manages interactions, so this is a display-only component
    pointerEvents: "none",
  },
  selectedLetter: {
    backgroundColor: "#007bff",
  },
  letterText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
  },
  input: {
    height: 40,
    width: 200,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "green",
    marginBottom: 20,
  },
  newGameButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  newGameButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
