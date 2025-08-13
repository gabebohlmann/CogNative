// app/(tabs)/stats.tsx
// app/(tabs)/settings.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import StatsScreen from '@/components/StatsScreen';
import { ScrollView } from 'react-native';

export default function StatsTabScreen() {

  return (
    <ScrollView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Statistics</ThemedText>
      </ThemedView>
      <StatsScreen />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 8,
  }
});