import { GameState } from "./../common/types"; 
import { update, randomizePowerUp } from "./../common/GameUpdate";
import { drawBall, drawRect, drawScore, drawPowerUp, drawField } from "../common/Draw";
import { getBotActive, predictBallY, moveBot } from "../common/BotState";
// import { updateGameField, createGame } from "../services/gameService";
// import { addGameToStats } from "../services/statsService";
import { GameService } from "../../../service/game.service";
import { Game } from "../../../model/game.model";
import { User } from "../../../model/user.model";


// Helper per ottenere canvas e ctx in modo sicuro
function getCanvasAndCtx() {
  const canvas = document.getElementById("pong") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Canvas not found!");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  return { canvas, ctx };
}
// Parse user safely from sessionStorage, fallback to separate 'nickname'
const user: User = (() => {
	try {
		const raw = sessionStorage.getItem('user');
		const parsed = raw ? JSON.parse(raw) : {};
		if (!parsed.nickname) {
			const nick = sessionStorage.getItem('nickname');
			if (nick) parsed.nickname = nick;
		}
		return parsed as User;
	} catch {
		const u = new User();
		const nick = sessionStorage.getItem('nickname');
		if (nick) u.nickname = nick;
		return u;
	}
})();
let gameRoom : Game = new Game();
const gameService: GameService = new GameService();

function getPlayerNick(index: number, side: "left" | "right") {
  return window.sessionStorage.getItem(`${side}Player${index + 1}`) || `${side === "left" ? "L" : "R"}${index + 1}`;
}

function createInitialGameState(canvas: HTMLCanvasElement): GameState {
  const paddleHeight = canvas.height / 6;
  const paddleWidth = 10;

  return {
	ball: {
	  x: canvas.width / 2,
	  y: canvas.height / 2,
	  dx: 5,
	  dy: 5,
	  radius: 10,
	  speed: 1.5
	},
	leftPaddle: [
	  {
		x: 30,
		y: canvas.height / 2 - paddleHeight / 2,
		dy: 0,
		speed: 4,
		height: paddleHeight,
		nickname: sessionStorage.getItem("nickname") || getPlayerNick(0, "left")
	  },
	  {
		x: canvas.width / 7,
		y: canvas.height / 2 - paddleHeight / 2,
		dy: 0,
		speed: 4,
		height: paddleHeight,
		nickname: getPlayerNick(1, "left")
	  }
	],
	rightPaddle: [
	  {
		x: canvas.width - paddleWidth - 30,
		y: canvas.height / 2 - paddleHeight / 2,
		dy: 0,
		speed: 4,
		height: paddleHeight,
		nickname: getPlayerNick(0, "right")
	  },
	  {
		x: canvas.width - canvas.width / 7 - paddleWidth,
		y: canvas.height / 2 - paddleHeight / 2,
		dy: 0,
		speed: 4,
		height: paddleHeight,
		nickname: getPlayerNick(1, "right")
	  }
	],
	powerUp: {
	  x: Math.random() * (canvas.width - 200) + 10,
	  y: Math.random() * (canvas.height - 200) + 10,
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
	canvas: canvas,
	waitingForStart: false,
	maxScore: 5,
	paddleSpeed: 4
  };
}

// === Sistema di tracking dei tasti ===

const keys: { [key: string]: boolean } = {};
let keyboardSetup = false; // Flag per evitare duplicazioni degli event listener

// === Eventi tastiera ===
function setupKeyboard()
{
	if (keyboardSetup) return;

	document.addEventListener("keydown", (e) => {
		keys[e.key] = true;
		const currentGame = (window as any).game4 as GameState | null;
		if (currentGame) updatePaddleMovement(currentGame);
	});

	document.addEventListener("keyup", (e) => {
		keys[e.key] = false;
		const currentGame = (window as any).game4 as GameState | null;
		if (currentGame) updatePaddleMovement(currentGame);
	});

	keyboardSetup = true;
}

function updatePaddleMovement(game: GameState | null) {
	if (!game) return;
  // Player 1 (leftPaddle[0]) - W/S keys
  if (keys["w"] && keys["s"]) {
	game.leftPaddle[0].dy = 0;
  } else if (keys["w"]) {
	game.leftPaddle[0].dy = -game.leftPaddle[0].speed;
  } else if (keys["s"]) {
	game.leftPaddle[0].dy = game.leftPaddle[0].speed;
  } else {
	game.leftPaddle[0].dy = 0;
  }

  // Player 2 (leftPaddle[1]) - A/Z keys
  if (!getBotActive(1)) {
	if (keys["a"] && keys["z"]) {
	  game.leftPaddle[1].dy = 0;
	} else if (keys["a"]) {
	  game.leftPaddle[1].dy = -game.leftPaddle[1].speed;
	} else if (keys["z"]) {
	  game.leftPaddle[1].dy = game.leftPaddle[1].speed;
	} else {
	  game.leftPaddle[1].dy = 0;
	}
  }

  // Player 3 (rightPaddle[0]) - Arrow keys
  if (!getBotActive(2)) {
	if (keys["ArrowUp"] && keys["ArrowDown"]) {
	  game.rightPaddle[0].dy = 0;
	} else if (keys["ArrowUp"]) {
	  game.rightPaddle[0].dy = -game.rightPaddle[0].speed;
	} else if (keys["ArrowDown"]) {
	  game.rightPaddle[0].dy = game.rightPaddle[0].speed;
	} else {
	  game.rightPaddle[0].dy = 0;
	}
  }

  // Player 4 (rightPaddle[1]) - I/K keys
  if (!getBotActive(3)) {
	if (keys["i"] && keys["k"]) {
	  game.rightPaddle[1].dy = 0;
	} else if (keys["i"]) {
	  game.rightPaddle[1].dy = -game.rightPaddle[1].speed;
	} else if (keys["k"]) {
	  game.rightPaddle[1].dy = game.rightPaddle[1].speed;
	} else {
	  game.rightPaddle[1].dy = 0;
	}
  }
}

// === Funzioni di disegno ===
function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, game: GameState, TeamLeft: string, TeamRight: string) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawField(ctx, canvas);
  game.leftPaddle.forEach(p => {
    drawRect(ctx, p.x, p.y, game.paddleWidth, p.height, TeamLeft);
  });
  game.rightPaddle.forEach(p => {
    drawRect(ctx, p.x, p.y, game.paddleWidth, p.height, TeamRight);
  });
  drawBall(ctx, game.ball);
  drawScore(ctx, canvas, game.scoreLeft, game.scoreRight);
  // +++ NEW: disegna solo se abilitati e attivi
  if (powerUpsEnabled4P && game.powerUp?.active) {
    drawPowerUp(ctx, game.powerUp);
  }
}

// === Game loop ===
let botInterval: number | undefined = undefined;
let predictedY: (number | null)[] = [null, null, null, null];
let currentGameId: number | null = null;
let gameCreated = false;

// Funzione da chiamare ogni volta che una squadra segna
// async function updateScoreOnBackend(game: GameState) {
//   if (!currentGameId) return;
//   await updateGameField(currentGameId, "1_scores", game.scoreLeft.toString());
//   await updateGameField(currentGameId, "2_scores", game.scoreRight.toString());
// }

// Sovrascrivi la funzione resetAfterPoint (o chiamala dove aggiorni i punteggi)
const originalResetAfterPoint = (window as any).resetAfterPoint;
(window as any).resetAfterPoint = async function(x: number, game: GameState) {
	if (x < game.canvas.width / 2) {
		// Segna la destra
		game.scoreRight = game.scoreRight + 1;
		gameRoom.scores = [game.scoreLeft, game.scoreRight];
		if (typeof gameRoom.game_id === "number") {
			this.gameService.updateGame(gameRoom.game_id, "2_scores", game.scoreRight.toString())
				.catch((e: any) => console.error('Failed updating right score during reset:', e));
		}
	} else {
		// Segna la sinistra
		game.scoreLeft = game.scoreLeft + 1;
		gameRoom.scores = [game.scoreLeft, game.scoreRight];
		if (typeof gameRoom.game_id === "number") {
			this.gameService.updateGame(gameRoom.game_id, "1_scores", game.scoreLeft.toString())
				.catch((e: any) => console.error('Failed updating left score during reset:', e));
		}
	}
  if (originalResetAfterPoint) originalResetAfterPoint(x, game);
};

type LocalOptions = {
  powerUp?: 'on' | 'off';
};
let powerUpsEnabled4P = true;

export async function FourGameLoop(
  TeamLeft: string,
  TeamRight: string,
  fromPage: string,
  players?: string[],
  options?: LocalOptions
) {
  if (options && typeof options.powerUp !== 'undefined') {
    powerUpsEnabled4P = options.powerUp === 'on';
  }

  const { canvas, ctx } = getCanvasAndCtx();

  // Crea stato di gioco solo la prima volta
  if (!(window as any).game4 || (window as any).game4.canvas !== canvas) {
    (window as any).game4 = createInitialGameState(canvas);
    setupKeyboard();
    predictedY = [
      null,
      predictBallY((window as any).game4.ball, (window as any).game4.leftPaddle[1].x, canvas),
      predictBallY((window as any).game4.ball, (window as any).game4.rightPaddle[0].x, canvas),
      predictBallY((window as any).game4.ball, (window as any).game4.rightPaddle[1].x, canvas),
    ];
    gameCreated = false;
    gameRoom.game_id = undefined;

    // +++ NEW: se disabilitati, spegni subito
    if (!powerUpsEnabled4P) {
      (window as any).game4.powerUp.active = false;
    }
  }
  const game: GameState = (window as any).game4;

  // Crea partita su backend solo la prima volta
  if (!gameCreated) {
    // +++ NEW: randomize solo se abilitati
    if (powerUpsEnabled4P) randomizePowerUp(game);

		try {
		// Determina i nickname reali da inviare: preferisci l'array players passato, altrimenti usa fallback
		const playersToSend = (players && players.length >= 4)
			? players.slice(0, 4)
			: [
					user.nickname || (sessionStorage.getItem('nickname') || ''),
					'guest',
					'guest2',
					'guest3'
				];

		gameService.addGame(playersToSend).then((response) => {
		console.log("Game created on backend:", response);
		console.log("response.game:", response.game);
		console.log("response.game.game_id:", response.game.game_id);
		
		gameRoom = response.game;
		console.log("gameRoom after assignment:", gameRoom);
		console.log("gameRoom.game_id after assignment:", gameRoom.game_id);
	
		}).catch((error) => {
		console.error("DEBUG: Failed to create game:", error);
		gameRoom.game_id = undefined;
		});
	} catch (error) {
	  console.error("Failed to create game on backend:", error);
	  // Continua il gioco anche se il backend non risponde
	  gameRoom.game_id = undefined;
	}
	gameCreated = true;
  }

  // Fine partita
   if (game.scoreLeft >= game.maxScore || game.scoreRight >= game.maxScore) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    const winner = game.scoreLeft > game.scoreRight ? "Team 1" : "Team 2";
    ctx.fillText(`${winner} ha vinto!`, canvas.width / 2, canvas.height / 2);

    if (gameRoom.game_id) {
      gameService.updateGame(gameRoom.game_id, "1_scores", game.scoreLeft.toString())
        .then(() => console.log("DEBUG: Successfully updated left score to:", game.scoreLeft))
        .catch((error) => console.error("DEBUG: Failed to update left score:", error));
      gameService.updateGame(gameRoom.game_id, "2_scores", game.scoreRight.toString())
        .then(() => console.log("DEBUG: Successfully updated right score to:", game.scoreRight))
        .catch((error) => console.error("DEBUG: Failed to update right score:", error));
      
      const players = [
        game.leftPaddle[0].nickname,
        game.leftPaddle[1].nickname,   
        game.rightPaddle[0].nickname,
        game.rightPaddle[1].nickname 
      ];
      
			players.forEach((nickname, idx) => {
				let result = 0;

				if (game.scoreLeft === game.scoreRight) {
					result = 1; // pareggio per tutti
				} else if (
					// Team 1 vince (idx 0 e 1 sono Team 1)
					(game.scoreLeft > game.scoreRight && (idx === 0 || idx === 1)) ||
					// Team 2 vince (idx 2 e 3 sono Team 2)  
					(game.scoreRight > game.scoreLeft && (idx === 2 || idx === 3))
				) {
					result = 2;
				} else {
					result = 0; 
				}

				const loggedNick = sessionStorage.getItem('nickname');
				console.log('DEBUD!!!!!! NICKNAME LOGGATO:', loggedNick, ' - NICKNAME GIOCATORE:', nickname, ' - RISULTATO CALCOLATO:', result);
				if (loggedNick && nickname === loggedNick) {
					gameService.upDateStat(nickname, gameRoom.game_id!, result)
						.then(() => console.log(`DEBUG: Successfully updated stats for ${nickname} with result:`, result))
						.catch((error) => console.error(`DEBUG: Failed to update stats for ${nickname}:`, error));
				}
			});

      // Determina il vincitore per il database
      let winnerNickname = "";
      if (game.scoreLeft > game.scoreRight) {
        winnerNickname = `${TeamLeft} (Team 1)`;
      } else if (game.scoreRight > game.scoreLeft) {
        winnerNickname = `${TeamRight} (Team 2)`;
      } else {
        winnerNickname = "Draw";
      }

      gameService.updateGame(gameRoom.game_id, "winner_nickname", winnerNickname)
        .then(() => console.log("DEBUG: Successfully updated winner nickname to:", winnerNickname))
        .catch((error) => console.error("DEBUG: Failed to update winner nickname:", error));

      setTimeout(() => {
        console.log("DEBUG: Four player game ended - resetting state and navigating back to:", fromPage);
        
        // RESET COMPLETO DELLO STATO DEL GIOCO
        (window as any).game4 = null; // Reset del game object
        gameCreated = false;
        gameRoom.game_id = undefined;
        
        // Reset degli event listeners della tastiera
        keyboardSetup = false;
        
        // Ferma tutti gli interval
        if (botInterval) {
          clearInterval(botInterval);
          botInterval = undefined;
        }
        
        // Pulisci completamente il canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        window.location.hash = fromPage;
      }, 3000);
    } else {
      // Se non c'è gameRoom.game_id, gestisci comunque il reset
      setTimeout(() => {
        console.log("DEBUG: Four player game ended (no backend) - resetting state and navigating back to:", fromPage);
        
        // RESET COMPLETO
        (window as any).game4 = null;
        gameCreated = false;
        gameRoom.game_id = undefined;
        keyboardSetup = false;
        
        // Ferma tutti gli interval
        if (botInterval) {
          clearInterval(botInterval);
          botInterval = undefined;
        }
        
        // Pulisci completamente il canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        window.location.hash = fromPage;
      }, 3000);
    }
    return;
  }

  // Bot logic
  function moveBotPaddle() {
	if (getBotActive(1)) {
	  const randomOffset = (Math.random() - 0.5) * 200;
	  predictedY[1] = predictBallY(game.ball, game.leftPaddle[1].x, canvas) + randomOffset;
	}
	if (getBotActive(2)) {
	  const randomOffset = (Math.random() - 0.5) * 200;
	  predictedY[2] = predictBallY(game.ball, game.rightPaddle[0].x, canvas) + randomOffset;
	}
	if (getBotActive(3)) {
	  const randomOffset = (Math.random() - 0.5) * 200;
	  predictedY[3] = predictBallY(game.ball, game.rightPaddle[1].x, canvas) + randomOffset;
	}
  }

  if (getBotActive(1) && predictedY[1] !== null) {
	moveBot(game.leftPaddle[1], predictedY[1]!);
  }
  if (getBotActive(2) && predictedY[2] !== null) {
	moveBot(game.rightPaddle[0], predictedY[2]!);
  }
  if (getBotActive(3) && predictedY[3] !== null) {
	moveBot(game.rightPaddle[1], predictedY[3]!);
  }

  if (!botInterval && (getBotActive(1) || getBotActive(2) || getBotActive(3))) {
	botInterval = setInterval(moveBotPaddle, 1000);
  }

  // +++ NEW: forza OFF ogni frame se disabilitati (impedisce effetti/spawn)
  if (!powerUpsEnabled4P) {
    game.powerUp.active = false;
  }

  update(game);
  render(ctx, canvas, game, TeamLeft, TeamRight);
  // flag già memorizzata, non serve ripassare options
  requestAnimationFrame(() => FourGameLoop(TeamLeft, TeamRight, fromPage));
}