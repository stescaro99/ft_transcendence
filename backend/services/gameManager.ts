import { WebSocket } from 'ws';
import { Player, GameRoom } from './game/types';
import { RoomManager } from './game/roomManager';
import { GameValidator } from './game/validator';
import { GameLoop } from './game/gameLoop';
import { HeartbeatManager } from './game/heartbeat';
import Game from '../models/game';
import { saveGameAndStats } from './game/gameResult';

class GameManager {
  public roomManager: RoomManager;
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

  findMatch(player: Player, gameType: 'two' | 'four' = 'two'): { roomId: string | null, isRoomFull: boolean }
  {
    console.log('[GameManager] Finding match for player:', player.nickname, 'gameType:', gameType);
    const roomId = this.roomManager.findMatch(player, gameType);
    console.log('[GameManager] roomManager.findMatch returned:', roomId);
    let isRoomFull = false;
    
    if (roomId) {
      const room = this.roomManager.getRoom(roomId);
      console.log('[GameManager] Room details:', {
        id: room?.id,
        playersCount: room?.players.length,
        maxPlayers: room?.maxPlayers,
        isActive: room?.isActive
      });
      if (room && room.players.length === room.maxPlayers) {
        isRoomFull = true;
        console.log('[GameManager] Room is full, returning isRoomFull=true');
      }
    }
    console.log('[GameManager] findMatch returning:', { roomId, isRoomFull });
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
    console.log('[GameManager] startGame called for roomId:', roomId);
    const room = this.roomManager.getRoom(roomId);
    console.log('[GameManager] Got room:', room ? 'found' : 'not found');
    if (!room || room.players.length !== room.maxPlayers) {
      console.log('[GameManager] Cannot start game:', {
        roomExists: !!room,
        playersCount: room?.players.length,
        maxPlayers: room?.maxPlayers
      });
      return;
    }

    room.isActive = true;
    console.log('[GameManager] About to call createInitialGameState...');
    room.gameState = this.roomManager.createInitialGameState(room.type);
    console.log('[GameManager] createInitialGameState completed');
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

      // Invia solo a questo player
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
    console.log(`User ${nickname} disconnected from ${roomsToUpdate.length} rooms due to logout`);
  }

  // ===== METODI PRIVATI =====

  private updatePaddleMovement(room: GameRoom, player: Player, input: any): void {
    const validatedDirection = GameValidator.sanitizeDirection(input.direction);
    const playerSide = this.roomManager.getPlayerSide(room, player);
    const paddleIndex = this.roomManager.getPlayerPaddleIndex(room, player);
    
    console.log(`[GameManager] Player ${player.nickname} side: ${playerSide}, direction: ${validatedDirection}`);
    
    if (room.type === 'two') {
        if (playerSide === 'left') {
            // CAMBIA: assegna direttamente invece di aggiungere
            room.gameState.leftPaddle[0].dy = validatedDirection * room.gameState.leftPaddle[0].speed;
        } else if (playerSide === 'right') {
            room.gameState.rightPaddle[0].dy = validatedDirection * room.gameState.rightPaddle[0].speed;
        }
    } else {
        // Logica per 4 giocatori
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
    
    saveGameAndStats(room, {
      winnerSide: winner,
      winnerNicknames,
      loserNicknames,
      reason: 'playerDisconnection',
      isDisconnectionWin: true
    }).catch(err => console.error('[GameManager] Error saving disconnection result:', err));
    console.log(`Game ended in room ${roomId} due to disconnection. Winner: ${winner}`, gameResult);
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
}

export const gameManager = new GameManager();
export { Player, GameRoom, GameState } from './game/types';
