/**
 * useSocket — shared Socket.IO hook for customer-mobile.
 * Handles async token retrieval (SecureStore on native, localStorage on web).
 * Creates one connection per mount, cleans up on unmount.
 *
 * Usage:
 *   const { emit } = useSocket({
 *     'order:status': (d) => { ... },
 *   });
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:3000';

type EventMap = Record<string, (data: any) => void>;

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync('accessToken');
}

export function useSocket(
  events: EventMap,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let socket: Socket;
    let mounted = true;

    (async () => {
      const token = await getToken();
      if (!token || !mounted) return;

      socket = io(`${WS_URL}/orders`, {
        auth: { token },
        transports: ['polling', 'websocket'],
      });

      socket.on('connect', () => {
        onConnect?.();
      });
      socket.on('disconnect', () => {
        onDisconnect?.();
      });

      // Bind all event handlers (re-read from ref on each call so stale closures are avoided)
      Object.keys(eventsRef.current).forEach((event) => {
        socket.on(event, (data) => eventsRef.current[event]?.(data));
      });

      socketRef.current = socket;
    })();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socketRef };
}
