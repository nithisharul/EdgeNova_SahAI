import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Root navigator. The tab group renders its own headers, so stack headers stay
 * hidden here and are switched on per detail screen.
 *
 * AuthProvider wraps everything because navigation itself depends on role: a
 * member must never be offered a treasurer action. It sits above the Stack so
 * that a 401 raised on any screen can clear the session and redirect to Login.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={Colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
