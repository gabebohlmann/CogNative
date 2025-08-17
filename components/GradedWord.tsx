// components/GradedWord.tsx
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

export type GradeKey = "default" | "again" | "hard" | "good" | "easy";

interface GradedWordProps {
  word: string;
  onPress: () => void;
  grade: GradeKey;
  fontSize: number;
  colorScheme: "light" | "dark"; // Accept the color scheme
}

export const GradedWord = React.forwardRef<Pressable, GradedWordProps>(
  ({ word, onPress, grade, fontSize, colorScheme }, ref) => {
    const isDark = colorScheme === "dark";

    // Define text color based on the theme
    const textColor = isDark ? "#FFFFFF" : "#000000";

    const gradeStyles: { [key in GradeKey]: object } = {
      default: { color: textColor },
      again: { backgroundColor: "rgba(220, 53, 69, 0.4)" },
      hard: { backgroundColor: "rgba(255, 193, 7, 0.4)" },
      good: { backgroundColor: "rgba(40, 167, 69, 0.4)" },
      easy: { backgroundColor: "rgba(23, 162, 184, 0.4)" },
    };

    return (
      <Pressable ref={ref} onPress={onPress}>
        <Text style={[{ fontSize }, gradeStyles[grade], { color: textColor }]}>
          {word}
        </Text>
      </Pressable>
    );
  }
);
