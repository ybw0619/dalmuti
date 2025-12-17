import { Game, Player, Card, Turn, GamePhase, TaxRequest, GameOptions } from '@/types/game';
import { dealCards, canPlayCards, isRevolutionPlay, sortCards } from './cards';

// 새 게임 생성
export function createGame(players: Player[], roomId: string, gameOptions: GameOptions): Game {
  // 카드 분배
  const hands = dealCards(players.length);

  // 각 플레이어에게 카드 배분
  const gamePlayers = players.map((player, index) => ({
    ...player,
    cards: sortCards(hands[index], false),
    hasFinished: false,
    finishOrder: undefined,
  }));

  return {
    roomId,
    phase: gameOptions.enableTax ? 'tax' : 'playing', // 세금 규칙이 꺼져있으면 바로 플레이 단계로
    players: gamePlayers,
    currentPlayerIndex: 0,
    currentTurn: null,
    passCount: 0,
    turnHistory: [],
    isRevolution: false,
    taxPhaseComplete: !gameOptions.enableTax, // 세금 규칙이 꺼져있으면 바로 완료
    finishedPlayers: [],
    gameOptions,
    turnStartTime: gameOptions.turnTimeLimit ? Date.now() : undefined,
  };
}

// 세금 계산 (1등과 꼴등, 2등과 꼴등-1 교환)
export function calculateTaxRequests(players: Player[]): TaxRequest[] {
  const requests: TaxRequest[] = [];
  const sortedPlayers = [...players].sort((a, b) => a.position - b.position);

  // 1등(대달무티)과 꼴등(대거지): 2장 교환
  if (sortedPlayers.length >= 2) {
    requests.push({
      fromPlayerId: sortedPlayers[sortedPlayers.length - 1].id, // 꼴등
      toPlayerId: sortedPlayers[0].id, // 1등
      cardCount: 2,
    });
  }

  // 2등(달무티)과 꼴등-1(거지): 1장 교환
  if (sortedPlayers.length >= 4) {
    requests.push({
      fromPlayerId: sortedPlayers[sortedPlayers.length - 2].id, // 거지
      toPlayerId: sortedPlayers[1].id, // 2등
      cardCount: 1,
    });
  }

  return requests;
}

// 세금 적용
export function applyTax(
  game: Game,
  fromPlayerId: string,
  toPlayerId: string,
  cards: Card[]
): Game {
  const players = game.players.map(p => {
    if (p.id === fromPlayerId) {
      // 카드 제거
      return {
        ...p,
        cards: p.cards.filter(c => !cards.some(card => card.id === c.id)),
      };
    }
    if (p.id === toPlayerId) {
      // 카드 추가
      return {
        ...p,
        cards: sortCards([...p.cards, ...cards], game.isRevolution),
      };
    }
    return p;
  });

  return {
    ...game,
    players,
  };
}

// 카드 플레이
export function playCards(game: Game, playerId: string, cards: Card[]): Game {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('플레이어를 찾을 수 없습니다');

  // 현재 턴인지 확인
  if (game.players[game.currentPlayerIndex].id !== playerId) {
    throw new Error('당신의 차례가 아닙니다');
  }

  // 이미 끝난 플레이어인지 확인
  if (player.hasFinished) {
    throw new Error('이미 게임을 마쳤습니다');
  }

  // 카드 플레이 가능 여부 확인
  if (!canPlayCards(cards, game.currentTurn, game.isRevolution)) {
    throw new Error('해당 카드를 낼 수 없습니다');
  }

  // 혁명 체크 (혁명 규칙이 활성화되어 있을 때만)
  let isRevolution = game.isRevolution;
  if (game.gameOptions.enableRevolution && isRevolutionPlay(cards)) {
    isRevolution = !isRevolution; // 혁명 토글
  }

  // 플레이어 카드에서 제거
  const updatedPlayers = game.players.map(p => {
    if (p.id === playerId) {
      const remainingCards = p.cards.filter(
        c => !cards.some(card => card.id === c.id)
      );

      return {
        ...p,
        cards: sortCards(remainingCards, isRevolution),
        hasFinished: remainingCards.length === 0,
      };
    }
    return p;
  });

  // 턴 생성
  const turn: Turn = {
    playerId,
    cards,
    timestamp: Date.now(),
  };

  // 플레이어가 카드를 다 냈는지 확인
  const updatedPlayer = updatedPlayers.find(p => p.id === playerId)!;
  const finishedPlayers = updatedPlayer.hasFinished
    ? [...game.finishedPlayers, playerId]
    : game.finishedPlayers;

  // 끝난 플레이어에게 순위 부여
  if (updatedPlayer.hasFinished) {
    updatedPlayer.finishOrder = finishedPlayers.length;
  }

  // 다음 플레이어 찾기
  const nextPlayerIndex = getNextPlayerIndex(game, game.currentPlayerIndex);

  return {
    ...game,
    players: updatedPlayers,
    currentTurn: turn,
    currentPlayerIndex: nextPlayerIndex,
    passCount: 0,
    turnHistory: [...game.turnHistory, turn],
    isRevolution,
    finishedPlayers,
    phase: checkGameFinished(updatedPlayers) ? 'finished' : 'playing',
    turnStartTime: game.gameOptions.turnTimeLimit ? Date.now() : undefined,
  };
}

// 패스
export function passPlay(game: Game, playerId: string): Game {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('플레이어를 찾을 수 없습니다');

  // 현재 턴인지 확인
  if (game.players[game.currentPlayerIndex].id !== playerId) {
    throw new Error('당신의 차례가 아닙니다');
  }

  if (player.hasFinished) {
    throw new Error('이미 게임을 마쳤습니다');
  }

  const newPassCount = game.passCount + 1;
  const nextPlayerIndex = getNextPlayerIndex(game, game.currentPlayerIndex);

  // 모든 플레이어가 패스했으면 턴 초기화 (끝난 플레이어 제외)
  const activePlayers = game.players.filter(p => !p.hasFinished);
  const shouldResetTurn = newPassCount >= activePlayers.length - 1;

  return {
    ...game,
    currentPlayerIndex: nextPlayerIndex,
    passCount: shouldResetTurn ? 0 : newPassCount,
    currentTurn: shouldResetTurn ? null : game.currentTurn,
    turnStartTime: game.gameOptions.turnTimeLimit ? Date.now() : undefined,
  };
}

// 다음 플레이어 인덱스 (끝나지 않은 플레이어만)
function getNextPlayerIndex(game: Game, currentIndex: number): number {
  let nextIndex = (currentIndex + 1) % game.players.length;
  let attempts = 0;

  while (game.players[nextIndex].hasFinished && attempts < game.players.length) {
    nextIndex = (nextIndex + 1) % game.players.length;
    attempts++;
  }

  return nextIndex;
}

// 게임 종료 확인
function checkGameFinished(players: Player[]): boolean {
  const finishedCount = players.filter(p => p.hasFinished).length;
  // 0장 남은 사람(끝난 사람)이 전체 인원 - 1과 같으면 게임 종료
  return finishedCount >= players.length - 1;
}

// 최종 순위 결정
export function getFinalRankings(game: Game): Player[] {
  return [...game.players].sort((a, b) => {
    if (a.finishOrder === undefined) return 1;
    if (b.finishOrder === undefined) return -1;
    return a.finishOrder - b.finishOrder;
  });
}
