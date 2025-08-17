// components/CardSettings.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useColorScheme } from "@/context/ThemeContext";

export default function CardSettings() {
  const [retention, setRetention] = useState("0.9");
  const [maxInterval, setMaxInterval] = useState("36500");
  const [learningSteps, setLearningSteps] = useState("3m, 15m");
  const [relearningSteps, setRelearningSteps] = useState("10m");
  const [easyInterval, setEasyInterval] = useState("4");
  const [newCardsPerDay, setNewCardsPerDay] = useState("20");
  const [reviewsPerDay, setReviewsPerDay] = useState("200");
  const [isSaving, setIsSaving] = useState(false);

  // Use the new theme context to get the current theme and the function to change it.
  const { themePreference, setThemePreference, colorScheme } = useColorScheme();
  const styles = getStyles(colorScheme);

  const userSettings = useQuery(api.users.getSettings);
  const updateUserSettings = useMutation(api.users.updateSettings);

  useEffect(() => {
    if (userSettings) {
      setRetention(String(userSettings.request_retention));
      setMaxInterval(String(userSettings.maximum_interval));
      setLearningSteps(userSettings.learning_steps.join(", "));
      setRelearningSteps(userSettings.relearning_steps.join(", "));
      setEasyInterval(String(userSettings.easy_interval));
      setNewCardsPerDay(String(userSettings.new_cards_per_day));
      setReviewsPerDay(String(userSettings.reviews_per_day));
    }
  }, [userSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserSettings({
        request_retention: parseFloat(retention),
        maximum_interval: parseInt(maxInterval, 10),
        learning_steps: learningSteps.split(",").map((s) => s.trim()),
        relearning_steps: relearningSteps.split(",").map((s) => s.trim()),
        easy_interval: parseInt(easyInterval, 10),
        new_cards_per_day: parseInt(newCardsPerDay, 10),
        reviews_per_day: parseInt(reviewsPerDay, 10),
      });
      Alert.alert("Success", "Settings saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (userSettings === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "#fff" : "#000"}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.header}>Appearance</Text>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Theme</Text>
        <View style={styles.themeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.themeButton,
              themePreference === "light" && styles.activeThemeButton,
            ]}
            onPress={() => setThemePreference("light")}
          >
            <Text
              style={[
                styles.themeButtonText,
                themePreference === "light" && styles.activeThemeButtonText,
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.themeButton,
              themePreference === "dark" && styles.activeThemeButton,
            ]}
            onPress={() => setThemePreference("dark")}
          >
            <Text
              style={[
                styles.themeButtonText,
                themePreference === "dark" && styles.activeThemeButtonText,
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.themeButton,
              themePreference === "system" && styles.activeThemeButton,
            ]}
            onPress={() => setThemePreference("system")}
          >
            <Text
              style={[
                styles.themeButtonText,
                themePreference === "system" && styles.activeThemeButtonText,
              ]}
            >
              System
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.header}>FSRS Settings</Text>

      {/* ... all your other settings items ... */}
      <View style={styles.settingItem}>
        <Text style={styles.label}>New Cards/Day</Text>
        <TextInput
          style={styles.input}
          value={newCardsPerDay}
          onChangeText={setNewCardsPerDay}
          keyboardType="numeric"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Maximum Reviews/Day</Text>
        <TextInput
          style={styles.input}
          value={reviewsPerDay}
          onChangeText={setReviewsPerDay}
          keyboardType="numeric"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Learning Steps</Text>
        <TextInput
          style={styles.input}
          value={learningSteps}
          onChangeText={setLearningSteps}
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Relearning Steps</Text>
        <TextInput
          style={styles.input}
          value={relearningSteps}
          onChangeText={setRelearningSteps}
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Easy Interval</Text>
        <Text style={styles.description}>
          The first interval (in days) for a new card rated "Easy".
        </Text>
        <TextInput
          style={styles.input}
          value={easyInterval}
          onChangeText={setEasyInterval}
          keyboardType="numeric"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Maximum Interval</Text>
        <TextInput
          style={styles.input}
          value={maxInterval}
          onChangeText={setMaxInterval}
          keyboardType="numeric"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.label}>Desired Retention</Text>
        <TextInput
          style={styles.input}
          value={retention}
          onChangeText={setRetention}
          keyboardType="numeric"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colorScheme) => {
  const isDark = colorScheme === "dark";

  const backgroundColor = isDark ? "#000" : "#f0f4f8";
  const textColor = isDark ? "#fff" : "#000";
  const cardBackgroundColor = isDark ? "#1e1e1e" : "#fff";
  const mutedTextColor = isDark ? "#a0a0a0" : "#666";
  const borderColor = isDark ? "#333" : "#ccc";
  const inactiveThemeBg = isDark ? "#2c2c2e" : "#e9ecef";

  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: backgroundColor,
    },
    header: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      marginTop: 10,
      color: textColor,
    },
    settingItem: {
      marginBottom: 20,
      backgroundColor: cardBackgroundColor,
      padding: 15,
      borderRadius: 8,
    },
    label: {
      fontSize: 18,
      fontWeight: "600",
      color: textColor,
    },
    description: {
      fontSize: 14,
      color: mutedTextColor,
      marginBottom: 10,
      fontStyle: "italic",
    },
    input: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 5,
      padding: 10,
      fontSize: 16,
      marginTop: 5,
      color: textColor,
      backgroundColor: backgroundColor,
    },
    placeholder: {
      color: mutedTextColor,
    },
    saveButton: {
      backgroundColor: "#007bff",
      padding: 15,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
    },
    saveButtonText: {
      color: "white",
      fontSize: 18,
      fontWeight: "bold",
    },
    themeToggleContainer: {
      flexDirection: "row",
      marginTop: 10,
      backgroundColor: inactiveThemeBg,
      borderRadius: 8,
      padding: 2,
    },
    themeButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 6,
    },
    activeThemeButton: {
      backgroundColor: "#007bff",
    },
    themeButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: textColor,
    },
    activeThemeButtonText: {
      color: "#fff",
    },
  });
};
  