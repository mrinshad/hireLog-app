import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DialogProvider } from '@/context/DialogContext';

export default function RootLayout() {
  return (
    <DialogProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </DialogProvider>
  );
}
