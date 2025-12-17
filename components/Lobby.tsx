'use client';

import { useState, useEffect } from 'react';
import { Room } from '@/types/game';
import { getSocket } from '@/lib/socket/socketClient';

interface LobbyProps {
  onCreateRoom: (roomName: string, playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

export function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'list'>('menu');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomList, setRoomList] = useState<Room[]>([]);

  useEffect(() => {
    if (mode === 'list') {
      loadRoomList();
      const interval = setInterval(loadRoomList, 3000); // 3초마다 갱신
      return () => clearInterval(interval);
    }
  }, [mode]);

  const loadRoomList = () => {
    const socket = getSocket();
    socket.emit('room:list', (rooms) => {
      setRoomList(rooms);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && roomName && playerName) {
      onCreateRoom(roomName, playerName);
    } else if (mode === 'join' && roomId && playerName) {
      onJoinRoom(roomId, playerName);
    }
  };

  const handleJoinFromList = (room: Room) => {
    if (!playerName) {
      alert('플레이어 이름을 입력하세요');
      return;
    }
    onJoinRoom(room.id, playerName);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 p-4'>
      <div className='flex flex-col items-center justify-center bg-white/10 backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white/20'>
        <div className='text-6xl sm:text-7xl mb-4 animate-bounce'>🎴</div>
        <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-2 bg-clip-text text-transparent bg-linear-to-r from-yellow-200 to-pink-200'>
          달무티 게임
        </h1>
        <p className='text-white/70 text-sm sm:text-base text-center mb-8'>온라인 멀티플레이어 카드 게임</p>

        {mode === 'menu' && (
          <div className='space-y-4 w-full'>
            <button
              onClick={() => setMode('create')}
              className='w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
            >
              <span className='text-2xl mr-2'>🏠</span>
              방 만들기
            </button>
            <button
              onClick={() => setMode('list')}
              className='w-full bg-linear-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
            >
              <span className='text-2xl mr-2'>📋</span>
              방 목록 보기
            </button>
            <button
              onClick={() => setMode('join')}
              className='w-full bg-linear-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
            >
              <span className='text-2xl mr-2'>🔑</span>
              방 코드 입력
            </button>
          </div>
        )}

        {mode === 'list' && (
          <div className='space-y-4 w-full'>
            <div>
              <label className='block text-white font-semibold mb-2 text-sm sm:text-base'>
                <span className='text-xl mr-1'>👤</span>
                플레이어 이름
              </label>
              <input
                type='text'
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className='w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/30 transition-all text-sm sm:text-base'
                placeholder='이름을 입력하세요'
                maxLength={20}
              />
            </div>

            <div className='max-h-80 overflow-y-auto space-y-2'>
              {roomList.length === 0 ? (
                <div className='text-center text-white/70 py-8'>
                  개설된 방이 없습니다
                </div>
              ) : (
                roomList.map((room) => (
                  <div
                    key={room.id}
                    className='bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:bg-white/20 transition-all'
                  >
                    <div className='flex justify-between items-center mb-2'>
                      <div className='text-white font-bold text-lg'>{room.name}</div>
                      <div className='text-white/70 text-sm'>
                        {room.players.length}/{room.maxPlayers}
                      </div>
                    </div>
                    <div className='flex justify-between items-center'>
                      <div className='text-white/60 text-xs'>
                        {room.currentGame ? '🎮 게임 중' : '⏸️ 대기 중'}
                      </div>
                      <button
                        onClick={() => handleJoinFromList(room)}
                        disabled={room.players.length >= room.maxPlayers || room.currentGame !== null}
                        className='bg-linear-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        참가
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setMode('menu')}
              className='w-full bg-gray-600/80 hover:bg-gray-700 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
            >
              ← 뒤로
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <form onSubmit={handleSubmit} className='space-y-4 w-full'>
            <div>
              <label className='block text-white font-semibold mb-2 text-sm sm:text-base'>
                <span className='text-xl mr-1'>👤</span>
                플레이어 이름
              </label>
              <input
                type='text'
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className='w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/30 transition-all text-sm sm:text-base'
                placeholder='이름을 입력하세요'
                required
                maxLength={20}
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className='block text-white font-semibold mb-2 text-sm sm:text-base'>
                  <span className='text-xl mr-1'>🏠</span>
                  방 이름
                </label>
                <input
                  type='text'
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className='w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/30 transition-all text-sm sm:text-base'
                  placeholder='방 이름을 입력하세요'
                  required
                  maxLength={30}
                />
              </div>
            )}

            {mode === 'join' && (
              <div>
                <label className='block text-white font-semibold mb-2 text-sm sm:text-base'>
                  <span className='text-xl mr-1'>🔑</span>
                  방 코드
                </label>
                <input
                  type='text'
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className='w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/30 transition-all text-sm sm:text-base'
                  placeholder='방 코드를 입력하세요'
                  required
                />
              </div>
            )}

            <div className='flex gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setMode('menu')}
                className='flex-1 bg-gray-600/80 hover:bg-gray-700 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
              >
                ← 뒤로
              </button>
              <button
                type='submit'
                className='flex-1 bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base'
              >
                {mode === 'create' ? '✨ 만들기' : '🚀 참가하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
