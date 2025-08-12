// app/(tabs)/stats.tsx
// app/(tabs)/settings.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Button from '@/components/Button';
import StatsScreen from '@/components/StatsScreen';
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler';

export default function StatsTabScreen() {

  return (
    // <ParallaxScrollView
    //   headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
    //   headerImage={<Ionicons size={310} name="cog" style={styles.headerImage} />}>
    <ScrollView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Statistics</ThemedText>
      </ThemedView>
      <StatsScreen />
    </ScrollView>
    // </ParallaxScrollView>
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