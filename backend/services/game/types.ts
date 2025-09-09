import { WebSocket } from 'ws';

export interface Player {
  id: string;
  nickname: string;
  socket: any; // WebSocket o connection object di Fastify
  ready: boolean;
  online : boolean;
  lastHeartbeat: number;
  currentRoomId?: string;
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: GameState;
  isActive: boolean;
  maxPlayers: number;
  type: 'two' | 'four';
  gameId?: number;
  powerUpsEnabled?: boolean;
}

export interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
    speed: number;
  };
  leftPaddle: Array<{
    x: number;
    y: number;
    dy: number;
    speed: number;
    height: number;
    nickname: string;
  }>;
  rightPaddle: Array<{
    x: number;
    y: number;
    dy: number;
    speed: number;
    height: number;
    nickname: string;
  }>;
  powerUp: {
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
    type: string;
    color: string;
  };
  powerUpsEnabled?: boolean;
  scoreLeft: number;
  scoreRight: number;
  paddleHeight: number;
  paddleWidth: number;
  waitingForStart: boolean;
  maxScore: number;
  paddleSpeed: number;
  countdownEndTime?: number;  // NEW: Timestamp per countdown indipendente
}

export interface GameConstants {
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
  PADDLE_WIDTH: number;
  BALL_RADIUS: number;
  PADDLE_SPEED: number;
  BALL_SPEED: number;
  TARGET_FPS: number;
  MAX_BALL_SPEED: number;
  SPEED_INCREASE_FACTOR: number;
  INPUT_RATE_LIMIT: number;
  HEARTBEAT_INTERVAL: number;
  HEARTBEAT_TIMEOUT: number;
  TRIANGLE_SIZE: number;
}

export const GAME_CONSTANTS: GameConstants = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 750,
  PADDLE_WIDTH: 10,
  BALL_RADIUS: 10,
  PADDLE_SPEED: 6,
  BALL_SPEED: 1.5,
  TARGET_FPS: 60,
  MAX_BALL_SPEED: 12,
  SPEED_INCREASE_FACTOR: 1.02,
  INPUT_RATE_LIMIT: 16,
  HEARTBEAT_INTERVAL: 5000,
  HEARTBEAT_TIMEOUT: 15000,
  TRIANGLE_SIZE: 60
};
