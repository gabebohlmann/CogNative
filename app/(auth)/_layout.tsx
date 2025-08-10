// app/(auth)/_layout.tsx
import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

export default function UnAuthenticatedLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href={'/'} />
  }

  // Hide the default header for a cleaner auth flow
  return <Stack screenOptions={{ headerShown: false }} />
}