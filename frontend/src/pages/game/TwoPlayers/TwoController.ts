import { GameState } from "../common/types"; 
import { randomizePowerUp, update } from "./../common/GameUpdate";
import { drawBall, drawRect, drawScore, drawPowerUp, drawField } from "../common/Draw";
import { getBotActive, predictBallY, moveBot } from "../common/BotState";
import { User } from "../../../model/user.model";
import { GameService } from "../../../service/game.service";
import { Game } from "../../../model/game.model";


type LocalOptions = {
  powerUp?: 'on' | 'off';
};
let powerUpsEnabled = true; // default ON

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

function getPlayerNick(index: number, side: "left" | "right", playerName: string) {
  let playerStored = sessionStorage.getItem('nickname') || "";

  if (playerStored && playerStored === playerName) {
    return playerStored;
  }
  return window.sessionStorage.getItem(`${side}Player${index + 1}`) || 
         (side === "left" ? "Giocatore 1" : "Giocatore 2");
}

function createInitialGameState(canvas: HTMLCanvasElement, players: string[]): GameState {
  const paddleHeight = canvas.height / 5;
  const paddleWidth = 10;
  console.log("DEBUGGGGGG: Creating initial game state with players:", players);
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
		speed: 6,
		height: paddleHeight,
		nickname:  getPlayerNick(0, "left", players[0])
	  }
	],
	rightPaddle: [
	  {
		x: canvas.width - paddleWidth - 30,
		y: canvas.height / 2 - paddleHeight / 2,
		dy: 0,
		speed: 6,
		height: paddleHeight,
		nickname:  getPlayerNick(0, "right", players[1])
	  }
	],
	powerUp: {
	  x: Math.random() * (canvas.width - 200) + 100,
	  y: Math.random() * (canvas.height - 200) + 100,
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
	paddleSpeed: 6
  };
}

// === Eventi tastiera ===

const keys: { [key: string]: boolean } = {};
let keyboardSetup = false;

// === Eventi tastiera ===
function setupKeyboard()
{
  if (keyboardSetup) return;

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    // Use the current global game state so listeners remain valid after navigation
    const currentGame = (window as any).game as GameState | null;
    if (currentGame) updatePaddleMovement(currentGame);
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    const currentGame = (window as any).game as GameState | null;
    if (currentGame) updatePaddleMovement(currentGame);
  });
  
  keyboardSetup = true;
}

function updatePaddleMovement(game: GameState | null)
{
  if (!game) return;
  if (keys["w"] && keys["s"]) {
	game.leftPaddle[0].dy = 0;
  } else if (keys["w"]) {
	game.leftPaddle[0].dy = -game.leftPaddle[0].speed;
  } else if (keys["s"]) {
	game.leftPaddle[0].dy = game.leftPaddle[0].speed;
  } else {
	game.leftPaddle[0].dy = 0;
  }

  if (!getBotActive(0)) {
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
}

// === Funzioni di disegno ===
function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, game: GameState, paddleColor1: string, paddleColor2: string) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawField(ctx, canvas);
  drawRect(ctx, game.leftPaddle[0].x, game.leftPaddle[0].y, game.paddleWidth, game.leftPaddle[0].height, paddleColor1);
  drawRect(ctx, game.rightPaddle[0].x, game.rightPaddle[0].y, game.paddleWidth, game.rightPaddle[0].height, paddleColor2);
  drawBall(ctx, game.ball);
  drawScore(ctx, canvas, game.scoreLeft, game.scoreRight);
  if (powerUpsEnabled && game.powerUp?.active) {
    drawPowerUp(ctx, game.powerUp);
  }
}

// === Game loop ===
let botInterval: ReturnType<typeof setInterval> | undefined = undefined;
let predictedY: number | null = null;
let gameCreated = false;


// Sovrascrivi la funzione resetAfterPoint (o chiamala dove aggiorni i punteggi)
const originalResetAfterPoint = (window as any).resetAfterPoint;
(window as any).resetAfterPoint = async function(x: number, game: GameState) {
  if (x < game.canvas.width / 2) {
    // Segna la destra
    game.scoreRight = game.scoreRight + 1;
    // Aggiorna lo stato locale del gameRoom in modo coerente
    gameRoom.scores = [game.scoreLeft, game.scoreRight];
    if (typeof gameRoom.game_id === "number") {
      // Invia scoreRight attuale al backend
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
let lastLogTime = 0;
const LOG_INTERVAL = 3000;

export async function TwoGameLoop(
  paddleColor1: string,
  paddleColor2: string,
  fromPage: string,
  players: string[],
  options?: LocalOptions            // <— NEW parametro opzionale
) {
  // +++ NEW: applica l’opzione alla prima invocazione
  if (options && typeof options.powerUp !== 'undefined') {
    powerUpsEnabled = options.powerUp === 'on';
  }

  const { canvas, ctx } = getCanvasAndCtx();
  // Crea stato di gioco solo la prima volta
  if (!(window as any).game || (window as any).game.canvas !== canvas) {
    (window as any).game = createInitialGameState(canvas, players);
    setupKeyboard();
    predictedY = predictBallY((window as any).game.ball, (window as any).game.rightPaddle[0].x, canvas);
    gameCreated = false;
    gameRoom.game_id = undefined;

    if (!powerUpsEnabled) {
      (window as any).game.powerUp.active = false;
    }
  }
  const game: GameState = (window as any).game;
  const now = Date.now();
  if (now - lastLogTime > LOG_INTERVAL) {
    console.log("DEBUG Auto-log:", {
      scoreLeft: game.scoreLeft,
      scoreRight: game.scoreRight,
      gameId: gameRoom.game_id,
      gameCreated: gameCreated,
      timestamp: new Date().toLocaleTimeString()
    });
    lastLogTime = now;
  }
  
  // Crea partita su backend solo la prima volta
  if (!gameCreated) {
    if (powerUpsEnabled) randomizePowerUp(game);

    try {
    // Usa l'array players passato alla funzione; se mancante costruisci un fallback dagli storage
    const playersToSend = (players && players.length >= 2)
      ? players.slice(0, 2)
      : [user.nickname || (sessionStorage.getItem('nickname') || ''), 'guest'];

    gameService.addGame(playersToSend).then((response) => {

		
		gameRoom = response.game;

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
		const isTournamentMode = sessionStorage.getItem('tournamentMode') === 'true';
   
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "white";
		ctx.font = "40px Arial";
		const winner = game.scoreLeft > game.scoreRight ? players[0] : players[1];
		ctx.fillText(`${winner} ha vinto!`, canvas.width / 2, canvas.height / 2);

		if (gameRoom.game_id) {
			await gameService.updateGame(gameRoom.game_id, "1_scores", game.scoreLeft.toString())
			.then(() => console.log("DEBUG: Successfully updated left score to:", game.scoreLeft))
			.catch((error) => console.error("DEBUG: Failed to update left score:", error));
			await gameService.updateGame(gameRoom.game_id, "2_scores", game.scoreRight.toString())
			.then(() => console.log("DEBUG: Successfully updated right score to:", game.scoreRight))
			.catch((error) => console.error("DEBUG: Failed to update right score:", error));

		const players = [
		game.leftPaddle[0].nickname,
		game.rightPaddle[0].nickname   
		];
    const promises: Promise<unknown>[] = [];
    console.log("DEBUGGGGGGGGGGGGGGGGGGGGGGGGGG: Updating stats for players:", players);
		players.forEach((nickname, idx) => {
      let result = 0;
      
      if (game.scoreLeft === game.scoreRight) {
        result = 1; // pareggio per entrambi
      } else if (
        (game.scoreLeft > game.scoreRight && idx === 0) ||  // sinistro vince E sono il giocatore sinistro
        (game.scoreRight > game.scoreLeft && idx === 1)     // destro vince E sono il giocatore destro
      ) {
        result = 2; 
      } else {
        result = 0; 
      }

    
    const loggedNick = sessionStorage.getItem('nickname');
    if (loggedNick && nickname === loggedNick) {
      console.log(`DEBUG: Updating stats for logged-in player ${nickname} with result:`,  gameRoom.game_id ,result);
      promises.push(
      gameService.upDateStat(nickname, gameRoom.game_id!, result)
        .then(() => console.log(`DEBUG: Successfully updated stats for ${nickname} with result:`, result))
        .catch((error) => console.error(`DEBUG: Failed to update stats for ${nickname}:`, error)));
    }
    });
		// Determina il vincitore e aggiorna una volta sola
		let winnerNickname = "";
		if (game.scoreLeft > game.scoreRight) {
      winnerNickname = game.leftPaddle[0].nickname;
		} else if (game.scoreRight > game.scoreLeft) {
      winnerNickname = game.rightPaddle[0].nickname;
		} else {
      winnerNickname = "Draw";
		}
    
    promises.push(
      gameService.updateGame(gameRoom.game_id, "winner_nickname", winnerNickname)
      .then(() => console.log("DEBUG: Successfully updated winner nickname to:", winnerNickname))
      .catch((error) => console.error("DEBUG: Failed to update winner nickname:", error))
    );
		
		setTimeout(() => {
            if (isTournamentMode) {
                console.log("DEBUG: Tournament mode - handling tournament game end");
                
                // RESET COMPLETO DELLO STATO DEL GIOCO
                (window as any).game = null; // Reset del game object
                gameCreated = false;
                gameRoom.game_id = undefined;
                
                // Reset degli event listeners della tastiera
                keyboardSetup = false;
                
                // Ferma tutti gli interval
                if (botInterval) {
                    clearInterval(botInterval);
                    botInterval = undefined;
                }
                
                handleTournamentGameEnd(winner);
            } else {
                console.log("DEBUG: Normal game - navigating back to:", fromPage);
                
                // Reset per partite normali
                (window as any).game = null;
                gameCreated = false;
                gameRoom.game_id = undefined;
                keyboardSetup = false;
                
                if (botInterval) {
                    clearInterval(botInterval);
                    botInterval = undefined;
                }
                
                window.location.hash = fromPage;
            }
        }, 3000);
      await Promise.all(promises);
    } else {
        // Se non c'è gameRoom.game_id, gestisci comunque il reset
        setTimeout(() => {
            if (isTournamentMode) {
                console.log("DEBUG: Tournament mode (no backend) - handling tournament game end");
                
                // RESET COMPLETO
                (window as any).game = null;
                gameCreated = false;
                gameRoom.game_id = undefined;
                keyboardSetup = false;
                
                if (botInterval) {
                    clearInterval(botInterval);
                    botInterval = undefined;
                }
                
                handleTournamentGameEnd(winner);
            } else {
                console.log("DEBUG: Normal game (no backend) - navigating back to:", fromPage);
                
                // Reset per partite normali
                (window as any).game = null;
                gameCreated = false;
                gameRoom.game_id = undefined;
                keyboardSetup = false;
                
                if (botInterval) {
                    clearInterval(botInterval);
                    botInterval = undefined;
                }
                
                window.location.hash = fromPage;
            }
        }, 3000);
    }
    return;
}

function handleTournamentGameEnd(winner: string) {
    try {
        const tournament = JSON.parse(sessionStorage.getItem('activeTournament') || '{}');
        const currentIndex = parseInt(sessionStorage.getItem('currentGameIndex') || '0');
        const currentRoundNumber = parseInt(sessionStorage.getItem('currentRound') || '0');
        
        console.log(`Tournament game end: Winner=${winner}, Round=${currentRoundNumber}, Game=${currentIndex}`);
        
        // Salva il risultato nel round corrente usando la nuova struttura
        if (!tournament.rounds || !tournament.rounds[currentRoundNumber]) {
            console.error('Tournament round structure is invalid');
            window.location.hash = '#/tournament';
            return;
        }
        
        if (!tournament.rounds[currentRoundNumber].results) {
            tournament.rounds[currentRoundNumber].results = [];
        }
        
        const result = {
            game: tournament.rounds[currentRoundNumber].games[currentIndex],
            winner: winner,
            round: currentRoundNumber
        };
        
        tournament.rounds[currentRoundNumber].results.push(result);
        
        // Aggiorna l'indice per la prossima partita del round corrente
        tournament.currentGameIndex = currentIndex + 1;
        
        // Salva lo stato aggiornato del torneo
        sessionStorage.setItem('activeTournament', JSON.stringify(tournament));
        
        console.log(`Tournament: Round ${currentRoundNumber} Game ${currentIndex + 1} completed. Winner: ${winner}`);
        console.log(`Tournament: Round has ${tournament.rounds[currentRoundNumber].results.length}/${tournament.rounds[currentRoundNumber].games.length} games completed`);
        
        // Torna alla pagina del torneo che gestirà la prossima partita o i risultati finali
        window.location.hash = '#/tournament?continue=true';
        
    } catch (error) {
        console.error('Error handling tournament game end:', error);
        // Fallback: torna al torneo senza continue
        window.location.hash = '#/tournament';
    }
}

  // Bot logic
  function moveBotPaddle() {
	if (!getBotActive(0)) return;
	const bot = game.rightPaddle[0];
	const randomOffset = (Math.random() - 0.5) * 200;
	predictedY = predictBallY(game.ball, bot.x, canvas) + randomOffset;
  }

  if (getBotActive(0) && predictedY !== null) {
	moveBot(game.rightPaddle[0], predictedY);
  }

  if (!botInterval && getBotActive(0)) {
	botInterval = setInterval(moveBotPaddle, 1000);
  }

  // +++ NEW: forza OFF ogni frame se disabilitati (impedisce effetti/spawn)
  if (!powerUpsEnabled) {
    game.powerUp.active = false;
  }

  update(game);
  render(ctx, canvas, game, paddleColor1, paddleColor2);
  // richiama senza options (flag già memorizzata)
  requestAnimationFrame(() => TwoGameLoop(paddleColor1, paddleColor2, fromPage, players));
}