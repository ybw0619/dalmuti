'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket/socketClient';
import type { Room, Game } from '@/types/game';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onError(message: string) {
      setError(message);
    }

    function onRoomUpdated(updatedRoom: Room) {
      setRoom(updatedRoom);
    }

    function onGameStarted(startedGame: Game) {
      setGame(startedGame);
    }

    function onGameUpdated(updatedGame: Game) {
      setGame(updatedGame);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('room:updated', onRoomUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:updated', onGameUpdated);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('game:updated', onGameUpdated);
    };
  }, []);

  return {
    socket: getSocket(),
    isConnected,
    room,
    game,
    error,
    setRoom,
    setGame,
    clearError: () => setError(''),
  };
}
