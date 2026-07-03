'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.');
    if (isLocal) return `http://${hostname}:3000`;
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
};

type EventMap = Record<string, (data: any) => void>;

/**
 * Shared Socket.IO hook for staff-web.
 * Creates one socket per component mount, cleans up on unmount.
 * Returns { socket } ref so callers can emit if needed.
 */
export function useSocket(
  token: string | null,
  events: EventMap,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  const socketRef = useRef<Socket | null>(null);
  // Keep event handlers in a ref so the effect doesn't re-run when they change
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;

  useEffect(() => {
    if (!token) return;

    const socket = io(`${getWsUrl()}/orders`, {
      auth: { token },
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => onConnectRef.current?.());
    socket.on('disconnect', () => onDisconnectRef.current?.());

    // Bind all events
    Object.entries(eventsRef.current).forEach(([event, handler]) => {
      socket.on(event, (data) => eventsRef.current[event]?.(data));
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socket: socketRef };
}

// Made with Bob
