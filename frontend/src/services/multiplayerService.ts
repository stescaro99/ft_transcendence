import { GameState } from "../pages/game/common/types";

export class MultiplayerService {
	private socket: WebSocket | null = null;
	private gameUpdateCallback: ((state: GameState) => void) | null = null;
	private gameStartCallback: ((state: any) => void) | null = null;
	private waitingCallback: ((data: any) => void) | null = null;
	private currentRoomId: string | null = null;
	private heartbeatInterval: number | null = null; 

	connect() {
		// Se già connesso, non riconnettersi
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			console.log("[MultiplayerService] Già connesso, usando connessione esistente");
			return;
		}

        const token = localStorage.getItem("token");
        if (!token)
        {
            console.error("[MultiplayerService] Token JWT mancante. Impossibile connettersi.");
            return ;
        }

		const wsUrl = `wss://transcendence.be:9443/ws/game?token=${token}`;
		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			this.startHeartbeat();
		};

		this.socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
	
			if (data.type === "gameUpdate" && this.gameUpdateCallback) {
				this.gameUpdateCallback(data.gameState);
			}

			if (data.type === "waitingForPlayers") {
				console.log("[MultiplayerService] In attesa di altri giocatori...", data);
				this.currentRoomId = data.roomId;
				if (this.waitingCallback) {
					this.waitingCallback(data);
				}
			}

			if (data.type === "matchFound") {
				console.log("[MultiplayerService] Partita trovata! Room ID:", data.roomId);
				this.currentRoomId = data.roomId;
				// Non avviare il gioco qui, aspetta gameStarted
			}

			if (data.type === "gameStarted") {
				console.log("[MultiplayerService] Gioco iniziato!");
				this.gameStartCallback?.(data.gameState);
			}
		};

		this.socket.onerror = (err) => {
			console.error("[MultiplayerService] Errore di connessione:", err);
			console.error("[MultiplayerService] ReadyState:", this.socket?.readyState);
		};

		this.socket.onclose = (event) => {
			console.warn("[MultiplayerService] Disconnesso - Codice:", event.code, "Reason:", event.reason);
			this.stopHeartbeat();
		};
	}

	private startHeartbeat() {
		this.stopHeartbeat();
		this.heartbeatInterval = setInterval(() => {
			if (this.socket && this.socket.readyState === WebSocket.OPEN) {
				console.log("[MultiplayerService] Inviando ping heartbeat");
				this.socket.send(JSON.stringify({
					type: 'ping',
					timestamp: Date.now()
				}));
			}
		}, 10000);
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	sendInput(input: any) {
		if (input.type === "countdownFinished") {
			if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentRoomId) {
				const message = {
					type: "playerInput",
					roomId: this.currentRoomId,
					input: { type: "countdownFinished" }
				};
				this.socket.send(JSON.stringify(message));
			}
			return;
		}
		if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentRoomId) {
			let directionValue: number;
			
			// Converti la direzione stringa in numero
			switch (input.direction) {
				case "up":
					directionValue = -1;
					break;
				case "down":
					directionValue = 1;
					break;
				case "stop":
					directionValue = 0;
					break;
				default:
					directionValue = 0;
			}
			
			const message = { 
				type: "playerInput", 
				roomId: this.currentRoomId,
				input: {
					direction: directionValue,
					timestamp: input.timestamp
				}
			};
			console.log("[MultiplayerService] Messaggio completo:", JSON.stringify(message));
			this.socket.send(JSON.stringify(message));
		} else {
			console.error("[MultiplayerService] Impossibile inviare input:", {
				socketReady: this.socket?.readyState === WebSocket.OPEN,
				roomId: this.currentRoomId
			});
		}
	}

	findMatch(gameType: 'two' | 'four' = 'two') {
		console.log("[MultiplayerService] Inviando richiesta findMatch con gameType:", gameType);
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			console.log("[MultiplayerService] Inviando richiesta findMatch");
			this.socket.send(JSON.stringify({ 
				type: "findMatch", 
				gameType: gameType 
			}));
		} else {
			console.error("[MultiplayerService] Socket non connesso! ReadyState:", this.socket?.readyState);
		}
	}

	onGameUpdate(cb: (state: GameState) => void) {
		this.gameUpdateCallback = cb;
	}

	onGameStart(cb: (state: any) => void) {
		this.gameStartCallback = cb;
	}

	onWaitingForPlayers(cb: (data: any) => void) {
		this.waitingCallback = cb;
	}
}


const multiplayerService = new MultiplayerService();
export default multiplayerService;