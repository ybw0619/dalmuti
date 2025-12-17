import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './lib/game/roomManager';
import { playCards, passPlay, applyTax, calculateTaxRequests } from './lib/game/gameLogic';
import { AIPlayer } from './lib/ai/aiPlayer';
import type { ServerToClientEvents, ClientToServerEvents } from './types/game';

const roomManager = new RoomManager();
const aiPlayers = new Map<string, AIPlayer>();

export function setupSocketServer(httpServer: ReturnType<typeof createServer>) {
  const hostname = process.env.SERVER_HOST || 'localhost';
  const port = process.env.PORT || '3456';

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : [`http://${hostname}:${port}`],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('클라이언트 연결:', socket.id);

    // 방 생성
    socket.on('room:create', ({ name, playerName }, callback) => {
      try {
        const room = roomManager.createRoom(socket.id, name, playerName);
        socket.join(room.id);
        callback(room);
        io.to(room.id).emit('room:updated', room);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 방 참가
    socket.on('room:join', ({ roomId, playerName }, callback) => {
      try {
        const room = roomManager.joinRoom(roomId, socket.id, playerName);
        socket.join(roomId);
        callback(room);
        io.to(roomId).emit('room:updated', room);
        io.to(roomId).emit('player:joined', room.players.find((p) => p.id === socket.id)!);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 방 떠나기
    socket.on('room:leave', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (room) {
        const updatedRoom = roomManager.leaveRoom(room.id, socket.id);
        socket.leave(room.id);
        if (updatedRoom) {
          io.to(room.id).emit('room:updated', updatedRoom);
        }
        io.to(room.id).emit('player:left', socket.id);
      }
    });

    // AI 추가
    socket.on('room:addAI', () => {
      try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room) {
          socket.emit('error', '방을 찾을 수 없습니다');
          return;
        }

        if (room.hostId !== socket.id) {
          socket.emit('error', '방장만 AI를 추가할 수 있습니다');
          return;
        }

        const updatedRoom = roomManager.addAIPlayer(room.id);
        io.to(room.id).emit('room:updated', updatedRoom);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 게임 옵션 업데이트
    socket.on('room:updateOptions', (options) => {
      try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room) {
          socket.emit('error', '방을 찾을 수 없습니다');
          return;
        }

        if (room.hostId !== socket.id) {
          socket.emit('error', '방장만 게임 옵션을 변경할 수 있습니다');
          return;
        }

        const updatedRoom = roomManager.updateGameOptions(room.id, options);
        io.to(room.id).emit('room:updated', updatedRoom);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 준비
    socket.on('player:ready', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (room) {
        const updatedRoom = roomManager.setPlayerReady(room.id, socket.id, true);
        io.to(room.id).emit('room:updated', updatedRoom);
      }
    });

    // 게임 시작
    socket.on('game:start', () => {
      try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room || room.hostId !== socket.id) {
          socket.emit('error', '방장만 게임을 시작할 수 있습니다');
          return;
        }

        const game = roomManager.startGame(room.id);
        io.to(room.id).emit('game:started', game);

        // 세금 단계 시작
        if (game.phase === 'tax') {
          const taxRequests = calculateTaxRequests(game.players);
          taxRequests.forEach((req) => {
            io.to(req.fromPlayerId).emit('tax:request', req);
          });
        }

        // AI 차례면 자동 플레이
        setTimeout(() => processAITurn(room.id), 1000);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 세금 제출
    socket.on('tax:submit', (cards) => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (!room || !room.currentGame) return;

      // 세금 로직 처리 (간단히 구현)
      // 실제로는 더 복잡한 검증이 필요
      io.to(room.id).emit('game:updated', room.currentGame);
    });

    // 카드 플레이
    socket.on('game:play', (cards) => {
      try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room || !room.currentGame) {
          socket.emit('error', '게임을 찾을 수 없습니다');
          return;
        }

        const updatedGame = playCards(room.currentGame, socket.id, cards);
        roomManager.updateGame(room.id, updatedGame);

        io.to(room.id).emit('game:updated', updatedGame);

        if (updatedGame.phase === 'finished') {
          io.to(room.id).emit(
            'game:finished',
            updatedGame.players.map((p, i) => ({
              playerId: p.id,
              playerName: p.name,
              position: p.finishOrder || updatedGame.players.length,
            }))
          );
        } else {
          // AI 차례 처리
          setTimeout(() => processAITurn(room.id), 1000);
        }
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 패스
    socket.on('game:pass', () => {
      try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room || !room.currentGame) {
          socket.emit('error', '게임을 찾을 수 없습니다');
          return;
        }

        const updatedGame = passPlay(room.currentGame, socket.id);
        roomManager.updateGame(room.id, updatedGame);

        io.to(room.id).emit('game:updated', updatedGame);

        // AI 차례 처리
        setTimeout(() => processAITurn(room.id), 1000);
      } catch (error) {
        socket.emit('error', (error as Error).message);
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('클라이언트 연결 해제:', socket.id);
      const room = roomManager.findRoomByPlayer(socket.id);
      if (room) {
        const updatedRoom = roomManager.leaveRoom(room.id, socket.id);
        if (updatedRoom) {
          io.to(room.id).emit('room:updated', updatedRoom);
        }
        io.to(room.id).emit('player:left', socket.id);
      }
    });
  });

  // AI 턴 처리
  function processAITurn(roomId: string) {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.currentGame) return;

    const game = room.currentGame;
    if (game.phase !== 'playing') return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.type !== 'ai' || currentPlayer.hasFinished) return;

    // AI 플레이어 가져오기 또는 생성
    let ai = aiPlayers.get(currentPlayer.id);
    if (!ai) {
      ai = new AIPlayer('medium');
      aiPlayers.set(currentPlayer.id, ai);
    }

    // AI가 카드 선택
    const selectedCards = ai.selectCards(game, currentPlayer);

    try {
      let updatedGame;
      if (selectedCards && selectedCards.length > 0) {
        updatedGame = playCards(game, currentPlayer.id, selectedCards);
      } else {
        updatedGame = passPlay(game, currentPlayer.id);
      }

      roomManager.updateGame(roomId, updatedGame);
      io.to(roomId).emit('game:updated', updatedGame);

      if (updatedGame.phase === 'finished') {
        io.to(roomId).emit(
          'game:finished',
          updatedGame.players.map((p, i) => ({
            playerId: p.id,
            playerName: p.name,
            position: p.finishOrder || updatedGame.players.length,
          }))
        );
      } else {
        // 다음 AI 차례면 계속 처리
        setTimeout(() => processAITurn(roomId), 1000);
      }
    } catch (error) {
      console.error('AI 플레이 오류:', error);
    }
  }

  return io;
}
