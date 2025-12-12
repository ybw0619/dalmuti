import { Game, Player, Card } from '@/types/game';
import { canPlayCards, getCardValue } from '../game/cards';

export class AIPlayer {
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
  }

  // AI가 플레이할 카드 선택
  selectCards(game: Game, player: Player): Card[] | null {
    const { currentTurn, isRevolution } = game;

    if (!currentTurn) {
      // 첫 턴: 가장 많은 카드 내기
      return this.playFirstTurn(player, isRevolution);
    }

    // 현재 턴에 낼 수 있는 카드 찾기
    const playableGroups = this.findPlayableCardGroups(
      player.cards,
      currentTurn,
      isRevolution
    );

    if (playableGroups.length === 0) {
      return null; // 패스
    }

    // 난이도에 따른 전략
    switch (this.difficulty) {
      case 'easy':
        return this.easyStrategy(playableGroups);
      case 'medium':
        return this.mediumStrategy(playableGroups, game, player);
      case 'hard':
        return this.hardStrategy(playableGroups, game, player);
      default:
        return playableGroups[0];
    }
  }

  // 세금으로 줄 카드 선택 (가장 약한 카드)
  selectTaxCards(player: Player, count: number, isRevolution: boolean): Card[] {
    const sorted = [...player.cards].sort((a, b) => {
      const aVal = getCardValue(a.rank);
      const bVal = getCardValue(b.rank);
      // 약한 카드 우선
      if (isRevolution) {
        return aVal - bVal; // 혁명: 낮은 숫자가 약함
      }
      return bVal - aVal; // 정상: 높은 숫자가 약함
    });

    return sorted.slice(0, count);
  }

  // 첫 턴: 가장 많이 가진 카드 내기
  private playFirstTurn(player: Player, isRevolution: boolean): Card[] {
    const cardGroups = this.groupCardsByRank(player.cards);
    const sortedGroups = Object.entries(cardGroups).sort(
      (a, b) => b[1].length - a[1].length
    );

    if (sortedGroups.length === 0) return [];
    return sortedGroups[0][1];
  }

  // 낼 수 있는 카드 그룹 찾기
  private findPlayableCardGroups(
    cards: Card[],
    currentTurn: { cards: Card[] },
    isRevolution: boolean
  ): Card[][] {
    const requiredCount = currentTurn.cards.length;
    const cardGroups = this.groupCardsByRank(cards);
    const playableGroups: Card[][] = [];

    for (const rank in cardGroups) {
      const group = cardGroups[rank];
      if (group.length >= requiredCount) {
        // 정확히 필요한 개수만큼 내기
        for (let i = 0; i <= group.length - requiredCount; i++) {
          const subset = group.slice(i, i + requiredCount);
          if (canPlayCards(subset, currentTurn, isRevolution)) {
            playableGroups.push(subset);
          }
        }
      }
    }

    // 조커 조합도 고려
    const jokers = cards.filter(c => c.rank === 'joker');
    if (jokers.length > 0) {
      for (const rank in cardGroups) {
        if (rank === 'joker') continue;
        const group = cardGroups[rank];
        const totalCards = group.length + jokers.length;

        if (totalCards >= requiredCount) {
          for (let jokerUse = 1; jokerUse <= Math.min(jokers.length, requiredCount); jokerUse++) {
            const normalCards = requiredCount - jokerUse;
            if (group.length >= normalCards) {
              const combo = [
                ...group.slice(0, normalCards),
                ...jokers.slice(0, jokerUse),
              ];
              if (canPlayCards(combo, currentTurn, isRevolution)) {
                playableGroups.push(combo);
              }
            }
          }
        }
      }
    }

    return playableGroups;
  }

  // 카드를 랭크별로 그룹화
  private groupCardsByRank(cards: Card[]): Record<string, Card[]> {
    const groups: Record<string, Card[]> = {};
    for (const card of cards) {
      const key = String(card.rank);
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    }
    return groups;
  }

  // 쉬움: 첫 번째로 낼 수 있는 카드
  private easyStrategy(playableGroups: Card[][]): Card[] {
    return playableGroups[0];
  }

  // 중간: 가장 많이 가진 카드 우선
  private mediumStrategy(
    playableGroups: Card[][],
    game: Game,
    player: Player
  ): Card[] {
    // 같은 종류가 많이 남은 카드 우선
    const cardCounts = this.groupCardsByRank(player.cards);

    return playableGroups.sort((a, b) => {
      const aRank = String(a[0].rank);
      const bRank = String(b[0].rank);
      const aCount = cardCounts[aRank]?.length || 0;
      const bCount = cardCounts[bRank]?.length || 0;
      return bCount - aCount;
    })[0];
  }

  // 어려움: 게임 상황을 고려한 전략
  private hardStrategy(
    playableGroups: Card[][],
    game: Game,
    player: Player
  ): Card[] {
    const remainingPlayers = game.players.filter(p => !p.hasFinished).length;

    // 끝나가는 플레이어가 있으면 강한 카드로 막기
    const playersCloseToWinning = game.players.filter(
      p => !p.hasFinished && p.cards.length <= 3 && p.id !== player.id
    );

    if (playersCloseToWinning.length > 0) {
      // 가장 강한 카드 내기
      return this.getStrongestCards(playableGroups, game.isRevolution);
    }

    // 게임 초반: 많이 가진 카드 버리기
    if (player.cards.length > 10) {
      return this.mediumStrategy(playableGroups, game, player);
    }

    // 게임 후반: 적절한 카드로 승부
    if (player.cards.length <= 5) {
      return this.getStrongestCards(playableGroups, game.isRevolution);
    }

    // 중반: 적당한 카드
    return this.mediumStrategy(playableGroups, game, player);
  }

  // 가장 강한 카드 선택
  private getStrongestCards(groups: Card[][], isRevolution: boolean): Card[] {
    return groups.sort((a, b) => {
      const aValue = getCardValue(a[0].rank);
      const bValue = getCardValue(b[0].rank);

      if (isRevolution) {
        return bValue - aValue; // 혁명: 높은 숫자가 약함
      }
      return aValue - bValue; // 정상: 낮은 숫자가 강함
    })[0];
  }
}
