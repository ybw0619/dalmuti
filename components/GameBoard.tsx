'use client';

import { useState, useEffect } from 'react';
import { Game, Card as CardType } from '@/types/game';
import { Card } from './Card';
import { isCardPlayable } from '@/lib/game/cards';

interface GameBoardProps {
  game: Game;
  currentPlayerId: string;
  onPlayCards: (cards: CardType[]) => void;
  onPass: () => void;
}

export function GameBoard({ game, currentPlayerId, onPlayCards, onPass }: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
  const isMyTurn = game.players[game.currentPlayerIndex]?.id === currentPlayerId;
  const activePlayer = game.players[game.currentPlayerIndex];

  // 타이머 로직
  useEffect(() => {
    if (!game.gameOptions.turnTimeLimit || !game.turnStartTime) {
      setRemainingTime(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - game.turnStartTime!) / 1000);
      const remaining = game.gameOptions.turnTimeLimit! - elapsed;
      setRemainingTime(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [game.turnStartTime, game.gameOptions.turnTimeLimit]);

  const toggleCardSelection = (cardId: string) => {
    if (!isMyTurn || currentPlayer?.hasFinished) return;

    const clickedCard = currentPlayer?.cards.find((c) => c.id === cardId);
    if (!clickedCard || !currentPlayer) return;

    // 필드에 카드가 있는 경우 (이어내기) - 자동 다중 선택
    if (game.currentTurn && game.currentTurn.cards.length > 0) {
      // 이미 선택된 카드라면 전체 선택 해제
      if (selectedCards.has(cardId)) {
        setSelectedCards(new Set());
        return;
      }

      const requiredCount = game.currentTurn.cards.length;
      const cardsToSelect = new Set<string>();

      // 클릭한 카드 우선 추가
      cardsToSelect.add(cardId);

      // 1. 같은 랭크의 다른 카드들 찾기
      const sameRankCards = currentPlayer.cards.filter(
        (c) => c.rank === clickedCard.rank && c.id !== cardId
      );

      for (const card of sameRankCards) {
        if (cardsToSelect.size < requiredCount) {
          cardsToSelect.add(card.id);
        } else {
          break;
        }
      }

      // 2. 부족하면 조커로 채우기 (클릭한 카드가 조커가 아닐 때)
      if (clickedCard.rank !== 'joker' && cardsToSelect.size < requiredCount) {
        const jokerCards = currentPlayer.cards.filter(
          (c) => c.rank === 'joker' && !cardsToSelect.has(c.id)
        );
        for (const card of jokerCards) {
          if (cardsToSelect.size < requiredCount) {
            cardsToSelect.add(card.id);
          } else {
            break;
          }
        }
      }

      // 필요한 개수만큼 채워졌을 때만 선택 적용
      if (cardsToSelect.size === requiredCount) {
        setSelectedCards(cardsToSelect);
      }
      return;
    }

    // 필드에 카드가 없는 경우 (선플레이) - 기존처럼 하나씩 선택/해제
    setSelectedCards((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        if (newSet.size === 0) {
          newSet.add(cardId);
        } else {
          const firstSelectedId = Array.from(newSet)[0];
          const firstSelectedCard = currentPlayer?.cards.find((c) => c.id === firstSelectedId);

          if (firstSelectedCard) {
            const firstRank = firstSelectedCard.rank;
            const clickedRank = clickedCard.rank;

            if (firstRank === 'joker' || clickedRank === 'joker' || firstRank === clickedRank) {
              newSet.add(cardId);
            }
          }
        }
      }

      return newSet;
    });
  };

  const handlePlayCards = () => {
    if (selectedCards.size === 0) return;
    const cards = currentPlayer?.cards.filter((c) => selectedCards.has(c.id)) || [];
    onPlayCards(cards);
    setSelectedCards(new Set());
  };

  const handlePass = () => {
    onPass();
    setSelectedCards(new Set());
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isMyTurn && !currentPlayer?.hasFinished) {
          handlePass();
        }
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        if (isMyTurn && !currentPlayer?.hasFinished) {
          handlePlayCards();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, currentPlayer?.hasFinished, onPass, handlePass, handlePlayCards]);

  if (!currentPlayer) return null;

  const otherPlayers = game.players.filter((p) => p.id !== currentPlayerId);

  return (
    <div className='h-screen w-screen flex flex-col bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900'>
      {/* 상단 상태바 */}
      <div className='bg-black/50 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 shrink-0 border-b border-white/10'>
        <div className='flex justify-between items-center gap-2 sm:gap-4 text-xs sm:text-base'>
          <div className='text-yellow-400 font-bold truncate'>
            턴: <span className='text-white'>{activePlayer?.name}</span>
          </div>

          {game.gameOptions?.enableRevolution && game.isRevolution && (
            <div className='bg-red-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold animate-pulse'>
              🔄 혁명!
            </div>
          )}

          <div className='text-yellow-400 font-bold'>
            남은: <span className='text-white'>{game.players.filter((p) => !p.hasFinished).length}명</span>
          </div>
        </div>
      </div>

      {/* 메인 게임 영역 */}
      <div className='flex flex-1 overflow-hidden'>
        {/* 상대 플레이어 - 모바일에서는 상단에 가로로, 데스크톱에서는 양쪽 사이드바 */}
        <div className='hidden lg:flex lg:flex-col w-64 p-3 space-y-3 overflow-y-auto'>
          {otherPlayers.slice(0, Math.ceil(otherPlayers.length / 2)).map((player) => {
            const isActive = player.id === activePlayer?.id;
            return (
              <div
                key={player.id}
                className={`bg-amber-800/90 backdrop-blur-sm p-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50'
                    : 'border-amber-700/50'
                }`}
              >
                <div className='flex items-center gap-2 mb-2'>
                  <div className='text-2xl'>{player.type === 'ai' ? '🤖' : '👤'}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-white font-bold text-sm truncate'>{player.name}</div>
                    {player.hasFinished && (
                      <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>
                    )}
                  </div>
                </div>
                <div className='bg-black/30 rounded px-2 py-1 text-center'>
                  <div className='text-yellow-400 font-bold text-sm'>🎴 {player.cards.length}장</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 중앙 테이블 */}
        <div className='flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden'>
          {/* 모바일용 상대 플레이어 목록 */}
          <div className='lg:hidden w-full mb-2 overflow-x-auto'>
            <div className='flex gap-2 pb-2 min-w-max px-2'>
              {otherPlayers.map((player) => {
                const isActive = player.id === activePlayer?.id;
                return (
                  <div
                    key={player.id}
                    className={`bg-amber-800/90 backdrop-blur-sm p-2 rounded-lg border-2 transition-all shrink-0 ${
                      isActive
                        ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50'
                        : 'border-amber-700/50'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      <div className='text-xl'>{player.type === 'ai' ? '🤖' : '👤'}</div>
                      <div>
                        <div className='text-white font-bold text-xs whitespace-nowrap'>{player.name}</div>
                        {player.hasFinished && (
                          <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>
                        )}
                      </div>
                      <div className='bg-black/30 rounded px-2 py-1 ml-2'>
                        <div className='text-yellow-400 font-bold text-xs'>🎴 {player.cards.length}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 게임 테이블 */}
          <div className='w-full max-w-4xl flex-1 flex flex-col items-center justify-center'>
            <div className='bg-gradient-to-br from-amber-900/40 to-amber-950/40 backdrop-blur-sm rounded-3xl border-4 sm:border-8 border-amber-800/50 shadow-2xl p-4 sm:p-8 w-full'>
              {/* 타이머 표시 (중앙 상단) */}
              {remainingTime !== null && (
                <div className='flex justify-center mb-4 sm:mb-6'>
                  <div className={`
                    px-6 sm:px-10 py-3 sm:py-5 rounded-2xl sm:rounded-3xl text-3xl sm:text-6xl font-black
                    transition-all duration-300
                    ${remainingTime <= 3 ? 'bg-red-600 text-white animate-pulse scale-110 animate-timer-shake' :
                      remainingTime <= 5 ? 'bg-red-600 text-white animate-pulse scale-110' :
                      remainingTime <= 10 ? 'bg-orange-500 text-white scale-105' :
                      'bg-blue-600 text-white'}
                    shadow-2xl
                  `}>
                    ⏱️ {remainingTime}
                  </div>
                </div>
              )}

              <div className='text-yellow-300 text-lg sm:text-3xl font-bold mb-3 sm:mb-6 text-center animate-pulse'>
                {activePlayer?.name}님 차례
              </div>

              {game.currentTurn ? (
                <div className='flex flex-col items-center gap-2 sm:gap-4'>
                  <div className='text-emerald-200 text-sm sm:text-lg font-bold'>
                    {game.players.find((p) => p.id === game.currentTurn?.playerId)?.name}님이 낸 카드
                  </div>
                  <div className='flex gap-2 sm:gap-4 flex-wrap justify-center'>
                    {game.currentTurn.cards.map((card, i) => (
                      <div key={`${card.id}-${i}`} className='transform hover:scale-110 transition-transform'>
                        <Card card={card} size='medium' />
                      </div>
                    ))}
                  </div>
                  <div className='text-emerald-300 text-base sm:text-xl font-bold mt-1 sm:mt-2'>
                    {game.currentTurn.cards.length}장
                  </div>
                </div>
              ) : (
                <div className='text-emerald-300/40 text-xl sm:text-3xl font-bold text-center'>
                  <div className='text-4xl sm:text-8xl mb-3 sm:mb-6 animate-pulse'>🃏</div>
                  <div>카드를 내주세요</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 사이드바 (데스크톱만) */}
        <div className='hidden lg:flex lg:flex-col w-64 p-3 space-y-3 overflow-y-auto shrink-0'>
          {otherPlayers.slice(Math.ceil(otherPlayers.length / 2)).map((player) => {
            const isActive = player.id === activePlayer?.id;
            return (
              <div
                key={player.id}
                className={`bg-amber-800/90 backdrop-blur-sm p-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50'
                    : 'border-amber-700/50'
                }`}
              >
                <div className='flex items-center gap-2 mb-2'>
                  <div className='text-2xl'>{player.type === 'ai' ? '🤖' : '👤'}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-white font-bold text-sm truncate'>{player.name}</div>
                    {player.hasFinished && (
                      <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>
                    )}
                  </div>
                </div>
                <div className='bg-black/30 rounded px-2 py-1 text-center'>
                  <div className='text-yellow-400 font-bold text-sm'>🎴 {player.cards.length}장</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 - 내 카드 및 컨트롤 */}
      <div className='shrink-0 bg-black/50 backdrop-blur-md border-t border-white/10'>
        {/* 내 카드 */}
        <div className='px-2 pt-12 sm:pt-16 pb-2 overflow-x-auto overflow-y-visible border-b border-white/10'>
          <div className='flex gap-1 sm:gap-2 justify-start sm:justify-center min-w-max'>
            {currentPlayer.cards.map((card) => {
              let playable = isMyTurn && !currentPlayer.hasFinished
                ? isCardPlayable(card, currentPlayer.cards, game.currentTurn, game.isRevolution)
                : true;

              // 필드에 카드가 있고, 이미 필요한 개수만큼 선택했다면 선택되지 않은 카드는 비활성화
              if (
                playable &&
                game.currentTurn &&
                game.currentTurn.cards.length > 0 &&
                selectedCards.size >= game.currentTurn.cards.length &&
                !selectedCards.has(card.id)
              ) {
                playable = false;
              }

              return (
                <Card
                  key={card.id}
                  card={card}
                  selected={selectedCards.has(card.id)}
                  onClick={() => toggleCardSelection(card.id)}
                  size='large'
                  playable={playable}
                />
              );
            })}
          </div>
        </div>

        {/* 컨트롤 영역 */}
        <div className='px-2 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-2'>
          <div className='flex items-center gap-2 sm:gap-3 bg-amber-900/80 backdrop-blur-sm px-3 py-2 rounded-xl shrink-0'>
            <div className='text-2xl sm:text-3xl'>👤</div>
            <div>
              <div className='text-yellow-400 font-bold text-sm sm:text-base'>{currentPlayer.name}</div>
              <div className='text-amber-200 text-xs sm:text-sm'>🎴 {currentPlayer.cards.length}장</div>
            </div>
          </div>

          {currentPlayer.hasFinished && (
            <div className='bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-lg shadow-lg'>
              🏆 {currentPlayer.finishOrder}등 완료!
            </div>
          )}

          {!currentPlayer.hasFinished && isMyTurn && (
            <div className='flex gap-2 sm:gap-3'>
              <button
                onClick={handlePlayCards}
                disabled={selectedCards.size === 0}
                className='bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-8 rounded-xl text-sm sm:text-base disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center gap-2'
              >
                <span>🎴 카드 내기 ({selectedCards.size})</span>
                <kbd className='hidden md:flex items-center gap-1 font-sans text-[10px] bg-black/20 px-1.5 py-0.5 rounded border-b-2 border-black/30 text-white/90 uppercase tracking-wider'>
                  Enter
                </kbd>
              </button>
              <button
                onClick={handlePass}
                className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-8 rounded-xl text-sm sm:text-base transition-all shadow-lg active:scale-95 flex items-center gap-2'
              >
                <span>✋ 패스</span>
                <kbd className='hidden md:flex items-center gap-1 font-sans text-[10px] bg-black/20 px-1.5 py-0.5 rounded border-b-2 border-black/30 text-white/90 uppercase tracking-wider'>
                  Space
                </kbd>
              </button>
            </div>
          )}

          {!currentPlayer.hasFinished && !isMyTurn && (
            <div className='bg-amber-800/70 backdrop-blur-sm text-amber-100 px-4 sm:px-8 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base'>
              ⏳ {activePlayer?.name}님 차례
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
