import React, { forwardRef } from "react";
import { Pressable, Text, useColorScheme } from "react-native";

const GRADE_COLORS = {
  again: "#dc3545",
  hard: "#ffc107",
  good: "#28a745", // A green for 'good'
  easy: "#17a2b8",
};

export type GradeKey = "again" | "hard" | "good" | "easy" | "default";

interface GradedWordProps {
  word: string;
  fontSize: number;
  onPress: () => void; // Simple click handler
  grade: GradeKey; // Receives its grade as a prop
}

const GradedWordComponent = (
  { word, fontSize, onPress, grade }: GradedWordProps,
  ref: React.Ref<Pressable>
) => {
  const colorScheme = useColorScheme();
  const defaultTextColor = colorScheme === "dark" ? "#FFF" : "#000";

  // The color is determined entirely by the `grade` prop.
  const targetColor = GRADE_COLORS[grade] || defaultTextColor;

  return (
    <Pressable ref={ref} onPress={onPress}>
      <Text style={{ color: targetColor, fontSize: fontSize }}>{word}</Text>
    </Pressable>
  );
};

export const GradedWord = React.memo(forwardRef(GradedWordComponent));
