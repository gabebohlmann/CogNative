// app/(home)/index.tsx
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'
import { SignOutButton } from '@/app/components/SignOutButton'

export default function Page() {
  const { user } = useUser()

  return (
    <View style={styles.container}>
      <SignedIn>
        <Text style={styles.title}>Welcome! 👋</Text>
        <Text style={styles.emailText}>
          You are signed in as {user?.emailAddresses[0].emailAddress}
        </Text>
        <SignOutButton />
      </SignedIn>
      <SignedOut>
        <Text style={styles.title}>Welcome!</Text>
        <Link href="/(auth)/sign-in" asChild>
          <Text style={styles.link}>Sign in</Text>
        </Link>
        <Link href="/(auth)/sign-up" asChild>
          <Text style={styles.link}>Sign up</Text>
        </Link>
      </SignedOut>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  emailText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  link: {
    color: '#007BFF',
    fontSize: 18,
    fontWeight: '500',
    marginVertical: 8,
  },
})