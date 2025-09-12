import { GameState } from './types';
import { GAME_CONSTANTS } from './types';
import { updateGameScores } from './gamePersistence';

export class GamePhysics {
  static updateGameStateWithDelta(gameState: GameState, deltaTime: number): void {
    if (gameState.waitingForStart) {
      // NEW: Controlla se il countdown è finito indipendentemente dal client
      if ((gameState as any).countdownEndTime && Date.now() >= (gameState as any).countdownEndTime) {
        gameState.waitingForStart = false;
        // Imposta direzione iniziale se non già impostata
        if (gameState.ball.dx === 0) {
          gameState.ball.dx = 5;
          gameState.ball.dy = 5;
        }
        console.log('[Physics] Countdown finito automaticamente, palla avviata');
      }
      return;
    }
    
    this.handleBallMovement(gameState);
    this.handlePowerUpCollision(gameState);
    this.handleWallCollision(gameState);
    this.handleTriangleCollision(gameState);
    this.handlePaddleCollision(gameState);
    this.updatePaddleMovement(gameState);
    this.checkScore(gameState);
  }

  static handleBallMovement(gameState: GameState): void {
    gameState.ball.x += gameState.ball.dx * gameState.ball.speed;
    gameState.ball.y += gameState.ball.dy * gameState.ball.speed;
  }

  static handlePowerUpCollision(gameState: GameState): void {
    // Power-up disattivati: non applicare effetti né respawn
    if (gameState.powerUpsEnabled === false) {
      if (gameState.powerUp) gameState.powerUp.active = false;
      return;
    }
    if (
      gameState.powerUp.active &&
      gameState.ball.x + gameState.ball.radius > gameState.powerUp.x &&
      gameState.ball.x - gameState.ball.radius < gameState.powerUp.x + gameState.powerUp.width &&
      gameState.ball.y + gameState.ball.radius > gameState.powerUp.y &&
      gameState.ball.y - gameState.ball.radius < gameState.powerUp.y + gameState.powerUp.height
    ) {
      const isLeft = gameState.ball.dx < 0;
      const affectedTeam = isLeft ? gameState.rightPaddle : gameState.leftPaddle;
      const oppositeTeam = isLeft ? gameState.leftPaddle : gameState.rightPaddle;

      affectedTeam.forEach(p => {
        if (gameState.powerUp.type === "SizeIncrease") {
          p.height += p.height / 2;
        } else if (gameState.powerUp.type === "SpeedBoost") {
          p.speed *= 1.5;
        }
      });

      if (gameState.powerUp.type === "SizeDecrease") {
        oppositeTeam.forEach(p => {
          p.height -= p.height / 3;
        });
      }

      gameState.powerUp.active = false;

      setTimeout(() => {
        gameState.leftPaddle.forEach(p => p.height = gameState.paddleHeight);
        gameState.rightPaddle.forEach(p => p.height = gameState.paddleHeight);
        gameState.leftPaddle.forEach(p => p.speed = gameState.paddleSpeed);
        gameState.rightPaddle.forEach(p => p.speed = gameState.paddleSpeed);
        
        setTimeout(() => {
          if (gameState.powerUpsEnabled !== false) {
            this.randomizePowerUp(gameState);
            gameState.powerUp.active = true;
          }
        }, 5000);
      }, 10000);
    }
  }

  static handleWallCollision(gameState: GameState): void {
    const ball = gameState.ball;
    const triangleSize = GAME_CONSTANTS.TRIANGLE_SIZE;

    const isInTriangleZone =
      ball.x - ball.radius < triangleSize || 
      ball.x + ball.radius > GAME_CONSTANTS.CANVAS_WIDTH - triangleSize;

    if (isInTriangleZone) return;

    if (
      ball.y - ball.radius < 0 ||
      ball.y + ball.radius > GAME_CONSTANTS.CANVAS_HEIGHT
    ) {
      ball.dy *= -1;

      if (ball.y < GAME_CONSTANTS.CANVAS_HEIGHT / 2)
        ball.y = ball.radius + 1;
      else
        ball.y = GAME_CONSTANTS.CANVAS_HEIGHT - ball.radius - 1;
    }
  }

  static handleTriangleCollision(gameState: GameState): void {
    const ball = gameState.ball;
    const w = GAME_CONSTANTS.CANVAS_WIDTH;
    const h = GAME_CONSTANTS.CANVAS_HEIGHT;
    const s = GAME_CONSTANTS.TRIANGLE_SIZE;

    if (this.ballIntersectsTriangle(ball, 0, 0, s, 0, 0, s)) 
      this.bounceFromTriangle(ball, s / 2, s / 2, w, s);

    if (this.ballIntersectsTriangle(ball, w, 0, w - s, 0, w, s))
      this.bounceFromTriangle(ball, w - s / 2, s / 2, w, s);

    if (this.ballIntersectsTriangle(ball, 0, h, s, h, 0, h - s))
      this.bounceFromTriangle(ball, s / 2, h - s / 2, w, s);

    if (this.ballIntersectsTriangle(ball, w, h, w - s, h, w, h - s))
      this.bounceFromTriangle(ball, w - s / 2, h - s / 2, w, s);
  }

  static isPointInTriangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
    const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
    const s = 1 / (2 * area) * (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py);
    const t = 1 / (2 * area) * (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py);
    const u = 1 - s - t;
    return (s >= 0 && t >= 0 && u >= 0);
  }

  static ballIntersectsTriangle(ball: any, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
    const { x, y, radius } = ball;
    const points = [
      [x, y],           // centro
      [x - radius, y],  // sinistra
      [x + radius, y],  // destra
      [x, y - radius],  // sopra
      [x, y + radius],  // sotto
    ];
    return points.some(([px, py]) => this.isPointInTriangle(px, py, ax, ay, bx, by, cx, cy));
  }

  static bounceFromTriangle(ball: any, centerX: number, centerY: number, canvasWidth: number, triangleSize: number): void {
    const maxBounceAngle = Math.PI / 3;
    const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);
    const relativeY = centerY - ball.y;
    const normalized = relativeY / (triangleSize / 2);
    const bounceAngle = normalized * maxBounceAngle;
    const dirX = ball.x < canvasWidth / 2 ? 1 : -1;

    ball.dx = dirX * speed * Math.cos(bounceAngle);
    ball.dy = -speed * Math.sin(bounceAngle);
  }

  static handlePaddleCollision(gameState: GameState): void {
    // Collisione con paddle sinistri
    for (let i = 0; i < gameState.leftPaddle.length; i++) {
      const paddle = gameState.leftPaddle[i];
      
      if (gameState.ball.dx > 0 && i === 1) continue;
      if (i === 1 && gameState.ball.x < paddle.x) continue;

      if (
        gameState.ball.x - gameState.ball.radius < paddle.x + gameState.paddleWidth &&
        gameState.ball.y > paddle.y &&
        gameState.ball.y < paddle.y + paddle.height
      ) {
        const relativeY = (paddle.y + paddle.height / 2) - gameState.ball.y;
        const normalized = relativeY / (paddle.height / 2);
        const maxBounceAngle = Math.PI / 3;
        const bounceAngle = normalized * maxBounceAngle;
        const speed = Math.sqrt(gameState.ball.dx ** 2 + gameState.ball.dy ** 2);
        
        gameState.ball.dx = Math.abs(speed * Math.cos(bounceAngle));
        gameState.ball.dy = -speed * Math.sin(bounceAngle);
        return;
      }
    }

    // Collisione con paddle destri
    for (let i = 0; i < gameState.rightPaddle.length; i++) {
      const paddle = gameState.rightPaddle[i];

      if (gameState.ball.dx < 0 && i === 1) continue;
      if (i === 1 && gameState.ball.x < paddle.x) continue;

      if (
        gameState.ball.x + gameState.ball.radius > paddle.x &&
        gameState.ball.y > paddle.y &&
        gameState.ball.y < paddle.y + paddle.height
      ) {
        const relativeY = (paddle.y + paddle.height / 2) - gameState.ball.y;
        const normalized = relativeY / (paddle.height / 2);
        const maxBounceAngle = Math.PI / 3;
        const bounceAngle = normalized * maxBounceAngle;
        const speed = Math.sqrt(gameState.ball.dx ** 2 + gameState.ball.dy ** 2);

        gameState.ball.dx = -Math.abs(speed * Math.cos(bounceAngle));
        gameState.ball.dy = -speed * Math.sin(bounceAngle);
        return;
      }
    }
  }

  static updatePaddleMovement(gameState: GameState): void {
    const size = GAME_CONSTANTS.TRIANGLE_SIZE / 2;
    
    gameState.leftPaddle.forEach(paddle => {
      paddle.y += paddle.dy;
      if (paddle.y < size)
        paddle.y = size;
      if (paddle.y + paddle.height > GAME_CONSTANTS.CANVAS_HEIGHT - size)
        paddle.y = GAME_CONSTANTS.CANVAS_HEIGHT - size - paddle.height;
    });
    
    gameState.rightPaddle.forEach(paddle => {
      paddle.y += paddle.dy;
      if (paddle.y < size)
        paddle.y = size;
      if (paddle.y + paddle.height > GAME_CONSTANTS.CANVAS_HEIGHT - size)
        paddle.y = GAME_CONSTANTS.CANVAS_HEIGHT - size - paddle.height;
    });
  }

  static checkScore(gameState: GameState): void {
    if (gameState.ball.x - gameState.ball.radius < 0) {
      gameState.scoreRight++;
      // Persist score to DB if gameId available
      // @ts-ignore
      if ((gameState as any).gameId) {
        // @ts-ignore
        updateGameScores((gameState as any).gameId, [gameState.scoreLeft, gameState.scoreRight]).catch(err => console.error('[Physics] updateGameScores error:', err));
      }
      this.resetAfterPoint(0, gameState);
    }
    
    if (gameState.ball.x + gameState.ball.radius > GAME_CONSTANTS.CANVAS_WIDTH) {
      gameState.scoreLeft++;
      // Persist score to DB if gameId available
      // @ts-ignore
      if ((gameState as any).gameId) {
        // @ts-ignore
        updateGameScores((gameState as any).gameId, [gameState.scoreLeft, gameState.scoreRight]).catch(err => console.error('[Physics] updateGameScores error:', err));
      }
      this.resetAfterPoint(1, gameState);
    }
  }

  static resetAfterPoint(x: number, gameState: GameState): void {
    gameState.waitingForStart = true;
    gameState.ball.dx = 0;
    gameState.ball.dy = 0;
    gameState.ball.x = GAME_CONSTANTS.CANVAS_WIDTH / 2;
    gameState.ball.y = GAME_CONSTANTS.CANVAS_HEIGHT / 2;

    gameState.leftPaddle.forEach(p => {
        p.y = GAME_CONSTANTS.CANVAS_HEIGHT / 2 - p.height / 2;
        p.dy = 0;
    });

    gameState.rightPaddle.forEach(p => {
        p.y = GAME_CONSTANTS.CANVAS_HEIGHT / 2 - p.height / 2;
        p.dy = 0;
    });

    // NEW: Aggiungi timestamp per countdown indipendente dal client
    (gameState as any).countdownEndTime = Date.now() + 1000;
    console.log('[Physics] Countdown end time set:', (gameState as any).countdownEndTime);

    setTimeout(() => {
        gameState.ball.dx = x === 0 ? 5 : -5;
        gameState.ball.dy = 5;
        gameState.waitingForStart = false;
        console.log('[Physics] Countdown finito, palla avviata');
    }, 1000);
}

static randomizePowerUp(gameState: GameState): void {
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
