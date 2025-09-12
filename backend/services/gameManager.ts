import { WebSocket } from 'ws';
import { Player, GameRoom } from './game/types';
import { RoomManager } from './game/roomManager';
import { GameValidator } from './game/validator';
import { GameLoop } from './game/gameLoop';
import { HeartbeatManager } from './game/heartbeat';
import Game from '../models/game';
import { saveGameAndStats } from './game/gameResult';

export class GameManager {
  public roomManager: RoomManager = new RoomManager();
  private heartbeatManager: HeartbeatManager;
  private waitingPlayers: Player[] = [];

  constructor() {
    this.roomManager = new RoomManager();
    this.heartbeatManager = new HeartbeatManager();

    this.heartbeatManager.startHeartbeatMonitoring((playerId) => {
      this.removePlayerFromAllRooms(playerId);
    });
  }

  // ===== GESTIONE STANZE =====
  
  createRoom(type: 'two' | 'four' = 'two'): string {
    return this.roomManager.createRoom(type);
  }

  addPlayerToRoom(roomId: string, player: Player): boolean {
    const success = this.roomManager.addPlayerToRoom(roomId, player);
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'playerJoined',
        player: { id: player.id, nickname: player.nickname },
        totalPlayers: this.roomManager.getRoom(roomId)?.players.length,
        maxPlayers: this.roomManager.getRoom(roomId)?.maxPlayers
      });
    }
    return success;
  }

  findMatch(player: Player, gameType: 'two' | 'four' = 'two', opts?: { powerUpsEnabled?: boolean }) : { roomId: string | null, isRoomFull: boolean }
  {
    const roomId = this.roomManager.findMatch(player, gameType, opts);
    let isRoomFull = false;
    
    if (roomId) {
      const room = this.roomManager.getRoom(roomId);
      if (room && room.players.length === room.maxPlayers) {
        isRoomFull = true;
      }
    }
    return { roomId, isRoomFull };
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    this.roomManager.removePlayerFromRoom(roomId, playerId);
    
    if (room.players.length === 0) {
      GameLoop.stopGameLoop(roomId);
    } else {
      this.broadcastToRoom(roomId, {
        type: 'playerLeft',
        playerId,
        totalPlayers: room.players.length
      });
      if (room.isActive) {
        this.handlePlayerDisconnectionWin(roomId, room, disconnectedPlayer);
      }
    }
  }

  // ===== GESTIONE GIOCO =====

  startGame(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.players.length !== room.maxPlayers) {
      return;
    }

    room.isActive = true;
    room.gameState = this.roomManager.createInitialGameState(room.type);

    // >>> NEW: Propaga la preferenza power-up della room nello stato iniziale
    room.gameState.powerUpsEnabled = room.powerUpsEnabled !== false;
    if (room.gameState.powerUpsEnabled === false && room.gameState.powerUp) {
      room.gameState.powerUp.active = false;
    }

    this.roomManager.assignPlayersToPositions(room);
    this.broadcastToRoom(roomId, {
      type: 'gameStarted',
      gameState: room.gameState
    });

    room.players.forEach(player => {
      const mySide = this.roomManager.getPlayerSide(room, player); 
      const myPaddleIndex = this.roomManager.getPlayerPaddleIndex(room, player);
      const initialState = {
          ...room.gameState,
          mySide,
          myPaddleIndex
      };

      if (player.socket.readyState === 1) {
          player.socket.send(JSON.stringify({
              type: 'gameStarted',
              gameState: initialState
          }));
      }
    });

    GameLoop.startGameLoop(roomId, room, (roomId, message) => {
      this.broadcastToRoom(roomId, message);
    });
  }

  handlePlayerInput(roomId: string, playerId: string, input: any): void {
    const room = this.roomManager.getRoom(roomId);
  
    if (!room || !room.isActive) return;
    const player = room.players.find(p => p.id === playerId);

    if (!player) return;
    if (!GameValidator.validateInputRate(playerId, player.nickname)) {
      return;
    }
    if (!GameValidator.validateAdvancedInput(input, player)) {
      console.warn(`Suspicious input detected from player ${player.nickname}:`, input);
      return;
    }
    this.updatePaddleMovement(room, player, input);
  }

  syncClientState(roomId: string, playerId: string): void {
    const room = this.roomManager.getRoom(roomId);

    if (!room) return;
    const player = room.players.find(p => p.id === playerId);

    if (!player || player.socket.readyState !== WebSocket.OPEN) return;
    const fullState = {
      type: 'fullStateSync',
      gameState: room.gameState,
      roomInfo: {
        id: room.id,
        players: room.players.map(p => ({ id: p.id, nickname: p.nickname })),
        isActive: room.isActive,
        type: room.type
      },
      timestamp: Date.now()
    };
    player.socket.send(JSON.stringify(fullState));
  }

  // ===== GESTIONE HEARTBEAT =====

  updatePlayerHeartbeat(playerId: string): void {
    this.heartbeatManager.updatePlayerHeartbeat(playerId);
  }

  // ===== UTILITY =====

  getRoomInfo(roomId: string): GameRoom | null {
    return this.roomManager.getRoom(roomId) || null;
  }

  getActiveRooms(): GameRoom[] {
    return this.roomManager.getAllRooms();
  }

  disconnectUserFromAllRooms(nickname: string): void {
    const roomsToUpdate: string[] = [];
    for (const room of this.roomManager.getAllRooms()) {
      const playerIndex = room.players.findIndex(p => p.nickname === nickname);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        roomsToUpdate.push(room.id);
        if (player.socket.readyState === 1) {
          player.socket.close(1000, 'User logged out');
        }
        this.removePlayerFromRoom(room.id, player.id);
      }
    }
  }

  // ===== METODI PRIVATI =====

  private updatePaddleMovement(room: GameRoom, player: Player, input: any): void {
    const validatedDirection = GameValidator.sanitizeDirection(input.direction);
    const playerSide = this.roomManager.getPlayerSide(room, player);
    const paddleIndex = this.roomManager.getPlayerPaddleIndex(room, player);
    
    if (room.type === 'two') {
      if (playerSide === 'left') {
        room.gameState.leftPaddle[0].dy = validatedDirection * room.gameState.leftPaddle[0].speed;
      } else if (playerSide === 'right') {
        room.gameState.rightPaddle[0].dy = validatedDirection * room.gameState.rightPaddle[0].speed;
      }
    } else {
      if (playerSide === 'left') {
        room.gameState.leftPaddle[paddleIndex].dy = validatedDirection * room.gameState.leftPaddle[paddleIndex].speed;
      } else {
        room.gameState.rightPaddle[paddleIndex].dy = validatedDirection * room.gameState.rightPaddle[paddleIndex].speed;
      }
    }
  }

  private broadcastToRoom(roomId: string, message: any): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    room.players.forEach(player => {
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(messageStr);
      }
    });
  }

  private removePlayerFromAllRooms(playerId: string): void {
    for (const room of this.roomManager.getAllRooms()) {
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        this.removePlayerFromRoom(room.id, playerId);
      }
    }
    GameValidator.clearPlayerInputHistory(playerId);
    this.heartbeatManager.removePlayer(playerId);
  }

  private handlePlayerDisconnectionWin(roomId: string, room: GameRoom, disconnectedPlayer?: Player): void {
    GameLoop.stopGameLoop(roomId);
    room.isActive = false;

    const remainingPlayers = room.players.filter(p => p.id !== disconnectedPlayer?.id);
    
    if (remainingPlayers.length === 0) {
      this.roomManager.deleteRoom(roomId);
      return;
    }
    let winner: 'left' | 'right';
    const winnerNicknames: string[] = [];
    const loserNicknames: string[] = [];

    if (room.type === 'two') {
      const remainingPlayer = remainingPlayers[0];
      const playerIndex = room.players.indexOf(remainingPlayer);
      winner = playerIndex === 0 ? 'left' : 'right';
      winnerNicknames.push(remainingPlayer.nickname);
      if (disconnectedPlayer) {
        loserNicknames.push(disconnectedPlayer.nickname);
      }
    } else {
      const leftPlayers = remainingPlayers.filter((_, index) => 
        room.players.indexOf(remainingPlayers[index]) < 2
      );
      const rightPlayers = remainingPlayers.filter((_, index) => 
        room.players.indexOf(remainingPlayers[index]) >= 2
      );
      
      if (leftPlayers.length > rightPlayers.length) {
        winner = 'left';
        winnerNicknames.push(...leftPlayers.map(p => p.nickname));
      } else if (rightPlayers.length > leftPlayers.length) {
        winner = 'right';
        winnerNicknames.push(...rightPlayers.map(p => p.nickname));
      } else {
        winner = 'left';
        winnerNicknames.push(...leftPlayers.map(p => p.nickname));
      }
      
      if (disconnectedPlayer) {
        loserNicknames.push(disconnectedPlayer.nickname);
      }
    }

    // Snapshot final scores before forcing maxScore so we can save the real values
    const finalScores: [number, number] = [room.gameState.scoreLeft, room.gameState.scoreRight];
    if (winner === 'left') {
      room.gameState.scoreLeft = room.gameState.maxScore;
    } else {
      room.gameState.scoreRight = room.gameState.maxScore;
    }

    const gameResult = {
      type: 'gameEnded',
      winner: winner,
      reason: 'playerDisconnection',
      disconnectedPlayer: disconnectedPlayer?.nickname,
      finalScore: {
        left: room.gameState.scoreLeft,
        right: room.gameState.scoreRight
      },
      players: room.players.map(p => ({
        nickname: p.nickname,
        side: this.getPlayerSide(room, p),
        connected: remainingPlayers.some(rp => rp.id === p.id)
      })),
      timestamp: Date.now()
    };

    this.broadcastToRoom(roomId, gameResult);
    
    // include gameId if available to finalize existing DB record
  // prefer typed room.gameId, fallback to gameState.gameId
  // @ts-ignore
  const gid: number | undefined = room.gameId || (room.gameState && (room.gameState as any).gameId);
    saveGameAndStats(room, {
      winnerSide: winner,
      winnerNicknames,
      loserNicknames,
      reason: 'playerDisconnection',
      isDisconnectionWin: true,
      finalScores,
      gameId: gid
    }).catch(err => console.error('[GameManager] Error saving disconnection result:', err));
    setTimeout(() => {
      this.roomManager.deleteRoom(roomId);
    }, 150);
  }

  // saveGameResultToDatabase rimosso (logica centralizzata in saveGameAndStats)

  private getPlayerSide(room: GameRoom, player: Player): string {
    const playerIndex = room.players.indexOf(player);
    if (room.type === 'two') {
      return playerIndex === 0 ? 'left' : 'right';
    } else {
      return playerIndex < 2 ? 'left' : 'right';
    }
  }

  handlePlayerDisconnection(playerId: string): void {
    const activeRooms = this.roomManager.getAllRooms();

    activeRooms.forEach(room => {
      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      // Se la partita è attiva, termina subito assegnando la vittoria ai rimanenti
      if (room.isActive) {
        this.handlePlayerDisconnectionWin(room.id, room, player);
      }

      // Rimuovi il player dalla stanza (non rilancerà la win perché room.isActive è stato messo a false)
      this.roomManager.removePlayerFromRoom(room.id, playerId);
    });

    GameValidator.clearPlayerInputHistory(playerId);
    this.heartbeatManager.removePlayer(playerId);
  }

  handlePlayerReconnection(nickname: string, newSocket: any): Player | null {
    const activeRooms = this.roomManager.getAllRooms();
    for (const room of activeRooms) {
      const reconnectedPlayer = this.roomManager.reconnectPlayer(room.id, nickname, newSocket);
      if (reconnectedPlayer) {
        this.syncClientState(room.id, reconnectedPlayer.id);
        return reconnectedPlayer;
      }
    }
    return null;
  }
}

export const gameManager = new GameManager();
export { Player, GameRoom, GameState } from './game/types';
