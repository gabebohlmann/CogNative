// app/(tabs)/games.tsx
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import MiniGamesScreen from '@/components/MiniGamesScreen';
import { ScrollView } from 'react-native';

export default function StatsTabScreen() {

  return (
    <ScrollView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Games</ThemedText>
      </ThemedView>
      <MiniGamesScreen />
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