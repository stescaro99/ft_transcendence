import onlineGameHtml from './onlineGame.html?raw';
import { UserService } from '../../service/user.service';
import { User } from '../../model/user.model';
import { TranslationService } from '../../service/translation.service';
import { RemoteController } from "./RemoteController";
import { FourRemoteController } from "./FourRemoteController";
import multiplayerService from '../../services/multiplayerService';
import '../game/game.css';

let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchStartTime: number = 0;

export class OnlineGamePage {
    user: User | null = null; // prima era Promise<User|null> -> correggi assegnazione asincrona
    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private powerUpsEnabled: boolean = true;
	constructor(_currentLang: string) {
		console.log("[OnlineGame] 🚀 OnlineGamePage constructor chiamato!");
		this.init();

		window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        window.addEventListener('hashchange', () => {
            this.cleanup();
        });
	}


	private cleanup() {
        console.log("[OnlineGame] 🧹 Cleanup in corso...");
    
    // ✅ Ferma ENTRAMBI i timer (locale e globale)
    if (this.searchTimer) {
        clearInterval(this.searchTimer);
        this.searchTimer = null;
    }
    
    // ✅ Ferma anche il timer globale se esiste ancora
    if (searchTimer) {
        clearInterval(searchTimer);
        searchTimer = null;
    }
    
    // ✅ Disconnetti il multiplayer correttamente
    if (multiplayerService) {
         try {
            // Chiudi direttamente il socket
            if (multiplayerService.socket && multiplayerService.socket.readyState === WebSocket.OPEN) {
                multiplayerService.socket.close();
                console.log("[OnlineGame] 🔌 Socket chiuso");
            }
        } catch (error) {
            console.warn("[OnlineGame] ⚠️ Errore durante disconnessione:", error);
        }
    }
    
    // ✅ Rimuovi il pulsante cancel se esiste
    const cancelBtn = document.getElementById("cancelMatchBtn");
    if (cancelBtn) {
        cancelBtn.remove();
    }
    
    // ✅ Reset stato UI
    this.resetUIState();
    }

	private resetUIState() {
    // Reset del pulsante principale
    const findMatchBtn = document.getElementById("findMatchBtn");
    if (findMatchBtn) {
        findMatchBtn.removeAttribute("disabled");
        findMatchBtn.textContent = "Cerca Partita";
        findMatchBtn.style.background = "";
        findMatchBtn.style.cursor = "";
    }
    
    // Reset status
    const status = document.getElementById("status");
    if (status) {
        status.textContent = "Premi il pulsante per cercare una partita";
        status.className = "text-white text-xl mb-6";
    }
    
    // Nascondi canvas e elementi di gioco
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (canvas) {
        canvas.style.display = "none";
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Nascondi schermate di gioco
    const gameScreen = document.getElementById("gameScreen");
    if (gameScreen) {
        gameScreen.style.display = "none";
    }
    
    const setupScreen = document.getElementById("onlineSetup-screen");
    if (setupScreen) {
        setupScreen.style.display = "flex";
    }
}

	private async init() {
		await this.render();
		
		// recupera user in modo asincrono e assegna correttamente
		try {
            this.user = await new UserService().getUser();
        } catch (e) {
            this.user = null;
        }

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

		let powerBtn = document.getElementById("powerUpsBtn") as HTMLButtonElement | null;
		if (!powerBtn && findMatchBtn?.parentElement) {
			powerBtn = document.createElement('button') as HTMLButtonElement;
			powerBtn.id = "powerUpsBtn";
			powerBtn.className = "btn-large";
			powerBtn.textContent = this.powerUpsEnabled ? "POWER UP ON" : "POWER UP OFF";
			findMatchBtn.parentElement.insertBefore(powerBtn, findMatchBtn.nextSibling);
		}
		if (powerBtn) {
			powerBtn.addEventListener("click", () => {
				this.powerUpsEnabled = !this.powerUpsEnabled;
				powerBtn!.textContent = this.powerUpsEnabled ? "POWER UP ON" : "POWER UP OFF";
				powerBtn!.classList.toggle("opacity-70", !this.powerUpsEnabled);
			});
			powerBtn.textContent = this.powerUpsEnabled ? "POWER UP ON" : "POWER UP OFF";
			powerBtn.classList.toggle("opacity-70", !this.powerUpsEnabled);
		}


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

			const p = document.getElementById("powerToggleOnline") as HTMLButtonElement | null;
			if (p)
				p.removeAttribute("disabled");
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
			const cancelBtn = document.getElementById("cancelMatchBtn"); // FIX: id corretto
            if (cancelBtn) {
                cancelBtn.classList.remove("hidden");
            }
			const p = document.getElementById("powerToggleOnline") as HTMLButtonElement | null;
			if (p)
				p.setAttribute("disabled", "true");

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
			multiplayerService.findMatch(gameType as 'two' | 'four', {powerUp: this.powerUpsEnabled ? 'on' : 'off'});
		});

        const cancelBtn = document.createElement("button");
        cancelBtn.id = "cancelMatchBtn";
        cancelBtn.className = "btn-large hidden"; 
        cancelBtn.textContent = "Annulla Ricerca";
        cancelBtn.style.background = "#dc2626";
        cancelBtn.style.marginLeft = "20px";
        cancelBtn.addEventListener("click", () => {
            console.log("[OnlineGame] ❌ Ricerca annullata dall'utente");
            multiplayerService.cancelFindMatch(); // NEW: lascia la stanza lato server
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
				if (player1Name && initialState.leftPaddle[1]) {
					player1Name.textContent = initialState.leftPaddle[1].nickname;
					player1Name.style.display = "block";
				}
				if (player2Name && initialState.leftPaddle[0]) {
					player2Name.textContent = initialState.leftPaddle[0].nickname;
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

            const mySide: "left" | "right" = initialState.mySide;
            const myPaddleIndex: number = typeof initialState.myPaddleIndex === 'number' ? initialState.myPaddleIndex : 0;

            const styleName = (el: HTMLElement | null, side: 'left'|'right', isMine: boolean) => {
                if (!el) return;
                el.style.color = side === 'left' ? '#44ff44' : '#ff4444';
                el.style.fontWeight = isMine ? '700' : '400';
                el.style.textShadow = isMine ? '0 0 8px rgba(0,255,255,0.8)' : 'none';
                el.style.filter = isMine ? 'brightness(1.2)' : 'none';
            };

            if (isFourPlayers) {
                // Left paddles
                styleName(player1Name, 'left',  mySide === 'left' && myPaddleIndex === 0);
                styleName(player2Name, 'left',  mySide === 'left' && myPaddleIndex === 1);
                // Right paddles
                styleName(player3Name, 'right', mySide === 'right' && myPaddleIndex === 0);
                styleName(player4Name, 'right', mySide === 'right' && myPaddleIndex === 1);
            } else {
                styleName(player1Name, 'left',  mySide === 'left');
                styleName(player2Name, 'right', mySide === 'right');
            }

		
			// Mostra il canvas
			const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
			if (canvas) {
				canvas.style.display = "block";
				canvas.focus();
			}

			const p = document.getElementById("powerToggleOnline") as HTMLButtonElement | null;
			if (p)
				p.setAttribute("disabled", "true");

			// Countdown e avvio controller
			const ctx = canvas?.getContext('2d');
			if (canvas && ctx) {
				this.startCountdown(canvas, ctx, initialState);
			}
		});

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
				if (player1Name && initialState.leftPaddle[1]) {
					player1Name.textContent = initialState.leftPaddle[1].nickname;
					player1Name.style.display = "block";
				}
				if (player2Name && initialState.leftPaddle[0]) {
					player2Name.textContent = initialState.leftPaddle[0].nickname;
					player2Name.style.display = "block";
				}
				if (player3Name && initialState.rightPaddle[1]) {
					player3Name.textContent = initialState.rightPaddle[1].nickname;
					player3Name.style.display = "block";
				}
				if (player4Name && initialState.rightPaddle[0]) {
					player4Name.textContent = initialState.rightPaddle[0].nickname;
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

            const mySide: "left" | "right" = initialState.mySide;
            const myPaddleIndex: number = typeof initialState.myPaddleIndex === 'number' ? initialState.myPaddleIndex : 0;

            const styleName = (el: HTMLElement | null, side: 'left'|'right', isMine: boolean) => {
                if (!el) return;
                el.style.color = side === 'left' ? '#44ff44' : '#ff4444';
                el.style.fontWeight = isMine ? '700' : '400';
                el.style.textShadow = isMine ? '0 0 8px rgba(0,255,255,0.8)' : 'none';
                el.style.filter = isMine ? 'brightness(1.2)' : 'none';
            };

            if (isFourPlayers) {
                // Left paddles
                styleName(player1Name, 'left',  mySide === 'left' && myPaddleIndex === 0);
                styleName(player2Name, 'left',  mySide === 'left' && myPaddleIndex === 1);
                // Right paddles
                styleName(player3Name, 'right', mySide === 'right' && myPaddleIndex === 0);
                styleName(player4Name, 'right', mySide === 'right' && myPaddleIndex === 1);
            } else {
                styleName(player1Name, 'left',  mySide === 'left');
                styleName(player2Name, 'right', mySide === 'right');
            }

		
			// Mostra il canvas
			const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
			if (canvas) {
				canvas.style.display = "block";
				canvas.focus();
			}

			const p = document.getElementById("powerToggleOnline") as HTMLButtonElement | null;
			if (p)
				p.setAttribute("disabled", "true");

			// Countdown e avvio controller
			const ctx = canvas?.getContext('2d');
			if (canvas && ctx) {
				this.startCountdown(canvas, ctx, initialState);
			}
		});

		// NEW: mostra overlay alla fine partita (es. per disconnessione avversario)
		multiplayerService.onGameEnded((data) => {
			this.showGameEndedOverlay(data);
		});
	}

	async render () {
		console.log("[OnlineGame] 🎨 Rendering HTML...");
		const container = document.getElementById('app');
		if (!container)
			return;

		const user = await new UserService().getUser();
		const translation = user?.language || 'en';
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

  private showGameEndedOverlay(data: any) {
    const setupScreen = document.getElementById("onlineSetup-screen");
    if (setupScreen) setupScreen.style.display = "none";
    const gameScreen = document.getElementById("gameScreen");
    if (gameScreen) gameScreen.style.display = "flex";

    const myNick = sessionStorage.getItem('nickname') || '';
    const me = (data.players || []).find((p: any) => p.nickname === myNick);
    const iWon = me ? (data.winner === me.side) : false;

    const winnerLabel = iWon ? "Hai Vinto!" : "Hai Perso";
    let disconnectReason = '';
    // Trova il player disconnesso
    const disconnectedPlayer = (data.players || []).find((p: any) => !p.connected);

    // Trova la squadra di me
    const mySide = me?.side;

    // Trova tutti i compagni di squadra (escluso me)
    const myTeam = (data.players || []).filter((p: any) => p.side === mySide && p.nickname !== myNick);

    // Se il disconnesso è nel mio team, è il mio compagno
    if (data.reason === 'playerDisconnection') {
        if (disconnectedPlayer) {
            if (myTeam.some((p: any) => p.nickname === disconnectedPlayer.nickname)) {
                disconnectReason = 'Il tuo compagno si è disconnesso';
            } else {
                disconnectReason = 'L\'avversario si è disconnesso';
            }
        } else {
            disconnectReason = 'Un giocatore si è disconnesso';
        }
    }

    const reason = disconnectReason || (data.reason === 'playerDisconnection' ? 'L\'avversario si è disconnesso' : '');

    // Crea overlay
    const existing = document.getElementById('winOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'winOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.gap = '24px';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '10000';

    const title = document.createElement('div');
    title.textContent = winnerLabel;
    title.style.color = iWon ? '#00ffff' : '#ff6666';
    title.style.font = 'bold 48px Arial';
    title.style.textShadow = '0 0 18px rgba(0,255,255,0.6)';

    const sub = document.createElement('div');
    sub.textContent = reason;
    sub.style.color = '#ccc';
    sub.style.font = '16px Arial';

    const btn = document.createElement('button');
    btn.textContent = 'Torna Indietro';
    btn.style.padding = '12px 28px';
    btn.style.fontSize = '16px';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.background = '#2563eb';
    btn.style.color = '#fff';
    btn.addEventListener('click', () => {
      overlay.remove();
      // reset UI e ritorna alla schermata iniziale
      this.resetUIState();
      // opzionale: chiudi socket per ripartire pulito
      if (multiplayerService.socket && multiplayerService.socket.readyState === WebSocket.OPEN) {
        multiplayerService.socket.close();
      }
      window.location.hash = '/';
    }, { once: true });

    overlay.appendChild(title);
    if (reason) overlay.appendChild(sub);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
  }
}