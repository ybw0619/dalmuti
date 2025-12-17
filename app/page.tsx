'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Lobby } from '@/components/Lobby';
import { WaitingRoom } from '@/components/WaitingRoom';
import { GameBoard } from '@/components/GameBoard';
import { Card, GameOptions } from '@/types/game';

type GameState = 'lobby' | 'waiting' | 'playing';

export default function Home() {
  const { socket, isConnected, room, game, error, setRoom, clearError } = useSocket();
  const [gameState, setGameState] = useState<GameState>('lobby');

  useEffect(() => {
    if (room && !game) {
      setGameState('waiting');
    } else if (game) {
      setGameState('playing');
    }
  }, [room, game]);

  useEffect(() => {
    if (error) {
      alert(error);
      clearError();
    }
  }, [error, clearError]);

  const handleCreateRoom = (roomName: string, playerName: string) => {
    socket.emit('room:create', { name: roomName, playerName }, (createdRoom) => {
      setRoom(createdRoom);
    });
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    socket.emit('room:join', { roomId, playerName }, (joinedRoom) => {
      setRoom(joinedRoom);
    });
  };

  const handleReady = () => {
    socket.emit('player:ready');
  };

  const handleStartGame = () => {
    socket.emit('game:start');
  };

  const handleAddAI = () => {
    socket.emit('room:addAI');
  };

  const handleLeaveRoom = () => {
    socket.emit('room:leave');
    setRoom(null);
    setGameState('lobby');
  };

  const handlePlayCards = (cards: Card[]) => {
    socket.emit('game:play', cards);
  };

  const handlePass = () => {
    socket.emit('game:pass');
  };

  const handleRestartGame = () => {
    socket.emit('game:restart');
  };

  const handleUpdateOptions = (options: GameOptions) => {
    socket.emit('room:updateOptions', options);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-white text-2xl">서버에 연결 중...</div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (gameState === 'waiting' && room) {
    return (
      <WaitingRoom
        room={room}
        currentPlayerId={socket.id || ''}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onAddAI={handleAddAI}
        onLeave={handleLeaveRoom}
        onUpdateOptions={handleUpdateOptions}
      />
    );
  }

  if (gameState === 'playing' && game && room) {
    return (
      <GameBoard
        game={game}
        room={room}
        currentPlayerId={socket.id || ''}
        onPlayCards={handlePlayCards}
        onPass={handlePass}
        onRestart={handleRestartGame}
      />
    );
  }

  return null;
}
