  // app/(tabs)/settings.tsx
  import Ionicons from '@expo/vector-icons/Ionicons';
  import { StyleSheet } from 'react-native';

  import ParallaxScrollView from '@/components/ParallaxScrollView';
  import { ThemedText } from '@/components/ThemedText';
  import { ThemedView } from '@/components/ThemedView';
  import { useAuth, useUser } from '@clerk/clerk-expo';
  import Button from '@/components/Button';

  export default function Settings() {
    const { user } = useUser()
    const { signOut } = useAuth();

    const onSignOutPress = async () => {
      try {
        await signOut({ redirectUrl: "/" });
      } catch (err: any) {}
    };

    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={<Ionicons size={310} name="cog" style={styles.headerImage} />}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Settings</ThemedText>
            <ThemedText type="defaultSemiBold">Signed in as {user?.emailAddresses[0].emailAddress}.</ThemedText>
          </ThemedView>
          <Button onPress={onSignOutPress}>
            Sign out
          </Button>
      </ParallaxScrollView>
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