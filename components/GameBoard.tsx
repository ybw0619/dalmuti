'use client';

import { useState, useEffect, useRef } from 'react';
import { Game, Room, Card as CardType } from '@/types/game';
import { Card } from './Card';
import { isCardPlayable } from '@/lib/game/cards';

interface GameBoardProps {
  game: Game;
  room: Room;
  currentPlayerId: string;
  onPlayCards: (cards: CardType[]) => void;
  onPass: () => void;
  onRestart: () => void;
}

export function GameBoard({ game, room, currentPlayerId, onPlayCards, onPass, onRestart }: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number>(-1);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
  const isMyTurn = game.players[game.currentPlayerIndex]?.id === currentPlayerId;
  const activePlayer = game.players[game.currentPlayerIndex];

  // 포커스된 카드로 자동 스크롤
  useEffect(() => {
    if (focusedCardIndex >= 0 && cardsContainerRef.current) {
      const container = cardsContainerRef.current;
      const cardElements = container.children[0].children; // flex container 내부의 카드들
      const focusedCard = cardElements[focusedCardIndex] as HTMLElement;

      if (focusedCard) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = focusedCard.getBoundingClientRect();

        // 카드가 화면 왼쪽으로 벗어난 경우
        if (cardRect.left < containerRect.left) {
          container.scrollLeft += cardRect.left - containerRect.left - 20; // 여유 공간 20px
        }
        // 카드가 화면 오른쪽으로 벗어난 경우
        else if (cardRect.right > containerRect.right) {
          container.scrollLeft += cardRect.right - containerRect.right + 20; // 여유 공간 20px
        }
      }
    }
  }, [focusedCardIndex]);

  // 턴이 돌아오면 낼 수 있는 카드 중 가장 오른쪽, 없으면 전체 중 가장 오른쪽 카드에 포커스
  useEffect(() => {
    if (isMyTurn && !currentPlayer?.hasFinished && (currentPlayer?.cards.length ?? 0) > 0) {
      if (!currentPlayer) return;

      // 뒤에서부터(오른쪽부터) 탐색하여 낼 수 있는 첫 번째 카드 찾기
      let foundIndex = -1;
      for (let i = currentPlayer.cards.length - 1; i >= 0; i--) {
        const card = currentPlayer.cards[i];
        if (isCardPlayable(card, currentPlayer.cards, game.currentTurn, game.isRevolution)) {
          foundIndex = i;
          break;
        }
      }

      // 낼 수 있는 카드가 없으면 가장 마지막(오른쪽) 카드 선택
      if (foundIndex === -1) {
        foundIndex = currentPlayer.cards.length - 1;
      }

      setFocusedCardIndex(foundIndex);
    } else {
      setFocusedCardIndex(-1);
    }
  }, [isMyTurn, currentPlayer?.hasFinished, currentPlayer?.cards.length]);

  // 타이머 로직
  useEffect(() => {
    // 게임이 끝났으면 타이머 정지
    if (game.phase === 'finished') {
      setRemainingTime(null);
      return;
    }

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
  }, [game.turnStartTime, game.gameOptions.turnTimeLimit, game.phase]);

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
      const sameRankCards = currentPlayer.cards.filter((c) => c.rank === clickedCard.rank && c.id !== cardId);

      for (const card of sameRankCards) {
        if (cardsToSelect.size < requiredCount) {
          cardsToSelect.add(card.id);
        } else {
          break;
        }
      }

      // 2. 부족하면 조커로 채우기 (클릭한 카드가 조커가 아닐 때)
      if (clickedCard.rank !== 'joker' && cardsToSelect.size < requiredCount) {
        const jokerCards = currentPlayer.cards.filter((c) => c.rank === 'joker' && !cardsToSelect.has(c.id));
        for (const card of jokerCards) {
          if (cardsToSelect.size < requiredCount) {
            cardsToSelect.add(card.id);
          } else {
            break;
          }
        }
      }

      // 가능한 만큼 자동 선택 (개수가 부족해도 선택됨)
      setSelectedCards(cardsToSelect);
      return;
    }

    // 필드에 카드가 없는 경우 (선플레이)

    // 선택된 카드가 없는 경우 - 해당 랭크의 모든 카드 자동 선택
    if (selectedCards.size === 0) {
      const newSet = new Set<string>();
      newSet.add(cardId);

      const sameRankCards = currentPlayer.cards.filter((c) => c.rank === clickedCard.rank && c.id !== cardId);

      sameRankCards.forEach((c) => newSet.add(c.id));
      setSelectedCards(newSet);
      return;
    }

    // 기존처럼 하나씩 선택/해제
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
      // 내 턴이 아니거나 완료했으면 무시
      if (!isMyTurn || currentPlayer?.hasFinished) return;

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCardIndex((prev) => {
            const maxIndex = (currentPlayer?.cards.length || 1) - 1;
            return prev <= 0 ? maxIndex : prev - 1;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCardIndex((prev) => {
            const maxIndex = (currentPlayer?.cards.length || 1) - 1;
            return prev >= maxIndex ? 0 : prev + 1;
          });
          break;
        case 'Space':
          e.preventDefault();
          if (focusedCardIndex >= 0 && currentPlayer?.cards[focusedCardIndex]) {
            toggleCardSelection(currentPlayer.cards[focusedCardIndex].id);
          }
          break;
        case 'KeyS':
          e.preventDefault();
          handlePass();
          break;
        case 'Enter':
          e.preventDefault();
          handlePlayCards();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMyTurn,
    currentPlayer?.hasFinished,
    currentPlayer?.cards,
    focusedCardIndex,
    handlePass,
    handlePlayCards,
    // toggleCardSelection은 의존성 배열에 넣지 않아도 되지만(함수형 업데이트 사용 등),
    // 여기서는 useCallback으로 감싸져 있지 않으므로 경고가 뜰 수 있음.
    // 하지만 toggleCardSelection 내부에서 state를 참조하므로 최신버전이 필요함.
    // useEffect가 자주 재실행되겠지만 기능상 문제는 없음.
  ]);

  if (!currentPlayer) return null;

  const otherPlayers = game.players.filter((p) => p.id !== currentPlayerId);

  // 게임 종료 화면
  if (game.phase === 'finished') {
    const sortedPlayers = [...game.players].sort((a, b) => {
      if (a.finishOrder === undefined) return 1;
      if (b.finishOrder === undefined) return -1;
      return a.finishOrder - b.finishOrder;
    });

    return (
      <div className='h-screen w-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900'>
        <div className='bg-gradient-to-br from-amber-900/90 to-amber-950/90 backdrop-blur-lg p-6 sm:p-12 rounded-3xl border-4 sm:border-8 border-yellow-500/50 shadow-2xl max-w-3xl w-full mx-4'>
          <div className='text-center mb-8'>
            <h1 className='text-4xl sm:text-6xl font-black text-yellow-400 mb-4 animate-pulse'>🏆 게임 종료! 🏆</h1>
            <p className='text-xl sm:text-2xl text-amber-200'>최종 순위</p>
          </div>

          <div className='space-y-3 mb-8'>
            {sortedPlayers.map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const medals = ['🥇', '🥈', '🥉'];
              const medal = medals[index] || '🎖️';

              return (
                <div
                  key={player.id}
                  className={`
                    flex items-center justify-between p-4 sm:p-6 rounded-2xl
                    ${isCurrentPlayer ? 'bg-yellow-500/30 border-2 border-yellow-400' : 'bg-black/30'}
                    ${index === 0 ? 'scale-105 shadow-lg shadow-yellow-500/50' : ''}
                  `}
                >
                  <div className='flex items-center gap-3 sm:gap-4'>
                    <div className='text-3xl sm:text-4xl'>{medal}</div>
                    <div>
                      <div className='text-white font-bold text-lg sm:text-2xl flex items-center gap-2'>
                        {player.name}
                        {isCurrentPlayer && <span className='text-yellow-400 text-sm'>(나)</span>}
                      </div>
                      <div className='text-amber-300 text-sm sm:text-base'>
                        {player.type === 'ai' ? '🤖 AI' : '👤 플레이어'}
                      </div>
                    </div>
                  </div>
                  <div className='text-yellow-400 font-black text-2xl sm:text-3xl'>
                    {player.finishOrder || sortedPlayers.length}등
                  </div>
                </div>
              );
            })}
          </div>

          <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
            <button
              onClick={() => window.location.reload()}
              className='flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg active:scale-95'
            >
              🏠 로비로
            </button>
            {room.hostId === currentPlayerId && (
              <button
                onClick={onRestart}
                className='flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg active:scale-95'
              >
                ▶️ 다음 판
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen w-screen flex flex-col bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900'>
      {/* 상단 상태바 */}
      <div
        className={`backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 shrink-0 border-b transition-all duration-300 ${
          isMyTurn && !currentPlayer.hasFinished ? 'bg-yellow-500/20 border-yellow-400' : 'bg-black/50 border-white/10'
        }`}
      >
        <div className='flex justify-between items-center gap-2 sm:gap-4 text-xs sm:text-base'>
          <div className='text-yellow-400 font-bold truncate'>
            턴:{' '}
            <span
              className={`${isMyTurn && !currentPlayer.hasFinished ? 'text-yellow-300 animate-pulse' : 'text-white'}`}
            >
              {activePlayer?.name} {isMyTurn && !currentPlayer.hasFinished && '👈'}
            </span>
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
                    {player.hasFinished && <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>}
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
                        {player.hasFinished && <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>}
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
                  <div
                    className={`
                    px-6 sm:px-10 py-3 sm:py-5 rounded-2xl sm:rounded-3xl text-3xl sm:text-6xl font-black
                    transition-all duration-300
                    ${
                      remainingTime <= 3
                        ? 'bg-red-600 text-white animate-pulse scale-110 animate-timer-shake'
                        : remainingTime <= 5
                        ? 'bg-red-600 text-white animate-pulse scale-110'
                        : remainingTime <= 10
                        ? 'bg-orange-500 text-white scale-105'
                        : 'bg-blue-600 text-white'
                    }
                    shadow-2xl
                  `}
                  >
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
                    {player.hasFinished && <div className='text-yellow-400 text-xs'>🏆 {player.finishOrder}등</div>}
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
      <div
        className={`shrink-0 backdrop-blur-md border-t transition-all duration-300 ${
          isMyTurn && !currentPlayer.hasFinished
            ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_-4px_20px_rgba(250,204,21,0.3)]'
            : 'bg-black/50 border-white/10'
        }`}
      >
        {/* 키보드 조작 가이드 (내 턴일 때만 표시) */}
        {isMyTurn && !currentPlayer.hasFinished && (
          <div className='hidden sm:flex justify-center items-center gap-6 py-1 bg-black/20 text-[10px] text-white/50 border-b border-white/5'>
            <div className='flex items-center gap-1'>
              <kbd className='bg-black/30 px-1.5 py-0.5 rounded border border-white/10'>←</kbd>
              <kbd className='bg-black/30 px-1.5 py-0.5 rounded border border-white/10'>→</kbd>
              <span>카드 이동</span>
            </div>
            <div className='flex items-center gap-1'>
              <kbd className='bg-black/30 px-1.5 py-0.5 rounded border border-white/10'>Space</kbd>
              <span>선택/취소</span>
            </div>
            <div className='flex items-center gap-1'>
              <kbd className='bg-black/30 px-1.5 py-0.5 rounded border border-white/10'>Enter</kbd>
              <span>내기</span>
            </div>
            <div className='flex items-center gap-1'>
              <kbd className='bg-black/30 px-1.5 py-0.5 rounded border border-white/10'>S</kbd>
              <span>패스</span>
            </div>
          </div>
        )}

        {/* 내 카드 */}
        <div
          ref={cardsContainerRef}
          className='px-2 pt-12 sm:pt-16 pb-2 overflow-x-auto overflow-y-visible border-b border-white/10 scroll-smooth'
        >
          <div className='flex gap-1 sm:gap-2 justify-start sm:justify-center min-w-max'>
            {currentPlayer.cards.map((card, index) => {
              let playable =
                isMyTurn && !currentPlayer.hasFinished
                  ? isCardPlayable(card, currentPlayer.cards, game.currentTurn, game.isRevolution)
                  : true;

              if (isMyTurn && !currentPlayer.hasFinished) {
                playable = isCardPlayable(card, currentPlayer.cards, game.currentTurn, game.isRevolution);

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
              }

              return (
                <Card
                  key={card.id}
                  card={card}
                  selected={selectedCards.has(card.id)}
                  focused={index === focusedCardIndex}
                  onClick={() => {
                    setFocusedCardIndex(index); // 클릭 시 해당 카드로 포커스 이동
                    toggleCardSelection(card.id);
                  }}
                  size='large'
                  playable={playable}
                />
              );
            })}
          </div>
        </div>

        {/* 컨트롤 영역 */}
        <div className='px-2 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-2'>
          <div
            className={`flex items-center gap-2 sm:gap-3 backdrop-blur-sm px-3 py-2 rounded-xl shrink-0 border-2 transition-all duration-300 ${
              isMyTurn && !currentPlayer.hasFinished
                ? 'bg-yellow-500/30 border-yellow-400 shadow-lg shadow-yellow-400/30 scale-105'
                : 'bg-amber-900/80 border-transparent'
            }`}
          >
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
                  S
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
