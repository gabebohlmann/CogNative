import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

export default function CardSettings() {
  const [retention, setRetention] = useState('0.9');
  const [maxInterval, setMaxInterval] = useState('36500');
  const [learningSteps, setLearningSteps] = useState('3m, 15m');
  const [relearningSteps, setRelearningSteps] = useState('10m');
  const [easyInterval, setEasyInterval] = useState('4');
  const [newCardsPerDay, setNewCardsPerDay] = useState('20');
  const [reviewsPerDay, setReviewsPerDay] = useState('200');
  const [isSaving, setIsSaving] = useState(false);

  const userSettings = useQuery(api.users.getSettings);
  const updateUserSettings = useMutation(api.users.updateSettings);

  useEffect(() => {
    if (userSettings) {
      setRetention(String(userSettings.request_retention));
      setMaxInterval(String(userSettings.maximum_interval));
      setLearningSteps(userSettings.learning_steps.join(', '));
      setRelearningSteps(userSettings.relearning_steps.join(', '));
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
        learning_steps: learningSteps.split(',').map(s => s.trim()),
        relearning_steps: relearningSteps.split(',').map(s => s.trim()),
        easy_interval: parseInt(easyInterval, 10),
        new_cards_per_day: parseInt(newCardsPerDay, 10),
        reviews_per_day: parseInt(reviewsPerDay, 10),
      });
      alert('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (userSettings === undefined) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>FSRS Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.label}>New Cards/Day</Text>
        <TextInput style={styles.input} value={newCardsPerDay} onChangeText={setNewCardsPerDay} keyboardType="numeric" />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Maximum Reviews/Day</Text>
        <TextInput style={styles.input} value={reviewsPerDay} onChangeText={setReviewsPerDay} keyboardType="numeric" />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Learning Steps</Text>
        <TextInput style={styles.input} value={learningSteps} onChangeText={setLearningSteps} />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Relearning Steps</Text>
        <TextInput style={styles.input} value={relearningSteps} onChangeText={setRelearningSteps} />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Easy Interval</Text>
        <Text style={styles.description}>The first interval (in days) for a new card rated "Easy".</Text>
        <TextInput style={styles.input} value={easyInterval} onChangeText={setEasyInterval} keyboardType="numeric" />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Maximum Interval</Text>
        <TextInput style={styles.input} value={maxInterval} onChangeText={setMaxInterval} keyboardType="numeric" />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Desired Retention</Text>
        <TextInput style={styles.input} value={retention} onChangeText={setRetention} keyboardType="numeric" />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  settingItem: { marginBottom: 20, backgroundColor: 'white', padding: 15, borderRadius: 8 },
  label: { fontSize: 18, fontWeight: '600' },
  description: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, fontSize: 16, marginTop: 5 },
  saveButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
