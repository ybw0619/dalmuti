import { Room, Player, Game, GameOptions } from '@/types/game';
import { createGame } from './gameLogic';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  // 방 생성
  createRoom(hostId: string, roomName: string, hostName: string): Room {
    const roomId = this.generateRoomId();
    const host: Player = {
      id: hostId,
      name: hostName,
      type: 'human',
      cards: [],
      position: 0,
      isReady: true, // 방장은 방 생성 시 자동으로 준비 상태
      hasFinished: false,
    };

    const room: Room = {
      id: roomId,
      name: roomName,
      players: [host],
      maxPlayers: 8,
      currentGame: null,
      hostId,
      gameOptions: {
        enableRevolution: true,
        enableTax: true,
      },
    };

    this.rooms.set(roomId, room);
    return room;
  }

  // 방 참가
  joinRoom(roomId: string, playerId: string, playerName: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    if (room.players.length >= room.maxPlayers) {
      throw new Error('방이 가득 찼습니다');
    }

    if (room.currentGame?.phase !== 'waiting' && room.currentGame !== null) {
      throw new Error('게임이 이미 진행 중입니다');
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      type: 'human',
      cards: [],
      position: 0,
      isReady: false,
      hasFinished: false,
    };

    room.players.push(player);
    this.rooms.set(roomId, room);
    return room;
  }

  // AI 플레이어 추가
  addAIPlayer(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    if (room.players.length >= room.maxPlayers) {
      throw new Error('방이 가득 찼습니다');
    }

    const aiPlayer: Player = {
      id: `ai-${Date.now()}-${Math.random()}`,
      name: `AI ${room.players.filter(p => p.type === 'ai').length + 1}`,
      type: 'ai',
      cards: [],
      position: 0,
      isReady: true, // AI는 항상 준비됨
      hasFinished: false,
    };

    room.players.push(aiPlayer);
    this.rooms.set(roomId, room);
    return room;
  }

  // 방 떠나기
  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);

    // 방이 비었으면 삭제
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // 호스트가 나갔으면 다른 플레이어를 호스트로
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }

    this.rooms.set(roomId, room);
    return room;
  }

  // 플레이어 준비 상태 변경
  setPlayerReady(roomId: string, playerId: string, isReady: boolean): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('플레이어를 찾을 수 없습니다');

    player.isReady = isReady;
    this.rooms.set(roomId, room);
    return room;
  }

  // 게임 옵션 업데이트
  updateGameOptions(roomId: string, options: GameOptions): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    room.gameOptions = options;
    this.rooms.set(roomId, room);
    return room;
  }

  // 게임 시작
  startGame(roomId: string, skipReadyCheck: boolean = false, isRestart: boolean = false): Game {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    if (room.players.length < 2) {
      throw new Error('최소 2명의 플레이어가 필요합니다');
    }

    if (!skipReadyCheck) {
      const allReady = room.players.every(p => p.isReady || p.type === 'ai');
      if (!allReady) {
        throw new Error('모든 플레이어가 준비되지 않았습니다');
      }
    }

    const game = createGame(room.players, roomId, room.gameOptions, isRestart);
    room.currentGame = game;
    this.rooms.set(roomId, room);

    return game;
  }

  // 게임 상태 업데이트
  updateGame(roomId: string, game: Game): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('방을 찾을 수 없습니다');

    room.currentGame = game;
    this.rooms.set(roomId, room);
  }

  // 방 가져오기
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // 모든 방 가져오기
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // 플레이어가 있는 방 찾기
  findRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === playerId)) {
        return room;
      }
    }
    return undefined;
  }

  private generateRoomId(): string {
    return `room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
