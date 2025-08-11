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
  again: "#dc3545",
  hard: "#ffc107",
  easy: "#17a2b8",
};

const GRADING_CYCLE: GradeKey[] = ["again", "hard", "good", "easy"];
type GradeKey = "again" | "hard" | "good" | "easy" | "default";

interface GradedWordProps {
  word: string;
  cleanedWord: string;
  wordKey: string;
  // --- FIX: The prop is updated to pass the full event object ---
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
        const currentIndex =
          grade === "default" ? -1 : GRADING_CYCLE.indexOf(grade);
        const nextGrade =
          GRADING_CYCLE[(currentIndex + 1) % GRADING_CYCLE.length];

        setGrade(nextGrade);

        // --- FIX: Pass the event object along with other details ---
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
