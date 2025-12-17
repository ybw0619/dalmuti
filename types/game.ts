// 카드 타입 (1~12등급, 조커 2장)
export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'joker';

export interface Card {
  rank: CardRank;
  id: string; // 고유 식별자
}

// 플레이어 타입
export type PlayerType = 'human' | 'ai';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  cards: Card[];
  position: number; // 게임에서의 순위 (1: 대달무티, 2: 달무티, ..., 마지막: 대거지)
  isReady: boolean;
  hasFinished: boolean; // 카드를 다 냈는지
  finishOrder?: number; // 몇 등으로 끝냈는지
}

// 게임 옵션
export interface GameOptions {
  enableRevolution: boolean; // 혁명 규칙 사용 여부
  enableTax: boolean; // 세금 규칙 사용 여부
  turnTimeLimit?: number; // 턴 제한 시간 (초), undefined면 무제한
}

// 게임 방
export interface Room {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  currentGame: Game | null;
  hostId: string;
  gameOptions: GameOptions;
}

// 게임 턴 정보
export interface Turn {
  playerId: string;
  cards: Card[];
  timestamp: number;
}

// 게임 상태
export type GamePhase =
  | 'waiting'      // 대기 중
  | 'tax'          // 세금 교환 중
  | 'playing'      // 게임 진행 중
  | 'finished';    // 게임 종료

export interface Game {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: Turn | null; // 현재 테이블에 놓인 카드들
  passCount: number; // 연속으로 패스한 플레이어 수
  turnHistory: Turn[];
  isRevolution: boolean; // 혁명 상태 (카드 순서 역전)
  taxPhaseComplete: boolean;
  finishedPlayers: string[]; // 끝난 플레이어 ID 목록
  gameOptions: GameOptions; // 게임 옵션
  turnStartTime?: number; // 현재 턴 시작 시각 (timestamp)
}

// Socket 이벤트 타입
export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'game:started': (game: Game) => void;
  'game:updated': (game: Game) => void;
  'game:turn': (turn: Turn) => void;
  'game:finished': (results: GameResult[]) => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'error': (message: string) => void;
  'tax:request': (data: TaxRequest) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { name: string; playerName: string }, callback: (room: Room) => void) => void;
  'room:join': (data: { roomId: string; playerName: string }, callback: (room: Room) => void) => void;
  'room:leave': () => void;
  'game:start': () => void;
  'game:play': (cards: Card[]) => void;
  'game:pass': () => void;
  'room:addAI': () => void;
  'player:ready': () => void;
  'tax:submit': (cards: Card[]) => void;
  'room:updateOptions': (options: GameOptions) => void;
}

// 세금 요청
export interface TaxRequest {
  fromPlayerId: string;
  toPlayerId: string;
  cardCount: number;
}

// 게임 결과
export interface GameResult {
  playerId: string;
  playerName: string;
  position: number;
}
