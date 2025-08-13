// app/(tabs)/index.tsx
import { ActivityIndicator, Image, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import Ionicons from "@expo/vector-icons/Ionicons";
import Button from "@/components/Button";
import { router } from 'expo-router';
import Flashcard from "@/components/Flashcard";
import WordsScreen from '@/components/WordsScreen';
import { ScrollView } from 'react-native-gesture-handler';

export default function HomeScreen() {
  return (
    <ScrollView>
      <WordsScreen />
    </ScrollView>

  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
