// components/WordscapeGame.tsx
import React, { useState, useEffect, useMemo } from "react";
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

  // Note: Drawing lines between letters with react-native-svg would be a great enhancement here.
  // This implementation focuses on the core logic.

  const letterPositions = useMemo(() => {
    if (letters.length === 0) return [];
    const angle = 360 / letters.length;
    const radius = 100; // a suitable radius for the circle
    return letters.map((_, i) => ({
      x: radius * Math.cos((angle * i - 90) * (Math.PI / 180)),
      y: radius * Math.sin((angle * i - 90) * (Math.PI / 180)),
    }));
  }, [letters]);

  const handlePress = (index, letter) => {
    if (selectedIndices.includes(index)) return;

    const newSelectedIndices = [...selectedIndices, index];
    const newWord = currentWord + letter;

    setSelectedIndices(newSelectedIndices);
    setCurrentWord(newWord);
    onWordChange(newWord);
  };

  const handleRelease = () => {
    if (currentWord) {
      onWordSubmit(currentWord);
    }
    setSelectedIndices([]);
    setCurrentWord("");
    onWordChange("");
  };

  return (
    <View
      style={styles.circleContainer}
      onMouseUp={handleRelease}
      onTouchEnd={handleRelease}
    >
      <View style={styles.letterWrapper}>
        {letters.map((letter, index) => {
          const pos = letterPositions[index];
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.letter,
                {
                  transform: [{ translateX: pos.x }, { translateY: pos.y }],
                },
                selectedIndices.includes(index) && styles.selectedLetter,
              ]}
              onPressIn={() => handlePress(index, letter)}
              activeOpacity={0.8}
            >
              <Text style={styles.letterText}>{letter.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const WordscapeGame = () => {
  const [foundWords, setFoundWords] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [wordToTranslate, setWordToTranslate] = useState(null);
  const [translationInput, setTranslationInput] = useState("");

  const settings = useQuery(api.users.getSettings);
  // Add a state to refetch words for a new game
  const [gameId, setGameId] = useState(1);
  const gameWords = useQuery(
    api.words.getWordsForGame,
    settings ? { settings, gameId } : "skip"
  );
  const gradeWord = useMutation(api.userWords.gradeWord);

  const levelWords = useMemo(() => gameWords || [], [gameWords]);
  const allLetters = useMemo(() => {
    if (!levelWords || levelWords.length === 0) return [];
    const uniqueLetters = new Set(
      levelWords
        .map((w) => w.esperanto)
        .join("")
        .split("")
    );
    return shuffleArray(Array.from(uniqueLetters));
  }, [levelWords]);

  const handleWordSubmit = (word) => {
    if (word.length > 1 && !foundWords.includes(word)) {
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

  const handleTranslationSubmit = () => {
    if (!wordToTranslate || !settings) return;

    const isCorrect =
      translationInput.trim().toLowerCase() ===
      wordToTranslate.english.toLowerCase();
    const rating = isCorrect ? "good" : "again";

    gradeWord({ wordText: wordToTranslate.esperanto, rating, settings });

    if (isCorrect) {
      setFoundWords((prev) => [...prev, wordToTranslate.esperanto]);
    }

    Alert.alert(
      isCorrect ? "Correct!" : "Incorrect",
      `The correct translation for "${wordToTranslate.esperanto}" is "${wordToTranslate.english}". Your card has been updated.`
    );

    setTranslationInput("");
    setModalVisible(false);
    setWordToTranslate(null);
  };

  const startNewGame = () => {
    setFoundWords([]);
    setGameId((prevId) => prevId + 1);
  };

  if (!gameWords || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading game...</Text>
      </View>
    );
  }

  const allWordsFound =
    levelWords.length > 0 && foundWords.length === levelWords.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Game</Text>
      <View style={styles.foundWordsContainer}>
        {levelWords.map((word, index) => (
          <View
            key={index}
            style={[
              styles.wordBox,
              foundWords.includes(word.esperanto) && styles.foundWordBox,
            ]}
          >
            <Text style={styles.wordBoxText}>
              {foundWords.includes(word.esperanto)
                ? word.esperanto
                : "_ ".repeat(word.esperanto.length).trim()}
            </Text>
          </View>
        ))}
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
  foundWordBox: {
    backgroundColor: "#4CAF50",
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
