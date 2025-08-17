// components/WordcircleGame.tsx

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
// Note: Gesture handler is no longer needed for the LetterCircle
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

// --- Refactored LetterCircle for Tap Interaction ---
const LetterCircle = ({ letters, onLetterTap, selectedIndices }) => {
  const letterPositions = useMemo(() => {
    if (letters.length === 0) return [];
    const angle = 360 / letters.length;
    const radius = 100;
    return letters.map((_, i) => ({
      x: radius * Math.cos((angle * i - 90) * (Math.PI / 180)),
      y: radius * Math.sin((angle * i - 90) * (Math.PI / 180)),
    }));
  }, [letters]);

  return (
    <View style={styles.circleContainer}>
      <View style={styles.letterWrapper}>
        {letters.map((letter, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.letter,
                {
                  transform: [
                    { translateX: letterPositions[index].x },
                    { translateY: letterPositions[index].y },
                  ],
                },
                isSelected && styles.selectedLetter,
              ]}
              onPress={() => onLetterTap(letter, index)}
              disabled={isSelected} // Prevent tapping the same letter twice in a row
            >
              <Text style={styles.letterText}>{letter.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const WordcircleGame = () => {
  const [foundWords, setFoundWords] = useState({});
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentIndices, setCurrentIndices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [wordToTranslate, setWordToTranslate] = useState(null);
  const [translationInput, setTranslationInput] = useState("");
  const [isLoadingNewLevel, setIsLoadingNewLevel] = useState(false);

  const [levelWords, setLevelWords] = useState(null);
  const [gameId, setGameId] = useState(1);
  const [nextGameId, setNextGameId] = useState(2);
  const [prefetchedWords, setPrefetchedWords] = useState(null);
  const loadedGameIdRef = useRef(0);

  const settings = useQuery(api.users.getSettings);
  const gradeWord = useMutation(api.userWords.gradeWord);

  const fetchedWords = useQuery(
    api.words.getWordsForGame,
    settings ? { settings, gameId } : "skip"
  );

  const allWordsFound =
    levelWords &&
    levelWords.length > 0 &&
    Object.keys(foundWords).length === levelWords.length;

  const prefetchedData = useQuery(
    api.words.getWordsForGame,
    allWordsFound && settings ? { settings, gameId: nextGameId } : "skip"
  );

  useEffect(() => {
    if (fetchedWords && gameId !== loadedGameIdRef.current) {
      setLevelWords(fetchedWords);
      loadedGameIdRef.current = gameId;
      setIsLoadingNewLevel(false);
      console.log(
        "Loaded words for game ID:",
        gameId,
        fetchedWords.map((w) => w.esperanto)
      );
    }
  }, [fetchedWords, gameId]);

  useEffect(() => {
    if (prefetchedData) {
      console.log(
        `Prefetched words for game ID ${nextGameId}:`,
        prefetchedData.map((w) => w.esperanto)
      );
      setPrefetchedWords(prefetchedData);
    }
  }, [prefetchedData]);

  const allLetters = useMemo(() => {
    if (!levelWords || levelWords.length === 0) return [];
    const maxFrequencies = {};
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
    const scapeLetters = [];
    for (const letter in maxFrequencies) {
      for (let i = 0; i < maxFrequencies[letter]; i++) {
        scapeLetters.push(letter);
      }
    }
    return shuffleArray(scapeLetters);
  }, [levelWords]);

  const clearGuess = () => {
    setCurrentGuess("");
    setCurrentIndices([]);
  };

  const handleLetterTap = (letter, index) => {
    setCurrentGuess((prev) => prev + letter);
    setCurrentIndices((prev) => [...prev, index]);
  };

  const handleWordSubmit = () => {
    const word = currentGuess;
    if (word.length > 1 && !foundWords.hasOwnProperty(word)) {
      const matchedWord = levelWords.find(
        (w) => w.esperanto.toLowerCase() === word.toLowerCase()
      );
      if (matchedWord) {
        setWordToTranslate(matchedWord);
        setModalVisible(true);
      }
    }
    clearGuess();
  };

  const handleTranslationSubmit = () => {
    if (!wordToTranslate || !settings) return;
    const isCorrect =
      translationInput.trim().toLowerCase() ===
      wordToTranslate.english.toLowerCase();
    const rating = isCorrect ? "good" : "again";

    setFoundWords((prev) => ({
      ...prev,
      [wordToTranslate.esperanto]: isCorrect ? "correct" : "incorrect",
    }));
    setTranslationInput("");
    setModalVisible(false);

    const translatedWordInfo = wordToTranslate;
    setWordToTranslate(null);

    // Mobile toast alert
    // Alert.alert(
    //   isCorrect ? "Correct!" : "Incorrect",
    //   `The correct translation for "${translatedWordInfo.esperanto}" is "${translatedWordInfo.english}". Your card has been updated.`
    // );

    console.log(
      `[DB SEND] Submitting grade for "${translatedWordInfo.esperanto}": ${rating}`
    );
    gradeWord({
      wordText: translatedWordInfo.esperanto,
      rating,
      settings,
    })
      .then((result) => {
        console.log(
          "[DB RECEIVE] Background grading successful, result:",
          result
        );
      })
      .catch((error) => {
        console.error("[DB ERROR] Background grade submission failed:", error);
      });
  };

  const startNewGame = () => {
    if (prefetchedWords) {
      setFoundWords({});
      setLevelWords(prefetchedWords);
      setGameId(nextGameId);
      setNextGameId(nextGameId + 1);
      setPrefetchedWords(null);
      loadedGameIdRef.current = nextGameId;
    } else {
      setIsLoadingNewLevel(true);
      setFoundWords({});
      setGameId((prevId) => prevId + 1);
      setNextGameId((prevId) => prevId + 2);
    }
  };

  if (!levelWords || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wordcircle</Text>
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
              <Text
                style={[styles.wordBoxText, isFound && styles.foundWordBoxText]}
              >
                {isFound
                  ? word.esperanto
                  : "_ ".repeat(word.esperanto.length).trim()}
              </Text>
            </View>
          );
        })}
      </View>
      {isLoadingNewLevel ? (
        <View style={styles.gameArea}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>Loading next level...</Text>
        </View>
      ) : allWordsFound ? (
        <View style={styles.gameArea}>
          <Text style={styles.congratsText}>🎉 Level Complete! 🎉</Text>
          <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
            <Text style={styles.newGameButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameArea}>
          <Text style={styles.currentGuess}>{currentGuess.toUpperCase()}</Text>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={clearGuess}>
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleWordSubmit}
            >
              <Text style={styles.actionButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <LetterCircle
            letters={allLetters}
            onLetterTap={handleLetterTap}
            selectedIndices={currentIndices}
          />
        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          clearGuess(); // Clear guess if user closes modal
        }}
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
    paddingVertical: 0,
    paddingHorizontal: 10,
    width: "100%",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
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
  foundWordBoxText: {
    color: "#fff",
  },
  correctWordBox: {
    backgroundColor: "#4CAF50",
  },
  incorrectWordBox: {
    backgroundColor: "#dc3545",
  },
  gameArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
    marginBottom: 10,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: 250,
    marginBottom: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#6c757d",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
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
    margin: -25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedLetter: {
    backgroundColor: "#6c757d", // Grey out selected letters
    opacity: 0.7,
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
