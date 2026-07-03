import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import {
  DMSerifDisplay_400Regular,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/dm-serif-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  DMMono_400Regular,
  DMMono_500Medium,
  useFonts as useMonoFonts,
} from '@expo-google-fonts/dm-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [serifLoaded] = useSerifFonts({ DMSerifDisplay_400Regular });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [monoLoaded] = useMonoFonts({ DMMono_400Regular, DMMono_500Medium });

  const fontsReady = serifLoaded && interLoaded && monoLoaded;

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (fontsReady && !isLoading) SplashScreen.hideAsync();
  }, [fontsReady, isLoading]);

  if (!fontsReady || isLoading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
