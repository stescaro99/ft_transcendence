import { FastifyRequest } from 'fastify';
import { gameManager, Player } from '../services/gameManager';
import jwt from 'jsonwebtoken';
import User from '../models/user';

export async function handleWebSocketConnection(connection: any, req: FastifyRequest) {
  
  let authenticatedUser = null;
  const query = req.query as any;
  
  if (query.token) {
    try {
      const decoded = jwt.verify(query.token, process.env.JWT_SECRET!) as any;
      authenticatedUser = decoded;
      
      if (decoded.nickname) {
        await updateUserOnlineStatus(decoded.nickname, true);
      }
    } catch (error) {
    }
  }

  let player: Player | null = null;

  if (authenticatedUser?.nickname) {
    const reconnected = gameManager.handlePlayerReconnection(authenticatedUser.nickname, connection);
    if (reconnected) {
      player = reconnected;
    }
  }

  if (!player) {
    player = {
      id: Math.random().toString(36).substring(2),
      nickname: authenticatedUser?.nickname || authenticatedUser?.username || '',
      socket: connection,
      ready: false,
      online: true,
      lastHeartbeat: Date.now(),
      currentRoomId: authenticatedUser?.current_room || undefined 
    };
  }

  // Ora 'player' è sicuramente assegnato, puoi usarlo
  connection.send(JSON.stringify({
    type: 'connected',
    playerId: player.id,
    nickname: player.nickname,
    message: 'Connected to game server'
  }));
  connection.on('message', (message: any) => {
    handlePlayerMessage(player, message);
  });
  connection.on('close', async () => {
    await handlePlayerDisconnection(player, authenticatedUser);
  });
  connection.on('error', (error: any) => {
    console.error(`WebSocket error for player ${player.id}:`, error);
  });
}

function handlePlayerMessage(player: Player, message: any) {
  try {
    const data = JSON.parse(message.toString());
    
    gameManager.updatePlayerHeartbeat(player.id);
    switch (data.type) {
      case 'setNickname':
        handleSetNickname(player, data);
        break;
      case 'joinRoom':
        handleJoinRoom(player, data);
        break;
      case 'findMatch':
        handleFindMatch(player, data);
        break;
      case 'createRoom':
        handleCreateRoom(player, data);
        break;
      case 'playerInput':
        handlePlayerInputWithValidation(player, data);
        break;
      case 'playerReady':
        handlePlayerReady(player, data);
        break;
      case 'getRoomInfo':
        handleGetRoomInfo(player, data);
        break;
      case 'leaveRoom':
        handleLeaveRoom(player, data);
        break;
      case 'ping':
        handlePing(player, data);
        break;
      case 'requestSync':
        handleRequestSync(player, data);
        break;
      default:
        sendToPlayer(player, {
          type: 'error',
          message: `Unknown message type: ${data.type}`
        });
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    sendToPlayer(player, {
      type: 'error',
      message: 'Invalid message format'
    });
  }
}

function handleSetNickname(player: Player, data: any) {
  player.nickname = data.nickname;
  sendToPlayer(player, {
    type: 'nicknameSet',
    playerId: player.id,
    nickname: player.nickname
  });
}

function handleJoinRoom(player: Player, data: any) {
  const success = gameManager.addPlayerToRoom(data.roomId, player);

  if (player.nickname && success) {
    updateUserCurrentRoom(player.nickname, data.roomId).catch(console.error);
  }
  sendToPlayer(player, {
    type: 'joinResult',
    success,
    roomId: data.roomId
  });
}

function handleFindMatch(player: Player, data: any) {
    
    // DEBUG: Log per tracciare currentRoomId e stato stanza
    const existingRoom = gameManager.getRoomInfo(player.currentRoomId || '');
    
    if (existingRoom && existingRoom.isActive && existingRoom.players.some(p => p.id === player.id && !p.online)) {
        const reconnected = gameManager.handlePlayerReconnection(player.nickname, player.socket);
        if (reconnected) {
            return;
        } else {
        }
    } else {
    }
    
    // Procedi con ricerca normale
    const powerUpsEnabled = data?.options?.powerUp !== 'off';
  const result = gameManager.findMatch(player, data.gameType || 'two', { powerUpsEnabled });

  if (result.roomId) 
  {
    const room = gameManager.getRoomInfo(result.roomId);
    if (result.isRoomFull && room)
    {
      room.players.forEach(p => {
        sendToPlayer(p, {
          type: 'matchFound',
          roomId: result.roomId
        });
      });
      // Avvia il gioco immediatamente
      gameManager.startGame(result.roomId);
    } else {
      // Il giocatore è in attesa
      sendToPlayer(player, {
        type: 'waitingForPlayers',
        roomId: result.roomId,
        currentPlayers: room?.players.length || 0,
        maxPlayers: room?.maxPlayers || 2
      });
    }
  }
}

function handleCreateRoom(player: Player, data: any) {
  const newRoomId = gameManager.createRoom(data.gameType || 'two');
  gameManager.addPlayerToRoom(newRoomId, player);
  
  if (player.nickname) {
    updateUserCurrentRoom(player.nickname, newRoomId).catch(console.error);
  }
  sendToPlayer(player, {
    type: 'roomCreated',
    roomId: newRoomId
  });
}

function handlePlayerReady(player: Player, data: any) {
  player.ready = data.ready;
  const room = gameManager.getRoomInfo(data.roomId);
  
  if (room) {
    room.players.forEach(p => {
      if (p.id !== player.id) {
        sendToPlayer(p, {
          type: 'playerReadyChanged',
          playerId: player.id,
          ready: player.ready
        });
      }
    });
    const allReady = room.players.every(p => p.ready);
    if (allReady && room.players.length === room.maxPlayers && !room.isActive) {
      gameManager.startGame(data.roomId);
    }
  }
}

function handleGetRoomInfo(player: Player, data: any) {
  const roomInfo = gameManager.getRoomInfo(data.roomId);
  sendToPlayer(player, {
    type: 'roomInfo',
    room: roomInfo ? {
      id: roomInfo.id,
      players: roomInfo.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        ready: p.ready
      })),
      isActive: roomInfo.isActive,
      maxPlayers: roomInfo.maxPlayers,
      type: roomInfo.type
    } : null
  });
}

function handleLeaveRoom(player: Player, data: any) {
  gameManager.removePlayerFromRoom(data.roomId, player.id);
  if (player.nickname) {
    updateUserCurrentRoom(player.nickname, null).catch(console.error);
  }
  
  sendToPlayer(player, {
    type: 'leftRoom',
    roomId: data.roomId
  });
}

async function handlePlayerDisconnection(player: Player, authenticatedUser?: any) {
  // MODIFICA: chiama handlePlayerDisconnection invece di rimuovere dalla room
  gameManager.handlePlayerDisconnection(player.id);
  if (authenticatedUser?.nickname) {
    await updateUserOnlineStatus(authenticatedUser.nickname, false);
  }
}

async function updateUserOnlineStatus(nickname: string, online: boolean): Promise<void> {
  try {
    const user = await (User as any).findOne({ where: { nickname } });
    if (user) {
      user.online = online;
      user.last_seen = new Date();
      await user.save();
    }
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
}

async function updateUserCurrentRoom(nickname: string, roomId: string | null): Promise<void> {
  try {
    const user = await (User as any).findOne({ where: { nickname } });
    if (user) {
      user.current_room = roomId;
      await user.save();
    }
  } catch (error) {
    console.error('Error updating user current room:', error);
  }
}

export function notifyUserStatusChange(nickname: string, online: boolean): void {
  const activeRooms = gameManager.getActiveRooms();
  
  activeRooms.forEach(room => {
    room.players.forEach(player => {
      if (player.socket.readyState === 1) {
        sendToPlayer(player, {
          type: 'userStatusChanged',
          nickname: nickname,
          online: online,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
}

function sendToPlayer(player: Player, message: any) {
  if (player.socket.readyState === 1) {
    player.socket.send(JSON.stringify(message));
  }
}

function handlePlayerInputWithValidation(player: Player, data: any) { 
  if (data.input && data.input.type === "countdownFinished") {
    const room = gameManager.roomManager.getRoom(data.roomId);
    if (room) {
      room.gameState.waitingForStart = false;
    }
    return;
  }

  if (!data.input.timestamp) {
    data.input.timestamp = Date.now();
  }

  try {
    gameManager.handlePlayerInput(data.roomId, player.id, data.input);
  } catch (error) {
    console.error('[WebSocket] ❌ Errore in gameManager.handlePlayerInput:', error);
  }
}

function handlePing(player: Player, data: any) {
  sendToPlayer(player, {
    type: 'pong',
    timestamp: data.timestamp,
    serverTime: Date.now()
  });
}

function handleRequestSync(player: Player, data: any) {
  gameManager.syncClientState(data.roomId, player.id);
}
