import { Card, CardRank } from '@/types/game';

// 덱 생성 (각 등급마다 해당 번호만큼의 카드 + 조커 2장)
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // 1번 카드 1장, 2번 카드 2장, ..., 12번 카드 12장
  for (let rank = 1; rank <= 12; rank++) {
    for (let i = 0; i < rank; i++) {
      deck.push({
        rank: rank as CardRank,
        id: `${rank}-${i}`,
      });
    }
  }

  // 조커 2장 추가
  deck.push({ rank: 'joker', id: 'joker-1' });
  deck.push({ rank: 'joker', id: 'joker-2' });

  return deck;
}

// 카드 섞기
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 카드 분배
export function dealCards(playerCount: number): Card[][] {
  const deck = shuffleDeck(createDeck());
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands;
}

// 카드 정렬 (혁명 상태 고려)
export function sortCards(cards: Card[], isRevolution: boolean): Card[] {
  return [...cards].sort((a, b) => {
    const aValue = getCardValue(a.rank);
    const bValue = getCardValue(b.rank);

    if (isRevolution) {
      return bValue - aValue; // 혁명: 역순
    }
    return aValue - bValue; // 정상: 오름차순
  });
}

// 카드 값 가져오기 (조커는 모든 카드로 사용 가능하므로 0)
export function getCardValue(rank: CardRank): number {
  if (rank === 'joker') return 0;
  return rank;
}

// 카드 플레이 가능 여부 체크
export function canPlayCards(
  cards: Card[],
  currentTurn: { cards: Card[] } | null,
  isRevolution: boolean
): boolean {
  if (!currentTurn) return true; // 첫 턴이면 무조건 가능

  const playedCards = cards;
  const tableCards = currentTurn.cards;

  // 같은 개수만 낼 수 있음
  if (playedCards.length !== tableCards.length) return false;

  // 모든 카드가 같은 등급이어야 함 (조커 제외)
  const nonJokerCards = playedCards.filter(c => c.rank !== 'joker');
  if (nonJokerCards.length > 0) {
    const firstRank = nonJokerCards[0].rank;
    if (!nonJokerCards.every(c => c.rank === firstRank)) return false;
  }

  // 조커만 혼자 내면 13으로 취급, 다른 카드와 함께 내면 그 카드로 취급
  const playedRank = nonJokerCards.length > 0 ? nonJokerCards[0].rank : 13; // 조커만 내면 13

  // 테이블 카드 정보
  const tableNonJoker = tableCards.filter(c => c.rank !== 'joker');
  const tableRank = tableNonJoker.length > 0 ? tableNonJoker[0].rank : 13; // 조커만 내면 13

  // 카드 값 계산 (13은 숫자 그대로 사용)
  const playedValue = typeof playedRank === 'number' ? playedRank : getCardValue(playedRank);
  const tableValue = typeof tableRank === 'number' ? tableRank : getCardValue(tableRank);

  // 혁명 상태에 따라 비교
  if (isRevolution) {
    return playedValue > tableValue; // 혁명: 높은 숫자가 약함
  }
  return playedValue < tableValue; // 정상: 낮은 숫자가 강함
}

// 혁명 체크 (같은 카드 8장 이상)
export function isRevolutionPlay(cards: Card[]): boolean {
  if (cards.length < 8) return false;

  const nonJokerCards = cards.filter(c => c.rank !== 'joker');
  if (nonJokerCards.length === 0) return false;

  const firstRank = nonJokerCards[0].rank;
  return nonJokerCards.every(c => c.rank === firstRank);
}
