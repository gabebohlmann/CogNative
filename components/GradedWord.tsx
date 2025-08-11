// components/GradedWord.tsx
import React, { useState, useCallback, forwardRef } from "react";
import { Pressable, Text, useColorScheme } from "react-native";

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
  // The event object is no longer needed
  onPressWord: (word: string, rating: string, wordKey: string) => void;
}

// --- FIX: Wrap the component in forwardRef to accept a ref from the parent ---
export const GradedWord = React.memo(
  forwardRef<Pressable, GradedWordProps>(
    ({ word, cleanedWord, wordKey, onPressWord }, ref) => {
      const [grade, setGrade] = useState<GradeKey>("default");
      const colorScheme = useColorScheme();
      const defaultTextColor = colorScheme === "dark" ? "#FFF" : "#000";

      const handlePress = useCallback(() => {
        // This function no longer receives the event object
        const currentIndex =
          grade === "default" ? -1 : GRADING_CYCLE.indexOf(grade);
        const nextGrade =
          GRADING_CYCLE[(currentIndex + 1) % GRADING_CYCLE.length];

        setGrade(nextGrade);

        // Pass details up to the parent
        onPressWord(cleanedWord, nextGrade, wordKey);
      }, [grade, cleanedWord, wordKey, onPressWord]);

      const targetColor = GRADE_COLORS[grade] || defaultTextColor;

      return (
        // --- FIX: Attach the forwarded ref to the Pressable element ---
        <Pressable ref={ref} onPress={handlePress}>
          <Text style={{ color: targetColor }}>{word}</Text>
        </Pressable>
      );
    }
  )
);
