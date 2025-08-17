// app/(tabs)/settings.tsx
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Button from '@/components/Button';
import CardSettings from '@/components/CardSettings'
import { ScrollView } from "react-native";

export default function SettingsScreen() {
  const { user } = useUser()
  const { signOut } = useAuth();

  const onSignOutPress = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch (err: any) {}
  };

  return (
    <ScrollView>
      <ThemedView style={styles.titleContainer}>
        {/* <ThemedText type="title">Settings</ThemedText> */}
      </ThemedView>
      <CardSettings />
      <ThemedText
        style={{ textAlign: "center", paddingBottom: 20 }}
        type="defaultSemiBold"
      >
        Signed in as {user?.emailAddresses[0].emailAddress}.
      </ThemedText>
      <Button style={{ width: "100%", padding: 30 }} onPress={onSignOutPress}>Sign out</Button>
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