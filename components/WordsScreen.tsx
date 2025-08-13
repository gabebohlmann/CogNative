// components/WordsScreen.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { FlashcardPlayer } from "./FlashcardPlayer"; // Import the new player

export default function WordsScreen() {
  const [cards, setCards] = useState<any[] | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const resetCounters = useMutation(api.users.resetDailyCountersIfNeeded);
  const settings = useQuery(api.users.getSettings);
  const dueCards = useQuery(
    api.words.getDueCards,
    !isSessionReady || !settings ? "skip" : { settings }
  );
  const newCards = useQuery(
    api.words.getRandomWord,
    !isSessionReady || !settings ? "skip" : { settings }
  );
  const gradeWord = useMutation(api.userWords.gradeWord);

  useEffect(() => {
    const prepareSession = async () => {
      await resetCounters();
      setIsSessionReady(true);
    };
    prepareSession();
  }, [resetCounters]);

  useEffect(() => {
    if (
      isSessionReady &&
      settings &&
      dueCards !== undefined &&
      newCards !== undefined
    ) {
      const sessionQueue = [...(dueCards || []), ...(newCards || [])];
      setCards(sessionQueue);
    }
  }, [isSessionReady, dueCards, newCards, settings]);

  const handleGradeWord = (rating: "again" | "hard" | "good" | "easy") => {
    if (!cards || cards.length === 0 || !settings) return;
    const currentCard = cards[0];

    // Optimistic update
    setCards((currentCards) => (currentCards ? currentCards.slice(1) : []));

    // Send to backend
    gradeWord({ wordText: currentCard.esperanto, rating, settings }).catch(
      (err) => console.error("Failed to save grade:", err)
    );
  };

  const isLoading = !isSessionReady || cards === null || !settings;
  const currentCard =
    !isLoading && cards && cards.length > 0
      ? {
          front: cards[0].esperanto,
          back: cards[0].english,
          intervals: cards[0].intervals,
        }
      : null;

  return (
    <FlashcardPlayer
      isLoading={isLoading}
      isDone={!isLoading && !currentCard}
      card={currentCard}
      onGrade={handleGradeWord}
    />
  );
}