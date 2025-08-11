// components/GradedWord.tsx
import React, { useState, useCallback } from "react";
import {
  Pressable,
  Text,
  useColorScheme,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";

const GRADE_COLORS = {
  again: "#dc3545", // Red
  hard: "#ffc107", // Orange
  easy: "#17a2b8", // Blue
};

// Define the cycle of grades
const GRADING_CYCLE: GradeKey[] = ["again", "hard", "good", "easy"];
type GradeKey = "again" | "hard" | "good" | "easy" | "default";

interface GradedWordProps {
  word: string;
  cleanedWord: string;
  wordKey: string;
  // This function is called when the word is pressed, passing its details up to the parent
  onPressWord: (
    event: NativeSyntheticEvent<NativeTouchEvent>,
    word: string,
    rating: string,
    wordKey: string
  ) => void;
}

export const GradedWord = React.memo(
  ({ word, cleanedWord, wordKey, onPressWord }: GradedWordProps) => {
    const [grade, setGrade] = useState<GradeKey>("default");
    const colorScheme = useColorScheme();
    const defaultTextColor = colorScheme === "dark" ? "#FFF" : "#000";

    const handlePress = useCallback(
      (event: NativeSyntheticEvent<NativeTouchEvent>) => {
        // Determine the next grade in the cycle
        const currentIndex =
          grade === "default" ? -1 : GRADING_CYCLE.indexOf(grade);
        const nextGrade =
          GRADING_CYCLE[(currentIndex + 1) % GRADING_CYCLE.length];

        // Update this component's own state instantly
        setGrade(nextGrade);

        // Notify the parent component of the press and the new rating
        onPressWord(event, cleanedWord, nextGrade, wordKey);
      },
      [grade, cleanedWord, wordKey, onPressWord]
    );

    const targetColor = GRADE_COLORS[grade] || defaultTextColor;

    return (
      <Pressable onPress={handlePress}>
        <Text style={{ color: targetColor }}>{word}</Text>
      </Pressable>
    );
  }
);
