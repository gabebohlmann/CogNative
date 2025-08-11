// app/(tabs)/settings.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Button from '@/components/Button';
import CardSettings from '@/components/CardSettings'
import { View } from 'react-native'

export default function SettingsScreen() {
  const { user } = useUser()
  const { signOut } = useAuth();

  const onSignOutPress = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch (err: any) {}
  };

  return (
    // <ParallaxScrollView
    //   headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
    //   headerImage={<Ionicons size={310} name="cog" style={styles.headerImage} />}>
    <View>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText type="defaultSemiBold">
          Signed in as {user?.emailAddresses[0].emailAddress}.
        </ThemedText>
      </ThemedView>
      <CardSettings />
      <Button onPress={onSignOutPress}>Sign out</Button>
    </View>
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