import onlineGameHtml from './onlineGame.html?raw';
import { UserService } from '../../service/user.service';
import { User } from '../../model/user.model';
import { TranslationService } from '../../service/translation.service';
import { RemoteController } from "./RemoteController";
import { FourRemoteController } from "./FourRemoteController";
import multiplayerService from '../../services/multiplayerService';
import '../game/game.css';

// Variabili per il timer
let searchTimer: number | null = null;
let searchStartTime: number = 0;

export class OnlineGamePage {
	user : User = new UserService().getUser() || new User();
	constructor(_currentLang: string) {
		console.log("[OnlineGame] 🚀 OnlineGamePage constructor chiamato!");
		this.init();
	}
	private init() {
		this.render();
		
		// Inizializza il gioco DOPO aver renderizzato l'HTML
		setTimeout(() => {
			this.initializeOnlineGame();
			
			// Imposta il nickname DOPO il render
			const nicknameElement = document.getElementById('nickname');
			const storedNickname = sessionStorage.getItem('nickname');
			
			if (nicknameElement && storedNickname) {
				nicknameElement.textContent = `Nickname: ${storedNickname}`;
				nicknameElement.style.display = 'block';
				nicknameElement.style.visibility = 'visible';
			}
		}, 100);
	}

	private initializeOnlineGame() {
		console.log("[OnlineGame] 🎮 Inizializzando online game...");
		const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
		const status = document.getElementById("status")!;
		const matchInfo = document.getElementById("matchInfo")!;
		const findMatchBtn = document.getElementById("findMatchBtn");

		console.log("[OnlineGame] Elementi trovati:", {
			canvas: !!canvas,
			status: !!status,
			matchInfo: !!matchInfo,
			findMatchBtn: !!findMatchBtn
		});

		if (!findMatchBtn) {
			console.error("[OnlineGame] ❌ Pulsante Cerca Partita non trovato!");
			return;
		}

		console.log("[OnlineGame] 🔌 Connettendo multiplayerService...");
		multiplayerService.connect();

		// Funzione per aggiornare il timer di ricerca
		const updateSearchTimer = () => {
			const elapsed = Math.floor((Date.now() - searchStartTime) / 1000);
			const minutes = Math.floor(elapsed / 60);
			const seconds = elapsed % 60;
			const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
			status.textContent = `Cercando partita... ${timeString}`;
		};

		// Funzione per fermare la ricerca
		const stopSearch = () => {
			if (searchTimer) {
				clearInterval(searchTimer);
				searchTimer = null;
			}
			
			// Mostra la schermata di setup
			const setupScreen = document.getElementById("onlineSetup-screen");
			if (setupScreen) {
				setupScreen.style.display = "flex";
			}
			
			if (findMatchBtn) {
				findMatchBtn.removeAttribute("disabled");
				findMatchBtn.textContent = "Cerca Partita";
				findMatchBtn.style.background = ""; // Reset al CSS originale
			}
			
			// Nascondi il canvas
			canvas.style.display = "none";
			
			// Nascondi i nomi dei giocatori
			const playerNames = document.getElementById("playerNames");
			if (playerNames) {
				playerNames.style.display = "none";
			}
			
			// Reset status
			status.textContent = "Premi il pulsante per cercare una partita";
			status.className = "text-white text-xl mb-6";
			
			const gameInstructions = document.getElementById("gameInstructions");
			if (gameInstructions) {
				gameInstructions.classList.add("hidden");
			}
			
			const matchInfo = document.getElementById("matchInfo");
			if (matchInfo) {
				matchInfo.classList.add("hidden");
			}
		};

		console.log("[OnlineGame] 🎯 Aggiungendo listener al pulsante Cerca Partita");
		findMatchBtn.addEventListener("click", () => {
			console.log("[OnlineGame] 🚀 PULSANTE CERCA PARTITA CLICCATO!");
			
			findMatchBtn.setAttribute("disabled", "true");
			findMatchBtn.style.background = "#666";
			findMatchBtn.style.cursor = "not-allowed";
			findMatchBtn.textContent = "Cercando...";
			
			// Avvia il timer
			searchStartTime = Date.now();
			updateSearchTimer();
			searchTimer = setInterval(updateSearchTimer, 1000);
			
			// Mostra il pulsante di annullamento
			const cancelBtn = document.getElementById("");
			if (cancelBtn) {
				cancelBtn.classList.remove("hidden");
			}
			
			// Avvia la ricerca
			console.log("[OnlineGame] 🔍 Avviando ricerca partita...");
			
			let paramsString = "";
			if (window.location.hash.includes("?")) {
				paramsString = window.location.hash.split("?")[1];
			}
			const urlParams = new URLSearchParams(paramsString);
			console.log("[OnlineGame] 🚀 Parametri URL:", urlParams.toString());
			const players = urlParams.get('players');
			const gameType = players === '4' ? 'four' : 'two';
			console.log("[OnlineGame] 🚀 Cerco partita con gameType:", gameType);
			multiplayerService.findMatch(gameType as 'two' | 'four');
		});

		const cancelBtn = document.createElement("button");
		cancelBtn.id = "cancelMatchBtn";
		cancelBtn.className = "btn-large hidden"; 
		cancelBtn.textContent = "Annulla Ricerca";
		cancelBtn.style.background = "#dc2626";
		cancelBtn.style.marginLeft = "20px";
		cancelBtn.addEventListener("click", () => {
			console.log("[OnlineGame] ❌ Ricerca annullata dall'utente");
			stopSearch();
			cancelBtn.classList.add("hidden");
		});
		
		findMatchBtn.parentNode?.insertBefore(cancelBtn, findMatchBtn.nextSibling);

		multiplayerService.onWaitingForPlayers((data) => {
			console.log("[OnlineGame] 🕐 In attesa di altri giocatori:", data);
			status.textContent = `In attesa di giocatori... (${data.currentPlayers}/${data.maxPlayers})`;
		});

		// Callback quando la partita inizia
		multiplayerService.onGameStart((initialState) => {
			console.log("[OnlineGame] 🎉 Partita trovata! Callback onGameStart chiamato!", initialState);

			if (searchTimer) {
				clearInterval(searchTimer);
				searchTimer = null;
			}

			// Nascondi la schermata di setup
			const setupScreen = document.getElementById("onlineSetup-screen");
			if (setupScreen) setupScreen.style.display = "none";

			// Mostra la schermata di gioco
			const gameScreen = document.getElementById("gameScreen");
			if (gameScreen) {
				gameScreen.style.display = "flex";
				gameScreen.classList.add("visible");
			}

			const playerNames = document.getElementById("playerNames");
			if (playerNames) playerNames.style.display = "flex";

			const player1Name = document.getElementById("player1Name");
			const player2Name = document.getElementById("player2Name");
			const player3Name = document.getElementById("player3Name");
			const player4Name = document.getElementById("player4Name");

			const isFourPlayers = initialState.leftPaddle.length === 2 && initialState.rightPaddle.length === 2;

			if (isFourPlayers) {
				// Mostra tutti e 4 i nomi
				if (player1Name && initialState.leftPaddle[0]) {
					player1Name.textContent = initialState.leftPaddle[0].nickname;
					player1Name.style.display = "block";
				}
				if (player2Name && initialState.leftPaddle[1]) {
					player2Name.textContent = initialState.leftPaddle[1].nickname;
					player2Name.style.display = "block";
				}
				if (player3Name && initialState.rightPaddle[0]) {
					player3Name.textContent = initialState.rightPaddle[0].nickname;
					player3Name.style.display = "block";
				}
				if (player4Name && initialState.rightPaddle[1]) {
					player4Name.textContent = initialState.rightPaddle[1].nickname;
					player4Name.style.display = "block";
				}
			} else {
				// Mostra solo i primi 2 nomi
				if (player1Name && initialState.leftPaddle[0]) {
					player1Name.textContent = initialState.leftPaddle[0].nickname;
					player1Name.style.display = "block";
				}
				if (player2Name && initialState.rightPaddle[0]) {
					player2Name.textContent = initialState.rightPaddle[0].nickname;
					player2Name.style.display = "block";
				}
				if (player3Name) player3Name.style.display = "none";
				if (player4Name) player4Name.style.display = "none";
			}

			// Evidenzia il lato del giocatore locale (solo per 2 giocatori, puoi adattare per 4)
			const mySide = initialState.mySide;
			if (!isFourPlayers) {
				if (mySide === "left") {
					if (player1Name) {
						player1Name.style.color = "#ff4444";
						player1Name.style.fontWeight = "bold";
					}
					if (player2Name) {
						player2Name.style.color = "#44ff44";
						player2Name.style.fontWeight = "normal";
					}
				} else {
					if (player1Name) {
						player1Name.style.color = "#44ff44";
						player1Name.style.fontWeight = "normal";
					}
					if (player2Name) {
						player2Name.style.color = "#ff4444";
						player2Name.style.fontWeight = "bold";
					}
				}
			}

		
			// Mostra il canvas
			const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
			if (canvas) {
				canvas.style.display = "block";
				canvas.focus();
			}

			// Countdown e avvio controller
			const ctx = canvas?.getContext('2d');
			if (canvas && ctx) {
				this.startCountdown(canvas, ctx, initialState);
			}
		});
	}

	render () {
		console.log("[OnlineGame] 🎨 Rendering HTML...");
		const container = document.getElementById('app');
		if (!container)
			return;

		const translation = new UserService().getUser()?.language || 'en';
		const translatedHtml = new TranslationService(translation).translateTemplate(onlineGameHtml);
		container.innerHTML = translatedHtml;

		const screen = container.querySelector('.screen');
		if (screen)
			screen.classList.add('visible');
		
		setTimeout(() => {
			const nicknameElement = document.getElementById('nickname');
			if (nicknameElement) {
				nicknameElement.style.display = 'block';
				nicknameElement.style.visibility = 'visible';
			}
		}, 50);
	}

	private startCountdown(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, initialState: any) {
    let countdown = 3;
    const isFourPlayers = initialState.leftPaddle.length === 2 && initialState.rightPaddle.length === 2;
    const interval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "80px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (countdown > 0) {
            ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
        } else if (countdown === 0) {
            ctx.fillText("GO!", canvas.width / 2, canvas.height / 2);
        } else {
            clearInterval(interval);
            multiplayerService.sendInput({ type: "countdownFinished" });
            if (isFourPlayers)
                new FourRemoteController("gameCanvas", initialState);
            else
                new RemoteController("gameCanvas", initialState);
        }
        countdown--;
    }, 1000);
}
}