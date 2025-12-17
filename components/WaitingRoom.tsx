'use client';

import { Room, GameOptions } from '@/types/game';

interface WaitingRoomProps {
  room: Room;
  currentPlayerId: string;
  onReady: () => void;
  onStartGame: () => void;
  onAddAI: () => void;
  onLeave: () => void;
  onUpdateOptions: (options: GameOptions) => void;
}

export function WaitingRoom({
  room,
  currentPlayerId,
  onReady,
  onStartGame,
  onAddAI,
  onLeave,
  onUpdateOptions,
}: WaitingRoomProps) {
  const isHost = room.hostId === currentPlayerId;
  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const allReady = room.players.every(p => p.isReady || p.type === 'ai');
  const canStart = room.players.length >= 2 && allReady;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border border-white/20">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white truncate">{room.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-white/70 text-xs sm:text-sm">방 코드:</p>
                <code className="bg-white/20 text-yellow-300 px-3 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold">
                  {room.id}
                </code>
              </div>
            </div>
            <button
              onClick={onLeave}
              className="shrink-0 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base font-semibold"
            >
              🚪 나가기
            </button>
          </div>

          {/* 게임 옵션 */}
          {room.gameOptions && (
            <div className="mb-6 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <h3 className="text-white font-bold mb-3 text-sm sm:text-base flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                게임 규칙
              </h3>
              {isHost ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <label className="flex items-center gap-2 text-white cursor-pointer hover:text-yellow-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={room.gameOptions.enableRevolution}
                        onChange={(e) => onUpdateOptions({ ...room.gameOptions, enableRevolution: e.target.checked })}
                        className="w-5 h-5 cursor-pointer accent-purple-500"
                      />
                      <span className="text-sm sm:text-base">🔄 혁명 규칙 (8장 이상)</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer hover:text-yellow-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={room.gameOptions.enableTax}
                        onChange={(e) => onUpdateOptions({ ...room.gameOptions, enableTax: e.target.checked })}
                        className="w-5 h-5 cursor-pointer accent-purple-500"
                      />
                      <span className="text-sm sm:text-base">💰 세금 규칙</span>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="text-white text-sm sm:text-base flex items-center gap-2">
                      <span>⏱️ 턴 제한 시간:</span>
                    </label>
                    <select
                      value={room.gameOptions.turnTimeLimit || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        onUpdateOptions({
                          ...room.gameOptions,
                          turnTimeLimit: value === 0 ? undefined : value
                        });
                      }}
                      className="bg-white/20 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/30 transition-colors text-sm sm:text-base border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="0" className="bg-purple-900">무제한</option>
                      <option value="10" className="bg-purple-900">10초</option>
                      <option value="15" className="bg-purple-900">15초</option>
                      <option value="20" className="bg-purple-900">20초</option>
                      <option value="25" className="bg-purple-900">25초</option>
                      <option value="30" className="bg-purple-900">30초</option>
                      <option value="35" className="bg-purple-900">35초</option>
                      <option value="40" className="bg-purple-900">40초</option>
                      <option value="45" className="bg-purple-900">45초</option>
                      <option value="50" className="bg-purple-900">50초</option>
                      <option value="55" className="bg-purple-900">55초</option>
                      <option value="60" className="bg-purple-900">60초</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-white/80 text-sm sm:text-base">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <span>🔄 혁명 규칙: {room.gameOptions.enableRevolution ? '✅ 켜짐' : '❌ 꺼짐'}</span>
                    <span>💰 세금 규칙: {room.gameOptions.enableTax ? '✅ 켜짐' : '❌ 꺼짐'}</span>
                  </div>
                  <span>⏱️ 턴 제한 시간: {room.gameOptions.turnTimeLimit ? `${room.gameOptions.turnTimeLimit}초` : '무제한'}</span>
                </div>
              )}
            </div>
          )}

          {/* 플레이어 목록 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                <span className="text-xl">👥</span>
                플레이어 ({room.players.length}/{room.maxPlayers})
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`
                    bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center transition-all transform hover:scale-105
                    ${player.id === currentPlayerId ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''}
                  `}
                >
                  <div className="text-3xl sm:text-4xl mb-2">
                    {player.type === 'ai' ? '🤖' : '👤'}
                  </div>
                  <div className="text-white font-semibold text-sm sm:text-base truncate">{player.name}</div>
                  <div className="text-xs sm:text-sm text-white/70 mt-1">
                    {player.isReady ? (
                      <span className="text-green-400 font-semibold">✅ 준비됨</span>
                    ) : (
                      <span className="text-yellow-400 animate-pulse">⏳ 대기중</span>
                    )}
                  </div>
                  {player.id === room.hostId && (
                    <div className="text-xs sm:text-sm text-yellow-400 mt-1 font-bold">👑 방장</div>
                  )}
                </div>
              ))}

              {room.players.length < room.maxPlayers &&
                Array.from({ length: room.maxPlayers - room.players.length }).map(
                  (_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="bg-white/5 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border-2 border-dashed border-white/30 hover:border-white/50 transition-colors"
                    >
                      <div className="text-3xl sm:text-4xl mb-2 opacity-50">➕</div>
                      <div className="text-white/50 text-xs sm:text-sm">빈 자리</div>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {isHost && (
              <>
                <button
                  onClick={onAddAI}
                  disabled={room.players.length >= room.maxPlayers}
                  className="flex-1 bg-linear-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 shadow-lg text-sm sm:text-base"
                >
                  <span className="text-xl mr-2">🤖</span>
                  AI 추가
                </button>
                <button
                  onClick={onStartGame}
                  disabled={!canStart}
                  className="flex-1 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 shadow-lg text-sm sm:text-base"
                >
                  <span className="text-xl mr-2">🎮</span>
                  게임 시작 {!canStart && '(준비 대기)'}
                </button>
              </>
            )}

            {!isHost && !currentPlayer?.isReady && (
              <button
                onClick={onReady}
                className="flex-1 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base"
              >
                <span className="text-xl mr-2">✅</span>
                준비 완료
              </button>
            )}

            {!isHost && currentPlayer?.isReady && (
              <div className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold py-3 sm:py-4 px-6 rounded-xl text-center border-2 border-white/30 text-sm sm:text-base">
                <span className="inline-block animate-pulse mr-2">⏳</span>
                방장이 게임을 시작하기를 기다리는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
