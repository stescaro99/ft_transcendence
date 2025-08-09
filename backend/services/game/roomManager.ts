import { GameRoom, Player, GameState, GAME_CONSTANTS } from './types';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(type: 'two' | 'four' = 'two'): string {
    console.log('[RoomManager] Creating room of type:', type);
    
    const roomId = this.generateRoomId();
    console.log('[RoomManager] Generated roomId:', roomId);
    
    console.log('[RoomManager] About to call createInitialGameState...');
    const gameState = this.createInitialGameState(type);
    console.log('[RoomManager] Game state created:', gameState);
    
    const room: GameRoom = {
      id: roomId,
      players: [],
      gameState: gameState,
      isActive: false,
      maxPlayers: type === 'two' ? 2 : 4,
      type
    };
    
    this.rooms.set(roomId, room);
    console.log('[RoomManager] Room created and stored');
    
    return roomId;
  }

  addPlayerToRoom(roomId: string, player: Player): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= room.maxPlayers) {
      return false;
    }

    room.players.push(player);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else {
      if (room.isActive) {
        room.isActive = false;
        }
    }
    }

  findMatch(player: Player, gameType: 'two' | 'four' = 'two'): string | null {
    console.log('[RoomManager] findMatch called for:', player.nickname, 'gameType:', gameType);
    console.log('[RoomManager] Current rooms count:', this.rooms.size);
    
    // Prima cerca una room esistente
    for (const [roomId, room] of this.rooms) {
      console.log('[RoomManager] Checking room:', roomId, {
        type: room.type,
        playersCount: room.players.length,
        maxPlayers: room.maxPlayers,
        isActive: room.isActive
      });
      if (room.type === gameType && 
          room.players.length < room.maxPlayers && 
          !room.isActive) {
        console.log('[RoomManager] Found existing room:', roomId);
        this.addPlayerToRoom(roomId, player);
        return roomId;
      }
    }

    // Nessuna room disponibile, crea una nuova
    console.log('[RoomManager] No existing room found, creating new one...');
    const roomId = this.createRoom(gameType);
    this.addPlayerToRoom(roomId, player);
    return roomId;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  assignPlayersToPositions(room: GameRoom): void {
    console.log('[RoomManager] Assigning players to positions...');
    room.players.forEach((player, index) => {
        if (room.type === 'two')
          {
            if (index === 0)
            {
              room.gameState.leftPaddle[0].nickname = player.nickname;
              console.log(`[RoomManager] Player ${player.nickname} assigned to LEFT paddle`);
            }
            else if (index === 1)
            {
              room.gameState.rightPaddle[0].nickname = player.nickname;
              console.log(`[RoomManager] Player ${player.nickname} assigned to RIGHT paddle`);
            }
          }
        else {
          if (index === 0)
          {
            room.gameState.leftPaddle[0].nickname = player.nickname;
            console.log(`[RoomManager] Player ${player.nickname} assigned to LEFT TOP paddle`);
          }
          else if (index === 1)
          {
            room.gameState.leftPaddle[1].nickname = player.nickname;
            console.log(`[RoomManager] Player ${player.nickname} assigned to LEFT BOTTOM paddle`);
          }
          else if (index === 2)
          {
            room.gameState.rightPaddle[0].nickname = player.nickname;
            console.log(`[RoomManager] Player ${player.nickname} assigned to RIGHT TOP paddle`);
          }
          else if (index === 3)
          {
            room.gameState.rightPaddle[1].nickname = player.nickname;
            console.log(`[RoomManager] Player ${player.nickname} assigned to RIGHT BOTTOM paddle`);
          }
      }
    });
  }

  getPlayerSide(room: GameRoom, player: Player): string
  {
    const playerIndex = room.players.indexOf(player);
    if (room.type === 'two')
      return playerIndex === 0 ? 'left' : 'right';
    else
      return playerIndex < 2 ? 'left' : 'right';
  }


  getPlayerPaddleIndex(room: GameRoom, player: Player): number
  {
    const playerIndex = room.players.indexOf(player);
    if (room.type === 'two')
      return 0;
    else
      return playerIndex % 2;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  createInitialGameState(type: 'two' | 'four'): GameState {
    const paddleHeight = GAME_CONSTANTS.CANVAS_HEIGHT / 5;
    const paddleWidth = GAME_CONSTANTS.PADDLE_WIDTH;

    const baseState: GameState = {
        ball: {
            x: GAME_CONSTANTS.CANVAS_WIDTH / 2,
            y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
            dx: 5,        
            dy: 5,        
            radius: GAME_CONSTANTS.BALL_RADIUS,
            speed: 1.5
        },
        leftPaddle: [
            {
                x: 30,    
                y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - paddleHeight / 2,
                dy: 0,
                speed: 6, 
                height: paddleHeight,
                nickname: ""
            }
        ],
        rightPaddle: [
            {
                x: GAME_CONSTANTS.CANVAS_WIDTH - paddleWidth - 30,
                y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - paddleHeight / 2,
                dy: 0,
                speed: 6, 
                height: paddleHeight,
                nickname: ""
            }
        ],
        powerUp: {
            x: Math.random() * (GAME_CONSTANTS.CANVAS_WIDTH - 200) + 100, 
            y: Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - 200) + 100,
            width: 20,
            height: 20,
            active: true,
            type: "", 
            color: "" 
        },
        scoreLeft: 0,
        scoreRight: 0,
        paddleHeight: paddleHeight,
        paddleWidth: paddleWidth,
        waitingForStart: true,
        maxScore: 5,                
        paddleSpeed: 6              
    };

    this.randomizePowerUp(baseState);

    if (type === 'four') {
        // Paddle sinistra (secondo paddle più avanti)
        baseState.leftPaddle.push({
            x: GAME_CONSTANTS.CANVAS_WIDTH / 7,
            y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - paddleHeight / 2,
            dy: 0,
            speed: 6,
            height: paddleHeight,
            nickname: ""
        });

        // Paddle destra (secondo paddle più avanti)
        baseState.rightPaddle.push({
            x: GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.CANVAS_WIDTH / 7 - paddleWidth,
            y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - paddleHeight / 2,
            dy: 0,
            speed: 6,
            height: paddleHeight,
            nickname: ""
        });
    }

    return baseState;
}

private randomizePowerUp(gameState: GameState): void
{
    const rectWidth = GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const rectHeight = GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    const rectX = GAME_CONSTANTS.CANVAS_WIDTH / 4;
    const rectY = GAME_CONSTANTS.CANVAS_HEIGHT / 4; 

    gameState.powerUp.x = Math.random() * rectWidth + rectX;
    gameState.powerUp.y = Math.random() * rectHeight + rectY;

    const types = ["SizeIncrease", "SizeDecrease", "SpeedBoost"];
    const index = Math.floor(Math.random() * types.length);
    gameState.powerUp.type = types[index];

    switch (gameState.powerUp.type) {
        case "SizeIncrease":
            gameState.powerUp.color = "#00ff00"; // verde
            break;
        case "SizeDecrease":
            gameState.powerUp.color = "#ff0000"; // rosso
            break;
        case "SpeedBoost":
            gameState.powerUp.color = "#ffff00"; // giallo
            break;
    }
  }
}